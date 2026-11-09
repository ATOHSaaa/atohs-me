/** Scrapbox の行内ハッシュタグ（装飾記法 `#色:…` などは除外） */
export const HASHTAG_RE =
  /#([^\s#＃\[\]<>:=,，。、~:][^\s#＃\[\]<>]*)/gu;

export function isValidMemoHashtag(tag: string): boolean {
  if (!tag || tag.length > 80) return false;
  if (/[:=,，。~]/.test(tag)) return false;
  return true;
}

/** 行テキストに含まれるハッシュタグ（`#` なし、小文字化しない） */
export function collectHashtagsFromLines(lineTexts: string[]): Set<string> {
  const tags = new Set<string>();
  for (const line of lineTexts) {
    for (const match of line.matchAll(HASHTAG_RE)) {
      const tag = match[1];
      if (tag && isValidMemoHashtag(tag)) tags.add(tag);
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
