# ⚡ TraceLens

> **AI-powered frontend performance intelligence platform.**  
> Audit any URL — localhost or live — get Core Web Vitals, bottleneck analysis, AI root-cause reasoning, and beautiful HTML reports.

---

## What Is TraceLens?

TraceLens is a developer-first performance intelligence CLI. You point it at any URL and it runs a full audit pipeline:

1. **Playwright** captures a real browser trace, screenshot, HAR archive
2. **Lighthouse** measures Core Web Vitals (LCP, FCP, TBT, CLS, TTI, TTFB, Speed Index)
3. **Trace Parser** extracts long tasks, scripting bottlenecks, render-blocking resources, hydration timing
4. **Bundle Analyzer** (optional) inspects Webpack stats for large deps and duplicates
5. **Analytics Engine** normalises and correlates all signals into a canonical intelligence report
6. **AI Engine** (optional) uses Gemini / OpenAI / Anthropic to produce root-cause reasoning, ranked recommendations, and estimated performance gains
7. **Report Engine** renders a polished self-contained HTML report + Markdown CI summary + JSON export — all offline-capable, zero runtime deps

---

## Architecture

```
CLI (tracelens audit / compare / report / analyze / doctor / init)
 │
 └── pipeline-engine        → orchestrates the audit session
      ├── playwright-runner  → real browser trace, screenshot, HAR
      ├── lighthouse-runner  → CWV metrics (LCP/FCP/TBT/CLS/TTI/TTFB)
      ├── trace-parser       → long tasks, scripting, render-blocking, hydration
      └── bundle-analyzer    → webpack bundle size, deps, duplicates
 │
 └── analytics-engine       → normalises + correlates → TraceLensIntelligenceReport
 │
 └── ai-engine              → Gemini / OpenAI / Anthropic root-cause analysis
 │
 └── report-engine          → HTML report + Markdown summary + JSON export
```

**Strict separation of concerns:**
- `pipeline-engine` — data collection only, never renders
- `analytics-engine` — normalisation only, never calls AI
- `ai-engine` — reasoning only, never re-runs pipeline
- `report-engine` — rendering only, never re-runs anything

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ (20 LTS recommended) | `node --version` |
| npm | 8+ | bundled with Node |
| Chrome / Chromium | any | Playwright downloads it automatically |

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/tracelens.git
cd tracelens
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Playwright browsers

```bash
npx playwright install chromium
```

### 4. Configure your AI key (optional but recommended)

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Then open `.env` and fill in your key:

```env
# Recommended: Gemini has a generous free tier
# Get a free key at: https://aistudio.google.com/apikey
TRACELENS_AI_PROVIDER=gemini
TRACELENS_AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your-key-here

# OR use OpenAI
# TRACELENS_AI_PROVIDER=openai
# TRACELENS_AI_MODEL=gpt-4o-mini
# OPENAI_API_KEY=your-key-here
```

> **Without an AI key:** TraceLens still works fully — Playwright, Lighthouse, trace parsing, and analytics all run. Only the AI root-cause section is skipped.

### 5. Verify your environment

```bash
npm run tracelens:doctor
```

Expected output:
```
  ✔  Node.js version          v20.x.x (LTS — excellent)
  ✔  Playwright               installed
  ✔  Chromium (Playwright)    installed
  ✔  Lighthouse               v13.x.x
  ✔  Package: trace-parser    reachable
  ✔  Package: analytics-engine reachable
  ✔  Package: ai-engine       reachable
  ✔  .env file                found
  ✔  AI provider key          GEMINI_API_KEY configured
  ✔  .tracelensrc.json        valid
  ✔  Output directory         writable
  
  ✔ Ready to audit!
```

---

## Quick Start — Audit Any URL

```bash
# Audit a live site
npm run tracelens:audit -- https://yoursite.com

# Audit and open the HTML report in browser
npm run tracelens:audit -- https://yoursite.com --open

# Audit your local dev server
npm run tracelens:audit -- http://localhost:3000

# Audit a specific page
npm run tracelens:audit -- http://localhost:3000/dashboard
```

---

## Testing on Localhost Projects

### Step 1 — Start your local dev server

```bash
# Next.js
npm run dev          # → http://localhost:3000

# Vite / React / Vue
npm run dev          # → http://localhost:5173

# Angular
ng serve             # → http://localhost:4200

# Any other server
npm start            # → check your terminal for the port
```

### Step 2 — Run TraceLens against it

```bash
# Audit the homepage
npm run tracelens:audit -- http://localhost:3000 --open

# Audit a specific route
npm run tracelens:audit -- http://localhost:3000/about --open

# Mobile audit with 4G throttle
npm run tracelens:audit -- http://localhost:3000 --device mobile --throttle 4g --open

# Multiple runs for stability (averages the results)
npm run tracelens:audit -- http://localhost:3000 --runs 3 --open
```

### How to change the target URL in test scripts

All test files read from **one single variable in `.env`** — no file editing needed:

```env
# .env
TRACELENS_TEST_URL=http://localhost:3000
```

Change that one line to point all tests at any target:

```env
# Local dev server (default)
TRACELENS_TEST_URL=http://localhost:3000

# Different port (Vite, Angular, etc.)
TRACELENS_TEST_URL=http://localhost:5173

# Specific route
TRACELENS_TEST_URL=http://localhost:3000/dashboard

# Live site
TRACELENS_TEST_URL=https://yourapp.com
```

Then run any test script without touching it:

```bash
npx tsx test-pipeline.ts
npx tsx test-lighthouse.ts
npx tsx test-playwright.ts
npx tsx test-ai-engine.ts   # auto-detects the latest session result
```

> **`test-ai-engine.ts`** automatically finds the most recently generated session in `reports/sessions/`. 
> To pin a specific session, set `TRACELENS_SESSION_PATH` in `.env`:
> ```env
> TRACELENS_SESSION_PATH=./reports/sessions/trace-session-20260509-120000-abc12/tracelens-result.json
> ```

### Running the test scripts directly

```bash
# Run the full pipeline test
npx tsc --project tsconfig.pipeline-test.json
node dist-test-pipeline/test-pipeline.js

# Or run with tsx (no compile step needed)
npx tsx test-pipeline.ts
npx tsx test-playwright.ts
npx tsx test-lighthouse.ts
npx tsx test-ai-engine.ts
```

---

## All CLI Commands

### `tracelens audit` — Full performance audit

```bash
npm run tracelens:audit -- <url> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--device <desktop\|mobile>` | `desktop` | Device emulation mode |
| `--runs <n>` | `1` | Number of Lighthouse runs (results are averaged) |
| `--throttle <none\|4g\|3g>` | `none` | Network throttle profile |
| `--no-ai` | (AI on) | Skip AI root-cause analysis |
| `--output <dir>` | `./reports` | Output directory for all artifacts |
| `--open` | off | Open the TraceLens HTML report in browser after audit |
| `--verbose` | off | Show detailed stage logs and timings |
| `--bundle <path>` | none | Path to webpack `stats.json` for bundle analysis |
| `--json` | off | Emit machine-readable JSON to stdout (CI/CD) |
| `--ci` | off | CI mode: no banner, compact logs, strict exit codes |
| `--save-session` | off | Persist full session metadata JSON |

**Examples:**

```bash
# Basic audit
npm run tracelens:audit -- https://example.com

# Mobile audit + open HTML report
npm run tracelens:audit -- https://example.com --device mobile --open

# 3 Lighthouse runs averaged + mobile + slow 4G
npm run tracelens:audit -- https://example.com --runs 3 --device mobile --throttle 4g

# Audit with Webpack bundle analysis
npm run tracelens:audit -- https://example.com --bundle ./path/to/stats.json --open

# Skip AI (faster, no API key needed)
npm run tracelens:audit -- https://example.com --no-ai --open

# CI/CD mode with JSON output
npm run tracelens:audit -- https://example.com --ci --json

# Verbose mode to see all stage timings
npm run tracelens:audit -- https://example.com --verbose

# Localhost audit
npm run tracelens:audit -- http://localhost:3000 --open
```

---

### `tracelens report` — Regenerate reports from existing JSON

> Renders HTML/Markdown reports from an existing intelligence artifact — **no re-audit**.

```bash
npm run tracelens:report -- <intelligence-json> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--format <html\|markdown\|json\|all>` | `html` | Output format(s) |
| `--output <dir>` | `./reports` | Output directory |
| `--open` | off | Open HTML report in browser |
| `--title <title>` | auto | Custom report title |
| `--compare <after-json>` | none | Generate before/after comparison report |
| `--before-label <label>` | `Baseline` | Label for the before report |
| `--after-label <label>` | `Current` | Label for the after report |

**Examples:**

```bash
# Regenerate HTML report from existing audit JSON
npm run tracelens:report -- reports/intelligence/ai-report-SESSION_ID.json --open

# Generate all formats
npm run tracelens:report -- reports/intelligence/ai-report-SESSION_ID.json --format all

# Before/after comparison report
npm run tracelens:report -- reports/intelligence/ai-report-BEFORE.json --compare reports/intelligence/ai-report-AFTER.json --open

# Comparison with labels
npm run tracelens:report -- baseline.json --compare feature-branch.json --before-label "main" --after-label "feat/new-hero" --open
```

---

### `tracelens compare` — Regression detection

```bash
npm run tracelens:compare -- <before> <after> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--json` | off | Output as machine-readable JSON |
| `--fail-on-regression` | on | Exit code 1 if any metric regressed |
| `--no-fail-on-regression` | — | Continue even if metrics regressed |
| `--output <dir>` | `./reports` | Output directory |
| `--verbose` | off | Show detailed comparison data |

**Examples:**

```bash
# Compare two audit result files
npm run tracelens:compare -- reports/sessions/trace-session-BEFORE/tracelens-result.json reports/sessions/trace-session-AFTER/tracelens-result.json

# CI gate — exits 1 if any regression
npm run tracelens:compare -- before.json after.json --fail-on-regression --json
```

---

### `tracelens analyze` — Re-run AI analysis only

> Re-runs AI reasoning on an existing report without re-running Playwright or Lighthouse.

```bash
npm run tracelens:analyze -- <report-json> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--output <dir>` | `./reports` | Output directory |
| `--open` | off | Open report in browser |
| `--verbose` | off | Verbose output |
| `--provider <name>` | from `.env` | Override AI provider |

**Example:**

```bash
npm run tracelens:analyze -- reports/sessions/trace-session-XYZ/tracelens-result.json --open
```

---

### `tracelens init` — Scaffold configuration

```bash
npm run tracelens:init
```

Creates `.tracelensrc.json` in the current directory:

```json
{
  "routes": ["/"],
  "device": "desktop",
  "throttle": "none",
  "runs": 1,
  "ai": true,
  "outputDir": "./reports",
  "bundle": {
    "webpackStatsPath": null,
    "framework": null
  }
}
```

**Using `.tracelensrc.json` for multi-route audits:**

```json
{
  "routes": [
    "/",
    "/products",
    "/checkout",
    "/blog"
  ],
  "device": "mobile",
  "throttle": "4g",
  "runs": 3,
  "ai": true,
  "outputDir": "./reports"
}
```

Then simply run:
```bash
npm run tracelens:audit -- http://localhost:3000
```

TraceLens reads the config and audits all routes automatically.

---

### `tracelens doctor` — Environment check

```bash
npm run tracelens:doctor
```

Checks: Node.js version, Playwright, Chromium, Lighthouse, all packages, `.env`, AI key, config file validity, output directory.

```bash
# JSON output for scripting
npm run tracelens:doctor -- --json
```

---

## Where Reports Are Saved

After every `tracelens audit`, all artifacts are written to `./reports/`:

```
reports/
├── sessions/
│   └── trace-session-YYYYMMDD-HHMMSS-XXXXX/
│       ├── tracelens-result.json          ← full pipeline result
│       ├── screenshot-homepage.png        ← Playwright screenshot
│       ├── trace-homepage.zip             ← Playwright trace (open with trace.playwright.dev)
│       ├── network-homepage.har           ← HAR archive
│       └── bottlenecks-homepage.json      ← parsed bottleneck data
│
├── lighthouse/
│   └── lhr-SESSION_ID-run1.json           ← raw Lighthouse JSON
│   └── lhr-SESSION_ID-run1.html           ← raw Lighthouse HTML report
│
└── intelligence/
    ├── ai-report-SESSION_ID.json          ← canonical intelligence bundle (input to report)
    ├── report-SESSION_ID.html             ← ✅ TraceLens HTML report  ← OPEN THIS
    ├── report-SESSION_ID.md               ← Markdown summary (PR comments)
    └── comparison-BEFORE-vs-AFTER.html    ← comparison report (if generated)
```

### The main report to look at

**Open `reports/intelligence/report-SESSION_ID.html`** in any browser.

It works **completely offline** — no internet connection needed, all CSS and SVGs are inlined.

---

## What the HTML Report Contains

The TraceLens HTML report has 16 collapsible sections:

| # | Section | What you see |
|---|---------|-------------|
| 1 | **Executive Summary** | Performance score gauge, primary bottleneck, risk count, quick wins |
| 2 | **Core Web Vitals** | LCP, FCP, TBT, CLS, TTI, TTFB, Speed Index — each with SVG gauge and rating |
| 3 | **Lighthouse Metrics** | Score gauge, metric table, link to raw Lighthouse HTML |
| 4 | **Performance Timeline** | SVG timeline: FCP → LCP → TTI markers, TBT window, long tasks, hydration |
| 5 | **Bottleneck Analysis** | Ranked risk cards with severity, confidence, source attribution, impact estimates |
| 6 | **Source Attribution** | Scripting bottlenecks table, render-blocking resources table |
| 7 | **Long Tasks** | Main thread blocking table, category breakdown bars |
| 8 | **Framework Intelligence** | Detected framework (Next.js, React, Vue…), confidence, framework-specific tips |
| 9 | **Hydration Analysis** | Hydration detection, duration, FCP→hydration gap, JS before FCP bar |
| 10 | **Bundle Intelligence** | Initial bundle size, parse time, largest deps, duplicate packages |
| 11 | **Stability & Confidence** | Data sources, multi-run variance (if `--runs 3+`) |
| 12 | **🤖 AI Root-Cause Analysis** | AI summary, primary bottleneck explanation, ranked root causes with evidence |
| 13 | **Optimization Roadmap** | AI-generated recommendations ranked by priority, effort, estimated impact |
| 14 | **Estimated Gains** | AI-projected LCP/FCP/TBT/Score improvements |
| 15 | **Artifact References** | Links to screenshot, Playwright trace, HAR, Lighthouse HTML |
| 16 | **Session Metadata** | Session ID, device, throttle, pipeline timing, AI provider/token usage |

### Dark/Light mode
The report auto-detects your system preference. Click the ☀️/🌙 toggle in the top-right corner to switch.

### Print mode
`Ctrl+P` / `Cmd+P` — expands all sections and removes decorative colours.

---

## AI Analysis — What It Tells You

When an AI provider is configured, section 12 includes:

**Executive Summary prose** — a 2–3 sentence plain-English summary of the biggest performance problems.

**Primary Bottleneck** — the single most impactful issue, with explanation and evidence chips (e.g. `LCP: 4200ms`, `TBT: 890ms`).

**Ranked Root Causes** — up to 5 causes, each with:
- Severity badge (CRITICAL / HIGH / MEDIUM / LOW)
- Explanation of why it causes the slowdown
- Impact statement
- Cited metrics

**Optimization Roadmap** — ranked recommendations with:
- Priority (critical / high / medium / low)
- Effort estimate (low / medium / high)
- Category (bundle / javascript / network / server / images / rendering)
- Estimated impact (e.g. "LCP −800ms")

**Estimated Gains** — projected improvements if all recommendations are implemented.

---

## Enabling Bundle Analysis (Webpack Projects)

Generate a Webpack stats file from your build:

```bash
# Option A — webpack-bundle-analyzer stats export
npx webpack --profile --json > stats.json

# Option B — in webpack.config.js
// Set stats: "normal" and run your build

# Option C — Next.js
# Install: npm install @next/bundle-analyzer
# Build with: ANALYZE=true npm run build
# stats.json appears in .next/
```

Then pass it to the audit:

```bash
npm run tracelens:audit -- http://localhost:3000 --bundle ./stats.json --open
```

The Bundle Intelligence section will show:
- Initial bundle size
- Total bundle size
- Estimated parse time
- Top 10 largest dependencies (with alternatives)
- Duplicate packages and wasted KB
- Hydration risk flag

---

## Testing on Live Sites

TraceLens works on any publicly accessible URL. No auth setup needed for public sites.

```bash
# News sites (usually have performance issues — great for demos)
npm run tracelens:audit -- https://www.cnn.com --open
npm run tracelens:audit -- https://www.bbc.com --open

# E-commerce
npm run tracelens:audit -- https://www.amazon.com --open

# Your own deployed staging/production site
npm run tracelens:audit -- https://staging.yourapp.com --open
npm run tracelens:audit -- https://yourapp.com --open

# Mobile performance on your live site
npm run tracelens:audit -- https://yourapp.com --device mobile --throttle 4g --open
```

> **Tip:** Sites behind authentication require a signed-in session. TraceLens uses a real browser (Playwright) so it can navigate authenticated routes if you modify the test scripts to log in first.

---

## CI/CD Integration

### GitHub Actions example

```yaml
- name: Run TraceLens Audit
  run: |
    npm install
    npx playwright install chromium
    npm run tracelens:audit -- https://staging.yourapp.com --ci --json
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

- name: Post PR comment
  run: |
    # Markdown summary is auto-written to reports/intelligence/report-*.md
    cat reports/intelligence/report-*.md >> $GITHUB_STEP_SUMMARY
```

### Regression gate

```bash
# Run two audits and compare — exit 1 if any metric regressed
npm run tracelens:audit -- https://yourapp.com --json > baseline.json
# ... deploy your changes ...
npm run tracelens:audit -- https://yourapp.com --json > current.json
npm run tracelens:compare -- baseline.json current.json --fail-on-regression
```

---

## Configuration Reference — `.tracelensrc.json`

```json
{
  "routes": ["/", "/about", "/pricing"],
  "device": "desktop",
  "throttle": "none",
  "runs": 1,
  "ai": true,
  "outputDir": "./reports",
  "bundle": {
    "webpackStatsPath": "./stats.json",
    "framework": "next.js"
  }
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `routes` | `string[]` | URL paths | Pages to audit (relative paths appended to the CLI URL argument) |
| `device` | `string` | `desktop` \| `mobile` | Device emulation |
| `throttle` | `string` | `none` \| `4g` \| `3g` | Network throttle |
| `runs` | `number` | `1`–`10` | Lighthouse run count (results averaged) |
| `ai` | `boolean` | `true` \| `false` | Enable AI root-cause analysis |
| `outputDir` | `string` | any path | Where all reports are saved |
| `bundle.webpackStatsPath` | `string\|null` | file path | Path to Webpack stats JSON |
| `bundle.framework` | `string\|null` | e.g. `"next.js"` | Override framework detection |

---

## Environment Variables Reference — `.env`

```env
# AI Provider selection
TRACELENS_AI_PROVIDER=gemini          # gemini | openai | anthropic | openrouter
TRACELENS_AI_MODEL=gemini-2.5-flash   # model name for chosen provider

# API Keys (only fill in the one you use)
GEMINI_API_KEY=                       # https://aistudio.google.com/apikey (free tier)
OPENAI_API_KEY=                       # https://platform.openai.com/api-keys
ANTHROPIC_API_KEY=                    # https://console.anthropic.com/
OPENROUTER_API_KEY=                   # https://openrouter.ai/ (200+ models, pay-per-use)

# Test target (used by all test-*.ts scripts)
TRACELENS_TEST_URL=http://localhost:3000       # change to any URL — local or live
TRACELENS_SESSION_PATH=               # optional: pin a specific session for test-ai-engine.ts
```

**Recommended model choices:**

| Provider | Model | Notes |
|----------|-------|-------|
| Gemini | `gemini-2.5-flash` | Free tier, fast, excellent for this use case |
| Gemini | `gemini-2.0-flash` | Slightly older, also free |
| OpenAI | `gpt-4o-mini` | Cheap, fast |
| OpenAI | `gpt-4o` | More thorough analysis |
| Anthropic | `claude-3-haiku-20240307` | Fast, cheap |
| OpenRouter | `google/gemini-2.5-flash` | Access any model via one key |

---

## Troubleshooting

### `tracelens doctor` shows Chromium not installed

```bash
npx playwright install chromium
```

### Audit hangs or fails on localhost

Make sure your dev server is running before running TraceLens:
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run tracelens:audit -- http://localhost:3000 --open
```

### AI analysis skipped

Check that `.env` exists and has a valid API key:
```bash
npm run tracelens:doctor
```
Look for the `AI provider key` check. If it's red, your key is missing or empty.

### `Cannot find module` errors

Run from the repo root (`e:\Tracelens\TraceLens\`):
```bash
npm install
```

### Reports directory is empty after audit

Check the terminal output — a failed pipeline stage will show `✗` in the stage table. Common causes:
- The target URL is unreachable (check your dev server is running)
- Playwright failed to launch (run `npx playwright install chromium`)

### Port not 3000

Just change the URL:
```bash
npm run tracelens:audit -- http://localhost:5173 --open   # Vite
npm run tracelens:audit -- http://localhost:4200 --open   # Angular
npm run tracelens:audit -- http://localhost:8080 --open   # any other port
```

---

## Project Structure

```
TraceLens/
├── .env                         ← your API keys (gitignored)
├── .env.example                 ← template — copy to .env
├── .tracelensrc.json            ← default audit config
├── package.json                 ← npm scripts: tracelens:audit, tracelens:report, etc.
│
├── cli/src/
│   ├── index.ts                 ← CLI entry point
│   ├── commands/
│   │   ├── audit.ts             ← tracelens audit
│   │   ├── report.ts            ← tracelens report
│   │   ├── compare.ts           ← tracelens compare
│   │   ├── analyze.ts           ← tracelens analyze
│   │   ├── doctor.ts            ← tracelens doctor
│   │   └── init.ts              ← tracelens init
│   ├── services/
│   │   └── orchestrator.ts      ← bridges CLI → packages
│   └── utils/
│       ├── logger.ts            ← coloured terminal output
│       ├── config.ts            ← .tracelensrc.json loader
│       └── paths.ts             ← path helpers
│
├── packages/
│   ├── pipeline-engine/         ← orchestrates audit sessions
│   ├── playwright-runner/       ← Playwright browser automation
│   ├── lighthouse-runner/       ← Lighthouse CWV measurement
│   ├── trace-parser/            ← Chrome trace analysis
│   ├── bundle-analyzer/         ← Webpack stats analysis
│   ├── analytics-engine/        ← normalise + correlate intelligence
│   ├── ai-engine/               ← Gemini/OpenAI/Anthropic reasoning
│   └── report-engine/           ← HTML/Markdown/JSON rendering
│
├── reports/                     ← generated (gitignored)
│   ├── sessions/                ← raw pipeline results + artifacts
│   ├── lighthouse/              ← raw Lighthouse JSON + HTML
│   └── intelligence/            ← ✅ final reports (open these)
│
└── test-pipeline.ts             ← standalone integration tests
    test-playwright.ts
    test-lighthouse.ts
    test-ai-engine.ts
```

---

## Typical Developer Workflow

```bash
# 1. Start your local app
cd my-app && npm run dev
# → running on http://localhost:3000

# 2. Switch to TraceLens
cd ../TraceLens

# 3. Quick audit (no AI, fast)
npm run tracelens:audit -- http://localhost:3000 --no-ai --open

# 4. Full AI audit (requires .env with API key)
npm run tracelens:audit -- http://localhost:3000 --open

# 5. Look at the report that opens in your browser
# → reports/intelligence/report-SESSION_ID.html

# 6. Make code changes in your app

# 7. Run another audit and compare
npm run tracelens:audit -- http://localhost:3000 --json > after.json
npm run tracelens:compare -- reports/sessions/trace-session-FIRST/tracelens-result.json after.json

# 8. Generate a fresh HTML comparison report
npm run tracelens:report -- reports/intelligence/ai-report-FIRST.json \
  --compare reports/intelligence/ai-report-SECOND.json \
  --before-label "before my fix" --after-label "after my fix" \
  --open
```

---



---


