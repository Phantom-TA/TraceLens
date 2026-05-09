/**
 * @file session.ts
 * @description Session lifecycle management.
 *
 * Creates and manages the PipelineContext — the single shared runtime
 * state object that flows through the entire pipeline.
 *
 * SESSION ID FORMAT: "trace-session-YYYYMMDD-HHMMSS-<4hex>"
 * Example: "trace-session-20260508-123456-ab3f"
 *
 * This is deterministic enough to be human-readable in filenames
 * but unique enough to avoid collisions.
 */
import type { PipelineConfig, PipelineContext, ResolvedPipelineConfig, StageRecord } from "./types.js";
/**
 * Generates a unique, human-readable session ID.
 * Example: "trace-session-20260508-123456-ab3f"
 */
export declare function generateSessionId(): string;
/**
 * Resolves a PipelineConfig by applying defaults.
 * Every field in ResolvedPipelineConfig is guaranteed to be non-null.
 */
export declare function resolveConfig(config: PipelineConfig): ResolvedPipelineConfig;
/**
 * Creates and initializes a PipelineContext.
 * Creates the session directory structure on disk.
 *
 * Directory structure created:
 *   <outputDir>/sessions/<sessionId>/
 *     └─ <route-slug>/
 *         ├── artifacts/     (playwright output)
 *         ├── lighthouse/    (lighthouse output)
 *         └── intelligence/  (parser + bundle output)
 */
export declare function createPipelineContext(config: PipelineConfig): PipelineContext;
export declare function createInitialStages(): import("./types.js").PipelineStages;
export declare function markStageStart(stage: StageRecord): void;
export declare function markStageDone(stage: StageRecord, _durationMs?: number): void;
export declare function markStageSkipped(stage: StageRecord, _reason?: string): void;
export declare function markStageFailed(stage: StageRecord, error: unknown, _fatal?: boolean): void;
/**
 * Converts a URL to a safe, descriptive directory name.
 * "https://example.com/dashboard?v=1" → "example.com--dashboard"
 */
export declare function slugifyUrl(url: string): string;
//# sourceMappingURL=session.d.ts.map