/**
 * @file sections/ai-root-cause.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatMs } from "../utils/format.js";
import { severityClass } from "../utils/severity.js";

export function renderAiRootCause(input: ReportInput): string {
  const { aiResult } = input;

  if (!aiResult || aiResult.status !== "success" || !aiResult.report) {
    const reason = !aiResult ? "AI analysis was not run" :
      aiResult.status === "skipped" ? "AI analysis was skipped — set GEMINI_API_KEY or OPENAI_API_KEY" :
      "AI analysis failed";
    return `<section id="section-ai-root-cause" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">🤖</span><h2>AI Root-Cause Analysis</h2>
      <span class="badge" style="background:rgba(100,116,139,0.1);color:var(--color-text-dim);margin-left:auto;">Not available</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="empty-state"><div class="empty-state-icon">🤖</div>${escHtml(reason)}</div>
    </div>
  </details>
</section>`;
  }

  const ai = aiResult.report;
  const meta = aiResult.meta;

  const causeCards = ai.rootCauses.map(cause => {
    const metrics = Object.entries(cause.metrics).map(([k, v]) =>
      `<span class="ai-metric-pill">${escHtml(k)}: ${escHtml(String(v))}</span>`
    ).join(" ");
    return `<div class="ai-cause-card">
  <div class="ai-cause-header">
    <span class="ai-cause-rank">${cause.rank}</span>
    <span class="ai-cause-title">${escHtml(cause.issue)}</span>
    <span class="badge ${severityClass(cause.severity)}" style="margin-left:auto;">${cause.severity.toUpperCase()}</span>
  </div>
  <div class="ai-cause-body">${escHtml(cause.explanation)}</div>
  <div class="ai-cause-impact">⚡ ${escHtml(cause.impact)}</div>
  ${metrics ? `<div class="ai-metrics">${metrics}</div>` : ""}
</div>`;
  }).join("\n");

  return `<section id="section-ai-root-cause" data-section class="section">
  <details open>
    <summary class="section-header">
      <span class="section-icon">🤖</span>
      <h2>AI Root-Cause Analysis</h2>
      <span class="badge" style="background:rgba(99,102,241,0.12);color:#818cf8;margin-left:auto;">${escHtml(meta.provider ?? "")}/${escHtml(meta.model ?? "")}</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="ai-summary-block" role="note">${escHtml(ai.summary)}</div>

      <div style="margin-bottom:20px;padding:14px 18px;background:var(--color-bg-hover);border-radius:var(--radius-md);border-left:3px solid var(--color-accent);">
        <div style="font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-dim);margin-bottom:6px;">Primary Bottleneck</div>
        <div style="font-weight:600;font-size:0.95rem;margin-bottom:6px;">${escHtml(ai.primaryBottleneck.type.replace(/-/g, " "))}</div>
        <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:8px;">${escHtml(ai.primaryBottleneck.explanation)}</p>
        <div class="chips">${ai.primaryBottleneck.evidence.map(e => `<span class="ai-metric-pill">${escHtml(e)}</span>`).join(" ")}</div>
      </div>

      <h3 style="font-size:0.82rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:12px;">Root Causes</h3>
      ${causeCards}

      <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;padding:12px 16px;background:var(--color-bg-hover);border-radius:var(--radius-md);font-size:0.8rem;color:var(--color-text-dim);">
        ${meta.provider ? `<span>Provider: <strong>${escHtml(meta.provider)}</strong></span>` : ""}
        ${meta.model ? `<span>Model: <strong>${escHtml(meta.model)}</strong></span>` : ""}
        ${meta.usage?.totalTokens ? `<span>Tokens: <strong>${meta.usage.totalTokens.toLocaleString()}</strong></span>` : ""}
        ${meta.durationMs ? `<span>Duration: <strong>${formatMs(meta.durationMs)}</strong></span>` : ""}
        ${meta.usage ? `<span>Confidence: <strong>${Math.round((ai.confidence?.overall ?? 0) * 100)}%</strong></span>` : ""}
      </div>
    </div>
  </details>
</section>`;
}
