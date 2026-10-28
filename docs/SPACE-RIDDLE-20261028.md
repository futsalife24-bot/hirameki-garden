# かくれ絵への差し替え（2026-10-28・公開承認待ち）

ユーザーはSpaceRiddle形式のゲームを希望し、3D空間の白いかけらが視点によって一枚の絵になる参考画像3点を提示。影絵と重なるため、遊び帖三を「かくれ絵」に差し替えた。公開はまだ行っていない。

## 対象と保護

- GitHub: https://github.com/futsalife24-bot/hirameki-garden
- 作業場所: `C:/Users/futsa/Documents/Codex/2026-10-28/space-riddle/hirameki-garden`
- branch: `feat/space-riddle-20261028`
- base: `543f942ad15aaf5bfaacb656bdb95e540b6fbd30`。正式製品のsource branch `migration/cloudflare-hirameki-20261020` とリモート一致確認済み。
- 元作業場所・未追跡 `.wrangler/` は変更せず、独立cloneで実装。旧GitHub mainは移行案内専用でありmergeしない。
- 旧影絵の3キー・旧保存カプセル・コードは保持。新規キー `kakuree-save-v1` / `kakuree-sound` を使い、データ変換や削除はしない。

## 内容と変更ファイル

- `riddle.js`：曲線の絵を不規則なVoronoi領域へ分割し、各領域を異なる奥行きへ配置。視点を回して正面で絵がつながる。自動完成、ヒント、回数、ベスト、再開、不正保存回復、保存失敗通知。
- `riddle-shapes.js`：独自12問。参考画像や他作品の素材は流用していない。
- `riddle.css` / `index.html` / `garden.js`：暗い展示室・白いかけらの世界観。庭とゲームを同じ雰囲気へ。旧入口 `#kagee` を維持。
- `sw.js` / `tools/build-migration.cjs`：v5のキャッシュ対象と新版配布物へ新資材を登録。応答の検証・cache保護は変更なし。旧移行版の成果物は維持。
- `test-riddle.cjs` / `test.cjs` / `package.json`：旧ゲームの操作テストを専用の新ゲーム検証へ置換。標準テストの新しい明色ボタンは実際の背景色でコントラストを測定する。
- `README.md` / `DESIGN_RULES.md` / `WORK_LOG.md` / 本資料：仕様・検証・残件を記録。

## 検証

すべて一時Edgeプロファイルと合成保存で実施。利用者の実データ・通常ブラウザは未操作。

| 検証 | 結果 |
|---|---|
| `node tools/build-migration.cjs` | 新旧分離ビルド成功 |
| `node test-riddle.cjs` | 全12問を開始角度からキー操作で完成。ドラッグで完成する一手も計上。再開、リセット確認、ヒント、周回、タッチpointer経路、壊れた保存、旧影絵3キー保持、offline、エラー0 |
| 画面 | 320×568 / 390×844 / 844×390 / 768×1024 / 1280×720。一画面表示、スマホとPCの画像を目視 |
| 公開版v4→v5 | baseの実SWと資材から更新。旧カプセルのデータ25項目・他アプリcache保持、更新後offline成功。日時は既存アプリの保存処理で更新される |
| `node test.cjs` | 他7作品の操作・保存、共通遷移、ライト/ダーク文字コントラスト、オープニング等の標準チェック成功 |
| `node test-migration-unit.cjs` | 旧25項目・不正入力・カプセル保護の単体検証成功 |
| `node test-sw-response-boundary.cjs` | 応答境界19項目成功 |
| 構文・差分 | 新JSの構文と `git diff --check` 合格 |

検証にはバンドルのPlaywrightを `NODE_PATH` で指定し、標準テストは `TEST_BROWSER_CHANNEL=msedge` を指定。最初のsandbox内Edge起動は権限エラーで失敗し、許可された隔離Edge実行へ移行。小画面判定はレイアウト確定前の測定を修正。初期角度が横向きに寄り過ぎる点、直接リンクから庭へ戻る選択、pagehideによる不要な再保存を修正した。旧カプセル比較は日時ではなく全データを比較。これらの修正後に上記検証が成功。

[検証JSON](reports/space-riddle-20261028/result.json)・[応答境界](reports/space-riddle-20261028/sw-response-boundary-results.json)

[スマホ開始画面](reports/space-riddle-20261028/mobile-start.png)・[PC画面](reports/space-riddle-20261028/desktop-play.png)・[庭](reports/space-riddle-20261028/mobile-garden.png)

## 制約と公開前の残件

- 新ゲームの進み具合は同一ブラウザに自動保存される。既存の「データの引継ぎ」は旧8作品25キーの契約を維持しており、新ゲーム2キーは対象外。機種間引継ぎは未実装。
- Android実機での手触り・本人の遊びやすさは未確認。ブラウザのタッチpointer経路を実機試験とは扱わない。
- 独立監査は実施していない。単一作品の差し替えとして自己レビューと必要な回帰検証を実施。
- 公開承認後に `dist/new` だけを正式Cloudflare Pagesへ配布し、配信資材・保存・offlineを確認する。旧github.ioへ新版を置かない。
- 主担当の実モデルID/推論設定は未確認。形データ担当は `gpt-6-sol` / `medium`。子による再委任なし。
