# Tally

> Local-business monthly report generator. Drop a CSV from Instagram DMs,
> WhatsApp exports, your point-of-sale, or a Google Sheet. One model call
> later you have a printable one-page briefing: KPIs with deltas, the top
> categories of customer questions, the patterns (best day, peak hour,
> channel split), and three to five concrete recommendations.

```
┌─ Tally · "Quarterly Bond" ──────────────────────────────────────────────┐
│ ◎ Dashboard       Tally › DASHBOARD · Mission control                    │
│ ↥ Upload          ────────────────────────────────────────────────────  │
│ ☷ Reports         01 · drop files       [ Drop a CSV here ]              │
│ ✦ Sources         02 · confirm sources  [I] Instagram DM · 1,247 rows    │
│ ⚙ Settings                              [P] PoS register  · 432 rows     │
│                   03 · context + provider                                │
│                   [ ☷ Generate report → ]                                │
│                                                                          │
│   ── result · single-page briefing ────────────────────────────────────  │
│   ▲ 1,679 total inquiries  · ▼ avg response · ▲ conversions             │
│   Top categories · Delivery 40% · Pricing 30% · Quality 20%             │
│   Best day · Wednesday   · Peak week · Mar 17-23                        │
│   Insight 01 · Delivery questions dominated …                           │
│   Recommendations · "Add a one-line delivery promise to your IG bio."   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why

Most CRMs ask you to log in, set up dashboards, and stare at charts. The
owner of a 10-person café doesn't want that — she wants someone to read
the data and tell her in plain English what happened last month and what
to do next.

Tally is that someone, except it's local, takes 30 seconds, and runs on
your own AI key.

## How it works

| Stage | What happens |
|---|---|
| **Drop**    | One or more CSV/TSV files. Each is parsed entirely in the browser by `lib/parse.ts` — no upload to a server until you press Generate. Source kind (Instagram DM / WhatsApp / PoS / Sheets) is auto-detected from the headers, then editable. |
| **Confirm** | The Upload page shows each dataset with: source kind, row count, detected date range, and a sample preview of what the AI will see. You re-label, drop, or re-classify before generation. |
| **Generate**| `buildReportPrompt()` (shared between the live preview and the `/api/generate` handler) constructs a strict-JSON instruction with the business name, period focus, owner's question, and a ~12KB sample per dataset. One LLM call returns the full briefing. |
| **Coerce**  | `coerceReportResult()` normalises every field — KPI deltas clamped to ±100, day numbers, categories summed to ~100% — so the UI only sees safe values. |
| **Print**   | The detail page lays out cleanly with a print stylesheet. Browser "Save as PDF" produces a one-page briefing without extra deps. |

## Quick start

```bash
git clone <repo>
cd "Local Business Report Generator"
npm install
cp .env.example .env.local         # optional — defaults work
npm run dev                        # → http://localhost:5757
```

First visit:

1. **Lock screen** — default passcode `tally-2026` (change via
   `TALLY_PASSCODE_HASH`).
2. **Settings → + Add provider key** — paste an OpenAI, Anthropic, or
   Google Gemini key. Each is AES-256-GCM encrypted with a per-install
   vault key.
3. **Sources** *(optional)* — label your accounts/tills/sheets if you
   want richer captions on past reports.
4. **Upload → drop CSV → state the goal → ☷ Generate report**.

## Source detection heuristics

| Header signal | Detected as |
|---|---|
| Columns include `whats`, or `phone` + (`message`/`text`/`body`) | `whatsapp` |
| Columns include `instagram`, `ig_username`, or `dm` + `username` | `instagram` |
| Columns include `sku`, `product`, `qty`, `price`, `receipt`, `order` | `pos` |
| Columns include `sheet`, `tab`, `row id` | `sheets` |
| Otherwise | `other` |

You can always override the kind via the dropdown on the Upload page —
the heuristic is best-effort, not a hard constraint.

## What the AI returns

For every report, a strict-JSON object:

```jsonc
{
  "title":     "Lavanda Café · March 2026",
  "period":    { "start": "2026-03-01", "end": "2026-03-31" },
  "summary":   "<2-4 paragraph opening brief, drop-cap-worthy>",
  "kpis": [
    { "label": "Total inquiries", "value": "1,247",
      "delta_pct": 15, "direction": "up", "unit": "count" }
  ],
  "insights": [
    { "title": "Delivery questions dominated",
      "body":  "<3-5 sentence explanation>",
      "evidence": "<quote or stat from the data>" }
  ],
  "categories": [
    { "name": "Delivery", "pct": 40, "count": 498 }
  ],
  "patterns": {
    "best_day":  "Wednesday",
    "best_hour": "11:00-12:00",
    "channel_split": [{ "name": "Instagram", "pct": 55 }],
    "peak_week": "Mar 17-23"
  },
  "recommendations": [
    "Add a one-line delivery promise to your Instagram bio.",
    "..."
  ]
}
```

The detail page renders this as a single, printable A4-friendly briefing.
Click **↥ Print / PDF** in the TopBar and the browser produces a clean
PDF without any extra dependency.

## Architecture

```
Local Business Report Generator/
├── src/
│   ├── app/
│   │   ├── page.tsx                       Dashboard (KPI tiles + recent reports)
│   │   ├── upload/page.tsx                Drop-zone workspace + dataset confirm + generate
│   │   ├── reports/page.tsx               Library list (search, star, delete)
│   │   ├── reports/[id]/page.tsx          Printable single-page briefing
│   │   ├── sources/page.tsx               Source-label CRUD
│   │   ├── settings/page.tsx              Provider key CRUD + test
│   │   ├── login/page.tsx                 Lock screen
│   │   ├── layout.tsx                     Root layout + theme bootstrap
│   │   ├── globals.css                    "Quarterly Bond" tokens (light + dark + print)
│   │   └── api/
│   │       ├── auth/route.ts                       passcode → session cookie
│   │       ├── generate/route.ts                   THE single AI call
│   │       ├── reports/route.ts                    GET list (with counts)
│   │       ├── reports/[id]/route.ts               GET / PATCH / DELETE
│   │       ├── sources/route.ts                    GET / POST source labels
│   │       ├── sources/[id]/route.ts               PATCH / DELETE
│   │       ├── providers/route.ts                  GET / POST encrypted key
│   │       ├── providers/[id]/route.ts             PATCH default / DELETE
│   │       └── providers/test/route.ts             round-trip a key
│   ├── components/
│   │   ├── Brand                          tally-mark SVG + wordmark
│   │   ├── NavBar (AppShell) + TopBar     sidebar + sticky page header
│   │   ├── DropZone                       drag/drop CSV picker
│   │   ├── KpiTile                        big-number + delta arrow
│   │   ├── InsightCard                    drop-numeral + evidence quote
│   │   ├── SourceBadge                    coloured letter chip per channel
│   │   ├── Modal · ConfirmModal · PromptModal
│   │   ├── PasswordInput · ThemeToggle · Toaster
│   ├── lib/
│   │   ├── db.ts                          better-sqlite3 + typed helpers
│   │   ├── crypto.ts                      AES-256-GCM vault
│   │   ├── auth.ts                        bcrypt + Web Crypto HMAC (Edge-safe)
│   │   ├── parse.ts                       CSV/TSV parser + source-kind detector + date sniffer
│   │   ├── report.ts                      prompt builder + result coercion
│   │   └── providers/{index,openai,anthropic,gemini}.ts
│   └── middleware.ts                      gate every page + /api/* behind /login
├── data/                                  SQLite + .vault-key (gitignored)
├── public/                                logo.svg, favicon.svg
├── package.json · tsconfig.json · next.config.mjs
├── tailwind.config.ts · postcss.config.js
├── .env.example                           keys + secrets template
├── LICENSE                                Apache License 2.0 (default)
├── LICENSE-COMMERCIAL.md                  optional paid commercial tier
└── README.md                              this file
```

## REST surface

| Method | Path | Purpose |
|---|---|---|
| `POST`   | `/api/auth`              | passcode → session cookie |
| `DELETE` | `/api/auth`              | sign out |
| `POST`   | `/api/generate`          | THE single AI call (datasets in, full report out) |
| `GET`    | `/api/reports`           | list with `kpis_count`, `insights_count`, `summary_preview` |
| `GET / PATCH / DELETE` | `/api/reports/:id` | open / star+status / delete |
| `GET / POST` | `/api/sources`      | list / add source label |
| `PATCH / DELETE` | `/api/sources/:id` | edit / delete |
| `GET / POST` | `/api/providers`    | list / add encrypted key |
| `PATCH / DELETE` | `/api/providers/:id` | default / delete |
| `POST`   | `/api/providers/test`    | round-trip a key |

## Provider keys

| Provider | Where to get a key | Default model |
|---|---|---|
| OpenAI | https://platform.openai.com/api-keys | `gpt-4o-mini` |
| Anthropic | https://console.anthropic.com/settings/keys | `claude-sonnet-4-5` |
| Google Gemini | https://aistudio.google.com/apikey | `gemini-2.0-flash` |

Keys are AES-256-GCM-encrypted with a 32-byte secret from
`TALLY_VAULT_KEY` (or auto-generated to `data/.vault-key` with `0600`
perms on first boot).

## Theme — "Quarterly Bond"

A modern business-report aesthetic. Light by default — bond-paper warm
white + navy ink + olive-green for positive deltas + brick-orange for
warnings + a single gold accent. Dark mode flips for late-night drafting.

- **Display** — Crimson Pro (classical serif with character)
- **Body** — Inter
- **Mono / labels** — JetBrains Mono
- **Accent** — navy `#1e3a8a` · gold `#b08a40` · mint `#3a8a52` · brick `#b94d1e`

Subtle horizontal rule lines run across the page as a faint paper-grid
texture. KPI tiles show direction arrows (▲ ▼ –) tinted to match the
delta. Reports print cleanly when you hit **↥ Print / PDF**.

## Safety

- Every page + `/api/*` route is gated by the lock-screen middleware.
- Provider keys are **AES-256-GCM-encrypted** before they touch disk.
- CSVs are parsed entirely in the **browser** — only a 12KB trimmed sample
  per dataset is sent to the AI provider when you press Generate.
- The session cookie is **HMAC-signed (Web Crypto)** and `HttpOnly · SameSite=Lax`.
- `data/` (SQLite + vault key) is git-ignored. No keys ever ship to the repo.

## What this does NOT do (yet)

- No direct integrations with Instagram / WhatsApp / Meta APIs. You
  export the CSV yourself from each tool (most tools support CSV export
  out of the box).
- No XLSX support — export your Excel sheet to CSV first. This keeps the
  bundle lean (no 1.5MB sheet.js dependency).
- No multi-user workspaces — single-passcode lock for now. Local-only.

These are deliberate scope cuts — getting the report quality right beats
half-integrated channel adapters.

## License

Tally is **dual-licensed**:

- **[LICENSE](LICENSE)** — Apache License 2.0. The default for everyone.
  Use, modify, redistribute, and run commercially at zero cost. Attribution
  notices must be preserved per the Apache terms.

- **[LICENSE-COMMERCIAL](LICENSE-COMMERCIAL.md)** — Optional paid commercial
  tier with warranty, IP indemnification, priority support, attribution
  waiver for white-label deployments, and custom integration assistance.
  Almost no one needs this — Apache 2.0 already grants commercial use.
  It exists for organisations whose legal teams require formal warranty
  + indemnification language that open-source licenses cannot provide.

Contact for the commercial tier: **vuqar.qenberov@gmail.com**.

Copyright 2026 Vugar Familoglu.
