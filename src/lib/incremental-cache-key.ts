import type { BlogPostEntry } from './blog-posts';
import { RECENT_BLOG_POSTS_LIST_LIMIT } from './blog-posts';

/**
 * 記事詳細の「最近の記事」用。リストに載りうる先頭 N 件の id+digest。
 * 自記事を除くためプールは limit+1。
 */
export function blogRecentPostsSectionCacheKey(
  postsSortedByNewest: BlogPostEntry[],
  listLimit = RECENT_BLOG_POSTS_LIST_LIMIT,
): string {
  const poolSize = listLimit + 1;
  return postsSortedByNewest
    .slice(0, poolSize)
    .map((post) => `${post.id}:${String(post.digest)}`)
    .join('\n');
}

/** タグ一覧ページ用。タグ付き記事の追加・削除・本文変更でキーが変わる。 */
export function blogTagPageCacheKey(posts: BlogPostEntry[]): string {
  return posts
    .map((post) => `${post.id}:${String(post.digest)}`)
    .sort((a, b) => a.localeCompare(b))
    .join('\n');
}

/** skills.ts の1件分。slug 以外の表示データが変わったときも再生成する。 */
export function skillPageCacheKey(skill: {
  slug: string;
  label: string;
  category: string;
  size: string;
}): string {
  return `${skill.slug}:${skill.label}:${skill.category}:${skill.size}`;
}
