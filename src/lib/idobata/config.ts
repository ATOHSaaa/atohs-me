/** 井戸端（Scrapbox villagepump）の既定プロジェクト名 */
export const IDOBATA_SCRAPBOX_PROJECT =
  (typeof process !== 'undefined' && process.env.IDOBATA_SCRAPBOX_PROJECT) ||
  'villagepump';

/**
 * 共同日記ページ上の自分のアイコン名（`.icon` の前の部分）。
 * 例: `atohs.icon` → `atohs`
 */
export function getIdobataAuthorIcon(): string {
  const raw =
    typeof process !== 'undefined' ? process.env.IDOBATA_AUTHOR_ICON : undefined;
  const name = (raw?.trim() || 'atohs').replace(/\.icon$/i, '');
  return name.length > 0 ? name : 'atohs';
}

export function getIdobataScrapboxProject(): string {
  return IDOBATA_SCRAPBOX_PROJECT;
}

/** 井戸端の日記ページ URL（タイトル `YYYY/MM/DD`） */
export function idobataDiaryPageUrl(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  const title = `${y}/${m}/${d}`;
  const project = getIdobataScrapboxProject();
  return `https://scrapbox.io/${encodeURIComponent(project)}/${encodeURIComponent(title)}`;
}

/** 旧形式の本文行（移行用に除去） */
export function memoLineIsIdobataVia(line: string): boolean {
  return /\[via井戸端\s+https:\/\/scrapbox\.io\//u.test(line.trim());
}

export function stripIdobataViaMemoLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !memoLineIsIdobataVia(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}
