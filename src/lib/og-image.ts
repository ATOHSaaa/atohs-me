import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const WIDTH = 1200;
const HEIGHT = 630;
const PAD_X = 48;
const PAD_TOP = 56;
const PAD_BOTTOM = 72;
/** タイトル長に依存せず常に同じサイズ（note の自動 OGP 画像に近い扱い） */
const TITLE_FONT_SIZE = 56;
const SUBTITLE_FONT_SIZE = 48;
const LINE_HEIGHT = 1.35;
/** OGP 描画ロジック変更時にファイル名を上げる（`og.png` は CDN に古い画像が残ることがある） */
export const OG_IMAGE_FILENAME = 'og-v2.png';

async function loadFont() {
  const fontPath = join(process.cwd(), 'src/assets/fonts/NotoSansCJKjp-Bold.otf');
  return readFile(fontPath);
}

function isAtSign(ch: string) {
  return ch === '@' || ch === '\uFF20';
}

function charWidth(ch: string, fontSize: number) {
  if (ch === ' ') return fontSize * 0.3;
  if (/[\x00-\x7F]/.test(ch)) return fontSize * 0.56;
  return fontSize;
}

/** `@` と直後の非空白を1トークンにし、行の途中で `@` だけ孤立しないようにする */
function titleTokens(title: string): string[] {
  const tokens: string[] = [];
  const chars = [...title];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!isAtSign(ch)) {
      tokens.push(ch);
      continue;
    }

    let token = ch;
    i++;
    while (i < chars.length && chars[i] !== ' ' && chars[i] !== '\n' && chars[i] !== '\t') {
      token += chars[i];
      i++;
    }
    tokens.push(token);
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

  return lines;
}

export async function generateOgImage(title: string): Promise<Buffer> {
  const font = await loadFont();
  const contentWidth = WIDTH - PAD_X * 2;
  /** 実測より少し狭く見積もり、Satori 側の再折り返しを避ける */
  const wrapWidth = Math.floor(contentWidth * 0.97);
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
          color: 'rgb(10, 10, 55)',
          borderTop: '24px solid rgb(10, 10, 55)',
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
                width: `${contentWidth}px`,
                fontSize: SUBTITLE_FONT_SIZE,
                fontWeight: 700,
                marginBottom: 32,
                flexShrink: 0,
              },
              children: 'atohs.me/blog',
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
