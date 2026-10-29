import { fileURLToPath } from 'node:url';
import { visit } from 'unist-util-visit';

const rehypeImagesPath = fileURLToPath(
  new URL('../../node_modules/@astrojs/markdown-remark/dist/rehype-images.js', import.meta.url),
);
const { rehypeImages } = await import(/* @vite-ignore */ rehypeImagesPath);

/** `.blog-body img` の max-width。これより大きい原寸は srcset で出さない。 */
const CONTENT_IMAGE_WIDTH = 550;

function isLocalContentImageSrc(src) {
  return typeof src === 'string' && !/^(https?:|data:|\/\/|\/)/i.test(src);
}

/**
 * 記事本文のローカル画像を、表示幅（最大 550px）に合わせた WebP の srcset にする。
 * 内蔵 rehypeImages の直前に寸法を付け、同プラグイン内で rehypeImages を実行してから
 * 先頭ローカル画像の __ASTRO_IMAGE_ に priority を付与する（内蔵 rehypeImages は二重実行を避けてスキップ）。
 */
export function rehypeContentImages() {
  return async (tree, file) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;

      const src = node.properties?.src;
      if (!isLocalContentImageSrc(src)) return;

      node.properties.width = CONTENT_IMAGE_WIDTH;
      node.properties.widths = [400, 550, 700, 1100];
      node.properties.sizes = '(max-width: 720px) calc(100vw - 32px), 550px';
      node.properties.format = 'webp';
      node.properties.quality = 75;
    });

    await rehypeImages()(tree, file);

    const localPaths = file.data.astro?.localImagePaths ?? [];
    let firstLcpPatched = false;

    visit(tree, 'element', (node) => {
      if (firstLcpPatched || node.tagName !== 'img') return;

      const encoded = node.properties?.__ASTRO_IMAGE_;
      if (typeof encoded !== 'string') return;

      const data = JSON.parse(encoded);
      if (!localPaths.includes(data.src)) return;

      data.priority = true;
      node.properties.__ASTRO_IMAGE_ = JSON.stringify(data);
      firstLcpPatched = true;
    });
  };
}
