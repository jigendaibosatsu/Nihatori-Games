# ゲーム用・設計メモ

このフォルダは **Nihatori Games の自前キャラ・世界観・設定** をまとめておく場所です。

- 新作ゲームを作るときに「このキャラ使って」「この設定で」と参照できる
- 記事やブログで世界観を揃えたいときのメモとして使える

## ファイル一覧

| ファイル | 内容 |
|----------|------|
| [characters-and-setting.md](./characters-and-setting.md) | キャラ一覧・世界観・トーン・よく使う設定（メモ） |

## データとしてゲームから読みたい場合

`/data/characters.json` にキャラ名・色・短い説明などをJSONで置いておくと、ゲームのJSから `fetch('./data/characters.json')` で読み込めます。  
まずは **characters-and-setting.md** に思いついたことを書いておき、必要になったら **data/characters.json** を増やしていく形でOKです。
