/**
 * @file correlator.ts
 * @description Cross-system intelligence correlation engine.
 *
 * This is the INTELLIGENCE core of the analytics engine.
 * It correlates signals across Lighthouse, trace-parser, and bundle-analyzer
 * to identify root causes that no single tool can see alone.
 *
 * CORRELATION RULES:
 *   1. Long tasks + large initial JS → "heavy-javascript" (confirmed)
 *   2. LCP > 2500ms + long task overlapping LCP → "long-tasks blocking LCP"
 *   3. Large initial JS + LCP delay → "oversized bundle causing LCP"
 *   4. Render-blocking resources + FCP > 1800ms → "render-blocking-resources"
 *   5. Hydration detected + JS > 2000ms before FCP → "hydration-delay"
 *   6. Bundle duplicates > 100KB → "duplicate-packages"
 *   7. Analytics/ads in initial bundle → "analytics-in-initial-bundle"
 *   8. No code splitting on routes → "missing-code-splitting"
 *   9. TTFB > 800ms → "slow-server"
 *  10. CLS > 0.1 + LCP image large → "unoptimized-images"
 */

import type {
  BottleneckType,
  NormalizedBundle,
  PerformanceRisk,
  Severity,
} from "./types.js";

import type { ParsedTraceBottlenecks } from "../../trace-parser/src/types.js";
import type { BundleAnalysisResult } from "../../bundle-analyzer/src/types.js";

// ─── Correlation Context ───────────────────────────────────────────────────────

interface CorrelationContext {
  vitals: {
    fcp: number | null;
    lcp: number | null;
    tbt: number | null;
    cls: number | null;
    tti: number | null;
    ttfb: number | null;
  };
  bottlenecks: ParsedTraceBottlenecks | null;
  bundle: BundleAnalysisResult | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function risk(
  type: BottleneckType,
  label: string,
  severity: Severity,
  confidence: number,
  sources: string[],
  impact: string,
  recommendation: string
): PerformanceRisk {
  return { type, label, severity, confidence, sources, impact, recommendation, priority: 0 };
}

// ─── Correlation Rules ─────────────────────────────────────────────────────────

export function correlatePerformanceRisks(ctx: CorrelationContext): PerformanceRisk[] {
  const risks: PerformanceRisk[] = [];
  const { vitals, bottlenecks, bundle } = ctx;
  const b = bottlenecks;

  // ── Rule 1: Heavy JavaScript ───────────────────────────────────────────────
  {
    const sources: string[] = [];
    let confidence = 0;
    const jsMs = b?.bundleSignals.jsBeforeFcpMs ?? 0;

    if (b?.correlations.primaryBottleneck === "heavy-javascript") {
      sources.push("trace-parser");
      confidence += 0.5;
    }
    if (b?.bundleSignals.largeInitialJS) {
      sources.push("trace-parser");
      confidence += 0.2;
    }
    if (bundle?.performanceSignals.largeInitialJS) {
      if (!sources.includes("bundle-analyzer")) sources.push("bundle-analyzer");
      confidence += 0.3;
    }
    if ((vitals.tbt ?? 0) > 300) {
      if (!sources.includes("lighthouse")) sources.push("lighthouse");
      confidence += 0.1;
    }

    if (confidence > 0.3) {
      const severity: Severity = jsMs > 5000 ? "critical" : jsMs > 3000 ? "high" : jsMs > 1500 ? "medium" : "low";
      risks.push(risk(
        "heavy-javascript",
        "Heavy JavaScript Execution",
        severity,
        Math.min(confidence, 0.98),
        sources,
        `${Math.round(jsMs)}ms of JS executed before FCP, blocking rendering`,
        "Split large JS bundles with dynamic imports, defer non-critical scripts, move analytics loading after hydration"
      ));
    }
  }

  // ── Rule 2: Render-blocking Resources ─────────────────────────────────────
  {
    const rbr = b?.renderBlockingResources ?? [];
    if (rbr.length > 0 && b?.correlations.fcpBlockedByResources) {
      const totalBlockingMs = rbr.reduce((s, r) => s + (r.blockingMs ?? 0), 0);
      const severity: Severity = totalBlockingMs > 1000 ? "critical" : totalBlockingMs > 500 ? "high" : "medium";
      risks.push(risk(
        "render-blocking-resources",
        "Render-Blocking Resources",
        severity,
        0.9,
        ["trace-parser", "lighthouse"],
        `${rbr.length} render-blocking resource(s) delaying FCP by ~${Math.round(totalBlockingMs)}ms`,
        "Add defer/async to non-critical scripts, inline critical CSS, preload key resources"
      ));
    }
  }

  // ── Rule 3: Slow Server (TTFB) ─────────────────────────────────────────────
  {
    const ttfb = vitals.ttfb ?? 0;
    if (ttfb > 800) {
      const severity: Severity = ttfb > 2000 ? "critical" : ttfb > 1200 ? "high" : "medium";
      risks.push(risk(
        "slow-server",
        "Slow Server Response (TTFB)",
        severity,
        0.95,
        ["lighthouse"],
        `TTFB is ${ttfb}ms — server took too long to respond`,
        "Use a CDN, enable server-side caching, optimize database queries, use edge functions"
      ));
    }
  }

  // ── Rule 4: Hydration Delay ────────────────────────────────────────────────
  {
    const hydration = b?.hydration;
    const jsBeforeFcp = b?.bundleSignals.jsBeforeFcpMs ?? 0;
    if (hydration?.detected && (hydration.durationMs ?? 0) > 500) {
      const delay = hydration.durationMs ?? 0;
      const severity: Severity = delay > 2000 ? "critical" : delay > 1000 ? "high" : "medium";
      risks.push(risk(
        "hydration-delay",
        "Hydration Delay",
        severity,
        0.85,
        ["trace-parser"],
        `${delay}ms gap from FCP to interactive — framework hydration blocking interaction`,
        "Implement streaming SSR, partial hydration, or islands architecture to reduce hydration time"
      ));
    } else if (!hydration?.detected && jsBeforeFcp > 2000 && b?.bundleSignals.heavyEarlyScripts) {
      // Infer hydration risk from heavy early JS even without direct detection
      risks.push(risk(
        "hydration-delay",
        "Likely Hydration Delay (Inferred)",
        "medium",
        0.6,
        ["trace-parser"],
        `${Math.round(jsBeforeFcp)}ms of JS before FCP suggests heavy framework initialization`,
        "Use React Server Components, Next.js streaming, or lazy hydration strategies"
      ));
    }
  }

  // ── Rule 5: Oversized Bundle (from bundle analyzer) ───────────────────────
  {
    if (bundle && bundle.initialBundleSizeKB > 500) {
      const kb = bundle.initialBundleSizeKB;
      const parseMs = bundle.performanceSignals.estimatedParseMs ?? 0;
      const severity: Severity = kb > 2000 ? "critical" : kb > 1000 ? "high" : kb > 500 ? "medium" : "low";
      risks.push(risk(
        "oversized-bundle",
        "Oversized Initial JavaScript Bundle",
        severity,
        0.95,
        ["bundle-analyzer"],
        `Initial bundle is ${Math.round(kb)}KB — estimated ${parseMs}ms parse time on mid-range device`,
        `Lazy-load heavy dependencies: ${bundle.largestDependencies.slice(0, 3).map((d) => d.name).join(", ")}`
      ));
    }
  }

  // ── Rule 6: Duplicate Packages ────────────────────────────────────────────
  {
    if (bundle && bundle.duplicatePackages.length > 0) {
      const totalWasted = bundle.duplicatePackages.reduce((s, d) => s + d.wastedKB, 0);
      if (totalWasted > 50) {
        const severity: Severity = totalWasted > 300 ? "high" : totalWasted > 100 ? "medium" : "low";
        risks.push(risk(
          "duplicate-packages",
          "Duplicate npm Packages",
          severity,
          0.99,
          ["bundle-analyzer"],
          `${bundle.duplicatePackages.length} duplicate package(s) waste ~${Math.round(totalWasted)}KB`,
          `Run "npm dedupe" or add resolutions to package.json. Worst: ${bundle.duplicatePackages[0]?.name ?? ""}`
        ));
      }
    }
  }

  // ── Rule 7: Analytics in Initial Bundle ───────────────────────────────────
  {
    if (bundle) {
      const analyticsDeps = bundle.largestDependencies.filter(
        (d) => d.initial && (d.category === "analytics" || d.category === "ads")
      );
      if (analyticsDeps.length > 0) {
        const totalKB = analyticsDeps.reduce((s, d) => s + d.sizeKB, 0);
        risks.push(risk(
          "analytics-in-initial-bundle",
          "Analytics/Ads in Initial Bundle",
          "medium",
          0.92,
          ["bundle-analyzer"],
          `${analyticsDeps.map((d) => d.name).join(", ")} (${Math.round(totalKB)}KB) loaded before interactive`,
          "Defer analytics and ads scripts until after hydration using dynamic imports or setTimeout"
        ));
      }
    }
  }

  // ── Rule 8: Missing Code Splitting ────────────────────────────────────────
  {
    if (bundle) {
      const oversizedRoutes = bundle.routeChunks.filter((r) => r.sizeKB > 500);
      if (oversizedRoutes.length > 0) {
        risks.push(risk(
          "missing-code-splitting",
          "Missing Route-Level Code Splitting",
          "medium",
          0.88,
          ["bundle-analyzer"],
          `${oversizedRoutes.length} route chunk(s) exceed 500KB: ${oversizedRoutes.map((r) => r.route).join(", ")}`,
          "Use Next.js dynamic() or React.lazy() + Suspense to split route-specific dependencies"
        ));
      }
    }
  }

  // ── Rule 9: LCP Blocked by Long Task ──────────────────────────────────────
  {
    if (b?.correlations.lcpBlockedByLongTask && (vitals.lcp ?? 0) > 2500) {
      const lcpMs = vitals.lcp ?? 0;
      const severity: Severity = lcpMs > 4000 ? "critical" : lcpMs > 2500 ? "high" : "medium";
      risks.push(risk(
        "long-tasks",
        "Long Tasks Blocking LCP",
        severity,
        0.87,
        ["trace-parser", "lighthouse"],
        `A main-thread long task overlapped with LCP render window (LCP: ${lcpMs}ms)`,
        "Break up long tasks with scheduler.yield(), prioritize LCP resource loading, use web workers for heavy computation"
      ));
    }
  }

  // ── Rule 10: Layout Instability ───────────────────────────────────────────
  {
    const cls = vitals.cls ?? 0;
    if (cls > 0.1) {
      const severity: Severity = cls > 0.5 ? "critical" : cls > 0.25 ? "high" : "medium";
      risks.push(risk(
        "layout-instability",
        "Cumulative Layout Shift",
        severity,
        0.95,
        ["lighthouse"],
        `CLS score is ${cls} — layout shifts degrading user experience`,
        "Reserve space for dynamic content (images, ads, embeds), avoid inserting content above existing DOM"
      ));
    }
  }

  // ── Assign priority ranks (sorted by severity + confidence) ───────────────
  const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  risks.sort((a, b) => {
    const severityDiff = (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0);
    if (severityDiff !== 0) return severityDiff;
    return b.confidence - a.confidence;
  });

  return risks.slice(0, 10).map((r, i) => ({ ...r, priority: i + 1 }));
}

// ─── Primary Bottleneck Resolution ────────────────────────────────────────────

/**
 * Determine the single highest-confidence primary bottleneck.
 * Uses trace-parser's correlation as the primary source,
 * overriding with bundle-analyzer if it provides stronger evidence.
 */
export function resolvePrimaryBottleneck(
  bottlenecks: ParsedTraceBottlenecks | null,
  bundle: BundleAnalysisResult | null,
  risks: PerformanceRisk[]
): BottleneckType {
  // Use the top risk as primary if confidence is high
  if (risks[0]?.confidence >= 0.8) {
    return risks[0].type;
  }

  // Fall back to trace-parser correlation
  const traceBottleneck = bottlenecks?.correlations.primaryBottleneck;
  if (traceBottleneck && traceBottleneck !== "unknown") {
    return traceBottleneck as BottleneckType;
  }

  // Fall back to bundle-analyzer primary issue
  const bundleIssue = bundle?.correlations.primaryIssue;
  if (bundleIssue === "oversized-initial-bundle") return "oversized-bundle";
  if (bundleIssue === "duplicate-packages")        return "duplicate-packages";
  if (bundleIssue === "heavy-third-party")         return "heavy-javascript";
  if (bundleIssue === "poor-code-splitting")       return "missing-code-splitting";
  if (bundleIssue === "oversized-route-chunks")    return "missing-code-splitting";

  return "heavy-javascript";
}

// ─── Bundle Normalization ─────────────────────────────────────────────────────

export function normalizeBundle(bundle: BundleAnalysisResult | null): NormalizedBundle | null {
  if (!bundle) return null;

  return {
    initialBundleKB: bundle.initialBundleSizeKB,
    totalBundleKB: bundle.totalBundleSizeKB,
    estimatedParseMs: bundle.performanceSignals.estimatedParseMs ?? null,
    largestDeps: bundle.largestDependencies.slice(0, 5).map((d) => ({
      name: d.name,
      sizeKB: d.sizeKB,
      initial: d.initial,
      category: d.category ?? null,
      alternative: d.alternative ?? null,
    })),
    duplicates: bundle.duplicatePackages.map((d) => ({
      name: d.name,
      wastedKB: d.wastedKB,
      severity: d.wastedKB > 200 ? "high" as Severity : d.wastedKB > 100 ? "medium" as Severity : "low" as Severity,
    })),
    hydrationRisk: bundle.hydrationRisk.isHigh,
  };
}
