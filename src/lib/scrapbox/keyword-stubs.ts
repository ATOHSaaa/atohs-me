import { extractLinkTargets } from './extract-links';
import { memoSlugFromTitle } from './slug';
import { normalizeScrapboxKey } from './title-match';
import type { BuiltMemoPage, ScrapboxPageDetail } from './types';

/** 実メモ・タグページがなく、`[...]` 等で参照されているキーワード（Cosense の青リンク相当） */
export function collectBracketStubTargets(
  publishedDetails: readonly ScrapboxPageDetail[],
  existingPageKeys: ReadonlySet<string>,
  publishedTagKeys: ReadonlySet<string>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const detail of publishedDetails) {
    const knownKeys = new Set([
      ...existingPageKeys,
      ...publishedTagKeys,
    ]);
    for (const target of extractLinkTargets(
      detail.lines ?? [],
      detail.links,
      knownKeys,
    )) {
      if (target.source === 'hashtag') continue;
      if (existingPageKeys.has(target.key)) continue;
      if (publishedTagKeys.has(target.key)) continue;
      if (!map.has(target.key)) {
        map.set(target.key, target.display);
      }
    }
  }
  return map;
}

export function pageKeysSet(pages: readonly BuiltMemoPage[]): Set<string> {
  const keys = new Set<string>();
  for (const page of pages) {
    keys.add(normalizeScrapboxKey(page.title));
    keys.add(normalizeScrapboxKey(page.slug));
  }
  return keys;
}

function sortMemoSlugsByCreatedDesc(
  slugs: string[],
  pageBySlug: ReadonlyMap<string, BuiltMemoPage>,
): string[] {
  return [...slugs].sort((a, b) => {
    const pa = pageBySlug.get(a);
    const pb = pageBySlug.get(b);
    return (pb?.created ?? 0) - (pa?.created ?? 0);
  });
}

function stubTimestampsFromBacklinks(
  backSlugs: readonly string[],
  pageBySlug: ReadonlyMap<string, BuiltMemoPage>,
): { created: number; updated: number } {
  let created = Number.POSITIVE_INFINITY;
  let updated = 0;
  for (const slug of backSlugs) {
    const page = pageBySlug.get(slug);
    if (!page) continue;
    created = Math.min(created, page.created);
    updated = Math.max(updated, page.updated);
  }
  if (!Number.isFinite(created)) {
    return { created: 0, updated: 0 };
  }
  return { created, updated };
}

/** 本文のないキーワードページ（バックリンク一覧のみ） */
export function buildKeywordStubPages(
  stubTargets: Map<string, string>,
  targetIndex: ReadonlyMap<string, ReadonlySet<string>>,
  contentPages: readonly BuiltMemoPage[],
  globalCacheKey: string,
): BuiltMemoPage[] {
  const pageBySlug = new Map(contentPages.map((p) => [p.slug, p]));
  const usedSlugs = new Set(contentPages.map((p) => p.slug));
  const stubs: BuiltMemoPage[] = [];

  for (const [key, display] of stubTargets) {
    const slug = memoSlugFromTitle(display);
    if (usedSlugs.has(slug)) continue;
    usedSlugs.add(slug);

    const backSlugs = sortMemoSlugsByCreatedDesc(
      [...(targetIndex.get(key) ?? [])],
      pageBySlug,
    );
    const { created, updated } = stubTimestampsFromBacklinks(backSlugs, pageBySlug);
    const firstBack = backSlugs[0] ? pageBySlug.get(backSlugs[0]) : undefined;
    const excerpt =
      firstBack?.excerpt ??
      `キーワード「${display}」へのリンクがあるメモ一覧です。`;

    stubs.push({
      title: display,
      slug,
      created,
      updated,
      bodyHtml: '',
      description: excerpt,
      excerpt,
      cacheKey: `${globalCacheKey}:stub:${key}:${backSlugs.join(',')}`,
      keywordStub: true,
      outLinkSlugs: [],
      backLinkSlugs: backSlugs,
      twoHop: [],
      linkedTargets: [],
    });
  }

  return stubs;
}
