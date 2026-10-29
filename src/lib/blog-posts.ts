import { getCollection, type CollectionEntry } from 'astro:content';
import {
  getJstYearMonth,
  isPublishedWithinLocalDays,
  isSameJstMonth,
  isSameJstYear,
} from './format-date';

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
    const { year, month } = getJstYearMonth(post.data.pubDate);

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

/** 公開日が当月（JST）の記事を新しい順で返す。 */
export async function getBlogPostsPublishedInCurrentMonth(
  now = new Date(),
): Promise<BlogPostEntry[]> {
  return (await getPublishedBlogPosts()).filter((post) =>
    isSameJstMonth(post.data.pubDate, now),
  );
}

/** 公開日が当年（JST）の記事を新しい順で返す。 */
export async function getBlogPostsPublishedInCurrentYear(
  now = new Date(),
): Promise<BlogPostEntry[]> {
  return (await getPublishedBlogPosts()).filter((post) =>
    isSameJstYear(post.data.pubDate, now),
  );
}

/** 公開日が now から指定日数以内（JST の日付）の記事を新しい順で返す。 */
export async function getBlogPostsPublishedWithinLocalDays(
  days: number,
  now = new Date(),
): Promise<BlogPostEntry[]> {
  return (await getPublishedBlogPosts()).filter((post) =>
    isPublishedWithinLocalDays(post.data.pubDate, now, days),
  );
}

export { isSameJstMonth as isSameLocalMonth, isSameJstYear as isSameLocalYear };
