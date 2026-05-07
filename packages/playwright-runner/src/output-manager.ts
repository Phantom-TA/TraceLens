/**
 * @file output-manager.ts
 * @description Manages the file-system output structure for runner artifacts.
 *
 * Directory layout per session:
 *   <outputDir>/
 *   └── <sessionId>/
 *       ├── session.json              ← full RunnerResult written at end
 *       └── <route-label>/
 *           ├── screenshot.png
 *           ├── trace.zip
 *           └── network.har
 */

import fs from "fs";
import path from "path";

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Sanitizes a URL or label into a safe directory name.
 * Strips protocol, replaces slashes and special chars with dashes.
 *
 * @example
 * slugifyRoute("https://example.com/dashboard") → "example.com-dashboard"
 */
export function slugifyRoute(urlOrLabel: string): string {
  return urlOrLabel
    .replace(/^https?:\/\//, "")
    .replace(/[/?#&=:]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase()
    .slice(0, 80); // cap length for filesystem safety
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 * Idempotent — safe to call multiple times.
 *
 * @param dirPath - Absolute path to the directory
 */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Writes a JSON object to disk with pretty formatting.
 *
 * @param filePath - Absolute path to write
 * @param data - Any JSON-serializable object
 */
export function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Resolves the session output directory path.
 * Does NOT create it — call ensureDir() separately.
 *
 * @param baseOutputDir - Root reports directory
 * @param sessionId - Unique session identifier
 */
export function resolveSessionDir(baseOutputDir: string, sessionId: string): string {
  return path.join(baseOutputDir, sessionId);
}

/**
 * Resolves the route-level output directory path.
 * Does NOT create it — call ensureDir() separately.
 *
 * @param sessionDir - The session directory
 * @param routeSlug - Slugified route label
 * @param runIndex - Run index when runs > 1 (omitted for single runs)
 */
export function resolveRouteDir(
  sessionDir: string,
  routeSlug: string,
  runIndex?: number
): string {
  const suffix = runIndex !== undefined ? `-run${runIndex + 1}` : "";
  return path.join(sessionDir, `${routeSlug}${suffix}`);
}

/**
 * Resolves all artifact file paths for a given route directory.
 * These paths are used for both writing artifacts and populating RouteArtifacts.
 *
 * @param routeDir - The route output directory
 * @param screenshotFormat - Image format ("png" | "jpeg")
 */
export function resolveArtifactPaths(
  routeDir: string,
  screenshotFormat: "png" | "jpeg"
): {
  screenshot: string;
  trace: string;
  har: string;
  session: string;
} {
  return {
    screenshot: path.join(routeDir, `screenshot.${screenshotFormat}`),
    trace: path.join(routeDir, "trace.zip"),
    har: path.join(routeDir, "network.har"),
    session: path.join(path.dirname(routeDir), "session.json"),
  };
}

/**
 * Initializes a session directory and returns its path.
 * Creates the directory synchronously so it's ready before any page runs.
 *
 * @param baseOutputDir - Root reports directory
 * @param sessionId - Unique session identifier
 * @returns Absolute path to the created session directory
 */
export function initSessionDir(baseOutputDir: string, sessionId: string): string {
  const sessionDir = resolveSessionDir(baseOutputDir, sessionId);
  ensureDir(sessionDir);
  return sessionDir;
}

/**
 * Initializes a route output directory and returns its path.
 *
 * @param sessionDir - Parent session directory
 * @param routeSlug - Slugified route label
 * @param runIndex - Optional run index for multi-run sessions
 * @returns Absolute path to the created route directory
 */
export function initRouteDir(
  sessionDir: string,
  routeSlug: string,
  runIndex?: number
): string {
  const routeDir = resolveRouteDir(sessionDir, routeSlug, runIndex);
  ensureDir(routeDir);
  return routeDir;
}
