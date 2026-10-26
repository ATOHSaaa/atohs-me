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
  return lines;
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

function processHost(host: HTMLElement, force: boolean): void {
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
  }
}
