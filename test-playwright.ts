/**
 * Smoke test for @tracelens/playwright-runner
 *
 * TARGET URL:
 *   Set TRACELENS_TEST_URL in your .env file — no need to edit this file.
 *   Default: http://localhost:3000
 *
 * Run:
 *   npx tsx test-playwright.ts
 */

import "dotenv/config";
import { run } from './packages/playwright-runner/src/index.js';

const TEST_URL = process.env["TRACELENS_TEST_URL"] ?? "http://localhost:3000";

console.log(`\n  Target URL : ${TEST_URL}`);
console.log(`  (Change this in .env → TRACELENS_TEST_URL)\n`);

async function main() {
  await run({
    routes: [
      { url: TEST_URL }
    ],
    device: 'desktop',
    outputDir: './reports'
  });

  console.log('Audit completed');
}

main().catch(console.error);