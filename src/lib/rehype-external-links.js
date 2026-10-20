import { visit } from 'unist-util-visit';

const SITE_HOSTS = new Set(['atohs.me', 'www.atohs.me']);

function isExternalHref(href) {
  if (!href || typeof href !== 'string') return false;
  if (href.startsWith('#') || href.startsWith('/')) return false;
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;

  try {
    const { hostname } = new URL(href);
    return !SITE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/** ブログ本文など Markdown 内の外部リンクを新しいタブで開く。 */
export function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;

      const href = node.properties?.href;
      if (!isExternalHref(href)) return;

      node.properties.target = '_blank';
      node.properties.rel = 'noopener noreferrer';
    });
  };
}
