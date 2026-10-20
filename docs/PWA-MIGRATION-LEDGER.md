# github.io PWA 移行台帳

2026-10-20。ひらめきの庭以外は実装していない。後続は manifest の存在を対象 repository で確認できたものだけ着手対象に確定する。

| 順 | アプリ / repository | 現在地・残件 |
| --- | --- | --- |
| 1 | `futsalife24-bot/hirameki-garden` | 専用 worktree で準備中、公開未承認。希望 `hirameki-garden.pages.dev`、名前の空き未確認 |
| 2 | `futsalife24-bot/katamon` | セーブあり。希望 `katamon.pages.dev`。利用者申告の `tools/` 内 manifest も含めて次回調査。本タスクでは実装なし。手元で検索した旧 checkout に manifest は見つからず、現行正本の再特定が必要 |
| 3 | `futsalife24-bot/work-shift` | 後続。保存先・manifest の現行実体は未調査 |
| 3 | `futsalife24-bot/janken-stats` | Vault の同名ノートで repository を照合。manifest・保存調査は次回 |
| 3 | キラキラ / `futsalife24-bot/Ichi-game` | 既存ローカル正本の `manifest.webmanifest` が「キラキラ アイランド」、`short_name` が「キラキラ」。`icons/icon-192.png` を目視し、白いうさぎのアイコンを確認。旧 URL は Vault に `https://futsalife24-bot.github.io/Ichi-game/` と記録。変更なし |
| 後続候補 | `hollowmere-atlas` | Vault に repository の記録あり。manifest の現行実体未確認。PWA 対象確定前 |
| 後続候補 | `tabi-jitaku-app` | 利用者指定候補。manifest と正本を次回確認 |
| 後続候補 | `shopping-scout` | Vault に repository の記録あり。manifest の現行実体未確認。PWA 対象確定前 |
| 完了済み扱いの別件 | koelift | 利用者・判断記録により `https://koelift.pages.dev/` へ移行済み。今回再検証・変更なし |
| 対象外 | LMF能力DB / `futsalife24-bot/lMfDB` | github.io に残す唯一のアプリ。ファイル・SW・cache・保存データの操作を禁止。全移行後の再インストール案内も今回はしない |
| 対象外 | Swarm Front / プロジェクト管理の workers.dev | 別 origin・独立作業。変更なし |

後続の短名は利用者承認後に一つずつ確認し、取得できない場合は代替名を勝手に使わない。LMF を含む origin 全体の cleanup はどの段階でも実施しない。
