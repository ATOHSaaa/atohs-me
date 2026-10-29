import { access, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import toIco from 'to-ico';

const SOURCE = join(process.cwd(), 'src/assets/site-logo.png');
const OUT = join(process.cwd(), 'public/src/favicon.ico');
const ICO_SIZES = [16, 32, 48, 128];

function circleMaskSvg(size) {
  const r = size / 2;
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`;
}

async function roundedSquarePng(source, size) {
  const mask = Buffer.from(circleMaskSvg(size));
  return sharp(source)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(SOURCE))) {
  throw new Error(`Site logo not found: ${SOURCE}`);
}

if ((await exists(OUT)) && !process.argv.includes('--force')) {
  const [sourceStat, outStat] = await Promise.all([stat(SOURCE), stat(OUT)]);
  if (sourceStat.mtimeMs <= outStat.mtimeMs) {
    console.log(`Favicon up to date → ${OUT}`);
    process.exit(0);
  }
}

const pngs = await Promise.all(ICO_SIZES.map((size) => roundedSquarePng(SOURCE, size)));
const ico = await toIco(pngs);
await writeFile(OUT, ico);
console.log(`Wrote circular favicon (${ICO_SIZES.join(', ')}px) → ${OUT}`);
