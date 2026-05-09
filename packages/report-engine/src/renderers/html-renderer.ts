/**
 * @file renderers/html-renderer.ts
 * @description Master HTML report builder. Assembles all section fragments into the shell.
 */

import type { ReportInput } from "../types.js";
import { renderHtmlShell } from "../templates/html-shell.js";
import { renderTimeline } from "../visualizations/timeline.js";

import { renderExecutiveSummary }      from "../sections/executive-summary.js";
import { renderCoreWebVitals }         from "../sections/core-web-vitals.js";
import { renderLighthouseMetrics }     from "../sections/lighthouse-metrics.js";
import { renderBottleneckAnalysis }    from "../sections/bottleneck-analysis.js";
import { renderSourceAttribution }     from "../sections/source-attribution.js";
import { renderFrameworkIntelligence } from "../sections/framework-intelligence.js";
import { renderHydrationAnalysis }     from "../sections/hydration-analysis.js";
import { renderBundleIntelligence }    from "../sections/bundle-intelligence.js";
import { renderLongTasks }             from "../sections/long-tasks.js";
import { renderStabilityConfidence }   from "../sections/stability-confidence.js";
import { renderAiRootCause }           from "../sections/ai-root-cause.js";
import { renderOptimizationRoadmap }   from "../sections/optimization-roadmap.js";
import { renderEstimatedGains }        from "../sections/estimated-gains.js";
import { renderArtifactReferences }    from "../sections/artifact-references.js";
import { renderSessionMetadata }       from "../sections/session-metadata.js";

import { truncateUrl, formatDate } from "../utils/format.js";

const SECTIONS = [
  { id: "section-executive-summary",      label: "Executive Summary",      icon: "🎯" },
  { id: "section-core-web-vitals",        label: "Core Web Vitals",        icon: "📊" },
  { id: "section-lighthouse-metrics",     label: "Lighthouse",             icon: "🔦" },
  { id: "section-timeline",               label: "Timeline",               icon: "⏳" },
  { id: "section-bottleneck-analysis",    label: "Bottlenecks",            icon: "🔍" },
  { id: "section-source-attribution",     label: "Source Attribution",     icon: "🧩" },
  { id: "section-long-tasks",             label: "Long Tasks",             icon: "⏱️" },
  { id: "section-framework-intelligence", label: "Framework",              icon: "🏗️" },
  { id: "section-hydration-analysis",     label: "Hydration",              icon: "💧" },
  { id: "section-bundle-intelligence",    label: "Bundle",                 icon: "📦" },
  { id: "section-stability-confidence",   label: "Stability",              icon: "🛡️" },
  { id: "section-ai-root-cause",          label: "AI Root Cause",          icon: "🤖" },
  { id: "section-optimization-roadmap",   label: "Roadmap",                icon: "🗺️" },
  { id: "section-estimated-gains",        label: "Estimated Gains",        icon: "📈" },
  { id: "section-artifact-references",    label: "Artifacts",              icon: "📎" },
  { id: "section-session-metadata",       label: "Session Metadata",       icon: "🗂️" },
];

export function renderHtmlReport(input: ReportInput, title?: string): string {
  const r = input.intelligenceReport;

  // Timeline section
  const timelineSection = `<section id="section-timeline" data-section class="section">
  <details open>
    <summary class="section-header">
      <span class="section-icon">⏳</span>
      <h2>Performance Timeline</h2>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body" style="padding:16px;">
      ${renderTimeline(r)}
      <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;font-size:0.78rem;color:var(--color-text-dim);">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#6366f1;margin-right:4px;"></span>FCP</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;margin-right:4px;"></span>LCP</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;margin-right:4px;"></span>TTI</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#ef4444;opacity:0.8;margin-right:4px;"></span>Long Task</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#8b5cf6;opacity:0.7;margin-right:4px;"></span>Hydration</span>
      </div>
    </div>
  </details>
</section>`;

  const body = [
    renderExecutiveSummary(input),
    renderCoreWebVitals(input),
    renderLighthouseMetrics(input),
    timelineSection,
    renderBottleneckAnalysis(input),
    renderSourceAttribution(input),
    renderLongTasks(input),
    renderFrameworkIntelligence(input),
    renderHydrationAnalysis(input),
    renderBundleIntelligence(input),
    renderStabilityConfidence(input),
    renderAiRootCause(input),
    renderOptimizationRoadmap(input),
    renderEstimatedGains(input),
    renderArtifactReferences(input),
    renderSessionMetadata(input),
  ].join("\n\n");

  const reportTitle = title ?? `TraceLens Report — ${truncateUrl(r.session.url, 50)}`;

  return renderHtmlShell({
    title: reportTitle,
    url: r.session.url,
    sessionId: r.session.sessionId,
    generatedAt: formatDate(r.meta.generatedAt),
    sections: SECTIONS,
    bodyContent: body,
  });
}
