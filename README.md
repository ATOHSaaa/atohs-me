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
draft: false
---

本文をここに書きます。
```

- 一覧: `/blog`
- 記事: `/blog/<ファイル名>`（例: `blog-open.md` → `/blog/blog-open`）
- OGP画像: 記事タイトルからビルド時に自動生成（`/blog/<slug>/og.png`）

## デプロイ（GitHub Pages）

1. GitHub リポジトリの **Settings → Pages** を開く
2. **Build and deployment → Source** を **GitHub Actions** に設定
3. `main` ブランチへ push すると `.github/workflows/deploy.yml` が自動でビルド・デプロイする

カスタムドメイン `atohs.me` は `public/CNAME` から引き続き設定されます。
