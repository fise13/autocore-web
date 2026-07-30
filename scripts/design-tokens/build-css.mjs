/**
 * Regenerates src/styles/design-tokens.css from the canonical token package.
 *
 * Run directly (`npm run tokens:build`) to write the file, or with `--check`
 * (`npm run tokens:check`) to fail when the committed file is stale.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { renderTokensCss } from '../../packages/design-tokens/src/css.ts';

const outputPath = path.join(process.cwd(), 'src/styles/design-tokens.css');
const expected = renderTokensCss();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  let actual = null;
  try {
    actual = await readFile(outputPath, 'utf8');
  } catch {
    console.error(`Missing ${outputPath}. Run: npm run tokens:build`);
    process.exit(1);
  }
  if (actual !== expected) {
    console.error(
      `${outputPath} is out of date with packages/design-tokens.\nRun: npm run tokens:build`,
    );
    process.exit(1);
  }
  console.log('design-tokens.css is up to date.');
} else {
  await writeFile(outputPath, expected, 'utf8');
  console.log(`Wrote ${outputPath}`);
}
