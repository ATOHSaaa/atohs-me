import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { formatDate } from './format-date';

const WIDTH = 1200;
const HEIGHT = 630;
const PAD_X = 48;
const PAD_TOP = 56;
const PAD_BOTTOM = 72;
/** タイトル長に依存せず常に同じサイズ（note の自動 OGP 画像に近い扱い） */
const TITLE_FONT_SIZE = 72;
const SUBTITLE_FONT_SIZE = 48;
/** `scripts/generate-favicon.mjs` が生成（サイズ変更時はスクリプト側も合わせる） */
export const BRAND_ICON_SIZE = 56;
const BRAND_ICON_CIRCLE_PATH = join(
  process.cwd(),
  `src/assets/site-logo-circle-${BRAND_ICON_SIZE}.png`,
);
const BRAND_ICON_GAP = 16;
/** Satori の行ボックス余白でアイコンが上に見えるのを補正 */
const BRAND_ICON_NUDGE_Y = 7;
const LINE_HEIGHT = 1.35;
/** タイトル折り返し: 先頭 `[A-Za-z0-9]` から `[A-Za-z0-9_:/.-]*` までを1トークン（`og:image` などを途中で切らない） */
const TITLE_ASCII_WORD_HEAD = /[A-Za-z0-9]/;
const TITLE_ASCII_WORD_TAIL = /[A-Za-z0-9_:/.-]/;
const FOOTER_FONT_SIZE = 36;
const TEXT_COLOR = 'rgb(10, 10, 55)';
/** 記事メタの `--color-text-muted`（light / contrast 100%）に近い */
const FOOTER_TEXT_COLOR = 'rgba(10, 10, 55, 0.6)';
/** 記事 OGP のファイル名（`public/blog/<slug>/` に配置） */
export const OG_IMAGE_FILENAME = 'og.png';

export type GenerateOgImageOptions = {
  tags?: string[];
  pubDate?: Date;
};

async function loadFont() {
  const fontPath = join(process.cwd(), 'src/assets/fonts/NotoSansCJKjp-Bold.otf');
  return readFile(fontPath);
}

/** favicon 生成と同じ円形ロゴ（事前生成 PNG） */
async function loadBrandIconDataUrl(): Promise<string> {
  let png: Buffer;
  try {
    png = await readFile(BRAND_ICON_CIRCLE_PATH);
  } catch {
    throw new Error(
      `OG brand icon not found: ${BRAND_ICON_CIRCLE_PATH}. Run npm run favicon:generate`,
    );
  }
  return `data:image/png;base64,${png.toString('base64')}`;
}

function isAtSign(ch: string) {
  return ch === '@' || ch === '\uFF20';
}

function charWidth(ch: string, fontSize: number) {
  if (ch === ' ') return fontSize * 0.3;
  if (/[\x00-\x7F]/.test(ch)) return fontSize * 0.56;
  return fontSize;
}

/** `@` 句、`og:image` などの ASCII 語、それ以外は1文字（和字）単位 */
function titleTokens(title: string): string[] {
  const tokens: string[] = [];
  const chars = [...title];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (isAtSign(ch)) {
      let token = ch;
      i++;
      while (i < chars.length && chars[i] !== ' ' && chars[i] !== '\n' && chars[i] !== '\t') {
        token += chars[i];
        i++;
      }
      tokens.push(token);
      i--;
      continue;
    }

    if (TITLE_ASCII_WORD_HEAD.test(ch)) {
      let token = ch;
      i++;
      while (i < chars.length && TITLE_ASCII_WORD_TAIL.test(chars[i])) {
        token += chars[i];
        i++;
      }
      tokens.push(token);
      i--;
      continue;
    }

    tokens.push(ch);
  }

  return tokens;
}

/** 長いトークンを折り返すとき `@` だけの行にしない（`@` + 最低1文字を維持） */
function wrapUnitsFromToken(token: string): string[] {
  const units: string[] = [];
  const chars = [...token];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!isAtSign(ch)) {
      units.push(ch);
      continue;
    }

    let unit = ch;
    if (i + 1 < chars.length) {
      i++;
      unit += chars[i];
    }
    units.push(unit);
  }

  return units;
}

function tokenWidth(token: string, fontSize: number): number {
  let width = 0;
  for (const ch of [...token]) width += charWidth(ch, fontSize);
  return width;
}

function appendCharToLine(
  lines: string[],
  line: { text: string; width: number },
  ch: string,
  fontSize: number,
  contentWidth: number,
) {
  const width = charWidth(ch, fontSize);
  if (line.text && line.width + width > contentWidth) {
    lines.push(line.text);
    line.text = ch;
    line.width = width;
    return;
  }
  line.text += ch;
  line.width += width;
}

function appendUnitToLine(
  lines: string[],
  line: { text: string; width: number },
  unit: string,
  fontSize: number,
  contentWidth: number,
) {
  const width = tokenWidth(unit, fontSize);
  if (line.text && line.width + width > contentWidth) {
    if (width <= contentWidth) {
      lines.push(line.text);
      line.text = unit;
      line.width = width;
      return;
    }
    lines.push(line.text);
    line.text = '';
    line.width = 0;
    for (const ch of [...unit]) {
      appendCharToLine(lines, line, ch, fontSize, contentWidth);
    }
    return;
  }

  line.text += unit;
  line.width += width;
}

/** 1トークンが行幅を超えるときだけ分割する（`@` 単独行を避ける） */
function appendTokenToLines(
  lines: string[],
  line: { text: string; width: number },
  token: string,
  fontSize: number,
  contentWidth: number,
) {
  const width = tokenWidth(token, fontSize);
  if (line.text && line.width + width > contentWidth) {
    if (width <= contentWidth) {
      lines.push(line.text);
      line.text = token;
      line.width = width;
      return;
    }
    lines.push(line.text);
    line.text = '';
    line.width = 0;
    for (const unit of wrapUnitsFromToken(token)) {
      appendUnitToLine(lines, line, unit, fontSize, contentWidth);
    }
    return;
  }

  line.text += token;
  line.width += width;
}

/** 行幅に収まるよう折り返す（省略なし） */
function wrapTitleLines(title: string, fontSize: number, contentWidth: number): string[] {
  const lines: string[] = [];
  const line = { text: '', width: 0 };

  for (const token of titleTokens(title)) {
    appendTokenToLines(lines, line, token, fontSize, contentWidth);
  }

  if (line.text) lines.push(line.text);

  return lines.length > 0 ? lines : [''];
}

function formatOgTags(tags: string[]): string {
  return tags.map((tag) => `#${tag}`).join(' ');
}

export async function generateOgImage(
  title: string,
  options: GenerateOgImageOptions = {},
): Promise<Buffer> {
  const { tags = [], pubDate } = options;
  const tagsLabel = formatOgTags(tags);
  const dateLabel = pubDate ? formatDate(pubDate) : '';

  const font = await loadFont();
  const brandIconSrc = await loadBrandIconDataUrl();
  const contentWidth = WIDTH - PAD_X * 2;
  /** Satori より少し狭く見積もり、再折り返しを避けつつ行幅をできるだけ使う */
  const wrapWidth = Math.floor(contentWidth * 0.99);
  const titleLines = wrapTitleLines(title, TITLE_FONT_SIZE, wrapWidth);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          backgroundColor: '#FBFAF7',
          color: TEXT_COLOR,
          paddingTop: `${PAD_TOP}px`,
          paddingBottom: `${PAD_BOTTOM}px`,
          paddingLeft: `${PAD_X}px`,
          paddingRight: `${PAD_X}px`,
          boxSizing: 'border-box',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                width: `${contentWidth}px`,
                minHeight: 0,
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: BRAND_ICON_GAP,
                      width: `${contentWidth}px`,
                      height: BRAND_ICON_SIZE,
                      fontSize: SUBTITLE_FONT_SIZE,
                      fontWeight: 700,
                      lineHeight: 1,
                      marginBottom: 32,
                      flexShrink: 0,
                    },
                    children: [
                      {
                        type: 'img',
                        props: {
                          src: brandIconSrc,
                          width: BRAND_ICON_SIZE,
                          height: BRAND_ICON_SIZE,
                          style: {
                            width: BRAND_ICON_SIZE,
                            height: BRAND_ICON_SIZE,
                            flexShrink: 0,
                            marginTop: BRAND_ICON_NUDGE_Y,
                          },
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            height: BRAND_ICON_SIZE,
                          },
                          children: 'atohs.me/blog',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      width: `${contentWidth}px`,
                      flexShrink: 0,
                    },
                    children: titleLines.map((line) => ({
                      type: 'div',
                      props: {
                        style: {
                          fontSize: TITLE_FONT_SIZE,
                          fontWeight: 700,
                          lineHeight: LINE_HEIGHT,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        },
                        children: line,
                      },
                    })),
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                width: `${contentWidth}px`,
                flexShrink: 0,
                marginTop: 24,
                fontSize: FOOTER_FONT_SIZE,
                fontWeight: 700,
                lineHeight: LINE_HEIGHT,
                color: FOOTER_TEXT_COLOR,
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      flex: 1,
                      paddingRight: 24,
                    },
                    children: tagsLabel,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      flexShrink: 0,
                      textAlign: 'right',
                    },
                    children: dateLabel,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: 'Noto Sans CJK JP',
          data: font,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: WIDTH,
    },
  });

  return Buffer.from(resvg.render().asPng());
}
