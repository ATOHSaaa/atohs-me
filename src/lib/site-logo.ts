import siteLogo from '../assets/site-logo.png';

/** ヘッダー・プロフィールで使うアイコン（ビルド時に WebP 化） */
export { siteLogo };

/** ブラウザタブ用・OGP ブランド行用（`scripts/generate-favicon.mjs` で site-logo から円形に生成） */
export const SITE_FAVICON_SRC = '/src/favicon.ico';

/** 表示用アイコンの出力サイズ（CSS で縮小表示するため 1 サイズに統一） */
export const SITE_LOGO_DISPLAY_SIZE = 128;
