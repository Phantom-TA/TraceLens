/**
 * @file renderers/comparison-renderer.ts
 * @description Before/after comparison HTML report renderer.
 */

import type { ComparisonInput } from "../types.js";
import { renderComparisonShell } from "../templates/comparison-shell.js";
import { renderComparisonDiff } from "../visualizations/comparison-diff.js";
import { escHtml, formatVital, formatDate, ratingLabel } from "../utils/format.js";
import { ratingClass, trendClass } from "../utils/severity.js";

interface MetricDelta {
  label: string;
  beforeVal: number | null;
  afterVal:  number | null;
  beforeRating: string;
  afterRating:  string;
  unit: "ms" | "score" | "unitless";
  lowerIsBetter: boolean;
  trend: "improved" | "regressed" | "unchanged";
  diffMs: number | null;
  diffPct: number | null;
}

function computeDeltas(before: ComparisonInput["before"], after: ComparisonInput["after"]): MetricDelta[] {
  const bCwv = before.intelligenceReport.coreWebVitals;
  const aCwv = after.intelligenceReport.coreWebVitals;

  const defs: Array<{ key: keyof typeof bCwv; label: string; unit: "ms" | "score" | "unitless"; lowerIsBetter: boolean }> = [
    { key: "lcp",          label: "LCP",             unit: "ms",       lowerIsBetter: true  },
    { key: "fcp",          label: "FCP",             unit: "ms",       lowerIsBetter: true  },
    { key: "tbt",          label: "TBT",             unit: "ms",       lowerIsBetter: true  },
    { key: "cls",          label: "CLS",             unit: "unitless", lowerIsBetter: true  },
    { key: "tti",          label: "TTI",             unit: "ms",       lowerIsBetter: true  },
    { key: "ttfb",         label: "TTFB",            unit: "ms",       lowerIsBetter: true  },
    { key: "speedIndex",   label: "Speed Index",     unit: "ms",       lowerIsBetter: true  },
  ];

  return defs.map(d => {
    const bVital = bCwv[d.key] as { value: number | null; rating: string; unit: string } | null | number;
    const aVital = aCwv[d.key] as { value: number | null; rating: string; unit: string } | null | number;

    const bV = typeof bVital === "object" && bVital !== null ? (bVital as any).value as number | null : null;
    const aV = typeof aVital === "object" && aVital !== null ? (aVital as any).value as number | null : null;
    const bR = typeof bVital === "object" && bVital !== null ? (bVital as any).rating as string : "unknown";
    const aR = typeof aVital === "object" && aVital !== null ? (aVital as any).rating as string : "unknown";

    let diff = bV !== null && aV !== null ? aV - bV : null;
    let diffPct = diff !== null && bV ? Math.round((diff / bV) * 100) : null;
    let trend: "improved" | "regressed" | "unchanged" = "unchanged";

    if (diff !== null && Math.abs(diff) / (bV || 1) > 0.03) {
      trend = (d.lowerIsBetter ? diff < 0 : diff > 0) ? "improved" : "regressed";
    }

    return {
      label: d.label, beforeVal: bV, afterVal: aV,
      beforeRating: bR, afterRating: aR,
      unit: d.unit, lowerIsBetter: d.lowerIsBetter,
      trend, diffMs: diff !== null ? Math.round(diff) : null, diffPct,
    };
  });
}

export function renderComparisonReport(input: ComparisonInput): string {
  const bR = input.before.intelligenceReport;
  const aR = input.after.intelligenceReport;
  const deltas = computeDeltas(input.before, input.after);

  const regressions = deltas.filter(d => d.trend === "regressed");
  const improvements = deltas.filter(d => d.trend === "improved");

  // Score comparison
  const bScore = bR.coreWebVitals.performanceScore;
  const aScore = aR.coreWebVitals.performanceScore;
  const scoreDiff = bScore !== null && aScore !== null ? aScore - bScore : null;

  const alertBanner = regressions.length > 0
    ? `<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius-md);padding:14px 20px;margin-bottom:24px;">
        🚨 <strong style="color:var(--color-poor);">${regressions.length} regression${regressions.length !== 1 ? "s" : ""} detected:</strong>
        ${regressions.map(r => `<span class="badge severity-high" style="margin-left:6px;">${escHtml(r.label)}</span>`).join("")}
       </div>`
    : `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-md);padding:14px 20px;margin-bottom:24px;">
        ✅ <strong style="color:var(--color-good);">No regressions detected.</strong>
        ${improvements.length ? `${improvements.length} metric${improvements.length !== 1 ? "s" : ""} improved.` : ""}
       </div>`;

  const tableRows = deltas.map(d => {
    const bDisplay = formatVital(d.beforeVal, d.unit);
    const aDisplay = formatVital(d.afterVal, d.unit);
    const sign = d.diffMs !== null && d.diffMs > 0 ? "+" : "";
    const diffDisplay = d.diffMs !== null ? `${sign}${Math.round(d.diffMs)}${d.unit === "ms" ? "ms" : ""}` : "—";
    const arrow = d.trend === "improved" ? "↓" : d.trend === "regressed" ? "↑" : "—";
    return `<tr>
      <td><strong>${escHtml(d.label)}</strong></td>
      <td class="mono"><span class="badge ${ratingClass(d.beforeRating)}">${escHtml(bDisplay)}</span></td>
      <td class="mono"><span class="badge ${ratingClass(d.afterRating)}">${escHtml(aDisplay)}</span></td>
      <td class="mono ${trendClass(d.trend)}" style="font-weight:600;">${arrow} ${escHtml(diffDisplay)}</td>
      <td><span class="badge ${trendClass(d.trend) === "trend-improved" ? "rating-good" : trendClass(d.trend) === "trend-regressed" ? "rating-poor" : "rating-unknown"}">${d.trend}</span></td>
    </tr>`;
  }).join("\n");

  // Diff chart data
  const diffMetrics = deltas
    .filter(d => d.unit === "ms")
    .map(d => ({ label: d.label, before: d.beforeVal, after: d.afterVal, unit: "ms", lowerIsBetter: d.lowerIsBetter }));

  const body = `
  <h1 style="font-size:1.4rem;font-weight:700;letter-spacing:-0.02em;margin-bottom:6px;">Performance Comparison</h1>
  <p style="color:var(--color-text-muted);font-size:0.88rem;margin-bottom:24px;">Generated ${escHtml(formatDate(new Date().toISOString()))}</p>

  <div class="comp-banner">
    <div class="comp-side baseline">
      <div class="comp-role">Baseline</div>
      <div class="comp-label">${escHtml(input.beforeLabel ?? "Before")}</div>
      <div class="comp-url">${escHtml(bR.session.url)}</div>
      <div style="margin-top:8px;font-size:0.82rem;color:var(--color-text-dim);">${escHtml(bR.session.sessionId)}</div>
    </div>
    <div class="comp-vs">VS</div>
    <div class="comp-side current">
      <div class="comp-role">Current</div>
      <div class="comp-label">${escHtml(input.afterLabel ?? "After")}</div>
      <div class="comp-url">${escHtml(aR.session.url)}</div>
      <div style="margin-top:8px;font-size:0.82rem;color:var(--color-text-dim);">${escHtml(aR.session.sessionId)}</div>
    </div>
  </div>

  ${alertBanner}

  ${scoreDiff !== null ? `<div style="margin-bottom:24px;padding:16px 20px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-md);display:flex;align-items:center;gap:20px;">
    <div style="text-align:center;">
      <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-dim);">Before Score</div>
      <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);">${bScore}</div>
    </div>
    <div style="font-size:1.5rem;color:var(--color-text-dim);">→</div>
    <div style="text-align:center;">
      <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-dim);">After Score</div>
      <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);color:${scoreDiff > 0 ? "var(--color-good)" : scoreDiff < 0 ? "var(--color-poor)" : "var(--color-text)"};">${aScore}</div>
    </div>
    <div style="margin-left:12px;">
      <span style="font-size:1.1rem;font-weight:700;color:${scoreDiff > 0 ? "var(--color-good)" : scoreDiff < 0 ? "var(--color-poor)" : "var(--color-text-muted)"};">${scoreDiff > 0 ? "+" : ""}${scoreDiff} pts</span>
    </div>
  </div>` : ""}

  <div class="section" style="margin-bottom:28px;">
    <div class="section-body" style="padding:0;">
      <table class="data-table" aria-label="Metric comparison">
        <thead><tr><th>Metric</th><th>Before</th><th>After</th><th>Delta</th><th>Trend</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </div>

  <div class="section" style="margin-bottom:28px;">
    <div style="padding:16px 20px;border-bottom:1px solid var(--color-border);background:var(--color-bg-hover);">
      <strong style="font-size:0.9rem;">Delta Visualization</strong>
    </div>
    <div style="padding:20px;overflow-x:auto;">
      ${renderComparisonDiff(diffMetrics)}
    </div>
  </div>

  <div class="section" style="margin-bottom:28px;">
    <div style="padding:16px 20px;border-bottom:1px solid var(--color-border);background:var(--color-bg-hover);">
      <strong style="font-size:0.9rem;">Primary Bottleneck</strong>
    </div>
    <div style="padding:16px 20px;display:flex;gap:20px;align-items:center;">
      <div style="flex:1;text-align:center;">
        <div style="font-size:0.72rem;color:var(--color-text-dim);margin-bottom:4px;">Before</div>
        <span class="badge severity-${bR.performanceRisks[0]?.severity ?? "low"}" style="font-size:0.85rem;padding:4px 12px;">${bR.primaryBottleneck.replace(/-/g," ")}</span>
      </div>
      <div style="color:var(--color-text-dim);">→</div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:0.72rem;color:var(--color-text-dim);margin-bottom:4px;">After</div>
        <span class="badge severity-${aR.performanceRisks[0]?.severity ?? "low"}" style="font-size:0.85rem;padding:4px 12px;">${aR.primaryBottleneck.replace(/-/g," ")}</span>
      </div>
    </div>
  </div>`;

  return renderComparisonShell({
    title: `TraceLens Comparison — ${bR.session.url}`,
    beforeUrl: bR.session.url,
    afterUrl: aR.session.url,
    beforeLabel: input.beforeLabel ?? "Baseline",
    afterLabel: input.afterLabel ?? "Current",
    generatedAt: formatDate(new Date().toISOString()),
    bodyContent: body,
  });
}
