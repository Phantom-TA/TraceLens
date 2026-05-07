/**
 * @file config.ts
 * @description Configuration resolver and device profile registry.
 * Merges user-supplied RunnerConfig with all defaults to produce a fully
 * resolved ResolvedRunnerConfig that the runner operates on.
 */

import path from "path";
import type {
  DeviceMode,
  DeviceProfile,
  ResolvedRunnerConfig,
  RunnerConfig,
  ViewportConfig,
} from "./types";

// ─── Device Profile Registry ───────────────────────────────────────────────────

/**
 * Built-in device profiles.
 * These approximate real-world device characteristics for accurate emulation.
 */
export const DEVICE_PROFILES: Record<DeviceMode, DeviceProfile> = {
  desktop: {
    mode: "desktop",
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  },
  mobile: {
    mode: "mobile",
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
  tablet: {
    mode: "tablet",
    viewport: { width: 820, height: 1180 },
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
};

// ─── Network Throttle Conditions ──────────────────────────────────────────────

/**
 * CDP network emulation conditions keyed by ThrottleProfile.
 * Values are passed directly to the Chrome DevTools Protocol.
 */
export const THROTTLE_CONDITIONS = {
  none: null,
  "4g": {
    offline: false,
    downloadThroughput: (4 * 1024 * 1024) / 8, // 4 Mbps
    uploadThroughput: (3 * 1024 * 1024) / 8, // 3 Mbps
    latency: 20, // ms
  },
  "3g": {
    offline: false,
    downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
    uploadThroughput: (750 * 1024) / 8, // 750 Kbps
    latency: 40, // ms
  },
} as const;

// ─── Default Configuration ─────────────────────────────────────────────────────

/** Sensible production defaults applied before user config is merged */
const DEFAULTS = {
  device: "desktop" as DeviceMode,
  throttle: "none" as const,
  headless: true,
  runs: 1,
  navigationTimeout: 30_000,
  waitTimeout: 10_000,
  chromiumArgs: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-extensions"] as string[],
  screenshot: {
    fullPage: true,
    format: "png" as const,
    quality: 90,
  },
  trace: {
    screenshots: true,
    snapshots: true,
    sources: false,
  },
  har: {} as const,
} as const;

// ─── Resolver ──────────────────────────────────────────────────────────────────

/**
 * Resolves a partial RunnerConfig into a complete ResolvedRunnerConfig.
 * Applies defaults for all omitted fields and computes the output directory.
 *
 * @param config - Partial config supplied by the caller
 * @returns Fully resolved config with all fields populated
 * @throws {Error} If routes array is empty
 */
export function resolveConfig(config: RunnerConfig): ResolvedRunnerConfig {
  if (!config.routes || config.routes.length === 0) {
    throw new Error("[playwright-runner] config.routes must contain at least one route.");
  }

  const device = config.device ?? DEFAULTS.device;
  const baseProfile = DEVICE_PROFILES[device];

  // Allow viewport override while preserving other device profile fields
  const viewport: ViewportConfig = config.viewport ?? baseProfile.viewport;

  // Determine output directory: explicit > env > relative to package root
  const outputDir =
    config.outputDir ??
    process.env.TRACELENS_REPORTS_DIR ??
    path.resolve(__dirname, "../../reports");

  // Resolve trace options: false disables tracing, otherwise merge with defaults
  const trace =
    config.trace === false
      ? false
      : {
          ...DEFAULTS.trace,
          ...(typeof config.trace === "object" ? config.trace : {}),
        };

  // Resolve HAR options: false disables HAR, otherwise use provided options
  const har = config.har === false ? false : { ...(config.har ?? DEFAULTS.har) };

  return {
    routes: config.routes,
    device,
    viewport,
    throttle: config.throttle ?? DEFAULTS.throttle,
    outputDir,
    screenshot: {
      ...DEFAULTS.screenshot,
      ...(config.screenshot ?? {}),
    },
    trace,
    har,
    headless: config.headless ?? DEFAULTS.headless,
    runs: config.runs ?? DEFAULTS.runs,
    navigationTimeout: config.navigationTimeout ?? DEFAULTS.navigationTimeout,
    waitTimeout: config.waitTimeout ?? DEFAULTS.waitTimeout,
    chromiumArgs: config.chromiumArgs ?? DEFAULTS.chromiumArgs,
  };
}

/**
 * Resolves the device profile for a given mode, with optional viewport override.
 *
 * @param mode - The device mode
 * @param viewportOverride - Optional custom viewport dimensions
 * @returns A DeviceProfile with the resolved viewport
 */
export function resolveDeviceProfile(
  mode: DeviceMode,
  viewportOverride?: ViewportConfig
): DeviceProfile {
  const base = DEVICE_PROFILES[mode];
  return viewportOverride ? { ...base, viewport: viewportOverride } : base;
}
