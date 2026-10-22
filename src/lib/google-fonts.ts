/**
 * Google Fonts の URL 生成（`scripts/split-site-css.mjs` と同期）。
 * 実際の読み込みは `src/styles/google-fonts.css` の @import（`display=swap`）。
 * CLS 軽減用のメトリクス付きフォールバックは fontaine（`astro.config.mjs`）が付与。
 */
export const GOOGLE_FONT_WEIGHTS = [400, 500, 600, 700, 800, 900] as const;

const weightList = GOOGLE_FONT_WEIGHTS.join(';');

/** Roboto + Noto Sans JP（1 リクエスト・font-display: swap） */
export const GOOGLE_FONTS_STYLESHEET_HREF =
  `https://fonts.googleapis.com/css2?family=Roboto:wght@${weightList}` +
  `&family=Noto+Sans+JP:wght@${weightList}&display=swap`;
