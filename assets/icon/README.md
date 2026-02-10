# アイコンアセット

ゲーム全体で使用するアイコン画像を配置します。

## ファイル命名規則

`[game-name].png`

例：
- `axolotl-shop.png` - ウーパールーパーショップのアイコン
- `mine-tap.png` - 穴掘りタップゲーのアイコン
- `kassen.png` - 合戦ゲームのアイコン
- `shachikuverse.png` - シャチクバースのアイコン

## アイコンの種類

### ゲームアイコン
- **axolotl-shop.png** - ウーパールーパーショップ
- **axolotl-cafe.png** - ウーパールーパーカフェ
- **mine-tap.png** - 穴掘りタップゲー
- **stack-blocks.png** - ブロック積み上げ
- **kassen.png** - 合戦ゲーム
- **shachikuverse.png** - シャチクバース

## 使用方法

```javascript
// 直接パス指定
var iconPath = '/assets/icon/axolotl-shop.png';
var gameIconPath = '/assets/icon/mine-tap.png';

// ヘルパー関数（asset-helper.jsに追加予定）
var iconPath = getIconPath('axolotl-shop');
```

### HTMLから使用

```html
<!-- ゲームアイコン -->
<img src="/assets/icon/axolotl-shop.png" alt="ウーパールーパーショップ" />

<!-- サイト共通 Favicon・ヘッダーロゴ -->
<link rel="icon" href="/assets/icon/nihatori_icon.png" type="image/png" media="(prefers-color-scheme: light)" />
<link rel="icon" href="/assets/icon/nihatori_icon.png" type="image/png" media="(prefers-color-scheme: dark)" />
```

- **nihatori_icon.png** がサイト全体のファビコンおよびホーム（ヘッダー）のロゴとして使われます。

## 注意事項

- ゲーム固有のアイコンはこのフォルダに配置
- ロゴ（`logo.png`）はルートの`assets/`に配置（特別扱い）
- アイコンは通常、正方形またはそれに近い形状を推奨
