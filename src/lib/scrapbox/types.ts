import type { ResolvedMemoTarget } from './link-context';

export interface ScrapboxLine {
  id?: string;
  text: string;
  created?: number;
  updated?: number;
}

export interface ScrapboxPageSummary {
  id: string;
  title: string;
  created: number;
  updated: number;
  linesCount?: number;
  image?: string | null;
}

export interface ScrapboxPageDetail extends ScrapboxPageSummary {
  lines: ScrapboxLine[];
  links?: string[];
}

export interface MemoTwoHopGroup {
  target: ResolvedMemoTarget;
  pageSlugs: string[];
}

export interface BuiltMemoPage {
  title: string;
  slug: string;
  created: number;
  updated: number;
  bodyHtml: string;
  description: string;
  excerpt: string;
  thumbnailUrl?: string;
  cacheKey: string;
  outLinkSlugs: string[];
  backLinkSlugs: string[];
  twoHop: MemoTwoHopGroup[];
}

export interface BuiltMemoTagIndex {
  tag: string;
  slug: string;
  key: string;
  pageSlugs: string[];
  cacheKey: string;
}

export interface MemoBuildResult {
  pages: BuiltMemoPage[];
  titles: Set<string>;
  tags: BuiltMemoTagIndex[];
}
