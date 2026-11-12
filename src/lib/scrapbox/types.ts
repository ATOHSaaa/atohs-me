import type { MemoIdobataVia } from '../idobata/via';
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
  cacheKey: string;
  /** `[キーワード]` 用の本文なしページ（関連メモのみ） */
  keywordStub?: boolean;
  outLinkSlugs: string[];
  backLinkSlugs: string[];
  twoHop: MemoTwoHopGroup[];
  /** 本文からリンクになるキーワード（出現順・重複なし） */
  linkedTargets: ResolvedMemoTarget[];
  /** 井戸端日記への出典（記事末尾表示） */
  idobataVia?: MemoIdobataVia;
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
