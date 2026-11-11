import {
  BLOG_TAG_NAME_BY_SLUG,
  BLOG_TAG_SLUG_BY_NAME,
} from '../data/blog-tags.config';
import type { BlogPostEntry } from './blog-posts';
import { getPublishedBlogPosts } from './blog-posts';

export type BlogTagEntry = {
  tag: string;
  count: number;
};

export function normalizeBlogTag(raw: string): string {
  return raw.trim();
}

/** 登録表に無いタグ向けの自動 slug（英数字は kebab-case、それ以外はタグ名そのまま）。 */
export function blogTagSlugFromName(tag: string): string {
  const normalized = normalizeBlogTag(tag);
  const kebab = normalized
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kebab) && kebab.length > 0) {
    return kebab;
  }
  return normalized;
}

/** タグの URL 用 slug（`blog-tags.config` を優先）。 */
export function blogTagSlug(tag: string): string {
  const normalized = normalizeBlogTag(tag);
  return BLOG_TAG_SLUG_BY_NAME.get(normalized) ?? blogTagSlugFromName(normalized);
}

export function blogTagHref(tag: string): string {
  return `/blog/tags/${encodeURIComponent(blogTagSlug(tag))}`;
}

/** slug からタグ名を解決する（見つからなければ undefined）。 */
export function resolveBlogTagFromSlug(
  slug: string,
  knownTags: Iterable<string>,
): string | undefined {
  const decoded = decodeURIComponent(slug);
  const fromRegistry =
    BLOG_TAG_NAME_BY_SLUG.get(slug) ?? BLOG_TAG_NAME_BY_SLUG.get(decoded);
  if (fromRegistry) return fromRegistry;

  for (const tag of knownTags) {
    if (blogTagSlug(tag) === slug || blogTagSlug(tag) === decoded) {
      return tag;
    }
  }
  return undefined;
}

/** 公開記事に付いたタグと件数（件数の多い順、同数はタグ名の五十音順）。 */
export async function getBlogTagsWithCounts(): Promise<BlogTagEntry[]> {
  const posts = await getPublishedBlogPosts();
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const raw of post.data.tags) {
      const tag = normalizeBlogTag(raw);
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ja'),
    );
}

/** 指定タグが付いた公開記事（新しい順）。 */
export async function getBlogPostsByTag(tag: string): Promise<BlogPostEntry[]> {
  const normalized = normalizeBlogTag(tag);
  const posts = await getPublishedBlogPosts();
  return posts.filter((post) =>
    post.data.tags.some((t) => normalizeBlogTag(t) === normalized),
  );
}

