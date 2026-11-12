import type { ScrapboxLine } from '../scrapbox/types';
import { idobataDiaryPageUrl } from './config';
import { iconNamesMatch, parseIdobataSectionIcon } from './diary-extract';

export interface MemoIdobataVia {
  dateLabel: string;
  url: string;
}

/** `2026-04-04` → `2026/04/04`（井戸端の日記タイトル表記） */
export function idobataDateLabelFromIso(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${y}/${m}/${d}`;
}

/** 作者セクション行への Scrapbox アンカー付き URL */
export function idobataDiaryViaUrl(
  isoDate: string,
  anchorLineId?: string,
): string {
  const base = idobataDiaryPageUrl(isoDate);
  if (!anchorLineId) return base;
  return `${base}#${anchorLineId}`;
}

export function findIdobataAuthorSectionLineId(
  lines: readonly ScrapboxLine[],
  authorIcon: string,
): string | undefined {
  for (const line of lines) {
    const name = parseIdobataSectionIcon(line.text);
    if (name && iconNamesMatch(name, authorIcon) && line.id) {
      return line.id;
    }
  }
  return undefined;
}

export function buildMemoIdobataVia(
  isoDate: string,
  lines: readonly ScrapboxLine[],
  authorIcon: string,
): MemoIdobataVia {
  const anchorId = findIdobataAuthorSectionLineId(lines, authorIcon);
  return {
    dateLabel: idobataDateLabelFromIso(isoDate),
    url: idobataDiaryViaUrl(isoDate, anchorId),
  };
}
