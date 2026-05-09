/**
 * @file sections/core-web-vitals.ts
 */

import type { ReportInput } from "../types.js";
import { renderCwvGauge, cwvFillRatio } from "../visualizations/cwv-gauge.js";
import { formatVital, ratingLabel, escHtml } from "../utils/format.js";
import { ratingClass } from "../utils/severity.js";
import type { NormalizedCoreWebVitals } from "../../../analytics-engine/src/types.js";

type VitalKey = keyof Omit<NormalizedCoreWebVitals, "performanceScore" | "overallRating">;

const VITALS: Array<{ key: VitalKey; label: string; goodThreshold: string }> = [
  { key: "lcp",         label: "LCP",         goodThreshold: "< 2.5s" },
  { key: "fcp",         label: "FCP",         goodThreshold: "< 1.8s" },
  { key: "tbt",         label: "TBT",         goodThreshold: "< 200ms" },
  { key: "cls",         label: "CLS",         goodThreshold: "< 0.1" },
  { key: "tti",         label: "TTI",         goodThreshold: "< 3.8s" },
  { key: "ttfb",        label: "TTFB",        goodThreshold: "< 800ms" },
  { key: "speedIndex",  label: "Speed Index", goodThreshold: "< 3.4s" },
];

export function renderCoreWebVitals(input: ReportInput): string {
  const cwv = input.intelligenceReport.coreWebVitals;

  const gauges = VITALS.map(({ key, label }) => {
    const vital = cwv[key];
    const fill = cwvFillRatio(key, vital.value);
    return `<div class="gauge-wrap">
      ${renderCwvGauge({ label, value: vital.value, unit: vital.unit, rating: vital.rating, fillRatio: fill })}
    </div>`;
  }).join("\n");

  const rows = VITALS.map(({ key, label, goodThreshold }) => {
    const vital = cwv[key];
    const displayVal = formatVital(vital.value, vital.unit);
    return `<tr>
      <td><strong>${escHtml(label)}</strong></td>
      <td class="mono">${escHtml(displayVal)}</td>
      <td><span class="badge ${ratingClass(vital.rating)}">${ratingLabel(vital.rating)}</span></td>
      <td style="color:var(--color-text-dim);font-size:0.8rem;">${escHtml(goodThreshold)}</td>
    </tr>`;
  }).join("\n");

  return `<section id="section-core-web-vitals" data-section class="section">
  <details open>
    <summary class="section-header">
      <span class="section-icon">📊</span>
      <h2>Core Web Vitals</h2>
      <span class="badge ${ratingClass(cwv.overallRating)} section-badge">${ratingLabel(cwv.overallRating)}</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;justify-content:center;">
        ${gauges}
      </div>
      <table class="data-table" aria-label="Core Web Vitals metrics">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Rating</th>
            <th>Good Threshold</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="background:var(--color-bg-hover);">
            <td><strong>Performance Score</strong></td>
            <td class="mono"><strong>${cwv.performanceScore ?? "n/a"}</strong></td>
            <td><span class="badge ${ratingClass(cwv.overallRating)}">${ratingLabel(cwv.overallRating)}</span></td>
            <td style="color:var(--color-text-dim);font-size:0.8rem;">&ge; 90</td>
          </tr>
        </tbody>
      </table>
    </div>
  </details>
</section>`;
}
