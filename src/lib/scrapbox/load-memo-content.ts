import { getCollection, type CollectionEntry } from 'astro:content';
import type { ScrapboxPageDetail } from './types';

export type MemoContentEntry = CollectionEntry<'memo'>;

function memoTitleFromEntry(entry: MemoContentEntry): string {
  return entry.data.title ?? entry.id;
}

export function scrapboxDetailFromMemoEntry(
  entry: MemoContentEntry,
): ScrapboxPageDetail {
  const title = memoTitleFromEntry(entry);
  const created = Math.floor(entry.data.created.getTime() / 1000);
  const updated = Math.floor(
    (entry.data.updated ?? entry.data.created).getTime() / 1000,
  );
  const body = entry.body ?? '';
  const lines = body.split(/\r?\n/).map((text) => ({ text }));

  return {
    id: entry.id,
    title,
    created,
    updated,
    lines,
  };
}

export async function loadMemoContentEntries(): Promise<MemoContentEntry[]> {
  return getCollection('memo', ({ data }) => !data.draft);
}

export function memoContentGlobalCacheKey(
  entries: MemoContentEntry[],
): string {
  return entries
    .map((e) => String(e.digest))
    .sort()
    .join('|');
}
