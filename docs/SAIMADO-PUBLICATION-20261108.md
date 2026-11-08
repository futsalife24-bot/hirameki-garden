# 彩窓16窓の公開記録

2026-11-08。現在は公開準備中。公開成功と本番検証結果は、確認後この記録へ追記する。

## 今回の公開承認

本人への確認は2026-11-08 12:31:13 UTC（Sentinel_c08041430a048191a3d8e45a11a09136）。独自新作の彩窓16問、Undo・三段階ヒント・途中保存、開発環境での一意性・画面表示・既存セーブ互換の検証済み、Android実機未確認を説明して公開可否を確認した。本人は2026-11-08 12:56:30 UTC（Sentinel_b336c704e4d48191b8530ae4ac0d0431）に **「公開して」** と回答。親の指示で今回の実装branchと保存互換対応を対象にcommit・push・既存Pagesへの配布を行う。10/20の移行承認は流用しない。

対象は `feat/saimado-region-20261108` の彩窓16問と保存互換対応。baseは `ba4a28466f2176f57f1f4036bcad0027add252e2`。製品12ファイルのSHA256は承認前の固定記録と一致し、公開直前の全関連回帰でも再照合する。

## 配布境界と公開前確認

- 正式URL：https://hirameki-garden.pages.dev/#saimado
- 既存Pages project `hirameki-garden`、既存無料構成のProductionへ `dist/new` 41資材だけをDirect Uploadする。Pagesのproduction branch表示 `main` と、GitHubの旧案内専用mainを区別する。GitHub mainへmerge／pushしない。
- 公開前の既存deploymentは `49e380f4-8884-4c18-aff2-b60180262e80`、source `477ff82a602c338e083988c375ac9235d2ba0d53`。既存公開5資材はbaseとバイト一致、SWは `hirameki-pages-v6`。remoteの既存作品branchもbaseと一致した。
- 旧mainは `812c4ab71d1014dfe11d09cd893b65447fc8279f` の書き出し専用版。旧サイトは変更せず、公開後に11資材とexport機能が維持されていることを確認する。
- `.wrangler/`・認証ファイル・ブラウザprofile・実データをcommit／uploadしない。既存認証の範囲内で操作し、権限・料金・契約・公開範囲を変更しない。LMF、他アプリ、カタモンには操作しない。

## 検証記録

公開前の全関連回帰は `evidence/saimado-publication-20261108/preflight.json` と個別ログに記録する。新作の全16問・一意性・保存JSON v1/v2・旧SW更新・既存全体・かくれ絵正裏・帳面・SW応答境界を対象にする。すべて隔離Edgeと合成データを使う。

公開前に実本番v6を一時profileで保持し、公開後に正確なroot scopeの登録だけを更新する。旧25項目、かくれ絵、元キー、旧cache本文、合成他cache／localStorage／IndexedDB保持、新作の2手完成とoffline再開を確認する。

公開後のコールド確認は `test-saimado-production.cjs`。本番41資材のSHA、manifest、v7 cache、庭で彩窓選択、初問操作・保存再開、既存8作品表示、物理JSONファイル30項目のexport/import、offline、旧移行案内11資材と25項目exportを確認する。

Android実機、本人データ、端末の実際のタップ感は未確認。公開・隔離ブラウザ検証の完了を、本人の受入完了とは扱わない。

## 復旧

旧サイトの書き出しを維持し、データを消さずに状況を確認する。JSON形式2を読めるadapter/exportを残して修正する。形式2のデータを持つ端末へ、形式2を読めないv6を機械的に戻さない。SW登録解除・cache全削除・サイトデータ削除を復旧手順にしない。
