/**
 * @file response-parser.ts
 * @description Parse and validate the raw AI response into a typed AIRootCauseReport.
 *
 * Handles:
 *   - JSON parse errors (with partial recovery)
 *   - Schema validation (required fields)
 *   - Clamping values (confidence 0–1, severity values)
 *   - Fallback construction if response is malformed
 */
import type { AIRootCauseReport } from "./types.js";
export declare function parseAIResponse(raw: string, primaryBottleneck: string): {
    report: AIRootCauseReport;
    warnings: string[];
};
//# sourceMappingURL=response-parser.d.ts.map