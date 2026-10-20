import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINK_CARD_DEFINITIONS } from '../src/lib/link-cards.config.js';
import { fetchOgpMetadata } from '../src/lib/fetch-ogp-metadata.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/data');
const outFile = join(outDir, 'link-card-ogp-cache.json');

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

mkdirSync(outDir, { recursive: true });

const cache = {};

for (const definition of LINK_CARD_DEFINITIONS) {
  const key = normalizeUrl(definition.url);
  cache[key] = await fetchOgpMetadata(definition.url, {
    fallback: definition.fallback,
  });
}

writeFileSync(outFile, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
console.log(`Updated link card OGP cache (${Object.keys(cache).length} entries).`);
