/**
 * @file runner.ts
 * @description Main orchestrator for the LighthouseRunner.
 *
 * Execution order per route run:
 *   1. Resolve output directories for this run
 *   2. Build the Lighthouse config for the preset + route overrides
 *   3. Assemble Chrome flags (base preset flags + user flags)
 *   4. Launch Chrome via chrome-launcher
 *   5. Run Lighthouse programmatically against the remote debugging port
 *   6. Write JSON and/or HTML reports to disk
 *   7. Kill Chrome
 *   8. Extract scores + Core Web Vitals from the LHR
 *   9. Return LighthouseRouteResult
 *
 * When config.runs > 1, each route is audited N times sequentially.
 * Routes are also processed sequentially (not in parallel) to avoid
 * resource contention skewing CPU/network measurements.
 *
 * A session-summary.json is written at the end containing per-route
 * averaged metrics across all runs.
 */
import type { LighthouseRunnerConfig, LighthouseRunnerResult } from "./types.js";
/**
 * The main LighthouseRunner — accepts a LighthouseRunnerConfig and returns
 * a complete LighthouseRunnerResult with per-route run results and averages.
 *
 * Routes and runs are processed sequentially (not in parallel) to avoid
 * resource contention that would skew performance measurements.
 *
 * @param userConfig - Caller-supplied configuration (partial — defaults are applied)
 * @returns          - Full LighthouseRunnerResult written to /reports/lighthouse
 *
 * @example
 * ```ts
 * import { run } from "@tracelens/lighthouse-runner";
 *
 * const result = await run({
 *   routes: [{ url: "https://example.com" }],
 *   preset: "mobile",
 *   runs: 3,
 *   formats: ["json", "html"],
 * });
 *
 * console.log(result.routes[0].averages.lcp); // e.g. 1240 ms
 * ```
 */
export declare function run(userConfig: LighthouseRunnerConfig): Promise<LighthouseRunnerResult>;
//# sourceMappingURL=runner.d.ts.map