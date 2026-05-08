# TraceLens — What Has Been Built

> **TraceLens** is an AI-powered frontend performance intelligence platform.
> This document summarizes the three core packages built so far.

---

## Repository Root

```
E:\Tracelens\TraceLens\
├── packages/
│   ├── playwright-runner/     ✅ Complete
│   ├── lighthouse-runner/     ✅ Complete
│   ├── trace-parser/          ✅ Complete
│   ├── bundle-analyzer/       🔲 Planned
│   ├── analytics-engine/      🔲 Planned
│   ├── ai-engine/             🔲 Planned
│   └── report-engine/         🔲 Planned
├── apps/
│   ├── dashboard/             🔲 Planned
│   └── api/                   🔲 Planned
├── cli/                       🔲 Planned
└── reports/                   📁 Output directory (auto-generated)
```

---

## Package 1 — `@tracelens/playwright-runner`

### What It Does
Automates browser sessions using Playwright (Chromium) to capture raw performance artifacts from any URL. It is **not** an analysis tool — it is a pure data collection layer.

### Module Structure

```
packages/playwright-runner/src/
├── index.ts            Public API barrel
├── types.ts            All TypeScript contracts (RunnerConfig, RouteResult, etc.)
├── config.ts           Config resolver — merges user input with defaults
├── runner.ts           Main orchestrator — coordinates all capture steps
├── browser.ts          Browser/context lifecycle (launch, create, close)
├── timings.ts          Navigation timing extraction via Performance API
├── trace-capture.ts    CDP trace recording (start/stop, save .zip)
├── screenshot.ts       Full-page and element screenshot capture
└── output-manager.ts   Directory structure + file writing helpers
```

### Key Capabilities
| Capability | Detail |
|---|---|
| Device emulation | `desktop` / `mobile` / `tablet` profiles (viewport, UA, touch, DPR) |
| Network throttle | `4g` / `3g` / `none` — via Chrome DevTools Protocol |
| Playwright trace | Records `.zip` trace file (viewable in `playwright show-trace`) |
| HAR capture | Full HTTP archive of all network requests |
| Screenshot | Full-page PNG/JPEG capture |
| Navigation timings | FCP, FP, TTFB, DCL, Load — extracted from `performance.getEntriesByType` |
| Multi-run support | Run each route N times, all results returned for averaging |
| Session isolation | Each route gets its own `BrowserContext` — no state leakage |

### Output Structure
```
reports/
└── <sessionId>/
    ├── session.json          Full RunnerResult (all routes, all runs)
    └── <route-label>/
        ├── screenshot.png
        ├── trace.zip
        └── network.har
```

### Public API
```ts
import { run } from "@tracelens/playwright-runner";

const result = await run({
  routes: [{ url: "https://example.com" }],
  device: "mobile",
  throttle: "4g",
  runs: 3,
  outputDir: "./reports",
});

console.log(result.routes[0].timings.firstContentfulPaint);
```

### Validated Against
`https://example.com` — desktop preset, 1 run, full artifacts captured successfully.

---

## Package 2 — `@tracelens/lighthouse-runner`

### What It Does
Runs Google Lighthouse programmatically against any URL. Generates both **JSON** (machine-readable) and **HTML** (human-readable) audit reports. Supports multi-run averaging for statistical stability.

### Module Structure

```
packages/lighthouse-runner/src/
├── index.ts            Public API barrel
├── types.ts            All TypeScript contracts (LighthouseRunnerConfig, LighthouseRouteResult, etc.)
├── config.ts           Config resolver with preset-aware defaults
├── presets.ts          Desktop / Mobile / CI Lighthouse config definitions + Chrome flags
├── runner.ts           Main orchestrator — Chrome launch → Lighthouse → report write → scores
└── output-manager.ts   Directory structure + JSON/HTML file writers
```

### Key Capabilities
| Capability | Detail |
|---|---|
| Audit presets | `desktop` · `mobile` (matches PageSpeed Insights) · `ci` (devtools throttle) |
| Output formats | `json` + `html` — both generated per run |
| Categories | Performance, Accessibility, Best Practices, SEO |
| Core Web Vitals | FCP, LCP, TBT, CLS, TTI, TTFB, Speed Index extracted from LHR |
| Multi-run averaging | Run each route N times, averages computed across successful runs |
| Chrome management | Launches and kills its own Chrome per run via `chrome-launcher` |
| Score ratings | Each category score rated: `pass` / `average` / `fail` / `error` |
| Session summary | `session-summary.json` with averages written at session end |

### Output Structure
```
reports/lighthouse/
└── <sessionId>/
    ├── session-summary.json      Averaged metrics across all routes/runs
    └── <route-label>/
        ├── report.json           Raw Lighthouse LHR
        └── report.html           Rendered HTML report
    └── <route-label>/run-2/      (when runs > 1)
        ├── report.json
        └── report.html
```

### Public API
```ts
import { run } from "@tracelens/lighthouse-runner";

const result = await run({
  routes: [{ url: "https://example.com" }],
  preset: "mobile",
  formats: ["json", "html"],
  runs: 3,
  outputDir: "./reports/lighthouse",
});

console.log(result.routes[0].averages.lcp);          // e.g. 1240 (ms)
console.log(result.routes[0].runs[0].scores.performance.score); // e.g. 0.91
```

### Validated Against
`https://example.com` — desktop preset, 1 run.
Results: **Performance score: 100, LCP: 237ms, FCP: 237ms, TBT: 0ms, CLS: 0**.

---

## Package 3 — `@tracelens/trace-parser`

### What It Does
The **core intelligence layer** of TraceLens. Converts noisy Chrome traces and/or Lighthouse LHR JSON into compact, structured bottleneck summaries optimized for AI reasoning.

> **Critical design rule:** Raw traces are NEVER sent to AI. The parser extracts only meaningful performance signals and produces a compact JSON summary.

### Module Structure

```
packages/trace-parser/src/
├── index.ts                    Public API barrel (only parse() + types exported)
├── types.ts                    30+ TypeScript interfaces — all input/output contracts
├── filters.ts                  Renderer thread discovery + aggressive event filtering
├── parser.ts                   Main orchestrator — coordinates all extractors
├── correlator.ts               Cross-signal diagnosis engine
├── summarizer.ts               AI signal builder (≤20 concise performance facts)
└── extractors/
    ├── long-tasks.ts           Task detection >50ms, attribution, TBT computation
    ├── lcp.ts                  LCP candidate from trace events + LHR
    ├── render-blocking.ts      Render-blocking CSS/JS resources
    ├── hydration.ts            React/Next.js/Vue hydration delay detection
    └── scripting.ts            JS bottleneck grouping, rendering timeline, bundle signals
```

### Input Modes
| Mode | Input | Data Quality |
|---|---|---|
| Full | Chrome trace + LHR + HAR | `"full"` — richest analysis |
| Trace only | Chrome DevTools trace JSON | `"trace"` |
| LHR only | Lighthouse report JSON | `"lhr"` — most common in CI |
| Partial | Any single source | `"partial"` |

### What It Extracts

| Signal | Source | Description |
|---|---|---|
| Core Web Vitals | LHR / trace | FCP, LCP, TBT, CLS, TTI, TTFB, Speed Index |
| Long tasks | Trace | Tasks >50ms — attributed to scripting / layout / paint / parsing |
| Main thread blocking | Trace | Total blocking time, category breakdown |
| LCP candidate | Trace / LHR | Element, render time, size, render-blocked flag |
| Render-blocking resources | LHR / trace | CSS/JS that delays FCP, with blocking duration |
| Hydration delay | Trace user-timing | React / Next.js / Vue hydration via `performance.mark()` |
| JS scripting bottlenecks | Trace | Grouped by script URL, sorted by total execution time |
| Bundle signals | Trace | JS before FCP, large initial bundle detection |
| Correlation insights | All signals | Primary bottleneck diagnosis + causal explanation |
| AI signals | All signals | ≤20 concise, human-readable performance facts |

### Output Schema (compact summary)
```json
{
  "url": "https://example.com",
  "dataQuality": "lhr",
  "vitals": { "fcp": 237, "lcp": 237, "tbt": 0, "cls": 0, "ttfb": 55 },
  "mainThread": { "totalBlockingMs": 0, "longTaskCount": 0 },
  "largestLongTasks": [
    { "script": "chunk.js", "duration": 820, "startTime": 3120, "attribution": "scripting" }
  ],
  "lcpCandidate": {
    "element": "hero-image.png", "renderTime": 4200, "sizeKB": 2400, "wasRenderBlocked": true
  },
  "renderBlockingResources": [
    { "url": "fonts.css", "type": "stylesheet", "blockingMs": 340 }
  ],
  "hydration": { "detected": true, "framework": "next.js", "durationMs": 1200, "fcpToHydrationMs": 980 },
  "bundleSignals": { "largeInitialJS": true, "jsBeforeFcpMs": 650 },
  "correlations": {
    "primaryBottleneck": "render-blocking-resources",
    "explanation": "Render-blocking resource \"fonts.css\" blocks FCP by ~340ms. LCP: 4200ms. FCP: 1100ms."
  },
  "aiSignals": [
    "Primary bottleneck: render blocking resources.",
    "LCP is 4200ms (Poor).",
    "1 render-blocking resource(s). Worst: \"fonts.css\" blocks ~340ms.",
    "next.js hydration detected: 1200ms, 980ms after FCP."
  ]
}
```

### Filtering Strategy
Chrome traces contain 50,000–500,000 raw events. The parser keeps only:
- Renderer main thread events (`CrRendererMain`)
- Cross-process events (`LargestContentfulPaint::Candidate`, `firstContentfulPaint`, etc.)
- Categories: `devtools.timeline`, `loading`, `blink.user_timing`, `toplevel`, `v8`

Everything else is discarded before analysis begins.

### Public API
```ts
import { parse } from "@tracelens/trace-parser";
import { readFileSync } from "fs";

const result = parse({
  lhr: readFileSync("report.json", "utf-8"),       // Lighthouse LHR
  harJson: readFileSync("network.har", "utf-8"),   // Optional HAR
  url: "https://example.com",
});

console.log(result.correlations.primaryBottleneck);  // "render-blocking-resources"
console.log(result.aiSignals);                       // Array of concise AI-ready facts
```

### Performance
- **Parse time: ~4ms** on a real Lighthouse LHR (no runtime dependencies — pure TypeScript)
- **Zero npm dependencies** — fully self-contained

### Validated Against
`https://example.com` Lighthouse LHR — correctly detected: no long tasks, no render blocking, no hydration, excellent CWV. Primary bottleneck: `unknown` (well-optimized site).

---

## Shared Conventions Across All Packages

| Convention | Value |
|---|---|
| Language | TypeScript (strict mode) |
| Module system | NodeNext ESM (`.js` extensions in imports) |
| Timestamps | All public values in **milliseconds** |
| Reference point | All times relative to `navigationStart` (t=0) |
| Output directories | `reports/` (playwright), `reports/lighthouse/` (lighthouse) |
| Error handling | Non-fatal — failed routes return `success: false` with error message |
| Session IDs | `YYYYMMDDHHMMSS-<random5>` format |
| Noise filtering | Aggressive — all packages discard irrelevant data early |

---

## Data Flow Between Packages

```
URL
 │
 ├──▶ playwright-runner ──▶ trace.zip, network.har, screenshot.png, session.json
 │
 ├──▶ lighthouse-runner ──▶ report.json (LHR), report.html, session-summary.json
 │
 └──▶ trace-parser ──────▶ ParsedTraceBottlenecks (compact AI-ready JSON)
      (reads LHR + HAR)         │
                                └──▶ ai-engine (planned) ──▶ root-cause explanation
```

---

*Last updated: 2026-05-08*
