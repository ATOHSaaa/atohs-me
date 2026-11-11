/** Scrapbox 相当: 大文字小文字無視、`_` と空白を同一視 */
export function normalizeScrapboxKey(input: string): string {
  return input
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
