"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForPageStability = exports.extractNavigationTimings = exports.isTracingEnabled = exports.captureScreenshot = exports.captureElementScreenshot = exports.slugifyRoute = exports.resolveDeviceProfile = exports.resolveConfig = exports.THROTTLE_CONDITIONS = exports.DEVICE_PROFILES = exports.run = void 0;
// ─── Primary Entry Point ───────────────────────────────────────────────────────
var runner_1 = require("./runner");
Object.defineProperty(exports, "run", { enumerable: true, get: function () { return runner_1.run; } });
// ─── Utilities (Re-exported for CLI and API use) ───────────────────────────────
var config_1 = require("./config");
Object.defineProperty(exports, "DEVICE_PROFILES", { enumerable: true, get: function () { return config_1.DEVICE_PROFILES; } });
Object.defineProperty(exports, "THROTTLE_CONDITIONS", { enumerable: true, get: function () { return config_1.THROTTLE_CONDITIONS; } });
Object.defineProperty(exports, "resolveConfig", { enumerable: true, get: function () { return config_1.resolveConfig; } });
Object.defineProperty(exports, "resolveDeviceProfile", { enumerable: true, get: function () { return config_1.resolveDeviceProfile; } });
var output_manager_1 = require("./output-manager");
Object.defineProperty(exports, "slugifyRoute", { enumerable: true, get: function () { return output_manager_1.slugifyRoute; } });
var screenshot_1 = require("./screenshot");
Object.defineProperty(exports, "captureElementScreenshot", { enumerable: true, get: function () { return screenshot_1.captureElementScreenshot; } });
Object.defineProperty(exports, "captureScreenshot", { enumerable: true, get: function () { return screenshot_1.captureScreenshot; } });
var trace_capture_1 = require("./trace-capture");
Object.defineProperty(exports, "isTracingEnabled", { enumerable: true, get: function () { return trace_capture_1.isTracingEnabled; } });
var timings_1 = require("./timings");
Object.defineProperty(exports, "extractNavigationTimings", { enumerable: true, get: function () { return timings_1.extractNavigationTimings; } });
Object.defineProperty(exports, "waitForPageStability", { enumerable: true, get: function () { return timings_1.waitForPageStability; } });
