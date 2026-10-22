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

const home = main.slice(homeStart, keywordsStart);
const blog = main.slice(blogStart, notFoundStart) + main.slice(shareStart, responsiveStart);

const core =
  `@import './site-fonts.css';\n\n` +
  main.slice(0, homeStart) +
  main.slice(keywordsStart, blogStart) +
  main.slice(notFoundStart, shareStart) +
  main.slice(responsiveStart);

const fontFallbacks = generateFontFace(robotoMetrics, {
  name: 'Roboto fallback',
  font: 'Arial',
  metrics: arialMetrics,
  'font-display': 'swap',
});

writeFileSync(join(stylesDir, 'font-fallbacks.css'), fontFallbacks);
writeFileSync(join(stylesDir, 'core.css'), core);
writeFileSync(join(stylesDir, 'home.css'), home);
writeFileSync(join(stylesDir, 'blog.css'), blog);
