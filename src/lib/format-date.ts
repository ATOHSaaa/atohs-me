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

/** 公開日と今日の差（ローカル日付）を英語の相対表現で返す。 */
export function formatRelativePublishLabel(date: Date, now = new Date()): string {
  const dayDiff = Math.floor((startOfLocalDay(now) - startOfLocalDay(date)) / MS_PER_DAY);

  if (dayDiff <= 0) {
    return 'Today';
  }
  if (dayDiff === 1) {
    return 'Yesterday';
  }
  return `${dayDiff} days ago`;
}
