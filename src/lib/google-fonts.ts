/**
 * Google Fonts で読み込む weight（`src/styles/main.css` / `core.css` の font-weight に合わせる）。
 * 変数フォントの 100..900 一括読み込みは使わない。
 */
export const GOOGLE_FONT_WEIGHTS = [400, 500, 600, 700, 800, 900] as const;

const weightList = GOOGLE_FONT_WEIGHTS.join(';');

/** Roboto + Noto Sans JP（1 リクエスト） */
export const GOOGLE_FONTS_STYLESHEET_HREF =
  `https://fonts.googleapis.com/css2?family=Roboto:wght@${weightList}` +
  `&family=Noto+Sans+JP:wght@${weightList}&display=swap`;
