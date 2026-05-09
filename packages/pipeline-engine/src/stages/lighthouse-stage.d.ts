/**
 * @file stages/lighthouse-stage.ts
 * @description Pipeline Stage 2: Lighthouse performance audit.
 *
 * RESPONSIBILITY:
 *   - Run Lighthouse for all configured routes
 *   - Write JSON + HTML reports to the session's lighthouse directory
 *   - Populate ctx.routeArtifacts[url].lighthouse with explicit paths + vitals
 *
 * EXECUTION ORDER:
 *   Lighthouse runs AFTER Playwright, against the SAME URLs.
 *   Both use separate, clean browser instances (no resource contention).
 *   They are NOT racing — strictly sequential within a session.
 *
 * DIRECTORY OVERRIDE:
 *   Lighthouse writes to: <sessionDir>/<routeSlug>/lighthouse/
 *   This is controlled by passing an explicit outputDir per route.
 */
import type { PipelineContext } from "../types.js";
export declare function runLighthouseStage(ctx: PipelineContext): Promise<void>;
//# sourceMappingURL=lighthouse-stage.d.ts.map