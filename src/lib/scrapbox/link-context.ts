import type { MemoLinkDictionary } from '../memo-linking/dictionary';
import type kuromoji from 'kuromoji';
import {
  memoPagePath,
  memoTagPath,
  normalizeMemoDailySlashTitle,
} from './slug';
import { normalizeScrapboxKey } from './title-match';
import type { BuiltMemoPage } from './types';

type KuromojiTokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

export type MemoTargetKind = 'page' | 'tag' | 'missing';

export interface ResolvedMemoTarget {
  display: string;
  key: string;
  kind: MemoTargetKind;
  href?: string;
  page?: BuiltMemoPage;
}

export interface MemoParseContext {
  resolvePageTitle(title: string): BuiltMemoPage | undefined;
  resolveTarget(display: string): ResolvedMemoTarget;
  linkDictionary?: MemoLinkDictionary;
  autoLinkPlainText?: boolean;
  kuromojiTokenizer?: KuromojiTokenizer;
}

export function buildMemoParseContext(
  publishedPages: BuiltMemoPage[],
  publishedTagKeys: ReadonlySet<string> = new Set(),
): MemoParseContext {
  const pageByKey = new Map<string, BuiltMemoPage>();
  for (const page of publishedPages) {
    const keys = new Set<string>([
      normalizeScrapboxKey(page.title),
      normalizeScrapboxKey(page.slug),
    ]);
    const slashDaily = normalizeMemoDailySlashTitle(page.title);
    if (slashDaily) {
      keys.add(normalizeScrapboxKey(slashDaily));
    }
    for (const key of keys) {
      pageByKey.set(key, page);
    }
  }

  const resolvePageTitle = (title: string): BuiltMemoPage | undefined =>
    pageByKey.get(normalizeScrapboxKey(title));

  const resolveTarget = (display: string): ResolvedMemoTarget => {
    const key = normalizeScrapboxKey(display);
    const page = pageByKey.get(key);
    if (page) {
      return {
        display,
        key,
        kind: 'page',
        href: memoPagePath(page.slug),
        page,
      };
    }
    if (publishedTagKeys.has(key)) {
      return {
        display,
        key,
        kind: 'tag',
        href: memoTagPath(display),
      };
    }
    return { display, key, kind: 'missing' };
  };

  return { resolvePageTitle, resolveTarget };
}
