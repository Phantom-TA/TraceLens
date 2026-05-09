/**
 * @file types.ts
 * @description All TypeScript types for @tracelens/analytics-engine.
 *
 * This defines the canonical TraceLens Intelligence Report —
 * the single normalized output consumed by the AI engine, dashboard, and CI/CD.
 *
 * DESIGN PRINCIPLES:
 *   - All time values are in MILLISECONDS
 *   - All size values are in KILOBYTES
 *   - All scores are 0–100 integers (not 0–1 floats)
 *   - All rating strings use the standard: "good" | "needs-improvement" | "poor" | "unknown"
 *   - Output is deterministic and stable (safe for snapshot/regression testing)
 */
export {};
//# sourceMappingURL=types.js.map