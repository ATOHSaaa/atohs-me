import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const WIDTH = 1200;
const HEIGHT = 630;
const PAD_X = 96;
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

function estimateLineCount(title: string, fontSize: number, contentWidth: number) {
  const chars = [...title].length;
  const charsPerLine = Math.max(4, Math.floor(contentWidth / (fontSize * 0.92)));
  return Math.max(1, Math.ceil(chars / charsPerLine));
}

function wrapBalancedTitle(title: string, lineCount: number) {
  const chars = [...title];
  if (lineCount <= 1) return title;

  const lines: string[] = [];
  let start = 0;
  const breakAfter = new Set(['、', '。', 'を', 'に', 'で', 'と', 'が', 'は', 'の', 'ら', '！', '？', ' ']);

  for (let i = 0; i < lineCount - 1; i++) {
    const remainingLines = lineCount - i;
    const remainingChars = chars.length - start;
    const idealLen = remainingChars / remainingLines;
    let bestBreak = start + Math.round(idealLen);
    bestBreak = Math.max(start + 1, Math.min(chars.length - (remainingLines - 1), bestBreak));

    for (let offset = 0; offset <= 4; offset++) {
      for (const delta of [0, offset, -offset]) {
        const candidate = bestBreak + delta;
        if (
          candidate > start &&
          candidate < chars.length - (remainingLines - 1) &&
          breakAfter.has(chars[candidate - 1])
        ) {
          bestBreak = candidate;
          break;
        }
      }
    }

    const minLen = Math.ceil(idealLen);
    if (bestBreak - start < minLen) {
      bestBreak = Math.min(start + minLen, chars.length - (remainingLines - 1));
    }

    lines.push(chars.slice(start, bestBreak).join(''));
    start = bestBreak;
  }

  lines.push(chars.slice(start).join(''));
  return lines.join('\n');
}

export async function generateOgImage(title: string): Promise<Buffer> {
  const font = await loadFont();
  const titleSize = titleFontSize(title);
  const contentWidth = WIDTH - PAD_X * 2;
  const wrappedTitle = wrapBalancedTitle(
    title,
    estimateLineCount(title, titleSize, contentWidth),
  );

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
