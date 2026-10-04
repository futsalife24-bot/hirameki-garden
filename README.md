# 金継ぎ

割れた器を金の線でつなぎ直す、時間制限なしのパズルです。
欠片をタップして回し、中心の朱印からすべての欠片を一本の金の線でつなげば完成。

- 4×4 から 7×7 まで、進むほど広がるエンドレス形式（面は固定なので友達と手数を比べられます）
- 長押し（PCは右クリック）で欠片の向きを固定
- 進行状況と自己ベストは端末に自動保存
- PWA 対応：ホーム画面に追加すると全画面で起動し、オフラインでも遊べます

## 公開手順（GitHub Pages）

1. GitHub で新しいリポジトリ `kintsugi` を作成（Public）
2. 「Add file → Upload files」で、このフォルダの中身をすべてアップロード
   （`index.html` がリポジトリ直下に来るように。`icons` フォルダも忘れずに）
3. Settings → Pages → Branch を `main` / `/(root)` にして Save
4. 数分後、`https://<ユーザー名>.github.io/kintsugi/` で公開されます

### コマンドで一気にやる場合（gh CLI）

```bash
cd kintsugi
git init && git add . && git commit -m "first release"
gh repo create kintsugi --public --source=. --push
gh api -X POST repos/{owner}/kintsugi/pages -f "source[branch]=main" -f "source[path]=/"
```

## 更新するとき

`index.html` などを書き換えたら、`sw.js` 冒頭の `VERSION`（`kintsugi-v1` → `kintsugi-v2`）も上げてください。
上げ忘れると、ホーム画面版に古いファイルが残ることがあります。

## ファイル構成

```
index.html              ゲーム本体（1ファイル完結）
manifest.webmanifest    PWA の設定（名前・アイコン・色）
sw.js                   オフライン用のキャッシュ
icons/                  アプリアイコン
.nojekyll               GitHub Pages の余計な変換を止める空ファイル
```
