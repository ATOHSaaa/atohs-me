import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

function parseBlogTags(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => tag.trim()).filter(Boolean);
  }
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    /** 記事一覧などで表示するタグ（`a, b` または YAML 配列。先頭の # は表示側で付与） */
    tags: z
      .union([z.array(z.string()), z.string()])
      .default([])
      .transform(parseBlogTags),
    draft: z.boolean().default(false),
  }),
});

const career = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/career' }),
  schema: z.object({
    title: z.string(),
  }),
});

const keywords = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/keywords' }),
  schema: z.object({
    title: z.string(),
    /** 一覧での並び順（小さいほど先） */
    order: z.number().default(0),
    /** 表示用の最終更新日（省略時は Markdown ファイルの更新日時） */
    updated: z.coerce.date().optional(),
  }),
});

const about = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/about' }),
  schema: z.object({
    title: z.string().default('About'),
  }),
});

export const collections = { blog, career, keywords, about };
