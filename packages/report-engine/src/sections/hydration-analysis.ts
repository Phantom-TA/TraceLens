/**
 * @file sections/hydration-analysis.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatMs, formatPct } from "../utils/format.js";
import { severityClass, confidenceClass } from "../utils/severity.js";

export function renderHydrationAnalysis(input: ReportInput): string {
  const h = input.intelligenceReport.hydration;
  const cwv = input.intelligenceReport.coreWebVitals;
  const fcpMs = cwv.fcp.value ?? 0;

  // JS before FCP bar (relative to some max, e.g. 10000ms)
  const jsBarPct = Math.min((h.jsBeforeFcpMs / 10000) * 100, 100);
  const jsBarColor = h.jsBeforeFcpMs > 5000 ? "var(--color-poor)" : h.jsBeforeFcpMs > 2000 ? "var(--color-warning)" : "var(--color-good)";

  const conf = h.confidence ? Math.round(h.confidence * 100) : null;

  return `<section id="section-hydration-analysis" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">💧</span>
      <h2>Hydration Analysis</h2>
      <span class="badge ${severityClass(h.severity)} section-badge">${h.severity}</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="metric-card">
          <div class="metric-card-label">Hydration Detected</div>
          <div style="margin-top:8px;">
            <span class="badge ${h.detected ? "severity-high" : "rating-good"}">${h.detected ? "Yes" : "No"}</span>
          </div>
        </div>
        ${h.framework ? `<div class="metric-card">
          <div class="metric-card-label">Framework</div>
          <div style="font-size:1rem;font-weight:600;margin-top:6px;">${escHtml(h.framework)}</div>
        </div>` : ""}
        ${h.durationMs !== null ? `<div class="metric-card">
          <div class="metric-card-label">Hydration Duration</div>
          <div class="metric-card-value">${formatMs(h.durationMs)}</div>
        </div>` : ""}
        ${h.fcpToHydrationMs !== null ? `<div class="metric-card">
          <div class="metric-card-label">FCP → Hydration Gap</div>
          <div class="metric-card-value" style="color:var(--color-warning);">${formatMs(h.fcpToHydrationMs)}</div>
        </div>` : ""}
        <div class="metric-card">
          <div class="metric-card-label">Large Initial JS</div>
          <div style="margin-top:8px;">
            <span class="badge ${h.largeInitialJS ? "severity-high" : "rating-good"}">${h.largeInitialJS ? "Yes" : "No"}</span>
          </div>
        </div>
        ${conf !== null ? `<div class="metric-card">
          <div class="metric-card-label">Detection Confidence</div>
          <div class="metric-card-value" style="font-size:1.8rem;">${conf}<span class="metric-card-unit">%</span></div>
        </div>` : ""}
      </div>

      <div style="margin-bottom:20px;">
        <div class="hydration-bar">
          <span class="hydration-bar-label">JS before FCP</span>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width:${jsBarPct.toFixed(1)}%;background:${jsBarColor};"></div>
          </div>
          <span class="mono" style="min-width:60px;text-align:right;font-size:0.82rem;color:${jsBarColor};">${formatMs(h.jsBeforeFcpMs)}</span>
        </div>
      </div>

      ${h.confidenceNote ? `<p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:10px;">${escHtml(h.confidenceNote)}</p>` : ""}
      ${h.detectionMethod ? `<p style="font-size:0.82rem;color:var(--color-text-dim);">Detection method: <span class="mono">${escHtml(h.detectionMethod)}</span></p>` : ""}
    </div>
  </details>
</section>`;
}
