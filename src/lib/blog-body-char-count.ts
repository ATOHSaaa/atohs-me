/** 公開用の文字数（空白・改行除く）。Markdown 記法は除いて本文相当のみ数える。 */
export function countBlogBodyChars(body: string): number {
  let text = body;
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');
  text = text.replace(/^>\s?/gm, '');
  text = text.replace(/[\s\r\n\t\u3000]/g, '');
  return [...text].length;
}
