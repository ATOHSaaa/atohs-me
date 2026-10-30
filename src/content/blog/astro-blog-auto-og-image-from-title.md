---
title: Astroで作っているブログでog:imageをタイトルから自動生成する
pubDate: 2026-10-30T20:30:00+09:00
tags: 開発, Astro
---

記事を書いて公開したあと、XにURLを貼る。ここでサムネイルがタイトルとズレていたり、汎用画像のままだったりすると、ちょっとモヤっとします。本文は整えたのに、リンクカードだけ別物、というのはもったいない。

このブログでは、記事ごとの `og:image` を **frontmatter のタイトル（とタグ・公開日）から PNG を生成**して使うようにしています。レイアウトは note の自動 OGP に近いイメージで、上にサイト名、中央に大きなタイトル、下に `#タグ` と日付、という構成です。

## やりたかったこと

要件はシンプルでした。

- 記事を増やすたびに、Photoshop や Figma で一枚ずつ作りたくない
- 日本語タイトルが潰れない（フォント・折り返し）
- サイトのトーンに合う（背景色・ロゴ・typography）
- **本番ビルドは速く保ちたい**（記事数が増えても OGP 生成でビルドが重くならない）

その結果、「Astro のページビルドのたびに Satori を回す」のではなく、**手元のスクリプトで PNG を書き出し、`public/` に置いて静的配信する**形にしました。

## 全体の流れ

1. 記事はいつもどおり `src/content/blog/<slug>.md` に書く（`title` / `pubDate` / `tags`）
2. 公開前に `npm run og:generate -- --slug=<slug>` を実行
3. `public/blog/<slug>/og.png` ができる
4. 記事ページの `<meta property="og:image">` はその URL を指す

記事テンプレート側では、ファイル名定数 `OG_IMAGE_FILENAME`（`og.png`）と slug から URL を組み立てているだけです。ビルド時に画像生成ロジックは走りません。

```ts
const ogImage = `https://atohs.me/blog/${post.id}/${OG_IMAGE_FILENAME}`;
```

PNG は `dist/blog/<slug>/og.png` として Workers から配られます。README にも書いてあるとおり、**`npm run build` だけでは OGP は更新されない**ので、タイトルやタグ、公開日を変えたら generate を忘れない、という運用です。

## 描画は Satori + Resvg

実装の中心は `src/lib/og-image.ts` です。

- **[Satori](https://github.com/vercel/satori)** … React っぽいオブジェクトツリーから SVG を生成（サーバー／Node 向け）
- **[@resvg/resvg-js](https://github.com/RazrFalcon/resvg-js)** … SVG を PNG（1200×630）にラスタライズ

フォントは `Noto Sans CJK JP`（Bold）を OTF で同梱し、generate の前に `ensure-og-font` で存在確認します。ヘッダーの丸ロゴは favicon 生成と同じパイプラインで作った PNG を data URL として埋め込んでいます。

背景は `#FBFAF7`、文字色は記事ページの見出しに近い青みのあるダークネイビー。ダークモードの OGP 画像は作っていません（SNS 側の表示はだいたいライト前提なので、ここは割り切り）。

## タイトルは「省略しない」折り返し

長いタイトルをフォントサイズで縮小するのではなく、**72px 固定のまま行折り返し**しています。note の自動画像に寄せた判断です。

日本語混じりのタイトルは、Satori に任せるより **自前で行幅を見積もって折り返す**方が安全でした。欧文は少し狭め、和字は em 近い幅、という粗い計測で、はみ出しそうなら改行します。

X 向けの `@ユーザー名` だけは特別扱いしています。

- `@` と直後の文字列を **1トークン**として扱う（行の途中で `@` だけ落ちない）
- どうしても折り返すときも **`@` + 最低1文字** は同じ行に残す

細かいですが、ハンドル付きのタイトルで変な改行が入ると目立つので、ここだけロジックを足しています。

## 生成スクリプトの挙動

`scripts/generate-blog-og-images.ts` が Markdown を走査します。

- frontmatter から `title` / `pubDate` / `tags` を読む（簡易パーサ）
- `draft: true` はスキップ
- **`og.png` が既にあればスキップ**（`--force` で全再生成）
- `--slug=` で1記事だけ生成可能

新規記事は slug を指定して1枚だけ作るのが速いです。レイアウトや色、フォントサイズを変えたときは `npm run og:generate:force` で全記事を更新します。

## ファイル名は `og.png`

記事ごとに `public/blog/<slug>/og.png` という **固定の名前**にしています。バージョン番号付きのファイル名にすると、コードや README、Cloudflare のキャッシュルールまで追従が必要で、自分には意味が伝わりにくかったので、シンプルな `og.png` に戻しました。

同一 URL で中身を差し替えるので、CDN には **`immutable` を付けず**、7日キャッシュ + stale-while-revalidate 程度に留めています（README の Cloudflare ルール B 参照）。レイアウトを大きく変えたあとは `og:generate:force` で PNG を更新し、SNS のプレビューが古いままなら X のカード再取得を待つ、くらいの割り切りです。

## Astro 公式の `@astrojs/og` との違い（ざっくり）

Astro には OG 画像用のインテグレーションもあります。今回の構成は、

- 生成タイミングを **ビルドから切り離した**
- 出力を **`public/` の静的ファイル**に固定した
- 折り返しや `@` など **ブログ固有の typography** を TypeScript で詰めた

という、自分のサイト向けの寄せ方です。公式ルートでも同じことはできますが、「incremental build で毎回全部の OGP を再計算したくない」「レイアウト変更は force 一発」という運用がしやすいのが、今の分離のメリットです。

## 運用メモ

- 記事公開の流れ: 本文を書く → `og:generate` → `npm run ship`（本番反映）
- タイトル・タグ・公開日を直したら、その slug だけ generate し直す
- `site-logo.png` を変えたら `favicon:generate` も（OG 用の丸アイコン PNG も一緒に更新）

この記事自体も、同じ仕組みで `og.png` が付いています。Xに URL を貼ったとき、タイトルとカードの見た目が一致しているか、たまに確認すると安心です。

## おわり

「OGP 用のデザインを毎回手作りしない」だけなら、Canva のテンプレでも足ります。でもブログを Astro でコードとして持っているなら、**タイトルから機械的に出す**方が、長い目で楽でした。

完璧な typographic な自動組版ではありません。それでも、記事を書くたびに画像制作のハードルが下がったのは大きくて、公開後のシェアも気持ちよくなりました。
