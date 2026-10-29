import type { BlogPostEntry } from './blog-posts';

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
