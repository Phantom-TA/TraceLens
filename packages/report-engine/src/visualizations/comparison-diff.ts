/**
 * @file visualizations/comparison-diff.ts
 * @description Delta bar chart SVG for before/after metric comparison.
 */

export interface DiffMetric {
  label: string;
  before: number | null;
  after: number | null;
  unit: string;
  lowerIsBetter: boolean;
}

export function renderComparisonDiff(metrics: DiffMetric[]): string {
  const rowH = 36;
  const labelW = 80;
  const barMaxW = 260;
  const W = labelW + barMaxW + 120;
  const H = metrics.length * rowH + 24;

  // Find max absolute delta for scale
  let maxAbs = 0;
  for (const m of metrics) {
    if (m.before !== null && m.after !== null) {
      maxAbs = Math.max(maxAbs, Math.abs(m.after - m.before));
    }
  }

  const rows: string[] = [];
  metrics.forEach((m, i) => {
    const y = 12 + i * rowH;
    const cx = labelW + barMaxW / 2;

    rows.push(`<text x="${labelW - 8}" y="${y + rowH/2 + 4}" text-anchor="end"
      font-family="'Inter',sans-serif" font-size="10" font-weight="500"
      fill="rgba(148,163,184,0.9)">${m.label}</text>`);

    // Center baseline
    rows.push(`<line x1="${cx}" y1="${y + 4}" x2="${cx}" y2="${y + rowH - 4}"
      stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`);

    if (m.before === null || m.after === null) {
      rows.push(`<text x="${cx}" y="${y + rowH/2 + 4}" text-anchor="middle"
        font-family="'JetBrains Mono',monospace" font-size="9"
        fill="rgba(148,163,184,0.4)">n/a</text>`);
      return;
    }

    const delta = m.after - m.before;
    const isImproved = m.lowerIsBetter ? delta < 0 : delta > 0;
    const barColor = Math.abs(delta) < 0.001 ? "rgba(148,163,184,0.3)" : isImproved ? "#10b981" : "#ef4444";
    const barW = maxAbs > 0 ? Math.abs(delta / maxAbs) * (barMaxW / 2 - 4) : 0;

    const barX = delta <= 0 ? cx - barW : cx;
    rows.push(`<rect x="${barX}" y="${y + 10}" width="${barW}" height="${rowH - 20}"
      rx="2" fill="${barColor}" opacity="0.8"/>`);

    const sign = delta > 0 ? "+" : "";
    const valText = `${sign}${Math.round(delta)}${m.unit}`;
    const textX = delta >= 0 ? cx + barW + 6 : cx - barW - 6;
    const anchor = delta >= 0 ? "start" : "end";
    rows.push(`<text x="${textX}" y="${y + rowH/2 + 4}" text-anchor="${anchor}"
      font-family="'JetBrains Mono',monospace" font-size="10" font-weight="600"
      fill="${barColor}">${valText}</text>`);
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
  role="img" aria-label="Performance delta comparison chart">
  <title>Performance Delta</title>
  ${rows.join("\n  ")}
</svg>`;
}
