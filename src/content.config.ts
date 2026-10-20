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
    /** OGP 画像用の短いタイトル（省略時は title） */
    ogTitle: z.string().optional(),
    pubDate: z.coerce.date(),
    /** 記事一覧などで表示するタグ（`a, b` または YAML 配列。先頭の # は表示側で付与） */
    tags: z
      .union([z.array(z.string()), z.string()])
      .default([])
      .transform(parseBlogTags),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
