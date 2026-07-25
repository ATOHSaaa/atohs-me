import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { remarkBracketUrlLinks } from './src/lib/remark-bracket-url-links.js';
import { remarkTwitterEmbeds } from './src/lib/remark-twitter-embeds.js';

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
  integrations: [
    sitemap({
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
    remarkPlugins: [remarkBracketUrlLinks, remarkTwitterEmbeds],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
