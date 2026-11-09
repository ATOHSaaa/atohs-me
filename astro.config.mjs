import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { remarkBracketUrlLinks } from './src/lib/remark-bracket-url-links.js';
import { remarkTwitterEmbeds } from './src/lib/remark-twitter-embeds.js';
import { remarkBracketFootnotes } from './src/lib/remark-bracket-footnotes.js';
import { remarkAmazonCards } from './src/lib/remark-amazon-cards.js';
import { remarkLinkCards } from './src/lib/remark-link-cards.js';
import rehypeSlug from 'rehype-slug';
import { rehypeExternalLinks } from './src/lib/rehype-external-links.js';
import { rehypeContentImages } from './src/lib/rehype-content-images.js';

function getBlogLastmodByPath() {
  const blogDir = './src/content/blog';
  const result = {};

  for (const entry of readdirSync(blogDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const content = readFileSync(join(blogDir, entry.name), 'utf-8');
    if (/^draft:\s*true\s*$/m.test(content)) continue;

    const pubDateMatch = content.match(/^pubDate:\s*(.+)$/m);
    if (!pubDateMatch) continue;

    const slug = entry.name.replace(/\.md$/, '');
    result[`/blog/${slug}/`] = new Date(pubDateMatch[1].trim());
  }

  return result;
}

function getMemoLastmodByPath() {
  const project = process.env.SCRAPBOX_PROJECT || 'atohs-memo';
  const cachePath = join(process.cwd(), '.scrapbox-cache', `${project}.json`);
  if (!existsSync(cachePath)) return {};

  try {
    const data = JSON.parse(readFileSync(cachePath, 'utf-8'));
    const result = { '/memo/': undefined };
    let latest = 0;

    for (const [title, entry] of Object.entries(data.pages ?? {})) {
      const updated = entry?.updated;
      if (typeof updated !== 'number') continue;
      latest = Math.max(latest, updated);
      const slug = encodeURIComponent(title);
      result[`/memo/${slug}/`] = new Date(updated * 1000);
    }

    if (latest > 0) {
      result['/memo/'] = new Date(latest * 1000);
    }

    return result;
  } catch {
    return {};
  }
}

const postLastmodByPath = getBlogLastmodByPath();
const memoLastmodByPath = getMemoLastmodByPath();
const lastmodByPath = { ...memoLastmodByPath, ...postLastmodByPath };

export default defineConfig({
  site: 'https://atohs.me',
  output: 'static',
  experimental: {
    incrementalBuild: true,
  },
  build: {
    // 小さなサイト CSS を HTML に埋め、PSI のレンダリングブロックを避ける
    inlineStylesheets: 'always',
  },
  redirects: {
    '/stats': '/blog/stats/',
    '/my-business-experience': '/resume#career',
    '/education': '/resume#education',
    '/career': '/resume#career',
    '/qualification': '/resume#qualification',
  },
  integrations: [
    sitemap({
      customPages: ['https://atohs.me/works/hanoi-clicker/'],
      filter: (page) => !/\/og\.png\/?$/.test(new URL(page).pathname),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const pubDate = lastmodByPath[path];
        if (pubDate) {
          return { ...item, lastmod: pubDate.toISOString() };
        }
        return item;
      },
    }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkBracketUrlLinks,
        remarkTwitterEmbeds,
        remarkAmazonCards,
        remarkLinkCards,
        remarkBracketFootnotes,
      ],
      rehypePlugins: [rehypeSlug, rehypeExternalLinks, rehypeContentImages],
    }),
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
