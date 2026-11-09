import { extractLinkTargets } from './extract-links';
import { buildMemoParseContext, type ResolvedMemoTarget } from './link-context';
import { normalizeScrapboxKey } from './title-match';
import { memoPagePath } from './slug';
import type { BuiltMemoPage, MemoTwoHopGroup } from './types';

type RawTarget = ReturnType<typeof extractLinkTargets>[number];

export function computePageLinkSections(
  page: BuiltMemoPage,
  allPages: BuiltMemoPage[],
  targetIndex: Map<string, Set<string>>,
  orderedTargets: RawTarget[],
): {
  outLinkSlugs: string[];
  backLinkSlugs: string[];
  twoHop: MemoTwoHopGroup[];
} {
  const ctx = buildMemoParseContext(allPages);
  const pageBySlug = new Map(allPages.map((p) => [p.slug, p]));
  const selfKey = normalizeScrapboxKey(page.title);

  const outLinkSlugs: string[] = [];
  const seenOut = new Set<string>();
  for (const target of orderedTargets) {
    const resolved = ctx.resolveTarget(target.display);
    if (resolved.kind === 'page' && resolved.page) {
      if (!seenOut.has(resolved.page.slug)) {
        seenOut.add(resolved.page.slug);
        outLinkSlugs.push(resolved.page.slug);
      }
    }
  }

  const backLinkSlugs = [...(targetIndex.get(selfKey) ?? new Set())]
    .filter((slug) => slug !== page.slug)
    .sort((a, b) => {
      const pa = pageBySlug.get(a);
      const pb = pageBySlug.get(b);
      return (pb?.created ?? 0) - (pa?.created ?? 0);
    });

  const twoHop: MemoTwoHopGroup[] = [];
  for (const target of orderedTargets) {
    const resolved = resolveTargetForSection(target, ctx);
    const linkerSlugs = [...(targetIndex.get(target.key) ?? new Set())].filter(
      (slug) => slug !== page.slug,
    );
    if (linkerSlugs.length === 0) continue;

    linkerSlugs.sort((a, b) => {
      const pa = pageBySlug.get(a);
      const pb = pageBySlug.get(b);
      return (pb?.created ?? 0) - (pa?.created ?? 0);
    });

    twoHop.push({
      target: resolved,
      pageSlugs: linkerSlugs,
    });
  }

  return { outLinkSlugs, backLinkSlugs, twoHop };
}

function resolveTargetForSection(
  target: RawTarget,
  ctx: ReturnType<typeof buildMemoParseContext>,
): ResolvedMemoTarget {
  const page = ctx.resolvePageTitle(target.display);
  if (page) {
    return {
      display: target.display,
      key: target.key,
      kind: 'page',
      href: memoPagePath(page.slug),
      page,
    };
  }
  if (target.source === 'hashtag') {
    return ctx.resolveTarget(target.display);
  }
  return {
    display: target.display,
    key: target.key,
    kind: 'missing',
  };
}

export type { RawTarget };
