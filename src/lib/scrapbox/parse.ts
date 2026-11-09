import type { MemoParseContext } from './link-context';
import { memoPagePath, memoTagPath } from './slug';
import { isValidMemoHashtag } from './tags';
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

function memoPageAnchor(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function memoEmptyLink(label: string): string {
  return `<span class="memo-empty-link">${escapeHtml(label)}</span>`;
}

function parseBracketContent(inner: string, ctx: MemoParseContext): string {
  const trimmed = inner.trim();
  if (trimmed.startsWith('*')) {
    const boldText = trimmed.slice(1).trimStart();
    return `<strong>${parseInline(boldText, ctx)}</strong>`;
  }

  const spaceIdx = trimmed.search(/\s/);
  if (spaceIdx > 0) {
    const label = trimmed.slice(0, spaceIdx);
    const rest = trimmed.slice(spaceIdx + 1).trim();
    if (isProbablyUrl(rest)) {
      return externalLink(rest, label);
    }
    const resolved = ctx.resolvePageTitle(rest);
    if (resolved) {
      return memoPageAnchor(memoPagePath(resolved.slug), label);
    }
    return memoEmptyLink(label);
  }

  if (isProbablyUrl(trimmed)) {
    const href = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
    if (isImageUrl(href)) {
      return `<figure class="memo-figure"><img src="${escapeHtml(href)}" alt="" loading="lazy" decoding="async" /></figure>`;
    }
    return externalLink(href, href);
  }

  const page = ctx.resolvePageTitle(trimmed);
  if (page) {
    return memoPageAnchor(memoPagePath(page.slug), trimmed);
  }

  return memoEmptyLink(trimmed);
}

function renderHashtag(tag: string, ctx: MemoParseContext): string {
  const safeTag = escapeHtml(tag);
  const page = ctx.resolvePageTitle(tag);
  if (page) {
    return `<a class="memo-hashtag" href="${escapeHtml(memoPagePath(page.slug))}">#${safeTag}</a>`;
  }
  return `<a class="memo-hashtag" href="${escapeHtml(memoTagPath(tag))}">#${safeTag}</a>`;
}

function parseInline(text: string, ctx: MemoParseContext): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const bracketStart = text.indexOf('[', i);
  const hashStart = text.indexOf('#', i);
    const nextSpecial =
      bracketStart === -1
        ? hashStart
        : hashStart === -1
          ? bracketStart
          : Math.min(bracketStart, hashStart);

    if (nextSpecial === -1) {
      out += escapeHtml(text.slice(i));
      break;
    }

    out += escapeHtml(text.slice(i, nextSpecial));

    if (nextSpecial === hashStart && (hashStart < bracketStart || bracketStart === -1)) {
      const tail = text.slice(hashStart + 1);
      const match = tail.match(/^([^\s#＃\[\]<>:=,，。、~]+)/u);
      if (match && isValidMemoHashtag(match[1])) {
        out += renderHashtag(match[1], ctx);
        i = hashStart + 1 + match[1].length;
        continue;
      }
      out += escapeHtml('#');
      i = hashStart + 1;
      continue;
    }

    const bracketEnd = text.indexOf(']', nextSpecial + 1);
    if (bracketEnd === -1) {
      out += escapeHtml(text.slice(nextSpecial));
      break;
    }
    const inner = text.slice(nextSpecial + 1, bracketEnd);
    out += parseBracketContent(inner, ctx);
    i = bracketEnd + 1;
  }

  return out;
}

interface OutlineNode {
  depth: number;
  html: string;
  type: 'item' | 'code';
}

function lineToHtml(body: string, ctx: MemoParseContext): string {
  return parseInline(body, ctx);
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
  _ctx: MemoParseContext,
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

function minContentIndent(
  title: string,
  lines: ScrapboxLine[],
): number {
  let min = Infinity;
  for (const line of lines) {
    const raw = line.text;
    const body = stripIndent(raw);
    if (!body || body === title) continue;
    min = Math.min(min, measureIndent(raw));
  }
  return Number.isFinite(min) ? min : 0;
}

export function renderScrapboxBody(
  title: string,
  lines: ScrapboxLine[],
  ctx: MemoParseContext,
): string {
  const indentBaseline = minContentIndent(title, lines);
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
    const depth = Math.max(0, indent - indentBaseline);
    const codeHeader = body.match(/^code(?::\S*)?$/i);
    if (codeHeader) {
      const block = parseCodeBlock(lines, i, indent, ctx);
      nodes.push({ depth, html: block.html, type: 'code' });
      i = block.nextIndex;
      continue;
    }
    nodes.push({
      depth,
      html: lineToHtml(body, ctx),
      type: 'item',
    });
    i += 1;
  }

  return buildOutlineHtml(nodes);
}

function plainTextFromScrapboxLine(body: string): string {
  return body
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/#\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function imageUrlFromBracketInner(inner: string): string | undefined {
  const trimmed = inner.trim();
  if (trimmed.startsWith('*')) return undefined;

  const spaceIdx = trimmed.search(/\s/);
  if (spaceIdx > 0) {
    const rest = trimmed.slice(spaceIdx + 1).trim();
    if (isProbablyUrl(rest)) {
      const href = rest.startsWith('//') ? `https:${rest}` : rest;
      return isImageUrl(href) ? href : undefined;
    }
  }

  if (isProbablyUrl(trimmed)) {
    const href = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
    return isImageUrl(href) ? href : undefined;
  }
  return undefined;
}

export function extractFirstImageUrl(
  lines: ScrapboxLine[],
  summaryImage?: string | null,
): string | undefined {
  const fromSummary = summaryImage?.trim();
  if (fromSummary) return fromSummary;

  for (const line of lines) {
    const body = stripIndent(line.text);
    for (const match of body.matchAll(/\[([^\]]+)\]/g)) {
      const url = imageUrlFromBracketInner(match[1]);
      if (url) return url;
    }
  }
  return undefined;
}

export function memoExcerptFromLines(
  title: string,
  lines: ScrapboxLine[],
  maxLines = 3,
  maxTotal = 220,
): string {
  const parts: string[] = [];
  for (const line of lines) {
    const body = stripIndent(line.text);
    if (!body || body === title) continue;
    if (/^code(?::\S*)?$/i.test(body)) continue;
    const plain = plainTextFromScrapboxLine(body);
    if (!plain) continue;
    parts.push(plain);
    if (parts.length >= maxLines) break;
  }
  const joined = parts.join(' ');
  if (!joined) return title;
  return joined.length <= maxTotal ? joined : `${joined.slice(0, maxTotal)}…`;
}

export function memoDescriptionFromLines(
  title: string,
  lines: ScrapboxLine[],
  maxLen = 120,
): string {
  const excerpt = memoExcerptFromLines(title, lines, 1, maxLen);
  if (excerpt === title) return title;
  return excerpt.length <= maxLen ? excerpt : `${excerpt.slice(0, maxLen)}…`;
}
