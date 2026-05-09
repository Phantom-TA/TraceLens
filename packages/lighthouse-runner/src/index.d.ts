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
export { run } from "./runner.js";
export type { AuditPreset, FormFactor, LighthouseCategory, LighthouseConfig, LighthouseRoute, LighthouseRunnerConfig, OutputFormat, ScreenEmulation, ThrottlingSettings, AveragedMetrics, CategoryScore, CoreWebVitals, LighthouseArtifacts, LighthouseRouteResult, LighthouseRouteSummary, LighthouseRunnerResult, ResolvedLighthouseConfig, } from "./types.js";
export { BASE_CHROME_FLAGS, PRESET_CONFIGS, buildLighthouseConfig, } from "./presets.js";
export { resolveConfig } from "./config.js";
export { slugifyRoute } from "./output-manager.js";
//# sourceMappingURL=index.d.ts.map