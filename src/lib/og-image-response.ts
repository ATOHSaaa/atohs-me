import { generateOgImage } from './og-image';

export async function ogImageResponse(
  title: string,
  cacheControl: string,
): Promise<Response> {
  const png = await generateOgImage(title);
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': cacheControl,
    },
  });
}
