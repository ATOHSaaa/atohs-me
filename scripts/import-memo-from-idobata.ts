/**
 * 井戸端（villagepump）の日記ページ → src/content/memo/YYYY-MM-DD.md
 * 共同日記から自分（既定 atohs）の行だけ抜き、会話行を除去する。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getIdobataAuthorIcon, memoLineIsIdobataVia } from '../src/lib/idobata/config';
import {
  idobataDiaryPageToMemoLines,
  extractIdobataAuthorDiary,
} from '../src/lib/idobata/diary-extract';
import {
  buildMemoIdobataVia,
  type MemoIdobataVia,
} from '../src/lib/idobata/via';
import { SCRAPBOX_API_BASE, getScrapboxProject } from '../src/lib/scrapbox/config';
import { fetchScrapboxPageDetail } from '../src/lib/scrapbox/fetch';
import {
  memoContentFileBaseName,
  normalizeMemoDailySlashTitle,
} from '../src/lib/scrapbox/slug';

const IDOBATA_DIARY_TITLE_RE = /^\d{4}\/\d{2}\/\d{2}$/;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const OUT_DIR = path.join(process.cwd(), 'src/content/memo');

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

function scrapboxTitleForDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
}

function parseArgs(argv: string[]): {
  dates: string[];
  merge: boolean;
  dryRun: boolean;
  search: boolean;
} {
  const dates: string[] = [];
  let merge = false;
  let dryRun = false;
  let search = false;
  for (const arg of argv) {
    if (arg === '--merge') merge = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--search') search = true;
    else if (arg.startsWith('--date=')) {
      dates.push(arg.slice('--date='.length));
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      dates.push(arg);
    }
  }
  return { dates, merge, dryRun, search };
}

/** Scrapbox 検索で `atohs.icon` を含む日記ページ（YYYY/MM/DD）タイトルを列挙 */
async function listIdobataDiaryDatesFromSearch(
  authorIcon: string,
): Promise<string[]> {
  const prev = process.env.SCRAPBOX_PROJECT;
  process.env.SCRAPBOX_PROJECT =
    process.env.IDOBATA_SCRAPBOX_PROJECT ?? 'villagepump';
  const project = getScrapboxProject();
  const dates = new Set<string>();
  const q = `${authorIcon}.icon`;
  try {
    for (let skip = 0; skip < 5000; skip += 100) {
      const params = new URLSearchParams({
        q,
        skip: String(skip),
      });
      const url = `${SCRAPBOX_API_BASE}/pages/${encodeURIComponent(project)}/search/query?${params}`;
      const res = await fetch(url);
      if (!res.ok) break;
      const data = (await res.json()) as { pages?: { title: string }[] };
      const pages = data.pages ?? [];
      if (pages.length === 0) break;
      for (const page of pages) {
        if (IDOBATA_DIARY_TITLE_RE.test(page.title)) dates.add(page.title);
      }
      if (pages.length < 100) break;
    }
  } finally {
    if (prev === undefined) delete process.env.SCRAPBOX_PROJECT;
    else process.env.SCRAPBOX_PROJECT = prev;
  }
  return [...dates].sort();
}

async function fetchIdobataPage(title: string) {
  const prev = process.env.SCRAPBOX_PROJECT;
  process.env.SCRAPBOX_PROJECT =
    process.env.IDOBATA_SCRAPBOX_PROJECT ?? 'villagepump';
  try {
    return await fetchScrapboxPageDetail(title);
  } finally {
    if (prev === undefined) delete process.env.SCRAPBOX_PROJECT;
    else process.env.SCRAPBOX_PROJECT = prev;
  }
}

function stripViaFromBodyLines(lines: string[]): string[] {
  return lines.filter((l) => !memoLineIsIdobataVia(l));
}

function upsertIdobataViaInFrontmatter(
  frontmatter: string,
  via: MemoIdobataVia,
): string {
  const lines = frontmatter
    .split('\n')
    .filter((l) => !/^idobataVia(Date|Url):/.test(l));
  lines.push(`idobataViaDate: ${JSON.stringify(via.dateLabel)}`);
  lines.push(`idobataViaUrl: ${JSON.stringify(via.url)}`);
  return lines.join('\n');
}

function buildMemoFile(frontmatter: string, bodyLines: string[]): string {
  const body = stripViaFromBodyLines(bodyLines).join('\n').replace(/\n+$/, '');
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

function newMemoFrontmatter(
  createdSec: number,
  updatedSec: number,
  via: MemoIdobataVia,
): string {
  const created = unixToJstYaml(createdSec);
  const updated =
    updatedSec !== createdSec
      ? `\nupdated: ${unixToJstYaml(updatedSec)}`
      : '';
  return upsertIdobataViaInFrontmatter(`created: ${created}${updated}`, via);
}

type ExistingMemo = { frontmatter: string; bodyLines: string[] };

async function readExistingMemo(filePath: string): Promise<ExistingMemo | null> {
  try {
    const existing = await readFile(filePath, 'utf8');
    const match = existing.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (!match) return null;
    const bodyLines = match[2].replace(/\n+$/, '').split('\n');
    return { frontmatter: match[1], bodyLines };
  } catch {
    return null;
  }
}

async function mergeMemoBody(
  filePath: string,
  newLines: string[],
  dailyTitle: string,
): Promise<{ lines: string[]; changed: boolean }> {
  const parsed = await readExistingMemo(filePath);
  if (!parsed) return { lines: newLines, changed: true };
  const existingBody = stripViaFromBodyLines(parsed.bodyLines);
  const oldSet = new Set(existingBody.map((l) => l.trim()).filter(Boolean));
  const additions = newLines.filter((l, i) => {
    if (i === 0 && l === dailyTitle) return false;
    if (memoLineIsIdobataVia(l)) return false;
    const t = l.trim();
    if (!t) return false;
    return !oldSet.has(t);
  });

  if (additions.length === 0) {
    return { lines: existingBody, changed: false };
  }
  return { lines: [...existingBody, ...additions], changed: true };
}

async function importOneDate(
  isoDate: string,
  authorIcon: string,
  merge: boolean,
  dryRun: boolean,
): Promise<'ok' | 'skip' | 'empty'> {
  const scrapboxTitle = scrapboxTitleForDate(isoDate);
  const detail = await fetchIdobataPage(scrapboxTitle);
  const via = buildMemoIdobataVia(isoDate, detail.lines ?? [], authorIcon);
  const lineTexts = detail.lines?.map((l) => l.text) ?? [];
  let memoLines = idobataDiaryPageToMemoLines(
    lineTexts,
    authorIcon,
    isoDate,
  );
  if (memoLines.length === 0) {
    const stripped = extractIdobataAuthorDiary(lineTexts, authorIcon);
    if (stripped.length === 0) return 'empty';
    console.warn(
      `${scrapboxTitle}: 作者 ${authorIcon} の行がありませんでした`,
    );
    return 'empty';
  }

  const base = memoContentFileBaseName(isoDate);
  const filePath = path.join(OUT_DIR, `${base}.md`);

  const existing = await readExistingMemo(filePath);
  if (merge && existing) {
    const merged = await mergeMemoBody(filePath, memoLines, isoDate);
    memoLines = merged.lines;
    const frontmatter = upsertIdobataViaInFrontmatter(
      existing.frontmatter,
      via,
    );
    const md = buildMemoFile(frontmatter, memoLines);
    const oldMd = buildMemoFile(existing.frontmatter, existing.bodyLines);
    if (md === oldMd) return 'skip';
    if (dryRun) {
      console.log(`--- ${filePath} (dry-run) ---\n${md}`);
      return 'ok';
    }
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(filePath, md, 'utf8');
    console.log(`Wrote ${filePath}`);
    return 'ok';
  }

  const frontmatter = existing
    ? upsertIdobataViaInFrontmatter(
        existing.frontmatter,
        via,
      )
    : newMemoFrontmatter(detail.created, detail.updated, via);
  const md = buildMemoFile(frontmatter, memoLines);

  if (dryRun) {
    console.log(`--- ${filePath} (dry-run) ---\n${md}`);
    return 'ok';
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(filePath, md, 'utf8');
  console.log(`Wrote ${filePath}`);
  return 'ok';
}

async function main(): Promise<void> {
  const { dates: argDates, merge, dryRun, search } = parseArgs(
    process.argv.slice(2),
  );
  const author = getIdobataAuthorIcon();
  let dates = [...argDates];
  if (search) {
    const found = await listIdobataDiaryDatesFromSearch(author);
    console.log(`Search: ${found.length} diary page(s) with ${author}.icon`);
    for (const t of found) {
      if (!dates.includes(t)) dates.push(t);
    }
  }
  if (dates.length === 0) {
    console.error(
      'Usage: npm run memo:import-idobata -- 2026-11-12 [--merge] [--dry-run]\n' +
        '       npm run memo:import-idobata -- --search [--merge]',
    );
    process.exit(1);
  }

  let ok = 0;
  let empty = 0;
  let skip = 0;
  for (const raw of dates) {
    const iso =
      normalizeMemoDailySlashTitle(raw) ??
      (raw.match(/^\d{4}-\d{2}-\d{2}$/) ? raw : null);
    if (!iso) {
      console.warn(`Skip invalid date: ${raw}`);
      continue;
    }
    const result = await importOneDate(iso, author, merge, dryRun);
    if (result === 'ok') ok += 1;
    if (result === 'empty') empty += 1;
    if (result === 'skip') skip += 1;
    await sleep(120);
  }
  console.log(
    `Done: ${ok} written, ${skip} unchanged, ${empty} empty (author=${author})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
