import type { MemoParseContext } from '../scrapbox/link-context';
import { findDictionaryMatchesInPlain } from './match';
import { nounDictionarySpansInPlain } from './kuromoji';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function memoResolvedLink(
  ctx: MemoParseContext,
  display: string,
  label: string,
): string {
  const target = ctx.resolveTarget(display);
  if (!target.href) {
    return `<span class="memo-unlinked">${escapeHtml(label)}</span>`;
  }
  if (target.kind === 'page' && target.page?.keywordStub) {
    return `<a class="memo-link memo-unlinked" href="${escapeHtml(target.href)}">${escapeHtml(label)}</a>`;
  }
  return `<a class="memo-link" href="${escapeHtml(target.href)}">${escapeHtml(label)}</a>`;
}

function isLatinOrSpacedTerm(display: string): boolean {
  return /[A-Za-z]/.test(display) || /\s/.test(display);
}

function matchAllowedByKuromoji(
  plain: string,
  matchStart: number,
  matchEnd: number,
  ctx: MemoParseContext,
): boolean {
  if (!ctx.kuromojiTokenizer || !ctx.linkDictionary) return true;
  const nouns = nounDictionarySpansInPlain(
    plain,
    0,
    ctx.linkDictionary,
    ctx.kuromojiTokenizer,
  );
  return nouns.some((n) => n.start === matchStart && n.end === matchEnd);
}

/** Phase 3: プレーンテキスト断片を辞書＋kuromoji でリンク化 */
export function renderPlainWithAutoLinks(
  text: string,
  ctx: MemoParseContext,
): string {
  if (!text) return '';
  if (!ctx.autoLinkPlainText || !ctx.linkDictionary) {
    return escapeHtml(text);
  }

  const dict = ctx.linkDictionary;
  const longest = findDictionaryMatchesInPlain(text, 0, dict);
  const spans: { start: number; end: number; display: string }[] = [];

  for (const m of longest) {
    const relStart = m.start;
    const relEnd = m.end;
    if (isLatinOrSpacedTerm(m.display)) {
      spans.push({ start: relStart, end: relEnd, display: m.display });
      continue;
    }
    if (matchAllowedByKuromoji(text, relStart, relEnd, ctx)) {
      spans.push({ start: relStart, end: relEnd, display: m.display });
    }
  }

  if (spans.length === 0) return escapeHtml(text);

  spans.sort((a, b) => a.start - b.start);
  let html = '';
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    html += escapeHtml(text.slice(cursor, span.start));
    const slice = text.slice(span.start, span.end);
    html += memoResolvedLink(ctx, span.display, slice);
    cursor = span.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}
