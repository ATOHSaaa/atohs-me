const BRACKET_FOOTNOTE_PATTERN = /\[\[([^\]]+)\]\]/g;

/** Markdown 本文から `[[脚注]]` を出現順に抽出する */
export function extractFootnotesFromMarkdown(markdown) {
  if (!markdown) return [];

  const footnotes = [];
  const pattern = new RegExp(BRACKET_FOOTNOTE_PATTERN.source, 'g');
  for (const match of markdown.matchAll(pattern)) {
    const text = match[1].trim();
    if (text) footnotes.push(text);
  }
  return footnotes;
}

export { BRACKET_FOOTNOTE_PATTERN };
