import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

writeFileSync(join(stylesDir, 'core.css'), coreBody);
writeFileSync(join(stylesDir, 'blog-layout.css'), coreBody + blog);
