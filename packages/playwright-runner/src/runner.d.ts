/**
 * @file runner.ts
 * @description Main orchestrator for the PlaywrightRunner.
 *
 * Execution order per route:
 *   1. Init output directories
 *   2. Create isolated browser context (with HAR recording)
 *   3. Start Playwright trace recording
 *   4. Open new page, navigate to URL
 *   5. Wait for page stability
 *   6. Extract navigation timings
 *   7. Capture screenshot
 *   8. Stop trace → save trace.zip
 *   9. Close context (triggers HAR save)
 *  10. Build RouteResult, write to disk
 *
 * When config.runs > 1, each route is audited N times and all
 * results are returned (averaging is handled by analytics-engine).
 */
import type { RunnerConfig, RunnerResult } from "./types.js";
/**
 * The main PlaywrightRunner — accepts a RunnerConfig and returns a RunnerResult.
 *
 * Routes are audited sequentially (not in parallel) to avoid resource contention
 * and to prevent traces from interfering with each other's CPU/network measurements.
 *
 * When config.runs > 1, each route is audited N times and all results included.
 *
 * @param userConfig - Caller-supplied configuration (partial — defaults are applied)
 * @returns A complete RunnerResult with all route results and session metadata
 *
 * @example
 * ```ts
 * import { run } from "@tracelens/playwright-runner";
 *
 * const result = await run({
 *   routes: [{ url: "https://example.com" }],
 *   device: "mobile",
 *   runs: 3,
 * });
 *
 * console.log(result.routes[0].timings.lcp);
 * ```
 */
export declare function run(userConfig: RunnerConfig): Promise<RunnerResult>;
//# sourceMappingURL=runner.d.ts.map