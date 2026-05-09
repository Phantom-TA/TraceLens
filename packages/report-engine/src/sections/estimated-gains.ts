/**
 * @file sections/estimated-gains.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml } from "../utils/format.js";

export function renderEstimatedGains(input: ReportInput): string {
  const impact = input.aiResult?.report?.estimatedImpact;
  const confidence = input.aiResult?.report?.confidence;

  if (!impact) {
    return `<section id="section-estimated-gains" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">📈</span><h2>Estimated Performance Gains</h2>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="empty-state"><div class="empty-state-icon">🤖</div>Run with AI enabled to see estimated performance gains.</div>
    </div>
  </details>
</section>`;
  }

  const gainItems = [
    { label: "LCP Improvement", value: impact.lcp, color: "var(--color-good)" },
    { label: "FCP Improvement", value: impact.fcp, color: "var(--color-good)" },
    { label: "TBT Reduction",   value: impact.tbt, color: "var(--color-good)" },
    { label: "Score Change",    value: impact.performanceScore, color: "var(--color-accent)" },
  ].filter(g => g.value);

  const confPct = confidence ? Math.round(confidence.overall * 100) : null;

  return `<section id="section-estimated-gains" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">📈</span>
      <h2>Estimated Performance Gains</h2>
      ${confPct !== null ? `<span class="badge confidence-${confidence!.dataQuality} section-badge">${confPct}% confidence</span>` : ""}
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="card-grid" style="margin-bottom:20px;">
        ${gainItems.map(g => `<div class="metric-card">
          <div class="metric-card-label">${escHtml(g.label)}</div>
          <div style="font-size:1.3rem;font-weight:700;color:${g.color};margin-top:6px;font-family:var(--font-mono);">${escHtml(g.value!)}</div>
        </div>`).join("\n")}
      </div>
      ${impact.note ? `<p style="font-size:0.85rem;color:var(--color-text-muted);padding:10px 14px;background:var(--color-bg-hover);border-radius:var(--radius-sm);border-left:2px solid var(--color-accent);">${escHtml(impact.note)}</p>` : ""}
      ${confidence?.note ? `<p style="font-size:0.82rem;color:var(--color-text-dim);margin-top:10px;">${escHtml(confidence.note)}</p>` : ""}
    </div>
  </details>
</section>`;
}
