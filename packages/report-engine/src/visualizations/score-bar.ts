/**
 * @file visualizations/score-bar.ts
 * @description Lighthouse score semi-circle gauge — pure inline SVG.
 * Colors match Lighthouse's own palette: 0-49 red, 50-89 amber, 90-100 green.
 */

import { scoreColor } from "../utils/severity.js";

export function renderScoreGauge(score: number | null, label: string): string {
  const size = 120;
  const cx = size / 2;
  const cy = size / 2 + 12;
  const r = 44;
  const strokeW = 9;
  const circumference = Math.PI * r; // semicircle = half of 2πr

  const displayScore = score ?? 0;
  const color = scoreColor(score);
  const fill = score === null ? 0 : Math.min(displayScore / 100, 1);
  const dashFill = fill * circumference;
  const dashGap = circumference - dashFill;

  // Arc drawn from left (-180deg) to right (0deg): start at 9 o'clock, go clockwise
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-label="${label}: ${displayScore}" role="img">
  <title>${label}: ${score ?? "n/a"}</title>
  <!-- Track arc -->
  <path
    d="M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}"
    fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="${strokeW}"
    stroke-linecap="round"
  />
  <!-- Score arc -->
  <path
    d="M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}"
    fill="none" stroke="${color}" stroke-width="${strokeW}"
    stroke-linecap="round"
    stroke-dasharray="${dashFill.toFixed(2)} ${dashGap.toFixed(2)}"
  />
  <!-- Score text -->
  <text x="${cx}" y="${cy - 4}" text-anchor="middle"
    font-family="'JetBrains Mono',monospace" font-size="22" font-weight="700"
    fill="${color}"
  >${score !== null ? displayScore : "–"}</text>
  <!-- Label -->
  <text x="${cx}" y="${cy + 18}" text-anchor="middle"
    font-family="'Inter',sans-serif" font-size="9" font-weight="500"
    fill="rgba(148,163,184,0.9)"
  >${label}</text>
</svg>`;
}
