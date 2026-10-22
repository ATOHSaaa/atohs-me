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
- OGP画像: 記事タイトルからビルド時に自動生成（`/blog/<slug>/og.png`）
- 本文用画像: `src/content/blog/img/` に置き、Markdown で `![](./img/ファイル名.png)` と書く

## デプロイ（GitHub Pages）

1. GitHub リポジトリの **Settings → Pages** を開く
2. **Build and deployment → Source** を **GitHub Actions** に設定
3. `main` ブランチへ push すると `.github/workflows/deploy.yml` が自動でビルド・デプロイする

カスタムドメイン `atohs.me` は `public/CNAME` から引き続き設定されます。

### 静的アセットのキャッシュ（PageSpeed Insights）

GitHub Pages は `Cache-Control: max-age=600`（10 分）固定です。本番は **Cloudflare プロキシ + レスポンスヘッダー** で `/_astro/*` と `/fonts/*` を長期キャッシュします。

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

- **ルール名**: 例 `Long cache for static assets`
- **条件（式エディタ）**:

```
(http.host eq "atohs.me") and (starts_with(http.request.uri.path, "/_astro/") or starts_with(http.request.uri.path, "/fonts/"))
```

- **操作**: ヘッダー `Cache-Control` を **設定** → `public, max-age=31536000, immutable`

#### 5. 確認

```bash
curl -sI https://atohs.me/fonts/roboto-latin-700-normal.woff2 | grep -ei 'cache-control|server|cf-ray'
```

`cache-control: public, max-age=31536000, immutable` と `server: cloudflare`（または `cf-ray`）が出れば OK。数分後に PSI を再計測。
