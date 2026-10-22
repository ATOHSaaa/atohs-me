import { visit } from 'unist-util-visit';
import { iconSvg } from './icons.ts';

const AMAZON_AFFILIATE_URL =
  /^https?:\/\/link\.amazon(?:\.com)?\/([A-Z0-9]{8,10})(?:[/?#].*)?$/i;

const AMAZON_PRODUCT_URL =
  /^https?:\/\/(?:www\.)?amazon\.co\.jp\/(?:[\w%-]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{8,10})(?:[/?#].*)?$/i;

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseAmazonUrl(url) {
  const affiliateMatch = url.match(AMAZON_AFFILIATE_URL);
  if (affiliateMatch) {
    return { url, asin: affiliateMatch[1] };
  }

  const productMatch = url.match(AMAZON_PRODUCT_URL);
  if (productMatch) {
    return { url, asin: productMatch[1] };
  }

  return null;
}

function getStandaloneAmazonLink(paragraph) {
  const children = paragraph.children.filter(
    (child) => !(child.type === 'text' && !child.value.trim())
  );

  if (children.length !== 1) {
    return null;
  }

  const child = children[0];

  if (child.type === 'link') {
    const parsed = parseAmazonUrl(child.url);
    if (!parsed) return null;

    const title = child.children
      .filter((node) => node.type === 'text')
      .map((node) => node.value)
      .join('')
      .trim();

    return { ...parsed, title };
  }

  if (child.type === 'text') {
    const parsed = parseAmazonUrl(child.value.trim());
    return parsed ? { ...parsed, title: '' } : null;
  }

  return null;
}

function createAmazonCard({ url, asin, title }) {
  const displayTitle = title || 'Amazonで商品を見る';
  const safeUrl = escapeHtml(url);
  const safeTitle = escapeHtml(displayTitle);
  const safeAsin = escapeHtml(asin);
  const metaLine = title
    ? ''
    : `<span class="amazon-card-meta">ASIN: ${safeAsin}</span>`;

  return {
    type: 'html',
    value: `<div class="amazon-card">
  <a class="amazon-card-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer sponsored">
    <span class="amazon-card-icon" aria-hidden="true">${iconSvg('amazon')}</span>
    <span class="amazon-card-body">
      <span class="amazon-card-label">Amazon.co.jp</span>
      <span class="amazon-card-title">${safeTitle}</span>
      ${metaLine}
    </span>
    <span class="amazon-card-arrow" aria-hidden="true">→</span>
  </a>
</div>`,
  };
}

/**
 * 段落内に単独で書かれた Amazon アフィリエイト / 商品 URL をカードに変換する。
 *
 * - https://link.amazon/B02fnXNBb
 * - [作品名](https://link.amazon/B02fnXNBb) … リンクテキストがカードのタイトルになる
 */
export function remarkAmazonCards() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (index == null || !parent) return;

      const link = getStandaloneAmazonLink(node);
      if (!link) return;

      parent.children[index] = createAmazonCard(link);
    });
  };
}
