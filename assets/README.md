# アセット管理ガイド

## ディレクトリ構造

```
assets/
├── README.md (このファイル)
├── ASSET_LIST.md     # アセット一覧
├── asset-helper.js   # アセットパスヘルパー
├── characters/       # 全キャラクター画像
│   └── axolotl/      # ウーパー画像（characters内に移動）
├── ores/             # 鉱石・宝石アセット（統合）
├── money/            # 硬貨・お札アセット
├── materials/        # 粘土・石などの素材アセット
├── weapons/          # 武器アセット
├── items/            # その他アイテム（うんこなど）
├── icon/             # アイコンアセット
├── logo.png          # ロゴ
└── [その他の共通アセット]

games/[game-name]/
├── assets/           # ゲーム固有アセット（必要に応じて）
└── [ゲームファイル]
```

## アセットの種類

### 共通アセット (`/assets/`)
複数のゲームで使用されるアセット。ルートの `/assets/` ディレクトリに配置。

- **キャラクター**: `/assets/characters/` - 全キャラクター画像
  - ウーパー画像: `/assets/characters/axolotl/`
  - その他のキャラ: `/assets/characters/`（スライム、柴犬など）
- **鉱石・宝石**: `/assets/ores/` - 鉱石と宝石を統合
  - 鉱石: 鉄、銀、金、プラチナ、クリスタルなど
  - 宝石: ルビー、サファイア、エメラルド、ダイヤモンドなど
  - 粘土・石: 各種粘土と石
- **通貨**: `/assets/money/` - 硬貨とお札を統合
  - 硬貨: 金貨、銀貨、銅貨など
  - お札: 1円〜10000円紙幣
- **素材**: `/assets/materials/` - 粘土、石、木材など（将来の拡張用）
- **武器**: `/assets/weapons/` - ツルハシ、剣、斧など
- **アイテム**: `/assets/items/` - うんこなどその他のアイテム
- **アイコン**: `/assets/icon/` - ゲームアイコンなど
- **ロゴ**: `/assets/logo.png` - サイトロゴ（特別扱い）

各フォルダには `README.md` があり、詳細な説明と使用方法が記載されています。

### ゲーム固有アセット (`games/[game-name]/assets/`)
特定のゲームでのみ使用されるアセット。

## 使用方法

### JavaScriptから使用

```javascript
// 共通アセットヘルパーを使用（推奨）
var assetPath = getAssetPath('characters/axolotl/axo_nomal.png');
// 結果: '/assets/characters/axolotl/axo_nomal.png'

// または直接パスを指定
var axolotlPath = '/assets/characters/axolotl/axo_nomal.png';
var unkoPath = '/assets/items/unko.png';
var orePath = '/assets/ores/iron_ore.png';
var gemPath = '/assets/ores/ruby.png';
var coinPath = '/assets/money/coin_32.png';
var iconPath = '/assets/icon/axolotl-shop.png';
```

### HTMLから使用

```html
<!-- 共通アセット -->
<img src="/assets/characters/axolotl/axo_nomal.png" alt="ウーパー" />
<img src="/assets/items/unko.png" alt="うんこ" />
<img src="/assets/ores/iron_ore.png" alt="鉄鉱石" />
<img src="/assets/money/coin_32.png" alt="硬貨" />
<img src="/assets/icon/axolotl-shop.png" alt="ゲームアイコン" />

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
