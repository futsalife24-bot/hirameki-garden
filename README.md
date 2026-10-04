# ひらめきの庭

世界観の異なるパズルを集める遊び場。収録作品は「金継ぎ」と「星図」です。

- 公開先：https://futsalife24-bot.github.io/hirameki-garden/
- GitHub：https://github.com/futsalife24-bot/hirameki-garden
- 作業場所：`C:/Users/futsa/Documents/Codex/2026-10-04/new-chat-4/kintsugi`

## タイトル画面の方針

タイトル画面も選択中のゲームの世界観を表します。下のスライド切り替え（‹ 一 金継ぎ ／ 二 星図 ›、横スワイプ、左右キー）で
遊びを選ぶと、背景・書体・配色・絵が世界観ごと切り替わります。選んだ遊びは端末に覚え、次に開いたときもその世界観から始まります。
金継ぎは生成りの和紙・青磁の器・墨色・金の継ぎ目、星図は夜空・真鍮の星図盤・灯る星の「ひらめきの庭」です。
庭（タイトル後のホーム画面）はスクロールせずに一画面で見渡せます。器の絵が残りの高さに合わせて伸び縮みし、
「器をつなぐ」ボタンは常に画面内に収まります。背の低い画面では説明文を省き、横向きのスマホなど極端に低い画面だけスクロールします。
和風は金継ぎ固有であり、ほかのゲームに強制しません。

`#garden`（またはハッシュなし）がタイトル画面、`#kintsugi` が金継ぎ、`#hoshizu` が星図。
`<html data-world>` と `<body data-world>`（`kintsugi` / `hoshizu`）が現在の世界観を表します。

## オープニング

アプリを開いてタイトル画面に入るときだけ、約11秒のオープニングを流します。
各文字の場面に解説の文字は入れず、パズルの動きだけで見せます。最後の「ひらめきの庭」は約2.7秒見せてから白い光へ移ります。
「ひ・ら・め・き・の」を一文字ずつ別のパズル（塗る・合わせる・映す・満たす・ひらく）で組み上げ、
五色のかけらが「庭」にまとまったあと、白い光が選択中のゲームのタイトル画面の地の色へ明けます。

- 流さない場面：ゲームから庭へ戻るとき、`#kintsugi` で開いたとき（再読込を含む）、動きを減らす設定のとき。
- ブラウザは操作なしに音を鳴らせないため、最初に「音ありではじめる／音なしではじめる」を選びます。
- いつでも「スキップ」ボタンかEscキーで飛ばせます。再生中に音のON・OFFも切り替えられます。
- 映像はCanvas、BGMと効果音はWeb Audioでその場で合成します。画像・音声ファイルは使っていません。
- 特定のゲームの世界観には寄せない、作品全体の幕開けです。試作は `docs/previews/intro-movie.html`（本編の `opening.js` が最新）。

## ゲーム画面

どのゲームもスクロールせず一画面に収まります。盤面が残りの高さと幅に合わせて伸び縮みし、
画面には戻る・ゲーム名・面・「遊び方」・音・盤面・手数と操作だけを置きます。遊び方は「遊び方」ボタンの案内に、
完成表示は手数と操作の場所に出ます。最初の面（金継ぎの第1の器、星図の第一夜）は手ほどきで、次に触る場所が光ります。

## 金継ぎ

欠片をタップして回転。長押し・右クリック、またはフォーカス中にLキーで固定。
朱の印からすべての欠片に金の線をつなぐと完成します。
4×4から7×7の固定面。時間制限なし。進み具合と自己ベストは端末内に保存。
庭に戻っても進行は保持。旧版の保存キーとパズル生成ルールを引き継いでいます。
釉薬の色むら・細かな貫入をCanvasで生成し、土の縁・厚み・反射をCSSで表現します。
写真や外部画像素材は使用していません。

## 星図

星を光の線で結ぶパズル（橋をかけろ）。数字はその星から出る線の本数。線は縦横だけ、二本まで重ねられ、交差しません。
すべての星をひとつながりにすれば完成。星をタップしてから同じ列の星をタップ、または星からなぞって結びます。
線をタップするたびに 1本→2本→なし。キーボードは矢印で星を移り、Shift＋矢印で結びます。
5×5から9×10まで全30夜。時間制限なし。進み具合と自己ベストは端末内に保存（`hoshizu-save-v1`・`hoshizu-best`、金継ぎとは別）。
問題は `tools/hoshizu-gen.cjs` で作り、答えがひとつに決まる面だけを `hoshizu-levels.js` に収録しています（`node tools/hoshizu-gen.cjs` で再生成）。

## 書体

Google Fontsの「解星 特ミン」（Kaisei Tokumin）と「ZENオールド明朝」（Zen Old Mincho）。
いずれもSIL Open Font License 1.1。無料利用・埋め込みが認められています。

- https://github.com/google/fonts/blob/main/ofl/kaiseitokumin/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/zenoldmincho/OFL.txt

通信できず書体を取得できない場合は端末の明朝体を使用します。

星図の世界では「解星デコール」（Kaisei Decol、SIL Open Font License 1.1）を使います。

- https://github.com/google/fonts/blob/main/ofl/kaiseidecol/OFL.txt

オープニングでは、一文字ずつ違う書体を使います。いずれもGoogle Fonts、SIL Open Font License 1.1。
使う文字だけを取り寄せる（`text=` 指定）ため、通信量はわずかです。届かない場合は代わりの書体で流れます。

- ひ：Reggae One　https://github.com/google/fonts/blob/main/ofl/reggaeone/OFL.txt
- ら：Hachi Maru Pop　https://github.com/google/fonts/blob/main/ofl/hachimarupop/OFL.txt
- め：Kaisei Decol　https://github.com/google/fonts/blob/main/ofl/kaiseidecol/OFL.txt
- き：Potta One　https://github.com/google/fonts/blob/main/ofl/pottaone/OFL.txt
- の：Train One　https://github.com/google/fonts/blob/main/ofl/trainone/OFL.txt
- 庭：Zen Antique Soft　https://github.com/google/fonts/blob/main/ofl/zenantiquesoft/OFL.txt
- 見出し：Zen Kaku Gothic New　https://github.com/google/fonts/blob/main/ofl/zenkakugothicnew/OFL.txt
- 欧文・数字：Unbounded　https://github.com/google/fonts/blob/main/ofl/unbounded/OFL.txt

## ローカル確認

```sh
python -m http.server 8765 --bind 127.0.0.1
```

`http://127.0.0.1:8765/` を開きます。

```sh
npm install
npx playwright install chromium
npm test
```

既存Edgeで検証する場合は環境変数 `TEST_BROWSER_CHANNEL=msedge` を指定します。
インストール済みのChromiumを使う場合は `TEST_BROWSER_PATH=<実行ファイルのパス>` を指定します。
テストは独立したプロファイルと一時HTTPサーバーを使い、利用者の保存データには触れません。

## 公開

GitHub Pagesはmainのルートを配信します。作業ブランチで検証し、承認後にmainへ反映。
HTML・CSS・JavaScriptを更新するときは `sw.js` のVERSIONを上げます。
公開版が以前の画面の場合はオンラインで再読込してください。

## ファイル

- `index.html`：タイトル画面、ゲーム画面、金継ぎの処理
- `garden.css`：金継ぎの世界観で統一したタイトルと盤面のデザイン
- `ceramic.js`：タイトルに展示する器の描画
- `opening.js`・`opening.css`：アプリを開いたときのオープニング（映像・音・スキップ）
- `garden.js`：庭のスライドと世界観の切り替え、星図の背景の星空と遊び帖の絵
- `hoshizu.js`・`hoshizu.css`・`hoshizu-levels.js`：星図のゲーム・世界観・問題データ
- `tools/hoshizu-gen.cjs`：星図の問題を作り、答えがひとつか確かめる道具
- `manifest.webmanifest`・`sw.js`：ホーム画面追加とオフライン対応
- `icons/`：初回公開時の器アイコンを継続使用
- `test.cjs`：操作・保存互換・画面幅・オフライン・オープニング・星図の検証
