import { memoLinkPhase2Bracketify } from './config';
import type { MemoLinkDictionary } from './dictionary';
import { findDictionaryMatchesInPlain } from './match';
import { splitBracketSegments } from './segments';

/** Phase 2: プレーン部分にだけ `[表示語]` を付与（既存括弧はそのまま） */
export function bracketifyMemoLine(
  line: string,
  dictionary: MemoLinkDictionary,
): string {
  if (!memoLinkPhase2Bracketify()) return line;

  const segments = splitBracketSegments(line);
  let out = '';
  for (const seg of segments) {
    if (seg.kind === 'bracket') {
      out += seg.text;
      continue;
    }
    if (!seg.text) continue;
    const matches = findDictionaryMatchesInPlain(seg.text, 0, dictionary);
    if (matches.length === 0) {
      out += seg.text;
      continue;
    }
    let local = '';
    let cursor = 0;
    for (const m of matches) {
      const relStart = m.start - seg.start;
      const relEnd = m.end - seg.start;
      local += seg.text.slice(cursor, relStart);
      const slice = seg.text.slice(relStart, relEnd);
      if (slice === m.display) {
        local += `[${m.display}]`;
      } else {
        local += `[${m.display}]`;
      }
      cursor = relEnd;
    }
    local += seg.text.slice(cursor);
    out += local;
  }
  return out;
}

export function bracketifyMemoLines(
  lines: readonly string[],
  dictionary: MemoLinkDictionary,
): string[] {
  if (!memoLinkPhase2Bracketify()) return [...lines];
  return lines.map((line) => bracketifyMemoLine(line, dictionary));
}
