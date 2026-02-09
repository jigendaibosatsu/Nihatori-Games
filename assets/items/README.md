# アイテムアセット

ゲーム全体で使用するその他のアイテム画像アセットを配置します。

## ファイル命名規則

`[item-name].png` または `[item-name]-[variant].png`

例：
- `unko.png` - うんこ
- `unko-real.png` - リアルなうんこ
- `poop.png` - うんこ（英語名）

## アイテムの種類

### うんこ関連
- **unko.png** - うんこ（基本）
- **unko-real.png** - リアルなうんこ
- **unko-*.png** - その他のうんこバリエーション

### その他のアイテム
必要に応じて追加してください。

## 使用方法

```javascript
// 直接パス指定
var unkoPath = '/assets/items/unko.png';

// ヘルパー関数（asset-helper.jsに追加予定）
var unkoPath = getItemImagePath('unko');
```

## 使用ゲーム

- **axolotl-shop** - うんこを水槽から取り除く機能
- **axolotl-cafe** - うんこ関連の機能
- **axolotl-idle** - うんこ関連の機能
