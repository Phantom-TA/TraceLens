/**
 * @file sections/bundle-intelligence.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatKB, formatMs } from "../utils/format.js";
import { severityClass } from "../utils/severity.js";

export function renderBundleIntelligence(input: ReportInput): string {
  const bundle = input.intelligenceReport.bundle;

  if (!bundle) {
    return `<section id="section-bundle-intelligence" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">📦</span><h2>Bundle Intelligence</h2>
      <span class="badge" style="background:rgba(100,116,139,0.1);color:var(--color-text-dim);margin-left:auto;">Not available</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="empty-state"><div class="empty-state-icon">📊</div>
        Bundle analysis was not run. Provide <code>--bundle path/to/webpack-stats.json</code> during audit to enable.
      </div>
    </div>
  </details>
</section>`;
  }

  const depRows = bundle.largestDeps.map(d => `<tr>
    <td class="mono">${escHtml(d.name)}</td>
    <td class="mono">${formatKB(d.sizeKB)}</td>
    <td>${d.initial ? `<span class="badge severity-high">Initial</span>` : `<span class="badge rating-good">Lazy</span>`}</td>
    <td style="color:var(--color-text-muted);font-size:0.8rem;">${escHtml(d.category ?? "—")}</td>
    <td style="color:var(--color-good);font-size:0.8rem;">${escHtml(d.alternative ?? "—")}</td>
  </tr>`).join("\n");

  const dupRows = bundle.duplicates.map(d => `<tr>
    <td class="mono">${escHtml(d.name)}</td>
    <td class="mono" style="color:var(--color-poor);">${formatKB(d.wastedKB)}</td>
    <td><span class="badge ${severityClass(d.severity)}">${d.severity}</span></td>
  </tr>`).join("\n");

  const parseBarPct = bundle.estimatedParseMs ? Math.min((bundle.estimatedParseMs / 2000) * 100, 100) : 0;

  return `<section id="section-bundle-intelligence" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">📦</span>
      <h2>Bundle Intelligence</h2>
      ${bundle.hydrationRisk ? `<span class="badge severity-high section-badge">Hydration Risk</span>` : ""}
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="metric-card">
          <div class="metric-card-label">Initial Bundle</div>
          <div class="metric-card-value">${formatKB(bundle.initialBundleKB)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Total Bundle</div>
          <div class="metric-card-value">${formatKB(bundle.totalBundleKB)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Est. Parse Time</div>
          <div class="metric-card-value" style="${bundle.estimatedParseMs && bundle.estimatedParseMs > 500 ? "color:var(--color-warning);" : ""}">${formatMs(bundle.estimatedParseMs)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Hydration Risk</div>
          <div style="margin-top:8px;"><span class="badge ${bundle.hydrationRisk ? "severity-critical" : "rating-good"}">${bundle.hydrationRisk ? "High" : "Low"}</span></div>
        </div>
      </div>

      ${bundle.estimatedParseMs ? `<div class="hydration-bar" style="margin-bottom:20px;">
        <span class="hydration-bar-label">Parse time</span>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${parseBarPct.toFixed(1)}%;background:${parseBarPct > 75 ? "var(--color-poor)" : parseBarPct > 40 ? "var(--color-warning)" : "var(--color-good)"};"></div>
        </div>
        <span class="mono" style="min-width:60px;text-align:right;font-size:0.82rem;">${formatMs(bundle.estimatedParseMs)}</span>
      </div>` : ""}

      ${bundle.largestDeps.length ? `
      <h3 style="font-size:0.82rem;font-weight:600;color:var(--color-text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Largest Dependencies</h3>
      <table class="data-table" aria-label="Largest bundle dependencies">
        <thead><tr><th>Package</th><th>Size</th><th>Load</th><th>Category</th><th>Alternative</th></tr></thead>
        <tbody>${depRows}</tbody>
      </table>` : ""}

      ${bundle.duplicates.length ? `
      <h3 style="font-size:0.82rem;font-weight:600;color:var(--color-text-muted);margin-top:20px;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Duplicate Packages</h3>
      <table class="data-table" aria-label="Duplicate bundle packages">
        <thead><tr><th>Package</th><th>Wasted KB</th><th>Severity</th></tr></thead>
        <tbody>${dupRows}</tbody>
      </table>` : ""}
    </div>
  </details>
</section>`;
}
