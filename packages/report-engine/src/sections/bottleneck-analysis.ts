/**
 * @file sections/bottleneck-analysis.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatMs, formatPct } from "../utils/format.js";
import { severityClass, categoryClass, confidenceClass } from "../utils/severity.js";

export function renderBottleneckAnalysis(input: ReportInput): string {
  const risks = input.intelligenceReport.performanceRisks;
  if (!risks.length) {
    return `<section id="section-bottleneck-analysis" data-section class="section">
  <details open>
    <summary class="section-header">
      <span class="section-icon">🔍</span><h2>Bottleneck Analysis</h2>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body"><div class="empty-state"><div class="empty-state-icon">✅</div>No performance bottlenecks detected.</div></div>
  </details>
</section>`;
  }

  const cards = risks.map((risk) => {
    const sources = risk.sources.map(s => `<span class="badge" style="background:rgba(99,102,241,0.1);color:#818cf8;font-size:0.7rem;">${escHtml(s)}</span>`).join(" ");
    const scripts = risk.attributionMetadata?.attributedScripts?.filter(Boolean).slice(0, 3) ?? [];
    const impactEst = risk.impactEstimate;

    return `<div class="risk-card ${severityClass(risk.severity)}" role="article">
  <div class="risk-card-header">
    <span class="badge ${severityClass(risk.severity)}">${risk.severity.toUpperCase()}</span>
    <span class="risk-card-title">${escHtml(risk.label)}</span>
    <span class="badge ${confidenceClass(risk.confidence)}" style="margin-left:auto;">${Math.round(risk.confidence * 100)}% confidence</span>
  </div>
  <div class="risk-card-meta">${sources}</div>
  <p style="font-size:0.85rem;margin-bottom:10px;color:var(--color-text-muted);">${escHtml(risk.impact)}</p>
  <div class="risk-card-rec">💡 ${escHtml(risk.recommendation)}</div>
  ${scripts.length ? `<div style="margin-top:10px;font-size:0.78rem;color:var(--color-text-dim);">
    <strong style="color:var(--color-text-muted);">Attributed scripts:</strong>
    ${scripts.map(s => `<span class="mono" style="margin-left:6px;">${escHtml(s)}</span>`).join("")}
  </div>` : ""}
  ${impactEst ? `<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
    ${impactEst.lcpMs ? `<span class="ai-metric-pill">LCP ${impactEst.lcpMs > 0 ? "−" : "+"}${formatMs(Math.abs(impactEst.lcpMs))}</span>` : ""}
    ${impactEst.fcpMs ? `<span class="ai-metric-pill">FCP ${impactEst.fcpMs > 0 ? "−" : "+"}${formatMs(Math.abs(impactEst.fcpMs))}</span>` : ""}
    ${impactEst.tbtMs ? `<span class="ai-metric-pill">TBT ${impactEst.tbtMs > 0 ? "−" : "+"}${formatMs(Math.abs(impactEst.tbtMs))}</span>` : ""}
    ${impactEst.scorePoints ? `<span class="ai-metric-pill">+${impactEst.scorePoints} score pts</span>` : ""}
  </div>` : ""}
</div>`;
  }).join("\n");

  return `<section id="section-bottleneck-analysis" data-section class="section">
  <details open>
    <summary class="section-header">
      <span class="section-icon">🔍</span>
      <h2>Bottleneck Analysis</h2>
      <span class="badge severity-${risks[0]?.severity ?? "low"} section-badge">${risks.length} risk${risks.length !== 1 ? "s" : ""}</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">${cards}</div>
  </details>
</section>`;
}
