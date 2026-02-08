# Nihatori-Games

## 自前キャラ・設定（ゲームで再利用する用）

- **メモ・設計**: `docs/characters-and-setting.md` … キャラ一覧・世界観・トーン・よく使う設定を自由に書く
- **説明**: `docs/README.md` … 上記フォルダの使い方
- **データ（ゲームから読む用）**: `data/characters.json` … キャラ名・色・メモをJSONで保持。ゲームのJSから `fetch('./data/characters.json')` で読み込める

新作ゲームで「このキャラ使って」「この設定で」と揃えたいときは、ここを参照する。

## アセット管理

- **共通アセット**: `/assets/` … 複数のゲームで使用するアセット（ウーパー画像、うんこ画像など）
- **アセット管理ドキュメント**: `docs/ASSET_MANAGEMENT.md` … アセット管理の詳細
- **アセット一覧**: `assets/ASSET_LIST.md` … 共通アセットの一覧
- **ヘルパー関数**: `assets/asset-helper.js` … アセットパス取得のヘルパー

新作ゲームでは共通アセットを `/assets/` から参照し、ゲーム固有のアセットのみ `games/[game-name]/assets/` に配置してください。

---

## トップページ（Yahoo!ニュース風 UI）

- **変更・追加ファイル**: `index.html`, `styles.css`, `app.js`, `data/feed.json`, `assets/logo.svg`
- **タブとURL**: `?tab=top` / `?tab=games` / `?tab=hobby` / `?tab=posts` / `?tab=trending` / `?tab=recommended` でタブを指定。ブラウザの戻る/進むに対応。
- **ローカル確認**: ルートで簡易サーバを立てる。`npx serve .` または `python3 -m http.server 8000` のあと、`http://localhost:3000` や `http://localhost:8000` で表示。`data/feed.json` と `assets/logo.svg` は同じオリジンで配信すること。