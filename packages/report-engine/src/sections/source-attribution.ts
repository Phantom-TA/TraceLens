/**
 * @file sections/source-attribution.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatMs, formatKB } from "../utils/format.js";
import { severityClass } from "../utils/severity.js";

export function renderSourceAttribution(input: ReportInput): string {
  const r = input.intelligenceReport;
  const scripts = r.scriptingBottlenecks;
  const rbr = r.renderBlockingResources;

  const scriptRows = scripts.map(s => `<tr>
    <td class="mono" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(s.url)}">${escHtml(s.url)}</td>
    <td class="mono">${formatMs(s.totalExecutionMs)}</td>
    <td><span class="badge ${severityClass(s.severity)}">${s.severity}</span></td>
    <td>${s.causedLongTask ? `<span class="badge severity-high">Yes</span>` : `<span style="color:var(--color-text-dim);font-size:0.8rem;">No</span>`}</td>
  </tr>`).join("\n");

  const rbrRows = rbr.map(res => `<tr>
    <td class="mono" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(res.url)}">${escHtml(res.url)}</td>
    <td><span class="badge" style="background:rgba(59,130,246,0.1);color:#60a5fa;">${escHtml(res.type)}</span></td>
    <td class="mono">${res.blockingMs !== null ? formatMs(res.blockingMs) : "n/a"}</td>
    <td class="mono">${res.sizeKB !== null ? formatKB(res.sizeKB) : "n/a"}</td>
  </tr>`).join("\n");

  return `<section id="section-source-attribution" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">🧩</span>
      <h2>Source Attribution</h2>
      <span class="badge" style="background:rgba(99,102,241,0.1);color:#818cf8;margin-left:auto;">${scripts.length} scripts</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <h3 style="font-size:0.85rem;font-weight:600;color:var(--color-text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Scripting Bottlenecks</h3>
      ${scripts.length ? `<table class="data-table" aria-label="Scripting bottlenecks">
        <thead><tr><th>Script</th><th>Execution Time</th><th>Severity</th><th>Caused Long Task</th></tr></thead>
        <tbody>${scriptRows}</tbody>
      </table>` : `<div class="empty-state" style="padding:16px 0;"><div class="empty-state-icon">✅</div>No scripting bottlenecks detected.</div>`}

      ${rbr.length > 0 ? `
      <h3 style="font-size:0.85rem;font-weight:600;color:var(--color-text-muted);margin-top:28px;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Render-Blocking Resources</h3>
      <table class="data-table" aria-label="Render-blocking resources">
        <thead><tr><th>Resource</th><th>Type</th><th>Blocking Time</th><th>Size</th></tr></thead>
        <tbody>${rbrRows}</tbody>
      </table>` : ""}
    </div>
  </details>
</section>`;
}
