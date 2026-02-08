# 共通アセット一覧

## ウーパー画像 (`/assets/axolotl/`)

| ファイル名 | タイプ | 説明 |
|-----------|--------|------|
| `axo_nomal.png` | リューシ | 基本タイプ |
| `axo_albino.png` | アルビノ | 白いウーパー |
| `axo_gold.png` | ゴールド | 金色のウーパー |
| `axo_marble.png` | マーブル | マーブル模様 |
| `axo_black.png` | ブラック | 黒いウーパー |
| `axo_copper.png` | コッパー | 銅色のウーパー |
| `axo_superblack.png` | スーパーブラック | 濃い黒 |
| `axo_yellow.png` | イエロー | 黄色のウーパー |
| `axo_dalmatian.png` | ダルメシアン | 斑点模様 |
| `axo_kimera-*.png` | キメラ | 合成タイプ（複数ファイル） |
| `axo_gold_blackEye-*.png` | ゴールド黒目 | ゴールドの変種 |
| `axo_icon-*.png` | アイコン | アイコン用 |

## その他の共通アセット

| ファイル名 | 説明 | 使用ゲーム |
|-----------|------|-----------|
| `unko.png` | うんこ画像 | axolotl-shop, axolotl-cafe, axolotl-idle |
| `logo.png` | サイトロゴ | 全ゲーム |
| `axolotl-shop-icon.png` | ゲームアイコン | トップページ |

## 使用方法

### JavaScript

```javascript
// 直接パス指定
var path = '/assets/axolotl/axo_nomal.png';
var unkoPath = '/assets/unko.png';

// ヘルパー関数を使用（asset-helper.js読み込み後）
var path = getAxolotlImagePath('nomal');
var unkoPath = getUnkoImagePath();
```

### HTML

```html
<img src="/assets/axolotl/axo_nomal.png" alt="ウーパー" />
<img src="/assets/unko.png" alt="うんこ" />
```

## 追加方法

新しい共通アセットを追加する場合：

1. `/assets/` にファイルを配置
2. このファイルに追加内容を記載
3. 必要に応じて `asset-helper.js` にヘルパー関数を追加
