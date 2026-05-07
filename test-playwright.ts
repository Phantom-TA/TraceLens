import { run } from './packages/playwright-runner/src';

async function main() {
  await run({
    routes: [
      {
        url: 'https://example.com'
      }
    ],

    device: 'desktop',

    outputDir: './reports'
  });

  console.log('Audit completed');
}

main();