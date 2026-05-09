/**
 * @file exporters/ci-summary.ts
 * @description GitHub Actions step summary and CI log output generator.
 */

import type { ReportInput } from "../types.js";
import { renderCIMarkdown } from "../renderers/markdown-renderer.js";
import { writeFileSync } from "fs";

/**
 * Write a GitHub Actions step summary.
 * Call this when GITHUB_STEP_SUMMARY is set in the environment.
 */
export function writeGitHubStepSummary(input: ReportInput): void {
  const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
  if (!summaryPath) return;
  const md = renderCIMarkdown(input);
  writeFileSync(summaryPath, md, { flag: "a", encoding: "utf-8" });
}

/**
 * Return a compact ANSI-free CI text summary.
 */
export function getCISummaryText(input: ReportInput): string {
  const r = input.intelligenceReport;
  const cwv = r.coreWebVitals;
  const score = cwv.performanceScore;

  const lines: string[] = [
    `[tracelens] ─────────────────────────────────────────`,
    `[tracelens]  Performance Report: ${r.session.url}`,
    `[tracelens] ─────────────────────────────────────────`,
    `[tracelens]  Score:   ${score ?? "n/a"}/100  (${cwv.overallRating})`,
    `[tracelens]  LCP:     ${cwv.lcp.value !== null ? cwv.lcp.value + "ms" : "n/a"}  (${cwv.lcp.rating})`,
    `[tracelens]  FCP:     ${cwv.fcp.value !== null ? cwv.fcp.value + "ms" : "n/a"}  (${cwv.fcp.rating})`,
    `[tracelens]  TBT:     ${cwv.tbt.value !== null ? cwv.tbt.value + "ms" : "n/a"}  (${cwv.tbt.rating})`,
    `[tracelens]  CLS:     ${cwv.cls.value !== null ? cwv.cls.value.toFixed(3) : "n/a"}  (${cwv.cls.rating})`,
    `[tracelens]  Bottleneck: ${r.primaryBottleneck.replace(/-/g, " ")}`,
    `[tracelens]  Risks:   ${r.performanceRisks.length}`,
  ];

  const critical = r.performanceRisks.filter(p => p.severity === "critical");
  if (critical.length) {
    lines.push(`[tracelens] ─────────────────────────────────────────`);
    lines.push(`[tracelens]  CRITICAL ISSUES:`);
    for (const risk of critical.slice(0, 3)) {
      lines.push(`[tracelens]    • ${risk.label}: ${risk.impact}`);
    }
  }

  lines.push(`[tracelens] ─────────────────────────────────────────`);
  return lines.join("\n");
}
