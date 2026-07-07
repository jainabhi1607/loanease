// Build Play Store marketing screenshots: orange/yellow gradient background +
// cursive title + device frame around each raw app screenshot.
// Usage: node scripts/build-store-images.mjs            (build all)
//        node scripts/build-store-images.mjs preview    (build only first phone + tablet into store-assets/preview/)
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');          // mobile/
const ASSETS = path.join(ROOT, 'store-assets');
const RAW = path.join(ASSETS, 'raw');                // backed-up source screenshots
const TITLE_FONT = 'Lucida Handwriting';

const JOBS = [
  { src: 'mobile/5080.jpg',         out: 'mobile/5080.jpg',         title: 'Track Your\nLoan Pipeline',  type: 'phone'  },
  { src: 'mobile/5085.jpg',         out: 'mobile/5085.jpg',         title: 'Secure\nBiometric Login',    type: 'phone'  },
  { src: 'mobile/5120.jpg',         out: 'mobile/5120.jpg',         title: 'Manage\nYour Profile',       type: 'phone'  },
  { src: 'tablet/tablet-7inch-1.jpg',  out: 'tablet/tablet-7inch-1.jpg',  title: 'Submit Leads\nIn Minutes',  type: 'tablet' },
  { src: 'tablet/tablet-7inch-2.jpg',  out: 'tablet/tablet-7inch-2.jpg',  title: 'Grow Your\nReferrals',      type: 'tablet' },
  { src: 'tablet/tablet-10inch-1.jpg', out: 'tablet/tablet-10inch-1.jpg', title: 'Quick & Easy\nLogin',       type: 'tablet' },
  { src: 'tablet/tablet-10inch-2.jpg', out: 'tablet/tablet-10inch-2.jpg', title: 'Everything\nIn One Place',  type: 'tablet' },
];

const r = Math.round;

function backgroundSvg(W, H) {
  // Golden-yellow (top) -> orange -> red-orange (bottom) with subtle low-poly facets.
  const tri = (pts, fill, op) =>
    `<polygon points="${pts.map(([x, y]) => `${r(x * W)},${r(y * H)}`).join(' ')}" fill="${fill}" fill-opacity="${op}"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0"    stop-color="#FFC629"/>
        <stop offset="0.45" stop-color="#FB851F"/>
        <stop offset="1"    stop-color="#F23A1C"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${tri([[0,0],[0.55,0],[0,0.32]], '#ffffff', 0.06)}
    ${tri([[1,0],[1,0.40],[0.45,0]], '#ffffff', 0.04)}
    ${tri([[0,0.55],[0.40,1],[0,1]], '#7a1604', 0.07)}
    ${tri([[1,0.50],[1,1],[0.45,1]], '#7a1604', 0.05)}
    ${tri([[1,0.62],[1,1],[0.70,1]], '#ffffff', 0.04)}
    ${tri([[0,0.30],[0.30,0.62],[0,0.66]], '#ffffff', 0.03)}
  </svg>`);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function renderTitle(text, boxW, boxH, color) {
  return sharp({
    text: {
      text: `<span foreground="${color}" font_weight="bold">${esc(text)}</span>`,
      font: TITLE_FONT,
      rgba: true,
      width: boxW,
      height: boxH,
      align: 'center',
      spacing: r(boxH * 0.05),
    },
  }).png().toBuffer();
}

function bodySvg(W, H, PX, PY, PW, PH, bezel, outerR, screenW, screenH, screenR) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#34383d"/>
        <stop offset="1" stop-color="#15181b"/>
      </linearGradient>
      <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="${r(PH * 0.012)}" stdDeviation="${r(PW * 0.045)}" flood-color="#3a0c00" flood-opacity="0.40"/>
      </filter>
    </defs>
    <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${outerR}" ry="${outerR}" fill="url(#body)" filter="url(#sh)"/>
    <rect x="${PX + bezel}" y="${PY + bezel}" width="${screenW}" height="${screenH}" rx="${screenR}" ry="${screenR}" fill="#000000"/>
  </svg>`);
}

async function roundedShot(srcPath, w, h, radius) {
  const shot = await sharp(srcPath).resize(w, h, { fit: 'cover', position: 'top' }).toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`);
  return sharp(shot).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

async function build(job, outDir) {
  const srcPath = path.join(RAW, job.src);
  const meta = await sharp(srcPath).metadata();
  const W = meta.width, H = meta.height;
  const isTablet = job.type === 'tablet';

  // Title region
  const titleTop = r(H * 0.035);
  const titleBoxH = r(H * (isTablet ? 0.12 : 0.13));
  const titleBoxW = r(W * 0.86);
  const gap = r(H * 0.02);

  // Device geometry
  const widthRatio = isTablet ? 0.64 : 0.78;
  const PW = r(W * widthRatio);
  const bezel = r(W * (isTablet ? 0.018 : 0.022));
  const outerR = r(W * (isTablet ? 0.05 : 0.085));
  const screenW = PW - 2 * bezel;
  const screenH = r(screenW * (H / W));
  const screenR = Math.max(4, outerR - r(bezel * 0.6));
  const PH = screenH + 2 * bezel;
  const PX = r((W - PW) / 2);

  // Center device vertically in the area below the title
  const regionTop = titleTop + titleBoxH + gap;
  const avail = H - regionTop;
  const PY = PH < avail ? r(regionTop + (avail - PH) / 2) : regionTop;

  const bg = await sharp(backgroundSvg(W, H)).png().toBuffer();
  const body = await sharp(bodySvg(W, H, PX, PY, PW, PH, bezel, outerR, screenW, screenH, screenR)).png().toBuffer();
  const shot = await roundedShot(srcPath, screenW, screenH, screenR);

  // Title: dark shadow copy + white on top, centered in title box
  const titleW = await renderTitle(job.title, titleBoxW, titleBoxH, '#ffffff');
  const titleS = await renderTitle(job.title, titleBoxW, titleBoxH, '#7a1604');
  const tMeta = await sharp(titleW).metadata();
  const titleX = r((W - tMeta.width) / 2);
  const titleY = r(titleTop + (titleBoxH - tMeta.height) / 2);

  const composed = await sharp(bg)
    .composite([
      { input: body, left: 0, top: 0 },
      { input: shot, left: PX + bezel, top: PY + bezel },
      { input: titleS, left: titleX + r(W * 0.004), top: titleY + r(H * 0.003), opacity: 0.35 },
      { input: titleW, left: titleX, top: titleY },
    ])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const outPath = path.join(outDir, job.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, composed);
  console.log(`✓ ${job.out}  ${W}x${H}  device ${PW}x${PH} @ (${PX},${PY})`);
}

const mode = process.argv[2];
const jobs = mode === 'preview'
  ? [JOBS[0], JOBS[3]]
  : JOBS;
const outDir = mode === 'preview' ? path.join(ASSETS, 'preview') : ASSETS;

for (const job of jobs) {
  await build(job, outDir);
}
console.log('Done.');
