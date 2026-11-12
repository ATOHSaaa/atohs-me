import { join } from 'node:path';

import { OG_IMAGE_FILENAME } from './og-image';

const SITE_ORIGIN = 'https://atohs.me';

/** サイト内ナビの表記に合わせる URL 第1セグメント */
const FIRST_SEGMENT_LABEL: Record<string, string> = {
  blog: 'Blog',
  about: 'About',
  contact: 'Contact',
  works: 'Works',
  resume: 'Resume',
  skills: 'Skills',
  keywords: 'Keywords',
  project: 'Project',
};

export function normalizePathname(pathname: string): string {
  let p = pathname.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

export function pathnameFromCanonicalUrl(canonicalUrl: string): string {
  return normalizePathname(new URL(canonicalUrl).pathname);
}

/** OGP 画像内に描画するパスラベル（例: `atohs.me/Blog/tags/foo`） */
export function pathLabelForOg(pathname: string): string {
  const p = normalizePathname(pathname);
  if (p === '/') return 'atohs.me';

  const segments = p.slice(1).split('/');
  const display = segments.map((seg, i) => {
    const decoded = decodeURIComponent(seg);
    if (i === 0 && FIRST_SEGMENT_LABEL[decoded]) {
      return FIRST_SEGMENT_LABEL[decoded];
    }
    return decoded;
  });
  return `atohs.me/${display.join('/')}`;
}

/** canonical URL からパス表示 OGP の絶対 URL */
export function pathOgImageUrl(canonicalUrl: string): string {
  const p = pathnameFromCanonicalUrl(canonicalUrl);
  if (p === '/') return `${SITE_ORIGIN}/${OG_IMAGE_FILENAME}`;
  const relative = p
    .slice(1)
    .split('/')
    .map((seg) => {
      let decoded = seg;
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        /* keep seg */
      }
      if (/[\/\\]/.test(decoded)) {
        return seg.includes('%') ? seg : encodeURIComponent(decoded);
      }
      return encodeURIComponent(decoded);
    })
    .join('/');
  return `${SITE_ORIGIN}/${relative}/${OG_IMAGE_FILENAME}`;
}

/** リポジトリ内の `public/.../og.png` 出力パス */
export function publicOgFilePath(pathname: string, cwd = process.cwd()): string {
  const p = normalizePathname(pathname);
  if (p === '/') return join(cwd, 'public', OG_IMAGE_FILENAME);
  const parts: string[] = [];
  for (const seg of p.slice(1).split('/')) {
    let decoded = seg;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      /* keep seg */
    }
    parts.push(/[\/\\]/.test(decoded) ? seg : decoded);
  }
  return join(cwd, 'public', ...parts, OG_IMAGE_FILENAME);
}
