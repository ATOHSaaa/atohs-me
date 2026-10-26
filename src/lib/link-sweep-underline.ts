const SPLIT_ATTR = 'data-link-sweep-split';
const LINE_CLASS = 'link-sweep-line';
const PRESERVE_SELECTOR = '.visually-hidden, .link-external-mark';

const BLOG_SWEEP_SELECTOR = '.blog-list-title-wrap a';

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

function detachPreserved(host: HTMLElement): ChildNode[] {
  const preserved: ChildNode[] = [];
  host.querySelectorAll(PRESERVE_SELECTOR).forEach((el) => {
    preserved.push(el);
    el.remove();
  });
  return preserved;
}

function getSweepTextFromHost(host: HTMLElement): string {
  const lineEls = host.querySelectorAll(`.${LINE_CLASS}`);
  if (lineEls.length > 0) {
    return [...lineEls].map((line) => line.textContent ?? '').join('');
  }
  return (host.textContent ?? '').trim();
}

function resetHost(host: HTMLElement): { sweepText: string; preserved: ChildNode[] } {
  const preserved = detachPreserved(host);
  const sweepText = getSweepTextFromHost(host);
  host.replaceChildren(document.createTextNode(sweepText));
  host.removeAttribute(SPLIT_ATTR);
  host.style.removeProperty('--title-line-count');
  return { sweepText, preserved };
}

/**
 * Range の1文字計測は禁則・英単語境界を見ない。
 * - 行頭禁則（」など）→ 前行へ
 * - 英単語の途中改行 → 単語ごと次行へ
 * - 行末禁則（「など）→ 次行へ（1文字引き上げると「I / nditer」になる）
 */
const LINE_START_FORBIDDEN =
  /^[、。，．・：；？！゛゜´｀¨＾￣＿ヽヾゝゞ々‐–—―〜ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶー）］｝〉》」』】〕〗〙〛〞〟’”›»％‰℃°′″…‥]+/u;

const LINE_END_FORBIDDEN_CHARS = /[（［｛〈《「『【〔〖〘〚〝‘“‹«]+$/u;
const LATIN_WORD_END = /[A-Za-z0-9][A-Za-z0-9._-]*$/;
const LATIN_WORD_START = /^[A-Za-z0-9._-]+/;

function removeEmptyLines(lines: string[]): void {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i] === '') lines.splice(i, 1);
  }
}

function applyKinsoku(lines: string[]): string[] {
  const result = lines.filter((line) => line.length > 0);
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 1; i < result.length; i++) {
      // 英単語の途中で割れている → 末尾の断片を次行へ
      if (LATIN_WORD_END.test(result[i - 1]) && LATIN_WORD_START.test(result[i])) {
        const trailing = result[i - 1].match(LATIN_WORD_END);
        if (trailing) {
          result[i - 1] = result[i - 1].slice(0, -trailing[0].length);
          result[i] = trailing[0] + result[i];
          changed = true;
        }
      }

      // 行末禁則: 開き括弧などを次行先頭へ送る
      const endMatch = result[i - 1].match(LINE_END_FORBIDDEN_CHARS);
      if (endMatch) {
        result[i - 1] = result[i - 1].slice(0, -endMatch[0].length);
        result[i] = endMatch[0] + result[i];
        changed = true;
      }

      // 行頭禁則: 閉じ括弧などを前行末へ戻す
      const startMatch = result[i].match(LINE_START_FORBIDDEN);
      if (startMatch) {
        result[i - 1] += startMatch[0];
        result[i] = result[i].slice(startMatch[0].length);
        changed = true;
      }

      if (result[i - 1] === '' || result[i] === '') {
        removeEmptyLines(result);
        changed = true;
        break;
      }
    }
  }

  return result.length > 0 ? result : lines;
}

/** 折り返し位置を1文字ずつ測って行テキストに分割（日本語など空白なしでも動く） */
function measureLineTexts(host: HTMLElement, text: string): string[] {
  host.replaceChildren(document.createTextNode(text));
  const textNode = host.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return [text];
  }

  const range = document.createRange();
  const node = textNode as Text;
  const lines: string[] = [];
  let lineStart = 0;
  let prevTop: number | null = null;

  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const top = range.getBoundingClientRect().top;
    if (prevTop !== null && Math.abs(top - prevTop) > 2) {
      lines.push(text.slice(lineStart, i));
      lineStart = i;
    }
    prevTop = top;
  }
  lines.push(text.slice(lineStart));
  return applyKinsoku(lines);
}

function applyLineSpans(
  host: HTMLElement,
  lineTexts: string[],
  preserved: ChildNode[],
): void {
  host.replaceChildren();
  host.style.setProperty('--title-line-count', String(lineTexts.length));
  lineTexts.forEach((lineText, index) => {
    const line = document.createElement('span');
    line.className = LINE_CLASS;
    line.style.setProperty('--line-index', String(index));
    line.textContent = lineText;
    host.appendChild(line);
  });
  preserved.forEach((node) => host.appendChild(node));
  host.setAttribute(SPLIT_ATTR, '1');
}

function splitHost(
  host: HTMLElement,
  sweepText: string,
  preserved: ChildNode[],
): void {
  if (!sweepText.trim()) {
    preserved.forEach((node) => host.appendChild(node));
    host.setAttribute(SPLIT_ATTR, '1');
    return;
  }

  const lineTexts = measureLineTexts(host, sweepText);
  applyLineSpans(host, lineTexts, preserved);
}

function prefersSweepSplit(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** タッチ端末向け: 分割をやめて自然折り返しに戻す（nowrap 行のはみ出し防止） */
function flattenHost(host: HTMLElement): void {
  const { sweepText, preserved } = resetHost(host);
  host.replaceChildren(document.createTextNode(sweepText));
  preserved.forEach((node) => host.appendChild(node));
}

function processHost(host: HTMLElement, force: boolean): void {
  if (!prefersSweepSplit()) {
    flattenHost(host);
    return;
  }

  if (!force && host.hasAttribute(SPLIT_ATTR)) {
    return;
  }

  const { sweepText, preserved } = resetHost(host);
  splitHost(host, sweepText, preserved);
}

export function initLinkSweepUnderlines(
  root: ParentNode = document,
  force = false,
): void {
  const hosts = root.querySelectorAll<HTMLElement>(BLOG_SWEEP_SELECTOR);
  for (const host of hosts) {
    processHost(host, force);
  }
}

let setupDone = false;

export function setupLinkSweepUnderlines(): void {
  const run = (force = false) => {
    requestAnimationFrame(() => initLinkSweepUnderlines(document, force));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => run(false), {
      once: true,
    });
  } else {
    run(false);
  }

  document.fonts?.ready.then(() => run(true));

  document.addEventListener('astro:page-load', () => run(false));

  if (!setupDone) {
    setupDone = true;
    window.addEventListener('resize', debounce(() => run(true), 150));
    window
      .matchMedia('(hover: hover) and (pointer: fine)')
      .addEventListener('change', () => run(true));
  }
}
