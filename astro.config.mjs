import { defineConfig } from 'astro/config';
import { remarkBracketUrlLinks } from './src/lib/remark-bracket-url-links.js';
import { remarkTwitterEmbeds } from './src/lib/remark-twitter-embeds.js';

export default defineConfig({
  site: 'https://atohs.me',
  output: 'static',
  markdown: {
    remarkPlugins: [remarkBracketUrlLinks, remarkTwitterEmbeds],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
