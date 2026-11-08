# 彩窓：職人製の波ガラス

2026-11-08。本人の今回の **「職人製ガラスで公開までやって」** を受けた見た目の更新。実装・公開前の全13工程が終了0。既存正式URLへ公開し、本番の隔離確認も成功した。実Androidは未確認。

## 基点・承認範囲

専用branch `feat/saimado-artisan-glass-20261108`、作業場所 `C:/Users/futsa/Documents/Codex/2026-10-20/task-6/hirameki-artisan`。baseは直前の公開記録HEAD `7b43740069495895d3b8742609032c1ec5591e06`。開始時のremoteも同値でcleanだった。既存公開はdeployment `0da0125b-4452-4ff4-bbe3-153a2a782bb5`、製品commit `699e7552c31912a5280eaa54f69328d9e777701a`、SW v7。旧GitHub main `812c4ab` は移行案内専用で変更しない。

今回は全16問のDOM盤面の素材感・見出しを対象にし、問題・操作判定・ヒント・保存互換・他ゲームを維持する。既存無料Pagesの同じURL https://hirameki-garden.pages.dev/#saimado への公開まで承認済み。新規サービス・費用・資格情報・権限・公開範囲の変更は行わない。

## 参照と取得の制約

指定されたLibrary原本 `saimado-glass-comparison.png`（`libfile_0e2ec2e6a50881919b0ef9a13ac4e3df` / `file_0000000043a081fdac7d1458baa48c9e`）の同一性・画像情報と説明をLibraryで確認した。右の「職人の波ガラス」が承認対象。画像そのものは製品に貼り付けない。

原図を公式Library helperでローカル取得しようとしたが、WindowsのPythonに `os.setxattr` がなく属性保存時に失敗し、画像のインストールは未完了。原本は変更せず、属性を省略する迂回もしていない。画像の画素を直接ローカルで目視できたとは扱わない。実装は、委任された右案の具体的説明（青緑／クリーム、古びた真鍮、庭の透け、ミント、長い緩やかな波、薄い縁、ごく少数の気泡）を根拠に行い、実装画面は別途目視した。転送用の一時URL情報はrepositoryへ入れない。

## 実装

- `saimado-garden.svg`：昼光、柔らかな木立と小道を独自の静的SVGで描き、盤全体の背面へ配置。
- `saimado-glass.svg`：幅広く緩やかな波の明暗と小さな気泡2点。庭と合わせて2,927 bytes。外部画像・script・filter・animationを含めない。
- `saimado.css`：透明度を残したミント中心の色面、薄い古びた真鍮枠、控えめな縁の厚みを追加。数字のクリーム色の台座、印の明瞭な輪郭、暗い切断線、ヒントを装飾より前へ置く。模様の疑似要素はpointer-events:none。
- `saimado.js`：描画用CSS変数に盤の列／行とセル座標を追加する2箇所だけ。波の背景位置を全セルで合わせる。イベント・問題・ヒント・保存・手数は変更しない。
- 見出しは横書き・一行を指定し、見出しと操作ボタンをgridへ分離。360px以下では操作ボタンを次の行へ置き、タイトルが縦に押しつぶされないようにする。
- 全セルのblur/backdrop-filter、常時屈折、粒子、アニメーションは追加しない。静的背景を共有し、従来と同じ操作時のDOM再描画を使う。Androidの実負荷は未計測なのでfpsや電池消費を保証しない。
- 新2資材を許可リストとSWへ追加。候補SW/cacheは `hirameki-pages-v8-artisan`、新版43資材。cache削除・登録解除・保存キー変更は追加しない。

## 検証

`tools/test-artisan-release.cjs` は最終候補の製品ハッシュを固定し、新旧を含む13工程を実行する。問題データ・core・保存JSON・index・庭・他作品の実装がbaseから不変であることも照合する。証拠は `docs/evidence/saimado-artisan-20261108/`。

| 検証 | 内容 |
|---|---|
| `test-artisan.cjs` | 画像のMIMEとdecode、SVGに外部参照・filter・animationなし、280/320/360/390/600/844/1280pxの見出し横表示・一行・ボタン非重複・画面内収容、blur/backdropなし、アニメーション0、静止盤面の画像ハッシュ一致、タップ・Undo・完成 |
| `test-saimado-unit.cjs` | 16問の一意性・独立検算・全辺ヒント一致、JSON旧形式1／形式2互換と失敗時保持 |
| `test-saimado.cjs` | 16問すべてを辺操作で解答、5画面サイズ・最大盤、三段階ヒント、保存再開、別originの物理JSON export/import、offline |
| `test-artisan-upgrade.cjs` | 固定公開版v7から候補v8へ更新し、既存全30項目・元キー・旧cache・対象外合成SW/cache/IndexedDBを保持、offline操作 |
| 既存回帰 | 全体、かくれ絵正面12問と裏側24解答、帳面28ページ、保存移行と監査回帰、SW応答境界19項目 |

実装画面の入門と完成、密な第13／16窓、縦横画面を目視。数字・記号の台座と暗い境界が波より強く見え、見出しは横一行、狭画面はボタンが次行に分かれることを確認した。Windowsの一時Edgeと合成保存だけを使用し、モバイル表示／タッチはエミュレーションである。実Androidの操作・性能・本人データは未確認。

## 公開確認と復旧

同じ既存Pages projectへ `dist/new` だけを配布する。GitHub mainへゲーム本体を戻さない。公開後は43資材のSHA・v8cache・SVG描画・見出し・操作と保存再開・他作品・旧移行案内を確認する。公開前の実v7を別の一時profileへ保持し、第13窓の合成記録と全30項目・旧cache本文の保持を確認する。

見た目以外の保存schemaは同じなので、復旧が必要なら旧v7の元41資材と対応commitを保管して比較する。ただし実データ・cacheを削除して戻す手順にしない。本人受入・実機結果と、公開／隔離ブラウザ検証を区別する。LMF・他アプリ・カタモンには操作しない。


## 公開完了（2026-11-08）

| 項目 | 結果 |
|---|---|
| 正式URL | https://hirameki-garden.pages.dev/#saimado |
| 製品commit | `7f9a3c58eb801bbe9337bcf181e7b72d25d5b1fc` |
| Git branch | `feat/saimado-artisan-glass-20261108` |
| deployment | `2c941769-286d-4f01-9bc8-912d14be7406` |
| 固有URL | https://2c941769.hirameki-garden.pages.dev |
| Pages表示 | Production / main、Source `7f9a3c5`。GitHub mainは旧案内版のまま |
| Upload | 43資材、7件更新・36件再利用。既存Wrangler 4.92.0、終了0 |
| SW / cache | `hirameki-pages-v8-artisan`、root scope維持 |

公開前全13工程が終了0。素材・見出し、全16問の解答・判定・ヒント、保存復元・旧形式1と形式2、他作品、SW更新と応答境界を確認した。追加の更新試験も全30項目を比較して終了0。動作ロジックの不変照合と製品ハッシュ一致を確認した。

`node test-saimado-production.cjs` は終了0。本番43資材がdist/newのSHA256と一致し、v8の専用cacheに素材2点を含む追加資材が入ることを確認。320×568／390×844でSVG decode、見出しの横一行・画面内表示、blur/backdropなし・アニメーション0を確認した。庭からの彩窓選択→初問1手保存再開→2手完成、他8作品表示、offline操作、30項目JSONの物理ファイルexport/importも成功。旧移行案内は11資材・manifest削除状態・25項目export・検証専用を維持した。

公開前から保持した実本番v7の一時Edgeからv8へ更新し、全30項目、元キー、かくれ絵、旧cache40件の本文、対象外合成cache/localStorage/IndexedDBを保持。第13窓の9手の保存からタップ→Undo→タップ→10手で再開・offlineが成功（終了0）。helperのコンソールだけ「v7→v7」と表示したラベル誤記があったが、JSONのfrom/to・v8 cache・更新後の資材はv7→v8を確認した。

本番の狭画面・初問完成・第13窓の画面を目視した。実Android・本人データ・端末実負荷は未確認。Library原図のローカル取得未完了という制約も前述のとおり残る。新規費用・資格情報・権限・サービスの追加はなく、LMF・他アプリ・旧main・前回公開branchを変更していない。本人の今回の受入完了申告は未受領。

証拠：[全13工程](evidence/saimado-artisan-20261108/preflight.json)、[素材とレイアウト](evidence/saimado-artisan-20261108/appearance.json)、[全16問](evidence/saimado-artisan-20261108/browser.json)、[本番資材と操作](evidence/saimado-artisan-20261108/production.json)、[実v7→v8](evidence/saimado-artisan-20261108/production-v7-to-v8.json)、[deployment](evidence/saimado-artisan-20261108/deployment.json)、[狭画面](evidence/saimado-artisan-20261108/production-320x568.png)、[完成](evidence/saimado-artisan-20261108/production-first-solved.png)、[第13窓の再開](evidence/saimado-artisan-20261108/production-upgrade-level13.png)。公開後の資料だけを別commitに記録し、製品を再deployしない。
