import { getScrapboxPublishTag } from './config';
import {
  loadMemoContentEntries,
  memoContentGlobalCacheKey,
  scrapboxDetailFromMemoEntry,
} from './load-memo-content';
import { extractLinkTargets } from './extract-links';
import {
  buildKeywordStubPages,
  collectBracketStubTargets,
  pageKeysSet,
} from './keyword-stubs';
import { buildMemoParseContext } from './link-context';
import {
  collectLinkedSidebarTargets,
  computePageLinkSections,
} from './link-graph';
import { bracketifyMemoLines } from '../memo-linking/bracketify';
import {
  buildMemoLinkDictionary,
  memoLinkDictionaryCacheKey,
} from '../memo-linking/dictionary';
import { initMemoKuromoji } from '../memo-linking/kuromoji';
import {
  collectDictionarySidebarTargets,
  mergeSidebarTargets,
} from '../memo-linking/sidebar';
import {
  memoLinkPhase1Sidebar,
  memoLinkPhase2Bracketify,
  memoLinkPhase3Kuromoji,
} from '../memo-linking/config';
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
  const globalCacheKey = `${memoContentGlobalCacheKey(entries)}:link:${memoLinkPhase1Sidebar()}:${memoLinkPhase2Bracketify()}:${memoLinkPhase3Kuromoji()}`;

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
      linkedTargets: [],
    };
    pages.push(stub);
  }

  const tags = buildTagIndex(publishedDetails, publishedSlugs);
  const publishedTagKeys = new Set(tags.map((t) => t.key));

  const stubTargets = collectBracketStubTargets(
    publishedDetails,
    pageKeysSet(pages),
    publishedTagKeys,
  );
  pages.push(
    ...buildKeywordStubPages(stubTargets, targetIndex, pages, globalCacheKey),
  );

  const contentPageCount = publishedDetails.length;
  const parseCtx = buildMemoParseContext(pages, publishedTagKeys);
  const linkDictionary = await buildMemoLinkDictionary(pages, tags);
  const kuromojiTokenizer = await initMemoKuromoji();
  parseCtx.linkDictionary = linkDictionary;
  parseCtx.autoLinkPlainText = memoLinkPhase3Kuromoji();
  parseCtx.kuromojiTokenizer = kuromojiTokenizer;

  const dictCachePart = memoLinkDictionaryCacheKey(linkDictionary);

  for (let i = 0; i < contentPageCount; i++) {
    const detail = publishedDetails[i];
    const page = pages[i];
    const entry = entryByTitle.get(detail.title)!;
    if (entry.data.idobataViaUrl && entry.data.idobataViaDate) {
      page.idobataVia = {
        dateLabel: entry.data.idobataViaDate,
        url: entry.data.idobataViaUrl,
      };
    }

    const rawLineTexts = detail.lines?.map((l) => l.text) ?? [];
    const lineTexts = memoLinkPhase2Bracketify()
      ? bracketifyMemoLines(rawLineTexts, linkDictionary)
      : rawLineTexts;
    const renderLines = lineTexts.map((text) => ({ text }));

    page.bodyHtml = renderScrapboxBody(
      detail.title,
      renderLines,
      parseCtx,
    );
    page.description = memoDescriptionFromLines(
      detail.title,
      renderLines,
    );
    page.excerpt = memoExcerptFromLines(detail.title, renderLines);
    const knownLinkKeys = pageKeysSet(pages);
    for (const tagKey of publishedTagKeys) knownLinkKeys.add(tagKey);
    const targets = extractLinkTargets(renderLines, detail.links, knownLinkKeys);
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
    const bracketSidebar = collectLinkedSidebarTargets(targets, parseCtx);
    const dictionarySidebar = collectDictionarySidebarTargets(
      renderLines,
      linkDictionary,
      parseCtx,
      detail.title,
    );
    page.linkedTargets = mergeSidebarTargets(
      bracketSidebar,
      dictionarySidebar,
    );
    page.cacheKey = `${page.cacheKey}:${sections.outLinkSlugs.join(',')}:${sections.backLinkSlugs.join(',')}:${sections.twoHop.length}:${page.linkedTargets.map((t) => t.key).join(',')}:${page.idobataVia?.url ?? ''}:${dictCachePart}`;
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
