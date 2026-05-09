/**
 * @file commands/doctor.ts
 * @description `tracelens doctor` — environment diagnostic command.
 *
 * Validates the local TraceLens environment before audits.
 * NEVER crashes — every check is wrapped in try/catch.
 * Exits 0 if ready to audit, 1 if any blocking checks fail.
 *
 * CHECKS:
 *   1.  Node.js version (>=18)
 *   2.  Playwright installed
 *   3.  Chromium browser available
 *   4.  Lighthouse available
 *   5.  trace-parser package reachable
 *   6.  analytics-engine package reachable
 *   7.  ai-engine package reachable
 *   8.  .env file exists
 *   9.  AI provider key configured
 *   10. .tracelensrc.json validity (if present)
 *   11. Output directory writability
 */

import { Command } from "commander";
import { existsSync, accessSync, constants } from "fs";
import { join, resolve } from "path";
import chalk from "chalk";

import {
  log, jsonOutput, isJsonMode, setJsonMode,
} from "../utils/logger.js";
import { CONFIG_FILENAME, loadConfig, validateConfig } from "../utils/config.js";
import type { DoctorOptions, DiagnosticCheck, DoctorReport, CheckStatus } from "../types/index.js";

// ─── Command Factory ──────────────────────────────────────────────────────────

export function createDoctorCommand(): Command {
  const cmd = new Command("doctor");

  cmd
    .description("Validate the local TraceLens environment before running audits")
    .option("--json", "Output check results as JSON", false)
    .action(async (options: DoctorOptions) => {
      await runDoctor(options);
    });

  return cmd;
}

// ─── Main Doctor Flow ─────────────────────────────────────────────────────────

async function runDoctor(options: DoctorOptions): Promise<void> {
  if (options.json) setJsonMode(true);

  if (!isJsonMode()) {
    console.log();
    console.log(chalk.bold("  TraceLens Doctor — Environment Check"));
    console.log(`  ${chalk.gray("─".repeat(50))}`);
    console.log();
  }

  const checks: DiagnosticCheck[] = await Promise.all([
    checkNodeVersion(),
    checkPlaywright(),
    checkChromium(),
    checkLighthouse(),
    checkPackage("trace-parser", "../../../packages/trace-parser/src/parser.js"),
    checkPackage("analytics-engine", "../../../packages/analytics-engine/src/index.js"),
    checkPackage("ai-engine", "../../../packages/ai-engine/src/index.js"),
    checkDotEnv(),
    checkAIKey(),
    checkConfig(),
    checkOutputDirWritable(),
  ]);

  const passed   = checks.filter((c) => c.status === "pass").length;
  const failed   = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warn").length;
  const readyToAudit = failed === 0;

  const report: DoctorReport = { passed, failed, warnings, checks, readyToAudit };

  if (isJsonMode()) {
    jsonOutput("doctor", readyToAudit, report);
    process.exit(readyToAudit ? 0 : 1);
  }

  // ── Print checks ───────────────────────────────────────────────────────────
  for (const check of checks) {
    const icon = check.status === "pass" ? chalk.green("  ✔")
      : check.status === "fail"         ? chalk.red("  ✖")
      : check.status === "warn"         ? chalk.yellow("  ⚠")
      : chalk.gray("  ·");

    console.log(`${icon}  ${chalk.white(check.name.padEnd(34))} ${styleMessage(check)}`);

    if (check.fix && (check.status === "fail" || check.status === "warn")) {
      console.log(`     ${chalk.gray("→")}  ${chalk.gray(check.fix)}`);
    }
  }

  console.log();
  console.log(`  ${chalk.gray("─".repeat(50))}`);
  console.log();

  // ── Summary ────────────────────────────────────────────────────────────────
  if (readyToAudit) {
    console.log(`  ${chalk.green.bold("✔ Ready to audit!")}  ${chalk.gray(`${passed} passed, ${warnings} warnings`)}`);
    console.log();
    console.log(`  ${chalk.gray("Run:")} ${chalk.cyan("tracelens audit https://yoursite.com")}`);
  } else {
    console.log(
      `  ${chalk.red.bold("✖ Not ready to audit.")}  ` +
      `${chalk.gray(`${passed} passed · ${chalk.red(`${failed} failed`)} · ${warnings} warnings`)}`
    );
    console.log();
    console.log(`  ${chalk.gray("Fix the issues above and re-run")} ${chalk.cyan("tracelens doctor")}`);
  }
  console.log();

  process.exit(readyToAudit ? 0 : 1);
}

// ─── Individual Checks ────────────────────────────────────────────────────────

async function checkNodeVersion(): Promise<DiagnosticCheck> {
  try {
    const version = process.version; // e.g. "v20.5.1"
    const major = parseInt(version.slice(1).split(".")[0] ?? "0", 10);
    if (major >= 20) return pass("Node.js version", `${version} (LTS — excellent)`);
    if (major >= 18) return pass("Node.js version", `${version} (meets minimum requirement)`);
    return fail(
      "Node.js version",
      `${version} (too old — requires Node 18+)`,
      "Install Node.js 20 LTS from https://nodejs.org"
    );
  } catch (err) {
    return fail("Node.js version", "Could not detect Node.js version", "Install Node.js 20 LTS");
  }
}

async function checkPlaywright(): Promise<DiagnosticCheck> {
  try {
    // Playwright is installed at repo root
    const pwPath = resolve(process.cwd(), "node_modules", "playwright");
    if (existsSync(pwPath)) {
      return pass("Playwright", "installed");
    }
    return fail(
      "Playwright",
      "not found in node_modules",
      "Run: npm install  (from repo root)"
    );
  } catch (err) {
    return fail("Playwright", String(err), "Run: npm install");
  }
}

async function checkChromium(): Promise<DiagnosticCheck> {
  try {
    // Check Playwright's chromium browser path
    const { execSync } = await import("child_process");
    const result = execSync("npx playwright install --dry-run 2>&1", {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 10000,
    });

    // If chromium already installed, dry-run shows nothing to install
    const needsInstall = result.toLowerCase().includes("chromium");
    if (!needsInstall) {
      return pass("Chromium (Playwright)", "installed");
    }
    return warn(
      "Chromium (Playwright)",
      "may need browser installation",
      "Run: npx playwright install chromium"
    );
  } catch {
    // Fallback: check if executable exists in common playwright cache paths
    const playwrightCacheEnv = process.env["PLAYWRIGHT_BROWSERS_PATH"];
    const hasCache = playwrightCacheEnv && existsSync(playwrightCacheEnv);
    if (hasCache) return pass("Chromium (Playwright)", "cache directory found");
    return warn(
      "Chromium (Playwright)",
      "could not verify browser installation",
      "Run: npx playwright install chromium"
    );
  }
}

async function checkLighthouse(): Promise<DiagnosticCheck> {
  try {
    const lhPath = resolve(process.cwd(), "node_modules", "lighthouse");
    if (existsSync(lhPath)) {
      // Try to read its version
      const pkgPath = join(lhPath, "package.json");
      if (existsSync(pkgPath)) {
        const { readFileSync } = await import("fs");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
        return pass("Lighthouse", `v${pkg.version ?? "unknown"}`);
      }
      return pass("Lighthouse", "installed");
    }
    return fail(
      "Lighthouse",
      "not found in node_modules",
      "Run: npm install  (from repo root)"
    );
  } catch (err) {
    return fail("Lighthouse", String(err), "Run: npm install lighthouse");
  }
}

async function checkPackage(name: string, relativePath: string): Promise<DiagnosticCheck> {
  try {
    // @ts-ignore: IDE might use root tsconfig (CommonJS) instead of cli/tsconfig (NodeNext)
    const absPath = resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "..", relativePath);
    // Just check if the directory exists — don't import (could be slow)
    const dir = absPath.replace(/\/[^/]+\.js$/, "");
    const normalizedDir = dir.replace(/\\/g, "/");
    const checkPath = normalizedDir.split("/src/")[0] ?? normalizedDir;
    if (existsSync(checkPath) || existsSync(dir)) {
      return pass(`Package: ${name}`, "reachable");
    }
    return fail(
      `Package: ${name}`,
      "source directory not found",
      `Ensure packages/${name}/src/ exists`
    );
  } catch (err) {
    return fail(`Package: ${name}`, String(err), `Check packages/${name} directory`);
  }
}

async function checkDotEnv(): Promise<DiagnosticCheck> {
  try {
    const envPath = resolve(process.cwd(), ".env");
    if (existsSync(envPath)) {
      return pass(".env file", "found");
    }
    const examplePath = resolve(process.cwd(), ".env.example");
    if (existsSync(examplePath)) {
      return warn(
        ".env file",
        "missing (.env.example exists)",
        "Run: copy .env.example .env  and fill in your API keys"
      );
    }
    return warn(
      ".env file",
      "missing",
      "Create .env with your API keys (GEMINI_API_KEY or OPENAI_API_KEY)"
    );
  } catch (err) {
    return warn(".env file", String(err), "Create a .env file with your API keys");
  }
}

async function checkAIKey(): Promise<DiagnosticCheck> {
  try {
    const providers: Array<[string, string | undefined]> = [
      ["GEMINI_API_KEY", process.env["GEMINI_API_KEY"]],
      ["OPENAI_API_KEY", process.env["OPENAI_API_KEY"]],
      ["ANTHROPIC_API_KEY", process.env["ANTHROPIC_API_KEY"]],
      ["OPENROUTER_API_KEY", process.env["OPENROUTER_API_KEY"]],
    ];

    const configured = providers.filter(([, v]) => v && v.length > 0);
    if (configured.length > 0) {
      const names = configured.map(([k]) => k).join(", ");
      return pass("AI provider key", `${names} configured`);
    }
    return warn(
      "AI provider key",
      "no AI provider key found in environment",
      "Add GEMINI_API_KEY or OPENAI_API_KEY to your .env  (AI analysis will be skipped without it)"
    );
  } catch (err) {
    return warn("AI provider key", String(err), "Check your .env file");
  }
}

async function checkConfig(): Promise<DiagnosticCheck> {
  try {
    const configPath = resolve(process.cwd(), CONFIG_FILENAME);
    if (!existsSync(configPath)) {
      return warn(
        CONFIG_FILENAME,
        "not found (optional — CLI flags can be used instead)",
        `Run: tracelens init  to generate a config file`
      );
    }
    const config = loadConfig();
    if (!config) {
      return warn(CONFIG_FILENAME, "could not be loaded", "Check JSON syntax in .tracelensrc.json");
    }
    const validation = validateConfig(config);
    if (!validation.valid) {
      return fail(
        CONFIG_FILENAME,
        `invalid: ${validation.errors[0] ?? "unknown error"}`,
        "Fix the issues in .tracelensrc.json"
      );
    }
    if (validation.warnings.length > 0) {
      return warn(
        CONFIG_FILENAME,
        `valid with warnings: ${validation.warnings[0]}`,
        "Review .tracelensrc.json settings"
      );
    }
    return pass(CONFIG_FILENAME, `valid (${config.routes.length} route(s), device: ${config.device})`);
  } catch (err) {
    return fail(CONFIG_FILENAME, String(err), "Check .tracelensrc.json for syntax errors");
  }
}

async function checkOutputDirWritable(): Promise<DiagnosticCheck> {
  try {
    const outputDir = resolve(process.cwd(), "reports");
    if (!existsSync(outputDir)) {
      // Try to create it
      const { mkdirSync } = await import("fs");
      mkdirSync(outputDir, { recursive: true });
      return pass("Output directory", `created: ${outputDir}`);
    }
    accessSync(outputDir, constants.W_OK);
    return pass("Output directory", `writable: ${outputDir}`);
  } catch (err) {
    return fail(
      "Output directory",
      `not writable: ${String(err)}`,
      "Check permissions on the ./reports directory or specify --output <dir>"
    );
  }
}

// ─── Check Builders ───────────────────────────────────────────────────────────

function pass(name: string, message: string): DiagnosticCheck {
  return { name, status: "pass", message };
}
function fail(name: string, message: string, fix?: string): DiagnosticCheck {
  return { name, status: "fail", message, fix };
}
function warn(name: string, message: string, fix?: string): DiagnosticCheck {
  return { name, status: "warn", message, fix };
}

function styleMessage(check: DiagnosticCheck): string {
  if (check.status === "pass") return chalk.green(check.message);
  if (check.status === "fail") return chalk.red(check.message);
  if (check.status === "warn") return chalk.yellow(check.message);
  return chalk.gray(check.message);
}
