const HASHTAG_RE = /#([^\s#＃\[\]<>]+)/gu;

/** 行テキストに含まれるハッシュタグ（`#` なし、小文字化しない） */
export function collectHashtagsFromLines(lineTexts: string[]): Set<string> {
  const tags = new Set<string>();
  for (const line of lineTexts) {
    for (const match of line.matchAll(HASHTAG_RE)) {
      const tag = match[1];
      if (tag) tags.add(tag);
    }
  }
  return tags;
}

export function pageHasHashtag(
  lineTexts: string[],
  tagName: string,
): boolean {
  return collectHashtagsFromLines(lineTexts).has(tagName);
}
