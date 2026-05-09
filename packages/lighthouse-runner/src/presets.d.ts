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
import type { AuditPreset, LighthouseCategory, LighthouseConfig } from "./types.js";
/**
 * Base Chrome flags used across all presets.
 * These improve stability in headless/CI environments.
 */
export declare const BASE_CHROME_FLAGS: string[];
/**
 * Desktop preset.
 * Full 1440×900 viewport, no throttle, desktop form factor.
 * Closest to a real developer/power-user experience.
 */
export declare const DESKTOP_CONFIG: LighthouseConfig;
/**
 * Mobile preset.
 * 390×844 viewport, simulated 4G + 4× CPU slowdown — mirrors Lighthouse's own defaults.
 * Use this to match PageSpeed Insights results.
 */
export declare const MOBILE_CONFIG: LighthouseConfig;
/**
 * CI preset.
 * Uses devtools throttle instead of simulated — faster & more deterministic in CI pipelines.
 * Same mobile dimensions as the mobile preset.
 */
export declare const CI_CONFIG: LighthouseConfig;
/** Map from preset name to its Lighthouse config */
export declare const PRESET_CONFIGS: Record<AuditPreset, LighthouseConfig>;
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
export declare function buildLighthouseConfig(preset: AuditPreset, categories: LighthouseCategory[], locale: string, overrides?: Partial<LighthouseConfig>): LighthouseConfig;
//# sourceMappingURL=presets.d.ts.map