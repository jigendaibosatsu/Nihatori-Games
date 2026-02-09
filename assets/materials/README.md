# 素材アセット

ゲーム全体で使用する粘土・石などの素材画像アセットを配置します。

## ファイル命名規則

`[material-type]-[variant].png` または `[material-type].png`

例：
- `clay.png` - 粘土
- `stone.png` - 石
- `stone-rough.png` - 粗い石
- `stone-smooth.png` - 滑らかな石
- `wood.png` - 木材
- `iron-ore.png` - 鉄鉱石（未精製）

## 素材の種類

### 基本素材
- **clay** - 粘土
- **stone** - 石
- **wood** - 木材
- **sand** - 砂
- **dirt** - 土

### 加工素材
- **stone-rough** - 粗い石
- **stone-smooth** - 滑らかな石
- **stone-polished** - 磨かれた石
- **clay-wet** - 湿った粘土
- **clay-dry** - 乾いた粘土

### 鉱物（未精製）
- **iron-ore** - 鉄鉱石
- **copper-ore** - 銅鉱石
- **coal** - 石炭

## 使用方法

```javascript
// 直接パス指定
var materialPath = '/assets/materials/clay.png';

// ヘルパー関数（asset-helper.jsに追加予定）
var materialPath = getMaterialImagePath('clay');
```
