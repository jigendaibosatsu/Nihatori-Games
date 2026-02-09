# 武器アセット

ゲーム全体で使用する武器の画像アセットを配置します。

## ファイル命名規則

`[weapon-type]-[variant].png` または `[weapon-type].png`

例：
- `pickaxe.png` - 基本ツルハシ
- `pickaxe-rare.png` - レアツルハシ
- `pickaxe-thunder.png` - 雷鳴のツルハシ
- `sword.png` - 剣
- `sword-iron.png` - 鉄の剣
- `axe.png` - 斧

## 武器の種類

### ツルハシ
- **pickaxe** - 基本ツルハシ
- **pickaxe-rare** - レアツルハシ
- **pickaxe-epic** - エピックツルハシ
- **pickaxe-legendary** - レジェンダリーツルハシ
- **pickaxe-thunder** - 雷鳴のツルハシ
- **pickaxe-ice** - 氷結のツルハシ
- **pickaxe-flame** - 炎獄のツルハシ
- **pickaxe-mythic** - 神話のツルハシ

### 剣
- **sword** - 基本の剣
- **sword-iron** - 鉄の剣
- **sword-silver** - 銀の剣
- **sword-gold** - 金の剣

### その他の武器
- **axe** - 斧
- **hammer** - ハンマー
- **dagger** - 短剣
- **spear** - 槍

## 使用方法

```javascript
// 直接パス指定
var weaponPath = '/assets/weapons/pickaxe.png';
var rareWeaponPath = '/assets/weapons/pickaxe-thunder.png';

// ヘルパー関数（asset-helper.jsに追加予定）
var weaponPath = getWeaponImagePath('pickaxe');
var rareWeaponPath = getWeaponImagePath('pickaxe', 'thunder');
```
