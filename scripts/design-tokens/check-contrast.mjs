/**
 * Asserts the WCAG AA contract declared in packages/design-tokens/src/colors.ts.
 *
 * Every pair in `contrastContract` must clear its minimum (4.5:1 text, 3:1 non-text) in both schemes. Pairs that
 * are intentionally exempt live in KNOWN_WAIVERS with a written reason, so a
 * regression shows up as a new failure rather than a silently lowered bar.
 */
import process from 'node:process';

import {
  colorSchemes,
  contrastContract,
  getColors,
} from '../../packages/design-tokens/src/colors.ts';
import { contrastRatio, WCAG_AA_NORMAL } from '../../packages/design-tokens/src/contrast.ts';

/**
 * key: `${scheme}:${name}` — each needs a reason and a floor it still meets.
 * Keep this empty: a waiver is a known accessibility failure, not a fix.
 */
const KNOWN_WAIVERS = {};

let failures = 0;
let waived = 0;

for (const scheme of colorSchemes) {
  const palette = getColors(scheme);

  for (const { name, foreground, background, minimum } of contrastContract) {
    const required = minimum ?? WCAG_AA_NORMAL;
    const fg = palette[foreground];
    const bg = palette[background];
    const ratio = contrastRatio(fg, bg);

    if (ratio === null) {
      console.error(`✗ ${scheme}/${name}: non-hex token pair (${fg} on ${bg}) cannot be verified`);
      failures += 1;
      continue;
    }

    const waiver = KNOWN_WAIVERS[`${scheme}:${name}`];
    if (ratio >= required) {
      console.log(`✓ ${scheme}/${name}: ${ratio.toFixed(2)}:1`);
    } else if (waiver && ratio >= waiver.floor) {
      console.log(`~ ${scheme}/${name}: ${ratio.toFixed(2)}:1 (waived — ${waiver.reason})`);
      waived += 1;
    } else {
      console.error(
        `✗ ${scheme}/${name}: ${ratio.toFixed(2)}:1 is below ${required}:1 (${fg} on ${bg})`,
      );
      failures += 1;
    }
  }
}

const total = colorSchemes.length * contrastContract.length;
console.log(`\n${total - failures - waived}/${total} pairs pass AA, ${waived} waived, ${failures} failing.`);

if (failures > 0) process.exit(1);
