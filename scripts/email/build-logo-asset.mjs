/**
 * Generates the AutoCore mark used in transactional email mastheads.
 *
 *   node scripts/email/build-logo-asset.mjs
 *
 * The source brand file is red-on-white with no alpha channel, and the email masthead is
 * always the same ink band in light and dark mode. So rather than ship transparency —
 * which older Outlook renders as a black box — the white is unmixed back to coverage and
 * re-composited onto the masthead colour, producing a flat PNG that is correct everywhere.
 *
 * Output is committed so `npm run build` never depends on this script.
 */

import path from "node:path";
import process from "node:process";

import sharp from "sharp";

import { colors } from "../../packages/design-tokens/src/colors.ts";

const SOURCE = "assets/branding/login-logo-transparent.png";
const OUTPUT = "public/email/autocore-mark.png";

/** Brand red, sampled from the source artwork. */
const MARK = { r: 242, g: 29, b: 48 };
/** Masthead band — same value the email layout paints behind the lockup. */
const BAND = colors.dark.background;

/** Rendered at 3× the 36px display slot so it stays sharp on retina clients. */
const SIZE = 108;
/** Breathing room inside the square so the glyph is optically centred. */
const PADDING = 10;

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

const band = hexToRgb(BAND);

const source = await sharp(path.resolve(process.cwd(), SOURCE)).ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
});

const { data, info } = source;
const out = Buffer.alloc(info.width * info.height * 4);

for (let i = 0; i < info.width * info.height; i += 1) {
  const offset = i * info.channels;
  // Each pixel is a blend of MARK and white. Green separates them furthest, so it
  // recovers the coverage most accurately.
  const coverage = Math.max(0, Math.min(1, (255 - data[offset + 1]) / (255 - MARK.g)));
  const target = i * 4;
  out[target] = Math.round(MARK.r * coverage + band.r * (1 - coverage));
  out[target + 1] = Math.round(MARK.g * coverage + band.g * (1 - coverage));
  out[target + 2] = Math.round(MARK.b * coverage + band.b * (1 - coverage));
  out[target + 3] = 255;
}

const composited = sharp(out, {
  raw: { width: info.width, height: info.height, channels: 4 },
});

await composited
  .trim({ background: BAND, threshold: 12 })
  .resize(SIZE - PADDING * 2, SIZE - PADDING * 2, { fit: "contain", background: BAND })
  .extend({
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    right: PADDING,
    background: BAND,
  })
  .png({ compressionLevel: 9, palette: true })
  .toFile(path.resolve(process.cwd(), OUTPUT));

const meta = await sharp(path.resolve(process.cwd(), OUTPUT)).metadata();
console.log(`Wrote ${OUTPUT} — ${meta.width}x${meta.height}, ${meta.size} bytes, band ${BAND}`);
