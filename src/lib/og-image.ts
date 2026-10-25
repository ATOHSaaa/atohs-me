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

/** 行幅に収まるよう文字単位で折り返す（省略なし） */
function wrapTitle(title: string, fontSize: number, contentWidth: number): string {
  const lines: string[] = [];
  let currentLine = '';
  let currentWidth = 0;

  for (const ch of [...title]) {
    const width = charWidth(ch, fontSize);

    if (currentLine && currentWidth + width > contentWidth) {
      lines.push(currentLine);
      currentLine = ch;
      currentWidth = width;
      continue;
    }

    currentLine += ch;
    currentWidth += width;
  }

  if (currentLine) lines.push(currentLine);

  return lines.join('\n');
}

export async function generateOgImage(title: string): Promise<Buffer> {
  const font = await loadFont();
  const contentWidth = WIDTH - PAD_X * 2;
  const wrappedTitle = wrapTitle(title, TITLE_FONT_SIZE, contentWidth);

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
