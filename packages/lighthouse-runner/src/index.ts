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

// ─── Primary Entry Point ───────────────────────────────────────────────────────

export { run } from "./runner.js";

// ─── Types (Public Contract) ───────────────────────────────────────────────────

export type {
  // Configuration inputs
  AuditPreset,
  FormFactor,
  LighthouseCategory,
  LighthouseConfig,
  LighthouseRoute,
  LighthouseRunnerConfig,
  OutputFormat,
  ScreenEmulation,
  ThrottlingSettings,

  // Output types
  AveragedMetrics,
  CategoryScore,
  CoreWebVitals,
  LighthouseArtifacts,
  LighthouseRouteResult,
  LighthouseRouteSummary,
  LighthouseRunnerResult,

  // Internal (exposed for downstream package use)
  ResolvedLighthouseConfig,
} from "./types.js";

// ─── Utilities (Re-exported for CLI and API use) ───────────────────────────────

export {
  BASE_CHROME_FLAGS,
  PRESET_CONFIGS,
  buildLighthouseConfig,
} from "./presets.js";

export { resolveConfig } from "./config.js";
export { slugifyRoute } from "./output-manager.js";
