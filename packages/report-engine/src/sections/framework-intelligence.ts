/**
 * @file sections/framework-intelligence.ts
 */

import type { ReportInput } from "../types.js";
import { escHtml, formatPct } from "../utils/format.js";

const FRAMEWORK_TIPS: Record<string, string[]> = {
  "next.js":  ["Use React Server Components to reduce client JS", "Enable Next.js streaming for faster TTFB", "Use next/dynamic for route-based code splitting"],
  "react":    ["Implement lazy() + Suspense for non-critical components", "Use React.memo to prevent unnecessary re-renders", "Defer hydration with libraries like react-lazy-hydration"],
  "vue":      ["Use defineAsyncComponent for code splitting", "Enable Vue 3 Suspense for async setup", "Consider Nuxt for SSR/SSG"],
  "nuxt":     ["Enable Nuxt payload extraction to reduce hydration size", "Use useAsyncData for server-side data fetching"],
  "angular":  ["Enable Angular lazy loading for feature modules", "Use OnPush change detection strategy", "Consider Angular SSR with @angular/ssr"],
  "svelte":   ["Svelte compiles away the framework — focus on bundle splitting and lazy loading"],
  "astro":    ["Use Astro Islands with client:idle or client:visible for minimal JS"],
};

export function renderFrameworkIntelligence(input: ReportInput): string {
  const fw = input.intelligenceReport.framework;

  if (!fw || !fw.framework) {
    return `<section id="section-framework-intelligence" data-section class="section">
  <details>
    <summary class="section-header">
      <span class="section-icon">🏗️</span><h2>Framework Intelligence</h2>
      <span class="badge" style="background:rgba(100,116,139,0.1);color:var(--color-text-dim);margin-left:auto;">Not detected</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="empty-state"><div class="empty-state-icon">🔎</div>No JavaScript framework was detected. This may be a server-rendered or static site.</div>
    </div>
  </details>
</section>`;
  }

  const conf = Math.round((fw.confidence ?? 0) * 100);
  const methods = (fw.detectionMethods ?? []).join(", ");
  const tips = FRAMEWORK_TIPS[fw.framework.toLowerCase()] ?? [];

  return `<section id="section-framework-intelligence" data-section class="section">
  <details open>
    <summary class="section-header">
      <span class="section-icon">🏗️</span>
      <h2>Framework Intelligence</h2>
      <span class="badge" style="background:rgba(99,102,241,0.12);color:#818cf8;margin-left:auto;">${escHtml(fw.framework)}</span>
      <span class="chevron" aria-hidden="true">›</span>
    </summary>
    <div class="section-body">
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="metric-card">
          <div class="metric-card-label">Framework</div>
          <div style="font-size:1.1rem;font-weight:700;margin-top:6px;">${escHtml(fw.framework)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Detection Confidence</div>
          <div class="metric-card-value" style="font-size:1.8rem;">${conf}<span class="metric-card-unit">%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-card-label">Detection Methods</div>
          <div style="font-size:0.8rem;color:var(--color-text-muted);margin-top:6px;">${escHtml(methods || "—")}</div>
        </div>
      </div>
      ${tips.length ? `
      <div>
        <div style="font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-dim);margin-bottom:10px;">${escHtml(fw.framework)}-specific Optimizations</div>
        ${tips.map(t => `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;font-size:0.85rem;">
          <span style="color:var(--color-accent);flex-shrink:0;margin-top:1px;">→</span>
          <span>${escHtml(t)}</span>
        </div>`).join("")}
      </div>` : ""}
    </div>
  </details>
</section>`;
}
