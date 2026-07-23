import type { ImageMetadata } from 'astro';
import type { CollectionEntry } from 'astro:content';

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/blog/**/*.{png,jpg,jpeg,webp,gif}',
  { eager: true },
);

export type BlogPhoto = {
  src: ImageMetadata;
  alt: string;
  postId: string;
  postTitle: string;
};

const IMAGE_MD_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function resolveLocalImage(mdSrc: string): ImageMetadata | undefined {
  if (/^(https?:|data:|\/\/)/i.test(mdSrc)) return undefined;

  const relative = mdSrc.replace(/^\.\//, '').replace(/^\//, '');
  const suffix = `/content/blog/${relative}`;
  const entry = Object.entries(imageModules).find(([key]) =>
    key.replaceAll('\\', '/').endsWith(suffix),
  );

  return entry?.[1].default;
}

/** Collect local images referenced in published blog posts, newest posts first. */
export function collectBlogPhotos(posts: CollectionEntry<'blog'>[]): BlogPhoto[] {
  const sorted = [...posts].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
  const photos: BlogPhoto[] = [];

  for (const post of sorted) {
    const body = post.body ?? '';
    for (const match of body.matchAll(IMAGE_MD_RE)) {
      const mdSrc = match[2];
      const src = resolveLocalImage(mdSrc);
      if (!src) continue;

      photos.push({
        src,
        alt: match[1] || post.data.title,
        postId: post.id,
        postTitle: post.data.title,
      });
    }
  }

  return photos;
}
