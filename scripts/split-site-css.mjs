import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import robotoMetrics from '@capsizecss/metrics/roboto';
import notoSansJpMetrics from '@capsizecss/metrics/notoSansJP';
import arialMetrics from '@capsizecss/metrics/arial';
import { generateFontFace } from 'fontaine';

/** `src/lib/google-fonts.ts` と同じ URL（display=swap） */
const GOOGLE_FONT_WEIGHTS = [400, 500, 600, 700, 800, 900];
const googleFontsHref =
  `https://fonts.googleapis.com/css2?family=Roboto:wght@${GOOGLE_FONT_WEIGHTS.join(';')}` +
  `&family=Noto+Sans+JP:wght@${GOOGLE_FONT_WEIGHTS.join(';')}&display=swap`;

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
  `@import './google-fonts.css';\n\n` +
  main.slice(0, homeStart) +
  main.slice(keywordsStart, blogStart) +
  main.slice(notFoundStart, shareStart) +
  main.slice(responsiveStart);

const fontFallbacks =
  generateFontFace(robotoMetrics, {
    name: 'Roboto fallback',
    font: 'Arial',
    metrics: arialMetrics,
    'font-display': 'swap',
  }) +
  generateFontFace(notoSansJpMetrics, {
    name: 'Noto Sans JP fallback',
    font: 'Hiragino Sans',
    metrics: arialMetrics,
    'font-display': 'swap',
  });

writeFileSync(join(stylesDir, 'font-fallbacks.css'), fontFallbacks);
writeFileSync(
  join(stylesDir, 'google-fonts.css'),
  `@import './font-fallbacks.css';\n@import url(${JSON.stringify(googleFontsHref)});\n`,
);
writeFileSync(join(stylesDir, 'core.css'), core);
writeFileSync(join(stylesDir, 'home.css'), home);
writeFileSync(join(stylesDir, 'blog.css'), blog);
