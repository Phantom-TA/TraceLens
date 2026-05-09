/**
 * @file sections/artifact-references.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatPath } from "../utils/format.js";

interface ArtifactEntry {
  icon: string;
  label: string;
  path: string | null | undefined;
  type: string;
}

export function renderArtifactReferences(input: ReportInput): string {
  const arts = input.artifacts ?? {};

  const entries: ArtifactEntry[] = [
    { icon: "📸", label: "Screenshot",             path: arts.screenshotPath,      type: "PNG" },
    { icon: "🎭", label: "Playwright Trace",        path: arts.tracePath,           type: "Trace" },
    { icon: "🌐", label: "HAR Archive",             path: arts.harPath,             type: "HAR" },
    { icon: "🔦", label: "Lighthouse HTML Report",  path: arts.lighthouseHtmlPath,  type: "HTML" },
    { icon: "📄", label: "Lighthouse JSON",         path: arts.lighthouseJsonPath,  type: "JSON" },
    { icon: "🔍", label: "Bottlenecks JSON",        path: arts.bottlenecksJsonPath, type: "JSON" },
    { icon: "📦", label: "Bundle Analysis JSON",    path: arts.bundleJsonPath,      type: "JSON" },
  ].filter(e => e.path);

  if (!entries.length) {
    return `<section id="section-artifact-references" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">📎</span><h2>Artifact References</h2>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body"><div class="empty-state"><div class="empty-state-icon">📂</div>No artifact paths provided.</div></div>
  </details>
</section>`;
  }

  const items = entries.map(e => `<a class="artifact-item" href="${escHtml(e.path!)}" target="_blank" rel="noopener noreferrer">
  <span class="artifact-icon">${e.icon}</span>
  <div style="flex:1;min-width:0;">
    <div style="font-weight:500;font-size:0.85rem;">${escHtml(e.label)}</div>
    <div class="artifact-path">${escHtml(formatPath(e.path!))}</div>
  </div>
  <span class="badge" style="background:rgba(99,102,241,0.08);color:#818cf8;flex-shrink:0;">${escHtml(e.type)}</span>
  <span class="artifact-open">Open ↗</span>
</a>`).join("\n");

  return `<section id="section-artifact-references" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">📎</span>
      <h2>Artifact References</h2>
      <span class="badge" style="background:rgba(99,102,241,0.1);color:#818cf8;margin-left:auto;">${entries.length} artifacts</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="artifact-list">${items}</div>
    </div>
  </details>
</section>`;
}
