/**
 * @file summarizer.ts
 * @description AI-signal builder.
 *
 * Converts extracted bottleneck data into a concise, human-readable list
 * of performance facts optimized for LLM prompt injection.
 *
 * RULES:
 *   - Max 20 signals
 *   - Each signal is a single sentence
 *   - Most impactful signals listed first
 *   - No redundant data (don't repeat the same issue twice)
 *   - No raw arrays or nested objects in signal strings
 */
import type { BundleSignals, CorrelationInsights, FrameworkDetectionResult, HydrationSignal, LCPCandidate, LongTask, MainThreadSummary, RenderBlockingResource, RenderingTimeline, ScriptingBottleneck } from "./types.js";
/**
 * Builds the aiSignals array from all parsed bottleneck data.
 * Each signal is a concise, factual performance statement.
 */
export declare function buildAISignals(params: {
    vitals: Record<string, number | null>;
    mainThread: MainThreadSummary;
    longTasks: LongTask[];
    lcpCandidate: LCPCandidate | null;
    renderBlockers: RenderBlockingResource[];
    hydration: HydrationSignal;
    scripting: ScriptingBottleneck[];
    rendering: RenderingTimeline;
    bundle: BundleSignals;
    correlations: CorrelationInsights;
    frameworkDetection?: FrameworkDetectionResult;
}): string[];
//# sourceMappingURL=summarizer.d.ts.map