/**
 * End-to-end integration test for the TraceLens Pipeline Engine.
 *
 * This is the FIRST test that exercises the full pipeline:
 *   Playwright → Lighthouse → TraceParser → Aggregation
 *
 * TARGET URL:
 *   Set TRACELENS_TEST_URL in your .env file — no need to edit this file.
 *   Default: http://localhost:3000
 *
 * Run:
 *   npx tsx test-pipeline.ts
 */

import "dotenv/config";
import { runPipeline } from "./packages/pipeline-engine/src/index.js";

const TEST_URL = process.env["TRACELENS_TEST_URL"] ?? "http://localhost:3000";
const TEST_LABEL = TEST_URL.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-").slice(0, 40);

console.log(`\n  Target URL : ${TEST_URL}`);
console.log(`  (Change this in .env → TRACELENS_TEST_URL)\n`);

async function main() {
  const result = await runPipeline({
    routes: [
      { url: TEST_URL, label: TEST_LABEL },
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
    runBundleAnalyzer: false,
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
    const icon = (stage as any).status === "done" ? "✓" : (stage as any).status === "skipped" ? "⊘" : (stage as any).status === "failed" ? "✗" : "?";
    const dur  = (stage as any).durationMs !== null ? `${(stage as any).durationMs}ms` : "";
    console.log(`    ${icon} ${name.padEnd(16)} ${(stage as any).status.padEnd(8)} ${dur}`);
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
      route.aiSignals.slice(0, 5).forEach((s: string, i: number) => console.log(`      ${i + 1}. ${s}`));
    }

    console.log("\n    Artifacts:");
    const a = route.artifacts;
    if (a.screenshotPath)     console.log(`      screenshot   : ${a.screenshotPath}`);
    if (a.harPath)            console.log(`      HAR          : ${a.harPath}`);
    if (a.lighthouseJsonPath) console.log(`      LHR JSON     : ${a.lighthouseJsonPath}`);
    if (a.bottlenecksJsonPath)console.log(`      bottlenecks  : ${a.bottlenecksJsonPath}`);
  }

  console.log("\n══════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\nPipeline test FAILED:", err);
  process.exit(1);
});
