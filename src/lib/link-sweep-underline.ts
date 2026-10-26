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

/** 行分割は使わず、ブラウザの自然な折り返しに戻す */
function flattenHost(host: HTMLElement): void {
  const preserved = detachPreserved(host);
  const sweepText = getSweepTextFromHost(host);
  host.replaceChildren(document.createTextNode(sweepText));
  host.removeAttribute('data-link-sweep-split');
  host.style.removeProperty('--title-line-count');
  preserved.forEach((node) => host.appendChild(node));
}

export function initLinkSweepUnderlines(
  root: ParentNode = document,
  _force = false,
): void {
  const hosts = root.querySelectorAll<HTMLElement>(BLOG_SWEEP_SELECTOR);
  for (const host of hosts) {
    flattenHost(host);
  }
}

let setupDone = false;

export function setupLinkSweepUnderlines(): void {
  const run = () => {
    requestAnimationFrame(() => initLinkSweepUnderlines(document));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => run(), {
      once: true,
    });
  } else {
    run();
  }

  document.fonts?.ready.then(() => run());

  document.addEventListener('astro:page-load', () => run());

  if (!setupDone) {
    setupDone = true;
    window.addEventListener('resize', debounce(() => run(), 150));
  }
}
