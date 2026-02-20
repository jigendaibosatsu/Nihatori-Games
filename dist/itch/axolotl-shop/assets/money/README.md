# 通貨アセット

ゲーム全体で使用する硬貨・お札の画像アセットを配置します。

## ファイル命名規則

### 硬貨
`coin-[type].png` または `[type]_coins.png`

例：
- `coin_32.png` - 汎用硬貨（32px）
- `gold_coins128.png` - 金貨（128px）
- `copper_coins.png` - 銅貨
- `sibver_coins.png` - 銀貨
- `stone_coins.png` - 石貨

### お札
`[value]yen.png` または `bill-[value].png`

例：
- `1yen.png` - 1円紙幣
- `10yen.png` - 10円紙幣
- `100yen.png` - 100円紙幣
- `500yen.png` - 500円紙幣
- `1000yen.png` - 1000円紙幣
- `2000yen.png` - 2000円紙幣
- `5000yen.png` - 5000円紙幣
- `10000yen.png` - 10000円紙幣

## 通貨の種類

### 硬貨
- **coin_32.png** - 汎用硬貨（32px）
- **gold_coins128.png** - 金貨（128px）
- **copper_coins.png** - 銅貨
- **sibver_coins.png** - 銀貨（silverのタイポ）
- **stone_coins.png** - 石貨

### お札（日本円ベース）
- **1yen.png** - 1円紙幣
- **10yen.png** - 10円紙幣
- **100yen.png** - 100円紙幣
- **500yen.png** - 500円紙幣
- **1000yen.png** - 1000円紙幣
- **2000yen.png** - 2000円紙幣
- **5000yen.png** - 5000円紙幣
- **10000yen.png** - 10000円紙幣

## 使用方法

```javascript
// 直接パス指定
var coinPath = '/assets/money/coin_32.png';
var billPath = '/assets/money/1000yen.png';

// ヘルパー関数（asset-helper.jsに追加予定）
var coinPath = getCoinImagePath('gold');
var billPath = getBillImagePath(1000);
```

## 注意事項

- `bills.psd` はPhotoshopのソースファイルです
- ゲーム内では実際の通貨名（Gold、Silverなど）に合わせて使用してください
