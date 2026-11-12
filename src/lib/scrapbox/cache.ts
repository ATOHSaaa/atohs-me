import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getScrapboxProject, scrapboxForceRefresh } from './config';
import {
  fetchScrapboxPageDetail,
  fetchScrapboxPageSummariesPage,
} from './fetch';
import type { ScrapboxPageDetail, ScrapboxPageSummary } from './types';

export const SCRAPBOX_CACHE_DIR = path.join(process.cwd(), '.scrapbox-cache');

export interface ScrapboxCacheEntry {
  updated: number;
  detail: ScrapboxPageDetail;
}

export interface ScrapboxCacheFile {
  version: 1;
  project: string;
  syncedAt: string;
  pages: Record<string, ScrapboxCacheEntry>;
}

const CACHE_VERSION = 1;

function cacheFilePath(): string {
  return path.join(SCRAPBOX_CACHE_DIR, `${getScrapboxProject()}.json`);
}

export async function readScrapboxCache(): Promise<ScrapboxCacheFile> {
  try {
    const raw = await readFile(cacheFilePath(), 'utf8');
    const data = JSON.parse(raw) as ScrapboxCacheFile;
    if (data.version === CACHE_VERSION && data.project === getScrapboxProject()) {
      return data;
    }
  } catch {
    // missing or invalid
  }
  return {
    version: CACHE_VERSION,
    project: getScrapboxProject(),
    syncedAt: '',
    pages: {},
  };
}

export async function writeScrapboxCache(
  cache: ScrapboxCacheFile,
): Promise<void> {
  await mkdir(SCRAPBOX_CACHE_DIR, { recursive: true });
  cache.syncedAt = new Date().toISOString();
  await writeFile(cacheFilePath(), JSON.stringify(cache), 'utf8');
}

function isSummaryFresh(
  summary: ScrapboxPageSummary,
  entry: ScrapboxCacheEntry | undefined,
  force: boolean,
): boolean {
  if (force || !entry) return false;
  return entry.updated >= summary.updated;
}

function batchEntirelyFresh(
  batch: ScrapboxPageSummary[],
  cache: ScrapboxCacheFile,
  force: boolean,
): boolean {
  if (force) return false;
  return batch.length > 0 && batch.every((s) => isSummaryFresh(s, cache.pages[s.title], false));
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
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

/**
 * 一覧を 10 件ずつ `sort=updated` で取得。詳細は新規・更新分のみ。
 * タイトル一覧は全件巡回して削除を検出（要約のみ・軽量）。
 */
export async function syncScrapboxCache(): Promise<ScrapboxCacheFile> {
  const force = scrapboxForceRefresh();
  const cache = await readScrapboxCache();
  const remoteTitles = new Set<string>();
  const toFetch: ScrapboxPageSummary[] = [];
  let skip = 0;
  let detailSyncStopped = false;

  while (true) {
    const batch = await fetchScrapboxPageSummariesPage(skip);
    if (batch.length === 0) break;

    for (const summary of batch) {
      remoteTitles.add(summary.title);
    }

    if (!detailSyncStopped) {
      for (const summary of batch) {
        if (!isSummaryFresh(summary, cache.pages[summary.title], force)) {
          toFetch.push(summary);
        }
      }
      if (!force && batchEntirelyFresh(batch, cache, force)) {
        detailSyncStopped = true;
      }
    }

    skip += 10;
    if (batch.length < 10) break;
  }

  const uniqueFetch = [...new Map(toFetch.map((s) => [s.title, s])).values()];

  const fetched = await mapPool(uniqueFetch, 8, (summary) =>
    fetchScrapboxPageDetail(summary.title),
  );

  for (const detail of fetched) {
    cache.pages[detail.title] = {
      updated: detail.updated,
      detail,
    };
  }

  for (const title of Object.keys(cache.pages)) {
    if (!remoteTitles.has(title)) {
      delete cache.pages[title];
    }
  }

  await writeScrapboxCache(cache);
  return cache;
}

export function cacheDetails(cache: ScrapboxCacheFile): ScrapboxPageDetail[] {
  return Object.values(cache.pages).map((entry) => entry.detail);
}
