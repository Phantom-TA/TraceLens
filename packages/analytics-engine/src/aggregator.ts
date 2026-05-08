/**
 * @file aggregator.ts
 * @description Main analytics aggregator — orchestrates all normalization,
 * correlation, deduplication, and quick win stages into one canonical output.
 *
 * EXECUTION ORDER:
 *   1. Normalize Core Web Vitals (consistent units + ratings)
 *   2. Normalize main thread / scripting / rendering signals
 *   3. Normalize bundle intelligence
 *   4. Run cross-system correlation → PerformanceRisks
 *   5. Resolve primary bottleneck
 *   6. Generate quick wins
 *   7. Deduplicate + rank AI signals from all sources
 *   8. Assess data quality
 *   9. Assemble canonical TraceLensIntelligenceReport
 */

import type { AggregatorInput, TraceLensIntelligenceReport } from "./types.js";
import {
  normalizeCoreWebVitals,
  normalizeMainThread,
  normalizeScriptingBottlenecks,
  normalizeRenderBlockingResources,
  normalizeLCPCandidate,
  normalizeHydration,
} from "./normalizer.js";
import {
  correlatePerformanceRisks,
  resolvePrimaryBottleneck,
  normalizeBundle,
} from "./correlator.js";
import { deduplicateAndRankSignals, assessDataQuality } from "./deduplicator.js";
import { generateQuickWins } from "./quick-wins.js";

const ENGINE_VERSION = "2.0.0";

/**
 * Aggregate all pipeline intelligence into one canonical normalized report.
 *
 * @param input - The pipeline result for a single route
 * @returns     - The canonical TraceLensIntelligenceReport
 */
export function aggregate(input: AggregatorInput): TraceLensIntelligenceReport {
  const startMs = Date.now();

  const { route, sessionId, startedAt, durationMs, config } = input;
  const { bottlenecks, bundle, vitals } = route;

  // ── Stage 1: Normalize Core Web Vitals ────────────────────────────────────
  const coreWebVitals = normalizeCoreWebVitals(vitals);

  // ── Stage 2: Normalize main thread / scripting / rendering ───────────────
  const mainThread = normalizeMainThread(bottlenecks);
  const scriptingBottlenecks = normalizeScriptingBottlenecks(bottlenecks);
  const renderBlockingResources = normalizeRenderBlockingResources(bottlenecks);
  const lcpCandidate = normalizeLCPCandidate(bottlenecks);
  const hydration = normalizeHydration(bottlenecks);

  // ── Stage 3: Normalize bundle intelligence ────────────────────────────────
  const normalizedBundle = normalizeBundle(bundle);

  // ── Stage 4: Cross-system correlation ────────────────────────────────────
  const performanceRisks = correlatePerformanceRisks({
    vitals,
    bottlenecks,
    bundle,
  });

  // ── Stage 5: Resolve primary bottleneck ───────────────────────────────────
  const primaryBottleneck = resolvePrimaryBottleneck(bottlenecks, bundle, performanceRisks);

  // ── Stage 6: Generate quick wins ──────────────────────────────────────────
  const quickWins = generateQuickWins(bottlenecks, bundle, vitals, bottlenecks?.frameworkDetection);

  // ── Stage 7: Deduplicate + rank AI signals ────────────────────────────────
  // Inject correlation-derived signals first (highest priority)
  const correlationSignals = performanceRisks.slice(0, 5).map(
    (r) => `[${r.severity.toUpperCase()}] ${r.label}: ${r.impact}. Fix: ${r.recommendation}`
  );
  const aiSignals = deduplicateAndRankSignals(
    correlationSignals,
    bottlenecks?.aiSignals,
    bundle?.aiSignals
  );

  // ── Stage 8: Data quality ─────────────────────────────────────────────────
  const dataQuality = assessDataQuality({
    hasLighthouse: vitals.lcp !== null || vitals.fcp !== null,
    hasTraceParser: bottlenecks !== null,
    hasBundleAnalysis: bundle !== null,
    hasPlaywright: true, // always true if pipeline ran
  });

  // ── Stage 9: Assemble report ──────────────────────────────────────────────
  const aggregationMs = Date.now() - startMs;

  const report: TraceLensIntelligenceReport = {
    meta: {
      generatedAt: new Date().toISOString(),
      aggregationMs,
      engineVersion: ENGINE_VERSION,
    },
    session: {
      sessionId,
      url: route.url,
      label: route.label,
      device: config.device.mode,
      throttle: config.device.throttle,
      runs: config.runs,
      pipelineDurationMs: durationMs,
    },
    coreWebVitals,
    mainThread,
    scriptingBottlenecks,
    renderBlockingResources,
    lcpCandidate,
    hydration,
    framework: bottlenecks?.frameworkDetection ?? null,
    bundle: normalizedBundle,
    performanceRisks,
    primaryBottleneck,
    quickWins,
    aiSignals,
    dataQuality,
    stabilityMetrics: null,
  };

  return report;
}
