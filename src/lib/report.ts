/* -----------------------------------------------------------------------------
 * src/lib/report.ts — prompt builder + result coercion for the AI report.
 *
 * Shared between the live preview in /upload and the /api/generate handler
 * so what the user reads is exactly what the model sees.
 * -------------------------------------------------------------------------- */

import type { ParsedDataset } from './parse';

export interface ReportInput {
  business_name?: string;
  language?:      'en' | 'az' | 'ru' | 'tr';
  datasets:       ParsedDataset[];
  period_hint?:   string;        /* "last 30 days", "March 2026", etc. */
  goal_hint?:     string;        /* what the user wants to learn */
}

export const REPORT_SCHEMA = `
Return ONLY this JSON object — no markdown, no prose around it:

{
  "title":     "<short report title, e.g. 'Lavanda Café · March 2026'>",
  "period":    { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "summary":   "<2-4 paragraph opening brief, drop-cap-worthy, in the requested language>",
  "kpis": [
    /* 4-6 items, the most decision-useful numbers */
    { "label": "<one-line label>",
      "value": "<formatted display string, e.g. '1,247' or '124,500 ₼'>",
      "delta_pct":  <-100 to 100 integer or null when no comparison possible>,
      "direction":  "up|down|flat",
      "unit":       "<count|currency|percent|hours|other>" }
  ],
  "insights": [
    /* 3-5 narrative findings */
    { "title": "<short headline>",
      "body":  "<3-5 sentence explanation in plain language>",
      "evidence": "<one short quote or stat from the data that supports it>" }
  ],
  "categories": [
    /* 3-6 top categories of customer questions / order types / inquiries */
    { "name": "<category name>", "pct": <0-100 integer>, "count": <integer> }
  ],
  "patterns": {
    "best_day":      "<weekday name>",
    "best_hour":     "<HH:MM-HH:MM range>",
    "channel_split": [{ "name": "<source label>", "pct": <0-100 integer> }],
    "peak_week":     "<week label, e.g. 'Mar 17-23'>"
  },
  "recommendations": [
    /* 3-5 concrete next actions, each one a single sentence */
    "<action 1>", "<action 2>", "..."
  ]
}
`.trim();

export function buildReportPrompt(input: ReportInput): { system: string; user: string } {
  const lang = input.language || 'en';
  const datasets = input.datasets.slice(0, 8);   /* hard cap so prompt stays sane */

  const system = `You are Tally, a no-nonsense monthly-report generator for local businesses.

You read one or more CSV/TSV exports (Instagram DMs, WhatsApp message logs, point-of-sale receipts, Google Sheets) and produce a single strict-JSON object describing the period: top KPIs with deltas, top customer-question categories, weekly + daily patterns, and 3-5 concrete recommendations.

WRITING RULES
- Output language: "${lang}". When language is "en" you may sprinkle one short native phrase per insight where it lands naturally.
- KPI values come pre-formatted (commas for thousands, currency suffix where obvious — try AZN ₼ if region looks Azerbaijani, USD $ otherwise).
- delta_pct is comparison vs the prior equivalent period IF the data spans long enough; otherwise null + direction "flat".
- Categories must sum to ~100% (within ±5 due to rounding); always 3-6 entries.
- Recommendations are concrete + actionable: "Add a one-line delivery promise to your Instagram bio." NOT "Improve customer experience."
- If a field genuinely can't be inferred from the data, write "n/a" — never invent numbers.

OUTPUT SHAPE — emit a single JSON object, no markdown:
${REPORT_SCHEMA}`;

  const businessLine = input.business_name ? `Business: ${input.business_name}` : 'Business: unspecified — write generically';
  const periodLine   = input.period_hint   ? `Period focus: ${input.period_hint}` : 'Period focus: infer from the data';
  const goalLine     = input.goal_hint     ? `Owner's question: ${input.goal_hint}` : 'Owner has not stated a specific question — write the standard monthly briefing';

  const datasetBlocks = datasets.map((d, i) => {
    const dateLine = d.dateRange ? `date range ${d.dateRange.start} → ${d.dateRange.end}` : 'date range not detected';
    return `── DATASET ${i + 1} ─────────────────────────────────────────
source kind: ${d.kind}
label:       ${d.label}
rows:        ${d.rowsCount}
${dateLine}
sample (truncated):
${d.sample}`;
  }).join('\n\n');

  const user = `${businessLine}
${periodLine}
${goalLine}

You have ${datasets.length} dataset${datasets.length === 1 ? '' : 's'} to analyse:

${datasetBlocks}

Now produce the report JSON. Be concrete, name actual categories you see in the data, anchor every number to evidence from the sample.`;

  return { system, user };
}

/* ── result coercion ─────────────────────────────────────────────────── */

export interface ReportKpi { label: string; value: string; delta_pct: number | null; direction: 'up' | 'down' | 'flat'; unit: string; }
export interface ReportInsight { title: string; body: string; evidence: string; }
export interface ReportCategory { name: string; pct: number; count: number; }
export interface ReportPatterns {
  best_day:      string;
  best_hour:     string;
  channel_split: Array<{ name: string; pct: number }>;
  peak_week:     string;
}
export interface ReportResult {
  title:     string;
  period:    { start: string | null; end: string | null };
  summary:   string;
  kpis:      ReportKpi[];
  insights:  ReportInsight[];
  categories: ReportCategory[];
  patterns:  ReportPatterns;
  recommendations: string[];
}

export function coerceReportResult(raw: any): ReportResult {
  const s   = (v: unknown, max = 4000) => String(v ?? '').slice(0, max);
  const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
  const intInRange = (v: unknown, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

  return {
    title:  s(raw?.title, 200),
    period: {
      start: raw?.period?.start ? s(raw.period.start, 20) : null,
      end:   raw?.period?.end   ? s(raw.period.end,   20) : null,
    },
    summary: s(raw?.summary, 2400),

    kpis: arr(raw?.kpis).slice(0, 8).map((k: any) => {
      const dir = ['up', 'down', 'flat'].includes(String(k?.direction)) ? k.direction : 'flat';
      return {
        label:     s(k?.label, 120),
        value:     s(k?.value, 80),
        delta_pct: k?.delta_pct !== null && k?.delta_pct !== undefined ? intInRange(k.delta_pct, -100, 100) : null,
        direction: dir as 'up' | 'down' | 'flat',
        unit:      s(k?.unit, 24).toLowerCase() || 'other',
      };
    }),

    insights: arr(raw?.insights).slice(0, 6).map((i: any) => ({
      title:    s(i?.title, 200),
      body:     s(i?.body, 1200),
      evidence: s(i?.evidence, 400),
    })),

    categories: arr(raw?.categories).slice(0, 8).map((c: any) => ({
      name:  s(c?.name, 80),
      pct:   intInRange(c?.pct, 0, 100),
      count: Math.max(0, Math.round(Number(c?.count) || 0)),
    })),

    patterns: {
      best_day:  s(raw?.patterns?.best_day, 40),
      best_hour: s(raw?.patterns?.best_hour, 40),
      channel_split: arr(raw?.patterns?.channel_split).slice(0, 8).map((c: any) => ({
        name: s(c?.name, 60),
        pct:  intInRange(c?.pct, 0, 100),
      })),
      peak_week: s(raw?.patterns?.peak_week, 60),
    },

    recommendations: arr(raw?.recommendations).slice(0, 6).map((r) => s(r, 300)),
  };
}
