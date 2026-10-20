# ひらめきの庭の公開結果と残件

2026-10-20。アプリ単位の明示公開承認と r4 限定独立再監査合格に基づき、新版と旧版の移行案内を公開した。**公開・合成データ検証は完了。Android 実機と本人データの移行は未完了。** この記録が以前の「未公開・再監査待ち」時点の資料より新しい状態を示す。過去の監査資料は固定したまま残す。

## 公開したもの

| 対象 | URL／識別子 | 状態 |
|---|---|---|
| 正式新版 | https://hirameki-garden.pages.dev/ | 無料の Cloudflare Pages に公開済み |
| 新版 deployment | `012f4b76-e3c1-46bd-b962-c63decbd7add` | Production / main |
| 固有配布URL | https://012f4b76.hirameki-garden.pages.dev | r4 配布 |
| 新版ソース | `c6fb2a4817481a14916dd8df8cf7019641c507d5` | 専用 branch `migration/cloudflare-hirameki-20261020` |
| 旧版 | https://futsalife24-bot.github.io/hirameki-garden/ | 案内・JSON書き出し・検証専用 |
| 旧版公開commit | `812c4ab71d1014dfe11d09cd893b65447fc8279f` | remote main、Pages built、2026-10-20 13:45:28 UTC |
| 変更前base | `6260027eca22336d688804d43e7075f59658737b` | 旧版を含む移行作業のbase |

新版は八作品と帳面28面の公開版を基に、root の manifest id/start_url/scope、root のSW登録、明示404、JSON移行と保存adapter、応答境界を検証するSWを配布した。未承認の追加作品・面は含めていない。Viteを使わない静的構成なので `base` 設定はなく、root用と旧サブパス用を許可リストによる別成果物へ分離した。

旧版は監査済み `dist/legacy` 11資材を配置し、入口を案内へ差し替え、静的manifestを削除した。残るゲーム資材や問題データは削除しなかった。旧 `sw.js` は対象scopeで skipWaiting / clients.claim するだけで、fetch処理・登録解除・cache削除を持たない。旧新版とも他アプリのcacheを検索・削除しない。実ユーザーのブラウザ保存、LMF、ほかのアプリ、Swarm Front、workers.devには操作していない。

## 引継ぎデータと安全性

`hirameki-world` と、八作品 `kintsugi / hoshizu / kagee / katsuji / chomen / himitsu / somewake / sangaku` それぞれの `-save-v1 / -best / -sound`、計25キーを移す。対象実装にユーザー作成問題・IndexedDB・sessionStorageの保存先は見つからなかった。保存されない一時undo等は対象外で、金継ぎの保存に含まれる履歴は保持する。

旧版でJSONファイルへ書き出し、新版で内容を確認して読み込む。app/version、許可キー、値・盤面・回転行列を検証し、未知schema／別app／不正値を拒否する。確認チェックと最終上書き確認を要求し、その間の保存変更も検出する。単一 `hirameki-import-v1` カプセルへの保存を使い、元キーは削除しない。保存エラー・検証失敗・キャンセルは無変更。iframe、postMessage、query/hashへのバックアップ格納は使わない。実データ・認証情報は資料に含めない。

## 検証結果と証拠

すべて隔離した一時Edgeと合成データで実施した。本人のブラウザプロファイルは使っていない。

- ローカル自動試験：応答境界19項目、固定r2からの更新と25項目保持、正常308、監査回帰10項目、不正ファイル／別app／未知version／キャンセル／既存保存／保存エラー、ゲーム八作品。終了コード0。`reports/r4-execution-results.json` と各試験JSONを参照。
- 独立監査：`C:/Users/futsa/Documents/Codex/2026-10-20/task-7/ひらめきの庭-PWA移行-r4限定再監査-20261020.md`、P0/P1/P2=0/0/0。監査時点と本番配布後を区別する。
- 新版本番：36資材のSHA256一致、root manifest/SW、未知URL404、別originの旧版相当から物理JSONファイルを書き出し、新版UIで不正app拒否・キャンセル・25項目import一致・ゲーム操作／保存／再読込、庭と引継ぎの相互offline遷移。終了コード0。`reports/production-migration-results.json`。
- 本番v2→v4：同じ正式originの実v2を先に保持した一時profileで更新。25項目、元キー、旧cacheを保持し、v4の通常Responseと3経路のofflineを確認。終了コード0。`reports/production-v2-to-v4-results.json`。
- 本番redirect：`/index.html /migration.html /migration` それぞれの初回offlineとonline再読込後offlineが成功。終了コード0。`reports/production-v4-redirect-results.json`。
- 旧本番資材：11資材は公開commitとバイト一致。監査済み配布ZIPとは一部のCRLF→LFのGit正規化以外一致し、両SHA256を記録した。旧manifestは404。終了コード0。`reports/legacy-production-assets.json`。
- 旧本番SW更新：元v16の実制御状態から対象scopeのSWのみ更新し、manifest linkなし、旧manifest404、物理exportの25項目一致、元localStorage、対象外合成cache／IndexedDB保持、旧版import無効を確認。終了コード0。`reports/legacy-production-results.json`。

補助検査の失敗も残す。Python urllibの本番取得1回は403となり再試行しなかった。その後の通常Edgeによる資材検証は成功した。旧版取得の最初の照合はGitの改行正規化でバイト不一致となり、公開commitのバイトと監査済み内容を分けて全件照合した。旧SW更新helperの初回はブラウザオブジェクトの直列化により検証側のscope取得が失敗し、取得方法だけを修正後に完走した。製品コードの追加変更はない。

## 固定成果物と再配布

- r4監査ZIP：`hirameki-migration-audit-20261020-r4.zip`、SHA256 `8c58dd5173324b54cc48f28fb27ddbef45699d58eddb4385c885c68ebc8c191b`。
- manifest SHA256：`cb6a28b0fb8ecb7057d78535d5de4dbda6747f26b1700ecd0b67d4e3cd118a29`。固定76ファイルは公開後も同じ内容を保持する。
- 新版ZIP：`hirameki-new-20261020-r4.zip`、SHA256 `1aab4cdfccf792156e564dc86dbd55f0fd25c1ab8fc020a6818fe6cd73963636`。
- 旧版ZIP：`hirameki-legacy-20261020-r4.zip`、SHA256 `2e63326285b4df463d39923a94431520e25d82fb9b3eee5e89a7fd94c26d2d9f`。

ZIPはtask-6直下に保管し、上書きしない。新版再配布は同sourceを `node tools/build-migration.cjs` で生成し `dist/new` だけをPagesへ送る。旧版は `dist/legacy` の正確な11資材を配置しmanifestを除去する。mainへ新版root manifestをmergeしない。過去の `dist/*-previous-*` や全作業フォルダをuploadしない。今後の変更・別アプリの公開は個別承認の対象。

## 残件・復旧

[実機向け手順](PWA-MIGRATION-DEVICE-20261020.md) に従い、旧exportの検証後に本人が新版へimportし、八作品・設定を確認する工程が残る。Android実機、Chromeのインストール／アンインストールUI、データ保持の選択肢の表示は未確認。本人移行の完了とは記録しない。

未更新端末はofflineで旧画面や旧manifestが残り得る。旧書き出し専用SWは新資材をcacheへ保存しないため、更新後の旧exportはonlineで行う。旧cacheを残すため、これらを強制cleanupで解消しない。

不具合時は旧書き出しを維持し、本人のJSONを確保した上で修正を確認する。新版の保存カプセルを読めるadapterとexportを残す。元v16 SWには広いcache削除があるため機械的に戻さず、import前の旧ゲームへのdowngradeもしない。端末データ削除をrollbackに使わない。必要なら監査済みr4成果物を再配布し、別版への変更は別途検証する。

後続のkatamon等は台帳整理のみ。LMF再インストール案内は全対象の移行後とし、今回は行わない。Vaultは既存記録を維持した末尾追記だけを行い、Vaultのstage／同期／commit／pushは行わない。
