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

export { run } from "./runner";

// ─── Types (Public Contract) ───────────────────────────────────────────────────

export type {
  // Configuration inputs
  DeviceMode,
  HAROptions,
  RouteConfig,
  RunnerConfig,
  ScreenshotOptions,
  ThrottleProfile,
  TraceOptions,
  ViewportConfig,

  // Output types
  NavigationTimings,
  RouteArtifacts,
  RouteResult,
  RunnerResult,

  // Internal (exposed for downstream package use)
  DeviceProfile,
  ResolvedRunnerConfig,
} from "./types";

// ─── Utilities (Re-exported for CLI and API use) ───────────────────────────────

export { DEVICE_PROFILES, THROTTLE_CONDITIONS, resolveConfig, resolveDeviceProfile } from "./config";
export { slugifyRoute } from "./output-manager";
export { captureElementScreenshot, captureScreenshot } from "./screenshot";
export { isTracingEnabled } from "./trace-capture";
export { extractNavigationTimings, waitForPageStability } from "./timings";
