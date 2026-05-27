/* -----------------------------------------------------------------------------
 * src/lib/parse.ts — CSV / TSV parser + heuristic source-kind detection.
 *
 * Why a hand-rolled parser? The standard Node libraries either bundle too
 * much (sheet.js is 1.5 MB) or don't handle the quirks of WhatsApp / IG DM
 * exports (mixed delimiters, trailing commas, embedded newlines inside
 * quoted message bodies). This one is small, correct for the common cases,
 * and easy to extend.
 *
 * Output shape — one ParsedDataset per uploaded file:
 *   { kind, label, headers[], rows[][], rowsCount,
 *     dateRange: { start, end } | null, sample: string }
 *
 * The `sample` field is what we hand to the LLM (truncated to ~12k chars).
 * -------------------------------------------------------------------------- */

export type SourceKind = 'instagram' | 'whatsapp' | 'pos' | 'sheets' | 'other';

export interface ParsedDataset {
  kind:      SourceKind;
  label:     string;
  headers:   string[];
  rows:      string[][];
  rowsCount: number;
  dateRange: { start: string; end: string } | null;
  sample:    string;          /* trimmed plain-text preview for the LLM */
}

/* ── CSV/TSV core ─────────────────────────────────────────────────────── */

export function detectDelimiter(text: string): ',' | ';' | '\t' | '|' {
  /* Count occurrences of each candidate in the first 20 lines, vote. */
  const head = text.split(/\r?\n/).slice(0, 20).join('\n');
  const counts: Record<',' | ';' | '\t' | '|', number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  for (const ch of head) {
    if (ch === ',' || ch === ';' || ch === '\t' || ch === '|') counts[ch] += 1;
  }
  /* Tabs are special — even a few tabs is a strong TSV signal. */
  if (counts['\t'] >= 5) return '\t';
  const best = (Object.entries(counts) as Array<[',' | ';' | '\t' | '|', number]>)
    .sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
}

/** Parse a CSV / TSV string into headers + rows, handling quoted fields. */
export function parseTable(text: string, delim?: ',' | ';' | '\t' | '|'): { headers: string[]; rows: string[][] } {
  const d = delim || detectDelimiter(text);
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; i += 1; continue; }
    if (ch === d) { cur.push(field); field = ''; i += 1; continue; }
    if (ch === '\r') { i += 1; continue; }
    if (ch === '\n') {
      cur.push(field); field = '';
      if (cur.some((x) => x !== '')) rows.push(cur);
      cur = [];
      i += 1; continue;
    }
    field += ch; i += 1;
  }
  if (field !== '' || cur.length) { cur.push(field); if (cur.some((x) => x !== '')) rows.push(cur); }

  const headers = rows.shift() || [];
  return { headers, rows };
}

/* ── source-kind heuristics ──────────────────────────────────────────── */

/** Sniff the kind of export by looking at headers + the first row. */
export function detectSourceKind(headers: string[], sampleRow: string[] = []): SourceKind {
  const hjoin = headers.map((h) => h.toLowerCase()).join(' | ');
  const sjoin = sampleRow.join(' ').toLowerCase();

  /* WhatsApp chat exports are flat text with a timestamp prefix, but when
   * users paste them into a CSV the columns usually include 'phone' or
   * the message itself. Detect by message-y headers + handle/phone. */
  if (/whats/i.test(hjoin)) return 'whatsapp';
  if (/phone|msisdn/.test(hjoin) && /message|text|body|conversation/.test(hjoin)) return 'whatsapp';

  /* Instagram DM exports (Meta Business Suite) have these column hints. */
  if (/instagram|ig_username|ig handle/.test(hjoin)) return 'instagram';
  if (/dm|direct message/.test(hjoin) && /username|@/.test(hjoin)) return 'instagram';
  if (/^@/.test(sjoin)) return 'instagram';

  /* PoS / register exports — products, prices, quantities, receipts. */
  if (/sku|product|item|qty|quantity|price|total|amount|receipt|order/i.test(hjoin)) return 'pos';

  /* Google Sheets generic — has 'sheet' or generic 'name', 'value' pairs. */
  if (/sheet|tab|row id/.test(hjoin)) return 'sheets';

  return 'other';
}

/* ── date-range detection ────────────────────────────────────────────── */

/** Walk the rows looking for a date column; return min + max if found. */
export function inferDateRange(headers: string[], rows: string[][]): { start: string; end: string } | null {
  const idx = headers.findIndex((h) =>
    /(^|_| )(date|sent|created|timestamp|time|day|when)( |_|$)/i.test(h));
  if (idx < 0) return null;
  let minMs = Number.POSITIVE_INFINITY;
  let maxMs = Number.NEGATIVE_INFINITY;
  for (const r of rows) {
    const v = (r[idx] || '').trim();
    if (!v) continue;
    /* Try ISO, then dd/mm/yyyy and dd.mm.yyyy. */
    const ms = parseFlexibleDate(v);
    if (ms !== null) {
      if (ms < minMs) minMs = ms;
      if (ms > maxMs) maxMs = ms;
    }
  }
  if (!isFinite(minMs) || !isFinite(maxMs)) return null;
  return { start: new Date(minMs).toISOString().slice(0, 10), end: new Date(maxMs).toISOString().slice(0, 10) };
}

function parseFlexibleDate(s: string): number | null {
  /* ISO 8601 — most common */
  const t1 = Date.parse(s);
  if (!isNaN(t1)) return t1;
  /* dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy */
  const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const t2 = Date.parse(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(t2)) return t2;
  }
  return null;
}

/* ── one-shot ingestion ──────────────────────────────────────────────── */

export interface IngestOptions {
  kind?:     SourceKind;       /* override detection */
  label?:    string;           /* user-supplied label, otherwise filename */
  maxRows?:  number;           /* truncate large files (default 5000) */
  maxSample?: number;          /* truncate the LLM sample (default 12000 chars) */
}

export function ingestText(text: string, options: IngestOptions = {}): ParsedDataset {
  const maxRows   = options.maxRows   ?? 5000;
  const maxSample = options.maxSample ?? 12000;

  const { headers, rows } = parseTable(text);
  const trimmed = rows.slice(0, maxRows);
  const kind    = options.kind || detectSourceKind(headers, trimmed[0] || []);
  const dateRange = inferDateRange(headers, trimmed);

  /* Build the LLM sample — first the headers, then a representative
   * slice of rows. We over-sample early rows because users tend to put
   * the most recent activity first. */
  const lines: string[] = [];
  lines.push(headers.join(' | '));
  lines.push(headers.map(() => '---').join(' | '));
  for (const r of trimmed) {
    const line = r.map((c) => c.replace(/\s+/g, ' ').slice(0, 240)).join(' | ');
    lines.push(line);
    if (lines.join('\n').length > maxSample) break;
  }
  const sample = lines.join('\n').slice(0, maxSample);

  return {
    kind,
    label:     options.label || 'untitled',
    headers,
    rows:      trimmed,
    rowsCount: trimmed.length,
    dateRange,
    sample,
  };
}
