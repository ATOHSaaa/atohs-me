import { renderPlainWithAutoLinks } from '../memo-linking/plain-auto-link';
import type { MemoParseContext } from './link-context';
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

/** 括弧外テキスト: `https://…` を外部リンクにし、残りは辞書自動リンク */
const ABSOLUTE_URL_IN_PLAIN_RE = /https?:\/\/[^\s<>\[\]"'）\]、。]+/gi;

function renderPlainSegment(text: string, ctx: MemoParseContext): string {
  if (!text) return '';
  let out = '';
  let last = 0;
  for (const match of text.matchAll(ABSOLUTE_URL_IN_PLAIN_RE)) {
    const start = match.index ?? 0;
    out += renderPlainWithAutoLinks(text.slice(last, start), ctx);
    const url = match[0];
    out += externalLink(url, url);
    last = start + url.length;
  }
  out += renderPlainWithAutoLinks(text.slice(last), ctx);
  return out;
}

function memoInternalLink(href: string, label: string): string {
  return `<a class="memo-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

/** リンク先がないキーワード（赤・破線・非リンク） */
function memoUnlinkedKeyword(label: string): string {
  return `<span class="memo-unlinked">${escapeHtml(label)}</span>`;
}

function isKeywordStubTarget(
  target: ReturnType<MemoParseContext['resolveTarget']>,
): boolean {
  return target.kind === 'page' && target.page?.keywordStub === true;
}

function memoResolvedKeywordLink(
  target: ReturnType<MemoParseContext['resolveTarget']>,
  label: string,
): string {
  if (!target.href) {
    return memoUnlinkedKeyword(label);
  }
  if (isKeywordStubTarget(target)) {
    return `<a class="memo-link memo-unlinked" href="${escapeHtml(target.href)}">${escapeHtml(label)}</a>`;
  }
  return memoInternalLink(target.href, label);
}

function memoLinkLabelOrPlain(
  ctx: MemoParseContext,
  targetTitle: string,
  label: string,
): string {
  const target = ctx.resolveTarget(targetTitle);
  return memoResolvedKeywordLink(target, label);
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
    if (isProbablyUrl(label)) {
      return externalLink(label, rest || label);
    }
    if (isProbablyUrl(rest)) {
      return externalLink(rest, label);
    }
    if (/\shttps?:\/\//i.test(rest) || /\s\/\//.test(rest)) {
      const urlMatch = rest.match(/(?:https?:\/\/|\/\/)\S+/);
      if (urlMatch) {
        const href = urlMatch[0].startsWith('//')
          ? `https:${urlMatch[0]}`
          : urlMatch[0];
        return externalLink(href, label);
      }
      const labelTarget = ctx.resolveTarget(label);
      return memoResolvedKeywordLink(labelTarget, label);
    }
    const wholeTarget = ctx.resolveTarget(trimmed);
    if (wholeTarget.href) {
      return memoResolvedKeywordLink(wholeTarget, trimmed);
    }
    const restTarget = ctx.resolveTarget(rest);
    if (restTarget.href) {
      return memoLinkLabelOrPlain(ctx, rest, label);
    }
    return memoLinkLabelOrPlain(ctx, trimmed, trimmed);
  }

  if (isProbablyUrl(trimmed)) {
    const href = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
    if (isImageUrl(href)) {
      return '';
    }
    return externalLink(href, href);
  }

  return memoLinkLabelOrPlain(ctx, trimmed, trimmed);
}

function renderHashtag(tag: string, ctx: MemoParseContext): string {
  const safeTag = escapeHtml(tag);
  const target = ctx.resolveTarget(tag);
  if (!target.href) {
    return `<span class="memo-unlinked memo-hashtag">#${safeTag}</span>`;
  }
  const href = escapeHtml(target.href);
  if (isKeywordStubTarget(target)) {
    return `<a class="memo-link memo-unlinked memo-hashtag" href="${href}">#${safeTag}</a>`;
  }
  return `<a class="memo-link memo-hashtag" href="${href}">#${safeTag}</a>`;
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
      out += renderPlainSegment(text.slice(i), ctx);
      break;
    }

    out += renderPlainSegment(text.slice(i, nextSpecial), ctx);

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
    if (!body) {
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

function plainTextFromBracketInner(inner: string): string {
  const trimmed = inner.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('*')) {
    return trimmed.slice(1).trimStart();
  }

  const spaceIdx = trimmed.search(/\s/);
  if (spaceIdx > 0) {
    const label = trimmed.slice(0, spaceIdx).trim();
    const rest = trimmed.slice(spaceIdx + 1).trim();
    if (isProbablyUrl(label)) {
      if (isImageUrl(label)) return '';
      return rest || label;
    }
    if (isProbablyUrl(rest)) {
      if (isImageUrl(rest)) return '';
      return label;
    }
    return label;
  }

  if (isProbablyUrl(trimmed)) {
    return isImageUrl(trimmed) ? '' : '';
  }

  return trimmed;
}

function plainTextFromScrapboxLine(body: string): string {
  let out = body.replace(/\[([^\]]+)\]/g, (_, inner: string) => {
    const text = plainTextFromBracketInner(inner);
    return text || '';
  });

  let i = 0;
  while (i < out.length) {
    const hashStart = out.indexOf('#', i);
    if (hashStart === -1) break;
    const tail = out.slice(hashStart + 1);
    const match = tail.match(/^([^\s#＃\[\]<>:=,，。、~]+)/u);
    if (match && isValidMemoHashtag(match[1])) {
      out = `${out.slice(0, hashStart)} ${match[1]}${tail.slice(match[1].length)}`;
      i = hashStart + match[1].length + 2;
      continue;
    }
    i = hashStart + 1;
  }

  return out.replace(/\s+/g, ' ').trim();
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
