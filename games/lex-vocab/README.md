# Lex Vocab

語彙×作業タイマー×カードバトルの統合Webアプリ。

- **LEX RHYTHM**: 25分タイマー／5分休憩で英単語を追加
- **OXWORD BATTLE**: 蓄積した単語でカードバトル＋2択クイズ
- localStorage で永続化

## 開発

```bash
npm install
npm run dev
```

## ビルド＆デプロイ

```bash
npm run build:deploy
```

`index.html` と `assets/` がルートに出力され、静的ホスティングでそのまま利用可能。
