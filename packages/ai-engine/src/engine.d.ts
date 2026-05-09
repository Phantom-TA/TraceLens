/**
 * @file engine.ts
 * @description Main AI Root-Cause Analysis Engine orchestrator.
 *
 * EXECUTION FLOW:
 *   1. Resolve AI provider config from env
 *   2. If not configured → return graceful skip result
 *   3. Instantiate the configured provider
 *   4. Build compact prompt from TraceLensIntelligenceReport
 *   5. Call provider → get raw AI completion
 *   6. Parse + validate AI response into AIRootCauseReport
 *   7. Write debug logs if configured
 *   8. Return structured AIEngineResult with observability metadata
 *
 * FALLBACK BEHAVIOR:
 *   If no provider configured  → status: "skipped"
 *   If provider call fails     → status: "failed" (pipeline continues)
 *   If response parsing fails  → status: "success" with fallback report
 */
import type { TraceLensIntelligenceReport } from "../../analytics-engine/src/types.js";
import type { AIEngineConfig, AIEngineResult } from "./types.js";
/**
 * Run the AI Root-Cause Analysis Engine on a TraceLensIntelligenceReport.
 *
 * @param report  - The canonical intelligence report from the analytics engine
 * @param config  - Optional engine configuration overrides
 * @returns       - AIEngineResult (always resolves, never throws)
 */
export declare function analyzeWithAI(report: TraceLensIntelligenceReport, config?: AIEngineConfig): Promise<AIEngineResult>;
//# sourceMappingURL=engine.d.ts.map