/**
 * IndexNow URL 送信（https://www.indexnow.org/documentation）
 *
 * 環境変数:
 *   INDEXNOW_KEY — 省略時は public/indexnow-key.txt の内容
 *   INDEXNOW_HOST — 既定 atohs.me
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ensureIndexNowKeyFile,
  readIndexNowKey,
} from './ensure-indexnow-key-file.mjs';

const HOST = (process.env.INDEXNOW_HOST || 'atohs.me').replace(/^https?:\/\//, '');

/** Bing / IndexNow ハブ。ここが通らないと通知は無効扱い */
const REQUIRED_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

const OPTIONAL_ENDPOINTS = [
  'https://yandex.com/indexnow',
  'https://search.seznam.cz/indexnow',
];

function parseArgs(argv) {
  const urls = [];
  let memoOnly = false;
  for (const arg of argv) {
    if (arg === '--memo') {
      memoOnly = true;
      continue;
    }
    if (arg.startsWith('http://') || arg.startsWith('https://')) {
      urls.push(arg);
    }
  }
  return { urls, memoOnly };
}

function urlsFromSitemap(memoOnly) {
  const sitemapPath = join(process.cwd(), 'dist', 'sitemap-0.xml');
  if (!existsSync(sitemapPath)) {
    throw new Error('dist/sitemap-0.xml がありません。先に npm run build してください。');
  }
  const xml = readFileSync(sitemapPath, 'utf8');
  const found = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return memoOnly
    ? found.filter((u) => {
        const path = new URL(u).pathname;
        return path === '/memo/' || path.startsWith('/memo/');
      })
    : found;
}

/** 本番の {key}.txt がキーと一致するか（ship は deploy 後に実行すること） */
async function verifyKeyOnLive(key) {
  const url = `https://${HOST}/${key}.txt`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(
      `IndexNow キーファイルが本番で取得できません: ${url} (HTTP ${res.status})。deploy 後に再実行してください。`,
    );
  }
  const body = (await res.text()).trim();
  if (body !== key) {
    throw new Error(`IndexNow キーファイルの内容が一致しません: ${url}`);
  }
  console.log(`key file OK: ${url}`);
}

async function postEndpoint(endpoint, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`${endpoint}: HTTP ${res.status}`);
  if (text) console.log(text.slice(0, 500));
  return res.ok;
}

async function postRequiredEndpoints(body) {
  let requiredFailed = false;
  for (const endpoint of REQUIRED_ENDPOINTS) {
    const ok = await postEndpoint(endpoint, body);
    if (!ok) requiredFailed = true;
  }
  return requiredFailed;
}

async function submit(urlList) {
  if (urlList.length === 0) {
    console.log('送信する URL がありません。');
    return;
  }

  ensureIndexNowKeyFile();
  const key = readIndexNowKey();
  await verifyKeyOnLive(key);

  const body = {
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList,
  };

  let requiredFailed = await postRequiredEndpoints(body);
  if (requiredFailed) {
    const waitMs = 45_000;
    console.log(
      `IndexNow: 必須エンドポイントが失敗。キー検証クロール待ち ${waitMs / 1000} 秒後に再試行…`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    requiredFailed = await postRequiredEndpoints(body);
  }

  for (const endpoint of OPTIONAL_ENDPOINTS) {
    await postEndpoint(endpoint, body);
  }

  console.log(`Submitted ${urlList.length} URL(s).`);

  if (requiredFailed) {
    console.error(
      'IndexNow: api.indexnow.org または Bing が受理しませんでした。Bing Webmaster Tools に atohs.me を登録するか、しばらくして再 ship してください。',
    );
    process.exit(1);
  }
}

const { urls, memoOnly } = parseArgs(process.argv.slice(2));
const list = urls.length > 0 ? urls : urlsFromSitemap(memoOnly);

submit(list).catch((err) => {
  console.error(err);
  process.exit(1);
});
