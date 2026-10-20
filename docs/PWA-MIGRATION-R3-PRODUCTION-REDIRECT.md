# 初回配布で判明した Pages redirect と修正候補 r3

r3の独立監査はR3-F1/P1で不合格。現在の修正候補は [r4](PWA-MIGRATION-R4-RESPONSE-BOUNDARY.md) で、未公開・再監査待ち。この文書はr3の経過として保持する。

2026-10-20。新版は初回配布済みだが本番検証未合格。旧github.io版は差し替えていない。利用者の実機移行も未完了。r2の限定再監査合格を、本番で新たに判明したこの問題の合格として扱わない。

## 認証・公開操作の実績

- 公式Wranglerの既存権限 `account:read` / `workers_scripts:write` / `offline_access` を維持し、今回承認された `pages:write` だけ追加する再認証session9023が成功、終了コード0。Pages一覧取得も終了コード0。秘密ログは公式 `WRANGLER_WRITE_LOGS=false` で無効化し、token・認可コード・認可URLは転記していない。
- project新規作成の初回操作は自動レビューが実行前に拒否。その後、親から公開承認範囲の補足を受領し、既存一覧で未作成を確認して一度だけ再試行し成功。別名・別project・有料サービス・別scopeは追加していない。
- project：`hirameki-garden`、production branch設定：`main`、Git連携なしの静的Direct Upload。
- 公開URL：https://hirameki-garden.pages.dev/
- 初回deployment：`f9dcbb54-b509-477d-8148-5b4e0b432ab6`
- 固有URL：https://f9dcbb54.hirameki-garden.pages.dev
- 配布ソースcommit：`af49df24d897177cfaa02a6f8b4cd3a47ed473f6`、source branch `migration/cloudflare-hirameki-20261020` にpush済み。
- r2から初回配布までの製品差分は `migration.html` の案内1行のみ。「公開承認待ち」を、旧バックアップ検証後に引き継ぐ案内へ変更した。初回SWは監査済みの `hirameki-pages-v2`。
- 旧GitHub Pagesのremote mainは配布開始時点でbase `6260027eca22336d688804d43e7075f59658737b` と一致。旧版差替え用の別worktree `C:/Users/futsa/Documents/Codex/2026-10-20/task-6/hirameki-legacy-release` / branch `migration/github-export-20261020` は同baseから作成しただけで、ファイル変更・commit・pushはまだしていない。

## 本番で合格した範囲と失敗

`test-production-migration.cjs` を新しい一時Edgeプロファイル・合成データだけで実行した。

1. 本番の35資材すべてがHTTP200で、ローカル配布原本とSHA256一致。
2. manifestのid/start_url/scopeはすべて `/`。本番SWのscriptURLとscopeは当該rootと一致。
3. 同じURLの合成他cacheが先にあっても正しいPNGを返す。
4. 旧版相当の別localhost originで合成JSONを実ファイル書出し。
5. 新版本番UIで異app拒否・確認キャンセル無変更・25項目import一致。
6. 取込み後の操作・保存・再起動。

ここまでは合格。その後、offlineで `/migration.html` へ移ると `net::ERR_FAILED` で失敗し、コマンド終了コード1。全テスト成功として扱わない。コードは失敗時に最終成功レポートを生成していないため、完走済みのproduction-resultsがあるとは記載しない。実際の失敗・cacheメタデータは追加の `pages-production-redirect-before-fix.json` に保存した。

## 原因と再現

[Cloudflare公式Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) のRoute matchingにより、`/index.html` は `/`、`/migration.html` は `/migration` へ正規化される。本番と同じ308を返す隔離localhostを追加し、次を修正前に再現した。

- `cache.addAll` で保存されたindex/migrationの応答は `redirected: true`、URLはredirect後のもの。
- 初回install直後に `/index.html` または `/migration.html` をofflineで開くと `net::ERR_FAILED`。
- `/migration` には専用の項目対応がなく、引継ぎ画面を返せない。

同じ3経路を本番の空プロファイルでも再現。証拠：`docs/reports/pages-redirect-before-fix.json`（localhost）、`pages-production-redirect-before-fix.json`（本番）。実ユーザーのブラウザ・保存は使っていない。

## r3修正候補と影響範囲

**r3はローカル候補であり、まだdeployしていない。独立再監査待ち。**

- `sw.js`：VERSIONを `hirameki-pages-v3` へ。redirect済みの応答をbody/status/statusText/headersを維持した新しいResponseへ複製して専用cacheへ保存。installのprecacheとnavigationの両方へ適用。`migration.html` と拡張子なしの `/migration` を同じcache項目へ対応させる。
- 同一origin・当該scopeの既存のパス判定だけを拡張する。cache横断検索・cache削除・登録解除は追加しない。既存v2 cacheや他アプリを消さない。
- `404.html` とビルド許可リスト：新版に明示的な404を追加。Pagesの既定SPA fallbackで未知パスがrootをHTTP200として返すことを避ける。旧成果物へは追加しない。新版は36ファイル、旧版は11ファイルのまま。
- `test-pages-redirect.cjs`：Pages相当の308サーバーと空プロファイルで `/index.html` / `/migration.html` / `/migration` を初回offline navigationし、画面とcache応答属性を検証。`PRODUCTION_REDIRECT_URL` 指定で本番にも同じ試験を適用できる。
- `test-production-migration.cjs` は本番の全資材一致・合成ファイル移行・offlineを検証するため追加した試験コード。配布ファイルには入れない。

保存形式・import/exportロジック・盤面・レベル・他アプリは変更していない。

## 再監査・再開の条件

親がr3の固定差分と証拠を独立再監査へ渡す。cache Responseの復元、redirect経路の別名、成功応答限定・404・専用cache保持・イベント寿命を重点確認する。自己検証を独立合格としない。

再監査後にだけ新版を再deployし、本番のredirect経路と合成移行が完走することを確認する。それまで旧mainへpushしない。以後、旧export/案内の差替え・旧manifestの404・正確な当該scope・合成保存保持を確認する。LMFのファイル・SW・cache・データへ一切触れない。

## 復旧とスマホへの案内

いまは旧github.io版を残しており、利用者は旧アプリを消さずに維持する。初回新版のonline importが動いたことは、実機移行の許可や完了を意味しない。旧exportの案内差替えもまだなので、利用者へ実機移行を開始させない。

初回新版の問題はoffline画面到達性で、合成テストで保存削除は観測していない。元データ・cacheを消す復旧はしない。r3で当該SWを更新し、既存v2保存を保ったままonline更新→表示確認→offline再検証する。既存利用者のサイトデータを削除するrollbackは行わない。r2固定ZIPと初回固有deployment URLは保持する。

Android/Chrome実機、本人の実データ移行、音の聴感、未更新旧端末のoffline旧manifest表示、更新後旧exportのoffline可用性の限界は引き続き未確認・未達として残る。

## 最終自己検証と固定

`test-pages-redirect.cjs` の3経路は初回offlineとonline再読込み後のoffline再読込みの両方で終了コード0。cacheのredirected属性はfalse。既存の監査回帰10項目、JSON移行、保存単体、元SW更新、八作品標準もすべて終了コード0。構文・ビルド・差分検査に問題なし。実行記録は `docs/reports/r3-execution-results.json`。

r3は未コミットの固定候補でHEADはaf49df24d897177cfaa02a6f8b4cd3a47ed473f6。`hirameki-migration-audit-20261020-r3.zip` とmanifestに固定し、r2からの差分と公開中af49df2からの差分を両方添付する。監査が終わるまでソース・ZIPを変更せず、r3再deploy・旧main差替えを停止する。
