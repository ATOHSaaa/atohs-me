export type SkillCategoryId = 'website-development' | 'marketing' | 'creation';

export interface SkillCategory {
  id: SkillCategoryId;
  title: string;
}

export interface Skill {
  slug: string;
  label: string;
  category: SkillCategoryId;
  size: 'lg' | 'md' | 'sm';
}

export const skillCategories: SkillCategory[] = [
  { id: 'website-development', title: 'Website Development' },
  { id: 'marketing', title: 'Marketing' },
  { id: 'creation', title: 'Creation' },
];

export const skills: Skill[] = [
  { slug: 'astro', label: 'Astro', category: 'website-development', size: 'lg' },
  { slug: 'wordpress', label: 'WordPress', category: 'website-development', size: 'lg' },
  { slug: 'cursor', label: 'Cursor', category: 'website-development', size: 'md' },
  { slug: 'github-pages', label: 'GitHub Pages', category: 'website-development', size: 'md' },
  { slug: 'creators-api', label: 'Creators API', category: 'website-development', size: 'sm' },
  { slug: 'ga4', label: 'GA4', category: 'marketing', size: 'lg' },
  { slug: 'gsc', label: 'GSC', category: 'marketing', size: 'md' },
  { slug: 'clarity', label: 'Clarity', category: 'marketing', size: 'md' },
  { slug: 'twitter', label: 'Twitter（X）', category: 'marketing', size: 'sm' },
  { slug: 'indesign', label: 'InDesign', category: 'creation', size: 'lg' },
  { slug: 'illustrator', label: 'Illustrator', category: 'creation', size: 'md' },
  { slug: 'photo', label: 'Photo', category: 'creation', size: 'md' },
];

export function getSkillsByCategory(categoryId: SkillCategoryId): Skill[] {
  return skills.filter((skill) => skill.category === categoryId);
}

export function getSkillBySlug(slug: string): Skill | undefined {
  return skills.find((skill) => skill.slug === slug);
}
