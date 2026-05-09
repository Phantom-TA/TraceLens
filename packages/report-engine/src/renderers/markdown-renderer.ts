/**
 * @file renderers/markdown-renderer.ts
 * @description CI-friendly Markdown report generator. Produces GitHub PR summaries.
 */

import type { ReportInput } from "../types.js";
import { formatMs, formatVital, ratingLabel, formatDate } from "../utils/format.js";

export function renderMarkdownReport(input: ReportInput): string {
  const { intelligenceReport: r, aiResult } = input;
  const cwv = r.coreWebVitals;
  const url = r.session.url;
  const score = cwv.performanceScore;
  const scoreEmoji = score === null ? "❓" : score >= 90 ? "🟢" : score >= 50 ? "🟡" : "🔴";
  const ratingEmoji = (rating: string) =>
    rating === "good" ? "🟢" : rating === "needs-improvement" ? "🟡" : rating === "poor" ? "🔴" : "⚪";

  const lines: string[] = [
    `# ⚡ TraceLens Performance Report`,
    ``,
    `> **URL:** ${url}  `,
    `> **Device:** ${r.session.device} · **Throttle:** ${r.session.throttle} · **Runs:** ${r.session.runs}  `,
    `> **Generated:** ${formatDate(r.meta.generatedAt)}  `,
    `> **Session:** \`${r.session.sessionId}\``,
    ``,
  ];

  // AI summary
  if (aiResult?.report?.summary) {
    lines.push(`## Summary`, ``, aiResult.report.summary, ``);
  }

  // Performance score
  lines.push(
    `## Performance Score`,
    ``,
    `${scoreEmoji} **${score ?? "n/a"} / 100** — ${ratingLabel(cwv.overallRating)}`,
    ``,
  );

  // CWV table
  lines.push(
    `## Core Web Vitals`,
    ``,
    `| Metric | Value | Rating | Threshold |`,
    `|--------|-------|--------|-----------|`,
    `| LCP | \`${formatVital(cwv.lcp.value, cwv.lcp.unit)}\` | ${ratingEmoji(cwv.lcp.rating)} ${ratingLabel(cwv.lcp.rating)} | < 2.5s |`,
    `| FCP | \`${formatVital(cwv.fcp.value, cwv.fcp.unit)}\` | ${ratingEmoji(cwv.fcp.rating)} ${ratingLabel(cwv.fcp.rating)} | < 1.8s |`,
    `| TBT | \`${formatVital(cwv.tbt.value, cwv.tbt.unit)}\` | ${ratingEmoji(cwv.tbt.rating)} ${ratingLabel(cwv.tbt.rating)} | < 200ms |`,
    `| CLS | \`${cwv.cls.value !== null ? cwv.cls.value.toFixed(3) : "n/a"}\` | ${ratingEmoji(cwv.cls.rating)} ${ratingLabel(cwv.cls.rating)} | < 0.1 |`,
    `| TTI | \`${formatVital(cwv.tti.value, cwv.tti.unit)}\` | ${ratingEmoji(cwv.tti.rating)} ${ratingLabel(cwv.tti.rating)} | < 3.8s |`,
    `| TTFB | \`${formatVital(cwv.ttfb.value, cwv.ttfb.unit)}\` | ${ratingEmoji(cwv.ttfb.rating)} ${ratingLabel(cwv.ttfb.rating)} | < 800ms |`,
    ``,
  );

  // Primary bottleneck
  lines.push(
    `## Primary Bottleneck`,
    ``,
    `**${r.primaryBottleneck.replace(/-/g, " ")}**`,
    ``,
  );

  // Performance risks
  if (r.performanceRisks.length) {
    lines.push(`## Performance Risks`, ``);
    for (const risk of r.performanceRisks) {
      const sev = risk.severity === "critical" ? "🔴" : risk.severity === "high" ? "🟠" : risk.severity === "medium" ? "🟡" : "🟢";
      lines.push(`### ${sev} ${risk.label} \`${risk.severity.toUpperCase()}\``);
      lines.push(``, `${risk.impact}`, ``);
      lines.push(`> 💡 ${risk.recommendation}`, ``);
    }
  }

  // AI root causes (collapsible)
  if (aiResult?.report?.rootCauses?.length) {
    lines.push(`<details>`, `<summary>🤖 AI Root-Cause Analysis (${aiResult.report.rootCauses.length} causes)</summary>`, ``);
    for (const cause of aiResult.report.rootCauses) {
      lines.push(`#### ${cause.rank}. ${cause.issue} \`${cause.severity.toUpperCase()}\``);
      lines.push(``, cause.explanation, ``);
      lines.push(`**Impact:** ${cause.impact}`, ``);
    }
    lines.push(`</details>`, ``);
  }

  // Recommendations (collapsible)
  if (aiResult?.report?.recommendations?.length) {
    lines.push(`<details>`, `<summary>🗺️ Optimization Recommendations (${aiResult.report.recommendations.length})</summary>`, ``);
    for (const rec of aiResult.report.recommendations) {
      lines.push(`#### ${rec.rank}. ${rec.action}`);
      lines.push(``, `**Priority:** ${rec.priority} | **Effort:** ${rec.effort} | **Category:** ${rec.category}`);
      lines.push(``, rec.rationale);
      lines.push(``, `**Estimated Impact:** ${rec.estimatedImpact}`, ``);
    }
    lines.push(`</details>`, ``);
  }

  // Estimated gains
  const impact = aiResult?.report?.estimatedImpact;
  if (impact) {
    lines.push(`## Estimated Gains`, ``);
    if (impact.lcp)              lines.push(`- **LCP:** ${impact.lcp}`);
    if (impact.fcp)              lines.push(`- **FCP:** ${impact.fcp}`);
    if (impact.tbt)              lines.push(`- **TBT:** ${impact.tbt}`);
    if (impact.performanceScore) lines.push(`- **Score:** ${impact.performanceScore}`);
    lines.push(``, `> ${impact.note}`, ``);
  }

  // Quick wins
  if (r.quickWins.length) {
    lines.push(`## Quick Wins`, ``);
    for (const win of r.quickWins) {
      const saving = win.estimatedSavingsMs ? ` (~${formatMs(win.estimatedSavingsMs)} saved)` : "";
      lines.push(`- \`${win.category}\` ${win.action}${saving}`);
    }
    lines.push(``);
  }

  // Framework
  if (r.framework?.framework) {
    lines.push(`## Framework Detected`, ``, `**${r.framework.framework}** (${Math.round((r.framework.confidence ?? 0) * 100)}% confidence)`, ``);
  }

  // Hydration note
  if (r.hydration.detected || r.hydration.largeInitialJS) {
    lines.push(`## Hydration`, ``);
    if (r.hydration.detected) {
      lines.push(`⚠️ Hydration detected — ${formatMs(r.hydration.durationMs)} duration`);
    }
    if (r.hydration.largeInitialJS) {
      lines.push(`⚠️ Large initial JS: **${formatMs(r.hydration.jsBeforeFcpMs)}** executed before FCP`);
    }
    lines.push(``);
  }

  // Data quality
  lines.push(
    `## Data Quality`,
    ``,
    `**Confidence:** ${r.dataQuality.confidence} | **Sources:** ${r.dataQuality.sources.join(", ")}`,
  );
  if (r.dataQuality.note) lines.push(``, `> ℹ️ ${r.dataQuality.note}`);
  lines.push(``);

  lines.push(`---`, ``, `*Generated by TraceLens Report Engine v1.0.0*`);

  return lines.join("\n");
}

/**
 * Generate a compact CI/GitHub Actions step summary.
 * Shorter, table-only, no collapsible blocks.
 */
export function renderCIMarkdown(input: ReportInput): string {
  const { intelligenceReport: r } = input;
  const cwv = r.coreWebVitals;
  const score = cwv.performanceScore;
  const scoreEmoji = score === null ? "❓" : score >= 90 ? "🟢" : score >= 50 ? "🟡" : "🔴";
  const ratingEmoji = (rating: string) =>
    rating === "good" ? "🟢" : rating === "needs-improvement" ? "🟡" : "🔴";

  const lines: string[] = [
    `## ⚡ TraceLens — ${r.session.url}`,
    ``,
    `${scoreEmoji} **Performance Score: ${score ?? "n/a"}** · ${r.session.device} · ${r.session.throttle}`,
    ``,
    `| Metric | Value | Rating |`,
    `|--------|-------|--------|`,
    `| LCP | \`${formatVital(cwv.lcp.value, cwv.lcp.unit)}\` | ${ratingEmoji(cwv.lcp.rating)} |`,
    `| FCP | \`${formatVital(cwv.fcp.value, cwv.fcp.unit)}\` | ${ratingEmoji(cwv.fcp.rating)} |`,
    `| TBT | \`${formatVital(cwv.tbt.value, cwv.tbt.unit)}\` | ${ratingEmoji(cwv.tbt.rating)} |`,
    `| CLS | \`${cwv.cls.value !== null ? cwv.cls.value.toFixed(3) : "n/a"}\` | ${ratingEmoji(cwv.cls.rating)} |`,
    ``,
    `**Primary Bottleneck:** ${r.primaryBottleneck.replace(/-/g, " ")}  `,
    `**Risks:** ${r.performanceRisks.length} · **Quick Wins:** ${r.quickWins.length}`,
  ];

  const critical = r.performanceRisks.filter(p => p.severity === "critical" || p.severity === "high");
  if (critical.length) {
    lines.push(``, `### 🚨 Critical Issues`);
    for (const risk of critical.slice(0, 3)) {
      lines.push(`- **${risk.label}** — ${risk.impact}`);
    }
  }

  return lines.join("\n");
}
