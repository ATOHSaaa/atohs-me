import GithubSlugger from 'github-slugger';

export type BlogTocItem = {
  depth: 2 | 3;
  text: string;
  slug: string;
};

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/** Markdown 本文から h2 / h3 を抽出し、rehype-slug と同じ slug を付与する。 */
export function extractBlogTocItems(markdown: string): BlogTocItem[] {
  const slugger = new GithubSlugger();
  const items: BlogTocItem[] = [];

  for (const line of markdown.split('\n')) {
    const match = line.match(/^(##|###)\s+(.+?)\s*$/);
    if (!match) continue;

    const depth = match[1] === '##' ? 2 : 3;
    const text = stripInlineMarkdown(match[2]);
    if (!text) continue;

    items.push({
      depth,
      text,
      slug: slugger.slug(text),
    });
  }

  return items;
}
