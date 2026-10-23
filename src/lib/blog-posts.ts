import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPostEntry = CollectionEntry<'blog'>;

export type BlogArchiveMonthGroup = {
  month: number;
  posts: BlogPostEntry[];
};

export type BlogArchiveYearGroup = {
  year: number;
  months: BlogArchiveMonthGroup[];
};

/** 公開日の新しい順を保ったまま、年・月でグループ化する。 */
export function groupBlogPostsByYearMonth(posts: BlogPostEntry[]): BlogArchiveYearGroup[] {
  const years: number[] = [];
  const monthsByYear = new Map<number, number[]>();
  const postsByYearMonth = new Map<number, Map<number, BlogPostEntry[]>>();

  for (const post of posts) {
    const date = post.data.pubDate;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (!postsByYearMonth.has(year)) {
      years.push(year);
      monthsByYear.set(year, []);
      postsByYearMonth.set(year, new Map());
    }

    const months = monthsByYear.get(year)!;
    const monthPosts = postsByYearMonth.get(year)!;

    if (!monthPosts.has(month)) {
      months.push(month);
      monthPosts.set(month, []);
    }

    monthPosts.get(month)!.push(post);
  }

  return years.map((year) => ({
    year,
    months: monthsByYear.get(year)!.map((month) => ({
      month,
      posts: postsByYearMonth.get(year)!.get(month)!,
    })),
  }));
}

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 公開日が現在から days 日以内の記事を新しい順で返す。 */
export async function getBlogPostsPublishedWithinDays(
  days: number,
): Promise<BlogPostEntry[]> {
  const cutoff = Date.now() - days * MS_PER_DAY;
  return (await getPublishedBlogPosts()).filter(
    (post) => post.data.pubDate.valueOf() >= cutoff,
  );
}
