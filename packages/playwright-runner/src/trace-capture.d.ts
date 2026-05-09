/**
 * @file trace-capture.ts
 * @description Playwright trace lifecycle management.
 *
 * Wraps Playwright's built-in tracing API to start, stop, and save
 * .zip trace artifacts that can be viewed in trace.playwright.dev.
 *
 * The Playwright trace contains:
 * - Network requests/responses
 * - Page screenshots at each step
 * - DOM snapshots before/after actions
 * - Console logs and errors
 * - Performance timing data
 */
import { BrowserContext } from "playwright";
import type { ResolvedRunnerConfig } from "./types.js";
export interface TraceCaptureOptions {
    /** Whether to include screenshots in the trace */
    screenshots: boolean;
    /** Whether to include network snapshots */
    snapshots: boolean;
    /** Whether to include source files */
    sources: boolean;
}
export interface TraceCaptureResult {
    /** Absolute path where the trace.zip was saved */
    tracePath: string;
    /** Whether the trace was saved successfully */
    success: boolean;
    /** Error message if saving failed */
    error?: string;
}
/**
 * Starts trace recording on the given browser context.
 * Must be called before page navigation begins for complete trace coverage.
 *
 * @param context - The browser context to start tracing on
 * @param config - Resolved runner configuration
 * @returns void — trace is attached to the context until stopTrace() is called
 * @throws If Playwright tracing.start() fails
 */
export declare function startTrace(context: BrowserContext, config: ResolvedRunnerConfig): Promise<void>;
/**
 * Stops trace recording and saves the .zip artifact to disk.
 * Safe to call even if startTrace() was skipped (config.trace === false).
 *
 * @param context - The browser context with an active trace
 * @param tracePath - Absolute path where the trace.zip should be saved
 * @param config - Resolved runner configuration
 * @returns TraceCaptureResult with success status and path
 */
export declare function stopTrace(context: BrowserContext, tracePath: string, config: ResolvedRunnerConfig): Promise<TraceCaptureResult>;
/**
 * Checks whether tracing is enabled in the given config.
 *
 * @param config - Resolved runner configuration
 */
export declare function isTracingEnabled(config: ResolvedRunnerConfig): boolean;
//# sourceMappingURL=trace-capture.d.ts.map