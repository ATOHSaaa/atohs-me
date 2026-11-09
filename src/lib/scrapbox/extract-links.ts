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
): RawLinkTarget[] {
  const seen = new Set<string>();
  const out: RawLinkTarget[] = [];

  for (const line of lines) {
    const body = stripIndent(line.text);
    for (const match of body.matchAll(/\[([^\]]+)\]/g)) {
      const inner = match[1].trim();
      if (!inner || inner.startsWith('*')) continue;

      const spaceIdx = inner.search(/\s/);
      if (spaceIdx > 0) {
        const label = inner.slice(0, spaceIdx);
        const rest = inner.slice(spaceIdx + 1).trim();
        if (isProbablyUrl(rest)) {
          pushTarget(out, seen, label, 'bracket');
          continue;
        }
      }

      if (isProbablyUrl(inner)) continue;
      pushTarget(out, seen, inner, 'bracket');
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
