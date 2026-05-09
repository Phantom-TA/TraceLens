/**
 * @file sections/executive-summary.ts
 */

import type { ReportInput } from "../types.js";
import { renderScoreGauge } from "../visualizations/score-bar.js";
import { escHtml, formatMs } from "../utils/format.js";
import { ratingClass, severityClass } from "../utils/severity.js";

export function renderExecutiveSummary(input: ReportInput): string {
  const { intelligenceReport: r, aiResult } = input;
  const cwv = r.coreWebVitals;
  const score = cwv.performanceScore;
  const gauge = renderScoreGauge(score, "Score");
  const aiSummary = aiResult?.report?.summary ?? null;
  const primaryBottleneck = r.primaryBottleneck?.replace(/-/g, " ") ?? "unknown";
  const risksCount = r.performanceRisks.length;
  const quickWinsCount = r.quickWins.length;

  return `<section id="section-executive-summary" data-section class="section">
  <details open>
    <summary class="section-header">
      <span class="section-icon">🎯</span>
      <h2>Executive Summary</h2>
      <span class="badge ${ratingClass(cwv.overallRating)} section-badge">${cwv.overallRating.replace(/-/g,' ')}</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div style="display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap;">
        <div class="gauge-wrap">
          ${gauge}
          <div class="gauge-label">Performance Score</div>
        </div>
        <div style="flex:1;min-width:280px;">
          ${aiSummary ? `<div class="ai-summary-block" role="note">${escHtml(aiSummary)}</div>` : ""}
          <div class="card-grid" style="margin-top:${aiSummary ? "16px" : "0"};">
            <div class="metric-card">
              <div class="metric-card-label">Primary Bottleneck</div>
              <div style="font-size:1rem;font-weight:600;text-transform:capitalize;margin-top:4px;">${escHtml(primaryBottleneck)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">Performance Risks</div>
              <div class="metric-card-value" style="font-size:2rem;">${risksCount}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">Quick Wins</div>
              <div class="metric-card-value" style="font-size:2rem;">${quickWinsCount}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">Data Confidence</div>
              <div style="margin-top:8px;"><span class="badge confidence-${r.dataQuality.confidence}">${r.dataQuality.confidence}</span></div>
            </div>
          </div>
          ${r.quickWins.length > 0 ? `
          <div style="margin-top:20px;">
            <div style="font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-dim);margin-bottom:10px;">Quick Wins</div>
            ${r.quickWins.map(w => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <span class="badge cat-${w.category}" style="flex-shrink:0;">${escHtml(w.category)}</span>
              <span style="font-size:0.85rem;">${escHtml(w.action)}</span>
              ${w.estimatedSavingsMs ? `<span style="margin-left:auto;font-size:0.78rem;color:var(--color-good);font-family:var(--font-mono);">~${formatMs(w.estimatedSavingsMs)} saved</span>` : ""}
            </div>`).join("")}
          </div>` : ""}
        </div>
      </div>
    </div>
  </details>
</section>`;
}
