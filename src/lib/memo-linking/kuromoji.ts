import kuromoji from 'kuromoji';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEMO_LINK_STOPWORDS, memoLinkPhase3Kuromoji } from './config';
import { normalizeScrapboxKey } from '../scrapbox/title-match';
import type { MemoLinkDictionary } from './dictionary';

type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

let tokenizerPromise: Promise<Tokenizer> | undefined;

function dictPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '../../../node_modules/kuromoji/dict');
}

export function initMemoKuromoji(): Promise<Tokenizer | undefined> {
  if (!memoLinkPhase3Kuromoji()) {
    return Promise.resolve(undefined);
  }
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: dictPath() }).build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

export interface NounSpan {
  start: number;
  end: number;
  surface: string;
  key: string;
}

/** 名詞トークンで辞書に載る語の位置（プレーン部分・行内オフセット） */
export function nounDictionarySpansInPlain(
  plain: string,
  offset: number,
  dictionary: MemoLinkDictionary,
  tokenizer: Tokenizer | undefined,
): NounSpan[] {
  if (!plain || !tokenizer || !memoLinkPhase3Kuromoji()) return [];
  let tokens: kuromoji.IpadicFeatures[];
  try {
    tokens = tokenizer.tokenize(plain);
  } catch {
    return [];
  }
  if (!Array.isArray(tokens)) return [];
  const spans: NounSpan[] = [];
  let charOffset = 0;
  for (const token of tokens) {
    const surface = token.surface ?? '';
    if (!surface) continue;
    const start = charOffset;
    charOffset += surface.length;
    const pos = token.pos ?? '';
    const posDetail = token.pos_detail_1 ?? '';
    if (!pos.startsWith('名詞')) continue;
    if (posDetail === '代名詞' || posDetail === '数') continue;
    if (surface.length < 2) continue;
    const key = normalizeScrapboxKey(surface);
    if (MEMO_LINK_STOPWORDS.has(key)) continue;
    if (!dictionary.keyToDisplay.has(key)) continue;
    spans.push({
      start: offset + start,
      end: offset + start + surface.length,
      surface,
      key,
    });
  }
  return spans;
}
