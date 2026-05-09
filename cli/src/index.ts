#!/usr/bin/env node
/**
 * @file index.ts
 * @description TraceLens CLI entry point.
 *
 * Registers all commands and sets up top-level error handling.
 * This file stays thin — all logic lives in commands/ and services/.
 *
 * COMMANDS:
 *   tracelens init               Scaffold .tracelensrc.json
 *   tracelens audit <url>        Full performance intelligence pipeline
 *   tracelens compare <a> <b>    Regression detection between two reports
 *   tracelens analyze <report>   Re-run AI on existing report (no re-audit)
 *   tracelens doctor             Environment diagnostic checks
 */

import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

import { createInitCommand }    from "./commands/init.js";
import { createAuditCommand }   from "./commands/audit.js";
import { createCompareCommand } from "./commands/compare.js";
import { createAnalyzeCommand } from "./commands/analyze.js";
import { createDoctorCommand }  from "./commands/doctor.js";
import { createReportCommand }  from "./commands/report.js";

// ─── Version resolution ───────────────────────────────────────────────────────

const CLI_VERSION = "2.0.0";

function readEngineVersion(pkgRelPath: string): string | null {
  try {
    // __dirname equivalent in ESM: walk from cwd
    const pkgPath = resolve(process.cwd(), pkgRelPath);
    if (!existsSync(pkgPath)) return null;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function buildVersionString(): string {
  const analyticsVer = readEngineVersion("packages/analytics-engine/package.json");
  const aiVer        = readEngineVersion("packages/ai-engine/package.json");

  const lines = [
    `TraceLens CLI           v${CLI_VERSION}`,
    analyticsVer ? `Analytics Engine        v${analyticsVer}` : null,
    aiVer        ? `AI Engine               v${aiVer}`        : null,
  ].filter(Boolean).join("\n");

  return lines;
}

// ─── Root program ─────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("tracelens")
  .description("AI-powered frontend performance intelligence CLI")
  .addHelpText("after", `
Examples:
  $ tracelens init
  $ tracelens audit https://example.com
  $ tracelens audit https://example.com --device mobile --runs 3 --open
  $ tracelens audit https://example.com --ci --json
  $ tracelens audit https://example.com --save-session
  $ tracelens compare baseline.json current.json
  $ tracelens compare baseline.json current.json --json --fail-on-regression
  $ tracelens analyze reports/intelligence/ai-report-session.json
  $ tracelens report reports/intelligence/ai-report-session.json
  $ tracelens report reports/intelligence/ai-report-session.json --open
  $ tracelens report reports/intelligence/ai-report-session.json --format all
  $ tracelens report before.json --compare after.json --open
  $ tracelens doctor
  `)
  .version(buildVersionString(), "-V, --version", "Print TraceLens version info")
  .helpOption("-h, --help", "Show help for a command");

// ─── Commands ─────────────────────────────────────────────────────────────────

program.addCommand(createInitCommand());
program.addCommand(createAuditCommand());
program.addCommand(createCompareCommand());
program.addCommand(createAnalyzeCommand());
program.addCommand(createDoctorCommand());
program.addCommand(createReportCommand());

// ─── Global error handling ────────────────────────────────────────────────────

program.on("command:*", (operands: string[]) => {
  console.error(`\n  Error: Unknown command "${operands[0]}"\n`);
  console.error(`  Run ${"`tracelens --help`"} for usage.\n`);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error(`\n  [tracelens] Fatal error: ${err.message}\n`);
  if (process.env["DEBUG"]) console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error(`\n  [tracelens] Unhandled rejection: ${msg}\n`);
  if (process.env["DEBUG"] && reason instanceof Error) console.error(reason.stack);
  process.exit(1);
});

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  console.error(`\n  [tracelens] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
