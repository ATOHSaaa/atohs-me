/**
 * IndexNow URL 送信（https://www.indexnow.org/documentation）
 *
 * 環境変数:
 *   INDEXNOW_KEY — 省略時は public/indexnow-key.txt の内容
 *   INDEXNOW_HOST — 既定 atohs.me
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const HOST = (process.env.INDEXNOW_HOST || 'atohs.me').replace(/^https?:\/\//, '');
const KEY_PATH = join(process.cwd(), 'public', 'indexnow-key.txt');

function readKey() {
  const fromEnv = process.env.INDEXNOW_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (!existsSync(KEY_PATH)) {
    throw new Error(
      `IndexNow key が見つかりません（${KEY_PATH} または INDEXNOW_KEY）`,
    );
  }
  return readFileSync(KEY_PATH, 'utf8').trim();
}

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

async function submit(urlList) {
  if (urlList.length === 0) {
    console.log('送信する URL がありません。');
    return;
  }

  const key = readKey();
  const keyLocation = `https://${HOST}/indexnow-key.txt`;
  const body = {
    host: HOST,
    key,
    keyLocation,
    urlList,
  };

  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
  ];

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    console.log(`${endpoint}: HTTP ${res.status}`);
    if (!res.ok) {
      const text = await res.text();
      if (text) console.log(text.slice(0, 500));
    }
  }

  console.log(`Submitted ${urlList.length} URL(s).`);
}

const { urls, memoOnly } = parseArgs(process.argv.slice(2));
const list = urls.length > 0 ? urls : urlsFromSitemap(memoOnly);

submit(list).catch((err) => {
  console.error(err);
  process.exit(1);
});
