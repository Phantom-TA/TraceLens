/**
 * Smoke test for @tracelens/trace-parser
 *
 * Tests both input modes:
 *   1. Lighthouse LHR only (most common in TraceLens CI usage)
 *   2. LHR + HAR (richer analysis)
 *
 * Run with:
 *   npx tsc --project tsconfig.trace-parser-test.json
 *   node dist-test-parser/test-trace-parser.js
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parse } from "./packages/trace-parser/src/index.js";

// ─── Locate the most recent Lighthouse report ──────────────────────────────────

function findLatestLHRPath(): string | null {
  const base = "./reports/lighthouse";
  try {
    const sessions = readdirSync(base).sort().reverse();
    for (const session of sessions) {
      const sessionDir = join(base, session);
      const routes = readdirSync(sessionDir);
      for (const route of routes) {
        const jsonPath = join(sessionDir, route, "report.json");
        try {
          readFileSync(jsonPath); // existence check
          return jsonPath;
        } catch { /* skip */ }
      }
    }
  } catch { /* no reports yet */ }
  return null;
}

function findLatestHARPath(): string | null {
  const base = "./reports";
  try {
    const sessions = readdirSync(base).filter((s: string) => !s.startsWith("lighthouse") && !s.startsWith("trace")).sort().reverse();
    for (const session of sessions) {
      const routes = readdirSync(join(base, session));
      for (const route of routes) {
        const harPath = join(base, session, route, "network.har");
        try {
          readFileSync(harPath);
          return harPath;
        } catch { /* skip */ }
      }
    }
  } catch { /* */ }
  return null;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  TraceLens — Trace Parser Smoke Test");
  console.log("═══════════════════════════════════════════════════════\n");

  // ── Test 1: Parse from Lighthouse LHR ─────────────────────────────────────
  const lhrPath = findLatestLHRPath();
  if (!lhrPath) {
    console.error("No Lighthouse report found. Run test-lighthouse.ts first.");
    process.exit(1);
  }

  console.log(`Using LHR: ${lhrPath}`);
  const lhrContent = readFileSync(lhrPath, "utf-8");

  const harPath = findLatestHARPath();
  const harContent = harPath ? readFileSync(harPath, "utf-8") : undefined;
  if (harPath) console.log(`Using HAR: ${harPath}`);

  const t0 = Date.now();
  const result = parse({
    lhr: lhrContent,
    harJson: harContent,
    url: "https://www.cnn.com",
  });
  const elapsed = Date.now() - t0;

  // ── Print structured summary ───────────────────────────────────────────────
  console.log(`\nParsed in ${elapsed}ms | Data quality: ${result.dataQuality}`);

  console.log("\n── Core Web Vitals ──────────────────────────────────");
  const v = result.vitals;
  console.log(`  FCP        : ${v.fcp ?? "n/a"}ms`);
  console.log(`  LCP        : ${v.lcp ?? "n/a"}ms`);
  console.log(`  TBT        : ${v.tbt ?? "n/a"}ms`);
  console.log(`  CLS        : ${v.cls ?? "n/a"}`);
  console.log(`  TTI        : ${v.tti ?? "n/a"}ms`);
  console.log(`  TTFB       : ${v.ttfb ?? "n/a"}ms`);
  console.log(`  SpeedIndex : ${v.speedIndex ?? "n/a"}ms`);

  console.log("\n── Main Thread ──────────────────────────────────────");
  const mt = result.mainThread;
  console.log(`  TBT                : ${mt.totalBlockingMs}ms`);
  console.log(`  Total main-thread  : ${mt.totalMainThreadMs}ms`);
  console.log(`  Long tasks (>50ms) : ${mt.longTaskCount}`);
  console.log(`  Longest task       : ${mt.longestTaskMs}ms`);

  console.log("\n── Long Tasks ───────────────────────────────────────");
  if (result.largestLongTasks.length === 0) {
    console.log("  No long tasks detected.");
  }
  for (const t of result.largestLongTasks) {
    console.log(`  [${t.duration}ms] ${t.attribution} | script: ${t.script ?? "n/a"} | t=${t.startTime}ms`);
  }

  console.log("\n── LCP Candidate ────────────────────────────────────");
  const lcp = result.lcpCandidate;
  if (lcp) {
    console.log(`  Element      : ${lcp.element ?? "n/a"}`);
    console.log(`  Render time  : ${lcp.renderTime}ms`);
    console.log(`  Size         : ${lcp.sizeKB ?? "n/a"}KB`);
    console.log(`  Render-blocked: ${lcp.wasRenderBlocked}`);
    console.log(`  Source       : ${lcp.source}`);
  } else {
    console.log("  No LCP candidate detected.");
  }

  console.log("\n── Render-Blocking Resources ────────────────────────");
  if (result.renderBlockingResources.length === 0) {
    console.log("  None detected. ✓");
  }
  for (const r of result.renderBlockingResources) {
    console.log(`  [${r.type}] ${r.url} — blocks ~${r.blockingMs ?? "?"}ms, ${r.transferSizeKB ?? "?"}KB`);
  }

  console.log("\n── Hydration ────────────────────────────────────────");
  const h = result.hydration;
  if (h.detected) {
    console.log(`  Framework    : ${h.framework}`);
    console.log(`  Duration     : ${h.durationMs}ms`);
    console.log(`  FCP → Hydrate: ${h.fcpToHydrationMs ?? "n/a"}ms`);
  } else {
    console.log("  No hydration detected (static or non-framework site).");
  }

  console.log("\n── Scripting Bottlenecks ────────────────────────────");
  if (result.scriptingBottlenecks.length === 0) {
    console.log("  None detected.");
  }
  for (const s of result.scriptingBottlenecks.slice(0, 5)) {
    console.log(`  ${s.url} — ${s.totalExecutionMs}ms total (${s.evaluationCount} eval(s))`);
  }

  console.log("\n── Bundle Signals ───────────────────────────────────");
  const b = result.bundleSignals;
  console.log(`  JS before FCP    : ${b.jsBeforeFcpMs}ms`);
  console.log(`  Large initial JS : ${b.largeInitialJS}`);
  console.log(`  Heavy early JS   : ${b.heavyEarlyScripts}`);

  console.log("\n── Correlation ──────────────────────────────────────");
  const c = result.correlations;
  console.log(`  Primary bottleneck     : ${c.primaryBottleneck}`);
  console.log(`  LCP blocked by task    : ${c.lcpBlockedByLongTask}`);
  console.log(`  FCP blocked by resources: ${c.fcpBlockedByResources}`);
  console.log(`  Hydration delayed LCP  : ${c.hydrationDelayedLcp}`);
  console.log(`  Heavy JS before FCP    : ${c.heavyJsBeforeFcp}`);
  console.log(`\n  Explanation:\n  ${c.explanation}`);

  console.log("\n── AI Signals ───────────────────────────────────────");
  result.aiSignals.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  // ── Save to disk ────────────────────────────────────────────────────────────
  const outputDir = join(".", "reports", "parsed");
  mkdirSync(outputDir, { recursive: true });

  // Use sessionId from parsedAt timestamp so filenames are unique per run
  const sessionId = result.parsedAt.replace(/[:.TZ-]/g, "").slice(0, 15);
  const outputPath = join(outputDir, `${sessionId}-bottlenecks.json`);
  const json = JSON.stringify(result, null, 2);
  writeFileSync(outputPath, json, "utf-8");

  console.log(`\n── Saved Output ─────────────────────────────────────`);
  console.log(`  File : ${outputPath}`);
  console.log(`  Size : ${(json.length / 1024).toFixed(1)}KB`);

  console.log("\n── Raw JSON Preview (first 800 chars) ───────────────");
  console.log(json.slice(0, 800) + "\n  [...truncated]\n");

  console.log("✓ Trace parser smoke test complete.\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
