"use strict";
/**
 * @file index.ts
 * @description Public API surface for @tracelens/lighthouse-runner.
 *
 * Only exports that are intentionally part of the module's contract are
 * listed here. Internal helpers (presets.ts, output-manager.ts, config.ts)
 * are NOT re-exported — they are implementation details.
 *
 * Consumers should import exclusively from "@tracelens/lighthouse-runner".
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyRoute = exports.resolveConfig = exports.buildLighthouseConfig = exports.PRESET_CONFIGS = exports.BASE_CHROME_FLAGS = exports.run = void 0;
// ─── Primary Entry Point ───────────────────────────────────────────────────────
var runner_js_1 = require("./runner.js");
Object.defineProperty(exports, "run", { enumerable: true, get: function () { return runner_js_1.run; } });
// ─── Utilities (Re-exported for CLI and API use) ───────────────────────────────
var presets_js_1 = require("./presets.js");
Object.defineProperty(exports, "BASE_CHROME_FLAGS", { enumerable: true, get: function () { return presets_js_1.BASE_CHROME_FLAGS; } });
Object.defineProperty(exports, "PRESET_CONFIGS", { enumerable: true, get: function () { return presets_js_1.PRESET_CONFIGS; } });
Object.defineProperty(exports, "buildLighthouseConfig", { enumerable: true, get: function () { return presets_js_1.buildLighthouseConfig; } });
var config_js_1 = require("./config.js");
Object.defineProperty(exports, "resolveConfig", { enumerable: true, get: function () { return config_js_1.resolveConfig; } });
var output_manager_js_1 = require("./output-manager.js");
Object.defineProperty(exports, "slugifyRoute", { enumerable: true, get: function () { return output_manager_js_1.slugifyRoute; } });
