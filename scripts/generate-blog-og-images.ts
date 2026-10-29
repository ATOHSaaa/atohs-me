import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { generateOgImage, OG_IMAGE_FILENAME } from '../src/lib/og-image.ts';

const blogDir = join(process.cwd(), 'src/content/blog');
const publicBlogDir = join(process.cwd(), 'public/blog');

const force = process.argv.includes('--force');
const slugFilter = process.argv.find((arg) => arg.startsWith('--slug='))?.slice('--slug='.length);

function listBlogMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listBlogMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function getFrontmatterField(frontmatter: string, key: string): string | undefined {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return undefined;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function parseTags(frontmatter: string): string[] {
  const raw = getFrontmatterField(frontmatter, 'tags');
  if (!raw) return [];
  if (raw.startsWith('[')) {
    return raw
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return raw.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function parseBlogPost(filePath: string) {
  const source = readFileSync(filePath, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const frontmatter = match[1];
  const title = getFrontmatterField(frontmatter, 'title');
  const pubDateRaw = getFrontmatterField(frontmatter, 'pubDate');
  if (!title || !pubDateRaw) return null;

  return {
    title,
    pubDate: new Date(pubDateRaw),
    tags: parseTags(frontmatter),
    draft: /^draft:\s*true\s*$/m.test(frontmatter),
  };
}

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

  let generated = 0;
  let skipped = 0;

  for (const filePath of listBlogMarkdownFiles(blogDir)) {
    const slug = relative(blogDir, filePath).replace(/\.md$/, '').replace(/\\/g, '/');
    if (slugFilter && slug !== slugFilter) continue;

    const post = parseBlogPost(filePath);
    if (!post || post.draft) continue;

    const outDir = join(publicBlogDir, slug);
    const outFile = join(outDir, OG_IMAGE_FILENAME);

    if (!force && existsSync(outFile)) {
      skipped += 1;
      console.log(`skip ${slug} (${OG_IMAGE_FILENAME} exists)`);
      continue;
    }

    mkdirSync(outDir, { recursive: true });
    const png = await generateOgImage(post.title, {
      tags: post.tags,
      pubDate: post.pubDate,
    });
    writeFileSync(outFile, png);
    generated += 1;
    console.log(`wrote ${relative(process.cwd(), outFile)}`);
  }

  console.log(`Done. generated=${generated}, skipped=${skipped}`);
}

await main();
