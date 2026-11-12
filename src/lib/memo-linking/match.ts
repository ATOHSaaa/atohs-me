import { normalizeScrapboxKey } from '../scrapbox/title-match';
import { MEMO_LINK_STOPWORDS } from './config';
import type { MemoLinkDictionary } from './dictionary';

export interface DictionaryMatch {
  start: number;
  end: number;
  display: string;
  key: string;
}

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[0-9A-Za-z\u3040-\u30ff\u3400-\u9fff]/u.test(ch);
}

function okBoundary(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text[start - 1] : undefined;
  const after = end < text.length ? text[end] : undefined;
  if (isWordChar(before) && isWordChar(text[start])) return false;
  if (isWordChar(before) && /[A-Za-z]/.test(text[start] ?? '')) return false;
  if (isWordChar(after) && isWordChar(text[end - 1])) {
    if (/[A-Za-z0-9]/.test(text[end - 1]!) && /[A-Za-z0-9]/.test(after)) {
      return false;
    }
  }
  return true;
}

/**
 * プレーンテキスト上の最長一致（非重複）。
 * `offset` は行全体における開始位置。
 */
export function findDictionaryMatchesInPlain(
  plain: string,
  offset: number,
  dictionary: MemoLinkDictionary,
): DictionaryMatch[] {
  if (!plain) return [];
  const matches: DictionaryMatch[] = [];
  const used: boolean[] = new Array(plain.length).fill(false);

  for (const entry of dictionary.entries) {
    const { display, key } = entry;
    if (MEMO_LINK_STOPWORDS.has(key)) continue;
    let from = 0;
    while (from <= plain.length - display.length) {
      const idx = plain.indexOf(display, from);
      if (idx === -1) break;
      const start = idx;
      const end = idx + display.length;
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (used[i]) {
          overlaps = true;
          break;
        }
      }
      if (
        !overlaps &&
        okBoundary(plain, start, end) &&
        normalizeScrapboxKey(plain.slice(start, end)) === key
      ) {
        for (let i = start; i < end; i++) used[i] = true;
        matches.push({
          start: offset + start,
          end: offset + end,
          display,
          key,
        });
      }
      from = idx + 1;
    }
  }

  matches.sort((a, b) => a.start - b.start);
  return matches;
}
