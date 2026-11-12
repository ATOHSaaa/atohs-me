import type { MemoParseContext, ResolvedMemoTarget } from '../scrapbox/link-context';
import { memoLinkPhase1Sidebar } from './config';
import type { MemoLinkDictionary } from './dictionary';
import { findDictionaryMatchesInPlain } from './match';
import { splitBracketSegments } from './segments';
import type { ScrapboxLine } from '../scrapbox/types';

/** Phase 1: 本文プレーン部分の辞書一致をサイドバー候補に追加 */
export function collectDictionarySidebarTargets(
  lines: readonly ScrapboxLine[],
  dictionary: MemoLinkDictionary,
  ctx: MemoParseContext,
  excludePageTitle?: string,
): ResolvedMemoTarget[] {
  if (!memoLinkPhase1Sidebar()) return [];

  const out: ResolvedMemoTarget[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    for (const seg of splitBracketSegments(line.text)) {
      if (seg.kind !== 'bracket') {
        const matches = findDictionaryMatchesInPlain(seg.text, 0, dictionary);
        for (const m of matches) {
          const resolved = ctx.resolveTarget(m.display);
          if (
            (resolved.kind !== 'page' && resolved.kind !== 'tag') ||
            !resolved.href ||
            seen.has(resolved.key)
          ) {
            continue;
          }
          if (
            excludePageTitle &&
            resolved.page &&
            resolved.page.title === excludePageTitle
          ) {
            continue;
          }
          seen.add(resolved.key);
          out.push(resolved);
        }
      }
    }
  }

  return out;
}

export function mergeSidebarTargets(
  primary: readonly ResolvedMemoTarget[],
  extra: readonly ResolvedMemoTarget[],
): ResolvedMemoTarget[] {
  const out = [...primary];
  const seen = new Set(primary.map((t) => t.key));
  for (const t of extra) {
    if (seen.has(t.key)) continue;
    seen.add(t.key);
    out.push(t);
  }
  return out;
}
