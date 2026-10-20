# 独立監査 F1〜F4 の修正と再監査対象 r2

2026-10-20。初回独立監査は**公開準備不合格**。本書は修正版の実装者による対応記録であり、独立再監査の合格ではない。公開・push・旧サイト差替え・project 作成・認証利用は未実施。LMF・実ユーザーの保存・他 scope/cache は操作していない。ブラウザ内の対象外保存はすべて自分で作った合成 sentinel だけ。

## 監査の根拠と修正

独立報告の正本：`C:/Users/futsa/Documents/Codex/2026-10-20/task-7/ひらめきの庭-PWA移行-独立監査-20261020.md`。

| 指摘 | 初回固定ソースの行と再現 | r2 の対応 |
| --- | --- | --- |
| F1 / P1 | `sw.js:57–63`。庭を online → 初めて移行画面を offline で開くと庭になる。逆順では起動先が移行画面になる。404 も index を壊す | navigation の保存先をパス別に分離。`/` と `/index.html` だけ index へ統合し、移行画面は独立項目。成功応答だけ保存し、書込み完了を `waitUntil` に結び付けた。未知パスの offline は専用項目がなければ503で、庭に化けさせない |
| F2 / P1 | `sw.js:63,82`。先に別 cache へ同 URL の PNG 合成本文を置くと、その本文を返す | 画面・資材の検索は `caches.open(VERSION)` の専用 Cache に限定。書体も専用 fonts Cache のまま。VERSION は `hirameki-pages-v2`。古い cache・対象外 cache の削除はしない |
| F3 / P2 | `tools/build-migration.cjs:6–12`。旧出力にも新版の root manifest がコピーされる | 新旧の許可ファイルを明示し、旧出力に manifest を含めない。前回出力を同じ `dist/` 内へ退避し、毎回空の出力先で生成する。旧 HTML は manifest link なし。旧 `migration.html` にも明示的な書出し専用属性を埋め、指定外配置でも import を無効化 |
| F4 / P2 | `migration-data.js:25–27`。`[[-1,0,0],[0,1,0],[0,0,1]]` が直交性だけで受理される | 直交性に加え、行列式が許容誤差0.001以内で +1 であることを検証。反射は内容確認前に拒否。通常ドラッグの回転と小さい数値誤差は許容 |

## 回帰テストと修正前の再現

追加した `test-migration-audit.cjs` は、初回ソース／初回ビルドに対して最初に実行し、F1の両順序・404、F2、F3、F4を不合格として再現した。証拠は `docs/reports/migration-audit-before-fix.json`。修正前の通常ドラッグ項目の timeout は、F1で404画面になった同一文書から hash だけを変えたことによる後続試験の到達失敗であり、通常ドラッグ自体の別不具合とは判定していない。回帰コードは `index.html#kagee` へ明示的に新規 navigation するようにして、試験間の影響を分離した。

修正後の `docs/reports/migration-audit-regression.json` は、F1の両順序・404後の起動、F2の正しいPNGと対象外本文保持、F3のmanifest非搭載、F4の反射拒否・正常誤差許容・実ファイルからの無変更拒否・通常ドラッグ保存→取込み→再起動で行列差1e-6未満、旧成果物の指定外配置での書出し専用、対象外SW/cache本文/localStorage保持を確認する。

既存の `test-migration.cjs`、`test-migration-unit.cjs`、`test-migration-upgrade.cjs`、`test.cjs` も再実行する。コマンドと最終終了コードは本書末尾と実行記録に記載する。自動ブラウザ試験と実機・手動試験を区別する。

## 配布と固定

base / HEAD は引き続き `6260027eca22336d688804d43e7075f59658737b`、branch は `migration/cloudflare-hirameki-20261020`。差分は未コミット。元の監査 ZIP `hirameki-migration-audit-20261020.zip`（SHA256 `be8a0a56c1f19d47b6de889eaff15520799f7eae84f7b6aba82e60d04ba54442`）は保持する。

r2 は別名の `hirameki-migration-audit-20261020-r2.zip` と `hirameki-migration-audit-20261020-r2.manifest.json` に固定。初回 ZIP の `source/` を基準とした `previous-to-r2.patch` と、全ファイルの追加・変更・削除および旧新 SHA256 一覧 `previous-to-r2-files.json` を同梱する。追跡差分だけで新規ソースを欠落させず、現在の完全ソースと manifest を正本にする。初回の拒否操作を記録した supplement も再監査資料に同梱する。

生成新版と旧版は `hirameki-new-20261020-r2.zip` / `hirameki-legacy-20261020-r2.zip`。配布する場合も `dist/new` / `dist/legacy` だけを使い、退避した `*-previous-*` は混ぜない。旧版には manifest がないため、承認後の旧サイト配布で以前の静的 `manifest.webmanifest` が重ね置きで残らないことと、その旧URLの404を確認する。現在の公開ファイルを今削除する操作ではない。

## 引き続き未確認・未達

- 独立再監査は未実施、公開準備は未合格のまま。親が r2 を再監査へ渡す。
- Android実機、Chrome実機インストール UI、ホーム画面起動、聴感、pages.dev 配信、希望名の空き、remote main の現時点の内容は未確認。
- 一度もオンライン更新していない元SW端末は offline で旧 manifest 付き shell を返すため、全旧端末の install 不可は未達。旧移行SWは fetch handler を持たず、更新済み旧 export の offline 可用性も保証しない。旧データ・export を保全したままオンライン更新と画面を確認する。
- バックアップ検証前の uninstall はさせない。対象外 scope/cache の登録解除・削除や、全cache削除による回避はしない。
- 元の remote URL 未マスク表示の拒否は迂回せず、再試行していない。

## 最終実行結果

`node test-migration-audit.cjs`（10項目）、`node test-migration.cjs`、`node test-migration-unit.cjs`、`node test-migration-upgrade.cjs`、`node test.cjs` はすべて終了コード0。再ビルド前後の全配布ファイルの内容ハッシュ一致、旧manifest不在も終了コード0。`git diff --check`・修正JS/CJSの構文確認に問題なし。実行記録は `docs/reports/migration-r2-execution.json`、再ビルド証拠は `migration-r2-build.json`。これは独立再監査合格を意味しない。
