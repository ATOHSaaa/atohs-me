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

## デプロイ（GitHub Pages）

1. GitHub リポジトリの **Settings → Pages** を開く
2. **Build and deployment → Source** を **GitHub Actions** に設定
3. `main` ブランチへ push すると `.github/workflows/deploy.yml` が自動でビルド・デプロイする

カスタムドメイン `atohs.me` は `public/CNAME` から引き続き設定されます。
