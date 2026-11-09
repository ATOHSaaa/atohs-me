import { getScrapboxPublishTag } from './config';
import { fetchScrapboxPageDetail, fetchScrapboxPageList } from './fetch';
import { memoDescriptionFromLines, renderScrapboxBody } from './parse';
import { memoSlugFromTitle } from './slug';
import { pageHasHashtag } from './tags';
import type { BuiltMemoPage, MemoBuildResult } from './types';

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

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

let memoBuildPromise: Promise<MemoBuildResult> | undefined;

export function loadMemosForBuild(): Promise<MemoBuildResult> {
  if (!memoBuildPromise) {
    memoBuildPromise = buildMemos();
  }
  return memoBuildPromise;
}

async function buildMemos(): Promise<MemoBuildResult> {
  const summaries = await fetchScrapboxPageList();
  const titles = new Set(summaries.map((p) => p.title));

  const details = await mapPool(summaries, 8, (summary) =>
    fetchScrapboxPageDetail(summary.title),
  );

  const pages: BuiltMemoPage[] = [];

  for (const detail of details) {
    const lineTexts = detail.lines?.map((l) => l.text) ?? [];
    if (!shouldIncludePage(lineTexts)) continue;

    const bodyHtml = renderScrapboxBody(detail.title, detail.lines ?? [], titles);
    const slug = memoSlugFromTitle(detail.title);
    const cacheKey = `${detail.updated}:${detail.lines?.length ?? 0}`;

    pages.push({
      title: detail.title,
      slug,
      created: detail.created,
      updated: detail.updated,
      bodyHtml,
      description: memoDescriptionFromLines(detail.title, detail.lines ?? []),
      cacheKey,
      noindex: true,
    });
  }

  pages.sort((a, b) => b.updated - a.updated);

  return { pages, titles };
}

export function getMemoBySlug(
  result: MemoBuildResult,
  slug: string,
): BuiltMemoPage | undefined {
  return result.pages.find((p) => p.slug === slug);
}
