# アセット管理ガイド

## ディレクトリ構造

```
assets/
├── README.md (このファイル)
├── axolotl/          # 共通アセット: ウーパー画像
├── unko.png          # 共通アセット: うんこ画像
├── logo.png          # 共通アセット: ロゴ
└── [その他の共通アセット]

games/[game-name]/
├── assets/           # ゲーム固有アセット（必要に応じて）
└── [ゲームファイル]
```

## アセットの種類

### 共通アセット (`/assets/`)
複数のゲームで使用されるアセット。ルートの `/assets/` ディレクトリに配置。

- **ウーパー画像**: `/assets/axolotl/`
- **うんこ画像**: `/assets/unko.png`
- **ロゴ・アイコン**: `/assets/logo.png` など

### ゲーム固有アセット (`games/[game-name]/assets/`)
特定のゲームでのみ使用されるアセット。

## 使用方法

### JavaScriptから使用

```javascript
// 共通アセットヘルパーを使用（推奨）
var assetPath = getAssetPath('axolotl/axo_nomal.png');
// 結果: '/assets/axolotl/axo_nomal.png'

// または直接パスを指定
var imagePath = '/assets/axolotl/axo_nomal.png';
```

### HTMLから使用

```html
<!-- 共通アセット -->
<img src="/assets/axolotl/axo_nomal.png" alt="ウーパー" />

<!-- ゲーム固有アセット -->
<img src="./assets/game-specific.png" alt="ゲーム固有" />
```

## パス解決

ゲームのディレクトリから共通アセットへのパス：
- `games/axolotl-shop/` → `/assets/` は `/assets/` (絶対パス)
- または `../../assets/` (相対パス)

**推奨**: 絶対パス `/assets/` を使用（ルートからのパス）

## 新しいアセットの追加

1. **共通アセットの場合**:
   - `/assets/` に追加
   - このREADMEに追加内容を記載

2. **ゲーム固有アセットの場合**:
   - `games/[game-name]/assets/` に追加

## アセットの命名規則

- ファイル名は小文字とハイフンを使用: `axo-nomal.png`
- キャラクター画像: `[character]-[variant].png`
- アイコン: `[name]-icon.png`
