/**
 * End-to-end integration test for the TraceLens Pipeline Engine.
 *
 * This is the FIRST test that exercises the full pipeline:
 *   Playwright → Lighthouse → TraceParser → Aggregation
 *
 * Uses CNN as the test target since we've already verified it's slow
 * and produces meaningful bottleneck data.
 *
 * Run:
 *   npx tsc --project tsconfig.pipeline-test.json
 *   node dist-test-pipeline/test-pipeline.js
 */

import { runPipeline } from "./packages/report-engine/src/index.js";

async function main() {
  const result = await runPipeline({
    routes: [
      { url: "https://www.cnn.com", label: "cnn-homepage" },
    ],
    device: {
      mode: "desktop",
      throttle: "none",
    },
    outputDir: "./reports",
    runs: 1,
    capturePlaywrightArtifacts: true,
    runLighthouse: true,
    runTraceParser: true,
    runBundleAnalyzer: false, // No webpack stats for CNN — skip bundle stage
    continueOnFailure: true,
    headless: true,
  });

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  Pipeline Integration Test — Final Result Summary");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`\n  Session ID : ${result.sessionId}`);
  console.log(`  Duration   : ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Success    : ${result.success}`);
  console.log(`  Result     : ${result.resultPath}`);

  console.log("\n  Stage Execution:");
  for (const [name, stage] of Object.entries(result.stages)) {
    const icon = stage.status === "done" ? "✓" : stage.status === "skipped" ? "⊘" : stage.status === "failed" ? "✗" : "?";
    const dur  = stage.durationMs !== null ? `${stage.durationMs}ms` : "";
    console.log(`    ${icon} ${name.padEnd(16)} ${stage.status.padEnd(8)} ${dur}`);
  }

  for (const route of result.routes) {
    console.log(`\n  Route: ${route.url}`);
    console.log(`    FCP            : ${route.vitals.fcp ?? "n/a"}ms`);
    console.log(`    LCP            : ${route.vitals.lcp ?? "n/a"}ms`);
    console.log(`    TBT            : ${route.vitals.tbt ?? "n/a"}ms`);
    console.log(`    Perf Score     : ${route.vitals.performanceScore !== null
      ? Math.round((route.vitals.performanceScore ?? 0) * 100) + "/100"
      : "n/a"}`);
    console.log(`    Bottleneck     : ${route.primaryBottleneck ?? "n/a"}`);
    console.log(`    AI Signals     : ${route.aiSignals.length} signals`);

    if (route.aiSignals.length > 0) {
      console.log("\n    Top AI Signals:");
      route.aiSignals.slice(0, 5).forEach((s, i) => console.log(`      ${i + 1}. ${s}`));
    }

    console.log("\n    Artifacts:");
    const a = route.artifacts;
    if (a.screenshotPath) console.log(`      screenshot   : ${a.screenshotPath}`);
    if (a.harPath)        console.log(`      HAR          : ${a.harPath}`);
    if (a.lighthouseJsonPath) console.log(`      LHR JSON     : ${a.lighthouseJsonPath}`);
    if (a.bottlenecksJsonPath) console.log(`      bottlenecks  : ${a.bottlenecksJsonPath}`);
  }

  console.log("\n══════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\nPipeline test FAILED:", err);
  process.exit(1);
});
