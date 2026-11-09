import { getScrapboxPublishTag } from './config';
import {
  loadMemoContentEntries,
  memoContentGlobalCacheKey,
  scrapboxDetailFromMemoEntry,
} from './load-memo-content';
import { extractLinkTargets } from './extract-links';
import { buildMemoParseContext } from './link-context';
import { computePageLinkSections } from './link-graph';
import {
  memoDescriptionFromLines,
  memoExcerptFromLines,
  renderScrapboxBody,
} from './parse';
import {
  memoSlugFromMemoEntry,
  memoTagPath,
} from './slug';
import { collectHashtagsFromLines, pageHasHashtag } from './tags';
import { normalizeScrapboxKey } from './title-match';
import type {
  BuiltMemoPage,
  BuiltMemoTagIndex,
  MemoBuildResult,
  ScrapboxPageDetail,
} from './types';

const PRIVATE_TAG = 'private';

function shouldIncludePage(lineTexts: string[]): boolean {
  if (pageHasHashtag(lineTexts, PRIVATE_TAG)) {
    return false;
  }
  const publishTag = getScrapboxPublishTag();
  if (publishTag) {
    return pageHasHashtag(lineTexts, publishTag);
  }
  return true;
}

let memoBuildPromise: Promise<MemoBuildResult> | undefined;

export function loadMemosForBuild(): Promise<MemoBuildResult> {
  if (!memoBuildPromise) {
    memoBuildPromise = buildMemos();
  }
  return memoBuildPromise;
}

function buildTagIndex(
  publishedDetails: ScrapboxPageDetail[],
  publishedSlugs: Map<string, string>,
): BuiltMemoTagIndex[] {
  const publishedTitleKeys = new Set(
    publishedDetails.map((d) => normalizeScrapboxKey(d.title)),
  );
  const tagMap = new Map<string, { display: string; slugs: Set<string> }>();

  for (const detail of publishedDetails) {
    const slug = publishedSlugs.get(detail.title)!;
    const lineTexts = detail.lines?.map((l) => l.text) ?? [];
    for (const tag of collectHashtagsFromLines(lineTexts)) {
      const key = normalizeScrapboxKey(tag);
      if (publishedTitleKeys.has(key)) continue;
      const entry = tagMap.get(key) ?? { display: tag, slugs: new Set() };
      entry.slugs.add(slug);
      tagMap.set(key, entry);
    }
  }

  const createdBySlug = new Map(
    publishedDetails.map((d) => [publishedSlugs.get(d.title)!, d.created] as const),
  );

  return [...tagMap.entries()].map(([key, { display, slugs }]) => ({
    tag: display,
    slug: display,
    key,
    pageSlugs: [...slugs].sort(
      (a, b) => (createdBySlug.get(b) ?? 0) - (createdBySlug.get(a) ?? 0),
    ),
    cacheKey: `${[...slugs].join(',')}:${display}`,
  }));
}

async function buildMemos(): Promise<MemoBuildResult> {
  const entries = await loadMemoContentEntries();
  const entryByTitle = new Map(
    entries.map((entry) => [
      scrapboxDetailFromMemoEntry(entry).title,
      entry,
    ] as const),
  );
  const globalCacheKey = memoContentGlobalCacheKey(entries);

  const details = entries.map(scrapboxDetailFromMemoEntry);

  const publishedDetails = details.filter((detail) => {
    const lineTexts = detail.lines?.map((l) => l.text) ?? [];
    return shouldIncludePage(lineTexts);
  });

  const publishedSlugs = new Map(
    publishedDetails.map((d) => {
      const entry = entryByTitle.get(d.title)!;
      return [d.title, memoSlugFromMemoEntry(d.title, entry.id)] as const;
    }),
  );

  const targetRows = publishedDetails.map((detail) => ({
    slug: publishedSlugs.get(detail.title)!,
    targets: extractLinkTargets(detail.lines ?? [], detail.links),
  }));

  const targetIndex = new Map<string, Set<string>>();
  for (const row of targetRows) {
    for (const target of row.targets) {
      if (!targetIndex.has(target.key)) targetIndex.set(target.key, new Set());
      targetIndex.get(target.key)!.add(row.slug);
    }
  }

  const pages: BuiltMemoPage[] = [];

  for (const detail of publishedDetails) {
    const slug = publishedSlugs.get(detail.title)!;
    const targets = extractLinkTargets(detail.lines ?? [], detail.links);
    const entry = entryByTitle.get(detail.title)!;
    const cacheKey = `${String(entry.digest)}:${globalCacheKey}:${detail.updated}:${targets.map((t) => t.key).join(',')}`;

    const stub: BuiltMemoPage = {
      title: detail.title,
      slug,
      created: detail.created,
      updated: detail.updated,
      bodyHtml: '',
      description: '',
      excerpt: '',
      cacheKey,
      outLinkSlugs: [],
      backLinkSlugs: [],
      twoHop: [],
    };
    pages.push(stub);
  }

  const tags = buildTagIndex(publishedDetails, publishedSlugs);
  const publishedTagKeys = new Set(tags.map((t) => t.key));
  const parseCtx = buildMemoParseContext(pages, publishedTagKeys);

  for (let i = 0; i < publishedDetails.length; i++) {
    const detail = publishedDetails[i];
    const page = pages[i];
    page.bodyHtml = renderScrapboxBody(
      detail.title,
      detail.lines ?? [],
      parseCtx,
    );
    page.description = memoDescriptionFromLines(
      detail.title,
      detail.lines ?? [],
    );
    page.excerpt = memoExcerptFromLines(detail.title, detail.lines ?? []);
    const targets = extractLinkTargets(detail.lines ?? [], detail.links);
    const sections = computePageLinkSections(
      page,
      pages,
      targetIndex,
      targets,
      publishedTagKeys,
    );
    page.outLinkSlugs = sections.outLinkSlugs;
    page.backLinkSlugs = sections.backLinkSlugs;
    page.twoHop = sections.twoHop;
    page.cacheKey = `${page.cacheKey}:${sections.outLinkSlugs.join(',')}:${sections.backLinkSlugs.join(',')}:${sections.twoHop.length}`;
  }

  pages.sort((a, b) => b.created - a.created);

  return {
    pages,
    titles: new Set(pages.map((p) => p.title)),
    tags,
  };
}

export function getMemoBySlug(
  result: MemoBuildResult,
  slug: string,
): BuiltMemoPage | undefined {
  return result.pages.find((p) => p.slug === slug);
}

export function getMemoTagBySlug(
  result: MemoBuildResult,
  tagSlug: string,
): BuiltMemoTagIndex | undefined {
  return result.tags.find((t) => t.slug === tagSlug);
}

export function getPagesForSlugs(
  result: MemoBuildResult,
  slugs: string[],
): BuiltMemoPage[] {
  const bySlug = new Map(result.pages.map((p) => [p.slug, p]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is BuiltMemoPage => p !== undefined);
}

export { memoTagPath };
