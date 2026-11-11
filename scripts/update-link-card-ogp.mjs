import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINK_CARD_DEFINITIONS } from '../src/lib/link-cards.config.js';
import { fetchOgpMetadata } from '../src/lib/fetch-ogp-metadata.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/data');
const outFile = join(outDir, 'link-card-ogp-cache.json');
const force = process.argv.includes('--force');

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    const path = parsed.pathname.replace(/\/$/, '') || '';
    return `${parsed.origin}${path}`;
  } catch {
    return url;
  }
}

function loadCache() {
  if (!existsSync(outFile)) return {};
  try {
    return JSON.parse(readFileSync(outFile, 'utf8'));
  } catch {
    return {};
  }
}

mkdirSync(outDir, { recursive: true });

const cache = loadCache();
let updated = 0;
let skipped = 0;

for (const definition of LINK_CARD_DEFINITIONS) {
  const key = normalizeUrl(definition.url);
  if (!force && cache[key]?.url) {
    skipped += 1;
    continue;
  }

  cache[key] = await fetchOgpMetadata(definition.url, {
    fallback: definition.fallback,
  });
  updated += 1;
}

if (updated > 0) {
  writeFileSync(outFile, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  console.log(`Updated link card OGP cache (${updated} refreshed, ${skipped} skipped).`);
} else {
  console.log(`Link card OGP cache up to date (${skipped} entries).`);
}
