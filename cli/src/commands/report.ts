/**
 * @file commands/report.ts
 * @description `tracelens report <intelligence-json>` — generate HTML/Markdown/Comparison reports
 * from existing canonical intelligence artifacts WITHOUT rerunning any pipeline stages.
 *
 * WHAT IT DOES:
 *   - Reads existing canonical intelligence JSON from disk
 *   - Calls the report-engine to render HTML, Markdown, or JSON reports
 *   - Supports --open to open the generated HTML in a browser
 *   - Supports --format to select output formats
 *   - Supports comparison mode: tracelens report --compare <before.json> <after.json>
 *
 * WHAT IT DOES NOT DO:
 *   - Rerun Playwright, Lighthouse, trace parsing, or AI analysis
 *   - Modify any existing artifacts
 *
 * FLAGS:
 *   --format <html|markdown|json|all>   Output format (default: html)
 *   --output <dir>                      Output directory
 *   --open                              Open HTML report in browser
 *   --title <title>                     Custom report title
 *   --compare <before> <after>          Generate a before/after comparison report
 *   --before-label <label>              Label for the baseline report
 *   --after-label <label>               Label for the new report
 */

import { Command } from "commander";
import { readFileSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";

import { log, printBanner } from "../utils/logger.js";
import { ensureDir } from "../utils/paths.js";
import { generateReports, generateComparisonReport } from "../services/orchestrator.js";
import type { ReportCommandOptions } from "../types/index.js";
import type { ReportInput } from "../../../packages/report-engine/src/types.js";
import type { TraceLensIntelligenceReport } from "../../../packages/analytics-engine/src/index.js";

export function createReportCommand(): Command {
  const cmd = new Command("report");

  cmd
    .description("Generate HTML/Markdown reports from existing TraceLens intelligence artifacts (no re-analysis)")
    .argument("<intelligence-json>", "Path to a TraceLens intelligence JSON file (or AI report bundle)")
    .option("-f, --format <format>", "Output format: html | markdown | json | all", "html")
    .option("-o, --output <dir>", "Output directory for generated reports", "./reports")
    .option("--open", "Open the generated HTML report in browser", false)
    .option("--title <title>", "Custom title for the HTML report")
    .option("--compare <after>", "Path to a second report for before/after comparison")
    .option("--before-label <label>", "Label for the baseline (before) report", "Baseline")
    .option("--after-label <label>",  "Label for the current (after) report",   "Current")
    .action(async (intelligenceJsonPath: string, options: ReportCommandOptions & {
      compare?: string;
      beforeLabel: string;
      afterLabel: string;
    }) => {
      await runReport(intelligenceJsonPath, options);
    });

  return cmd;
}

// ─── Main Report Flow ─────────────────────────────────────────────────────────

async function runReport(
  reportPath: string,
  options: ReportCommandOptions & { compare?: string; beforeLabel: string; afterLabel: string }
): Promise<void> {
  printBanner();

  const resolvedPath = resolve(process.cwd(), reportPath);
  const outputDir = resolve(process.cwd(), options.output);
  ensureDir(outputDir);

  // ── Load the intelligence bundle ──────────────────────────────────────────
  log.step(1, options.compare ? 2 : 1, "Loading intelligence report…");
  const beforeInput = loadBundle(resolvedPath);

  log.line(`  ${chalk.gray("Report:")} ${chalk.underline(resolvedPath)}`);
  log.line(`  ${chalk.gray("URL   :")} ${beforeInput.intelligenceReport.session.url}`);
  log.line(`  ${chalk.gray("Device:")} ${beforeInput.intelligenceReport.session.device}`);
  log.blank();

  // ── Comparison mode ───────────────────────────────────────────────────────
  if (options.compare) {
    const afterPath = resolve(process.cwd(), options.compare);
    log.step(2, 2, "Generating comparison report…");

    const afterInput = loadBundle(afterPath);
    const sessionId = beforeInput.intelligenceReport.session.sessionId;

    const output = generateComparisonReport(
      outputDir,
      beforeInput,
      afterInput,
      { before: options.beforeLabel, after: options.afterLabel }
    );

    if (output.comparisonHtmlPath) {
      log.success(`Comparison report generated: ${chalk.underline(output.comparisonHtmlPath)}`);
      if (options.open) await openFile(output.comparisonHtmlPath);
    }
    return;
  }

  // ── Single report generation ──────────────────────────────────────────────
  const formats = parseFormats(options.format);
  const sessionId = beforeInput.intelligenceReport.session.sessionId;

  log.step(1, 1, `Generating ${formats.join(", ")} report${formats.length !== 1 ? "s" : ""}…`);

  const output = generateReports(
    outputDir,
    sessionId,
    beforeInput.intelligenceReport,
    beforeInput.aiResult ? {
      status: beforeInput.aiResult.status,
      report: beforeInput.aiResult.report,
      meta: beforeInput.aiResult.meta as Record<string, unknown>,
    } : null,
    beforeInput.artifacts ?? null,
    formats as Array<"html" | "markdown" | "json" | "all">
  );

  log.blank();
  log.section("Generated Reports");

  if (output.htmlPath)     log.line(`  ${chalk.gray("HTML     :")} ${chalk.underline(output.htmlPath)}`);
  if (output.markdownPath) log.line(`  ${chalk.gray("Markdown :")} ${chalk.underline(output.markdownPath)}`);
  if (output.jsonPath)     log.line(`  ${chalk.gray("JSON     :")} ${chalk.underline(output.jsonPath)}`);
  log.blank();

  log.success("Report generation complete.");

  if (options.open && output.htmlPath) {
    log.info("Opening TraceLens report in browser…");
    await openFile(output.htmlPath);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadBundle(reportPath: string): ReportInput {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(reportPath, "utf-8")) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Cannot read report: ${reportPath} — ${err instanceof Error ? err.message : String(err)}`);
  }
  const intelligenceReport = (raw.intelligenceReport ?? raw) as TraceLensIntelligenceReport;
  if (!intelligenceReport?.session?.url) {
    throw new Error(`File does not look like a TraceLens intelligence report: ${reportPath}`);
  }
  return {
    intelligenceReport,
    aiResult: (raw.aiResult as any) ?? null,
    artifacts: null,
  };
}

function parseFormats(format: string): string[] {
  if (format === "all") return ["html", "markdown", "json"];
  const parts = format.split(",").map(f => f.trim().toLowerCase());
  return parts.filter(f => ["html", "markdown", "json"].includes(f));
}

async function openFile(path: string): Promise<void> {
  try {
    const { default: open } = await import("open");
    await open(path);
  } catch {
    log.warn(`Could not open file: ${path}`);
  }
}
