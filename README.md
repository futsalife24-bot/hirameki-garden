# ひらめきの庭

世界観の異なるパズルを集める遊び場。収録作品は「金継ぎ」「星図」「かくれ絵」「活字」「帳面」「秘密箱」「染め分け」「算額」です。

- 正式公開先：https://hirameki-garden.pages.dev/ （2026-10-28 かくれ絵公開済み）
- 旧サイト：https://futsalife24-bot.github.io/hirameki-garden/ （移行案内専用）
- GitHub：https://github.com/futsalife24-bot/hirameki-garden
- 作業場所：`C:/Users/futsa/Documents/Codex/2026-10-06/4-pro20x-hub/hirameki-garden`（2026-10-07の発展ページ用checkout。旧checkoutは保持）

## タイトル画面の方針

タイトル画面も選択中のゲームの世界観を表します。下のスライド切り替え（‹ 一 金継ぎ ／ 二 星図 ／ 三 かくれ絵 ／ 四 活字 ／ 五 帳面 ／ 六 秘密箱 ／ 七 染め分け ／ 八 算額 ›、横スワイプ、左右キー）で
遊びを選ぶと、背景・書体・配色・絵が世界観ごと切り替わります。選んだ遊びは端末に覚え、次に開いたときもその世界観から始まります。
金継ぎは生成りの和紙・青磁の器・墨色・金の継ぎ目、星図は夜空・真鍮の星図盤・灯る星、かくれ絵は暗い展示室と白い立体のかけら、活字はインクの作業台と紙の版、帳面は方眼ノートと万年筆、秘密箱は寄木細工の工房と秘密箱、染め分けは藍染めの染め場と染料の瓶、算額は朱塗りの社殿と檜の算額の「ひらめきの庭」です。
庭（タイトル後のホーム画面）はスクロールせずに一画面で見渡せます。器の絵が残りの高さに合わせて伸び縮みし、
「器をつなぐ」ボタンは常に画面内に収まります。背の低い画面では説明文を省き、横向きのスマホなど極端に低い画面だけスクロールします。
和風は金継ぎ固有であり、ほかのゲームに強制しません。

`#garden`（またはハッシュなし）がタイトル画面、`#kintsugi` が金継ぎ、`#hoshizu` が星図、`#kagee` がかくれ絵、`#katsuji` が活字、`#chomen` が帳面、`#himitsu` が秘密箱、`#somewake` が染め分け、`#sangaku` が算額。
`<html data-world>` と `<body data-world>`（`kintsugi` / `hoshizu` / `kagee` / `katsuji` / `chomen` / `himitsu` / `somewake` / `sangaku`）が現在の世界観を表します。

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

## かくれ絵（2026-10-28・旧「影絵」の枠を差し替え公開済み）

空間に散る白いかけらを回し、一枚の絵につながる視点を探す立体なぞなぞ。身近なものの曲線シルエットを不規則に分け、奥行きへ離しています。参考作品の画像・素材・問題は使わず、独自の12問を用意しました。

ドラッグ・矢印キーで回転。Shift＋矢印キーで微調整。第1問は左右のみ、第2問から上下も使います。答えのお手本や一致率は表示せず、迷った時だけ言葉のヒントを開けます。表側・裏側のどちらでも絵が揃えば正解です。完成した向きで絵の名前が現れ、最終問からはもう一周できます。

入口 `#kagee` と作品選択値は互換維持。旧影絵の保存・記録・音設定と `kagee.js/css` は保持し、新ゲームは `kakuree-save-v1`（現在地・角度・回数・完成・ヒント・ベスト）と `kakuree-sound` に独立保存します。旧記録の変換・削除は行いません。

**現在の「データの引継ぎ」は旧8作品25キーの形式を維持しており、かくれ絵の新しい記録は含みません。** 同じ端末・ブラウザでは保存されます。機種間の引継ぎ対応は未実装です。

`npm run test:riddle` で全問の操作解答・保存・旧データ保持・画面サイズ・オフライン・公開版v4からのSW更新を確認します。詳細は [今回の記録](docs/SPACE-RIDDLE-20261028.md)。

## 活字

ヒントのない「はめ込みクロスワード」。下に並ぶ言葉の活字を、版のマスにすべてはめ込みます。
マスをタップして並びを選び（同じマスをもう一度押すと縦横が切り替わる）、同じ文字数の活字をタップするとはまります。
交わるマスの文字が食い違うものは入りません。はめた活字をもう一度押すと外せます。すべて埋まると刷り上がり、
朱の二重マスの文字を①から順に読むと合言葉になります。全24版（言葉5〜18）。第一版は手ほどきで、次に選ぶ並びが光ります。
問題は `tools/katsuji-gen.cjs` で作り、答えがひとつに決まる面だけを `katsuji-levels.js` に収録しています。保存は `katsuji-save-v1`・`katsuji-best`。

## 帳面

ヒント付きのシンプルなクロスワード。マスをタップするとその言葉のヒントが上に出ます（同じマスをもう一度押すとタテ・ヨコ切替、‹ › で未記入のヒントへ）。
答えをひらがな（カタカナも可）で打ち込み「書く」を押すと、合っていればペンで書き込まれます。違う答えは「書き損じ」として数えます。
入力欄の「○」には、交わる言葉ですでにわかっている文字が入ります。全28ページ（言葉5〜14）。一ページ目は手ほどき。
最初の20ページに続き、21〜28ページは「言葉・科学・地理・数と論理」の発展問題です。前半4ページは各10語、後半4ページは各12語。
身近なものを直接説明する初級問題から、専門語や言葉の定義を手掛かりにする問題へ進みます。盤面は縦横それぞれ最大11マスで、既存面と同じ上限です。
既存20ページの問題・順序・保存キーは変わりません。20ページ目を終えて次へ進むと、発展問題が始まります。
問題は `tools/chomen-gen.cjs`（既存の言葉とヒントは `tools/chomen-clues.cjs`、発展用は `tools/chomen-challenge-clues.cjs`）で作り、`chomen-levels.js` に収録。保存は `chomen-save-v1`・`chomen-best`。

## 秘密箱

寄木細工の箱の中の木片を上下左右に滑らせ、金の「鍵」の木片を右の縁の出口まで運ぶスライドパズル（箱入り娘）。
木片をなぞるとぶつかる所まで滑り、離すとマスにそろいます（キーボードは矢印で一マスずつ）。ひとつの木片を一方向へ動かすと一手。
全20箱（最短2〜33手、最短手数の少ない順）。完成時に最短手数と比べます。一の箱は最短手順に沿って次の木片を光らせる手ほどき。
問題は `tools/himitsu-gen.cjs` で作り（幅優先探索で最短手数と手順を求める）、`himitsu-levels.js` に収録。保存は `himitsu-save-v1`・`himitsu-best`。

## 染め分け

ガラス瓶に混ざって入った植物染料を注ぎ分け、どの瓶も一色にそろえるパズル。注ぐ瓶をタップし、注ぐ先の瓶をタップします。
注げるのは、注ぐ先が空か、いちばん上が同じ色のときだけ（同じ色が続いていれば入るだけまとめて注ぐ）。一つの瓶には四つまで。
どの染料にも模様の印があり、色だけに頼らず見分けられます。瓶が8本以上の甕は二段の棚に並べます。
全20甕（染料2〜12色、最短3〜36手、最短手数の少ない順）。一の甕は最短手順に沿って注ぐ瓶と注ぐ先を光らせる手ほどき。
問題は `tools/somewake-gen.cjs` で作り（幅優先探索で最短手数と手順を求める）、`somewake-levels.js` に収録。保存は `somewake-save-v1`・`somewake-best`。

## 算額

N×N の盤の各行・各列に 1〜N を一つずつ入れるパズル。太枠の区画の左上の「答えと式」（+ − × ÷）に、区画の数が合うようにします。
引く・割るは二マスの区画だけ。マスを選んで下の数字の札で書きます（キーボードは矢印と数字キー、消すは Backspace）。
同じ行・列の同じ数は朱の波線、式に合わない区画は答えの朱の地で知らせます。「書き直し」は書いた数を変えた・消した回数。
全20額（3×3〜6×6、小さい盤から、同じ大きさでは探索の手間の少ない順）。一の額は入る数が一つに決まるマスを光らせる手ほどき。
問題は `tools/sangaku-gen.cjs` で作り（解がちょうど一つの額だけを収録）、`sangaku-levels.js` に収録。保存は `sangaku-save-v1`・`sangaku-best`。

## 書体

Google Fontsの「解星 特ミン」（Kaisei Tokumin）と「ZENオールド明朝」（Zen Old Mincho）。
いずれもSIL Open Font License 1.1。無料利用・埋め込みが認められています。

- https://github.com/google/fonts/blob/main/ofl/kaiseitokumin/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/zenoldmincho/OFL.txt

通信できず書体を取得できない場合は端末の明朝体を使用します。

星図の世界では「解星デコール」（Kaisei Decol、SIL Open Font License 1.1）を使います。

- https://github.com/google/fonts/blob/main/ofl/kaiseidecol/OFL.txt

かくれ絵の世界では「Zen角ゴシック New」（SIL Open Font License 1.1）を使います。

- https://github.com/google/fonts/blob/main/ofl/rampartone/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/zenkakugothicnew/OFL.txt

活字の世界では「しっぽりアンチック B1」（Shippori Antique B1、SIL Open Font License 1.1）を使います。

- https://github.com/google/fonts/blob/main/ofl/shipporiantiqueb1/OFL.txt

帳面の世界では「クレー One」（Klee One、SIL Open Font License 1.1）を使います。

- https://github.com/google/fonts/blob/main/ofl/kleeone/OFL.txt

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

秘密箱の世界では「キウイ丸」（Kiwi Maru、SIL Open Font License 1.1）を使います。

- https://github.com/google/fonts/blob/main/ofl/kiwimaru/OFL.txt

染め分けの世界では「ZEN紅道」（Zen Kurenaido、SIL Open Font License 1.1）を使います。

- https://github.com/google/fonts/blob/main/ofl/zenkurenaido/OFL.txt

算額の世界では「佑字 肅」（Yuji Syuku、SIL Open Font License 1.1）を使います。

- https://github.com/google/fonts/blob/main/ofl/yujisyuku/OFL.txt

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

正式版はCloudflare Pages。旧GitHub mainは移行案内専用なのでゲーム本体をmergeしません。`node tools/build-migration.cjs` の `dist/new` が新版配布物です。公開には利用者の明示承認が必要です。[公開済み構成の正本](docs/PWA-MIGRATION-FINAL-PUBLICATION-20261020.md)と[今回の差分](docs/SPACE-RIDDLE-20261028.md)を確認してください。

## ファイル

- `index.html`：タイトル画面、ゲーム画面、金継ぎの処理
- `garden.css`：金継ぎの世界観で統一したタイトルと盤面のデザイン
- `ceramic.js`：タイトルに展示する器の描画
- `opening.js`・`opening.css`：アプリを開いたときのオープニング（映像・音・スキップ）
- `garden.js`：庭のスライドと世界観の切り替え、星図の背景の星空と遊び帖の絵
- `hoshizu.js`・`hoshizu.css`・`hoshizu-levels.js`：星図のゲーム・世界観・問題データ
- `tools/hoshizu-gen.cjs`：星図の問題を作り、答えがひとつか確かめる道具
- `riddle.js`・`riddle.css`・`riddle-shapes.js`：かくれ絵のゲーム・世界観・独自12問
- `kagee.js`・`kagee.css`：旧影絵のコード（保存・履歴保護のため保持、本編から読み込まない）
- `katsuji.js`・`katsuji.css`・`katsuji-levels.js`：活字のゲーム・世界観・問題データ
- `tools/katsuji-gen.cjs`：活字の問題を作り、答えがひとつか確かめる道具
- `chomen.js`・`chomen.css`・`chomen-levels.js`：帳面のゲーム・世界観・問題データ
- `tools/chomen-gen.cjs`・`tools/chomen-clues.cjs`：帳面の問題を作る道具と、言葉・ヒント
- `tools/chomen-challenge-clues.cjs`：帳面21〜28ページの発展用の言葉・ヒント
- `test-chomen.cjs`：帳面の既存20ページ互換・発展問題・更新とオフラインの検証（`npm run test:chomen`）
- `manifest.webmanifest`・`sw.js`：ホーム画面追加とオフライン対応
- `icons/`：初回公開時の器アイコンを継続使用
- `himitsu.js`・`himitsu.css`・`himitsu-levels.js`・`tools/himitsu-gen.cjs`：秘密箱のゲーム・世界観・問題データ・問題を作る道具
- `somewake.js`・`somewake.css`・`somewake-levels.js`・`tools/somewake-gen.cjs`：染め分けのゲーム・世界観・問題データ・問題を作る道具
- `sangaku.js`・`sangaku.css`・`sangaku-levels.js`・`tools/sangaku-gen.cjs`：算額のゲーム・世界観・問題データ・問題を作る道具
- `test.cjs`：操作・保存互換・画面幅・オフライン・オープニング・星図・影絵・活字・帳面・秘密箱・染め分け・算額の検証

## PWA 移行の準備（2026-10-20・未公開）

専用 branch `migration/cloudflare-hirameki-20261020` の移行差分は公開承認待ち。予定 URL は https://hirameki-garden.pages.dev/ （名前の利用可否未確認）。詳細・検証・配布・rollback は [公開待ち資料](docs/PWA-MIGRATION-20261020.md)、後続は [移行台帳](docs/PWA-MIGRATION-LEDGER.md) を参照。`node tools/build-migration.cjs` で新版 `dist/new` と旧書出し専用版 `dist/legacy` を分離生成する。今回の公開・push・project 作成は未承認・未実施。

2026-10-20 監査後追記：初回独立監査は公開準備不合格。F1〜F4 を修正し、[修正対応資料](docs/PWA-MIGRATION-REMEDIATION-R2.md) を正本として独立再監査待ち。公開承認・配信は未実施。
