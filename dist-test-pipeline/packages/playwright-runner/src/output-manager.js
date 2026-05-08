"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyRoute = slugifyRoute;
exports.ensureDir = ensureDir;
exports.writeJson = writeJson;
exports.resolveSessionDir = resolveSessionDir;
exports.resolveRouteDir = resolveRouteDir;
exports.resolveArtifactPaths = resolveArtifactPaths;
exports.initSessionDir = initSessionDir;
exports.initRouteDir = initRouteDir;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ─── Public API ────────────────────────────────────────────────────────────────
/**
 * Sanitizes a URL or label into a safe directory name.
 * Strips protocol, replaces slashes and special chars with dashes.
 *
 * @example
 * slugifyRoute("https://example.com/dashboard") → "example.com-dashboard"
 */
function slugifyRoute(urlOrLabel) {
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
function ensureDir(dirPath) {
    fs_1.default.mkdirSync(dirPath, { recursive: true });
}
/**
 * Writes a JSON object to disk with pretty formatting.
 *
 * @param filePath - Absolute path to write
 * @param data - Any JSON-serializable object
 */
function writeJson(filePath, data) {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
/**
 * Resolves the session output directory path.
 * Does NOT create it — call ensureDir() separately.
 *
 * @param baseOutputDir - Root reports directory
 * @param sessionId - Unique session identifier
 */
function resolveSessionDir(baseOutputDir, sessionId) {
    return path_1.default.join(baseOutputDir, sessionId);
}
/**
 * Resolves the route-level output directory path.
 * Does NOT create it — call ensureDir() separately.
 *
 * @param sessionDir - The session directory
 * @param routeSlug - Slugified route label
 * @param runIndex - Run index when runs > 1 (omitted for single runs)
 */
function resolveRouteDir(sessionDir, routeSlug, runIndex) {
    const suffix = runIndex !== undefined ? `-run${runIndex + 1}` : "";
    return path_1.default.join(sessionDir, `${routeSlug}${suffix}`);
}
/**
 * Resolves all artifact file paths for a given route directory.
 * These paths are used for both writing artifacts and populating RouteArtifacts.
 *
 * @param routeDir - The route output directory
 * @param screenshotFormat - Image format ("png" | "jpeg")
 */
function resolveArtifactPaths(routeDir, screenshotFormat) {
    return {
        screenshot: path_1.default.join(routeDir, `screenshot.${screenshotFormat}`),
        trace: path_1.default.join(routeDir, "trace.zip"),
        har: path_1.default.join(routeDir, "network.har"),
        session: path_1.default.join(path_1.default.dirname(routeDir), "session.json"),
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
function initSessionDir(baseOutputDir, sessionId) {
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
function initRouteDir(sessionDir, routeSlug, runIndex) {
    const routeDir = resolveRouteDir(sessionDir, routeSlug, runIndex);
    ensureDir(routeDir);
    return routeDir;
}
