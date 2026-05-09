/**
 * @file stages/playwright-stage.ts
 * @description Pipeline Stage 1: Playwright artifact capture.
 *
 * RESPONSIBILITY:
 *   - Launch Playwright for all configured routes
 *   - Capture screenshot, trace.zip, and HAR
 *   - Write artifacts to the session's route artifact directories
 *   - Populate ctx.routeArtifacts[url].playwright with explicit paths
 *
 * EXPLICIT ARTIFACT PASSING:
 *   Artifacts are NOT stored in arbitrary directories.
 *   They are written to: <sessionDir>/<routeSlug>/artifacts/
 *   Paths are stored directly in the PipelineContext.
 *
 * NOTE:
 *   Playwright uses its own internal output-manager which generates
 *   its own session ID. We override its outputDir to point to
 *   our session's artifact directory so all files land in the right place.
 */
import type { PipelineContext } from "../types.js";
export declare function runPlaywrightStage(ctx: PipelineContext): Promise<void>;
//# sourceMappingURL=playwright-stage.d.ts.map