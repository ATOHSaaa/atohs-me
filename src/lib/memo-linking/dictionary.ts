import { getKeywordEntries } from '../keywords';
import { isMemoDailyTitle } from '../scrapbox/slug';
import { normalizeScrapboxKey } from '../scrapbox/title-match';
import type { BuiltMemoPage, BuiltMemoTagIndex } from '../scrapbox/types';

export interface MemoLinkDictionaryEntry {
  display: string;
  key: string;
}

export interface MemoLinkDictionary {
  /** 表示語の長い順（最長一致用） */
  readonly entries: readonly MemoLinkDictionaryEntry[];
  readonly keyToDisplay: ReadonlyMap<string, string>;
}

function pushEntry(
  map: Map<string, string>,
  display: string,
): void {
  const trimmed = display.trim();
  if (trimmed.length < 2) return;
  if (isMemoDailyTitle(trimmed)) return;
  const key = normalizeScrapboxKey(trimmed);
  if (!key || map.has(key)) return;
  map.set(key, trimmed);
}

export function buildMemoLinkDictionaryFromParts(
  pages: readonly BuiltMemoPage[],
  tags: readonly BuiltMemoTagIndex[],
  keywordTitles: readonly string[],
): MemoLinkDictionary {
  const map = new Map<string, string>();

  for (const page of pages) {
    if (page.keywordStub) {
      pushEntry(map, page.title);
      continue;
    }
    if (!isMemoDailyTitle(page.title)) {
      pushEntry(map, page.title);
    }
  }

  for (const tag of tags) {
    pushEntry(map, tag.tag);
  }

  for (const title of keywordTitles) {
    pushEntry(map, title);
  }

  const entries = [...map.entries()]
    .map(([key, display]) => ({ display, key }))
    .sort((a, b) => b.display.length - a.display.length);

  return { entries, keyToDisplay: map };
}

export async function buildMemoLinkDictionary(
  pages: readonly BuiltMemoPage[],
  tags: readonly BuiltMemoTagIndex[],
): Promise<MemoLinkDictionary> {
  const keywords = await getKeywordEntries();
  const titles = keywords.map((e) => e.data.title);
  return buildMemoLinkDictionaryFromParts(pages, tags, titles);
}

export function memoLinkDictionaryCacheKey(dict: MemoLinkDictionary): string {
  return dict.entries.map((e) => e.key).join(',');
}
