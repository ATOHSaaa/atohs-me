import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'astro/config';
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

const postLastmodByPath = getBlogLastmodByPath();

export default defineConfig({
  site: 'https://atohs.me',
  output: 'static',
  build: {
    // 小さなサイト CSS を HTML に埋め、PSI のレンダリングブロックを避ける
    inlineStylesheets: 'always',
  },
  redirects: {
    '/my-business-experience': '/career',
  },
  integrations: [
    sitemap({
      customPages: ['https://atohs.me/works/hanoi-clicker/'],
      filter: (page) => !page.endsWith('/og.png'),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const pubDate = postLastmodByPath[path];
        if (pubDate) {
          return { ...item, lastmod: pubDate.toISOString() };
        }
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkBracketUrlLinks,
      remarkTwitterEmbeds,
      remarkAmazonCards,
      remarkLinkCards,
      remarkBracketFootnotes,
    ],
    rehypePlugins: [rehypeSlug, rehypeExternalLinks, rehypeContentImages],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
