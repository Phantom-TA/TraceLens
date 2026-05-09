/**
 * @file exporters/file-writer.ts
 * @description Writes all report artifacts to disk with deterministic naming.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { ReportInput, ComparisonInput, ReportOptions, ReportOutput } from "../types.js";
import { renderHtmlReport } from "../renderers/html-renderer.js";
import { renderMarkdownReport } from "../renderers/markdown-renderer.js";
import { exportJson } from "../renderers/json-exporter.js";
import { renderComparisonReport } from "../renderers/comparison-renderer.js";

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function write(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf-8");
}

/**
 * Generate and write all requested report formats for a single audit.
 */
export function writeReports(input: ReportInput, options: ReportOptions = {}): ReportOutput {
  const outputDir    = options.outputDir ?? "./reports/intelligence";
  const formats      = options.formats ?? ["html", "markdown"];
  const sessionId    = options.sessionId ?? input.intelligenceReport.session.sessionId;
  const title        = options.title;

  ensureDir(outputDir);

  let htmlPath:       string | null = null;
  let markdownPath:   string | null = null;
  let jsonPath:       string | null = null;

  if (formats.includes("html") || formats.includes("all")) {
    htmlPath = join(outputDir, `report-${sessionId}.html`);
    write(htmlPath, renderHtmlReport(input, title));
  }

  if (formats.includes("markdown") || formats.includes("all")) {
    markdownPath = join(outputDir, `report-${sessionId}.md`);
    write(markdownPath, renderMarkdownReport(input));
  }

  if (formats.includes("json") || formats.includes("all")) {
    jsonPath = join(outputDir, `report-${sessionId}.json`);
    write(jsonPath, exportJson(input));
  }

  return { htmlPath, markdownPath, jsonPath, comparisonHtmlPath: null, sessionId };
}

/**
 * Generate and write a before/after comparison report.
 */
export function writeComparisonReport(
  input: ComparisonInput,
  options: ReportOptions = {}
): ReportOutput {
  const outputDir = options.outputDir ?? "./reports/intelligence";
  ensureDir(outputDir);

  const bId = input.before.intelligenceReport.session.sessionId;
  const aId = input.after.intelligenceReport.session.sessionId;
  const comparisonHtmlPath = join(outputDir, `comparison-${bId}-vs-${aId}.html`);

  write(comparisonHtmlPath, renderComparisonReport(input));

  return {
    htmlPath: null,
    markdownPath: null,
    jsonPath: null,
    comparisonHtmlPath,
    sessionId: aId,
  };
}
