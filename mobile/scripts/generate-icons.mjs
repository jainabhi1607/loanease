#!/usr/bin/env node
/**
 * Generate proper PNG assets for Expo SDK 54 / Play Store from loanease_logo.png.
 *
 * The source logo is wide (1106×397) — a mark + wordmark. For square app icons we
 * crop to just the mark so it fills the canvas. The splash uses the full logo
 * since the canvas is tall and rectangular.
 *
 * Produces:
 *   icon.png            1024×1024 — square, mark only, on white
 *   adaptive-icon.png   1024×1024 — square, mark only, transparent (Android paints bg)
 *   splash.png          1242×2688 — full logo on transparent (Expo paints bg)
 *   favicon.png         48×48     — mark only, on white
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '../../node_modules/sharp/lib/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS = resolve(ROOT, 'assets');
const LOGO_PATH = resolve(ASSETS, 'loanease_logo.png');

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const fullLogo = readFileSync(LOGO_PATH);

// Trim transparent edges, then extract just the leftmost ~"mark" portion of the wordmark.
async function getMark() {
  const trimmed = await sharp(fullLogo).trim({ background: TRANSPARENT, threshold: 10 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  // The mark occupies the leftmost ~30% of the horizontal width on this logo.
  const markWidth = Math.round(meta.width * 0.305);
  const cropped = await sharp(trimmed)
    .extract({ left: 0, top: 0, width: markWidth, height: meta.height })
    .toBuffer();
  // Trim residual transparent padding around the mark.
  return sharp(cropped).trim({ background: TRANSPARENT, threshold: 10 }).toBuffer();
}

async function compositeCentered(source, canvasW, canvasH, background, scale, outFile) {
  const targetSide = Math.round(Math.min(canvasW, canvasH) * scale);
  const rendered = await sharp(source)
    .resize({ width: targetSide, height: targetSide, fit: 'inside', background: TRANSPARENT })
    .png()
    .toBuffer();
  const meta = await sharp(rendered).metadata();

  await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background },
  })
    .composite([
      {
        input: rendered,
        top: Math.round((canvasH - meta.height) / 2),
        left: Math.round((canvasW - meta.width) / 2),
      },
    ])
    .png()
    .toFile(resolve(ASSETS, outFile));

  console.log(`✓ ${outFile}  (${canvasW}×${canvasH})`);
}

async function reEncodeLogoPng() {
  // logo.png exists as a JPG renamed to .png with the vertical Loanease lockup.
  // Re-encode it as a real PNG without altering the design.
  const src = readFileSync(resolve(ASSETS, 'logo.png'));
  await sharp(src).png().toFile(resolve(ASSETS, 'logo.png.tmp'));
  // Sharp can't overwrite a file it's reading from, so we use a temp then rename.
  const { renameSync } = await import('node:fs');
  renameSync(resolve(ASSETS, 'logo.png.tmp'), resolve(ASSETS, 'logo.png'));
  console.log('✓ logo.png  (re-encoded to real PNG)');
}

async function main() {
  const mark = await getMark();

  // icon.png — opaque white square, mark fills 78% of the canvas.
  await compositeCentered(mark, 1024, 1024, WHITE, 0.78, 'icon.png');

  // adaptive-icon.png — transparent, mark fits inside the safe zone (~62% of canvas).
  await compositeCentered(mark, 1024, 1024, TRANSPARENT, 0.62, 'adaptive-icon.png');

  // splash.png — full logo, transparent canvas (Expo paints bg from app.json).
  await compositeCentered(fullLogo, 1242, 2688, TRANSPARENT, 0.65, 'splash.png');

  // favicon.png — small mark, opaque white.
  await compositeCentered(mark, 48, 48, WHITE, 0.88, 'favicon.png');

  // logo.png — used by the in-app loading screen; just fix the file format.
  await reEncodeLogoPng();

  console.log('\nAll assets regenerated in', ASSETS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
