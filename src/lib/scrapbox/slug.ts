const MEMO_DAILY_TITLE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MEMO_SLASH_DATE_RE = /^(\d{4})[\/／\\](\d{1,2})[\/／\\](\d{1,2})$/;

/** `YYYY/MM/DD` などスラッシュ区切りの日付タイトルを `YYYY-MM-DD` に正規化 */
export function normalizeMemoDailySlashTitle(title: string): string | null {
  const trimmed = title.trim();
  const match = trimmed.match(MEMO_SLASH_DATE_RE);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** 日付タイトル（例: `2026-11-09` または `2026/11/10`）。一覧に載せる日記ページ用 */
export function isMemoDailyTitle(title: string): boolean {
  const trimmed = title.trim();
  if (MEMO_DAILY_TITLE_RE.test(trimmed)) return true;
  return normalizeMemoDailySlashTitle(trimmed) !== null;
}

/** ビルド時の URL slug（未エンコード・1 セグメント） */
export function memoSlugFromTitle(title: string): string {
  const normalized = normalizeMemoDailySlashTitle(title);
  if (normalized) return normalized;
  return title;
}

/**
 * タイトルにパス区切りが含まれるときはコンテンツの entry id（ファイル名）を slug に使う。
 * 日付タイトルは {@link memoSlugFromTitle} でハイフン形式に正規化する。
 */
export function memoSlugFromMemoEntry(title: string, entryId: string): string {
  const normalized = normalizeMemoDailySlashTitle(title);
  if (normalized) return normalized;
  if (/[\/／\\]/.test(title.trim())) return entryId;
  return memoSlugFromTitle(title);
}

/** `getStaticPaths` の params.slug。`/` を含むと Astro が複数セグメントと解釈する */
export function memoRouteParam(slug: string): string {
  return slug.includes('/') ? encodeURIComponent(slug) : slug;
}

/** `src/content/memo/<base>.md` のベース名（同期スクリプト用） */
export function memoContentFileBaseName(title: string): string {
  const daily = normalizeMemoDailySlashTitle(title);
  if (daily) return daily;
  return title.replace(/[\\/:*?"<>|]/g, '－');
}

export function memoTitleFromSlug(slug: string): string {
  return slug;
}

export function memoPagePath(titleOrSlug: string): string {
  return `/memo/${encodeURIComponent(titleOrSlug)}/`;
}

export function memoTagPath(tag: string): string {
  return `/memo/tag/${encodeURIComponent(tag)}/`;
}

/** `getStaticPaths` の params（Astro が URL エンコードを担当） */
export function memoTagParam(tag: string): string {
  return tag;
}
