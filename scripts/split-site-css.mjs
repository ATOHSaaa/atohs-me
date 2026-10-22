import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import robotoMetrics from '@capsizecss/metrics/roboto';
import arialMetrics from '@capsizecss/metrics/arial';
import { generateFontFace } from 'fontaine';

const stylesDir = join(process.cwd(), 'src/styles');
const main = readFileSync(join(stylesDir, 'main.css'), 'utf8');

function sectionHeader(name) {
  return `/* ==========================================================================\n   ${name}\n   ========================================================================== */`;
}

function indexOfOrThrow(haystack, needle, label) {
  const index = haystack.indexOf(needle);
  if (index === -1) {
    throw new Error(`split-site-css: marker not found (${label})`);
  }
  return index;
}

const homeStart = indexOfOrThrow(main, '.home-profile {', 'home-start');
const keywordsStart = indexOfOrThrow(main, '.keywords-heading-row {', 'keywords-start');
const blogStart = indexOfOrThrow(main, sectionHeader('Blog'), 'blog');
const notFoundStart = indexOfOrThrow(main, sectionHeader('404'), '404');
const shareStart = indexOfOrThrow(main, sectionHeader('Share buttons'), 'share');
const responsiveStart = indexOfOrThrow(main, sectionHeader('Responsive'), 'responsive');
const responsiveBlogStart = indexOfOrThrow(
  main,
  sectionHeader('Responsive (blog)'),
  'responsive-blog',
);
const blogListStart = indexOfOrThrow(
  main,
  '.blog-list {\n  list-style: none;',
  'blog-list',
);
const blogBodyStart = indexOfOrThrow(
  main,
  '.blog-body {\n  font-weight: 400;',
  'blog-body',
);

const home = main.slice(homeStart, keywordsStart);
const blogListEssentials = main.slice(blogListStart, blogBodyStart);
const blog =
  main.slice(blogStart, blogListStart) +
  main.slice(blogBodyStart, notFoundStart) +
  main.slice(shareStart, responsiveStart) +
  main.slice(responsiveBlogStart);

const coreBody =
  main.slice(0, homeStart) +
  home +
  main.slice(keywordsStart, blogStart) +
  blogListEssentials +
  main.slice(notFoundStart, shareStart) +
  main.slice(responsiveStart, responsiveBlogStart);

const siteFontsImport = `@import './site-fonts.css';\n\n`;

const core = siteFontsImport + coreBody;
const blogLayout = siteFontsImport + coreBody + blog;

const fontFallbacks = generateFontFace(robotoMetrics, {
  name: 'Roboto fallback',
  font: 'Arial',
  metrics: arialMetrics,
  'font-display': 'swap',
});

writeFileSync(join(stylesDir, 'font-fallbacks.css'), fontFallbacks);
writeFileSync(join(stylesDir, 'core.css'), core);
writeFileSync(join(stylesDir, 'blog-layout.css'), blogLayout);
