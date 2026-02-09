# キャラクターアセット

ゲーム全体で使用するすべてのキャラクター画像アセットを配置します。

## ディレクトリ構造

```
characters/
├── axolotl/          # ウーパー（axolotl）画像
│   ├── axo_nomal.png
│   ├── axo_albino.png
│   └── ...
├── black_fullbody_upa.png
├── boon_128.png
├── boon2.png
├── boon3.png
├── ork_128.png
├── phenix_32.png
├── shiba.png
├── slime.png
└── [その他のキャラクター]
```

## ファイル命名規則

`[character-name]-[variant].png` または `[character-name].png`

例：
- `axolotl/axo_nomal.png` - ウーパー（リューシ）
- `slime.png` - スライム
- `shiba.png` - 柴犬
- `boon_128.png` - ブーン（128px）

## キャラクターの種類

### ウーパー（axolotl）
`axolotl/` フォルダ内に配置されています。

- **axo_nomal.png** - リューシ（基本タイプ）
- **axo_albino.png** - アルビノ
- **axo_gold.png** - ゴールド
- **axo_marble.png** - マーブル
- **axo_black.png** - ブラック
- **axo_copper.png** - コッパー
- **axo_superblack.png** - スーパーブラック
- **axo_yellow.png** - イエロー
- **axo_dalmatian.png** - ダルメシアン
- **axo_chimera.png** - キメラ

### その他のキャラクター
- **slime.png** - スライム
- **shiba.png** - 柴犬
- **boon_*.png** - ブーン（複数バリエーション）
- **ork_128.png** - オーク
- **phenix_32.png** - フェニックス
- **black_fullbody_upa.png** - フルボディウーパー

## 使用方法

### ウーパー画像

```javascript
// 直接パス指定
var axolotlPath = '/assets/characters/axolotl/axo_nomal.png';

// ヘルパー関数（asset-helper.jsに追加予定）
var axolotlPath = getAxolotlImagePath('nomal');
```

### その他のキャラクター

```javascript
// 直接パス指定
var charPath = '/assets/characters/slime.png';
var shibaPath = '/assets/characters/shiba.png';

// ヘルパー関数（asset-helper.jsに追加予定）
var charPath = getCharacterImagePath('slime');
```
