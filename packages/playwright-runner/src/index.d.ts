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
export { run } from "./runner.js";
export type { DeviceMode, HAROptions, RouteConfig, RunnerConfig, ScreenshotOptions, ThrottleProfile, TraceOptions, ViewportConfig, NavigationTimings, RouteArtifacts, RouteResult, RunnerResult, DeviceProfile, ResolvedRunnerConfig, } from "./types.js";
export { DEVICE_PROFILES, THROTTLE_CONDITIONS, resolveConfig, resolveDeviceProfile } from "./config.js";
export { slugifyRoute } from "./output-manager.js";
export { captureElementScreenshot, captureScreenshot } from "./screenshot.js";
export { isTracingEnabled } from "./trace-capture.js";
export { extractNavigationTimings, waitForPageStability } from "./timings.js";
//# sourceMappingURL=index.d.ts.map