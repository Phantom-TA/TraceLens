/**
 * @file types.ts
 * @description All TypeScript types for @tracelens/trace-parser.
 *
 * These types define:
 *   1. Raw input formats (Chrome trace JSON, Lighthouse LHR subset)
 *   2. Intermediate extracted signals per domain
 *   3. The final AI-ready ParsedTraceBottlenecks output
 *
 * DESIGN PRINCIPLE:
 *   All timestamps in the public API are in MILLISECONDS relative to
 *   navigationStart (t=0). Raw µs values from Chrome traces are converted
 *   internally and never surfaced in the output.
 */
export {};
//# sourceMappingURL=types.js.map