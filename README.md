# ひらめきの庭

世界観の異なるパズルを集める遊び場。最初の作品は「金継ぎ」です。

- 公開先：https://futsalife24-bot.github.io/hirameki-garden/
- GitHub：https://github.com/futsalife24-bot/hirameki-garden
- 作業場所：`C:/Users/futsa/Documents/Codex/2026-10-04/new-chat-4/kintsugi`

## タイトル画面の方針

タイトル画面も選択中のゲームの世界観を表します。今は金継ぎの一作品のみ。
生成りの和紙、青磁の器、墨色、金の継ぎ目を用いた「ひらめきの庭」を表示します。
今後、作品を追加した際はスライド選択に応じ、背景・書体・配色・絵・演出を世界観ごと切り替えます。
現時点では架空のゲームや動かない左右ボタンを設けていません。
和風は金継ぎ固有であり、ほかのゲームに強制しません。

`#garden`（またはハッシュなし）がタイトル画面、`#kintsugi` が金継ぎ。
`body[data-world="kintsugi"]` が現在の世界観を表します。

## 金継ぎ

欠片をタップして回転。長押し・右クリック、またはフォーカス中にLキーで固定。
朱の印からすべての欠片に金の線をつなぐと完成します。
4×4から7×7の固定面。時間制限なし。進み具合と自己ベストは端末内に保存。
庭に戻っても進行は保持。旧版の保存キーとパズル生成ルールを引き継いでいます。
釉薬の色むら・細かな貫入をCanvasで生成し、土の縁・厚み・反射をCSSで表現します。
写真や外部画像素材は使用していません。

## 書体

Google Fontsの「解星 特ミン」（Kaisei Tokumin）と「ZENオールド明朝」（Zen Old Mincho）。
いずれもSIL Open Font License 1.1。無料利用・埋め込みが認められています。

- https://github.com/google/fonts/blob/main/ofl/kaiseitokumin/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/zenoldmincho/OFL.txt

通信できず書体を取得できない場合は端末の明朝体を使用します。

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
テストは独立したプロファイルと一時HTTPサーバーを使い、利用者の保存データには触れません。

## 公開

GitHub Pagesはmainのルートを配信します。作業ブランチで検証し、承認後にmainへ反映。
HTML・CSS・JavaScriptを更新するときは `sw.js` のVERSIONを上げます。
公開版が以前の画面の場合はオンラインで再読込してください。

## ファイル

- `index.html`：タイトル画面、ゲーム画面、金継ぎの処理
- `garden.css`：金継ぎの世界観で統一したタイトルと盤面のデザイン
- `ceramic.js`：タイトルに展示する器の描画
- `manifest.webmanifest`・`sw.js`：ホーム画面追加とオフライン対応
- `icons/`：初回公開時の器アイコンを継続使用
- `test.cjs`：操作・保存互換・画面幅・オフラインの検証
