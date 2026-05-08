/**
 * @file index.ts
 * @description Public API for @tracelens/bundle-analyzer.
 */

export { analyze } from "./parser.js";

export type {
  // Input
  BundleAnalysisInput,
  WebpackStatsInput,
  SourceMapExplorerInput,

  // Signals
  BundleDependency,
  DependencyCategory,
  DuplicatePackage,
  DuplicateInstance,
  RouteChunk,
  InitialBundleComposition,
  HydrationRisk,
  BundlePerformanceSignals,
  BundleCorrelationInsights,
  BundleIssueCategory,

  // Output
  BundleAnalysisResult,
} from "./types.js";
