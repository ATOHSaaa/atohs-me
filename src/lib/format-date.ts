/** ブログ一覧の月見出し用（1–12）。 */
export const formatArchiveMonth = (month: number): string => `${month}月`;

const displayDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** サイトの公開日表示（frontmatter の日付は JST 基準で解釈） */
export const formatDate = (date: Date): string => {
  const [year, month, day] = displayDateFormatter.format(date).split('-');
  return `${year}.${month}.${day}`;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfJstDay(date: Date): number {
  const [y, m, d] = displayDateFormatter.format(date).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 公開日が now から指定日数以内（JST の日付・当日含む）か。days=7 なら今日〜6日前。 */
export function isPublishedWithinLocalDays(
  date: Date,
  now: Date,
  days: number,
): boolean {
  const dayDiff = Math.floor((startOfJstDay(now) - startOfJstDay(date)) / MS_PER_DAY);
  return dayDiff >= 0 && dayDiff < days;
}

