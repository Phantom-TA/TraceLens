/**
 * Smoke test for @tracelens/bundle-analyzer
 *
 * Uses a synthetic webpack stats payload that mirrors a real-world
 * Next.js app with common performance problems:
 *   - moment.js full build (231KB)
 *   - chart.js in initial bundle (480KB)
 *   - lodash full build (71KB)
 *   - duplicate react-dom (nested copy)
 *   - analytics SDK in initial bundle
 *   - oversized /dashboard route chunk
 *
 * Run:
 *   npx tsc --project tsconfig.bundle-analyzer-test.json
 *   node dist-test-bundle/test-bundle-analyzer.js
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { analyze } from "./packages/bundle-analyzer/src/index.js";

// ─── Synthetic Webpack Stats ────────────────────────────────────────────────────
//
// This represents a Next.js app with ALL THE CLASSIC MISTAKES:
//   - moment.js without tree-shaking
//   - chart.js in initial bundle (should be lazy)
//   - full lodash build
//   - mixpanel analytics in initial bundle
//   - duplicate react-dom (nested in a UI library)
//   - oversized /dashboard route chunk

const syntheticWebpackStats = {
  hash: "abc123",
  version: "5.88.0",
  chunks: [
    {
      id: 0, names: ["main"], size: 1_453_000,
      initial: true, entry: true, files: ["main.js"],
      modules: [], parents: [], children: [1, 2], siblings: [],
    },
    {
      id: 1, names: ["pages/dashboard"], size: 942_000,
      initial: false, entry: false, files: ["pages/dashboard.js"],
      modules: [], parents: [0], children: [], siblings: [],
    },
    {
      id: 2, names: ["pages/profile"], size: 187_000,
      initial: false, entry: false, files: ["pages/profile.js"],
      modules: [], parents: [0], children: [], siblings: [],
    },
    {
      id: 3, names: ["runtime"], size: 12_000,
      initial: true, entry: true, files: ["runtime.js"],
      modules: [], parents: [], children: [], siblings: [],
    },
  ],
  modules: [
    // ── Framework ──────────────────────────────────────────────────────────
    { name: "./node_modules/react/index.js",               size: 7_300,   chunks: [0] },
    { name: "./node_modules/react-dom/cjs/react-dom.production.min.js", size: 130_000, chunks: [0] },
    { name: "./node_modules/next/dist/client/index.js",    size: 85_000,  chunks: [0] },

    // ── THE BIG MISTAKES ────────────────────────────────────────────────────

    // 1. moment.js — full build (should be replaced with dayjs)
    { name: "./node_modules/moment/moment.js",             size: 289_000, chunks: [0] },

    // 2. chart.js — in INITIAL bundle (should be lazy-loaded)
    { name: "./node_modules/chart.js/dist/chart.umd.js",  size: 491_000, chunks: [0] },

    // 3. lodash full build (not lodash-es — no tree-shaking)
    { name: "./node_modules/lodash/lodash.js",             size: 71_500,  chunks: [0] },

    // 4. Analytics in initial bundle (mixpanel should be deferred)
    { name: "./node_modules/mixpanel-browser/dist/mixpanel.umd.js", size: 53_000, chunks: [0] },

    // 5. @mui/material — large UI library
    { name: "./node_modules/@mui/material/Button/index.js", size: 12_000, chunks: [0] },
    { name: "./node_modules/@mui/material/Dialog/index.js", size: 18_000, chunks: [0] },
    { name: "./node_modules/@mui/material/Table/index.js",  size: 24_000, chunks: [0] },

    // 6. Duplicate react-dom — nested inside @mui
    { name: "./node_modules/@mui/material/node_modules/react-dom/index.js", size: 130_000, chunks: [0] },

    // 7. App code
    { name: "./src/components/Layout.tsx",                 size: 8_200,   chunks: [0] },
    { name: "./src/components/Header.tsx",                 size: 4_100,   chunks: [0] },
    { name: "./src/pages/index.tsx",                       size: 3_200,   chunks: [0] },

    // ── Dashboard chunk ────────────────────────────────────────────────────
    { name: "./node_modules/recharts/es/index.js",         size: 340_000, chunks: [1] },
    { name: "./node_modules/d3-shape/src/index.js",        size: 32_000,  chunks: [1] },
    { name: "./src/pages/dashboard.tsx",                   size: 12_000,  chunks: [1] },

    // ── Profile chunk ──────────────────────────────────────────────────────
    { name: "./node_modules/react-hook-form/dist/index.cjs.js", size: 23_000, chunks: [2] },
    { name: "./src/pages/profile.tsx",                     size: 8_000,   chunks: [2] },
  ],
  assets: [
    { name: "main.js",             size: 1_453_000, chunks: [0] },
    { name: "pages/dashboard.js",  size: 942_000,   chunks: [1] },
    { name: "pages/profile.js",    size: 187_000,   chunks: [2] },
    { name: "runtime.js",          size: 12_000,    chunks: [3] },
  ],
};

// ─── Trace data to cross-correlate ─────────────────────────────────────────────
// Pretend this came from trace-parser running on the same app
const traceData = {
  vitals: { fcp: 4200, lcp: 6800, tbt: 890 },
  bundleSignals: { jsBeforeFcpMs: 2340, largeInitialJS: true },
  scriptingBottlenecks: [
    { url: "chart.js/dist/chart.umd.js", totalExecutionMs: 820 },
    { url: "moment/moment.js", totalExecutionMs: 210 },
  ],
};

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  TraceLens — Bundle Analyzer Smoke Test");
  console.log("  (Simulated Next.js app with classic performance mistakes)");
  console.log("═══════════════════════════════════════════════════════\n");

  const t0 = Date.now();
  const result = analyze({
    webpackStats: syntheticWebpackStats as any,
    traceBottlenecks: traceData,
    framework: "next.js",
    projectName: "my-nextjs-app",
  });
  const elapsed = Date.now() - t0;

  console.log(`Analyzed in ${elapsed}ms | Data quality: ${result.dataQuality}`);

  // ── Bundle sizes ───────────────────────────────────────────────────────────
  console.log("\n── Bundle Sizes ─────────────────────────────────────");
  console.log(`  Initial JS     : ${result.initialBundleSizeKB}KB`);
  console.log(`  Async/Lazy JS  : ${result.asyncBundleSizeKB}KB`);
  console.log(`  Total          : ${result.totalBundleSizeKB}KB`);

  // ── Composition ───────────────────────────────────────────────────────────
  console.log("\n── Initial Bundle Composition ───────────────────────");
  const ic = result.initialComposition;
  console.log(`  Framework      : ${ic.frameworkKB}KB`);
  console.log(`  Third-party    : ${ic.thirdPartyKB}KB`);
  console.log(`  App code       : ${ic.appCodeKB}KB`);
  console.log(`  Unknown        : ${ic.unknownKB}KB`);
  if (ic.notableInitialDeps.length > 0) {
    console.log(`  Notable deps   :`);
    ic.notableInitialDeps.forEach((d) => console.log(`    • ${d}`));
  }

  // ── Largest dependencies ───────────────────────────────────────────────────
  console.log("\n── Largest Dependencies ─────────────────────────────");
  for (const dep of result.largestDependencies.slice(0, 8)) {
    const alt = dep.alternative ? ` → ${dep.alternative}` : "";
    const badge = dep.initial ? "[INITIAL]" : "[lazy]";
    console.log(`  ${badge} ${dep.name.padEnd(30)} ${String(dep.sizeKB).padStart(6)}KB  (${dep.category})${alt}`);
  }

  // ── Duplicate packages ─────────────────────────────────────────────────────
  console.log("\n── Duplicate Packages ───────────────────────────────");
  if (result.duplicatePackages.length === 0) {
    console.log("  None detected.");
  }
  for (const dup of result.duplicatePackages) {
    console.log(`  "${dup.name}" — ${dup.instances.length} copies, ~${dup.wastedKB}KB wasted [${dup.severity}]`);
    dup.instances.forEach((i) => console.log(`    • ${i.modulePath} (${i.sizeKB}KB)`));
  }

  // ── Route chunks ───────────────────────────────────────────────────────────
  console.log("\n── Route Chunks ─────────────────────────────────────");
  if (result.routeChunks.length === 0) {
    console.log("  None detected.");
  }
  for (const chunk of result.routeChunks) {
    const type = chunk.initial ? "initial" : "async";
    console.log(`  ${chunk.route.padEnd(20)} ${String(chunk.sizeKB).padStart(6)}KB  [${type}]`);
    if (chunk.topDependencies.length > 0) {
      console.log(`    └ top deps: ${chunk.topDependencies.map((d) => `${d.name}(${d.sizeKB}KB)`).join(", ")}`);
    }
  }

  // ── Performance signals ───────────────────────────────────────────────────
  console.log("\n── Performance Signals ──────────────────────────────");
  const ps = result.performanceSignals;
  console.log(`  Large initial JS       : ${ps.largeInitialJS}`);
  console.log(`  Hydration risk         : ${ps.hydrationRisk}`);
  console.log(`  3rd party in initial   : ${ps.thirdPartyInInitialBundle}`);
  console.log(`  Heavy date library     : ${ps.heavyDateLibrary}`);
  console.log(`  Chart lib in initial   : ${ps.chartLibraryInInitial}`);
  console.log(`  Unoptimized lodash     : ${ps.unoptimizedLodash}`);
  console.log(`  Significant duplication: ${ps.significantDuplication}`);
  console.log(`  Oversized route chunks : ${ps.oversizedRouteChunks}`);
  console.log(`  Estimated parse time   : ${ps.estimatedParseMs}ms`);

  // ── Hydration risk ────────────────────────────────────────────────────────
  console.log("\n── Hydration Risk ───────────────────────────────────");
  const hr = result.hydrationRisk;
  console.log(`  High risk              : ${hr.isHigh}`);
  console.log(`  Est. parse/eval time   : ${hr.estimatedJsParseMs}ms`);
  console.log(`  Heavy deps             : ${hr.heavyDeps.join(", ") || "none"}`);
  console.log(`  Has render-blocking    : ${hr.hasRenderBlockingDeps}`);

  // ── Correlation ───────────────────────────────────────────────────────────
  console.log("\n── Correlation (Bundle ↔ Runtime) ───────────────────");
  const c = result.correlations;
  console.log(`  Primary issue          : ${c.primaryIssue}`);
  console.log(`  Bundle causing slow FCP: ${c.bundleCausingSlowFcp}`);
  console.log(`  Bundle causing high TBT: ${c.bundleCausingHighTbt}`);
  console.log(`\n  Explanation:\n  ${c.explanation}`);

  // ── AI Signals ────────────────────────────────────────────────────────────
  console.log("\n── AI Signals ───────────────────────────────────────");
  result.aiSignals.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  // ── Save to disk ──────────────────────────────────────────────────────────
  const outputDir = join(".", "reports", "bundle");
  mkdirSync(outputDir, { recursive: true });
  const sessionId = result.analyzedAt.replace(/[:.TZ-]/g, "").slice(0, 15);
  const outputPath = join(outputDir, `${sessionId}-bundle-analysis.json`);
  const json = JSON.stringify(result, null, 2);
  writeFileSync(outputPath, json, "utf-8");

  console.log(`\n── Saved ────────────────────────────────────────────`);
  console.log(`  File : ${outputPath}`);
  console.log(`  Size : ${(json.length / 1024).toFixed(1)}KB`);
  console.log("\n✓ Bundle analyzer smoke test complete.\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
