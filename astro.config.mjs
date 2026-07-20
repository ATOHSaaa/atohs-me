import { defineConfig } from 'astro/config';
import { remarkBracketUrlLinks } from './src/lib/remark-bracket-url-links.js';

export default defineConfig({
  site: 'https://atohs.me',
  output: 'static',
  markdown: {
    remarkPlugins: [remarkBracketUrlLinks],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
