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

async function loadFont() {
  const fontPath = join(process.cwd(), 'src/assets/fonts/NotoSansCJKjp-Bold.otf');
  return readFile(fontPath);
}

function charWidth(ch: string, fontSize: number) {
  if (ch === ' ') return fontSize * 0.3;
  if (/[\x00-\x7F]/.test(ch)) return fontSize * 0.56;
  return fontSize;
}

const WORD_JOINER = '\u2060';

/** `@` と直後の非空白を1トークンにし、行の途中で `@` だけ孤立しないようにする */
function titleTokens(title: string): string[] {
  const tokens: string[] = [];
  const chars = [...title];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch !== '@') {
      tokens.push(ch);
      continue;
    }

    let token = '@';
    i++;
    while (i < chars.length && chars[i] !== ' ' && chars[i] !== '\n' && chars[i] !== '\t') {
      token += chars[i];
      i++;
    }
    tokens.push(token);
  }

  return tokens;
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

/** 1トークンが行幅を超えるときだけ文字単位に分割する */
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
    for (const ch of [...token]) {
      appendCharToLine(lines, line, ch, fontSize, contentWidth);
    }
    return;
  }

  line.text += token;
  line.width += width;
}

/** 行幅に収まるよう折り返す（省略なし） */
function wrapTitle(title: string, fontSize: number, contentWidth: number): string {
  const lines: string[] = [];
  const line = { text: '', width: 0 };

  for (const token of titleTokens(title)) {
    appendTokenToLines(lines, line, token, fontSize, contentWidth);
  }

  if (line.text) lines.push(line.text);

  return lines.join('\n');
}

/** Satori の行分割で `@` の前後が切れないようにする */
function glueAtSignForRender(wrapped: string): string {
  return wrapped.replace(/@(?=\S)/g, `@${WORD_JOINER}`).replace(/(\S)@/g, `$1${WORD_JOINER}@`);
}

export async function generateOgImage(title: string): Promise<Buffer> {
  const font = await loadFont();
  const contentWidth = WIDTH - PAD_X * 2;
  const wrappedTitle = glueAtSignForRender(wrapTitle(title, TITLE_FONT_SIZE, contentWidth));

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
                width: `${contentWidth}px`,
                fontSize: TITLE_FONT_SIZE,
                fontWeight: 700,
                lineHeight: LINE_HEIGHT,
                whiteSpace: 'pre-wrap',
                flexShrink: 0,
              },
              children: wrappedTitle,
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
