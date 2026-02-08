# アセット移行ガイド

## 概要

各ゲームのローカルアセットを共通アセット (`/assets/`) に移行しました。

## 変更内容

### パスの変更

**Before**:
```javascript
var AXOLOTL_IMAGE_BASE = '../../assets/axolotl/';
var unkoPath = './assets/unko.png';
```

**After**:
```javascript
var AXOLOTL_IMAGE_BASE = '/assets/axolotl/';
var unkoPath = '/assets/unko.png';
```

### 更新されたゲーム

- ✅ `games/axolotl-shop/` - 共通アセットを使用
- ✅ `games/axolotl-cafe/` - 共通アセットを使用
- ✅ `games/axolotl-idle/` - 共通アセットを使用

## ローカルアセットの扱い

各ゲームの `assets/` フォルダには重複アセットが残っていますが、これらは以下のいずれかで対応できます：

1. **削除**: 共通アセットを使用するため不要
2. **保持**: バックアップとして保持（推奨）
3. **シンボリックリンク**: 共通アセットへのシンボリックリンクに置き換え

## 今後の新規ゲーム

新しいゲームを作成する際は：

1. 共通アセットは `/assets/` から参照
2. ゲーム固有アセットのみ `games/[game-name]/assets/` に配置
3. パスは絶対パス `/assets/` を使用（推奨）

## ヘルパー関数の使用（オプション）

`/assets/asset-helper.js` を読み込むことで、便利なヘルパー関数が使用できます：

```html
<script src="/assets/asset-helper.js"></script>
```

```javascript
// ウーパー画像
var path = getAxolotlImagePath('nomal');

// うんこ画像
var path = getUnkoImagePath();

// その他の共通アセット
var path = getAssetPath('axolotl/axo_albino.png');
```
