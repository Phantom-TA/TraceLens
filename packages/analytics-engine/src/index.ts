/**
 * @file index.ts
 * @description Public API for @tracelens/analytics-engine.
 */

export { aggregate } from "./aggregator.js";

export type {
  // Input
  AggregatorInput,

  // Output
  TraceLensIntelligenceReport,
  SessionContext,
  AggregationMeta,

  // Core Web Vitals
  NormalizedCoreWebVitals,
  NormalizedVital,

  // Analysis results
  NormalizedMainThread,
  NormalizedLongTask,
  NormalizedScriptingBottleneck,
  NormalizedRenderBlockingResource,
  NormalizedLCPCandidate,
  NormalizedHydration,
  NormalizedBundle,
  NormalizedBundleDep,

  // Intelligence
  PerformanceRisk,
  QuickWin,
  DataQualityReport,

  // Enums
  MetricRating,
  Severity,
  ConfidenceLevel,
  BottleneckType,
} from "./types.js";
