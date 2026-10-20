import { visit } from 'unist-util-visit';
import { getLinkCardOgpMetadata } from './link-card-ogp-cache.js';
import { LINK_CARD_DEFINITIONS } from './link-cards.config.js';
import { renderOgpLinkCardHtml } from './link-card-html.js';

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    const path = parsed.pathname.replace(/\/$/, '') || '';
    return `${parsed.origin}${path}`;
  } catch {
    return url;
  }
}

function findDefinitionForParagraph(paragraph) {
  const children = paragraph.children.filter(
    (child) => !(child.type === 'text' && !child.value.trim()),
  );

  if (children.length !== 1) return null;

  const child = children[0];

  if (child.type === 'text') {
    const text = child.value.trim();
    return LINK_CARD_DEFINITIONS.find((def) => def.marker === text) ?? null;
  }

  if (child.type === 'link') {
    const normalized = normalizeUrl(child.url);
    return (
      LINK_CARD_DEFINITIONS.find(
        (def) => normalizeUrl(def.url) === normalized,
      ) ?? null
    );
  }

  return null;
}

/**
 * 登録済みマーカー / 単独リンクを OGP ベースのカード HTML に変換する（同期）。
 */
export function remarkLinkCards() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (index == null || !parent) return;

      const definition = findDefinitionForParagraph(node);
      if (!definition) return;

      const metadata = getLinkCardOgpMetadata(definition.url, definition.fallback);

      parent.children[index] = {
        type: 'html',
        value: renderOgpLinkCardHtml(metadata),
      };
    });
  };
}
