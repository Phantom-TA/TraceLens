/**
 * @file sections/stability-confidence.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatMs, formatPct } from "../utils/format.js";

export function renderStabilityConfidence(input: ReportInput): string {
  const dq = input.intelligenceReport.dataQuality;
  const sm = input.intelligenceReport.stabilityMetrics;

  const sourceChips = dq.sources.map(s =>
    `<span class="badge" style="background:rgba(99,102,241,0.1);color:#818cf8;">${escHtml(s)}</span>`
  ).join(" ");

  const confColor = dq.confidence === "high" ? "var(--color-good)" : dq.confidence === "medium" ? "var(--color-warning)" : "var(--color-poor)";

  return `<section id="section-stability-confidence" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">🛡️</span>
      <h2>Stability &amp; Confidence</h2>
      <span class="badge confidence-${dq.confidence} section-badge">${dq.confidence} confidence</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div style="margin-bottom:20px;">
        <div style="font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-dim);margin-bottom:8px;">Data Sources</div>
        <div class="chips">${sourceChips}</div>
        <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;">
          <span style="font-size:0.82rem;">${dq.hasLighthouse ? "✅" : "❌"} Lighthouse</span>
          <span style="font-size:0.82rem;">${dq.hasTraceParser ? "✅" : "❌"} Trace Parser</span>
          <span style="font-size:0.82rem;">${dq.hasBundleAnalysis ? "✅" : "❌"} Bundle Analysis</span>
          <span style="font-size:0.82rem;">${dq.hasPlaywright ? "✅" : "❌"} Playwright</span>
        </div>
        ${dq.note ? `<p style="margin-top:10px;font-size:0.85rem;color:var(--color-text-muted);padding:8px 12px;background:var(--color-bg-hover);border-radius:var(--radius-sm);border-left:2px solid var(--color-warning);">${escHtml(dq.note)}</p>` : ""}
      </div>

      ${sm ? `
      <div style="border-top:1px solid var(--color-border);padding-top:18px;">
        <div style="font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-dim);margin-bottom:10px;">Multi-Run Stability (${sm.runs} runs)</div>
        <div class="card-grid" style="margin-bottom:14px;">
          ${sm.variance.lcp !== null ? `<div class="metric-card"><div class="metric-card-label">LCP Variance (CV)</div><div class="metric-card-value">${sm.variance.lcp.toFixed(1)}<span class="metric-card-unit">%</span></div></div>` : ""}
          ${sm.variance.fcp !== null ? `<div class="metric-card"><div class="metric-card-label">FCP Variance (CV)</div><div class="metric-card-value">${sm.variance.fcp.toFixed(1)}<span class="metric-card-unit">%</span></div></div>` : ""}
          ${sm.variance.tbt !== null ? `<div class="metric-card"><div class="metric-card-label">TBT Variance (CV)</div><div class="metric-card-value">${sm.variance.tbt.toFixed(1)}<span class="metric-card-unit">%</span></div></div>` : ""}
          <div class="metric-card"><div class="metric-card-label">Stability</div>
            <div style="margin-top:8px;"><span class="badge confidence-${sm.stabilityConfidence}">${sm.stabilityConfidence}</span></div>
          </div>
        </div>
        ${sm.stabilityNote ? `<p style="font-size:0.85rem;color:var(--color-text-muted);">${escHtml(sm.stabilityNote)}</p>` : ""}
      </div>` : `
      <div style="border-top:1px solid var(--color-border);padding-top:18px;font-size:0.85rem;color:var(--color-text-dim);">
        Single-run audit. Run with <code>--runs 3</code> or more to measure stability and variance.
      </div>`}
    </div>
  </details>
</section>`;
}
