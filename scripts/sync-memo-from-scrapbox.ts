/**
 * Scrapbox → src/content/memo/*.md
 * 既存ファイルは上書き。ビルドは Markdown を正とする。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cacheDetails, syncScrapboxCache } from '../src/lib/scrapbox/cache';
import { getScrapboxPublishTag } from '../src/lib/scrapbox/config';
import { pageHasHashtag } from '../src/lib/scrapbox/tags';
import { getIdobataAuthorIcon } from '../src/lib/idobata/config';
import { maybeStripIdobataFromMemoLines } from '../src/lib/idobata/diary-extract';
import { memoContentFileBaseName } from '../src/lib/scrapbox/slug';
import type { ScrapboxPageDetail } from '../src/lib/scrapbox/types';

const OUT_DIR = path.join(process.cwd(), 'src/content/memo');
const PRIVATE_TAG = 'private';

function shouldIncludePage(lineTexts: string[]): boolean {
  if (pageHasHashtag(lineTexts, PRIVATE_TAG)) return false;
  const publishTag = getScrapboxPublishTag();
  if (publishTag) return pageHasHashtag(lineTexts, publishTag);
  return true;
}

function unixToJstYaml(sec: number): string {
  const d = new Date(sec * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+09:00`;
}

function memoFileName(title: string): string {
  return `${memoContentFileBaseName(title)}.md`;
}

function detailToMarkdown(detail: ScrapboxPageDetail): string {
  const rawLines = detail.lines?.map((l) => l.text) ?? [];
  const lines = maybeStripIdobataFromMemoLines(
    rawLines,
    getIdobataAuthorIcon(),
  );
  const body = lines.join('\n').replace(/\n+$/, '');
  const created = unixToJstYaml(detail.created);
  const updated =
    detail.updated !== detail.created
      ? `\nupdated: ${unixToJstYaml(detail.updated)}`
      : '';
  const titleYaml =
    detail.title !== memoFileName(detail.title).replace(/\.md$/, '')
      ? `title: ${JSON.stringify(detail.title)}\n`
      : '';

  return `---\n${titleYaml}created: ${created}${updated}\n---\n\n${body}\n`;
}

async function main(): Promise<void> {
  const cache = await syncScrapboxCache();
  const details = cacheDetails(cache);
  const published = details.filter((detail) => {
    const lineTexts = detail.lines?.map((l) => l.text) ?? [];
    return shouldIncludePage(lineTexts);
  });

  await mkdir(OUT_DIR, { recursive: true });

  let wrote = 0;
  for (const detail of published) {
    const filePath = path.join(OUT_DIR, memoFileName(detail.title));
    await writeFile(filePath, detailToMarkdown(detail), 'utf8');
    wrote += 1;
  }

  console.log(`Wrote ${wrote} memo file(s) to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
