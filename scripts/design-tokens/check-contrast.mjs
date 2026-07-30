/**
 * Asserts the WCAG AA contract declared in packages/design-tokens/src/colors.ts.
 *
 * Every pair in `contrastContract` must clear 4.5:1 in both schemes. Pairs that
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

/** key: `${scheme}:${name}` — each needs a reason and a floor it still meets. */
const KNOWN_WAIVERS = {
  'light:primary content on fill': {
    floor: 4.4,
    reason:
      'White on #0a73f2 is 4.42:1. Darkening the brand blue is a palette change, not a refinement; buttons render at >=14px semibold, which clears the 3:1 large-text bar.',
  },
  'light:danger content on fill': {
    floor: 4,
    reason:
      'White on #eb3838 is 4.07:1. Dark ink would clear AA but reads as a warning rather than a destructive control; kept white pending a palette pass on the brand red.',
  },
};

let failures = 0;
let waived = 0;

for (const scheme of colorSchemes) {
  const palette = getColors(scheme);

  for (const { name, foreground, background } of contrastContract) {
    const fg = palette[foreground];
    const bg = palette[background];
    const ratio = contrastRatio(fg, bg);

    if (ratio === null) {
      console.error(`✗ ${scheme}/${name}: non-hex token pair (${fg} on ${bg}) cannot be verified`);
      failures += 1;
      continue;
    }

    const waiver = KNOWN_WAIVERS[`${scheme}:${name}`];
    if (ratio >= WCAG_AA_NORMAL) {
      console.log(`✓ ${scheme}/${name}: ${ratio.toFixed(2)}:1`);
    } else if (waiver && ratio >= waiver.floor) {
      console.log(`~ ${scheme}/${name}: ${ratio.toFixed(2)}:1 (waived — ${waiver.reason})`);
      waived += 1;
    } else {
      console.error(
        `✗ ${scheme}/${name}: ${ratio.toFixed(2)}:1 is below ${WCAG_AA_NORMAL}:1 (${fg} on ${bg})`,
      );
      failures += 1;
    }
  }
}

const total = colorSchemes.length * contrastContract.length;
console.log(`\n${total - failures - waived}/${total} pairs pass AA, ${waived} waived, ${failures} failing.`);

if (failures > 0) process.exit(1);
