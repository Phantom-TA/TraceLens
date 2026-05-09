/**
 * @file commands/compare.ts
 * @description `tracelens compare <before> <after>` — regression detection.
 *
 * WHAT IT DOES:
 *   - Loads two tracelens-result.json files
 *   - Compares Core Web Vitals metric by metric
 *   - Detects regressions (>5% change in any metric)
 *   - Highlights improvements
 *   - Generates a human-readable comparison summary
 *
 * FLAGS:
 *   --json                  Machine-readable JSON output (for CI/CD integration)
 *   --fail-on-regression    Exit code 1 if any metric regressed (CI gate — default in CI)
 *   --output <dir>          Output directory for comparison artifacts
 *   --verbose               Verbose output
 *   --open                  Open comparison output in browser (future: HTML diff)
 */

import { Command } from "commander";
import chalk from "chalk";

import {
  log, setVerbose, printBanner, printComparisonTable,
  jsonOutput, setJsonMode, isJsonMode, setCI, isCIMode,
} from "../utils/logger.js";
import { findReportFile } from "../utils/paths.js";
import { compareResults } from "../services/orchestrator.js";
import type { CompareOptions } from "../types/index.js";

export function createCompareCommand(): Command {
  const cmd = new Command("compare");

  cmd
    .description("Compare two TraceLens audit reports and detect regressions")
    .argument("<before>", "Path to the baseline report (tracelens-result.json)")
    .argument("<after>", "Path to the new report to compare against baseline")
    .option("--json", "Output results as machine-readable JSON", false)
    .option("--fail-on-regression", "Exit code 1 if any metric regressed (default: true)", true)
    .option("--no-fail-on-regression", "Continue with exit 0 even if metrics regressed")
    .option("-o, --output <dir>", "Output directory for comparison report", "./reports")
    .option("-v, --verbose", "Show detailed comparison data", false)
    .option("--open", "Open comparison summary in browser (future HTML diff)", false)
    .action(async (before: string, after: string, options: CompareOptions & { verbose: boolean; failOnRegression: boolean }) => {
      await runCompare(before, after, options);
    });

  return cmd;
}

// ─── Main Compare Flow ────────────────────────────────────────────────────────

async function runCompare(
  beforePath: string,
  afterPath: string,
  options: CompareOptions & { verbose: boolean; failOnRegression: boolean }
): Promise<void> {
  setVerbose(options.verbose);
  if (options.json) setJsonMode(true);

  if (!isJsonMode()) printBanner();

  // ── Resolve paths ──────────────────────────────────────────────────────────
  let resolvedBefore: string;
  let resolvedAfter: string;

  try {
    resolvedBefore = findReportFile(beforePath);
    resolvedAfter  = findReportFile(afterPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isJsonMode()) { jsonOutput("compare", false, null, [msg]); process.exit(1); }
    log.error(msg);
    process.exit(1);
  }

  if (!isJsonMode()) {
    log.section("Report Comparison");
    log.line(`  ${chalk.gray("Baseline :")} ${resolvedBefore}`);
    log.line(`  ${chalk.gray("New      :")} ${resolvedAfter}`);
    log.blank();
  }

  // ── Run comparison ─────────────────────────────────────────────────────────
  let results;
  try {
    results = compareResults(resolvedBefore, resolvedAfter);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isJsonMode()) { jsonOutput("compare", false, null, [msg]); process.exit(1); }
    log.error(msg);
    process.exit(1);
  }

  if (results.length === 0) {
    const msg = "No matching routes found between the two reports.";
    if (isJsonMode()) { jsonOutput("compare", false, { results: [] }, [msg]); process.exit(1); }
    log.warn(msg);
    log.line("Make sure both reports audited the same URL(s).");
    process.exit(1);
  }

  const anyRegression = results.some((r) => r.regressions.length > 0);
  const allImprovements = results.flatMap((r) => r.improvements);
  const allRegressions  = results.flatMap((r) => r.regressions);

  // ── JSON output mode ───────────────────────────────────────────────────────
  if (isJsonMode()) {
    jsonOutput("compare", !anyRegression, {
      baseline: { path: resolvedBefore, sessionId: results[0]?.before.sessionId ?? null },
      current:  { path: resolvedAfter,  sessionId: results[0]?.after.sessionId  ?? null },
      results: results.map((r) => ({
        url: r.url,
        regressions: r.regressions,
        improvements: r.improvements,
        unchanged: r.vitals.filter((v) => v.trend === "unchanged").map((v) => v.metric),
        summary: r.summary,
        vitals: r.vitals,
      })),
      overall: {
        regressions: allRegressions,
        improvements: allImprovements,
        hasRegressions: anyRegression,
        passed: !anyRegression,
      },
    });
    if (anyRegression && options.failOnRegression) process.exit(1);
    process.exit(0);
  }

  // ── Human-readable per-route output ───────────────────────────────────────
  for (const result of results) {
    const shortUrl = result.url.length > 60 ? result.url.slice(0, 57) + "…" : result.url;
    log.line(`\n  ${chalk.bold("URL:")} ${chalk.underline(shortUrl)}`);
    log.blank();

    printComparisonTable(result.vitals);

    if (result.regressions.length > 0) {
      log.line(`  ${chalk.red.bold("⚠  Regressions detected:")}`);
      log.blank();
      for (const metric of result.regressions) {
        const v = result.vitals.find((vv) => vv.metric === metric);
        const before = v?.before !== null ? `${v?.before}ms` : "n/a";
        const after  = v?.after  !== null ? `${v?.after}ms`  : "n/a";
        const diff   = v && v.diffMs !== null && v.diffMs > 0 ? ` (+${v.diffMs}ms)` : "";
        log.line(`    ${chalk.red("↑")}  ${chalk.white(metric)}: ${before} → ${chalk.red(after + diff)}`);
      }
      log.blank();
    }

    if (result.improvements.length > 0) {
      log.line(`  ${chalk.green.bold("✓  Improvements:")}`);
      log.blank();
      for (const metric of result.improvements) {
        const v = result.vitals.find((vv) => vv.metric === metric);
        const before = v?.before !== null ? `${v?.before}ms` : "n/a";
        const after  = v?.after  !== null ? `${v?.after}ms`  : "n/a";
        const diff   = v && v.diffMs !== null && v.diffMs < 0 ? ` (${v.diffMs}ms)` : "";
        log.line(`    ${chalk.green("↓")}  ${chalk.white(metric)}: ${before} → ${chalk.green(after + diff)}`);
      }
      log.blank();
    }

    log.line(`  ${chalk.gray("Summary:")} ${result.summary}`);
    log.blank();
  }

  // ── Final verdict ──────────────────────────────────────────────────────────
  log.section("Comparison Result");

  if (allRegressions.length > 0) {
    log.line(`  ${chalk.red.bold("⚠  Metrics regressed:")} ${chalk.red(allRegressions.join(", "))}`);
    log.blank();
  }
  if (allImprovements.length > 0) {
    log.line(`  ${chalk.green.bold("✓  Metrics improved:")} ${chalk.green(allImprovements.join(", "))}`);
    log.blank();
  }

  if (!anyRegression) {
    log.success("All metrics stable or improved — no regressions detected.");
    log.blank();
    process.exit(0);
  }

  if (options.failOnRegression) {
    log.error("Regressions detected — exiting with code 1 (CI gate failure).");
    log.blank();
    log.line(chalk.gray("  Use --no-fail-on-regression to suppress the exit code."));
    log.blank();
    process.exit(1);
  } else {
    log.warn("Regressions detected, but --no-fail-on-regression is set — exiting 0.");
    log.blank();
    process.exit(0);
  }
}
