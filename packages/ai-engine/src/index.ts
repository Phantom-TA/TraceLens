/**
 * @file index.ts
 * @description Public API for @tracelens/ai-engine.
 */

export { analyzeWithAI } from "./engine.js";
export { resolveAIConfig } from "./config.js";

export type {
  // Input
  AIEngineConfig,
  AIProviderConfig,
  AIProviderName,

  // Output
  AIEngineResult,
  AIEngineStatus,
  AIRootCauseReport,
  AIRootCause,
  AIRecommendation,
  AIEstimatedImpact,
  AIConfidenceReport,

  // Provider
  AIProvider,
  AICompletion,

  // Observability
  AIEngineObservability,
} from "./types.js";
