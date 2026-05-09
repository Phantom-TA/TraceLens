/**
 * @file visualizations/cwv-gauge.ts
 * @description Circular gauge for a single CWV metric — pure inline SVG.
 */

import { ratingColor } from "../utils/severity.js";
import { formatVital } from "../utils/format.js";

interface CwvGaugeOptions {
  label: string;
  value: number | null;
  unit: "ms" | "score" | "unitless";
  rating: string;
  /** 0–1 fill ratio (e.g. inverse-scaled from thresholds) */
  fillRatio: number;
}

export function renderCwvGauge(opts: CwvGaugeOptions): string {
  const size = 110;
  const cx = size / 2;
  const cy = size / 2;
  const r = 38;
  const strokeW = 8;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(Math.max(opts.fillRatio, 0), 1);
  const dashFill = fill * circ;
  const dashGap  = circ - dashFill;
  const color = ratingColor(opts.rating);
  const displayVal = formatVital(opts.value, opts.unit);

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${opts.label}: ${displayVal}">
  <title>${opts.label}: ${displayVal}</title>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
    stroke="rgba(255,255,255,0.06)" stroke-width="${strokeW}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
    stroke="${color}" stroke-width="${strokeW}"
    stroke-linecap="round"
    stroke-dasharray="${dashFill.toFixed(2)} ${dashGap.toFixed(2)}"
    transform="rotate(-90 ${cx} ${cy})"
  />
  <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="middle"
    font-family="'JetBrains Mono',monospace" font-size="13" font-weight="700"
    fill="${color}">${displayVal}</text>
  <text x="${cx}" y="${cy + 17}" text-anchor="middle"
    font-family="'Inter',sans-serif" font-size="8.5" font-weight="500"
    fill="rgba(148,163,184,0.8)">${opts.label}</text>
</svg>`;
}

/**
 * Compute a fill ratio (0–1) from a metric value using standard CWV thresholds.
 * 1.0 = perfect (at or below good threshold), 0.0 = worst.
 */
export function cwvFillRatio(metric: string, value: number | null): number {
  if (value === null) return 0;
  const thresholds: Record<string, { good: number; poor: number }> = {
    lcp:          { good: 2500,  poor: 4000  },
    fcp:          { good: 1800,  poor: 3000  },
    tbt:          { good: 200,   poor: 600   },
    cls:          { good: 0.1,   poor: 0.25  },
    tti:          { good: 3800,  poor: 7300  },
    ttfb:         { good: 800,   poor: 1800  },
    speedIndex:   { good: 3400,  poor: 5800  },
  };
  const t = thresholds[metric];
  if (!t) return 0.5;
  if (value <= t.good) return 1;
  if (value >= t.poor) return 0.1;
  // Linear interpolation between good and poor
  return 1 - ((value - t.good) / (t.poor - t.good)) * 0.9;
}
