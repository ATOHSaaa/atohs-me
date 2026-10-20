import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cachePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../data/link-card-ogp-cache.json',
);

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

/** @type {Record<string, object> | null} */
let cache = null;

function loadCache() {
  if (cache) return cache;

  try {
    cache = JSON.parse(readFileSync(cachePath, 'utf8'));
  } catch {
    cache = {};
  }

  return cache;
}

export function getLinkCardOgpMetadata(url, fallback = {}) {
  const key = normalizeUrl(url);
  const stored = loadCache()[key] ?? {};

  return {
    url,
    ...fallback,
    ...stored,
  };
}
