/**
 * @file extractors/framework-detector.ts
 * @description Multi-signal frontend framework detection engine.
 *
 * DETECTION ARCHITECTURE:
 *   PRIMARY (runtime signals — most trustworthy):
 *     1. UserTiming marks in Chrome trace (React, Next.js, Vue, Angular, etc.)
 *     2. Post-FCP large EvaluateScript heuristic (framework initialization signature)
 *     3. Scripting URL patterns in trace events
 *
 *   SECONDARY (confidence booster — corroborating evidence):
 *     4. LHR bootup-time script URL signatures
 *     5. LHR network-requests URL patterns
 *
 * CONFIDENCE MODEL:
 *   - UserTiming mark detected:      +0.60 (very strong — intentional instrumentation)
 *   - Script URL match in trace:      +0.25 (moderate — URL naming is a strong signal)
 *   - LHR bootup script URL match:   +0.20 (secondary corroboration)
 *   - Post-FCP large script heuristic:+0.15 (weak — inferred from behavior)
 *   - Multiple signals agree:         cap at 0.95 (never 100% certain)
 *
 * IMPORTANT:
 *   The engine maintains probabilistic reasoning.
 *   It never claims certainty — only confidence levels.
 */
import type { FrameworkDetectionResult, LighthouseLHRInput, RawTraceEvent, RendererThread } from "../types.js";
/**
 * Detect the frontend framework using multi-signal analysis.
 *
 * @param events     - Pre-filtered Chrome trace events (main thread)
 * @param renderer   - Renderer thread identity
 * @param fcpMs      - First Contentful Paint time (ms) — for post-FCP heuristic
 * @param lhr        - Lighthouse LHR (optional secondary signals)
 * @returns          - FrameworkDetectionResult with confidence scoring
 */
export declare function detectFramework(events: RawTraceEvent[], renderer: RendererThread, fcpMs: number | null, lhr: LighthouseLHRInput | null): FrameworkDetectionResult;
/**
 * LHR-only framework detection (when no Chrome trace is available).
 * Uses bootup-time script URLs as the primary signal.
 */
export declare function detectFrameworkFromLHR(lhr: LighthouseLHRInput): FrameworkDetectionResult;
//# sourceMappingURL=framework-detector.d.ts.map