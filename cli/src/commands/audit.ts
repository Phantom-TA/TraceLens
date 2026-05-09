/**
 * @file commands/audit.ts
 * @description `tracelens audit <url>` — full performance intelligence pipeline.
 *
 * EXECUTION FLOW:
 *   1. Resolve config (file + CLI flag overrides)
 *   2. Validate URL and config
 *   3. Run pipeline (Playwright → Lighthouse → Trace Parser → Bundle Analyzer)
 *   4. Run analytics aggregation (normalize + correlate → intelligence report)
 *   5. Run AI root-cause analysis (if enabled and provider configured)
 *   6. Save reports (JSON + Markdown)
 *   7. [--save-session] Persist full session metadata
 *   8. Print results to terminal (or emit --json envelope)
 *   9. [--open] Open Lighthouse HTML report in browser
 *
 * FLAGS:
 *   --device <desktop|mobile>   Device emulation mode
 *   --runs <n>                   Lighthouse run count (averaged)
 *   --no-ai                      Skip AI root-cause analysis
 *   --output <dir>               Report output directory
 *   --open                       Open report in browser after audit
 *   --verbose                    Detailed stage logs + timings
 *   --throttle <none|4g|3g>      Network throttle profile
 *   --bundle <path>              webpack stats.json for bundle analysis
 *   --json                       Machine-readable JSON stdout (CI/CD)
 *   --ci                         CI mode: no banner, compact logs, strict exit codes
 *   --save-session               Persist full session metadata JSON
 */

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";

import {
  log, setVerbose, setJsonMode, setCI, isJsonMode, isCIMode,
  printBanner, printVitalsTable, printRisks, printQuickWins,
  printObservability, printTimingSummary, printCISummary, jsonOutput,
} from "../utils/logger.js";
import { loadConfig, mergeWithDefaults, validateConfig } from "../utils/config.js";
import { resolveOutputDir, ensureDir } from "../utils/paths.js";
import {
  runTraceLensPipeline,
  runAnalyticsForRoute,
  runAIAnalysis,
  saveAuditReports,
  saveSessionMetadata,
  buildAuditSummary,
} from "../services/orchestrator.js";

import type { AuditOptions, TraceLensConfig } from "../types/index.js";
import type { TraceLensIntelligenceReport } from "../../../packages/analytics-engine/src/index.js";

export function createAuditCommand(): Command {
  const cmd = new Command("audit");

  cmd
    .description("Run the full TraceLens performance intelligence pipeline on a URL")
    .argument("<url>", "Target URL to audit (e.g. https://example.com)")
    .option("-d, --device <device>", "Device mode: desktop | mobile", "desktop")
    .option("-r, --runs <number>", "Number of Lighthouse runs to average", "1")
    .option("--no-ai", "Skip AI root-cause analysis")
    .option("-o, --output <dir>", "Output directory for reports", "./reports")
    .option("--open", "Open Lighthouse HTML report in browser after audit", false)
    .option("-v, --verbose", "Show detailed pipeline logs and stage timings", false)
    .option("--throttle <profile>", "Network throttle: none | 4g | 3g", "none")
    .option("--bundle <path>", "Path to webpack stats.json for bundle analysis")
    .option("--json", "Output results as machine-readable JSON (suppresses all decorative output)", false)
    .option("--ci", "CI mode: no banner, compact deterministic logs, strict exit codes", false)
    .option("--save-session", "Persist full session metadata (config snapshot, stage timings, AI metadata)", false)
    .action(async (url: string, options: AuditOptions) => {
      await runAudit(url, options);
    });

  return cmd;
}

// ─── Main Audit Flow ──────────────────────────────────────────────────────────

async function runAudit(url: string, options: AuditOptions): Promise<void> {
  const startedAt = Date.now();

  // ── Mode setup ─────────────────────────────────────────────────────────────
  setVerbose(options.verbose);
  if (options.json) setJsonMode(true);
  if (options.ci)   setCI(true);

  if (!isJsonMode()) printBanner();

  // ── Load + merge config ────────────────────────────────────────────────────
  const fileConfig = loadConfig();
  const config: TraceLensConfig = mergeWithDefaults({
    ...(fileConfig ?? {}),
    device: options.device,
    runs: parseInt(options.runs, 10) || 1,
    ai: options.ai,
    outputDir: options.output,
    throttle: options.throttle,
  });

  // ── Validate ───────────────────────────────────────────────────────────────
  const validation = validateConfig(config);
  for (const w of validation.warnings) log.warn(w);
  if (!validation.valid) {
    for (const e of validation.errors) log.error(e);
    if (isJsonMode()) jsonOutput("audit", false, null, validation.errors);
    process.exit(1);
  }

  // ── Print audit plan (human mode only) ────────────────────────────────────
  if (!isJsonMode() && !isCIMode()) {
    log.section("Audit Configuration");
    log.line(`${chalk.gray("URL     :")} ${chalk.underline(url)}`);
    log.line(`${chalk.gray("Device  :")} ${config.device}`);
    log.line(`${chalk.gray("Throttle:")} ${config.throttle}`);
    log.line(`${chalk.gray("Runs    :")} ${config.runs}`);
    log.line(`${chalk.gray("AI      :")} ${config.ai ? chalk.green("enabled") : chalk.gray("disabled")}`);
    log.line(`${chalk.gray("Output  :")} ${resolveOutputDir(config.outputDir)}`);
    log.blank();
  }

  ensureDir(resolveOutputDir(config.outputDir));

  // ── Stage 1–4: Pipeline ────────────────────────────────────────────────────
  if (!isJsonMode()) {
    log.step(1, 3, "Running data collection pipeline…");
    if (!isCIMode()) {
      log.line(chalk.gray("  Playwright → Lighthouse → Trace Parser → Bundle Analyzer"));
      log.blank();
    }
  }

  const pipelineSpinner = isJsonMode() || isCIMode()
    ? null
    : ora({ text: "Starting browser session…", prefixText: "  " }).start();

  let pipelineResult;
  try {
    pipelineResult = await runTraceLensPipeline(url, config, {
      verbose: options.verbose,
      bundlePath: options.bundle,
    });
    pipelineSpinner?.succeed(chalk.green(`Pipeline complete in ${pipelineResult.durationMs}ms`));
    if (isCIMode()) console.log(`[tracelens] pipeline complete in ${pipelineResult.durationMs}ms`);
  } catch (err) {
    pipelineSpinner?.fail("Pipeline failed");
    const msg = err instanceof Error ? err.message : String(err);
    log.error(msg);
    if (isJsonMode()) jsonOutput("audit", false, null, [msg]);
    process.exit(1);
  }

  // ── Stage timing summary (verbose) ─────────────────────────────────────────
  if (options.verbose && !isJsonMode()) {
    const stageRecords: Record<string, { status: string; durationMs: number | null }> = {};
    for (const [name, record] of Object.entries(pipelineResult.stages) as Array<[string, any]>) {
      stageRecords[name] = { status: record.status, durationMs: record.durationMs };
    }
    printTimingSummary(stageRecords);
  }

  // ── Stage 5: Analytics ─────────────────────────────────────────────────────
  if (!isJsonMode()) {
    log.step(2, 3, "Running analytics aggregation…");
    if (!isCIMode()) {
      log.line(chalk.gray("  Normalizing → Correlating → Generating intelligence report"));
      log.blank();
    }
  }

  const intelligenceReports = new Map<string, TraceLensIntelligenceReport>();

  for (const route of pipelineResult.routes) {
    const analyticsSpinner = isJsonMode() || isCIMode()
      ? null
      : ora({ text: `Analyzing ${route.url}…`, prefixText: "  " }).start();
    try {
      const intel = runAnalyticsForRoute(pipelineResult, route);
      intelligenceReports.set(route.url, intel);
      analyticsSpinner?.succeed(`Analytics complete — ${intel.performanceRisks.length} risk(s) identified`);
      if (isCIMode()) console.log(`[tracelens] analytics complete: ${intel.performanceRisks.length} risks`);
    } catch (err) {
      analyticsSpinner?.fail("Analytics aggregation failed");
      log.warn(err instanceof Error ? err.message : String(err));
    }
  }

  // ── Stage 6: AI Analysis ───────────────────────────────────────────────────
  if (!isJsonMode()) {
    log.step(3, 3, config.ai ? "Running AI root-cause analysis…" : "AI analysis skipped");
    log.blank();
  }

  const allSavedPaths: string[] = [];
  let lastAIResult: { status: string; report: unknown; meta: Record<string, unknown> } | null = null;

  for (const [, intel] of intelligenceReports.entries()) {
    let aiResult = null;

    if (config.ai) {
      const aiSpinner = isJsonMode() || isCIMode()
        ? null
        : ora({ text: "Consulting AI provider…", prefixText: "  " }).start();

      try {
        aiResult = await runAIAnalysis(intel, {
          saveDebugLogs: options.verbose,
          debugLogDir: `${config.outputDir}/ai-debug`,
        });
        lastAIResult = aiResult;

        if (aiResult.status === "success") {
          aiSpinner?.succeed(
            `AI complete (${aiResult.meta.provider}/${aiResult.meta.model}) — ${aiResult.meta.durationMs}ms · ${aiResult.meta.tokens ?? 0} tokens`
          );
          if (isCIMode()) console.log(`[tracelens] ai complete: ${aiResult.meta.provider}/${aiResult.meta.model}`);
        } else if (aiResult.status === "skipped") {
          aiSpinner?.warn("AI skipped — set GEMINI_API_KEY or OPENAI_API_KEY in .env");
          if (isCIMode()) console.log("[tracelens] ai skipped: no provider key");
        } else {
          aiSpinner?.fail(`AI failed: ${aiResult.status}`);
        }
      } catch (err) {
        aiSpinner?.fail("AI threw an unexpected error");
        log.warn(err instanceof Error ? err.message : String(err));
      }
    }

    // ── Save reports ─────────────────────────────────────────────────────────
    const { jsonPath, markdownPath } = saveAuditReports(
      resolveOutputDir(config.outputDir),
      pipelineResult.sessionId,
      intel,
      aiResult
    );
    allSavedPaths.push(jsonPath);
    if (markdownPath) allSavedPaths.push(markdownPath);
  }

  // ── Save session metadata (--save-session) ─────────────────────────────────
  if (options.saveSession) {
    try {
      const metaPath = saveSessionMetadata(
        resolveOutputDir(config.outputDir),
        pipelineResult.sessionId,
        url,
        config,
        pipelineResult,
        lastAIResult,
        allSavedPaths
      );
      allSavedPaths.push(metaPath);
      log.debug(`Session metadata saved: ${metaPath}`);
    } catch (err) {
      log.warn(`Could not save session metadata: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Build summary ──────────────────────────────────────────────────────────
  const summary = buildAuditSummary(pipelineResult, intelligenceReports);
  const totalMs = Date.now() - startedAt;

  // ── JSON output mode ───────────────────────────────────────────────────────
  if (isJsonMode()) {
    const firstIntel = [...intelligenceReports.values()][0];
    jsonOutput("audit", pipelineResult.success, {
      sessionId: pipelineResult.sessionId,
      url,
      device: config.device,
      throttle: config.throttle,
      runs: config.runs,
      durationMs: totalMs,
      success: pipelineResult.success,
      vitals: firstIntel ? {
        lcp: firstIntel.coreWebVitals.lcp.value,
        fcp: firstIntel.coreWebVitals.fcp.value,
        tbt: firstIntel.coreWebVitals.tbt.value,
        cls: firstIntel.coreWebVitals.cls.value,
        ttfb: firstIntel.coreWebVitals.ttfb.value,
        score: firstIntel.coreWebVitals.performanceScore,
      } : null,
      primaryBottleneck: summary.routes[0]?.primaryBottleneck ?? null,
      risksCount: firstIntel?.performanceRisks.length ?? 0,
      quickWinsCount: firstIntel?.quickWins.length ?? 0,
      framework: firstIntel?.framework ?? null,
      ai: lastAIResult ? {
        status: lastAIResult.status,
        provider: lastAIResult.meta.provider,
        model: lastAIResult.meta.model,
        tokens: lastAIResult.meta.tokens,
      } : null,
      reports: allSavedPaths,
      stages: Object.fromEntries(
        Object.entries(pipelineResult.stages).map(([name, r]: [string, any]) => [name, { status: r.status, durationMs: r.durationMs }])
      ),
    });
    process.exit(pipelineResult.success ? 0 : 1);
  }

  // ── CI mode output ─────────────────────────────────────────────────────────
  if (isCIMode()) {
    const firstIntel = [...intelligenceReports.values()][0];
    printCISummary({
      sessionId: pipelineResult.sessionId,
      url,
      success: pipelineResult.success,
      durationMs: totalMs,
      risksCount: firstIntel?.performanceRisks.length ?? 0,
      primaryBottleneck: summary.routes[0]?.primaryBottleneck ?? null,
      reportPath: allSavedPaths[0] ?? null,
    });
    process.exit(pipelineResult.success ? 0 : 1);
  }

  // ── Full human-readable terminal output ────────────────────────────────────
  log.section("Audit Results");

  for (const route of summary.routes) {
    printVitalsTable(route.url, route.vitals);

    const intel = intelligenceReports.get(route.url);
    if (intel) {
      if (route.primaryBottleneck) {
        log.line(
          `  ${chalk.bold("Primary Bottleneck:")} ${chalk.yellow(route.primaryBottleneck.replace(/-/g, " "))}`
        );
        log.blank();
      }

      if (intel.framework?.framework) {
        const fw = intel.framework.framework;
        const conf = Math.round((intel.framework.confidence ?? 0) * 100);
        const methods = intel.framework.detectionMethods?.join(", ") ?? "";
        log.line(
          `  ${chalk.gray("Framework:")} ${chalk.white(fw)} ` +
          `${chalk.gray(`(${conf}% confidence`)}${methods ? chalk.gray(` via ${methods}`) : ""}${chalk.gray(")")}`
        );
        log.blank();
      }

      printRisks(intel.performanceRisks.slice(0, 5));
      printQuickWins(intel.quickWins);

      if (intel.hydration.detected) {
        const conf = intel.hydration.confidence ? Math.round(intel.hydration.confidence * 100) : null;
        const note = conf !== null ? chalk.gray(` (${conf}% confidence)`) : "";
        log.line(
          `  ${chalk.gray("Hydration:")} ${intel.hydration.durationMs}ms delay detected` +
          `${note} · ${intel.hydration.detectionMethod ?? "unknown method"}`
        );
        log.blank();
      }
    }
  }

  // ── Observability summary ──────────────────────────────────────────────────
  const lighthouseHtml = pipelineResult.routes[0]?.artifacts?.lighthouseHtmlPath;
  const allPaths = [
    ...(lighthouseHtml ? [lighthouseHtml] : []),
    ...allSavedPaths,
  ];

  printObservability({
    sessionId: pipelineResult.sessionId,
    url,
    device: config.device,
    durationMs: totalMs,
    provider: lastAIResult?.meta.provider,
    model: lastAIResult?.meta.model,
    tokens: lastAIResult?.meta.tokens,
    reportPaths: allPaths,
    outputDir: resolveOutputDir(config.outputDir),
  });

  log.success(`Audit complete in ${(totalMs / 1000).toFixed(1)}s`);
  log.blank();

  // ── Open in browser ────────────────────────────────────────────────────────
  if (options.open) {
    const htmlPath = pipelineResult.routes[0]?.artifacts?.lighthouseHtmlPath;
    if (htmlPath) {
      log.info("Opening Lighthouse report in browser…");
      const { default: open } = await import("open");
      await open(htmlPath);
    } else {
      log.warn("No HTML report found to open");
    }
  }
}
