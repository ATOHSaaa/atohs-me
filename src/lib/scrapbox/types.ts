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
}

export interface ScrapboxPageDetail extends ScrapboxPageSummary {
  lines: ScrapboxLine[];
}

export interface BuiltMemoPage {
  title: string;
  slug: string;
  created: number;
  updated: number;
  bodyHtml: string;
  description: string;
  cacheKey: string;
  noindex: true;
}

export interface MemoBuildResult {
  pages: BuiltMemoPage[];
  titles: Set<string>;
}
