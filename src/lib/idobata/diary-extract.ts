const SECTION_ICON_LINE_RE = /^(.+)\.icon\s*$/u;
const SECTION_BRACKET_ICON_RE = /^\[([^\]]+)\.icon\]$/u;
const TRAILING_REPLY_ICON_RE = /(\s|^)([^\s\[\]]+)\.icon\s*$/u;
const PIN_DIARY_WEEK_RE = /^第\d+週:/u;
const PIN_DIARY_PROGRESS_RE = /^\d{4}年\s+[\d.]+\s*％経過/u;
const PIN_DIARY_DATE_ONLY_RE = /^\d{4}\/\d{1,2}\/\d{1,2}$/u;
const PIN_DIARY_NAV_RE = /(?:\.icon\s*)?[←→]/u;
const MEMO_TOP_INDENT = '\u3000';

function normalizeIconName(name: string): string {
  return name.trim().toLowerCase();
}

export function iconNamesMatch(a: string, b: string): boolean {
  return normalizeIconName(a) === normalizeIconName(b);
}

/** pin-diary のテンプレ行・フッタなど */
export function isIdobataDiaryBoilerplateLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  if (PIN_DIARY_WEEK_RE.test(trimmed)) return true;
  if (PIN_DIARY_PROGRESS_RE.test(trimmed)) return true;
  if (PIN_DIARY_DATE_ONLY_RE.test(trimmed)) return true;
  if (PIN_DIARY_NAV_RE.test(trimmed)) return true;
  if (/^\[\/\s*\[/u.test(trimmed)) return true;
  if (/^#\d{4}-\d{2}-\d{2}\s*$/u.test(trimmed)) return true;
  return false;
}

/** 行全体が「誰か.icon」または `[誰か.icon]` のみのセクション見出し */
export function parseIdobataSectionIcon(line: string): string | null {
  if (/^\t/.test(line)) return null;
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  if (isIdobataDiaryBoilerplateLine(trimmed)) return null;
  if (PIN_DIARY_NAV_RE.test(trimmed)) return null;

  const bracket = trimmed.match(SECTION_BRACKET_ICON_RE);
  if (bracket) return bracket[1].trim();

  if (/^[\u3000]/.test(line)) return null;
  const match = trimmed.match(SECTION_ICON_LINE_RE);
  if (!match) return null;
  const name = match[1].trim();
  if (name.length === 0) return null;
  return name;
}

function iconNamesOnLine(text: string): string[] {
  const names: string[] = [];
  for (const m of text.matchAll(/\[([^\]]+)\.icon\]/gu)) {
    names.push(m[1]);
  }
  for (const m of text.matchAll(/(?:^|\s)([^\s\[\]/]+)\.icon/gu)) {
    if (!names.some((n) => iconNamesMatch(n, m[1]))) names.push(m[1]);
  }
  return names;
}

/** 井戸端の共同日記1ページ分か（他者セクションや pin-diary テンプレが混ざる） */
export function looksLikeIdobataDiaryPage(lines: readonly string[]): boolean {
  let sectionHeaders = 0;
  let boilerplate = 0;
  for (const line of lines) {
    if (isIdobataDiaryBoilerplateLine(line)) boilerplate += 1;
    if (parseIdobataSectionIcon(line)) sectionHeaders += 1;
  }
  if (boilerplate > 0 && sectionHeaders >= 1) return true;
  return sectionHeaders >= 2;
}

/** 返信・リアクション行（行末や文中の他者 `.icon`） */
export function isIdobataConversationLine(
  line: string,
  authorIcon: string,
): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;

  const iconNames = iconNamesOnLine(trimmed);
  if (iconNames.length === 0) return false;

  const others = iconNames.filter((n) => !iconNamesMatch(n, authorIcon));
  if (others.length === 0) return false;

  if (parseIdobataSectionIcon(line)) return false;

  // 先頭がインデントされている、または行末に他者 icon がある
  if (/^[\t\u3000\s]/.test(line)) return true;
  if (TRAILING_REPLY_ICON_RE.test(line) && others.length > 0) return true;

  // 「+1 sta.icon」など同一行の返信
  if (others.length > 0 && !parseIdobataSectionIcon(line)) return true;

  return false;
}

function normalizeIdobataContentLine(line: string): string {
  if (/^\u3000/.test(line)) return line;
  if (/^ +\t+/.test(line)) {
    return `${MEMO_TOP_INDENT}\t${line.replace(/^ +\t+/, '')}`;
  }
  if (/^\t+/.test(line)) {
    return `${MEMO_TOP_INDENT}\t${line.replace(/^\t+/, '')}`;
  }
  if (/^ +/.test(line)) {
    return `${MEMO_TOP_INDENT}${line.trimStart()}`;
  }
  return `${MEMO_TOP_INDENT}${line}`;
}

/** 抽出後の行を atohs-me メモ慣習（先頭 `　` + タブ下段）に寄せる */
export function formatIdobataLinesAsMemoBody(
  lines: readonly string[],
  dailyTitle: string,
): string[] {
  const out: string[] = [dailyTitle];
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    out.push(normalizeIdobataContentLine(line));
  }
  return out;
}

/**
 * 井戸端の日付ページ本文から、指定ユーザーの記述だけを残す（他者セクション・会話行を除去）。
 */
export function extractIdobataAuthorDiary(
  lines: readonly string[],
  authorIcon: string,
): string[] {
  const kept: string[] = [];
  let inAuthorSection = false;

  for (const raw of lines) {
    const sectionIcon = parseIdobataSectionIcon(raw);
    if (sectionIcon !== null) {
      inAuthorSection = iconNamesMatch(sectionIcon, authorIcon);
      continue;
    }

    if (!inAuthorSection) continue;
    if (isIdobataDiaryBoilerplateLine(raw)) continue;
    if (isIdobataConversationLine(raw, authorIcon)) continue;

    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      if (kept.length > 0 && kept[kept.length - 1] !== '') kept.push('');
      continue;
    }

    kept.push(raw);
  }

  while (kept.length > 0 && kept[kept.length - 1] === '') {
    kept.pop();
  }
  return kept;
}

/** 日付ページ用: 作者分だけ抜き出し、メモ用の行配列（先頭に YYYY-MM-DD）まで行う */
export function idobataDiaryPageToMemoLines(
  lines: readonly string[],
  authorIcon: string,
  dailyTitle: string,
): string[] {
  const body = extractIdobataAuthorDiary(lines, authorIcon);
  if (body.length === 0) return [];
  return formatIdobataLinesAsMemoBody(body, dailyTitle);
}

/** Cosense 同期など: 共同日記っぽい本文なら作者分だけにする */
export function maybeStripIdobataFromMemoLines(
  lines: readonly string[],
  authorIcon: string,
): readonly string[] {
  if (!looksLikeIdobataDiaryPage(lines)) return lines;
  const stripped = extractIdobataAuthorDiary(lines, authorIcon);
  if (stripped.length === 0) return lines;
  return stripped;
}
