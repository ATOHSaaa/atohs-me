import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { generateHomeOgImage, OG_IMAGE_FILENAME } from '../src/lib/og-image.ts';

const outFile = join(process.cwd(), 'public', OG_IMAGE_FILENAME);
const force = process.argv.includes('--force');

function ensureOgFont() {
  const result = spawnSync('node', ['scripts/ensure-og-font.mjs'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  ensureOgFont();

  if (!force && existsSync(outFile)) {
    console.log(`skip home (${OG_IMAGE_FILENAME} exists, use --force)`);
    return;
  }

  const png = await generateHomeOgImage();
  writeFileSync(outFile, png);
  console.log(`wrote ${outFile}`);
}

await main();
