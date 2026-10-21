import { stat } from 'node:fs/promises';
import path from 'node:path';

import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export const KEYWORDS_INDEX_ID = 'index';

export type KeywordEntry = CollectionEntry<'keywords'>;

export const keywordsIndexHref = '/keywords';

/** `<title>` のサイト名部分（キーワード下位ページなど） */
export const keywordsDocumentTitle = 'あとーすのKeywords';

export function keywordHref(slug: string): string {
  return `/keywords/${slug}`;
}

export function isKeywordIndexEntry(entry: KeywordEntry): boolean {
  return entry.id === KEYWORDS_INDEX_ID;
}

export async function getKeywordEntries(): Promise<KeywordEntry[]> {
  const entries = await getCollection('keywords');
  return entries
    .filter((entry) => !isKeywordIndexEntry(entry))
    .sort((a, b) => {
      const orderDiff = a.data.order - b.data.order;
      if (orderDiff !== 0) return orderDiff;
      return a.data.title.localeCompare(b.data.title, 'en');
    });
}

export async function getKeywordIndexEntry(): Promise<KeywordEntry> {
  const entry = await getEntry('keywords', KEYWORDS_INDEX_ID);
  if (!entry) {
    throw new Error('Keywords index content not found (src/content/keywords/index.md)');
  }
  return entry;
}

export async function getKeywordLastUpdated(entry: KeywordEntry): Promise<Date> {
  if (entry.data.updated) {
    return entry.data.updated;
  }
  const filePath = path.join(process.cwd(), 'src/content/keywords', `${entry.id}.md`);
  const { mtime } = await stat(filePath);
  return mtime;
}
