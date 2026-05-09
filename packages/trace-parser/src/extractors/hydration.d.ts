/**
 * @file extractors/hydration.ts
 * @description Framework hydration delay detection with confidence scoring.
 *
 * DETECTION STRATEGY:
 *   1. UserTiming marks (highest confidence — intentional instrumentation)
 *   2. LHR bootup-time framework script analysis
 *   3. Post-FCP large EvaluateScript heuristic (inferred)
 *
 * CONFIDENCE MODEL:
 *   user-timing:        0.90 (very high — explicit framework instrumentation)
 *   lhr-bootup:         0.65 (moderate — URL-based inference)
 *   post-fcp-scripting: 0.45 (low — behavioral inference only)
 *   inferred:           0.30 (very low — circumstantial evidence only)
 *
 * IMPORTANT: All detections are probabilistic. Never claim certainty.
 */
import type { HydrationSignal, LighthouseLHRInput, RawTraceEvent, RendererThread } from "../types.js";
export declare function detectHydration(events: RawTraceEvent[], renderer: RendererThread, fcpMs: number | null): HydrationSignal;
export declare function detectHydrationFromLHR(lhr: LighthouseLHRInput, fcpMs: number | null): HydrationSignal;
//# sourceMappingURL=hydration.d.ts.map