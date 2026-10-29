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

`dist/` に静的ファイルが出力されます。`dev` / `build` の前に自動スクリプトは走らない（下記「必要なときだけ」参照）。

### 必要なときだけ実行するスクリプト

| タイミング | コマンド |
|-----------|----------|
| 新規記事・タイトル/タグ/公開日変更 | `npm run og:generate -- --slug=<slug>` |
| OGP レイアウト変更 | `npm run og:generate:force` |
| `site-logo.png` 変更 | `npm run favicon:generate` |
| リンクカード定義変更 | `npm run link-card-ogp:refresh` |
| Hanoi Clicker を同期 | `npm run sync:hanoi-clicker` |

`og:generate` は内部で `ensure-og-font` 相当のフォント確認も行う。

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

- `node_modules/.astro/` — 増分静的ビルドのキャッシュ（`incremental-build.json` と再利用 HTML）。`package-lock.json`・`astro.config.mjs`・`src/content/**` をキーに含める
- `npm` — `actions/setup-node` の `cache: npm`

## 増分静的ビルド

`astro.config.mjs` で `experimental.incrementalBuild: true` を有効にしている（Astro 7.2+ の**実験機能**）。`getStaticPaths()` で返したページのうち `cacheKey` 付きのものは、前回ビルドとデータ・依存コードが同じなら再レンダリングをスキップする。キャッシュ本体は **`node_modules/.astro/`** に保存される。

### エージェント・CI 作業時の注意

1. **実験機能** — 将来の Astro でフラグ名や仕様が変わる可能性がある。
2. **`cacheKey` は動的ルートで必須** — 新しい `[param].astro` を足すときは `getStaticPaths()` の各エントリに、内容が変わったとき必ず変わる `cacheKey` を付ける（コンテンツコレクションなら `String(entry.digest)` など）。
3. **記事ページは当該記事の `digest` のみ** — 現状の `src/pages/blog/[slug].astro` は `cacheKey: String(post.digest)` のみ。記事下の「最近書いた記事」（`getOtherBlogPosts`）のように**他記事のタイトル・並びに依存する表示**を増やす場合は、依存する記事の digest なども `cacheKey` に含めないと、他記事だけ編集したときスキップされた HTML が古い関連リンクのまま残る。
4. **レイアウト・コンポーネント・CSS・ミドルウェア** — ページから import されるテンプレート・CSS の変更は、多くの場合モジュール依存ハッシュで該当ルートが再生成される（本リポジトリでは `BaseLayout` が `blog.css` を読み込むため、CSS 変更は広い範囲が再生成されうる）。**ミドルウェア**は公式ドキュメントどおり、変更がキャッシュ済み prerender ページに反映されないことがある。心配な変更後のデプロイでは `astro build --force` を使うか、Actions のキャッシュキーに `src/**` や該当パスを含めて古い `node_modules/.astro` を復元しないようにする。
5. **`build.concurrency` を 1 より大きくしない** — 設定すると増分キャッシュは無効になる。
6. **フル再生成** — ローカルまたは CI で `npm run build -- --force`（`astro build --force`）。

### ローカル確認の例

```bash
rm -rf dist node_modules/.astro
npm run build          # 1 回目: 全ページ生成
npm run build          # 2 回目: ログに (restored) が並ぶ
```

記事 Markdown を 1 件だけ変えたビルドでは、その記事と影響を受けるタグ一覧などだけが `(+Nms)` となり、他は `(restored)` になる。

### 検証メモ（PR #23）

| 懸念 | 結果 |
|------|------|
| (3) 他記事タイトル変更で `brew-coffee` が `(restored)` のまま | **再現した**。関連欄のリンク文言は古いタイトルのまま。`cacheKey` に関連記事の digest を含める必要あり。 |
| (4) `BlogOtherPosts.astro` 変更 | **再生成**（`+3ms`）。import グラフで無効化。 |
| (4) `blog.css` 1 行変更 | **BaseLayout 経由のため多数ページが再生成**（skills も含む）。通常の CSS デプロイで `--force` は必須ではない。 |
| (4) ミドルウェア | 本リポジトリに middleware 未使用。公式: 変更時は `--force` 推奨。 |

