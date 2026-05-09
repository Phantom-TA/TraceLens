/**
 * @file sections/session-metadata.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatMs, formatDate } from "../utils/format.js";

export function renderSessionMetadata(input: ReportInput): string {
  const s = input.intelligenceReport.session;
  const m = input.intelligenceReport.meta;
  const ai = input.aiResult;

  const stageRows = ai?.meta ? `
    <tr><td>AI Provider</td><td class="mono">${escHtml(ai.meta.provider ?? "—")}</td></tr>
    <tr><td>AI Model</td><td class="mono">${escHtml(ai.meta.model ?? "—")}</td></tr>
    ${ai.meta.usage?.totalTokens ? `<tr><td>Tokens Used</td><td class="mono">${ai.meta.usage.totalTokens.toLocaleString()}</td></tr>` : ""}
    ${ai.meta.durationMs ? `<tr><td>AI Duration</td><td class="mono">${formatMs(ai.meta.durationMs)}</td></tr>` : ""}
  ` : "";

  return `<section id="section-session-metadata" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">🗂️</span>
      <h2>Session Metadata</h2>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="meta-grid" style="margin-bottom:20px;">
        <div class="meta-item"><div class="meta-key">Session ID</div><div class="meta-val">${escHtml(s.sessionId)}</div></div>
        <div class="meta-item"><div class="meta-key">URL</div><div class="meta-val" style="word-break:break-all;">${escHtml(s.url)}</div></div>
        <div class="meta-item"><div class="meta-key">Label</div><div class="meta-val">${escHtml(s.label)}</div></div>
        <div class="meta-item"><div class="meta-key">Device</div><div class="meta-val">${escHtml(s.device)}</div></div>
        <div class="meta-item"><div class="meta-key">Throttle</div><div class="meta-val">${escHtml(s.throttle)}</div></div>
        <div class="meta-item"><div class="meta-key">Runs</div><div class="meta-val">${s.runs}</div></div>
        <div class="meta-item"><div class="meta-key">Pipeline Duration</div><div class="meta-val">${formatMs(s.pipelineDurationMs)}</div></div>
        <div class="meta-item"><div class="meta-key">Generated At</div><div class="meta-val" style="font-size:0.82rem;">${formatDate(m.generatedAt)}</div></div>
        <div class="meta-item"><div class="meta-key">Engine Version</div><div class="meta-val">${escHtml(m.engineVersion)}</div></div>
        <div class="meta-item"><div class="meta-key">Aggregation Time</div><div class="meta-val">${formatMs(m.aggregationMs)}</div></div>
      </div>

      ${stageRows ? `<table class="data-table" aria-label="AI observability metadata">
        <thead><tr><th>AI Observability</th><th>Value</th></tr></thead>
        <tbody>${stageRows}</tbody>
      </table>` : ""}
    </div>
  </details>
</section>`;
}
