/**
 * ブログタグの表示名と URL slug の対応表。
 *
 * - 記事 frontmatter の `tags` には **name** を書く（カンマ区切り可）
 * - ここに無いタグは `blogTagSlugFromName` の自動生成にフォールバック
 * - slug は `/blog/tags/{slug}` のパスに使う（英小文字・ハイフン推奨）
 */
export type BlogTagDefinition = {
  name: string;
  slug: string;
};

export const BLOG_TAG_DEFINITIONS: BlogTagDefinition[] = [
  // { name: '開発', slug: 'dev' },
  // { name: 'Inditer', slug: 'inditer' },
];

const slugSet = new Set<string>();
for (const { name, slug } of BLOG_TAG_DEFINITIONS) {
  if (!name.trim() || !slug.trim()) {
    throw new Error('blog-tags.config: name と slug は空にできません');
  }
  if (slugSet.has(slug)) {
    throw new Error(`blog-tags.config: slug "${slug}" が重複しています`);
  }
  slugSet.add(slug);
}

export const BLOG_TAG_SLUG_BY_NAME = new Map(
  BLOG_TAG_DEFINITIONS.map(({ name, slug }) => [name.trim(), slug.trim()]),
);

export const BLOG_TAG_NAME_BY_SLUG = new Map(
  BLOG_TAG_DEFINITIONS.map(({ name, slug }) => [slug.trim(), name.trim()]),
);
