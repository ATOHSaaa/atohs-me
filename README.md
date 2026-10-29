# atohs.me

Astro で構築したポートフォリオサイトです。

## 開発

```bash
npm install
npm run dev
```

http://localhost:4321 でプレビューできます。

## ビルド

```bash
npm run build
npm run preview
```

`dist/` に静的ファイルが出力されます。

## ブログ

記事は `src/content/blog/` に Markdown で追加します。

```md
---
title: 記事タイトル
description: 概要
pubDate: 2026-07-17
# 同日に複数公開する場合は時刻も指定できる（並び順の制御用。表示は日付のみ）
# pubDate: 2026-08-31T23:00:00+09:00
draft: false
---

本文をここに書きます。
```

- 一覧: `/blog`
- 記事: `/blog/<ファイル名>`（例: `blog-open.md` → `/blog/blog-open`）
- OGP画像: `public/blog/<slug>/og-v9.png` に配置（ビルドでは再生成しない）。新規記事やレイアウト変更時は `npm run og:generate`（不足分のみ）または `npm run og:generate:force`（全記事）
- 本文用画像: `src/content/blog/img/` に置き、Markdown で `![](./img/ファイル名.png)` と書く

## デプロイ（GitHub Pages）

1. GitHub リポジトリの **Settings → Pages** を開く
2. **Build and deployment → Source** を **GitHub Actions** に設定
3. `main` ブランチへ push すると `.github/workflows/deploy.yml` が自動でビルド・デプロイする

カスタムドメイン `atohs.me` は `public/CNAME` から引き続き設定されます。

### 静的アセットのキャッシュ（PageSpeed Insights）

GitHub Pages は `Cache-Control: max-age=600`（10 分）固定です。本番は **Cloudflare プロキシ + レスポンスヘッダー** で静的アセットを長期キャッシュします。

#### 1. Cloudflare にサイトを追加

1. [Cloudflare](https://dash.cloudflare.com/) → **ウェブサイトを追加** → `atohs.me`
2. 表示されたネームサーバー（例: `xxx.ns.cloudflare.com`）を、ムームードメイン等の管理画面で設定（反映まで最大 24 時間、多くは数十分）

#### 2. DNS（プロキシ ON）

| タイプ | 名前 | コンテンツ | プロキシ |
|--------|------|------------|----------|
| A | `@` | `185.199.108.153` | プロキシ済み |
| A | `@` | `185.199.109.153` | プロキシ済み |
| A | `@` | `185.199.110.153` | プロキシ済み |
| A | `@` | `185.199.111.153` | プロキシ済み |
| AAAA | `@` | `2606:50c0:8000::153` | プロキシ済み |
| AAAA | `@` | `2606:50c0:8001::153` | プロキシ済み |
| AAAA | `@` | `2606:50c0:8002::153` | プロキシ済み |
| AAAA | `@` | `2606:50c0:8003::153` | プロキシ済み |

GitHub リポジトリ **Settings → Pages → Custom domain** に `atohs.me` が入っていることを確認（`public/CNAME` と一致）。

#### 3. SSL/TLS

**SSL/TLS** → 概要 → **Full (strict)**。**常に HTTPS を使用** をオン。

#### 4. レスポンスヘッダー（PSI 対応）

**ルール** → **レスポンス ヘッダーを変更** → **ルールを作成**

**ルール A — ハッシュ付き静的アセット（immutable）**

- **ルール名**: 例 `Long cache for hashed assets`
- **条件（式エディタ）**:

```
(http.host eq "atohs.me") and (starts_with(http.request.uri.path, "/_astro/") or starts_with(http.request.uri.path, "/fonts/"))
```

- **操作**: ヘッダー `Cache-Control` を **設定** → `public, max-age=31536000, immutable`

**ルール B — 記事 OGP 画像（同一 URL で差し替えあり）**

`public/blog/<slug>/og-v9.png` は `npm run og:generate` で更新するため、`immutable` は付けない。

- **ルール名**: 例 `Long cache for blog OGP PNG`
- **条件**:

```
(http.host eq "atohs.me") and (http.request.uri.path matches "^/blog/[^/]+/og-v[0-9]+\\.png$")
```

- **操作**: `Cache-Control` → `public, max-age=604800, stale-while-revalidate=86400`

#### 5. 確認

```bash
curl -sI https://atohs.me/fonts/roboto-latin-700-normal.woff2 | grep -ei 'cache-control|server|cf-ray'
curl -sI https://atohs.me/blog/blog-open/og-v9.png | grep -ei 'cache-control|server|cf-ray'
```

`/_astro/` や `/fonts/` は `immutable`、`/blog/*/og-v9.png` は 7 日キャッシュ + SWR が付いていれば OK。数分後に PSI を再計測。

### CI ビルドキャッシュ

`.github/workflows/deploy.yml` で次を GitHub Actions キャッシュしている。

- `src/assets/fonts/` — OGP 用 Noto フォント（`.gitignore` のため CI 初回以外は再 DL しない）
- `.astro/` — 画像最適化など Astro のビルドキャッシュ（記事 Markdown だけの変更ではヒットしやすい）
- `npm` — `actions/setup-node` の `cache: npm`
