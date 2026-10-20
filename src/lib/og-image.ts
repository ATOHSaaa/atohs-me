import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const WIDTH = 1200;
const HEIGHT = 630;
const PAD_X = 48;
const PAD_TOP = 56;
const PAD_BOTTOM = 72;
const MAX_LINES = 3;
const MIN_TITLE_FONT = 56;
const LINE_HEIGHT = 1.35;

async function loadFont() {
  const fontPath = join(process.cwd(), 'src/assets/fonts/NotoSansCJKjp-Bold.otf');
  return readFile(fontPath);
}

function baseTitleFontSize(title: string) {
  const len = [...title].length;
  if (len > 40) return 64;
  if (len > 32) return 72;
  if (len > 24) return 80;
  if (len > 18) return 92;
  return 104;
}

/** 改行で分割しない塊（引用符付き固有名・英数字） */
function tokenizeTitle(title: string): string[] {
  const tokens: string[] = [];
  const chars = [...title];
  let i = 0;

  while (i < chars.length) {
    if (chars[i] === '「') {
      let j = i + 1;
      while (j < chars.length && chars[j] !== '」') j += 1;
      if (j < chars.length) j += 1;
      tokens.push(chars.slice(i, j).join(''));
      i = j;
      continue;
    }

    if (/[A-Za-z0-9]/.test(chars[i])) {
      let j = i;
      while (j < chars.length && /[A-Za-z0-9]/.test(chars[j])) j += 1;
      tokens.push(chars.slice(i, j).join(''));
      i = j;
      continue;
    }

    tokens.push(chars[i]);
    i += 1;
  }

  return tokens;
}

function charWidth(ch: string, fontSize: number) {
  if (ch === ' ') return fontSize * 0.3;
  if (/[\x00-\x7F]/.test(ch)) return fontSize * 0.56;
  return fontSize;
}

function tokenWidth(token: string, fontSize: number) {
  return [...token].reduce((sum, ch) => sum + charWidth(ch, fontSize), 0);
}

function lineWidth(line: string, fontSize: number) {
  return [...line].reduce((sum, ch) => sum + charWidth(ch, fontSize), 0);
}

/** トークン単位で折り返し（英数字・「」内は分割しない） */
function wrapTitleWithTokens(
  title: string,
  fontSize: number,
  contentWidth: number,
): string[] {
  const tokens = tokenizeTitle(title);
  const lines: string[] = [];
  let currentLine = '';
  let currentWidth = 0;

  for (const token of tokens) {
    const width = tokenWidth(token, fontSize);

    if (currentLine && currentWidth + width > contentWidth) {
      lines.push(currentLine);
      currentLine = token;
      currentWidth = width;
      continue;
    }

    if (!currentLine && width > contentWidth) {
      lines.push(token);
      currentLine = '';
      currentWidth = 0;
      continue;
    }

    currentLine += token;
    currentWidth += width;
  }

  if (currentLine) lines.push(currentLine);

  return lines;
}

function truncateWithEllipsis(
  line: string,
  fontSize: number,
  contentWidth: number,
): string {
  const ellipsis = '…';
  const ellipsisWidth = tokenWidth(ellipsis, fontSize);
  let text = line;

  while (text.length > 0 && lineWidth(text, fontSize) + ellipsisWidth > contentWidth) {
    text = text.slice(0, -1);
  }

  return text.length > 0 ? `${text}${ellipsis}` : ellipsis;
}

function fitTitleLayout(title: string, contentWidth: number) {
  for (
    let fontSize = baseTitleFontSize(title);
    fontSize >= MIN_TITLE_FONT;
    fontSize -= 4
  ) {
    const lines = wrapTitleWithTokens(title, fontSize, contentWidth);
    const overflow = lines.some((line) => lineWidth(line, fontSize) > contentWidth);

    if (lines.length <= MAX_LINES && !overflow) {
      return { fontSize, text: lines.join('\n') };
    }
  }

  const fontSize = MIN_TITLE_FONT;
  let lines = wrapTitleWithTokens(title, fontSize, contentWidth);

  if (lines.length > MAX_LINES) {
    const kept = lines.slice(0, MAX_LINES - 1);
    kept.push(
      truncateWithEllipsis(lines[MAX_LINES - 1], fontSize, contentWidth),
    );
    lines = kept;
  } else {
    lines = lines.map((line) =>
      lineWidth(line, fontSize) > contentWidth
        ? truncateWithEllipsis(line, fontSize, contentWidth)
        : line,
    );
  }

  return { fontSize, text: lines.join('\n') };
}

export async function generateOgImage(title: string): Promise<Buffer> {
  const font = await loadFont();
  const contentWidth = WIDTH - PAD_X * 2;
  const { fontSize: titleSize, text: wrappedTitle } = fitTitleLayout(
    title,
    contentWidth,
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
          justifyContent: 'flex-start',
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
                fontSize: 48,
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
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: LINE_HEIGHT,
                whiteSpace: 'pre-wrap',
                flexGrow: 1,
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
