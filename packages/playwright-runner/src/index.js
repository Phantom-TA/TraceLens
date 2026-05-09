/**
 * @file index.ts
 * @description Public API surface for @tracelens/playwright-runner.
 *
 * Only exports that are intentionally part of the module's contract are
 * listed here. Internal helpers (browser.ts, output-manager.ts, etc.)
 * are NOT re-exported — they are implementation details.
 *
 * Consumers should import exclusively from "@tracelens/playwright-runner".
 */
// ─── Primary Entry Point ───────────────────────────────────────────────────────
export { run } from "./runner.js";
// ─── Utilities (Re-exported for CLI and API use) ───────────────────────────────
export { DEVICE_PROFILES, THROTTLE_CONDITIONS, resolveConfig, resolveDeviceProfile } from "./config.js";
export { slugifyRoute } from "./output-manager.js";
export { captureElementScreenshot, captureScreenshot } from "./screenshot.js";
export { isTracingEnabled } from "./trace-capture.js";
export { extractNavigationTimings, waitForPageStability } from "./timings.js";
//# sourceMappingURL=index.js.map