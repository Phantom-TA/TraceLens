/**
 * @file summarizer.ts
 * @description AI signal builder for bundle analysis.
 *
 * Produces ≤20 concise, actionable, human-readable performance facts
 * from bundle analysis data — optimized for LLM prompt injection.
 */
import type { BundleAnalysisResult } from "./types.js";
export declare function buildBundleAISignals(result: Omit<BundleAnalysisResult, "aiSignals">): string[];
//# sourceMappingURL=summarizer.d.ts.map