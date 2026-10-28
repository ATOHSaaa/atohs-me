import { generateOgImage, type GenerateOgImageOptions } from './og-image';

export async function ogImageResponse(
  title: string,
  cacheControl: string,
  options: GenerateOgImageOptions = {},
): Promise<Response> {
  const png = await generateOgImage(title, options);
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': cacheControl,
    },
  });
}
