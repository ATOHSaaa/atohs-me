import { visit } from 'unist-util-visit';

/** `.blog-body img` の max-width。これより大きい原寸は srcset で出さない。 */
const CONTENT_IMAGE_WIDTH = 550;

/**
 * 記事本文のローカル画像を、表示幅（最大 550px）に合わせた WebP の srcset にする。
 * Astro の rehypeImages より前に実行する。
 */
export function rehypeContentImages() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;

      const src = node.properties?.src;
      if (typeof src !== 'string') return;
      if (/^(https?:|data:|\/\/|\/)/i.test(src)) return;

      node.properties.width = CONTENT_IMAGE_WIDTH;
      node.properties.widths = [400, 550, 700, 1100];
      node.properties.sizes = '(max-width: 720px) calc(100vw - 32px), 550px';
      node.properties.format = 'webp';
      node.properties.quality = 75;
    });
  };
}
