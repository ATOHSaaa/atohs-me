const MEMO_DAILY_TITLE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 日付タイトル（例: `2026-11-09`）。一覧に載せる日記ページ用 */
export function isMemoDailyTitle(title: string): boolean {
  return MEMO_DAILY_TITLE_RE.test(title.trim());
}

/** `getStaticPaths` の params 用（Astro が URL エンコードを担当） */
export function memoSlugFromTitle(title: string): string {
  return title;
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
