import { BLOG_TAG_SLUG_BY_NAME } from '../data/blog-tags.config';
import { SKILLS_SECTION_PUBLISHED, skills } from './skills';

function blogTagSlugForPath(tag: string): string {
  const normalized = tag.trim();
  const fromRegistry = BLOG_TAG_SLUG_BY_NAME.get(normalized);
  if (fromRegistry) return fromRegistry;
  const kebab = normalized
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kebab) && kebab.length > 0) {
    return kebab;
  }
  return normalized;
}

/** パス表示 OGP を生成する固定ルート（記事詳細・cat などは除く） */
export const PATH_OG_STATIC_PATHNAMES: readonly string[] = [
  '/',
  '/memo',
  '/about',
  '/contact',
  '/works',
  '/resume',
  ...(SKILLS_SECTION_PUBLISHED ? (['/skills'] as const) : []),
  '/keywords',
  '/blog',
  '/blog/stats',
  '/blog/tags',
  '/project/osamudazai-and-me',
  '/404',
];

export function skillDetailPathnames(): string[] {
  if (!SKILLS_SECTION_PUBLISHED) return [];
  return skills.map((skill) => `/skills/${skill.slug}`);
}

export function keywordDetailPathnames(slugs: string[]): string[] {
  return slugs.map((slug) => `/keywords/${slug}`);
}

export function blogTagDetailPathnames(tagNames: string[]): string[] {
  return tagNames.map((tag) => `/blog/tags/${blogTagSlugForPath(tag)}`);
}
