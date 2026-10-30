import { countBlogBodyChars } from './blog-body-char-count';
import type { BlogPostEntry } from './blog-posts';
import {
  addJstDays,
  endOfJstMonth,
  formatJstDateKey,
  getJstDayOfWeek,
  getJstYearMonth,
  startOfJstMonth,
} from './format-date';

export type BlogStatsRange = 'month' | 'year' | 'all';

export type BlogHeatmapDay = {
  dateKey: string;
  postCount: number;
  charCount: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** ヒートマップ範囲外（パディング用） */
  outOfRange: boolean;
};

export type BlogHeatmapWeek = {
  days: BlogHeatmapDay[];
};

export type BlogMonthlyStat = {
  year: number;
  month: number;
  postCount: number;
  charCount: number;
};

export type BlogStats = {
  postCount: number;
  totalCharCount: number;
  averageCharCount: number;
  /** 1本以上公開があった JST の日数 */
  updateDayCount: number;
  monthly: BlogMonthlyStat[];
  heatmapWeeks: BlogHeatmapWeek[];
  heatmapStartKey: string;
  heatmapEndKey: string;
};

const HEATMAP_WEEKS = 53;

function heatmapLevel(postCount: number): 0 | 1 | 2 | 3 | 4 {
  if (postCount <= 0) return 0;
  if (postCount === 1) return 1;
  if (postCount === 2) return 2;
  if (postCount === 3) return 3;
  return 4;
}

function monthStatKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatBlogStatsMonthLabel(year: number, month: number): string {
  return `${year}.${String(month).padStart(2, '0')}`;
}

export function formatHeatmapAxisMonth(yearMonth: string): string {
  return String(Number(yearMonth.slice(5, 7)));
}

/** ヒートマップ列ごとの月ラベル（その月の1日がある列、なければ初出の in-range 日の列） */
export function buildHeatmapMonthColumnLabels(weeks: BlogHeatmapWeek[]): string[] {
  const labels = weeks.map(() => '');
  const labeledMonths = new Set<string>();

  for (let w = 0; w < weeks.length; w += 1) {
    for (const day of weeks[w].days) {
      if (day.outOfRange) continue;
      if (day.dateKey.slice(8, 10) !== '01') continue;
      const yearMonth = day.dateKey.slice(0, 7);
      if (labeledMonths.has(yearMonth)) continue;
      labeledMonths.add(yearMonth);
      labels[w] = formatHeatmapAxisMonth(yearMonth);
      break;
    }
  }

  for (let w = 0; w < weeks.length; w += 1) {
    if (labels[w]) continue;
    for (const day of weeks[w].days) {
      if (day.outOfRange) continue;
      const yearMonth = day.dateKey.slice(0, 7);
      if (labeledMonths.has(yearMonth)) continue;
      labeledMonths.add(yearMonth);
      labels[w] = formatHeatmapAxisMonth(yearMonth);
      break;
    }
  }

  return labels;
}

function monthFocus(
  range: BlogStatsRange,
  now: Date,
  focus?: { year: number; month: number },
): { year: number; month: number } {
  if (focus && (range === 'month' || range === 'year')) return focus;
  return getJstYearMonth(now);
}

function filterPostsByRange(
  posts: BlogPostEntry[],
  range: BlogStatsRange,
  now: Date,
  focus?: { year: number; month: number },
): BlogPostEntry[] {
  if (range === 'all') return posts;
  const { year, month } = monthFocus(range, now, focus);
  if (range === 'month') {
    return posts.filter((post) => {
      const ym = getJstYearMonth(post.data.pubDate);
      return ym.year === year && ym.month === month;
    });
  }
  return posts.filter((post) => getJstYearMonth(post.data.pubDate).year === year);
}

function alignHeatmapStartSunday(date: Date): Date {
  let start = date;
  while (getJstDayOfWeek(start) !== 0) {
    start = addJstDays(start, -1);
  }
  return start;
}

function weekCountFromStart(startSunday: Date, endDate: Date): number {
  const endSunday = addJstDays(endDate, -getJstDayOfWeek(endDate));
  const startMs = startSunday.getTime();
  const endMs = endSunday.getTime();
  if (endMs < startMs) return 1;
  const days = Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 7;
  return Math.max(1, Math.ceil(days / 7));
}

function getHeatmapLayout(
  range: BlogStatsRange,
  now: Date,
  focus?: { year: number; month: number },
): { start: Date; endKey: string; weekCount: number } {
  const todayKey = formatJstDateKey(now);
  const { year, month } = monthFocus(range, now, focus);

  if (range === 'month') {
    const monthStart = startOfJstMonth(year, month);
    const monthEnd = endOfJstMonth(year, month);
    const monthEndKey = formatJstDateKey(monthEnd);
    const endKey = todayKey < monthEndKey ? todayKey : monthEndKey;
    const endDate = todayKey < monthEndKey ? now : monthEnd;
    const start = alignHeatmapStartSunday(monthStart);
    return {
      start,
      endKey,
      weekCount: weekCountFromStart(start, endDate),
    };
  }

  if (range === 'year') {
    const yearStart = startOfJstMonth(year, 1);
    const yearEnd = endOfJstMonth(year, 12);
    const yearEndKey = formatJstDateKey(yearEnd);
    const endKey = todayKey < yearEndKey ? todayKey : yearEndKey;
    const endDate = todayKey < yearEndKey ? now : yearEnd;
    const start = alignHeatmapStartSunday(yearStart);
    return {
      start,
      endKey,
      weekCount: weekCountFromStart(start, endDate),
    };
  }

  const endWeekSunday = addJstDays(now, -getJstDayOfWeek(now));
  const start = addJstDays(endWeekSunday, -(HEATMAP_WEEKS - 1) * 7);
  return { start, endKey: todayKey, weekCount: HEATMAP_WEEKS };
}

function getStatsPeriodKeys(
  range: BlogStatsRange,
  now: Date,
  focus?: { year: number; month: number },
): { periodStartKey: string; periodEndKey: string } {
  const todayKey = formatJstDateKey(now);
  const { year, month } = monthFocus(range, now, focus);

  if (range === 'month') {
    const monthEndKey = formatJstDateKey(endOfJstMonth(year, month));
    return {
      periodStartKey: formatJstDateKey(startOfJstMonth(year, month)),
      periodEndKey: todayKey < monthEndKey ? todayKey : monthEndKey,
    };
  }

  if (range === 'year') {
    const yearEndKey = formatJstDateKey(endOfJstMonth(year, 12));
    return {
      periodStartKey: `${year}-01-01`,
      periodEndKey: todayKey < yearEndKey ? todayKey : yearEndKey,
    };
  }

  return { periodStartKey: '0000-01-01', periodEndKey: todayKey };
}

export function buildBlogStats(
  posts: BlogPostEntry[],
  range: BlogStatsRange = 'all',
  now = new Date(),
  focus?: { year: number; month: number },
): BlogStats {
  const filteredPosts = filterPostsByRange(posts, range, now, focus);
  const postCount = filteredPosts.length;
  let totalCharCount = 0;

  const dayMap = new Map<string, { postCount: number; charCount: number }>();
  const monthMap = new Map<string, BlogMonthlyStat>();

  for (const post of filteredPosts) {
    const chars = countBlogBodyChars(post.body ?? '');
    totalCharCount += chars;

    const dateKey = formatJstDateKey(post.data.pubDate);
    const day = dayMap.get(dateKey) ?? { postCount: 0, charCount: 0 };
    day.postCount += 1;
    day.charCount += chars;
    dayMap.set(dateKey, day);

    const { year, month } = getJstYearMonth(post.data.pubDate);
    const mKey = monthStatKey(year, month);
    const monthStat = monthMap.get(mKey) ?? { year, month, postCount: 0, charCount: 0 };
    monthStat.postCount += 1;
    monthStat.charCount += chars;
    monthMap.set(mKey, monthStat);
  }

  const monthly = [...monthMap.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const { start: heatmapStart, endKey: heatmapEndKey, weekCount } = getHeatmapLayout(
    range,
    now,
    focus,
  );
  const heatmapStartKey = formatJstDateKey(heatmapStart);
  const { periodStartKey, periodEndKey } = getStatsPeriodKeys(range, now, focus);

  const heatmapWeeks: BlogHeatmapWeek[] = [];
  let cursor = heatmapStart;

  for (let w = 0; w < weekCount; w += 1) {
    const days: BlogHeatmapDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      const dateKey = formatJstDateKey(cursor);
      const outOfRange =
        dateKey > heatmapEndKey ||
        dateKey < periodStartKey ||
        dateKey > periodEndKey;
      const stats = dayMap.get(dateKey);
      const postCountForDay = outOfRange ? 0 : (stats?.postCount ?? 0);
      days.push({
        dateKey,
        postCount: postCountForDay,
        charCount: outOfRange ? 0 : (stats?.charCount ?? 0),
        level: outOfRange ? 0 : heatmapLevel(postCountForDay),
        outOfRange,
      });
      cursor = addJstDays(cursor, 1);
    }
    heatmapWeeks.push({ days });
  }

  return {
    postCount,
    totalCharCount,
    averageCharCount: postCount > 0 ? Math.round(totalCharCount / postCount) : 0,
    updateDayCount: dayMap.size,
    monthly,
    heatmapWeeks,
    heatmapStartKey,
    heatmapEndKey,
  };
}

export type BlogCalendarYear = {
  year: number;
  label: string;
  stats: BlogStats;
};

/** 最初の公開年から今年まで（JST）。公開のない年も含む。 */
export function buildBlogCalendarYears(
  posts: BlogPostEntry[],
  now = new Date(),
): BlogCalendarYear[] {
  const endYear = getJstYearMonth(now).year;
  let startYear = endYear;
  for (const post of posts) {
    const y = getJstYearMonth(post.data.pubDate).year;
    if (y < startYear) startYear = y;
  }

  const years: BlogCalendarYear[] = [];
  for (let year = startYear; year <= endYear && years.length < 100; year += 1) {
    years.push({
      year,
      label: String(year),
      stats: buildBlogStats(posts, 'year', now, { year, month: 1 }),
    });
  }

  if (years.length === 0) {
    years.push({
      year: endYear,
      label: String(endYear),
      stats: buildBlogStats(posts, 'year', now, { year: endYear, month: 1 }),
    });
  }

  return years;
}
