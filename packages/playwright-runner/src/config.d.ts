/**
 * @file config.ts
 * @description Configuration resolver and device profile registry.
 * Merges user-supplied RunnerConfig with all defaults to produce a fully
 * resolved ResolvedRunnerConfig that the runner operates on.
 */
import type { DeviceMode, DeviceProfile, ResolvedRunnerConfig, RunnerConfig, ViewportConfig } from "./types.js";
/**
 * Built-in device profiles.
 * These approximate real-world device characteristics for accurate emulation.
 */
export declare const DEVICE_PROFILES: Record<DeviceMode, DeviceProfile>;
/**
 * CDP network emulation conditions keyed by ThrottleProfile.
 * Values are passed directly to the Chrome DevTools Protocol.
 */
export declare const THROTTLE_CONDITIONS: {
    readonly none: null;
    readonly "4g": {
        readonly offline: false;
        readonly downloadThroughput: number;
        readonly uploadThroughput: number;
        readonly latency: 20;
    };
    readonly "3g": {
        readonly offline: false;
        readonly downloadThroughput: number;
        readonly uploadThroughput: number;
        readonly latency: 40;
    };
};
/**
 * Resolves a partial RunnerConfig into a complete ResolvedRunnerConfig.
 * Applies defaults for all omitted fields and computes the output directory.
 *
 * @param config - Partial config supplied by the caller
 * @returns Fully resolved config with all fields populated
 * @throws {Error} If routes array is empty
 */
export declare function resolveConfig(config: RunnerConfig): ResolvedRunnerConfig;
/**
 * Resolves the device profile for a given mode, with optional viewport override.
 *
 * @param mode - The device mode
 * @param viewportOverride - Optional custom viewport dimensions
 * @returns A DeviceProfile with the resolved viewport
 */
export declare function resolveDeviceProfile(mode: DeviceMode, viewportOverride?: ViewportConfig): DeviceProfile;
//# sourceMappingURL=config.d.ts.map