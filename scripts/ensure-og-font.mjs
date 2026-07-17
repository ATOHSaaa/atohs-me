import { mkdir, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const FONT_URL =
  'https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansCJKjp-Bold.otf';
const FONT_DIR = join(process.cwd(), 'src/assets/fonts');
const FONT_PATH = join(FONT_DIR, 'NotoSansCJKjp-Bold.otf');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (await exists(FONT_PATH)) {
  console.log('OG font already present.');
  process.exit(0);
}

console.log('Downloading OG font…');
await mkdir(FONT_DIR, { recursive: true });
const res = await fetch(FONT_URL);
if (!res.ok) {
  throw new Error(`Failed to download font: ${res.status} ${res.statusText}`);
}
const buffer = Buffer.from(await res.arrayBuffer());
await writeFile(FONT_PATH, buffer);
console.log(`Saved ${FONT_PATH} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
