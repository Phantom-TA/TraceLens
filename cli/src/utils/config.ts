/**
 * @file utils/config.ts
 * @description Configuration loading and validation for the TraceLens CLI.
 *
 * Handles:
 *   - Reading .tracelensrc.json from cwd or traversing up
 *   - Merging CLI flags over config file values
 *   - Validating required fields
 *   - Generating a default config
 */

import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import type { TraceLensConfig } from "../types/index.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CONFIG_FILENAME = ".tracelensrc.json";

export const DEFAULT_CONFIG: TraceLensConfig = {
  routes: ["/"],
  device: "desktop",
  throttle: "none",
  runs: 1,
  ai: true,
  outputDir: "./reports",
};

// ─── Config Loader ────────────────────────────────────────────────────────────

/**
 * Load .tracelensrc.json from the current working directory.
 * Returns null if the file does not exist (not an error — audit can still run
 * via CLI flags alone).
 */
export function loadConfig(cwd = process.cwd()): TraceLensConfig | null {
  const configPath = join(cwd, CONFIG_FILENAME);
  if (!existsSync(configPath)) return null;

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TraceLensConfig>;
    return mergeWithDefaults(parsed);
  } catch (err) {
    throw new Error(
      `Failed to parse ${CONFIG_FILENAME}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Merge a partial config with default values.
 */
export function mergeWithDefaults(partial: Partial<TraceLensConfig>): TraceLensConfig {
  return {
    routes: partial.routes ?? DEFAULT_CONFIG.routes,
    device: partial.device ?? DEFAULT_CONFIG.device,
    throttle: partial.throttle ?? DEFAULT_CONFIG.throttle,
    runs: typeof partial.runs === "number" ? partial.runs : DEFAULT_CONFIG.runs,
    ai: typeof partial.ai === "boolean" ? partial.ai : DEFAULT_CONFIG.ai,
    outputDir: partial.outputDir ?? DEFAULT_CONFIG.outputDir,
    bundle: partial.bundle,
  };
}

// ─── Config Validation ────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfig(config: TraceLensConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.routes || config.routes.length === 0) {
    errors.push("\"routes\" must contain at least one URL or path");
  }

  if (!["desktop", "mobile"].includes(config.device)) {
    errors.push(`"device" must be "desktop" or "mobile", got: "${config.device}"`);
  }

  if (!["none", "4g", "3g"].includes(config.throttle)) {
    errors.push(`"throttle" must be "none", "4g", or "3g", got: "${config.throttle}"`);
  }

  if (typeof config.runs !== "number" || config.runs < 1 || config.runs > 10) {
    errors.push("\"runs\" must be a number between 1 and 10");
  }

  if (config.runs > 3) {
    warnings.push(`runs=${config.runs} will be slow — consider runs ≤ 3 for development`);
  }

  if (config.ai) {
    const hasKey = process.env.GEMINI_API_KEY
      || process.env.OPENAI_API_KEY
      || process.env.ANTHROPIC_API_KEY
      || process.env.OPENROUTER_API_KEY;
    if (!hasKey) {
      warnings.push("AI is enabled but no API key found in environment — set GEMINI_API_KEY or OPENAI_API_KEY");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── URL Normalization ────────────────────────────────────────────────────────

/**
 * Resolve a route string to a full URL.
 * If the route is a path (starts with /), prepend the base URL.
 */
export function resolveRouteUrl(route: string, baseUrl?: string): string {
  if (route.startsWith("http://") || route.startsWith("https://")) {
    return route;
  }
  if (baseUrl) {
    return new URL(route, baseUrl).toString();
  }
  throw new Error(
    `Route "${route}" is a path but no base URL was provided. ` +
    `Use a full URL (https://example.com) or provide a base URL in your config.`
  );
}

/**
 * Resolve all config routes to full URLs, given an optional override URL.
 */
export function resolveAllRoutes(
  config: TraceLensConfig,
  urlOverride?: string
): string[] {
  if (urlOverride) {
    return [resolveRouteUrl(urlOverride)];
  }
  return config.routes.map((r) => resolveRouteUrl(r, undefined));
}

// ─── Config File Path ─────────────────────────────────────────────────────────

export function getConfigPath(cwd = process.cwd()): string {
  return resolve(cwd, CONFIG_FILENAME);
}
