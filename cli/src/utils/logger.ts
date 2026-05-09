/**
 * @file utils/logger.ts
 * @description Colorized, structured terminal output for the TraceLens CLI.
 *
 * Provides:
 *   - Semantic log levels (info, success, warn, error, debug)
 *   - Step progress indicators
 *   - Table formatting for vitals display
 *   - Verbose-mode gating
 */

import chalk from "chalk";

// ─── State ────────────────────────────────────────────────────────────────────

let _verbose = false;
let _silent = false;
let _jsonMode = false;
let _ciMode = false;

export function setVerbose(v: boolean) { _verbose = v; }
export function setSilent(s: boolean)  { _silent = s; }
export function setJsonMode(j: boolean) { _jsonMode = j; if (j) _silent = true; }
export function setCI(ci: boolean)     { _ciMode = ci; }
export function isJsonMode() { return _jsonMode; }
export function isCIMode()   { return _ciMode; }

// ─── Core Log Functions ───────────────────────────────────────────────────────

export const log = {
  /** Standard informational message */
  info(msg: string) {
    if (_silent) return;
    console.log(chalk.cyan("  ℹ") + "  " + msg);
  },

  /** Success confirmation */
  success(msg: string) {
    if (_silent) return;
    console.log(chalk.green("  ✓") + "  " + msg);
  },

  /** Non-fatal warning */
  warn(msg: string) {
    if (_silent) return;
    console.log(chalk.yellow("  ⚠") + "  " + chalk.yellow(msg));
  },

  /** Fatal error */
  error(msg: string) {
    console.error(chalk.red("  ✗") + "  " + chalk.red(msg));
  },

  /** Debug message — only shown in --verbose mode */
  debug(msg: string) {
    if (!_verbose || _silent) return;
    console.log(chalk.gray("  ·") + "  " + chalk.gray(msg));
  },

  /** Step header (numbered pipeline step) */
  step(n: number, total: number, msg: string) {
    if (_silent) return;
    const badge = chalk.bgCyan.black(` ${n}/${total} `);
    console.log(`\n  ${badge}  ${chalk.bold(msg)}`);
  },

  /** Section divider with label */
  section(title: string) {
    if (_silent) return;
    const line = "─".repeat(54);
    console.log(`\n  ${chalk.cyan(line)}`);
    console.log(`  ${chalk.bold.white(title)}`);
    console.log(`  ${chalk.cyan(line)}\n`);
  },

  /** Plain line — no prefix */
  line(msg: string) {
    if (_silent) return;
    console.log("  " + msg);
  },

  /** Blank line */
  blank() {
    if (_silent) return;
    console.log();
  },
};

// ─── JSON Output Emitter ─────────────────────────────────────────────────────

/**
 * Emit a deterministic JSON envelope to stdout.
 * Used when --json flag is active.
 */
export function jsonOutput(command: string, success: boolean, data: unknown, errors?: string[]) {
  const envelope = {
    tracelens: "2.0.0",
    command,
    timestamp: new Date().toISOString(),
    success,
    data,
    ...(errors?.length ? { errors } : {}),
  };
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export function printBanner() {
  if (_silent || _ciMode) return;
  console.log();
  console.log(chalk.cyan("  ████████╗██████╗  █████╗  ██████╗███████╗"));
  console.log(chalk.cyan("     ██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝"));
  console.log(chalk.cyan("     ██║   ██████╔╝███████║██║     █████╗  "));
  console.log(chalk.cyan("     ██║   ██╔══██╗██╔══██║██║     ██╔══╝  "));
  console.log(chalk.cyan("     ██║   ██║  ██║██║  ██║╚██████╗███████╗"));
  console.log(chalk.cyan("     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝"));
  console.log();
  console.log(chalk.gray("  AI-Powered Frontend Performance Intelligence"));
  console.log(chalk.gray("  v2.0.0 — Intelligence Refinement Edition"));
  console.log();
}

// ─── Vitals Table ─────────────────────────────────────────────────────────────

const THRESHOLDS = {
  lcp:  { good: 2500, poor: 4000 },
  fcp:  { good: 1800, poor: 3000 },
  tbt:  { good: 200,  poor: 600 },
  cls:  { good: 0.1,  poor: 0.25 },
  ttfb: { good: 800,  poor: 1800 },
};

type MetricKey = keyof typeof THRESHOLDS;

function rateMetric(key: MetricKey, value: number): "good" | "needs-improvement" | "poor" {
  const t = THRESHOLDS[key];
  if (value <= t.good) return "good";
  if (value >= t.poor) return "poor";
  return "needs-improvement";
}

function colorMetric(key: MetricKey, value: number | null, unit = "ms"): string {
  if (value === null) return chalk.gray("  n/a");
  const rating = rateMetric(key, value);
  const formatted = unit === "ms" ? `${value}ms` : `${value}`;
  if (rating === "good") return chalk.green(formatted.padStart(8));
  if (rating === "poor") return chalk.red(formatted.padStart(8));
  return chalk.yellow(formatted.padStart(8));
}

function colorScore(score: number | null): string {
  if (score === null) return chalk.gray("  n/a");
  if (score >= 90) return chalk.green(`${score}/100`.padStart(8));
  if (score >= 50) return chalk.yellow(`${score}/100`.padStart(8));
  return chalk.red(`${score}/100`.padStart(8));
}

export function printVitalsTable(
  url: string,
  vitals: {
    lcp: number | null;
    fcp: number | null;
    tbt: number | null;
    cls: number | null;
    ttfb: number | null;
    score: number | null;
  }
) {
  if (_silent) return;
  const shortUrl = url.length > 50 ? url.slice(0, 47) + "…" : url;
  console.log(`\n  ${chalk.bold("URL:")} ${chalk.underline(shortUrl)}`);
  console.log();
  console.log(`  ${chalk.gray("Metric".padEnd(10))}  ${chalk.gray("Value".padStart(8))}  ${chalk.gray("Rating")}`);
  console.log(`  ${chalk.gray("─".repeat(34))}`);

  const rows: Array<[string, string]> = [
    ["Score ", colorScore(vitals.score)],
    ["LCP   ", colorMetric("lcp", vitals.lcp)],
    ["FCP   ", colorMetric("fcp", vitals.fcp)],
    ["TBT   ", colorMetric("tbt", vitals.tbt)],
    ["CLS   ", vitals.cls !== null
      ? (vitals.cls <= 0.1 ? chalk.green : vitals.cls <= 0.25 ? chalk.yellow : chalk.red)(vitals.cls.toString().padStart(8))
      : chalk.gray("  n/a")],
    ["TTFB  ", colorMetric("ttfb", vitals.ttfb)],
  ];

  for (const [label, value] of rows) {
    console.log(`  ${chalk.white(label)}  ${value}`);
  }
  console.log();
}

// ─── Risk Table ───────────────────────────────────────────────────────────────

export function printRisks(risks: Array<{ label: string; severity: string; impact: string }>) {
  if (_silent || risks.length === 0) return;
  console.log(`  ${chalk.bold("Performance Risks:")}`);
  console.log();
  for (let i = 0; i < risks.length; i++) {
    const r = risks[i]!;
    const sev = r.severity === "critical" ? chalk.bgRed.white(" CRITICAL ")
      : r.severity === "high" ? chalk.bgYellow.black(" HIGH     ")
      : r.severity === "medium" ? chalk.bgBlue.white(" MEDIUM   ")
      : chalk.bgGray.white(" LOW      ");
    console.log(`  ${chalk.gray(`${i + 1}.`)} ${sev} ${chalk.white(r.label)}`);
    console.log(`     ${chalk.gray(r.impact)}`);
  }
  console.log();
}

// ─── Quick Wins ───────────────────────────────────────────────────────────────

export function printQuickWins(wins: Array<{ action: string; estimatedSavingsMs: number | null; priority: number }>) {
  if (_silent || wins.length === 0) return;
  console.log(`  ${chalk.bold("Quick Wins:")}`);
  console.log();
  for (const win of wins.slice(0, 5)) {
    const savings = win.estimatedSavingsMs ? chalk.green(`~${win.estimatedSavingsMs}ms`) : "";
    console.log(`  ${chalk.cyan("→")}  ${win.action} ${savings}`);
  }
  console.log();
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

export function printComparisonTable(
  comparisons: Array<{
    metric: string;
    before: number | null;
    after: number | null;
    diffMs: number | null;
    trend: "improved" | "regressed" | "unchanged";
  }>
) {
  if (_silent) return;
  console.log(`  ${chalk.gray("Metric".padEnd(10))}  ${"Before".padStart(10)}  ${"After".padStart(10)}  ${"Diff".padStart(10)}  Status`);
  console.log(`  ${chalk.gray("─".repeat(58))}`);
  for (const row of comparisons) {
    const before = row.before !== null ? `${row.before}ms` : "n/a";
    const after = row.after !== null ? `${row.after}ms` : "n/a";
    const diff = row.diffMs !== null ? `${row.diffMs > 0 ? "+" : ""}${row.diffMs}ms` : "n/a";
    const icon = row.trend === "improved" ? chalk.green("↓ improved")
      : row.trend === "regressed" ? chalk.red("↑ REGRESSED")
      : chalk.gray("→ unchanged");
    console.log(
      `  ${chalk.white(row.metric.padEnd(10))}  ${before.padStart(10)}  ${after.padStart(10)}  ${diff.padStart(10)}  ${icon}`
    );
  }
  console.log();
}

// ─── Observability Summary ────────────────────────────────────────────────────

export function printObservability(obs: {
  sessionId: string;
  url: string;
  device: string;
  durationMs: number;
  provider?: unknown;
  model?: unknown;
  tokens?: unknown;
  reportPaths: string[];
  outputDir: string;
}) {
  if (_silent) return;
  log.section("Session Summary");
  log.line(`${chalk.gray("Session  :")} ${obs.sessionId}`);
  log.line(`${chalk.gray("URL      :")} ${chalk.underline(obs.url)}`);
  log.line(`${chalk.gray("Device   :")} ${obs.device}`);
  log.line(`${chalk.gray("Duration :")} ${(obs.durationMs / 1000).toFixed(1)}s`);
  if (obs.provider) log.line(`${chalk.gray("Provider :")} ${obs.provider}/${obs.model ?? ""}`);
  if (obs.tokens) log.line(`${chalk.gray("Tokens   :")} ${obs.tokens}`);
  log.blank();
  if (obs.reportPaths.length > 0) {
    log.line(chalk.bold("  Reports:"));
    for (const p of obs.reportPaths) {
      const label = p.endsWith(".md") ? "Markdown " : p.endsWith(".html") ? "HTML     " : "JSON     ";
      log.line(`    ${chalk.cyan(label)}  ${p}`);
    }
  }
  log.blank();
}

export function printTimingSummary(
  stages: Record<string, { status: string; durationMs: number | null }>
) {
  if (_silent) return;
  const rows = Object.entries(stages);
  if (rows.length === 0) return;
  log.blank();
  log.line(chalk.bold("  Stage Timings:"));
  log.line(`  ${chalk.gray("─".repeat(46))}`);
  for (const [name, record] of rows) {
    const icon = record.status === "done" ? chalk.green("✓")
      : record.status === "failed" ? chalk.red("✗")
      : record.status === "skipped" ? chalk.gray("-")
      : chalk.yellow("~");
    const dur = record.durationMs !== null ? chalk.gray(`${record.durationMs}ms`) : chalk.gray(record.status);
    log.line(`  ${icon}  ${chalk.white(name.padEnd(18))}  ${dur}`);
  }
  log.blank();
}

export function printCISummary(summary: {
  sessionId: string;
  url: string;
  success: boolean;
  durationMs: number;
  risksCount: number;
  primaryBottleneck: string | null;
  reportPath: string | null;
}) {
  // CI mode: minimal, deterministic, grep-friendly lines
  console.log(`[tracelens] session=${summary.sessionId}`);
  console.log(`[tracelens] url=${summary.url}`);
  console.log(`[tracelens] success=${summary.success}`);
  console.log(`[tracelens] duration=${Math.round(summary.durationMs / 1000)}s`);
  console.log(`[tracelens] risks=${summary.risksCount}`);
  if (summary.primaryBottleneck) console.log(`[tracelens] bottleneck=${summary.primaryBottleneck}`);
  if (summary.reportPath) console.log(`[tracelens] report=${summary.reportPath}`);
}
