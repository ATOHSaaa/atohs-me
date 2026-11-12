import { HASHTAG_RE, isValidMemoHashtag } from './tags';
import { normalizeScrapboxKey } from './title-match';
import type { ScrapboxLine } from './types';

function stripIndent(raw: string): string {
  return raw.replace(/^\s+/, '');
}

function isProbablyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^\/\//.test(value);
}

export type RawLinkSource = 'bracket' | 'hashtag' | 'api';

export interface RawLinkTarget {
  display: string;
  key: string;
  source: RawLinkSource;
}

/**
 * `[...]` 内のリンク先表示語。空白ありでも `[Vibe Coding]` は1語として扱う。
 * 既知キーがあるときだけ `[表示 既存ページ名]` を rest に分解する。
 */
export function bracketInnerLinkDisplay(
  inner: string,
  knownKeys?: ReadonlySet<string>,
): string {
  const trimmed = inner.trim();
  const spaceIdx = trimmed.search(/\s/);
  if (spaceIdx <= 0) return trimmed;

  const label = trimmed.slice(0, spaceIdx);
  const rest = trimmed.slice(spaceIdx + 1).trim();
  if (isProbablyUrl(label)) return rest || label;
  if (isProbablyUrl(rest)) return label;
  if (/\shttps?:\/\//i.test(rest) || /\s\/\//.test(rest)) return label;

  if (knownKeys) {
    const wholeKey = normalizeScrapboxKey(trimmed);
    const restKey = normalizeScrapboxKey(rest);
    if (knownKeys.has(wholeKey)) return trimmed;
    if (knownKeys.has(restKey)) return rest;
  }
  return trimmed;
}

function pushTarget(
  out: RawLinkTarget[],
  seen: Set<string>,
  display: string,
  source: RawLinkSource,
): void {
  const trimmed = display.trim();
  if (!trimmed) return;
  const key = normalizeScrapboxKey(trimmed);
  if (!key || seen.has(key)) return;
  seen.add(key);
  out.push({ display: trimmed, key, source });
}

/** ビルド用: 行内 `[...]`・`#tag` と API の `links` からリンク先候補を抽出 */
export function extractLinkTargets(
  lines: ScrapboxLine[],
  apiLinks?: string[],
  knownKeys?: ReadonlySet<string>,
): RawLinkTarget[] {
  const seen = new Set<string>();
  const out: RawLinkTarget[] = [];

  for (const line of lines) {
    const body = stripIndent(line.text);
    for (const match of body.matchAll(/\[([^\]]+)\]/g)) {
      const inner = match[1].trim();
      if (!inner || inner.startsWith('*')) continue;

      if (isProbablyUrl(inner)) continue;
      pushTarget(out, seen, bracketInnerLinkDisplay(inner, knownKeys), 'bracket');
    }

    for (const match of body.matchAll(HASHTAG_RE)) {
      const tag = match[1];
      if (tag && isValidMemoHashtag(tag)) {
        pushTarget(out, seen, tag, 'hashtag');
      }
    }
  }

  for (const link of apiLinks ?? []) {
    pushTarget(out, seen, link, 'api');
  }

  return out;
}
