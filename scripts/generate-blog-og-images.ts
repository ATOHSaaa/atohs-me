import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { generateOgImage, OG_IMAGE_FILENAME } from '../src/lib/og-image.ts';

const FIRST_MARKDOWN_IMAGE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;

function mimeForImageExt(ext: string): string | undefined {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return undefined;
  }
}

/** 拡張子と実データの両方を見る（`.png` なのに JPEG など） */
function mimeFromImageBuffer(buf: Buffer, filePath: string): string | undefined {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }
  if (buf.length >= 6 && buf.toString('ascii', 0, 3) === 'GIF') {
    return 'image/gif';
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return mimeForImageExt(extname(filePath));
}

async function loadImageDataUrl(absolutePath: string): Promise<string | undefined> {
  try {
    const buf = await readFile(absolutePath);
    const mime = mimeFromImageBuffer(buf, absolutePath);
    if (!mime) return undefined;
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return undefined;
  }
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseOgImageOverride(frontmatter: string): 'auto' | false | string {
  const match = frontmatter.match(/^ogImage:\s*(.+)$/m);
  if (!match) return 'auto';
  const raw = match[1].trim();
  if (raw === 'false') return false;
  return stripQuotes(raw);
}

function findFirstMarkdownImage(body: string): string | undefined {
  const match = body.match(FIRST_MARKDOWN_IMAGE);
  return match?.[1];
}

function resolveMarkdownImagePath(markdownPath: string, imageRef: string): string {
  const ref = imageRef.trim();
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return ref;
  }
  return resolve(dirname(markdownPath), ref);
}

async function resolveHeroImageDataUrl(
  filePath: string,
  frontmatter: string,
  body: string,
): Promise<string | undefined> {
  const override = parseOgImageOverride(frontmatter);
  if (override === false) return undefined;

  let imageRef: string | undefined;
  if (override !== 'auto') {
    imageRef = override;
  } else {
    imageRef = findFirstMarkdownImage(body);
  }
  if (!imageRef) return undefined;

  if (imageRef.startsWith('http://') || imageRef.startsWith('https://')) {
    return undefined;
  }

  const absolutePath = resolveMarkdownImagePath(filePath, imageRef);
  return loadImageDataUrl(absolutePath);
}

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
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const body = match[2];
  const title = getFrontmatterField(frontmatter, 'title');
  const pubDateRaw = getFrontmatterField(frontmatter, 'pubDate');
  if (!title || !pubDateRaw) return null;

  return {
    title,
    pubDate: new Date(pubDateRaw),
    tags: parseTags(frontmatter),
    draft: /^draft:\s*true\s*$/m.test(frontmatter),
    frontmatter,
    body,
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
    const heroImageSrc = await resolveHeroImageDataUrl(filePath, post.frontmatter, post.body);
    const png = await generateOgImage(post.title, {
      tags: post.tags,
      pubDate: post.pubDate,
      heroImageSrc,
    });
    writeFileSync(outFile, png);
    generated += 1;
    console.log(`wrote ${relative(process.cwd(), outFile)}`);
  }

  console.log(`Done. generated=${generated}, skipped=${skipped}`);
}

await main();
