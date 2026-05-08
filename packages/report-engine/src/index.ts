/**
 * @file index.ts
 * @description Public API for @tracelens/report-engine (Pipeline Engine).
 */

export { runPipeline } from "./pipeline.js";

export type {
  // Input
  PipelineConfig,
  PipelineRoute,
  PipelineDevice,
  BundleConfig,

  // Runtime context (for advanced use)
  PipelineContext,
  RouteArtifactBundle,
  PipelineStages,
  StageRecord,
  StageStatus,

  // Output
  TraceLensResult,
  RouteIntelligenceResult,
  ResolvedPipelineConfig,
} from "./types.js";
