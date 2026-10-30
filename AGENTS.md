# エージェント向けガイド

デプロイ・本番ビルド・Astro 設定を触る作業の前に、**[README.md の「増分静的ビルド」](./README.md#増分静的ビルド)** を読むこと。

## 増分ビルド（要点）

本リポジトリは `experimental.incrementalBuild: true` を有効にしている。詳細と検証結果は README を正とする。

1. **実験機能** — 将来の Astro バージョンで挙動やフラグが変わる可能性がある。
2. **`getStaticPaths()` と `cacheKey`** — 動的ルートを追加・変更するときは必ず `cacheKey` を返す。未指定の `getStaticPaths` ページは毎回フルレンダリングされる。
3. **記事ページの `cacheKey`** — 現状は当該記事の `digest` のみで足りる。**他記事のメタデータに依存する表示**を足すときは依存を `cacheKey` に含める（含めないと他記事更新でキャッシュ HTML が古くなる。過去に記事下の関連一覧で再現あり。README 参照）。
4. **テンプレート・CSS・コンポーネント** — import グラフに載る変更は多くの場合 Astro が依存ハッシュで無効化し再生成する。**ミドルウェア**は公式どおりキャッシュ済みページに反映されないことがある。心配なデプロイ（ミドルウェア変更、import 外の変更）では `npm run build -- --force` を使うか、Actions のキャッシュキーに該当パスを含める。
5. **`build.concurrency` > 1** — 増分キャッシュは無効。設定しない。
6. **キャッシュディレクトリ** — `node_modules/.astro/`（GitHub Actions でもここを保存・復元する）。

## デプロイ（Cloudflare Workers）

- 設定: ルートの `wrangler.jsonc`（静的アセットのみ、`dist/`）。`npm run build` で `dist/_redirects`（末尾スラッシュ **301**）も生成される
- プレビュー: `npm run build` → `npm run deploy:cf`（`workers.dev`）。トークンは `CLOUDFLARE_API_TOKEN`（必須）。`CLOUDFLARE_ACCOUNT_ID` は `ship` / `deploy:cf` が `scripts/cloudflare-account-id.sh` で付与（環境変数で上書き可）
- 本番リリース: **`npm run ship`** — commit 済みであること。1 回 `build` のあと `wrangler deploy` と `git push` を並列（`scripts/ship.sh`）
- CI（`.github/workflows/ci.yml`）はビルドのみ。増分キャッシュキーは Pages 時代と同じ考え方（`node_modules/.astro` + `package-lock.json` / `astro.config.mjs` / `src/content/**`）。**CI の成功だけでは本番は更新されない。**

詳細は [README.md のデプロイ](./README.md#デプロイcloudflare-workers) を参照。

## その他

- 日本語 Markdown 本文: [.cursor/rules/japanese-prose.mdc](./.cursor/rules/japanese-prose.mdc)
- ブログ新規作成: [.cursor/rules/write-blog.mdc](./.cursor/rules/write-blog.mdc)
