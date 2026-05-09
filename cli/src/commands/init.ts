/**
 * @file commands/init.ts
 * @description `tracelens init` command — scaffold .tracelensrc.json
 *
 * WHAT IT DOES:
 *   - Generates .tracelensrc.json in the current working directory
 *   - Shows a brief next-steps guide after generation
 *   - Refuses to overwrite existing config unless --force is passed
 */

import { writeFileSync, existsSync } from "fs";
import { Command } from "commander";
import { log } from "../utils/logger.js";
import { getConfigPath, DEFAULT_CONFIG, CONFIG_FILENAME } from "../utils/config.js";
import type { InitOptions } from "../types/index.js";

export function createInitCommand(): Command {
  const cmd = new Command("init");

  cmd
    .description("Scaffold a .tracelensrc.json configuration file in the current directory")
    .option("-f, --force", "Overwrite existing config without prompting", false)
    .action(async (options: InitOptions) => {
      await runInit(options);
    });

  return cmd;
}

async function runInit(options: InitOptions): Promise<void> {
  const configPath = getConfigPath();

  // Guard: refuse to overwrite unless --force
  if (existsSync(configPath) && !options.force) {
    log.warn(`${CONFIG_FILENAME} already exists in this directory.`);
    log.line(`Run with ${chalk_bold("--force")} to overwrite it.`);
    process.exit(1);
  }

  const config = {
    ...DEFAULT_CONFIG,
    // Add helpful inline comment hints in the generated file
    _comment: "TraceLens configuration. Run 'tracelens audit <url>' to start.",
  };

  const content = JSON.stringify(
    {
      routes: config.routes,
      device: config.device,
      throttle: config.throttle,
      runs: config.runs,
      ai: config.ai,
      outputDir: config.outputDir,
      bundle: {
        "_comment": "Optional: set webpackStatsPath to enable bundle analysis",
        "webpackStatsPath": null,
        "framework": null,
      },
    },
    null,
    2
  );

  writeFileSync(configPath, content, "utf-8");

  log.success(`Created ${CONFIG_FILENAME}`);
  log.blank();
  log.line("  Next steps:");
  log.blank();
  log.line(`  1. Edit ${chalk_dim(CONFIG_FILENAME)} to set your routes and preferences`);
  log.line(`  2. Copy ${chalk_dim(".env.example")} to ${chalk_dim(".env")} and add your AI provider key`);
  log.line(`  3. Run an audit:`);
  log.blank();
  log.line(`     ${chalk_cyan("tracelens audit https://yoursite.com")}`);
  log.blank();
  log.line("  Options:");
  log.line(`     ${chalk_dim("--device mobile")}    Emulate mobile viewport`);
  log.line(`     ${chalk_dim("--runs 3")}            Average 3 Lighthouse runs`);
  log.line(`     ${chalk_dim("--no-ai")}            Skip AI root-cause analysis`);
  log.line(`     ${chalk_dim("--open")}             Open HTML report in browser`);
  log.blank();
  log.line(`  For more: ${chalk_cyan("tracelens --help")}`);
  log.blank();
}

// ─── Chalk helpers (lightweight — avoid importing chalk for just bold/dim) ────

function chalk_bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}
function chalk_dim(s: string): string {
  return `\x1b[2m${s}\x1b[0m`;
}
function chalk_cyan(s: string): string {
  return `\x1b[36m${s}\x1b[0m`;
}
