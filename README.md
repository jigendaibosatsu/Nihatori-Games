# Niwatori-Games

## トップページ（Yahoo!ニュース風 UI）

- **変更・追加ファイル**: `index.html`, `styles.css`, `app.js`, `data/feed.json`, `assets/logo.svg`
- **タブとURL**: `?tab=top` / `?tab=games` / `?tab=hobby` / `?tab=posts` / `?tab=trending` / `?tab=recommended` でタブを指定。ブラウザの戻る/進むに対応。
- **ローカル確認**: ルートで簡易サーバを立てる。`npx serve .` または `python3 -m http.server 8000` のあと、`http://localhost:3000` や `http://localhost:8000` で表示。`data/feed.json` と `assets/logo.svg` は同じオリジンで配信すること。