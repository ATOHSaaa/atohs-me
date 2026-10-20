function readMetaContent(html, key, attr = 'property') {
  const patterns = [
    new RegExp(
      `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }

  return undefined;
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function readTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function resolveUrl(value, baseUrl) {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return undefined;
  }
}

/** HTML から OGP / 基本メタを抽出する。 */
export function parseOgpFromHtml(html, pageUrl) {
  const title =
    readMetaContent(html, 'og:title') ??
    readMetaContent(html, 'twitter:title', 'name') ??
    readTitle(html);

  const description =
    readMetaContent(html, 'og:description') ??
    readMetaContent(html, 'description', 'name') ??
    readMetaContent(html, 'twitter:description', 'name');

  const image = resolveUrl(
    readMetaContent(html, 'og:image') ??
      readMetaContent(html, 'twitter:image', 'name') ??
      readMetaContent(html, 'twitter:image:src', 'name'),
    pageUrl,
  );

  const siteName =
    readMetaContent(html, 'og:site_name') ??
    readMetaContent(html, 'application-name', 'name');

  return {
    title,
    description,
    image,
    siteName,
  };
}

/**
 * ページ URL から OGP メタデータを取得する（ビルド時）。
 * @param {string} url
 * @param {{ fallback?: Record<string, string | undefined> }} [options]
 */
export async function fetchOgpMetadata(url, options = {}) {
  const { fallback = {} } = options;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'atohs.me/1.0 (link-card; +https://atohs.me)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { url, ...fallback };
    }

    const html = await response.text();
    const parsed = parseOgpFromHtml(html, url);

    return {
      url,
      siteName: parsed.siteName ?? fallback.siteName,
      title: parsed.title ?? fallback.title,
      description: parsed.description ?? fallback.description,
      image: parsed.image ?? fallback.image,
    };
  } catch {
    return { url, ...fallback };
  }
}
