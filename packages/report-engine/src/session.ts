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

import { mkdirSync } from "fs";
import { join, resolve } from "path";
import type {
  PipelineConfig,
  PipelineContext,
  PipelineRoute,
  ResolvedPipelineConfig,
  RouteArtifactBundle,
  StageRecord,
} from "./types.js";

// ─── Session ID Generation ─────────────────────────────────────────────────────

/**
 * Generates a unique, human-readable session ID.
 * Example: "trace-session-20260508-123456-ab3f"
 */
export function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = Math.random().toString(16).slice(2, 6);
  return `trace-session-${date}-${time}-${suffix}`;
}

// ─── Config Resolution ─────────────────────────────────────────────────────────

/**
 * Resolves a PipelineConfig by applying defaults.
 * Every field in ResolvedPipelineConfig is guaranteed to be non-null.
 */
export function resolveConfig(config: PipelineConfig): ResolvedPipelineConfig {
  const hasBundleConfig = !!config.bundle?.webpackStatsPath || !!config.bundle?.sourceMapExplorerPath;

  return {
    routes: config.routes.map((r) => ({
      url: r.url,
      label: r.label ?? slugifyUrl(r.url),
    })),
    device: {
      mode: config.device?.mode ?? "desktop",
      throttle: config.device?.throttle ?? "none",
    },
    outputDir: resolve(config.outputDir ?? "./reports"),
    runs: config.runs ?? 1,
    bundle: config.bundle ?? null,
    capturePlaywrightArtifacts: config.capturePlaywrightArtifacts ?? true,
    runLighthouse: config.runLighthouse ?? true,
    runTraceParser: config.runTraceParser ?? true,
    runBundleAnalyzer: config.runBundleAnalyzer ?? hasBundleConfig,
    continueOnFailure: config.continueOnFailure ?? true,
    headless: config.headless ?? true,
  };
}

// ─── Context Creation ──────────────────────────────────────────────────────────

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
export function createPipelineContext(config: PipelineConfig): PipelineContext {
  const resolved = resolveConfig(config);
  const sessionId = generateSessionId();
  const createdAt = new Date().toISOString();
  const sessionDir = join(resolved.outputDir, "sessions", sessionId);

  // Initialize all route artifact bundles
  const routeArtifacts = new Map<string, RouteArtifactBundle>();

  for (const route of resolved.routes) {
    const routeDir = join(sessionDir, route.label);
    routeArtifacts.set(route.url, createEmptyRouteArtifactBundle(route.url, route.label, routeDir));
  }

  // Create the directory tree
  createSessionDirectories(sessionDir, [...routeArtifacts.values()]);

  return {
    sessionId,
    createdAt,
    config: resolved,
    sessionDir,
    stages: createInitialStages(),
    routeArtifacts,
  };
}

// ─── Stage Helpers ─────────────────────────────────────────────────────────────

export function createInitialStages(): import("./types.js").PipelineStages {
  const pending: StageRecord = {
    status: "pending",
    startedAt: null,
    completedAt: null,
    durationMs: null,
    error: null,
  };
  return {
    playwright: { ...pending },
    lighthouse: { ...pending },
    traceParser: { ...pending },
    bundleAnalyzer: { ...pending },
    aggregation: { ...pending },
  };
}

export function markStageStart(stage: StageRecord): void {
  stage.status = "running";
  stage.startedAt = new Date().toISOString();
}

export function markStageDone(stage: StageRecord, _durationMs?: number): void {
  stage.status = "done";
  stage.completedAt = new Date().toISOString();
  if (stage.startedAt) {
    stage.durationMs = new Date(stage.completedAt).getTime() - new Date(stage.startedAt).getTime();
  }
}

export function markStageSkipped(stage: StageRecord, _reason?: string): void {
  stage.status = "skipped";
  stage.startedAt = new Date().toISOString();
  stage.completedAt = stage.startedAt;
  stage.durationMs = 0;
}

export function markStageFailed(stage: StageRecord, error: unknown, _fatal?: boolean): void {
  stage.status = "failed";
  stage.completedAt = new Date().toISOString();
  stage.error = error instanceof Error ? error.message : String(error);
  if (stage.startedAt) {
    stage.durationMs = new Date(stage.completedAt).getTime() - new Date(stage.startedAt).getTime();
  }
}

// ─── Private Helpers ───────────────────────────────────────────────────────────

function createEmptyRouteArtifactBundle(
  url: string,
  label: string,
  routeDir: string
): RouteArtifactBundle {
  return {
    url,
    label,
    routeDir,
    playwright: {
      screenshotPath: null,
      tracePath: null,
      harPath: null,
      timings: null,
    },
    lighthouse: {
      jsonPath: null,
      htmlPath: null,
      vitals: null,
      performanceScore: null,
    },
    traceParser: {
      outputPath: null,
      result: null,
    },
    bundleAnalyzer: {
      outputPath: null,
      result: null,
    },
  };
}

function createSessionDirectories(
  sessionDir: string,
  routes: RouteArtifactBundle[]
): void {
  mkdirSync(sessionDir, { recursive: true });
  for (const route of routes) {
    mkdirSync(join(route.routeDir, "artifacts"), { recursive: true });
    mkdirSync(join(route.routeDir, "lighthouse"), { recursive: true });
    mkdirSync(join(route.routeDir, "intelligence"), { recursive: true });
  }
}

/**
 * Converts a URL to a safe, descriptive directory name.
 * "https://example.com/dashboard?v=1" → "example.com--dashboard"
 */
export function slugifyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname
      .replace(/\//g, "--")
      .replace(/^--/, "")
      .replace(/--$/, "");
    return path ? `${host}--${path}` : host;
  } catch {
    return url.replace(/[^a-zA-Z0-9.-]/g, "-").slice(0, 64);
  }
}
