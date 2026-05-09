/**
 * @file config.ts
 * @description Configuration resolver for the lighthouse-runner module.
 * Merges user-supplied LighthouseRunnerConfig with all defaults to produce
 * a fully resolved ResolvedLighthouseConfig that the runner operates on.
 */
import type { LighthouseRunnerConfig, ResolvedLighthouseConfig } from "./types.js";
/**
 * Resolves a partial LighthouseRunnerConfig into a complete ResolvedLighthouseConfig.
 * Applies defaults for all omitted fields and normalises the output directory path.
 *
 * @param config - Partial configuration supplied by the caller
 * @returns Fully resolved configuration with every field populated
 * @throws {Error} If routes array is empty or missing
 * @throws {Error} If formats array is empty
 */
export declare function resolveConfig(config: LighthouseRunnerConfig): ResolvedLighthouseConfig;
//# sourceMappingURL=config.d.ts.map