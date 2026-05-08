"use strict";
/**
 * @file presets.ts
 * @description Lighthouse audit preset definitions and config builders.
 *
 * Each preset produces a fully resolved Lighthouse config object that can
 * be passed directly to the `lighthouse()` function.
 *
 * Preset philosophy:
 *   - "desktop"  → 1440px viewport, no throttle, desktop UA
 *   - "mobile"   → 390px viewport, simulated 4G, mobile UA (mirrors Lighthouse defaults)
 *   - "ci"       → Same as mobile but with devtools throttle for faster, more stable runs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESET_CONFIGS = exports.CI_CONFIG = exports.MOBILE_CONFIG = exports.DESKTOP_CONFIG = exports.BASE_CHROME_FLAGS = void 0;
exports.buildLighthouseConfig = buildLighthouseConfig;
// ─── Chrome Flags ──────────────────────────────────────────────────────────────
/**
 * Base Chrome flags used across all presets.
 * These improve stability in headless/CI environments.
 */
exports.BASE_CHROME_FLAGS = [
    "--headless=new",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-default-apps",
    "--mute-audio",
    "--no-first-run",
];
// ─── Preset Configs ────────────────────────────────────────────────────────────
/**
 * Desktop preset.
 * Full 1440×900 viewport, no throttle, desktop form factor.
 * Closest to a real developer/power-user experience.
 */
exports.DESKTOP_CONFIG = {
    extends: "lighthouse:default",
    settings: {
        formFactor: "desktop",
        throttlingMethod: "simulate",
        throttling: {
            rttMs: 40,
            throughputKbps: 10_240,
            cpuSlowdownMultiplier: 1,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0,
        },
        screenEmulation: {
            mobile: false,
            width: 1440,
            height: 900,
            deviceScaleFactor: 1,
            disabled: false,
        },
    },
};
/**
 * Mobile preset.
 * 390×844 viewport, simulated 4G + 4× CPU slowdown — mirrors Lighthouse's own defaults.
 * Use this to match PageSpeed Insights results.
 */
exports.MOBILE_CONFIG = {
    extends: "lighthouse:default",
    settings: {
        formFactor: "mobile",
        throttlingMethod: "simulate",
        throttling: {
            rttMs: 150,
            throughputKbps: 1_638.4,
            cpuSlowdownMultiplier: 4,
            requestLatencyMs: 562.5,
            downloadThroughputKbps: 1_474.56,
            uploadThroughputKbps: 675,
        },
        screenEmulation: {
            mobile: true,
            width: 390,
            height: 844,
            deviceScaleFactor: 3,
            disabled: false,
        },
    },
};
/**
 * CI preset.
 * Uses devtools throttle instead of simulated — faster & more deterministic in CI pipelines.
 * Same mobile dimensions as the mobile preset.
 */
exports.CI_CONFIG = {
    extends: "lighthouse:default",
    settings: {
        formFactor: "mobile",
        throttlingMethod: "devtools",
        throttling: {
            rttMs: 150,
            throughputKbps: 1_638.4,
            cpuSlowdownMultiplier: 4,
            requestLatencyMs: 562.5,
            downloadThroughputKbps: 1_474.56,
            uploadThroughputKbps: 675,
        },
        screenEmulation: {
            mobile: true,
            width: 390,
            height: 844,
            deviceScaleFactor: 3,
            disabled: false,
        },
    },
};
/** Map from preset name to its Lighthouse config */
exports.PRESET_CONFIGS = {
    desktop: exports.DESKTOP_CONFIG,
    mobile: exports.MOBILE_CONFIG,
    ci: exports.CI_CONFIG,
};
// ─── Builder ───────────────────────────────────────────────────────────────────
/**
 * Builds the final Lighthouse config for a given preset, merging in:
 *   1. The preset base config
 *   2. The user-requested categories (onlyCategories)
 *   3. The user-requested locale
 *   4. Any per-route config overrides
 *
 * @param preset        - Named preset to start from
 * @param categories    - Lighthouse categories to include
 * @param locale        - Report locale string
 * @param overrides     - Optional partial config to merge on top
 * @returns             - Complete LighthouseConfig ready for the runner
 */
function buildLighthouseConfig(preset, categories, locale, overrides) {
    const base = exports.PRESET_CONFIGS[preset];
    return {
        ...base,
        ...overrides,
        settings: {
            ...base.settings,
            ...(overrides?.settings ?? {}),
            onlyCategories: categories,
            locale,
        },
    };
}
