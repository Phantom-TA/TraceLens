/**
 * End-to-end test for the TraceLens Analytics Aggregation Engine.
 *
 * This test:
 *   1. Loads the LIVE pipeline result from the last CNN.com run
 *   2. Runs the analytics aggregator on it
 *   3. Saves the TraceLensIntelligenceReport to reports/intelligence/
 *   4. Prints a full structured summary
 *
 * Run:
 *   npx tsx test-analytics.ts
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { aggregate } from "./packages/analytics-engine/src/index.js";
import type { AggregatorInput } from "./packages/analytics-engine/src/index.js";

// ── Load the live pipeline result ─────────────────────────────────────────────
const PIPELINE_RESULT_PATH =
  "./reports/sessions/trace-session-20260508-070102-6b0d/tracelens-result.json";

const pipelineResult = JSON.parse(readFileSync(PIPELINE_RESULT_PATH, "utf-8"));

// ── Build aggregator input from pipeline result ───────────────────────────────
const route = pipelineResult.routes[0];

const input: AggregatorInput = {
  sessionId: pipelineResult.sessionId,
  startedAt: pipelineResult.startedAt,
  durationMs: pipelineResult.durationMs,
  config: pipelineResult.config,
  route: {
    url: route.url,
    label: route.label,
    vitals: route.vitals,
    bottlenecks: route.bottlenecks,
    bundle: route.bundle,
  },
};

// ── Run aggregator ────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════");
console.log("  TraceLens Analytics Aggregation Engine — Live Test");
console.log("══════════════════════════════════════════════════════════\n");
console.log(`  Session : ${input.sessionId}`);
console.log(`  Route   : ${input.route.url}`);
console.log(`  Device  : ${input.config.device.mode} / ${input.config.device.throttle}\n`);

const report = aggregate(input);

// ── Save report ───────────────────────────────────────────────────────────────
const outputDir = "./reports/intelligence";
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, `${report.session.sessionId}--${report.session.label}.json`);
writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");

// ── Print summary ─────────────────────────────────────────────────────────────
console.log("  Core Web Vitals:");
const v = report.coreWebVitals;
console.log(`    LCP           : ${v.lcp.value}ms [${v.lcp.rating}]`);
console.log(`    FCP           : ${v.fcp.value}ms [${v.fcp.rating}]`);
console.log(`    TBT           : ${v.tbt.value}ms [${v.tbt.rating}]`);
console.log(`    CLS           : ${v.cls.value} [${v.cls.rating}]`);
console.log(`    TTI           : ${v.tti.value}ms [${v.tti.rating}]`);
console.log(`    Perf Score    : ${v.performanceScore}/100`);
console.log(`    Overall       : [${v.overallRating}]`);

console.log("\n  Main Thread:");
const mt = report.mainThread;
console.log(`    Blocking time : ${mt.totalBlockingMs}ms`);
console.log(`    Long tasks    : ${mt.longTaskCount}`);
console.log(`    Longest task  : ${mt.longestTaskMs}ms`);

console.log("\n  Primary Bottleneck:");
console.log(`    → ${report.primaryBottleneck}`);

console.log("\n  Performance Risks:");
for (const risk of report.performanceRisks) {
  console.log(`    ${risk.priority}. [${risk.severity.toUpperCase()}] ${risk.label} (conf: ${(risk.confidence * 100).toFixed(0)}%)`);
  console.log(`       Impact: ${risk.impact}`);
  console.log(`       Fix:    ${risk.recommendation}`);
}

console.log("\n  Quick Wins:");
for (const win of report.quickWins) {
  console.log(`    ${win.priority}. ${win.action}`);
  if (win.estimatedSavingsMs) console.log(`       Est. savings: ~${win.estimatedSavingsMs}ms`);
}

console.log("\n  Hydration:");
console.log(`    Detected      : ${report.hydration.detected}`);
console.log(`    Large Init JS : ${report.hydration.largeInitialJS}`);
console.log(`    JS before FCP : ${report.hydration.jsBeforeFcpMs}ms`);
console.log(`    Severity      : ${report.hydration.severity}`);

console.log("\n  Data Quality:");
console.log(`    Sources       : ${report.dataQuality.sources.join(", ")}`);
console.log(`    Confidence    : ${report.dataQuality.confidence}`);
if (report.dataQuality.note) console.log(`    Note          : ${report.dataQuality.note}`);

console.log(`\n  AI Signals (${report.aiSignals.length} total):`);
report.aiSignals.slice(0, 8).forEach((s, i) => console.log(`    ${i + 1}. ${s}`));

console.log(`\n  Aggregation time : ${report.meta.aggregationMs}ms`);
console.log(`  Report saved     : ${outputPath}`);
console.log("\n══════════════════════════════════════════════════════════\n");
