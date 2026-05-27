/* -----------------------------------------------------------------------------
 * src/lib/db.ts — single-file SQLite via better-sqlite3.
 *
 * Tables
 *   provider_keys   encrypted LLM provider keys (OpenAI / Anthropic / Gemini)
 *   sources         labelled data sources (Instagram, WhatsApp, PoS, Sheets, …)
 *   reports         generated monthly reports (full JSON payload kept)
 *   settings        single-row key/value config
 * -------------------------------------------------------------------------- */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DB_PATH = process.env.TALLY_DB_PATH || resolve(process.cwd(), 'data', 'tally.db');

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const handle = new Database(DB_PATH);
  handle.pragma('journal_mode = WAL');
  handle.pragma('foreign_keys = ON');
  bootstrap(handle);
  _db = handle;
  return handle;
}

function bootstrap(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS provider_keys (
      id            TEXT PRIMARY KEY,
      provider      TEXT NOT NULL,
      label         TEXT NOT NULL,
      key_encrypted TEXT NOT NULL,
      model         TEXT,
      is_default    INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_provider_keys_provider ON provider_keys(provider);

    CREATE TABLE IF NOT EXISTS sources (
      id          TEXT PRIMARY KEY,
      kind        TEXT NOT NULL,    -- 'instagram' | 'whatsapp' | 'pos' | 'sheets' | 'other'
      label       TEXT NOT NULL,
      handle      TEXT,             -- @yourbrand, register-1, etc.
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      period_start    TEXT,
      period_end      TEXT,
      sources_json    TEXT,         -- JSON array of { kind, label, rows_count }
      summary         TEXT,         -- AI-written drop-cap brief
      kpis_json       TEXT,         -- [{ label, value, delta_pct, direction, unit }]
      insights_json   TEXT,         -- [{ title, body, evidence }]
      categories_json TEXT,         -- [{ name, pct, count }]
      patterns_json   TEXT,         -- { best_day, best_hour, channel_split[], peak_week }
      recommendations_json TEXT,    -- [string, …]
      raw_text        TEXT,         -- concatenated parsed CSVs (truncated)
      rows_total      INTEGER NOT NULL DEFAULT 0,
      provider        TEXT,
      model           TEXT,
      status          TEXT NOT NULL DEFAULT 'ready',  -- 'ready' | 'archived'
      starred         INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      generated_at    INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

/* ── typed rows ─────────────────────────────────────────────────────── */
export interface ProviderKeyRow {
  id: string; provider: string; label: string; key_encrypted: string;
  model: string | null; is_default: number; created_at: number;
}
export interface SourceRow {
  id: string; kind: string; label: string; handle: string | null; created_at: number;
}
export interface ReportRow {
  id: string; title: string;
  period_start: string | null; period_end: string | null;
  sources_json: string | null;
  summary: string | null;
  kpis_json: string | null; insights_json: string | null;
  categories_json: string | null; patterns_json: string | null;
  recommendations_json: string | null;
  raw_text: string | null;
  rows_total: number;
  provider: string | null; model: string | null;
  status: string; starred: number;
  created_at: number; generated_at: number | null;
}

/* ── provider_keys ──────────────────────────────────────────────────── */
export function listProviderKeys(): ProviderKeyRow[] {
  return db().prepare('SELECT * FROM provider_keys ORDER BY provider, created_at').all() as ProviderKeyRow[];
}
export function getProviderKey(id: string): ProviderKeyRow | undefined {
  return db().prepare('SELECT * FROM provider_keys WHERE id = ?').get(id) as ProviderKeyRow | undefined;
}
export function getDefaultProviderKey(provider: string): ProviderKeyRow | undefined {
  const row = db().prepare('SELECT * FROM provider_keys WHERE provider = ? AND is_default = 1').get(provider) as ProviderKeyRow | undefined;
  if (row) return row;
  return db().prepare('SELECT * FROM provider_keys WHERE provider = ? ORDER BY created_at LIMIT 1').get(provider) as ProviderKeyRow | undefined;
}
export function insertProviderKey(row: ProviderKeyRow) {
  if (row.is_default) db().prepare('UPDATE provider_keys SET is_default = 0 WHERE provider = ?').run(row.provider);
  db().prepare(`INSERT INTO provider_keys (id, provider, label, key_encrypted, model, is_default, created_at)
                VALUES (@id, @provider, @label, @key_encrypted, @model, @is_default, @created_at)`).run(row);
}
export function setDefaultProviderKey(id: string) {
  const row = getProviderKey(id); if (!row) return;
  const tx = db().transaction((p: string, keyId: string) => {
    db().prepare('UPDATE provider_keys SET is_default = 0 WHERE provider = ?').run(p);
    db().prepare('UPDATE provider_keys SET is_default = 1 WHERE id = ?').run(keyId);
  });
  tx(row.provider, id);
}
export function deleteProviderKey(id: string) { db().prepare('DELETE FROM provider_keys WHERE id = ?').run(id); }

/* ── sources ────────────────────────────────────────────────────────── */
export function listSources(): SourceRow[] {
  return db().prepare('SELECT * FROM sources ORDER BY label').all() as SourceRow[];
}
export function getSource(id: string): SourceRow | undefined {
  return db().prepare('SELECT * FROM sources WHERE id = ?').get(id) as SourceRow | undefined;
}
export function insertSource(row: SourceRow) {
  db().prepare(`INSERT INTO sources (id, kind, label, handle, created_at)
                VALUES (@id, @kind, @label, @handle, @created_at)`).run(row);
}
export function updateSource(id: string, fields: Partial<SourceRow>) {
  const cur = getSource(id); if (!cur) return;
  const merged = { ...cur, ...fields, id };
  db().prepare('UPDATE sources SET kind=@kind, label=@label, handle=@handle WHERE id=@id').run(merged);
}
export function deleteSource(id: string) { db().prepare('DELETE FROM sources WHERE id = ?').run(id); }

/* ── reports ────────────────────────────────────────────────────────── */
export function listReports(limit = 100): ReportRow[] {
  return db().prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ?').all(limit) as ReportRow[];
}
export function getReport(id: string): ReportRow | undefined {
  return db().prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;
}
export function insertReport(row: ReportRow) {
  db().prepare(`INSERT INTO reports (
                  id, title, period_start, period_end, sources_json, summary,
                  kpis_json, insights_json, categories_json, patterns_json, recommendations_json,
                  raw_text, rows_total, provider, model, status, starred, created_at, generated_at
                ) VALUES (
                  @id, @title, @period_start, @period_end, @sources_json, @summary,
                  @kpis_json, @insights_json, @categories_json, @patterns_json, @recommendations_json,
                  @raw_text, @rows_total, @provider, @model, @status, @starred, @created_at, @generated_at
                )`).run(row);
}
export function updateReport(id: string, fields: Partial<ReportRow>) {
  const cur = getReport(id); if (!cur) return;
  const merged = { ...cur, ...fields, id };
  db().prepare('UPDATE reports SET status=@status, starred=@starred WHERE id=@id').run(merged);
}
export function deleteReport(id: string) { db().prepare('DELETE FROM reports WHERE id = ?').run(id); }

/* ── settings ───────────────────────────────────────────────────────── */
export function getSetting(key: string): string | undefined {
  const r = db().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return r?.value;
}
export function setSetting(key: string, value: string) {
  db().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}
