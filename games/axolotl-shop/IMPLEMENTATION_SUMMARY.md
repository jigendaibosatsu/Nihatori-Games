# ウーパールーパーゲーム仕様変更実装サマリー

## 変更したファイル一覧

1. `games/axolotl-shop/axolotl-shop.js` - メインロジックファイル
2. `games/axolotl-shop/index.html` - UI構造ファイル

## 追加/変更した定数一覧

### うんこ未処理ペナルティ関連
- `POOP_PENALTY_PER_MONTH = 15` - うんこ未処理時の水質低下量（月次）

### 血統導入関連
- `LINEAGE_INTRODUCTION_FEE = 10000` - 血統導入の手数料（¥）
- `LINEAGE_INTRODUCTION_REDUCTION = 20` - 血統導入による近親度減少量

### 固定化報酬関連
- `rarityMultiplierMap` - レア度別の固定化報酬係数マップ
  - common: 10
  - uncommon: 12
  - rare: 15
  - superRare: 20
  - ultraRare: 25
- `typeRarityMap` - 種類別レア度マップ
  - nomal, albino, marble: common
  - gold, black, yellow: uncommon
  - copper, superblack: rare
  - goldblackeye: superRare
  - chimera, dalmatian: ultraRare

### 水替え選択肢関連
- `WATER_CHANGE_PARTIAL_COST = 300` - 部分水替えのコスト（¥）
- `WATER_CHANGE_PARTIAL_BONUS = 15` - 部分水替えの水質改善量
- `WATER_CHANGE_FULL_COST = 800` - 全換水のコスト（¥）
- `WATER_CHANGE_FULL_BONUS = 30` - 全換水の水質改善量

### 自動設備関連
- `EQUIPMENT_AUTO_FEEDER_COST = 50000` - 自動給餌器の購入価格（¥）
- `EQUIPMENT_FILTER_COST = 30000` - フィルタの購入価格（¥）
- `EQUIPMENT_BOTTOM_CLEANER_COST = 40000` - 底面掃除機の購入価格（¥）
- `AUTO_FEEDER_HUNGER_THRESHOLD = 50` - 自動給餌器の給餌閾値（空腹度）
- `AUTO_FEEDER_COST_PER_FEED = 1000` - 自動給餌器の1匹あたり給餌コスト（¥）

## 更新した関数一覧

### 既存関数の修正
1. **`endOfMonthDrift()`** - うんこペナルティ変更、病気確率段階式化、isFixedLineage使用、自動設備効果適用
2. **`calcPrice()`** - 評判補正の変更（0.85-1.20範囲）
3. **`checkForFixation()`** - 固定化報酬計算の変更（種類基本価格×レア度係数）、isFixedLineage設定
4. **`pickOffspringType()`** - キメラ別抽選の実装
5. **`createAxolotl()`** - isFixedLineageフィールド追加、濃いめ遺伝強化
6. **`doCleanTank()`** - 水替え選択モーダル呼び出しに変更
7. **`actClean()`** - 水替え選択モーダル呼び出しに変更
8. **`doBuy()`** - ショップ購入個体にisFixedLineage=true設定
9. **`nextMonth()`** - 自動設備効果適用の呼び出し追加
10. **`resetGame()`** - equipment初期化追加

### 新規関数追加
1. **`openHatchSelectionModal(tankIdx, candidates, remainingJuveniles)`** - 孵化選択モーダル表示
2. **`selectHatchCandidate(tankIdx, candidateIndex, candidates, remainingJuveniles)`** - 孵化候補選択処理
3. **`openLineageIntroductionOverlay(parent1Idx, parent2Idx)`** - 血統導入モーダル表示
4. **`applyLineageIntroduction(parent1Idx, parent2Idx, donorType, donorPrice)`** - 血統導入実行
5. **`openWaterChangeSelectionModal(tankIdx, isGlobal)`** - 水替え選択モーダル表示
6. **`applyWaterChange(tankIdx, isGlobal, cost, bonus)`** - 水替え実行
7. **`applyAutoEquipment()`** - 自動設備効果適用
8. **`buyEquipment(equipmentType, cost)`** - 自動設備購入
9. **`migrateAxolotlData(ax)`** - 既存個体データのマイグレーション

## 新ロジック説明

### 1. うんこ未処理ペナルティ変更
**変更前**: 水質-30/月  
**変更後**: 水質-15/月（`POOP_PENALTY_PER_MONTH`使用）  
**補足**: 底面掃除機がある場合は半減（7.5/月）

### 2. 孵化UI/ロジック変更
**処理フロー**:
1. 孵化数を計算（既存ロジック維持）
2. 全幼生を内部的に生成
3. その中からランダムに3匹を選択
4. `openHatchSelectionModal()`で3匹を表示
5. プレイヤーが1匹選択
6. 選択した1匹を保持、残り2匹を自動売却（`calcPrice()`で価格計算）
7. ログ表示

### 3. 血統導入機能
**処理ロジック**:
- 繁殖ペア選択画面に「血統導入」ボタン表示
- クリックで外部購入可能な個体リストを表示
- 選択した導入個体の価格 + 手数料¥10,000を支払い
- 近親度を-20（下限0）
- 導入個体は消費（在庫から削除）
- 注意: 現在の実装では近親度は動的に計算されるため、次回の繁殖時に反映

### 4. 固定化報酬変更
**計算式**:
```
rarity = typeRarityMap[ax.type] || 'common'
multiplier = rarityMultiplierMap[rarity] || 10
reward = Math.ceil((typePriceBase[ax.type] * multiplier) / 1000) * 1000
```
**例**: ゴールド黒目（基本価格35,000円、superRare）の場合
- reward = Math.ceil((35000 * 20) / 1000) * 1000 = 700,000円

### 5. 評判補正の変更
**変更前**: `repFactor = 0.7 + reputation / 150`  
**変更後**: `repFactor = clamp(0.85 + reputation / 300, 0.85, 1.20)`  
**効果**: 評判0で0.85倍、評判100で1.20倍（以前は0.7倍～1.37倍）

### 6. isFixedLineageフラグ
**用途**: 「固定化前は弱い」判定を種類名ではなく個体フラグで管理  
**設定タイミング**:
- 繁殖個体: デフォルトfalse、固定化成功時にtrue
- ショップ購入個体: true（固定化済み種のみ買えるため）
- 既存個体: マイグレーションでfalseに設定

### 7. キメラ別抽選
**処理ロジック**:
```
if (parent1Type !== parent2Type) {
  baseChance = 0.003  // 0.3%
  relationBonus = relationshipMeter >= 50 ? ((relationshipMeter - 50) / 50) * 0.007 : 0  // 0%～0.7%
  chimeraChance = baseChance + relationBonus
  if (Math.random() < chimeraChance) {
    return { type: 'chimera', chimeraTypes: [parent1Type, parent2Type] }
  }
}
// 当選しなかった場合は通常の重み抽選へ
```

### 8. 濃いめ遺伝の強化
**処理ロジック**:
```
if (parent1.shade === 'dark' || parent2.shade === 'dark') {
  darkParentCount = (parent1.shade === 'dark' ? 1 : 0) + (parent2.shade === 'dark' ? 1 : 0)
  darkChance = 0.25 + (darkParentCount * 0.20)  // 25% + 20% or 40%
  if (Math.random() < darkChance) {
    shade = 'dark'
  }
}
```

### 9. 病気確率を段階式に変更
**処理ロジック（疑似コード）**:
```
W = tankClean  // 水質
H = ax.hunger  // 空腹度

baseChance = 0
if (W >= 70 && H >= 70) baseChance = 0.01      // 1% - 良好
else if (W >= 50 && H >= 50) baseChance = 0.03  // 3% - 普通
else if (W < 50 || H < 50) baseChance = 0.08    // 8% - 悪化
if (W < 35 || H < 35) baseChance = 0.15         // 15% - 危険

sickChance = baseChance

// 近親交配度補正（既存）
if (inbreedingCoeff > 50) {
  sickChance *= (1 + inbreedingCoeff / 100)  // 最大2倍
}

// 種類別補正（isFixedLineage使用）
if (ax.type === 'marble') sickChance *= 0.6
else if (ax.type === 'gold' || ax.type === 'albino') sickChance *= 1.4
else if (ax.type === 'yellow' && !isFixedLineage) sickChance *= 1.6
else if (ax.type === 'goldblackeye' || ax.type === 'chimera' || ax.type === 'copper' || ax.type === 'dalmatian') {
  if (!isFixedLineage) sickChance *= 2.0
  else sickChance *= 1.3  // 固定化後は緩和
}

sickChance = clamp(sickChance, 0, 0.50)  // 最終確率を0-50%にclamp
```

### 10. 水替え選択肢追加
**選択肢**:
- 部分水替え: +15 / ¥300
- 通常水替え: +25 / ¥500（既存）
- 全換水: +30 / ¥800

### 11. 自動化設備
**自動給餌器**:
- 毎月開始時に空腹度50未満の個体に自動給餌（人工餌効果）
- コスト: ¥1,000/個体

**フィルタ**:
- 毎月全水槽の水質+2

**底面掃除機**:
- `POOP_PENALTY_PER_MONTH`を半減（15 → 7.5）

## 主要な手動テスト手順

### 1. うんこ未処理ペナルティ変更
- [ ] うんこを放置して月を進める
- [ ] 水質が-15/月減少することを確認
- [ ] 底面掃除機購入後、-7.5/月に半減することを確認

### 2. 孵化UI/ロジック変更
- [ ] 繁殖ペアで産卵を成功させる
- [ ] 孵化時に3匹の候補が表示されることを確認
- [ ] 1匹を選択して残りが自動売却されることを確認
- [ ] 売却価格が正しく計算されることを確認

### 3. 血統導入機能
- [ ] 繁殖ペア選択画面に「血統導入」ボタンが表示されることを確認
- [ ] ボタンクリックで外部購入個体リストが表示されることを確認
- [ ] 個体選択で近親度が-20減少することを確認（次回繁殖時に反映）
- [ ] 導入個体が消費されることを確認
- [ ] 費用（個体価格+¥10,000）が正しく支払われることを確認

### 4. 固定化報酬変更
- [ ] 固定化条件を満たす個体を繁殖させる
- [ ] 固定化報酬が「種類基本価格×レア度係数」で計算されることを確認
- [ ] 報酬が1000円単位で切り上げられることを確認
- [ ] レア度別に報酬が異なることを確認

### 5. 評判補正の変更
- [ ] 評判0の状態で個体を売却
- [ ] 価格が0.85倍補正されることを確認
- [ ] 評判100の状態で個体を売却
- [ ] 価格が1.20倍補正されることを確認

### 6. isFixedLineageフラグ
- [ ] 繁殖個体がデフォルトでisFixedLineage=falseであることを確認
- [ ] 固定化成功時にisFixedLineage=trueになることを確認
- [ ] ショップ購入個体がisFixedLineage=trueであることを確認
- [ ] 固定化前のレア種が弱いことを確認
- [ ] 固定化後のレア種が緩和されることを確認

### 7. キメラ別抽選
- [ ] 異なる種類同士で繁殖
- [ ] キメラが別抽選で判定されることを確認（0.3%+関係値ボーナス）
- [ ] 関係値100でキメラ確率が1.0%になることを確認
- [ ] 同じ種類同士ではキメラ抽選が行われないことを確認

### 8. 濃いめ遺伝の強化
- [ ] 濃いめの親同士で繁殖
- [ ] 子が濃いめになる確率が+40%になることを確認
- [ ] 濃いめの親1匹で繁殖
- [ ] 子が濃いめになる確率が+20%になることを確認

### 9. 病気確率を段階式に変更
- [ ] 水質70以上・空腹度70以上の状態で月を進める
- [ ] 病気確率が1%であることを確認
- [ ] 水質50未満または空腹度50未満の状態で月を進める
- [ ] 病気確率が8%であることを確認
- [ ] 水質35未満または空腹度35未満の状態で月を進める
- [ ] 病気確率が15%であることを確認

### 10. 水替え選択肢追加
- [ ] 全体水替えボタンをクリック
- [ ] 3つの選択肢（部分/通常/全換水）が表示されることを確認
- [ ] 各選択肢で正しいコストと水質改善量が適用されることを確認
- [ ] 個別水槽の水替えボタンでも同様に選択肢が表示されることを確認

### 11. 自動化設備
- [ ] ショップの「設備」タブを開く
- [ ] 自動給餌器、フィルタ、底面掃除機の購入ボタンが表示されることを確認
- [ ] 自動給餌器を購入
- [ ] 空腹度50未満の個体に自動給餌されることを確認（コスト¥1,000/個体）
- [ ] フィルタを購入
- [ ] 毎月全水槽の水質+2されることを確認
- [ ] 底面掃除機を購入
- [ ] うんこ未処理ペナルティが半減することを確認

### 12. マイグレーション処理
- [ ] 既存のセーブデータを読み込む
- [ ] 既存個体にisFixedLineageがfalseとして設定されることを確認
- [ ] state.equipmentが初期化されることを確認
- [ ] ゲームが正常に動作することを確認

## 注意事項

1. **血統導入の近親度減少**: 現在の実装では近親度は動的に計算されるため、血統導入による減少は次回の繁殖時に反映されます。ログには現在値と減少後の値が表示されます。

2. **孵化選択モーダル**: 3匹未満の孵化数の場合、候補数は実際の孵化数に合わせて調整されます。

3. **自動設備の効果**: 自動給餌器は毎月開始時（`nextMonth()`の最初）に適用されます。フィルタと底面掃除機は`endOfMonthDrift()`内で適用されます。

4. **isFixedLineageのマイグレーション**: 既存個体は`endOfMonthDrift()`内で自動的にマイグレーションされます。`undefined`の場合は`false`として扱われます。

5. **水替え選択モーダル**: 全体水替えと個別水替えで同じモーダルを使用しますが、`isGlobal`フラグで動作が分岐します。
