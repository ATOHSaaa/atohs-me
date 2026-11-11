import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  generateCenteredPathOgImage,
  OG_IMAGE_FILENAME,
} from '../src/lib/og-image.ts';
import {
  PATH_OG_STATIC_PATHNAMES,
  blogTagDetailPathnames,
  keywordDetailPathnames,
  skillDetailPathnames,
} from '../src/lib/path-og-routes.ts';
import { pathLabelForOg, publicOgFilePath } from '../src/lib/path-og.ts';

const force = process.argv.includes('--force');
const blogDir = join(process.cwd(), 'src/content/blog');
const keywordsDir = join(process.cwd(), 'src/content/keywords');

function ensureOgFont() {
  const result = spawnSync('node', ['scripts/ensure-og-font.mjs'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function parseTags(frontmatter: string): string[] {
  const match = frontmatter.match(/^tags:\s*(.+)$/m);
  if (!match) return [];
  const raw = match[1].trim();
  if (raw.startsWith('[')) {
    return raw
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return raw.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function isDraft(frontmatter: string): boolean {
  return /^draft:\s*true\s*$/m.test(frontmatter);
}

function collectBlogTagNames(): string[] {
  const tags = new Set<string>();
  for (const file of readdirSync(blogDir)) {
    if (!file.endsWith('.md')) continue;
    const source = readFileSync(join(blogDir, file), 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) continue;
    const frontmatter = match[1];
    if (isDraft(frontmatter)) continue;
    for (const tag of parseTags(frontmatter)) {
      const normalized = tag.trim();
      if (normalized) tags.add(normalized);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b, 'ja'));
}

function collectKeywordSlugs(): string[] {
  return readdirSync(keywordsDir)
    .filter((file) => file.endsWith('.md') && file !== 'index.md')
    .map((file) => file.replace(/\.md$/, ''))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function collectAllPathnames(): string[] {
  const paths = new Set<string>([
    ...PATH_OG_STATIC_PATHNAMES,
    ...skillDetailPathnames(),
    ...keywordDetailPathnames(collectKeywordSlugs()),
    ...blogTagDetailPathnames(collectBlogTagNames()),
  ]);
  return [...paths].sort((a, b) => a.localeCompare(b, 'en'));
}

async function main() {
  ensureOgFont();

  let generated = 0;
  let skipped = 0;

  for (const pathname of collectAllPathnames()) {
    const outFile = publicOgFilePath(pathname);
    if (!force && existsSync(outFile)) {
      skipped += 1;
      console.log(`skip ${pathname} (${OG_IMAGE_FILENAME} exists)`);
      continue;
    }

    mkdirSync(dirname(outFile), { recursive: true });
    const label = pathLabelForOg(pathname);
    const png = await generateCenteredPathOgImage(label);
    writeFileSync(outFile, png);
    generated += 1;
    console.log(`wrote ${relative(process.cwd(), outFile)} (${label})`);
  }

  console.log(`Done. generated=${generated}, skipped=${skipped}`);
}

await main();
