import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPostEntry = CollectionEntry<'blog'>;

/** 公開記事を新しい順に返す。 */
export async function getPublishedBlogPosts(): Promise<BlogPostEntry[]> {
  return (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/**
 * 記事下の「最近書いた記事」用。
 * 表示中の記事を除き、公開日の新しい順で最大 limit 件。
 */
export async function getOtherBlogPosts(
  currentId: string,
  limit = 5,
): Promise<BlogPostEntry[]> {
  return (await getPublishedBlogPosts())
    .filter((post) => post.id !== currentId)
    .slice(0, limit);
}
