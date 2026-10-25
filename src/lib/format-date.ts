/** ブログ一覧の月見出し用（1–12）。 */
export const formatArchiveMonth = (month: number): string => `${month}月`;

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** 公開日が now から指定日数以内（ローカル日付・当日含む）か。days=7 なら今日〜6日前。 */
export function isPublishedWithinLocalDays(
  date: Date,
  now: Date,
  days: number,
): boolean {
  const dayDiff = Math.floor((startOfLocalDay(now) - startOfLocalDay(date)) / MS_PER_DAY);
  return dayDiff >= 0 && dayDiff < days;
}

