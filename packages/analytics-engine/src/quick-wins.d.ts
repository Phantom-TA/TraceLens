/**
 * @file quick-wins.ts
 * @description Quick win prioritization engine.
 *
 * Generates actionable, sorted quick wins from all performance risks.
 * Quick wins are ranked by estimated impact (savings in ms).
 *
 * QUICK WIN SOURCES:
 *   1. Render-blocking resources → eliminate blocking CSS/JS
 *   2. Bundle deduplication → run npm dedupe (easy, high-value)
 *   3. Moment.js / lodash replacement → trivial refactor, big win
 *   4. Lazy-loading heavy chart libs → single import() call
 *   5. Deferring analytics → move script tag after DOMContentLoaded
 *   6. Image optimization → add width/height attributes, WebP
 *   7. Code splitting → add dynamic imports per route
 */
import type { BundleAnalysisResult } from "../../bundle-analyzer/src/types.js";
import type { ParsedTraceBottlenecks } from "../../trace-parser/src/types.js";
import type { FrameworkDetectionResult } from "../../trace-parser/src/types.js";
import type { QuickWin } from "./types.js";
export declare function generateQuickWins(bottlenecks: ParsedTraceBottlenecks | null, bundle: BundleAnalysisResult | null, vitals: {
    fcp: number | null;
    tbt: number | null;
    lcp: number | null;
}, frameworkDetection?: FrameworkDetectionResult | null): QuickWin[];
//# sourceMappingURL=quick-wins.d.ts.map