# r3監査R3-F1の対応候補 r4

2026-10-20。**r3は独立監査P0/P1/P2=0/1/0で不合格。r4は未公開・独立再監査待ち。** 本番は引き続きv2の初回配布で、既知のoffline問題が残る。旧github.ioは未差替え、本人の実機移行は未完了。

## 指摘と修正前再現

監査報告：`C:/Users/futsa/Documents/Codex/2026-10-20/task-7/ひらめきの庭-PWA移行-r3限定再監査-20261020.md`。R3-F1はP1、旧固定 `sw.js:42–47,51–55,83` の通常Response化が、元の最終origin・path・response.typeを検証しないこと。

新規 `test-sw-response-boundary.cjs` をr3配布物へ最初に実行し、二つのlocalhost originと空のEdgeプロファイルで、CORS許可の合成外部HTMLがアプリoriginのoffline画面となり、`window.syntheticForeignExecuted=true` が実行されることを再現した。合成scriptはwindowフラグだけを立て、保存読取り・送信はしない。同originの別画面や別資材への誤redirectでも候補SWがactivateすることを確認。証拠：`docs/reports/sw-response-boundary-before-fix.json`。

この再現はr3候補の条件付きの境界不備であり、公開中v2に外部redirect攻撃があると確認したものではない。r3は一度もdeployしていない。

## r4の実装

実質的な製品変更は `sw.js` のみ。VERSIONを `hirameki-pages-v4` にした。保存形式・JSON検証・ゲーム・レベル・manifest・ビルド許可リストはr3から変更していない。

1. `trustedAppResponse` は**複製前の元応答**で `type === basic`、空でない最終URL、同origin、登録scope内、userinfo/hashなし、query一致を確認する。CORS・default・error・opaque・opaqueredirectや外部URLは通常化しない。
2. root/indexの組とmigration.html/migrationの組だけを別名として許可する。別画面同士のredirectを受け入れない。HTML以外の資材は要求した正確なpathnameだけを許可する。
3. `cacheCopy` は上記に加えて成功statusを検証し、初めてcloneする。許可されたredirectだけをbody/status/statusText/headersを保つ通常Responseへ複製する。
4. installは同originモードで全SHELLを取得・検証し、全件成功するまで候補cacheを開かず書かない。異常時はinstallをrejectし、skipWaitingへ到達しない。既存SW・旧cache・localStorageを削除／書換えしない。cache書込み失敗でも候補をactivateしない。
5. navigationも同じ境界で検証し、不正なら正しい専用cacheまたは503へ戻る。未知の成功HTML経路は404にし、画面cacheへ入れない。同originの通常404はそのまま返し、保存しない。許可された正常redirectはonlineにも安全な複製を返し、requestのredirectモードと矛盾しないようにする。
6. 同origin資材のcache missにも最終URL／型の境界を適用する。Google Fontsは従来の専用外部font cacheのままで、アプリHTMLの通常Response化経路へ入れない。

広域cache検索・cache削除・SW登録解除は追加していない。旧v2/v3cacheは保持する。LMF・実データ・他アプリの実scope/cacheは触らない。

## 回帰と試験の区別

- `test-sw-response-boundary.cjs`：VM13種の変換前拒否とclone未実行、正常201/statusText/header/body保持、ブラウザの異常install3種、異常navigation2種の計19項目。異常installはredundantとなり、以前のSWと合成保存・cacheを保持、候補v4cacheも作らない。異常navigationの外部scriptは実行されず、通信断後も正しい移行画面を返す。
- `test-sw-r2-update.cjs`：固定r2配布ZIPを隔離サーバーで配信し、元v2のredirected=true cacheからr4へ正確なscopeの登録だけをupdate。25項目・元キー・旧v2cache・合成他SW/cacheを保持。正常308／query付き別名の6経路を、サーバーsocket切断を併用してonline→offline確認。未知URLはonline404・offline503。
- `test-pages-redirect.cjs`：root/index/migrationの正常308と初回offline／online後offlineを維持。
- `test-migration-audit.cjs`、`test-migration.cjs`、`test-migration-unit.cjs`、`test.cjs`：既存の監査回帰・JSON引継ぎ・保存境界・八作品を再確認する。最終終了コードは末尾と実行記録へ記載。

修正中の試験調整も区別する。初回の201検査は合成headerに非ASCIIを入れたためResponse生成自体で失敗し、ASCIIへ訂正した。新r2更新テストの404応答をapplication/octet-streamにしたためdownload扱いとなった箇所も、合成サーバーのMIMEをHTMLへ訂正した。いずれも製品のデータ破損ではない。

新版SWの許可navigationをroot/migrationへ限定したため、旧成果物の指定外配置試験は、新版root SWに制御されたcontextから切り離した空のcontextで行う。旧成果物自身が `/old/` でも読取り専用である条件は維持しており、assertionを外していない。実際の旧サイトは別originである。

## 再監査と公開の停止条件

r4を別ZIP・manifestに固定し、r3と公開中af49df2からの差分を渡す。r3固定ZIPを上書きしない。独立再監査で境界を確認するまでr4をdeployしない。旧mainへのpushも停止する。

現在の正式URL：https://hirameki-garden.pages.dev/

公開中deployment：`f9dcbb54-b509-477d-8148-5b4e0b432ab6`、ソース `af49df24d897177cfaa02a6f8b4cd3a47ed473f6`。r4のHEADも同値で、候補差分は未コミット。旧mainは `6260027eca22336d688804d43e7075f59658737b` のまま。新たなdeploy・認証変更・他アプリの公開はしていない。

再監査後、承認範囲内でr4を再deployし、本番36資材・manifest/SW・正しい308・404・合成import・offlineを完走させてから、旧export/案内へ差し替える。旧アプリはまだ削除しない。バックアップ検証前のuninstallを促さない。実機・本人データ移行・旧未更新端末のoffline旧manifest表示等の限界は残す。

## 最終自己検証と固定対象

境界19項目、固定r2からの更新・25項目／元キー／旧cache／他SW保持、正常308の3経路、監査回帰10項目、JSON移行、保存単体、八作品標準はすべて終了コード0。構文・ビルド・差分検査も成功。記録は `docs/reports/r4-execution-results.json` と各テストJSON。

r4はHEAD af49df24d897177cfaa02a6f8b4cd3a47ed473f6上の未コミット候補。`hirameki-migration-audit-20261020-r4.zip` とmanifest、r3および公開中af49df2からの差分へ固定する。r2更新試験に必要な固定r2配布ZIPを監査ZIPのrootに同梱するため、展開後 `source/test-sw-r2-update.cjs` から参照できる。過去のr2/r3固定ZIPは保持し、独立再監査まで新たなdeploy・旧サイト差替えをしない。
