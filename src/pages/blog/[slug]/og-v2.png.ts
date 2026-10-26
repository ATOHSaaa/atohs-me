import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ogImageResponse } from '../../../lib/og-image-response';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }));
}

export const GET: APIRoute = async ({ props }) =>
  ogImageResponse(props.title, 'public, max-age=31536000, immutable');
