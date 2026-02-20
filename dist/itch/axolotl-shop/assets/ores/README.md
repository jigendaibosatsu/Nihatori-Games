# 鉱石・宝石アセット

ゲーム全体で使用する鉱石・宝石・粘土・石の画像アセットを配置します。

## ファイル命名規則

`[type]-[variant].png` または `[type].png`

例：
- `iron_ore.png` - 鉄鉱石
- `gold_ingot.png` - 金インゴット
- `ruby.png` - ルビー
- `red_clay.png` - 赤い粘土

## 鉱石の種類

### 鉱石（未精製）
- **iron_ore.png** - 鉄鉱石
- **copper_ore.png** - 銅鉱石
- **silver_ore.png** - 銀鉱石
- **gold_ore.png** - 金鉱石
- **platinum_ore.png** - プラチナ鉱石
- **cristal_blue.png** - クリスタル

### 精製済み鉱物（インゴット）
- **iron_ingot.png** - 鉄インゴット
- **copper_ingot.png** - 銅インゴット
- **silver_ingot.png** - 銀インゴット
- **gold_ingot.png** - 金インゴット
- **platinum_ingot.png** - プラチナインゴット

## 宝石の種類

- **ruby.png** - ルビー
- **sapphire.png** - サファイア
- **emerald.png** - エメラルド
- **diamond.png** - ダイヤモンド
- **amethyst.png** - アメジスト（amegist.png）
- **topaz.png** - トパーズ
- **alexandrite.png** - アレキサンドライト
- **quartz.png** - クォーツ
- **obsidian.png** - オブシディアン

## 粘土・石の種類

### 粘土
- **red_clay.png** / **red_cray.png** - 赤い粘土
- **black_clay.png** / **black_cray.png** - 黒い粘土
- **white_clay.png** / **white_cray.png** - 白い粘土
- **red_round_cray.png** - 丸い赤い粘土
- **black_round_cray.png** - 丸い黒い粘土
- **white_round_cray.png** - 丸い白い粘土
- **nend32.png** - 粘土（32px）

### 粘土鉱床
- **red_clay_deposit.png** - 赤い粘土鉱床
- **black_clay_deposit.png** - 黒い粘土鉱床
- **white_clay_deposit.png** - 白い粘土鉱床

### 石
- **rock.png** - 石

## 使用方法

```javascript
// 直接パス指定
var orePath = '/assets/ores/iron_ore.png';
var gemPath = '/assets/ores/ruby.png';
var clayPath = '/assets/ores/red_clay.png';

// ヘルパー関数（asset-helper.jsに追加予定）
var orePath = getOreImagePath('iron_ore');
var gemPath = getGemImagePath('ruby');
var clayPath = getMaterialImagePath('red_clay');
```

## 注意事項

- `ores.psd`, `juels.psd`, `crays.psd` はPhotoshopのソースファイルです
- ゲーム内では実際のアイテム名に合わせて使用してください
