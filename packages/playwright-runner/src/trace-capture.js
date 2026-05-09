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
// ─── Trace Lifecycle ───────────────────────────────────────────────────────────
/**
 * Starts trace recording on the given browser context.
 * Must be called before page navigation begins for complete trace coverage.
 *
 * @param context - The browser context to start tracing on
 * @param config - Resolved runner configuration
 * @returns void — trace is attached to the context until stopTrace() is called
 * @throws If Playwright tracing.start() fails
 */
export async function startTrace(context, config) {
    if (config.trace === false)
        return;
    const traceOptions = config.trace;
    await context.tracing.start({
        screenshots: traceOptions.screenshots,
        snapshots: traceOptions.snapshots,
        sources: traceOptions.sources,
        // Title appears in the Playwright trace viewer UI
        title: `TraceLens Audit — ${new Date().toISOString()}`,
    });
}
/**
 * Stops trace recording and saves the .zip artifact to disk.
 * Safe to call even if startTrace() was skipped (config.trace === false).
 *
 * @param context - The browser context with an active trace
 * @param tracePath - Absolute path where the trace.zip should be saved
 * @param config - Resolved runner configuration
 * @returns TraceCaptureResult with success status and path
 */
export async function stopTrace(context, tracePath, config) {
    if (config.trace === false) {
        return { tracePath, success: false, error: "Tracing disabled in config" };
    }
    try {
        await context.tracing.stop({ path: tracePath });
        return { tracePath, success: true };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[playwright-runner] Failed to save trace:", message);
        return { tracePath, success: false, error: message };
    }
}
/**
 * Checks whether tracing is enabled in the given config.
 *
 * @param config - Resolved runner configuration
 */
export function isTracingEnabled(config) {
    return config.trace !== false;
}
//# sourceMappingURL=trace-capture.js.map