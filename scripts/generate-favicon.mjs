import { access, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SOURCE = join(process.cwd(), 'src/assets/site-logo.png');
const OUT = join(process.cwd(), 'public/src/favicon.ico');
/** OGP ヘッダー行のアイコン（`src/lib/og-image.ts` の `BRAND_ICON_SIZE` と一致） */
const OG_BRAND_ICON_SIZE = 56;
const OUT_OG_BRAND = join(
  process.cwd(),
  `src/assets/site-logo-circle-${OG_BRAND_ICON_SIZE}.png`,
);
const ICO_SIZES = [16, 32, 48, 128];

function circleMaskSvg(size) {
  const r = size / 2;
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function needsRegenerate() {
  if (process.argv.includes('--force')) return true;
  if (!(await exists(OUT)) || !(await exists(OUT_OG_BRAND))) return true;

  const sourceStat = await stat(SOURCE);
  const [outStat, ogBrandStat] = await Promise.all([stat(OUT), stat(OUT_OG_BRAND)]);
  const newestGenerated = Math.max(outStat.mtimeMs, ogBrandStat.mtimeMs);
  return sourceStat.mtimeMs > newestGenerated;
}

if (!(await exists(SOURCE))) {
  throw new Error(`Site logo not found: ${SOURCE}`);
}

if (!(await needsRegenerate())) {
  console.log(`Favicon and OGP brand icon up to date → ${OUT}, ${OUT_OG_BRAND}`);
  process.exit(0);
}

const sharp = (await import('sharp')).default;
const toIco = (await import('to-ico')).default;

async function roundedSquarePng(source, size) {
  const mask = Buffer.from(circleMaskSvg(size));
  return sharp(source)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

const [ogBrandPng, ...icoPngs] = await Promise.all([
  roundedSquarePng(SOURCE, OG_BRAND_ICON_SIZE),
  ...ICO_SIZES.map((size) => roundedSquarePng(SOURCE, size)),
]);
const ico = await toIco(icoPngs);
await Promise.all([writeFile(OUT, ico), writeFile(OUT_OG_BRAND, ogBrandPng)]);
console.log(`Wrote circular favicon (${ICO_SIZES.join(', ')}px) → ${OUT}`);
console.log(`Wrote OGP brand icon (${OG_BRAND_ICON_SIZE}px) → ${OUT_OG_BRAND}`);
