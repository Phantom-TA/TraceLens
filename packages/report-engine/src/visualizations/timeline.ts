/**
 * @file visualizations/timeline.ts
 * @description Static SVG performance timeline: FCP, LCP, TBT, long tasks, hydration.
 */

import type { TraceLensIntelligenceReport } from "../../../analytics-engine/src/types.js";

interface TimelineEvent {
  label: string;
  timeMs: number;
  color: string;
  lane: number; // 0=markers, 1=main thread blocks
}

export function renderTimeline(report: TraceLensIntelligenceReport): string {
  const cwv    = report.coreWebVitals;
  const mt     = report.mainThread;
  const hydra  = report.hydration;

  const fcpMs  = cwv.fcp.value  ?? 0;
  const lcpMs  = cwv.lcp.value  ?? 0;
  const ttiMs  = cwv.tti.value  ?? 0;
  const maxMs  = Math.max(ttiMs || lcpMs * 1.5, lcpMs * 1.5, 4000);

  // SVG dimensions
  const W = 800; const H = 130;
  const padL = 90; const padR = 20; const padT = 20; const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const toX = (ms: number) => padL + Math.min((ms / maxMs) * chartW, chartW);

  // Time axis ticks
  const tickCount = 5;
  const tickMs = Math.ceil(maxMs / tickCount / 500) * 500;
  const ticks: number[] = [];
  for (let t = 0; t <= maxMs + tickMs; t += tickMs) ticks.push(t);

  // Swimlanes: y positions
  const laneH = (chartH - 20) / 3;
  const lane0Y = padT + 4;                 // metric markers
  const lane1Y = padT + laneH + 8;         // TBT window
  const lane2Y = padT + laneH * 2 + 14;   // long tasks

  // Build SVG elements
  const els: string[] = [];

  // Background grid
  for (const t of ticks) {
    const x = toX(t);
    if (x > padL && x < W - padR) {
      els.push(`<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`);
    }
  }

  // TTFB marker
  const ttfbMs = cwv.ttfb.value ?? 0;
  if (ttfbMs > 0) {
    const x = toX(ttfbMs);
    els.push(`<line x1="${x}" y1="${lane0Y}" x2="${x}" y2="${lane0Y + 40}" stroke="rgba(148,163,184,0.4)" stroke-width="1" stroke-dasharray="3,2"/>`);
    els.push(`<text x="${x}" y="${lane0Y - 3}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="rgba(148,163,184,0.7)">TTFB</text>`);
  }

  // FCP marker
  if (fcpMs > 0) {
    const x = toX(fcpMs);
    els.push(`<line x1="${x}" y1="${lane0Y}" x2="${x}" y2="${H - padB}" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4,3"/>`);
    els.push(`<circle cx="${x}" cy="${lane0Y + 4}" r="4" fill="#6366f1"/>`);
    els.push(`<text x="${x}" y="${lane0Y - 3}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="#6366f1">FCP ${fcpMs}ms</text>`);
  }

  // LCP marker
  if (lcpMs > 0) {
    const x = toX(lcpMs);
    els.push(`<line x1="${x}" y1="${lane0Y}" x2="${x}" y2="${H - padB}" stroke="#f59e0b" stroke-width="2"/>`);
    els.push(`<circle cx="${x}" cy="${lane0Y + 4}" r="5" fill="#f59e0b"/>`);
    els.push(`<text x="${x}" y="${lane0Y - 3}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="#f59e0b">LCP ${lcpMs}ms</text>`);
  }

  // TTI marker
  if (ttiMs > 0 && ttiMs > lcpMs) {
    const x = toX(ttiMs);
    els.push(`<line x1="${x}" y1="${lane0Y}" x2="${x}" y2="${H - padB}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,3"/>`);
    els.push(`<circle cx="${x}" cy="${lane0Y + 4}" r="4" fill="#10b981"/>`);
    els.push(`<text x="${x}" y="${lane0Y - 3}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="#10b981">TTI ${ttiMs}ms</text>`);
  }

  // TBT window (FCP → TTI shaded)
  if (fcpMs > 0 && ttiMs > fcpMs) {
    const x1 = toX(fcpMs);
    const x2 = toX(ttiMs);
    const barW = x2 - x1;
    const tbtRating = cwv.tbt.rating;
    const tbtColor = tbtRating === "good" ? "rgba(16,185,129,0.15)" : tbtRating === "poor" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)";
    els.push(`<rect x="${x1}" y="${lane1Y}" width="${barW}" height="16" rx="3" fill="${tbtColor}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`);
    els.push(`<text x="${x1 + barW/2}" y="${lane1Y + 10}" text-anchor="middle" font-family="'Inter',sans-serif" font-size="8.5" fill="rgba(200,200,200,0.8)">TBT window</text>`);
  }

  // Long task blocks on lane 2
  const topTasks = mt.topLongTasks.slice(0, 8);
  for (const task of topTasks) {
    const x  = toX(task.startTimeMs);
    const w  = Math.max(toX(task.startTimeMs + task.durationMs) - x, 3);
    const c  = task.severity === "critical" ? "#dc2626" : task.severity === "high" ? "#ef4444" : "#f59e0b";
    els.push(`<rect x="${x}" y="${lane2Y}" width="${w}" height="14" rx="2" fill="${c}" opacity="0.8" title="${task.durationMs}ms long task"/>`);
  }

  // Hydration window
  if (hydra.detected && hydra.durationMs && fcpMs > 0) {
    const hydraEnd = fcpMs + hydra.durationMs;
    const x1 = toX(fcpMs);
    const x2 = toX(hydraEnd);
    const barW = x2 - x1;
    els.push(`<rect x="${x1}" y="${lane2Y - 20}" width="${barW}" height="12" rx="2" fill="rgba(139,92,246,0.3)" stroke="rgba(139,92,246,0.5)" stroke-width="1"/>`);
    els.push(`<text x="${x1 + barW/2}" y="${lane2Y - 12}" text-anchor="middle" font-family="'Inter',sans-serif" font-size="8" fill="#a78bfa">Hydration</text>`);
  }

  // Lane labels (left axis)
  els.push(`<text x="${padL - 6}" y="${lane1Y + 10}" text-anchor="end" font-family="'Inter',sans-serif" font-size="8.5" fill="rgba(148,163,184,0.6)">TBT</text>`);
  els.push(`<text x="${padL - 6}" y="${lane2Y + 10}" text-anchor="end" font-family="'Inter',sans-serif" font-size="8.5" fill="rgba(148,163,184,0.6)">Tasks</text>`);

  // X-axis line
  els.push(`<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`);

  // X-axis tick labels
  for (const t of ticks) {
    const x = toX(t);
    if (x >= padL && x <= W - padR) {
      const label = t >= 1000 ? `${(t/1000).toFixed(1)}s` : `${t}ms`;
      els.push(`<text x="${x}" y="${H - padB + 12}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="8" fill="rgba(148,163,184,0.5)">${label}</text>`);
    }
  }

  return `<div class="timeline-wrap">
<svg class="timeline-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
  role="img" aria-label="Performance timeline showing FCP, LCP, TTI markers and long tasks">
  <title>Performance Timeline</title>
  ${els.join("\n  ")}
</svg>
</div>`;
}
