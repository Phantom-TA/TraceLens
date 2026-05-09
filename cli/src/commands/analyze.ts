/**
 * @file commands/analyze.ts
 * @description `tracelens analyze <report>` — re-run AI reasoning on existing reports.
 *
 * PURPOSE:
 *   Run AI root-cause analysis on an existing TraceLens intelligence report
 *   WITHOUT re-running Playwright, Lighthouse, trace parsing, or bundle analysis.
 *
 * USE CASES:
 *   - Try a different AI provider/model on saved report data
 *   - Regenerate Markdown summaries after prompt improvements
 *   - Batch-analyze saved reports offline
 *   - Debug AI output quality without running the full pipeline
 *
 * WHAT IT ACCEPTS:
 *   - ai-report-<sessionId>.json  (intelligence bundle saved by `audit`)
 *   - Any JSON file containing a TraceLensIntelligenceReport (or wrapped bundle)
 *
 * WHAT IT DOES NOT DO:
 *   - Does NOT re-run Playwright
 *   - Does NOT re-run Lighthouse
 *   - Does NOT re-run trace parsing
 *   - Does NOT re-run bundle analysis
 */

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";

import {
  log, setVerbose, printBanner, printVitalsTable, printRisks,
  printQuickWins, printObservability, jsonOutput, setJsonMode, isJsonMode, setCI, isCIMode,
} from "../utils/logger.js";
import { findReportFile, resolveOutputDir, ensureDir } from "../utils/paths.js";
import { saveAuditReports, rerunAIOnExistingReport } from "../services/orchestrator.js";

import type { AnalyzeOptions } from "../types/index.js";

export function createAnalyzeCommand(): Command {
  const cmd = new Command("analyze");

  cmd
    .description("Re-run AI analysis on an existing TraceLens intelligence report (no re-audit)")
    .argument("<report>", "Path to a TraceLens intelligence JSON report")
    .option("-o, --output <dir>", "Output directory for regenerated reports", "./reports")
    .option("--json", "Output results as machine-readable JSON", false)
    .option("--open", "Open generated Markdown in browser after analysis", false)
    .option("-v, --verbose", "Show detailed analysis logs", false)
    .action(async (report: string, options: AnalyzeOptions) => {
      await runAnalyze(report, options);
    });

  return cmd;
}

// ─── Main Analyze Flow ────────────────────────────────────────────────────────

async function runAnalyze(reportArg: string, options: AnalyzeOptions): Promise<void> {
  setVerbose(options.verbose);
  if (options.json) setJsonMode(true);

  if (!isJsonMode()) {
    printBanner();
    log.section("Analyze — Re-run AI on Existing Report");
  }

  // ── Resolve report path ────────────────────────────────────────────────────
  let resolvedPath: string;
  try {
    resolvedPath = findReportFile(reportArg);
  } catch (err) {
    if (isJsonMode()) {
      jsonOutput("analyze", false, null, [err instanceof Error ? err.message : String(err)]);
      process.exit(1);
    }
    log.error(err instanceof Error ? err.message : String(err));
    log.line(chalk.gray("  Tip: Pass the path to an ai-report-<session>.json file"));
    process.exit(1);
  }

  if (!isJsonMode()) {
    log.line(`${chalk.gray("Report :")} ${resolvedPath}`);
    log.blank();
  }

  // ── Re-run AI analysis ─────────────────────────────────────────────────────
  const outputDir = resolveOutputDir(options.output);
  ensureDir(outputDir);

  const spinner = !isJsonMode() ? ora({ text: "Consulting AI provider…", prefixText: "  " }).start() : null;

  let intelligenceReport: Awaited<ReturnType<typeof rerunAIOnExistingReport>>["intelligenceReport"];
  let aiResult: Awaited<ReturnType<typeof rerunAIOnExistingReport>>["aiResult"];

  try {
    const result = await rerunAIOnExistingReport(resolvedPath, {
      saveDebugLogs: options.verbose,
      debugLogDir: `${options.output}/ai-debug`,
    });
    intelligenceReport = result.intelligenceReport;
    aiResult = result.aiResult;
  } catch (err) {
    spinner?.fail("Analysis failed");
    const msg = err instanceof Error ? err.message : String(err);
    if (isJsonMode()) {
      jsonOutput("analyze", false, null, [msg]);
      process.exit(1);
    }
    log.error(msg);
    process.exit(1);
  }

  if (aiResult.status === "success") {
    spinner?.succeed(
      `AI analysis complete (${aiResult.meta.provider}/${aiResult.meta.model}) — ${aiResult.meta.durationMs}ms`
    );
  } else if (aiResult.status === "skipped") {
    spinner?.warn("AI skipped — configure GEMINI_API_KEY or OPENAI_API_KEY in .env");
  } else {
    spinner?.fail(`AI analysis failed: ${aiResult.status}`);
  }

  // ── Save regenerated reports ───────────────────────────────────────────────
  const sessionId = intelligenceReport.session.sessionId;
  const { jsonPath, markdownPath } = saveAuditReports(
    outputDir,
    sessionId,
    intelligenceReport,
    aiResult
  );

  // ── JSON output mode ───────────────────────────────────────────────────────
  if (isJsonMode()) {
    jsonOutput("analyze", aiResult.status === "success", {
      sessionId,
      url: intelligenceReport.session.url,
      status: aiResult.status,
      provider: aiResult.meta.provider,
      model: aiResult.meta.model,
      tokens: aiResult.meta.tokens,
      reports: { json: jsonPath, markdown: markdownPath },
      summary: aiResult.report?.summary ?? null,
    });
    process.exit(aiResult.status === "success" ? 0 : 1);
  }

  // ── Terminal display ───────────────────────────────────────────────────────
  log.section("Analysis Results");

  printVitalsTable(intelligenceReport.session.url, {
    lcp: intelligenceReport.coreWebVitals.lcp.value,
    fcp: intelligenceReport.coreWebVitals.fcp.value,
    tbt: intelligenceReport.coreWebVitals.tbt.value,
    cls: intelligenceReport.coreWebVitals.cls.value,
    ttfb: intelligenceReport.coreWebVitals.ttfb.value,
    score: intelligenceReport.coreWebVitals.performanceScore,
  });

  if (intelligenceReport.primaryBottleneck) {
    log.line(`  ${chalk.bold("Primary Bottleneck:")} ${chalk.yellow(intelligenceReport.primaryBottleneck.replace(/-/g, " "))}`);
    log.blank();
  }

  printRisks(intelligenceReport.performanceRisks.slice(0, 5));
  printQuickWins(intelligenceReport.quickWins);

  if (aiResult.report) {
    log.section("AI Root-Cause Summary");
    log.line(aiResult.report.summary);
    log.blank();

    if (aiResult.report.recommendations.length > 0) {
      log.line(chalk.bold("  Top Recommendations:"));
      log.blank();
      for (const rec of aiResult.report.recommendations.slice(0, 3)) {
        log.line(`  ${chalk.cyan(`${rec.rank}.`)}  ${chalk.white(rec.action)}`);
        log.line(`     ${chalk.gray(rec.estimatedImpact)}`);
      }
      log.blank();
    }
  }

  printObservability({
    sessionId,
    url: intelligenceReport.session.url,
    device: intelligenceReport.session.device,
    durationMs: typeof aiResult.meta.durationMs === "number" ? aiResult.meta.durationMs : 0,
    provider: aiResult.meta.provider,
    model: aiResult.meta.model,
    tokens: aiResult.meta.tokens,
    reportPaths: [jsonPath, ...(markdownPath ? [markdownPath] : [])],
    outputDir,
  });

  if (options.open && markdownPath) {
    log.info("Opening Markdown report…");
    const { default: open } = await import("open");
    await open(markdownPath);
  }
}
