# ひらめきの庭：PWA 移行の公開待ち資料

2026-10-20。公開・push・Pages project 作成・アカウント設定変更は未実施。予定 URL は https://hirameki-garden.pages.dev/ 。名前の利用可否は未確認。別名を自動採用しない。

## 監査後の現在地（修正版 r2）

初回独立監査は **公開準備不合格**（F1/F2=P1、F3/F4=P2）。報告書 `C:/Users/futsa/Documents/Codex/2026-10-20/task-7/ひらめきの庭-PWA移行-独立監査-20261020.md` の再現を回帰テストで確認し修正した。自己検証が合格しても、独立再監査と公開承認が済むまでは公開準備合格・移行完了と扱わない。変更と再検証の正本は [修正対応資料](PWA-MIGRATION-REMEDIATION-R2.md)。初回の固定 ZIP は保持し、修正版は別 ZIP と manifest へ固定する。

## 対象と版

- repository: `futsalife24-bot/hirameki-garden`
- branch: `migration/cloudflare-hirameki-20261020`
- 作業場所: `C:/Users/futsa/Documents/Codex/2026-10-20/task-6/hirameki-garden`
- base / HEAD: `6260027eca22336d688804d43e7075f59658737b`。ローカル main を基準にした未コミット差分。remote の現在の main は未照合。公開前に親が認証を使わない読取り、または公開承認後の許可済み手順で再確認する。
- 別 checkout の HEAD `95078b4d521384e46b260d33f14115571952b807` と未コミットのルール整備は保持。未公開の帳面29〜36・封蝋を今回の公開物へ混ぜていない。八作品・帳面28ページの既存公開相当版が対象。
- LMF能力DB の repository、ファイル、保存領域は操作していない。Swarm Front は独立。

## 変更一覧と保存範囲

`migration-data.js` は対象キーを25個に固定。`migration.html` / `migration-ui.js` は書出し・ファイル検証・保存日時と全対象の内容確認・チェックボックスと確認ダイアログによる上書き確認を提供。検証または保存失敗時は元のキーを変更しない。別画面での変更を検出した場合は再確認を要求する。

`index.html` と各ゲームの保存アダプター、`garden.js` がこの保存経路を利用する。読み込み時だけ単一の `hirameki-import-v1` に25項目をまとめて保存し、その後もこの単一キーで更新する。元の25個の値は削除・上書きせず残す。null の項目も明示した全置換。合成容量不足で `setItem` が失敗した場合に部分反映しない。利用者がブラウザのサイトデータを消す操作まで防ぐものではない。

| 保存内容 | キー |
| --- | --- |
| 選択中の作品 | `hirameki-world` |
| 各作品の進行・盤面・手数等 | `<作品>-save-v1` |
| 各作品の自己ベスト | `<作品>-best` |
| 各作品の音設定 | `<作品>-sound` |

作品は `kintsugi` / `hoshizu` / `kagee` / `katsuji` / `chomen` / `himitsu` / `somewake` / `sangaku`。金継ぎの回転・固定・戻す履歴、星図の橋、影絵の回転行列、活字の配置、帳面の記入済み欄と書き損じ、秘密箱の位置、染め分けの瓶、算額の数字と書き直しも含む。

対象本体全 HTML/JS の保存 API 調査で、永続保存は上記 localStorage のみ。IndexedDB / sessionStorage の使用、ユーザー作成問題・アップロード内容の保存機能は見つからなかった。ゲーム中の一時的な履歴のうち、元版が永続化していないものを新規に保存したとは扱わない。書体 cache は進行データではなく移送対象外。

外部アプリのキーは読み出さない。iframe / postMessage / query・hash によるデータ移送は使用しない。JSON は端末へファイル保存する。未知 app / schema、旧 version、未知キー、型・範囲・盤面形状等が不正な値は拒否。未公開の封蝋を含むバックアップは受け付けない。

## 新版・旧版の成果物

`node tools/build-migration.cjs` で `dist/new` と `dist/legacy` を生成する。静的サイトであり Vite / base 設定は存在しない。新版は root に配置し、manifest の `id` / `start_url` / `scope` は `/`、SW と資材は root からの相対参照。

新版 SW は `hirameki-pages-v2` と書体用 cache を使用。全 cache 削除を廃止し、他の cache を削除しない。旧版成果物は `/hirameki-garden/` に配置する書出し専用ページで、manifest link を持たず、ゲーム初期化も保存の上書きも行わない。新 URL 案内、export、バックアップの形式確認を残す。import は旧サブパスでは無効。

旧 `sw.js` 用成果物は fetch handler なしの更新版。インストール・activate 時に移行画面をネットワークから開けるようにするが、登録解除・cache 削除は一切実施しない。既存公開版の SW は全 cache を消す危険な activate 処理を持つため、そのまま再配布しない。過去 cache の `hirameki-v*` 等は名前だけで所有を断定できず、今回はすべて保持する。LMF を含む他アプリの cache は触らない。既存 SW が古い画面を返している場合はオンライン再読込みと更新後の画面確認が必要。Chrome による更新時期・インストール UI の実機挙動は未確認。

## 検証と証拠

- `node test-migration-unit.cjs`：メモリー上の合成データで全25項目の不正値拒否、空保存、既存 capsule への保存失敗、別画面の古い書込み拒否、未公開作品混入拒否が合格。
- `node test-migration.cjs`：一時プロファイルの headless Edge、異なる localhost port の旧・新 origin でブラウザ自動検証。実ファイル download → file input、HTTP 200、manifest / 実 SW 制御、オフライン、既存データありの取込み、キャンセル、不正形式、容量不足、取込後のゲーム操作と再読込み、他アプリ用の合成 SW・cache 本文・localStorage・IndexedDB の保持が合格。
- 結果正本は `docs/reports/migration-results.json`。画面記録も合成データのみ。
- `node test-migration-upgrade.cjs`：指定 base から `git archive` した元の `hirameki-v16` を、一時 Edge の旧サブパスへ登録。元 app shell と manifest の cache 済み・実 SW 制御を確認。その後に他アプリ用の合成 SW/cache を置いて旧移行版へ切替え、オンライン再読込みで manifest link なし・export 成功・元 localStorage と対象外 SW/cache の保持を確認し、終了コード0。ブラウザ更新確認では、正確に一致した当該 scope と scriptURL の登録にだけ `registration.update()` を明示実行した。製品コードが更新を強制した検証ではなく、ブラウザの自動更新時期は未確認。証拠は `docs/reports/migration-upgrade-results.json`。
- **制限：移行 HTML へ一度もオンライン更新していない端末は、オフラインで旧 SW が元の manifest 付き app shell を返すことを確認した。全旧端末での install 不可は未達。** 旧 HTML の配布だけで既に保存済みの manifest や OS のインストール情報が消えたとは扱わない。移行画面が表示されるまで旧データを保全し、オンライン更新・画面確認を案内する。広い cache 削除によって解決しようとしない。
- 既存 `node test.cjs` は最初の実行で固定したリンクがスライド操作を遮る問題を検出。庭上部のボタンへ修正後、既存標準テストの全八作品・保存・表示・オフライン・実行エラー確認が終了コード0で合格。
- 構文・ビルド・`git diff --check` を確認。自動ブラウザ検証を人の手動操作確認や Android 実機確認と混同しない。
- 未検証：Android 実機、Chrome 実機インストール UI、聴感、pages.dev 配信、希望名の空き、実 Cloudflare ビルド、独立監査。local root の合格は pages.dev 公開の合格ではない。

## 承認後の配布手順

1. 親が独立監査を手配し、差分・資料・合成証拠を渡す。必須指摘を解消する。現在の公開 main と base の差異も確認する。
2. アプリ単位で対象差分、予定 URL、新旧成果物、無料枠利用について利用者の明示承認を得る。今回は承認を得ていない。認証済み `gh` / `wrangler`、push、deploy、project 作成、旧サイト差替えはいずれもここまで禁止。
3. 承認範囲に Pages project 作成を含むことを確認し、`hirameki-garden` の空きを確認。取れなければ親へ相談し、停止する。`dist/new` のみを希望 project の root に配布する。アカウント設定変更や有料サービス追加はしない。
4. 新 URL の HTTP / manifest / SW / 合成 import を配信後に検証し、案内表示を「公開承認待ち」から実際の公開状態へ修正して再ビルドする。利用者に未公開先へ移動させない。
5. 別の承認対象として旧 github.io の `/hirameki-garden/` に `dist/legacy` を配布。root や他 repository のファイルを置き換えない。旧利用者の保存は削除しない。案内と export が表示されるまで uninstall / cleanup を案内しない。
6. 利用者の引継ぎ・実機確認後も旧版の書出し機能を維持する。完了判定・後続アプリ・LMF 再インストール案内は親が別途扱う。

## 実機向け手順（配信検証後にだけ案内）

1. 旧版をオンラインで開き、移行画面から JSON をファイル保存する。
2. 同画面のファイル選択で保存した JSON を検証し、日時・作品・進み具合・設定を確認する。ファイルが保存できない、形式エラー、内容不足なら作業を止める。バックアップ検証前に uninstall しない。
3. 必要な場合だけ旧アプリを uninstall する。その際「データを残す」選択が実際に表示された場合のみ選ぶ。表示されない場合はデータを消す可能性がある操作を続けず、旧アプリを残したまま親へ相談する。架空の UI を選ばせない。
4. 公開確認済みの https://hirameki-garden.pages.dev/ を開き、ホーム画面へ install する。
5. 新版の「データの引継ぎ」で JSON を選び、内容確認後に上書きへ同意。既存データがあれば先にそれも export する。庭に戻り、進行・ベスト・音設定を確認する。旧 JSON は残す。

## rollback

公開前は成果物を配布せず専用 worktree を保持すればよい。既存 checkout や main を reset しない。

公開後に問題が起きたら新規の移行案内を止める。旧 origin の保存は触らず、旧移行版の export を維持する。旧 SW の全 cache 削除処理を含む版へ単純に戻さない。新版で追加の進行がある利用者には先に最新版の export・検証を案内する。取り込み後の正本は capsule なので、保存アダプターを外す古い本体への rollback はその進行を読めなくする。保存互換アダプターと export を残す修正版を用意する。cache / localStorage / IndexedDB の削除を rollback 手順に含めない。配布の rollback にも明示承認を得る。

## 独立監査への依頼

`migration-data.js` の許可キー・型・値検証、単一書込みの失敗安全性、ゲームの保存互換、旧サブパスでの import 禁止、SW/cache の影響範囲、他アプリ保持テストを重点確認する。公開や認証操作を監査へ委任しない。未公開の新作との混在、対象外 repository を変更していないことも確認する。今回の自己検証を独立監査合格とは扱わない。

最終検証追記：`node test.cjs`、`node test-migration.cjs`、`node test-migration-unit.cjs` はいずれも終了コード0。合成データの390px確認画面を `docs/reports/migration-preview.png` で目視し、横はみ出し・操作の重なりがないことを確認した。独立監査と実機は未確認。

追加証拠：全八作品の途中進行（手数／書き損じ／書き直し）、全八作品の自己ベスト・音設定、金継ぎの固定と履歴、帳面の記入済み欄、算額の入力を含む25項目の合成バックアップでも、実ファイル download → import → 全項目一致を終了コード0で確認。元 checkout の差分一覧も開始時と一致。Vault の既存2ノートをハッシュ照合後にローカル更新して読み戻し、既存 staging は変更せず、同期・commit・push は未実施。

修正版の配布注意：旧成果物は `manifest.webmanifest` 自体を含めない。承認後の旧配布では、単なる上書きコピーで以前の manifest を残さず、対象アプリの配布ファイル一覧を `dist/legacy` と照合して当該静的 manifest が残っていないことを確認する（旧 manifest URL は404を期待）。他 repository、SW登録、cache、端末保存の削除を意味しない。旧側に root 用 manifest を送らない。現在は旧サイトの差替え・ファイル削除を一切行っていない。
