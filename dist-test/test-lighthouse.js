"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Smoke test for @tracelens/lighthouse-runner
 * Run with: npx tsx test-lighthouse.ts
 */
const index_js_1 = require("./packages/lighthouse-runner/src/index.js");
async function main() {
    const result = await (0, index_js_1.run)({
        routes: [
            { url: 'https://www.cnn.com' }
        ],
        preset: 'desktop',
        formats: ['json', 'html'],
        outputDir: './reports/lighthouse',
        runs: 1,
    });
    console.log('\n── Session Summary ──────────────────────────────────');
    console.log(`Session ID : ${result.sessionId}`);
    console.log(`Success    : ${result.success}`);
    console.log(`Duration   : ${result.durationMs}ms`);
    console.log(`Summary    : ${result.summaryPath}`);
    for (const route of result.routes) {
        console.log(`\nRoute: ${route.route.url}`);
        console.log(`  Successful runs : ${route.successfulRuns}/${route.totalRuns}`);
        const avg = route.averages;
        console.log(`  Perf score (avg): ${avg.performanceScore}`);
        console.log(`  LCP (avg)       : ${avg.lcp}ms`);
        console.log(`  FCP (avg)       : ${avg.fcp}ms`);
        console.log(`  TBT (avg)       : ${avg.tbt}ms`);
        console.log(`  CLS (avg)       : ${avg.cls}`);
        console.log(`  TTI (avg)       : ${avg.tti}ms`);
        console.log(`  TTFB (avg)      : ${avg.ttfb}ms`);
        for (const run of route.runs) {
            console.log(`\n  Run ${run.runIndex + 1}:`);
            console.log(`    JSON : ${run.artifacts.jsonPath}`);
            console.log(`    HTML : ${run.artifacts.htmlPath}`);
        }
    }
}
main().catch(console.error);
