/**
 * @file sections/lighthouse-metrics.ts
 */

import type { ReportInput } from "../types.js";
import { renderScoreGauge } from "../visualizations/score-bar.js";
import { escHtml, formatMs, formatPath } from "../utils/format.js";
import { scoreToRating } from "../utils/severity.js";

export function renderLighthouseMetrics(input: ReportInput): string {
  const cwv = input.intelligenceReport.coreWebVitals;
  const score = cwv.performanceScore;
  const lhHtmlPath = input.artifacts?.lighthouseHtmlPath;

  const gauge = renderScoreGauge(score, "Lighthouse");

  return `<section id="section-lighthouse-metrics" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">🔦</span>
      <h2>Lighthouse Metrics</h2>
      ${score !== null ? `<span class="badge ${scoreToRating(score) === "good" ? "rating-good" : scoreToRating(score) === "poor" ? "rating-poor" : "rating-needs-improvement"} section-badge">Score: ${score}</span>` : ""}
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div style="display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap;margin-bottom:20px;">
        <div class="gauge-wrap">${gauge}</div>
        <div style="flex:1;min-width:220px;">
          <div class="card-grid">
            <div class="metric-card">
              <div class="metric-card-label">LCP</div>
              <div class="metric-card-value">${cwv.lcp.value !== null ? formatMs(cwv.lcp.value) : "n/a"}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">FCP</div>
              <div class="metric-card-value">${cwv.fcp.value !== null ? formatMs(cwv.fcp.value) : "n/a"}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">TBT</div>
              <div class="metric-card-value">${cwv.tbt.value !== null ? formatMs(cwv.tbt.value) : "n/a"}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">CLS</div>
              <div class="metric-card-value">${cwv.cls.value !== null ? cwv.cls.value.toFixed(3) : "n/a"}</div>
            </div>
          </div>
        </div>
      </div>
      ${lhHtmlPath ? `<div class="artifact-list">
        <a class="artifact-item" href="${escHtml(lhHtmlPath)}" target="_blank" rel="noopener noreferrer">
          <span class="artifact-icon">🔦</span>
          <div>
            <div style="font-weight:500;font-size:0.85rem;">Full Lighthouse HTML Report</div>
            <div class="artifact-path">${escHtml(formatPath(lhHtmlPath))}</div>
          </div>
          <span class="artifact-open">Open ↗</span>
        </a>
      </div>` : `<p style="font-size:0.82rem;color:var(--color-text-dim);">Lighthouse HTML report not available.</p>`}
    </div>
  </details>
</section>`;
}
