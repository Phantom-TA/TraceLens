/**
 * @file analyzers/performance.ts
 * @description Performance signal generation and hydration risk assessment.
 *
 * Converts raw bundle metrics into structured performance flags that
 * the AI engine can reason about without needing to understand webpack internals.
 *
 * JS PARSE TIME HEURISTIC:
 *   Modern Chrome parses JS at roughly 1MB/s on a mid-range device.
 *   So 1KB ≈ 1ms parse time (conservative estimate).
 *   This is a rough heuristic — real parse time depends on code complexity.
 */

import type {
  BundleDependency,
  BundlePerformanceSignals,
  DuplicatePackage,
  HydrationRisk,
  RouteChunk,
} from "../types.js";

// ─── Thresholds ────────────────────────────────────────────────────────────────

const LARGE_INITIAL_JS_KB = 200;      // Initial JS > 200KB is concerning
const VERY_LARGE_INITIAL_JS_KB = 500; // Initial JS > 500KB is bad
const OVERSIZED_ROUTE_KB = 500;       // Any route chunk > 500KB is oversized
const SIGNIFICANT_DUPLICATION_KB = 50; // >50KB wasted on duplicates
const JS_PARSE_MS_PER_KB = 1;         // ~1ms per KB (mid-range device heuristic)

// Dependencies that block hydration even when async-loaded (imported at top level)
const HYDRATION_HEAVY_PACKAGES = [
  "moment", "chart.js", "d3", "highcharts", "echarts", "plotly.js",
  "@mui/material", "antd", "semantic-ui-react",
  "quill", "draft-js", "slate", "video.js",
];

// Packages that should NEVER be in the initial bundle
const SHOULD_NOT_BE_INITIAL = [
  "chart.js", "recharts", "d3", "highcharts", "echarts", "plotly.js", "victory",
  "video.js", "plyr",
  "leaflet", "mapbox-gl", "@googlemaps",
  "quill", "draft-js", "slate", "@tiptap/core",
];

/**
 * Computes performance signals from bundle analysis data.
 */
export function computePerformanceSignals(
  initialSizeKB: number,
  deps: BundleDependency[],
  duplicates: DuplicatePackage[],
  routeChunks: RouteChunk[]
): BundlePerformanceSignals {
  const initialDeps = deps.filter((d) => d.initial);
  const depNames = initialDeps.map((d) => d.name);

  // Large initial JS
  const largeInitialJS = initialSizeKB > LARGE_INITIAL_JS_KB;

  // Hydration risk — large initial bundle = long parse/eval time
  const hydrationRisk = initialSizeKB > LARGE_INITIAL_JS_KB ||
    initialDeps.some((d) => HYDRATION_HEAVY_PACKAGES.some((h) => d.name.startsWith(h)));

  // Third-party analytics/ads in initial bundle
  const thirdPartyInInitialBundle = initialDeps.some(
    (d) => d.category === "analytics" || d.category === "ads"
  );

  // Heavy date library (moment.js specifically — 231KB gzipped)
  const heavyDateLibrary = depNames.some((n) => n === "moment" || n === "moment-timezone");

  // Chart library in initial bundle — should always be lazy
  const chartLibraryInInitial = initialDeps.some((d) => d.category === "chart-library");

  // Unoptimized lodash — full build, not lodash-es
  const unoptimizedLodash = depNames.includes("lodash") && !depNames.includes("lodash-es");

  // Significant duplication
  const totalWastedKB = duplicates.reduce((s, d) => s + d.wastedKB, 0);
  const significantDuplication = totalWastedKB >= SIGNIFICANT_DUPLICATION_KB;

  // Oversized route chunks
  const oversizedRouteChunks = routeChunks.some((r) => r.sizeKB > OVERSIZED_ROUTE_KB);

  // Estimated parse time
  const estimatedParseMs = Math.round(initialSizeKB * JS_PARSE_MS_PER_KB);

  return {
    largeInitialJS,
    hydrationRisk,
    thirdPartyInInitialBundle,
    heavyDateLibrary,
    chartLibraryInInitial,
    unoptimizedLodash,
    significantDuplication,
    oversizedRouteChunks,
    estimatedParseMs,
  };
}

/**
 * Assesses hydration risk from bundle data.
 */
export function assessHydrationRisk(
  initialSizeKB: number,
  deps: BundleDependency[]
): HydrationRisk {
  const initialDeps = deps.filter((d) => d.initial);
  const heavyDeps: string[] = [];
  let hasRenderBlockingDeps = false;

  for (const dep of initialDeps) {
    // Is this a known hydration-heavy package?
    const isHeavy = HYDRATION_HEAVY_PACKAGES.some((h) => dep.name.startsWith(h));
    const shouldBeAsync = SHOULD_NOT_BE_INITIAL.some((h) => dep.name.startsWith(h));

    if (isHeavy) heavyDeps.push(dep.name);
    if (shouldBeAsync && dep.initial) hasRenderBlockingDeps = true;
  }

  // Estimated hydration delay = parse time for initial JS
  // plus execution overhead (rough multiplier of 1.5x for execution)
  const estimatedJsParseMs = Math.round(initialSizeKB * JS_PARSE_MS_PER_KB * 1.5);

  const isHigh = initialSizeKB > VERY_LARGE_INITIAL_JS_KB ||
    heavyDeps.length > 0 ||
    hasRenderBlockingDeps;

  return {
    isHigh,
    estimatedJsParseMs,
    heavyDeps,
    hasRenderBlockingDeps,
  };
}
