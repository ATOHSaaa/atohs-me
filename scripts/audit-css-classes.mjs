/**
 * 未使用の CSS クラス候補を一覧する（src/styles/main.css vs src/ テンプレート）。
 * 実行: node scripts/audit-css-classes.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const stylesPath = join(root, 'src/styles/main.css');
const css = readFileSync(stylesPath, 'utf8');

const classInCss = new Set();
for (const match of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) {
  classInCss.add(match[1]);
}

const srcDir = join(root, 'src');
const corpusFiles = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'styles') continue;
      walk(path);
      continue;
    }
    if (/\.(astro|md|ts|js|tsx|jsx)$/.test(name)) {
      corpusFiles.push(path);
    }
  }
}
walk(srcDir);

const classInSrc = new Set();
const patterns = [
  /class(?:Name)?=(?:{`([^`]+)`}|"([^"]+)"|'([^']+)')/g,
  /class:list=\{[^}]+\}/g,
];

for (const file of corpusFiles) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\bclass="([^"]+)"/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (token) classInSrc.add(token);
    }
  }
  for (const match of text.matchAll(/\bclass='([^']+)'/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (token) classInSrc.add(token);
    }
  }
  for (const match of text.matchAll(/class=\{`([^`]+)`\}/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (token) classInSrc.add(token);
    }
  }
  for (const match of text.matchAll(/['"]([a-zA-Z][a-zA-Z0-9_-]*)['"]\s*:/g)) {
    classInSrc.add(match[1]);
  }
  for (const match of text.matchAll(/\btag--\$\{/g)) {
    for (const size of ['lg', 'md', 'sm']) classInSrc.add(`tag--${size}`);
  }
  for (const match of text.matchAll(/classList\.(add|remove|toggle)\(['"]([^'"]+)['"]/g)) {
    classInSrc.add(match[2]);
  }
  for (const match of text.matchAll(/'((?:[a-z]+-)+[a-z0-9-]*)'/g)) {
    classInSrc.add(match[1]);
  }
  for (const match of text.matchAll(/querySelector(?:All)?\(['"]\.([^'"]+)['"]/g)) {
    classInSrc.add(match[1]);
  }
}

/** remark 等で生成されるクラス */
for (const generated of [
  'amazon-card',
  'amazon-card-link',
  'amazon-card-icon',
  'amazon-card-body',
  'amazon-card-label',
  'amazon-card-title',
  'amazon-card-meta',
  'amazon-card-arrow',
  'link-card',
  'link-card-link',
  'link-card--ogp',
  'link-card-footer',
  'link-card-body',
  'link-card-label',
  'link-card-title',
  'link-card-meta',
  'link-card-arrow',
  'link-card-ogp-media',
  'link-card-ogp-image',
  'link-card-ogp-placeholder',
  'link-card-ogp-placeholder-brand',
  'quote-source',
  'twitter-embed',
  'twitter-tweet',
  'twitter-tweet-rendered',
  'astro-code',
  'share-button-icon',
  'is-menu-open',
  'is-truncated',
]) {
  classInSrc.add(generated);
}

const ignore = new Set([
  'icon',
  'site',
  'root',
  '05em',
  '1em',
  '2em',
  '6em',
  '7em',
  '8em',
  '9em',
  '15em',
  '2px',
  '3px',
  '4px',
  '5px',
  '6px',
  '08em',
  '02em',
  '03em',
  '04em',
  '06em',
  '1px',
  '12em',
  '18em',
  '35em',
  '45em',
  '55em',
  '65em',
  '72em',
  '76em',
  '78em',
  '85em',
  '95em',
  '05em',
]);

const unused = [...classInCss]
  .filter((name) => !classInSrc.has(name) && !ignore.has(name))
  .sort();

console.log(`CSS classes in main.css: ${classInCss.size}`);
console.log(`Classes seen in src/ corpus: ${classInSrc.size}`);
console.log(`\nPossibly unused (${unused.length}):`);
for (const name of unused) {
  console.log(`  .${name}`);
}
