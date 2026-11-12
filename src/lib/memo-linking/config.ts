/** 単語リンク拡張の ON/OFF（すべて false または環境変数でリバート可能） */

function envFlag(name: string, defaultOn: boolean): boolean {
  const raw =
    typeof process !== 'undefined' ? process.env[name] : undefined;
  if (raw === undefined) return defaultOn;
  const v = raw.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  return defaultOn;
}

/** `MEMO_LINK_ALL=0` で Phase 1〜3 を一括オフ */
function masterEnabled(): boolean {
  return envFlag('MEMO_LINK_ALL', true);
}

/** Phase 1: 辞書マッチでサイドバー「単語リンク」を拡張 */
export function memoLinkPhase1Sidebar(): boolean {
  return masterEnabled() && envFlag('MEMO_LINK_PHASE1', true);
}

/** Phase 2: 辞書ヒットを `[...]` で補完（ビルド時メモリ / 同期書き込み） */
export function memoLinkPhase2Bracketify(): boolean {
  return masterEnabled() && envFlag('MEMO_LINK_PHASE2', true);
}

/** Phase 3: 本文のプレーンテキストを kuromoji＋辞書で自動リンク */
export function memoLinkPhase3Kuromoji(): boolean {
  return masterEnabled() && envFlag('MEMO_LINK_PHASE3', true);
}

/** kuromoji 名詞リンクのストップリスト（正規化キー） */
export const MEMO_LINK_STOPWORDS = new Set(
  [
    '今日',
    '昨日',
    '明日',
    'もの',
    'こと',
    'ため',
    'よう',
    'ところ',
    'はず',
    'わけ',
    'これ',
    'それ',
    'あれ',
    'ここ',
    'そこ',
    'どこ',
    '誰',
    '何',
    '自分',
    '人',
    '方',
    '時',
    '年',
    '月',
    '日',
    '分',
    '秒',
  ].map((w) => w.toLowerCase()),
);
