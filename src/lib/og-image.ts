import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const WIDTH = 1200;
const HEIGHT = 630;
const PAD_X = 48;
const PAD_Y = 72;

async function loadFont() {
  const fontPath = join(process.cwd(), 'src/assets/fonts/NotoSansCJKjp-Bold.otf');
  return readFile(fontPath);
}

function titleFontSize(title: string) {
  const len = [...title].length;
  if (len > 36) return 72;
  if (len > 28) return 84;
  if (len > 18) return 92;
  return 104;
}

/** 行末で切ってよい直前の文字（幅いっぱいまで詰め、ここで折る） */
const BREAK_AFTER = new Set([
  '、',
  '。',
  'を',
  'に',
  'で',
  'と',
  'が',
  'は',
  'の',
  'ら',
  '！',
  '？',
  ' ',
]);

function charWidth(ch: string, fontSize: number) {
  if (ch === ' ') return fontSize * 0.3;
  if (/[\x00-\x7F]/.test(ch)) return fontSize * 0.56;
  return fontSize;
}

/** 1 行をできるだけ長く使い、句読点・助詞の後で折る */
function wrapTitleGreedy(title: string, fontSize: number, contentWidth: number) {
  const chars = [...title];
  const lines: string[] = [];
  let start = 0;

  while (start < chars.length) {
    let width = 0;
    let lastBreak = -1;
    let end = start;

    for (let i = start; i < chars.length; i++) {
      const nextWidth = width + charWidth(chars[i], fontSize);
      if (nextWidth > contentWidth && i > start) break;

      width = nextWidth;
      end = i + 1;
      if (BREAK_AFTER.has(chars[i])) lastBreak = i + 1;
    }

    let breakAt = end;
    if (end < chars.length && lastBreak > start) {
      breakAt = lastBreak;
    }

    lines.push(chars.slice(start, breakAt).join(''));
    start = breakAt;
  }

  return lines.join('\n');
}

export async function generateOgImage(title: string): Promise<Buffer> {
  const font = await loadFont();
  const titleSize = titleFontSize(title);
  const contentWidth = WIDTH - PAD_X * 2;
  const wrappedTitle = wrapTitleGreedy(title, titleSize, contentWidth);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#FBFAF7',
          color: 'rgb(10, 10, 55)',
          borderTop: '24px solid rgb(10, 10, 55)',
          paddingTop: `${PAD_Y}px`,
          paddingBottom: `${PAD_Y}px`,
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
                fontSize: 52,
                fontWeight: 700,
                marginBottom: 40,
              },
              children: 'atohs.me/blog',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                width: `${contentWidth}px`,
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.3,
                whiteSpace: 'pre-wrap',
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
