/** 1行を `[...]` 外と内に分割（ネストなし想定） */
export type TextSegment =
  | { kind: 'plain'; text: string; start: number }
  | { kind: 'bracket'; text: string; start: number };

export function splitBracketSegments(line: string): TextSegment[] {
  const out: TextSegment[] = [];
  let i = 0;
  while (i < line.length) {
    const bracketStart = line.indexOf('[', i);
    if (bracketStart === -1) {
      out.push({ kind: 'plain', text: line.slice(i), start: i });
      break;
    }
    if (bracketStart > i) {
      out.push({
        kind: 'plain',
        text: line.slice(i, bracketStart),
        start: i,
      });
    }
    const bracketEnd = line.indexOf(']', bracketStart + 1);
    if (bracketEnd === -1) {
      out.push({ kind: 'plain', text: line.slice(bracketStart), start: bracketStart });
      break;
    }
    out.push({
      kind: 'bracket',
      text: line.slice(bracketStart, bracketEnd + 1),
      start: bracketStart,
    });
    i = bracketEnd + 1;
  }
  return out;
}
