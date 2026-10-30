---
title: Astroで作っているブログでog:imageをタイトルから自動生成する
pubDate: 2026-10-30T20:30:00+09:00
tags: 開発, Astro
---

ブログのog:imageを毎回作るのが面倒なので、タイトルに応じて自動で生成するようにしています。

技術的にそれほど難しい実装があるわけではない気がしているのですが、やっていることをメモ的に書いておきます。

## 簡単にやるなら？

技術的なことに興味がない場合は、お使いのAIエージェントに「ブログ記事のog:imageを、タイトルを参照して自動で生成するようにして」と頼めば、なんかいい感じにやってくれると思います。

おそらく多くの場合、この記事でも紹介するSatoriが使われるのではないでしょうか。

最初は気に入った見た目にならないかもしれませんが、ああしろこうしろと指示を重ねると、どんどん良くなっていきます。個人的には、記事タイトルのほかに、以下の項目を含めるのもおすすめです。

- ブログタイトル（サイト名）
- タグ or カテゴリ
- 公開日

## 全体の流れ

主にSatoriを使って自動化しています。

1. 記事は `src/content/blog/<slug>.md` に書く
2. 公開前に `npm run og:generate -- --slug=<slug>` を実行
3. `public/blog/<slug>/og.png` ができる
4. 記事ページの `<meta property="og:image">` はその URL を指す

記事テンプレート側では、ファイル名定数 `OG_IMAGE_FILENAME`（`og.png`）と slug から URL を組み立てているだけです。ビルド時に画像生成ロジックは走りません。

```ts
const ogImage = `https://atohs.me/blog/${post.id}/${OG_IMAGE_FILENAME}`;
```

PNG は `dist/blog/<slug>/og.png` として Workers から配られます。README にも書いてあるとおり、**`npm run build` だけでは OGP は更新されない**のが注意点です。僕の場合はCursorに「公開して」と言えば `og:generate` まで含めてやってくれるので、普段はそれほど意識していません。

## 描画は Satori + Resvg

`src/lib/og-image.ts` に実装をまとめています。

- **[Satori](https://github.com/vercel/satori)** … React っぽいオブジェクトツリーから SVG を生成（サーバー／Node 向け）
- **[@resvg/resvg-js](https://github.com/RazrFalcon/resvg-js)** … SVG を PNG（1200×630）にラスタライズ

## 生成スクリプトの挙動

`scripts/generate-blog-og-images.ts` が Markdown を走査します。

- frontmatter から `title` / `pubDate` / `tags` を読む（簡易パーサ）
- `draft: true` の記事はスキップ
- **`og.png` が既にあればスキップ**（`--force` で全再生成、`--slug=` で1記事だけも可）

新規記事は、slug を指定して1枚だけ生成するのが手早いです。

## Astro 公式の `@astrojs/og` で良くない？

それでもよいと思います。中身も Satori 系で、見た目だけがポンと変わるわけではありません。

いまの構成の違いは、**OGP 生成を Astro のビルドから切り離している**点くらいです。記事数が増えても `npm run build` のたびに全記事の画像を再計算しない、という割り切りです。体感では数秒レベルの差かもしれませんが、incremental build との相性を考えて、いまの方式にしています。

## 運用メモ

- 記事公開の流れ: 本文を書く → `og:generate` → `npm run ship`（本番反映）
- タイトル・タグ・公開日を直したら、その slug だけ generate し直す
- `site-logo.png` を変えたら `favicon:generate` も（OG 用の丸アイコン PNG も一緒に更新）

この記事自体も、同じ仕組みで `og.png` が付いています。Xに URL を貼ったとき、タイトルとカードの見た目が一致しているか、たまに確認すると安心です。

## おわり

og:imageの自動生成を実装したものの、Cursor頼りだったので、正直あまり自分で実装内容を把握しておらず、疑問点をCursorに聞きながら「なるほどなあ」と思って記事を書きました。

これから同じことをやる方は `@astrojs/og` から入ってもよいと思います。要素の配置や折り返し位置など、こだわりたい部分は結局コードになります。僕も詳細を忘れてしまったのでここでは割愛しますが、AIエージェントを使うなら「良い感じのレイアウトにして」と頼むのが早いです。
