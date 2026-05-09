/**
 * @file sections/long-tasks.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatMs } from "../utils/format.js";
import { severityClass } from "../utils/severity.js";

export function renderLongTasks(input: ReportInput): string {
  const mt = input.intelligenceReport.mainThread;
  const tasks = mt.topLongTasks;

  // Category breakdown bar chart
  const cats = Object.entries(mt.categoryBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
  const maxCatMs = cats.length ? Math.max(...cats.map(c => c[1])) : 1;
  const catBars = cats.map(([cat, ms]) => {
    const pct = (ms / maxCatMs * 100).toFixed(1);
    return `<div class="hydration-bar">
      <span class="hydration-bar-label mono" style="min-width:110px;">${escHtml(cat)}</span>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%;background:var(--color-accent);"></div></div>
      <span class="mono" style="min-width:60px;text-align:right;font-size:0.82rem;color:var(--color-text-muted);">${formatMs(ms)}</span>
    </div>`;
  }).join("\n");

  const taskRows = tasks.map(t => `<tr>
    <td class="mono" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(t.script ?? "")}">${escHtml(t.script ?? "Unattributed")}</td>
    <td class="mono" style="color:${t.severity === "critical" || t.severity === "high" ? "var(--color-poor)" : "var(--color-text)"};">${formatMs(t.durationMs)}</td>
    <td class="mono">${formatMs(t.startTimeMs)}</td>
    <td>${escHtml(t.attribution)}</td>
    <td><span class="badge ${severityClass(t.severity)}">${t.severity}</span></td>
    <td>${t.lcpOverlap ? `<span class="badge severity-high">Yes</span>` : `<span style="color:var(--color-text-dim);font-size:0.8rem;">No</span>`}</td>
  </tr>`).join("\n");

  return `<section id="section-long-tasks" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">⏱️</span>
      <h2>Long Tasks &amp; Main Thread</h2>
      <span class="badge ${mt.longTaskCount > 5 ? "severity-high" : mt.longTaskCount > 0 ? "severity-medium" : "rating-good"} section-badge">${mt.longTaskCount} long tasks</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="metric-card">
          <div class="metric-card-label">Total Blocking</div>
          <div class="metric-card-value" style="${mt.totalBlockingMs > 300 ? "color:var(--color-poor);" : mt.totalBlockingMs > 100 ? "color:var(--color-warning);" : ""}">${formatMs(mt.totalBlockingMs)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Long Task Count</div>
          <div class="metric-card-value" style="font-size:2rem;">${mt.longTaskCount}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Longest Task</div>
          <div class="metric-card-value">${formatMs(mt.longestTaskMs)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Total Main Thread</div>
          <div class="metric-card-value">${formatMs(mt.totalMainThreadMs)}</div>
        </div>
      </div>

      ${cats.length ? `<div style="margin-bottom:20px;">
        <div style="font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-dim);margin-bottom:10px;">Category Breakdown</div>
        ${catBars}
      </div>` : ""}

      ${tasks.length ? `
      <h3 style="font-size:0.82rem;font-weight:600;color:var(--color-text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Top Long Tasks</h3>
      <table class="data-table" aria-label="Top long tasks">
        <thead><tr><th>Script</th><th>Duration</th><th>Start Time</th><th>Attribution</th><th>Severity</th><th>LCP Overlap</th></tr></thead>
        <tbody>${taskRows}</tbody>
      </table>` : `<div class="empty-state"><div class="empty-state-icon">✅</div>No long tasks recorded.</div>`}
    </div>
  </details>
</section>`;
}
