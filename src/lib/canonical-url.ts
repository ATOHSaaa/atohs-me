/** 本番 canonical・og:url の正規化（末尾スラッシュ付きパス、https・atohs.me） */
export const SITE_ORIGIN = 'https://atohs.me';

export function canonicalUrl(urlOrPath: string): string {
  let url: URL;
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    url = new URL(urlOrPath);
  } else {
    const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
    url = new URL(path, SITE_ORIGIN);
  }

  url.protocol = 'https:';
  url.hostname = 'atohs.me';
  url.search = '';
  url.hash = '';

  let { pathname } = url;
  if (pathname !== '/' && !pathname.endsWith('/')) {
    pathname = `${pathname}/`;
  }
  url.pathname = pathname;

  return url.href;
}
