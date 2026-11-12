import {
  SCRAPBOX_API_BASE,
  getScrapboxProject,
  getScrapboxSid,
} from './config';
import type { ScrapboxPageDetail, ScrapboxPageSummary } from './types';

const LIST_PAGE_SIZE = 10;

function scrapboxHeaders(): HeadersInit {
  const sid = getScrapboxSid();
  if (!sid) return {};
  return { Cookie: `connect.sid=${sid}` };
}

async function scrapboxFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${SCRAPBOX_API_BASE}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...scrapboxHeaders(),
      ...(init?.headers ?? {}),
    },
  });
}

function authHint(status: number): string {
  if (status === 401 || status === 403) {
    return ' プロジェクトが非公開の場合は環境変数 SCRAPBOX_SID（connect.sid）を設定してください。';
  }
  return '';
}

export async function fetchScrapboxPageSummariesPage(
  skip: number,
): Promise<ScrapboxPageSummary[]> {
  const params = new URLSearchParams({
    limit: String(LIST_PAGE_SIZE),
    skip: String(skip),
    sort: 'updated',
  });
  const path = `/pages/${encodeURIComponent(getScrapboxProject())}?${params}`;
  const res = await scrapboxFetch(path);
  if (!res.ok) {
    throw new Error(
      `Scrapbox ページ一覧の取得に失敗しました（HTTP ${res.status}、skip=${skip}）。` +
        authHint(res.status),
    );
  }
  const data = (await res.json()) as { pages?: ScrapboxPageSummary[] };
  if (!Array.isArray(data.pages)) {
    throw new Error(
      'Scrapbox ページ一覧のレスポンス形式が想定外です（pages がありません）。',
    );
  }
  return data.pages;
}

export async function fetchScrapboxPageList(): Promise<ScrapboxPageSummary[]> {
  const all: ScrapboxPageSummary[] = [];
  let skip = 0;
  while (true) {
    const batch = await fetchScrapboxPageSummariesPage(skip);
    all.push(...batch);
    if (batch.length < LIST_PAGE_SIZE) break;
    skip += LIST_PAGE_SIZE;
  }
  return all;
}

export async function fetchScrapboxPageDetail(
  title: string,
): Promise<ScrapboxPageDetail> {
  const path = `/pages/${encodeURIComponent(getScrapboxProject())}/${encodeURIComponent(title)}`;
  const res = await scrapboxFetch(path);
  if (!res.ok) {
    throw new Error(
      `Scrapbox ページ「${title}」の取得に失敗しました（HTTP ${res.status}）。` +
        authHint(res.status),
    );
  }
  return (await res.json()) as ScrapboxPageDetail;
}
