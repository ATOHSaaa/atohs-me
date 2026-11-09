/**
 * public/indexnow-key.txt の内容を公式形式 public/{key}.txt に同期する。
 * @see https://www.indexnow.org/documentation
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const KEY_SOURCE = join(ROOT, 'public', 'indexnow-key.txt');

/** @returns {string} */
export function readIndexNowKey() {
  const fromEnv = process.env.INDEXNOW_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (!existsSync(KEY_SOURCE)) {
    throw new Error(
      `IndexNow key が見つかりません（${KEY_SOURCE} または INDEXNOW_KEY）`,
    );
  }
  return readFileSync(KEY_SOURCE, 'utf8').trim();
}

export function ensureIndexNowKeyFile() {
  const key = readIndexNowKey();
  const dest = join(ROOT, 'public', `${key}.txt`);
  if (!existsSync(dest) || readFileSync(dest, 'utf8') !== key) {
    writeFileSync(dest, key, 'utf8');
    console.log(`ensure-indexnow-key-file: public/${key}.txt`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureIndexNowKeyFile();
}
