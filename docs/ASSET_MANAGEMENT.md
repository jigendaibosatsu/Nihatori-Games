# アセット管理ドキュメント

## 概要

Nihatori Gamesプロジェクトでは、アセットを共通アセットとゲーム固有アセットに分けて管理しています。

## ディレクトリ構造

```
/
├── assets/                    # 共通アセット（ルート）
│   ├── README.md
│   ├── asset-helper.js        # アセットパスヘルパー
│   ├── axolotl/              # ウーパー画像（共通）
│   │   ├── axo_nomal.png
│   │   ├── axo_albino.png
│   │   └── ...
│   ├── unko.png              # うんこ画像（共通）
│   └── logo.png              # ロゴ（共通）
│
└── games/
    └── [game-name]/
        ├── assets/           # ゲーム固有アセット（必要に応じて）
        └── [ゲームファイル]
```

## アセットの分類

### 共通アセット (`/assets/`)

複数のゲームで使用されるアセット。ルートの `/assets/` ディレクトリに配置。

**例**:
- ウーパー画像: `/assets/axolotl/axo_*.png`
- うんこ画像: `/assets/unko.png`
- ロゴ・アイコン: `/assets/logo.png`

**使用例**:
```javascript
// ヘルパー関数を使用（推奨）
var path = getAssetPath('axolotl/axo_nomal.png');
// または
var path = getAxolotlImagePath('nomal');

// 直接パス指定
var path = '/assets/axolotl/axo_nomal.png';
```

### ゲーム固有アセット (`games/[game-name]/assets/`)

特定のゲームでのみ使用されるアセット。

**使用例**:
```javascript
// ゲーム固有アセット
var path = './assets/game-specific.png';
// または
var path = getGameAssetPath('game-specific.png', 'games/axolotl-shop');
```

## パス解決方法

### 絶対パス（推奨）

```javascript
// ルートからの絶対パス
var path = '/assets/axolotl/axo_nomal.png';
```

**メリット**:
- どのディレクトリからでも同じパスでアクセス可能
- パス解決が明確

### 相対パス

```javascript
// games/axolotl-shop/ から
var path = '../../assets/axolotl/axo_nomal.png';
```

**注意**: ディレクトリ構造が変わると壊れる可能性がある

## ヘルパー関数の使用

### 基本的な使い方

```html
<!-- HTMLに追加 -->
<script src="/assets/asset-helper.js"></script>
```

```javascript
// 共通アセット
var axolotlPath = getAssetPath('axolotl/axo_nomal.png');
var unkoPath = getUnkoImagePath();

// ウーパー画像（便利関数）
var nomalPath = getAxolotlImagePath('nomal');
var albinoPath = getAxolotlImagePath('albino');

// ゲーム固有アセット
var gameAssetPath = getGameAssetPath('custom.png', 'games/my-game');
```

## 既存ゲームの移行

既存のゲームは以下のように更新：

### Before
```javascript
var AXOLOTL_IMAGE_BASE = '../../assets/axolotl/';
function typeImagePath(t) {
  return AXOLOTL_IMAGE_BASE + 'axo_' + t + '.png';
}
```

### After
```javascript
// ヘルパーを使用
function typeImagePath(t) {
  return getAxolotlImagePath(t);
}

// または直接
var AXOLOTL_IMAGE_BASE = '/assets/axolotl/';
function typeImagePath(t) {
  return AXOLOTL_IMAGE_BASE + 'axo_' + t + '.png';
}
```

## 新しいアセットの追加手順

1. **共通アセットの場合**:
   ```
   1. /assets/ にファイルを追加
   2. /assets/README.md に追加内容を記載
   3. 必要に応じて asset-helper.js にヘルパー関数を追加
   ```

2. **ゲーム固有アセットの場合**:
   ```
   1. games/[game-name]/assets/ にファイルを追加
   2. ゲーム内で相対パスまたは getGameAssetPath() を使用
   ```

## ベストプラクティス

1. **共通アセットは `/assets/` に配置**
2. **絶対パス `/assets/` を使用**（相対パスより安全）
3. **ヘルパー関数を活用**（パス管理が簡単）
4. **重複を避ける**（同じアセットを複数箇所に配置しない）
5. **命名規則を統一**（小文字、ハイフン区切り）

## トラブルシューティング

### パスが解決されない場合

1. アセットが正しい場所にあるか確認
2. パスが `/assets/` で始まっているか確認（絶対パス）
3. サーバーの設定で `/assets/` が正しく配信されているか確認

### 重複アセットがある場合

1. 共通アセットとして `/assets/` に移動
2. 各ゲームの `assets/` から削除
3. パス参照を更新
