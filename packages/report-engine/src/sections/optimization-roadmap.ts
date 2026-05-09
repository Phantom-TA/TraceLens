/**
 * @file sections/optimization-roadmap.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml } from "../utils/format.js";
import { severityClass, categoryClass } from "../utils/severity.js";

export function renderOptimizationRoadmap(input: ReportInput): string {
  const { aiResult } = input;
  const recs = aiResult?.report?.recommendations ?? [];

  if (!recs.length) {
    return `<section id="section-optimization-roadmap" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">🗺️</span><h2>Optimization Roadmap</h2>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="empty-state"><div class="empty-state-icon">🤖</div>Run with AI enabled to generate an optimization roadmap.</div>
    </div>
  </details>
</section>`;
  }

  const effortColor: Record<string, string> = {
    low: "var(--color-good)", medium: "var(--color-warning)", high: "var(--color-poor)"
  };

  const cards = recs.map(rec => `<div class="rec-card">
  <div class="rec-card-header">
    <span class="rec-rank">${rec.rank}</span>
    <span class="rec-action">${escHtml(rec.action)}</span>
  </div>
  <div class="rec-body">${escHtml(rec.rationale)}</div>
  <div class="rec-footer">
    <span class="badge ${severityClass(rec.priority)}">${rec.priority}</span>
    <span class="badge ${categoryClass(rec.category)}">${escHtml(rec.category)}</span>
    <span class="badge" style="background:rgba(100,116,139,0.1);color:${effortColor[rec.effort] ?? "var(--color-muted)"};">${escHtml(rec.effort)} effort</span>
    <span class="rec-impact">⚡ ${escHtml(rec.estimatedImpact)}</span>
  </div>
</div>`).join("\n");

  return `<section id="section-optimization-roadmap" data-section class="section">
  <details open>
    <summary class="section-header">
      <span class="section-icon">🗺️</span>
      <h2>Optimization Roadmap</h2>
      <span class="badge" style="background:rgba(16,185,129,0.1);color:var(--color-good);margin-left:auto;">${recs.length} recommendations</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">${cards}</div>
  </details>
</section>`;
}
