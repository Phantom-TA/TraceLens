/**
 * @file utils/paths.ts
 * @description Canonical path resolution utilities for CLI output management.
 */

import { join, resolve, basename } from "path";
import { mkdirSync, existsSync } from "fs";

// ─── Output Dirs ──────────────────────────────────────────────────────────────

export function ensureDir(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveOutputDir(outputDir: string): string {
  return resolve(process.cwd(), outputDir);
}

export function getSessionDir(outputDir: string, sessionId: string): string {
  return join(resolveOutputDir(outputDir), "sessions", sessionId);
}

export function getReportsDir(outputDir: string): string {
  return join(resolveOutputDir(outputDir));
}

// ─── Report Paths ─────────────────────────────────────────────────────────────

export function getResultJsonPath(sessionDir: string): string {
  return join(sessionDir, "tracelens-result.json");
}

export function getAIReportPath(outputDir: string, sessionId: string): string {
  return join(resolveOutputDir(outputDir), "intelligence", `ai-report-${sessionId}.json`);
}

export function getAIMarkdownPath(outputDir: string, sessionId: string): string {
  return join(resolveOutputDir(outputDir), "intelligence", `ai-report-${sessionId}.md`);
}

// ─── Config ───────────────────────────────────────────────────────────────────

export function findReportFile(path: string): string {
  const resolved = resolve(process.cwd(), path);
  if (!existsSync(resolved)) {
    throw new Error(`Report file not found: ${resolved}`);
  }
  return resolved;
}

export function stripLeadingSlash(s: string): string {
  return s.replace(/^\/+/, "");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
