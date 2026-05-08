/**
 * End-to-end integration test for the TraceLens AI Root-Cause Analysis Engine.
 *
 * This test:
 *   1. Loads the live analytics intelligence report
 *   2. Runs the AI engine against the configured provider
 *   3. Prints the full structured root-cause analysis
 *   4. Saves the result to reports/intelligence/
 *
 * SETUP:
 *   1. Copy .env.example to .env
 *   2. Fill in your AI provider key (Gemini has a free tier)
 *   3. Run: npx tsx test-ai-engine.ts
 *
 * FALLBACK:
 *   If no .env is configured, the engine skips gracefully.
 *   All pipeline intelligence is still available.
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { analyzeWithAI } from "./packages/ai-engine/src/index.js";
import { aggregate } from "./packages/analytics-engine/src/index.js";
import type { AggregatorInput } from "./packages/analytics-engine/src/index.js";

// ── Load pipeline result ───────────────────────────────────────────────────────
async function main() {
  const PIPELINE_RESULT_PATH =
  "./reports/sessions/trace-session-20260508-070102-6b0d/tracelens-result.json";

const pipelineResult = JSON.parse(readFileSync(PIPELINE_RESULT_PATH, "utf-8"));
const route = pipelineResult.routes[0];

// ── Build analytics input ──────────────────────────────────────────────────────
const aggregatorInput: AggregatorInput = {
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

// ── Run analytics aggregator ──────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════");
console.log("  TraceLens AI Engine — Full Stack Integration Test");
console.log("══════════════════════════════════════════════════════════\n");

const intelligenceReport = aggregate(aggregatorInput);
console.log(`  Session  : ${intelligenceReport.session.sessionId}`);
console.log(`  Route    : ${intelligenceReport.session.url}`);
console.log(`  Device   : ${intelligenceReport.session.device}`);
console.log(`  Vitals   : LCP=${intelligenceReport.coreWebVitals.lcp.value}ms | FCP=${intelligenceReport.coreWebVitals.fcp.value}ms | TBT=${intelligenceReport.coreWebVitals.tbt.value}ms`);
console.log(`  Risks    : ${intelligenceReport.performanceRisks.length} identified`);
console.log(`  Primary  : ${intelligenceReport.primaryBottleneck}`);

// ── Run AI engine ─────────────────────────────────────────────────────────────
console.log("\n  Running AI Root-Cause Analysis...\n");

const aiResult = await analyzeWithAI(intelligenceReport, {
  logPrompts: false,
  saveDebugLogs: true,
  debugLogDir: "./reports/ai-debug",
});

// ── Print results ─────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════");
console.log("  AI Engine Result");
console.log("══════════════════════════════════════════════════════════\n");

console.log(`  Status   : ${aiResult.status}`);
console.log(`  Message  : ${aiResult.message}`);
console.log(`  Provider : ${aiResult.meta.provider ?? "none"} / ${aiResult.meta.model ?? "none"}`);
console.log(`  Duration : ${aiResult.meta.durationMs}ms`);

if (aiResult.meta.usage?.totalTokens) {
  console.log(`  Tokens   : ${aiResult.meta.usage.totalTokens} total`);
}

if (aiResult.status === "skipped") {
  console.log("\n  ⚠ AI analysis skipped — configure a provider in .env to enable AI reasoning.");
  console.log("  See .env.example for setup instructions.");
  console.log("\n  ✓ TraceLens pipeline intelligence is still complete:");
  console.log(`    Primary Bottleneck : ${intelligenceReport.primaryBottleneck}`);
  console.log(`    Performance Risks  : ${intelligenceReport.performanceRisks.length}`);
  console.log(`    Quick Wins         : ${intelligenceReport.quickWins.length}`);
  console.log(`    AI Signals         : ${intelligenceReport.aiSignals.length}`);
  process.exit(0);
}

if (aiResult.status === "failed" || !aiResult.report) {
  console.error("\n  ✗ AI analysis failed. Check provider configuration and API key.");
  process.exit(1);
}

const r = aiResult.report;

console.log("\n  Summary:");
console.log(`    ${r.summary}\n`);

console.log("  Primary Bottleneck:");
console.log(`    Type: ${r.primaryBottleneck.type}`);
console.log(`    ${r.primaryBottleneck.explanation}`);
console.log(`    Evidence: ${r.primaryBottleneck.evidence.join(" | ")}\n`);

console.log(`  Root Causes (${r.rootCauses.length}):`);
for (const cause of r.rootCauses) {
  console.log(`    ${cause.rank}. [${cause.severity.toUpperCase()}] ${cause.issue}`);
  console.log(`       ${cause.explanation}`);
  console.log(`       Impact: ${cause.impact}`);
  if (Object.keys(cause.metrics).length > 0) {
    const metricStr = Object.entries(cause.metrics).map(([k, v]) => `${k}: ${v}`).join(", ");
    console.log(`       Metrics: ${metricStr}`);
  }
}

console.log(`\n  Recommendations (${r.recommendations.length}):`);
for (const rec of r.recommendations) {
  console.log(`    ${rec.rank}. [${rec.priority.toUpperCase()}] [${rec.effort} effort] ${rec.action}`);
  console.log(`       Rationale: ${rec.rationale}`);
  console.log(`       Impact:    ${rec.estimatedImpact}`);
}

console.log("\n  Estimated Impact:");
if (r.estimatedImpact.lcp)              console.log(`    LCP   : ${r.estimatedImpact.lcp}`);
if (r.estimatedImpact.fcp)              console.log(`    FCP   : ${r.estimatedImpact.fcp}`);
if (r.estimatedImpact.tbt)              console.log(`    TBT   : ${r.estimatedImpact.tbt}`);
if (r.estimatedImpact.performanceScore) console.log(`    Score : ${r.estimatedImpact.performanceScore}`);
console.log(`    Note  : ${r.estimatedImpact.note}`);

console.log("\n  Confidence:");
console.log(`    Overall    : ${(r.confidence.overall * 100).toFixed(0)}%`);
console.log(`    Data       : ${r.confidence.dataQuality}`);
console.log(`    Sources    : ${r.confidence.sourcesUsed.join(", ")}`);
if (r.confidence.note) console.log(`    Note       : ${r.confidence.note}`);

// ── Save result ───────────────────────────────────────────────────────────────
const outputDir = "./reports/intelligence";
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, `ai-report-${intelligenceReport.session.sessionId}.json`);
writeFileSync(outputPath, JSON.stringify({ intelligenceReport, aiResult }, null, 2), "utf-8");

console.log(`\n  Report saved: ${outputPath}`);
  console.log("\n══════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
