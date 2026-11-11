/** ブログ一覧の月見出し用（1–12）。 */
export const formatArchiveMonth = (month: number): string => `${month}月`;

const displayDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getJstYmdParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = displayDateFormatter.format(date).split('-').map(Number);
  return { year, month, day };
}

/** JST のカレンダー上の年・月（月は 1–12） */
export function getJstYearMonth(date: Date): { year: number; month: number } {
  const { year, month } = getJstYmdParts(date);
  return { year, month };
}

export function isSameJstMonth(a: Date, b: Date): boolean {
  const ja = getJstYearMonth(a);
  const jb = getJstYearMonth(b);
  return ja.year === jb.year && ja.month === jb.month;
}

export function isSameJstYear(a: Date, b: Date): boolean {
  return getJstYearMonth(a).year === getJstYearMonth(b).year;
}

/** サイトの公開日表示（frontmatter の日付は JST 基準で解釈） */
export const formatDate = (date: Date): string => {
  const { year, month, day } = getJstYmdParts(date);
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfJstDay(date: Date): number {
  const { year: y, month: m, day: d } = getJstYmdParts(date);
  return Date.UTC(y, m - 1, d);
}

/** JST の日付キー（`YYYY-MM-DD`） */
export function formatJstDateKey(date: Date): string {
  const { year, month, day } = getJstYmdParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** JST カレンダー上で日付を加算する（`days` 日）。 */
export function addJstDays(date: Date, days: number): Date {
  return new Date(startOfJstDay(date) + days * MS_PER_DAY);
}

/** JST の月初日（その日 00:00 相当の Date） */
export function startOfJstMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** JST の月末日 */
export function endOfJstMonth(year: number, month: number): Date {
  const next =
    month === 12
      ? new Date(Date.UTC(year + 1, 0, 1))
      : new Date(Date.UTC(year, month, 1));
  return addJstDays(next, -1);
}

/** JST 上の曜日（0 = 日曜 … 6 = 土曜） */
export function getJstDayOfWeek(date: Date): number {
  return new Date(startOfJstDay(date)).getUTCDay();
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

