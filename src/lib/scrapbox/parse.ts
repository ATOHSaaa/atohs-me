import { SCRAPBOX_PROJECT } from './config';
import { memoPagePath, memoSlugFromTitle } from './slug';
import type { ScrapboxLine } from './types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function measureIndent(raw: string): number {
  const m = raw.match(/^(\s*)/);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) {
    n += ch === '\t' ? 2 : 1;
  }
  return n;
}

function stripIndent(raw: string): string {
  return raw.replace(/^\s+/, '');
}

function isProbablyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^\/\//.test(value);
}

function isImageUrl(url: string): boolean {
  if (/gyazo\.com/i.test(url)) return true;
  if (/scrapbox\.io\/files\//i.test(url)) return true;
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

function externalLink(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<a href="${safeHref}" rel="noopener noreferrer" target="_blank">${safeLabel}</a>`;
}

function internalMemoLink(title: string, label: string): string {
  const slug = memoSlugFromTitle(title);
  const safeHref = escapeHtml(memoPagePath(slug));
  const safeLabel = escapeHtml(label);
  return `<a href="${safeHref}">${safeLabel}</a>`;
}

function parseBracketContent(
  inner: string,
  knownTitles: Set<string>,
): string {
  const trimmed = inner.trim();
  if (trimmed.startsWith('*')) {
    const boldText = trimmed.slice(1).trimStart();
    return `<strong>${parseInline(boldText, knownTitles)}</strong>`;
  }

  const spaceIdx = trimmed.search(/\s/);
  if (spaceIdx > 0) {
    const label = trimmed.slice(0, spaceIdx);
    const rest = trimmed.slice(spaceIdx + 1).trim();
    if (isProbablyUrl(rest)) {
      return externalLink(rest, label);
    }
    if (knownTitles.has(rest)) {
      return internalMemoLink(rest, label);
    }
    return externalLink(
      `https://scrapbox.io/${encodeURIComponent(SCRAPBOX_PROJECT)}/${encodeURIComponent(rest)}`,
      label,
    );
  }

  if (isProbablyUrl(trimmed)) {
    const href = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
    if (isImageUrl(href)) {
      return `<figure class="memo-figure"><img src="${escapeHtml(href)}" alt="" loading="lazy" decoding="async" /></figure>`;
    }
    return externalLink(href, href);
  }

  if (knownTitles.has(trimmed)) {
    return internalMemoLink(trimmed, trimmed);
  }

  return escapeHtml(`[${trimmed}]`);
}

function parseInline(text: string, knownTitles: Set<string>): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const bracketStart = text.indexOf('[', i);
    if (bracketStart === -1) {
      out += escapeHtml(text.slice(i));
      break;
    }
    out += escapeHtml(text.slice(i, bracketStart));
    const bracketEnd = text.indexOf(']', bracketStart + 1);
    if (bracketEnd === -1) {
      out += escapeHtml(text.slice(bracketStart));
      break;
    }
    const inner = text.slice(bracketStart + 1, bracketEnd);
    out += parseBracketContent(inner, knownTitles);
    i = bracketEnd + 1;
  }

  out = out.replace(
    /#([^\s#＃\[\]<>]+)/gu,
    '<span class="memo-hashtag">#$1</span>',
  );

  return out;
}

interface OutlineNode {
  depth: number;
  html: string;
  type: 'item' | 'code';
}

function lineToHtml(body: string, knownTitles: Set<string>): string {
  return parseInline(body, knownTitles);
}

function buildOutlineHtml(nodes: OutlineNode[]): string {
  let index = 0;

  function renderLevel(minDepth: number): string {
    if (index >= nodes.length) return '';
    if (nodes[index].depth < minDepth) return '';

    let html = '<ul class="memo-outline">';
    while (index < nodes.length && nodes[index].depth >= minDepth) {
      while (index < nodes.length && nodes[index].depth > minDepth) {
        html += renderLevel(minDepth + 1);
      }
      if (index >= nodes.length || nodes[index].depth < minDepth) break;

      const node = nodes[index];
      index += 1;
      const liClass = node.type === 'code' ? ' class="memo-code-item"' : '';
      html += `<li${liClass}>${node.html}`;

      if (index < nodes.length && nodes[index].depth > node.depth) {
        html += renderLevel(node.depth + 1);
      }
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  return renderLevel(0);
}

function parseCodeBlock(
  lines: ScrapboxLine[],
  startIndex: number,
  baseIndent: number,
  knownTitles: Set<string>,
): { html: string; nextIndex: number } {
  const header = stripIndent(lines[startIndex].text);
  const lang = header.replace(/^code:?/, '').trim();
  const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
  const codeLines: string[] = [];
  let i = startIndex + 1;
  while (i < lines.length) {
    const indent = measureIndent(lines[i].text);
    if (indent <= baseIndent) break;
    codeLines.push(stripIndent(lines[i].text));
    i += 1;
  }
  const code = escapeHtml(codeLines.join('\n'));
  const html = `<pre class="memo-code"><code${langClass}>${code}</code></pre>`;
  return { html, nextIndex: i };
}

export function renderScrapboxBody(
  title: string,
  lines: ScrapboxLine[],
  knownTitles: Set<string>,
): string {
  const nodes: OutlineNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i].text;
    const body = stripIndent(raw);
    if (body === title) {
      i += 1;
      continue;
    }
    const indent = measureIndent(raw);
    const codeHeader = body.match(/^code(?::\S*)?$/i);
    if (codeHeader) {
      const block = parseCodeBlock(lines, i, indent, knownTitles);
      nodes.push({ depth: indent, html: block.html, type: 'code' });
      i = block.nextIndex;
      continue;
    }
    nodes.push({
      depth: indent,
      html: lineToHtml(body, knownTitles),
      type: 'item',
    });
    i += 1;
  }

  return buildOutlineHtml(nodes);
}

export function memoDescriptionFromLines(
  title: string,
  lines: ScrapboxLine[],
  maxLen = 120,
): string {
  for (const line of lines) {
    const body = stripIndent(line.text);
    if (!body || body === title) continue;
    if (/^code(?::\S*)?$/i.test(body)) continue;
    const plain = body
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/#\S+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (plain.length > 0) {
      return plain.length <= maxLen ? plain : `${plain.slice(0, maxLen)}…`;
    }
  }
  return title;
}
