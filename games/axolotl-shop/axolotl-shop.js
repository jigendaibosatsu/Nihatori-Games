(function () {
  'use strict';

  var MAX_CLEAN = 100;
  var MAX_FOOD = 100;
  var MAX_REP = 100;
  var MAX_HEALTH = 100;
  var TARGET_MONEY = 200000;
  var MAX_TANKS = 15;
  var WATER_CHANGE_COST = 1000;

  var AXO_TYPES = ['nomal', 'albino', 'gold', 'marble', 'copper', 'black', 'superblack', 'goldblackeye', 'chimera', 'yellow', 'dalmatian'];
  var typeLabels = {
    nomal: 'リューシ',
    albino: 'アルビノ',
    gold: 'ゴールド',
    marble: 'マーブル',
    copper: '銅',
    black: 'ブラック',
    superblack: 'スーパーブラック',
    goldblackeye: 'ゴールド黒目',
    chimera: 'キメラ',
    yellow: 'イエロー',
    dalmatian: 'ダルメシアン'
  };
  var typePriceBase = {
    nomal: 8000,
    albino: 4000,  // 一番安い
    gold: 25000,   // 一番高い
    marble: 12000,
    copper: 15000,
    black: 18000,
    superblack: 30000,
    goldblackeye: 35000,
    chimera: 50000,
    yellow: 28000,
    dalmatian: 60000  // 激レア
  };
  var MAX_HUNGER = 100;
  var SICK_PRICE_RATE = 0.2;
  var TREATMENT_COST = 5000;
  var TREATMENT_RECOVER_CHANCE = 0.35;
  var SICK_CHANCE_PER_DAY = 0.04;
  var SICK_INJURY_CHANCE = 0.03;
  var SICK_DEATH_CHANCE = 0.02;
  var SICK_CHANCE_PER_MONTH = 0.12;
  var HUNGER_DECAY_PER_MONTH = 15;
  var FEED_ARTIFICIAL_COST = 1500;
  var FEED_BLOODWORM_COST = 500;
  var FEED_BLOODWORM_DIRT = 12;
  var FEED_BLOODWORM_HEALTH = 8;
  var FEED_BLOODWORM_HUNGER = 25;
  var FEED_EARTHWORM_COST = 2500;
  var FEED_EARTHWORM_DIRT = 6;
  var FEED_EARTHWORM_HEALTH = 12;
  var FEED_EARTHWORM_HUNGER = 30;
  var FEED_ARTIFICIAL_DIRT = 3;
  var FEED_ARTIFICIAL_HEALTH = 5;
  var FEED_ARTIFICIAL_HUNGER = 20;
  
  // うんこ未処理ペナルティ
  var POOP_PENALTY_PER_MONTH = 15;
  
  // 血統導入関連定数
  var LINEAGE_INTRODUCTION_FEE = 10000;
  var LINEAGE_INTRODUCTION_REDUCTION = 20;
  
  // 固定化報酬レア度マップ
  var rarityMultiplierMap = {
    common: 10,
    uncommon: 12,
    rare: 15,
    superRare: 20,
    ultraRare: 25
  };
  var typeRarityMap = {
    nomal: 'common',
    albino: 'common',
    gold: 'uncommon',
    marble: 'common',
    copper: 'rare',
    black: 'uncommon',
    superblack: 'rare',
    goldblackeye: 'superRare',
    chimera: 'ultraRare',
    yellow: 'uncommon',
    dalmatian: 'ultraRare'
  };
  
  // 水替え選択肢関連定数
  var WATER_CHANGE_PARTIAL_COST = 300;
  var WATER_CHANGE_PARTIAL_BONUS = 15;
  var WATER_CHANGE_FULL_COST = 800;
  var WATER_CHANGE_FULL_BONUS = 30;
  
  // 自動設備関連定数
  var EQUIPMENT_AUTO_FEEDER_COST = 50000;
  var EQUIPMENT_FILTER_COST = 30000;
  var EQUIPMENT_BOTTOM_CLEANER_COST = 40000;
  var AUTO_FEEDER_HUNGER_THRESHOLD = 50;
  var AUTO_FEEDER_COST_PER_FEED = 1000;
  
  function typeImagePath(t) {
    if (t === 'goldblackeye') return '/assets/axolotl/axo_gold.png';
    if (t === 'yellow') return '/assets/axolotl/axo_gold.png'; // イエローはゴールドの画像を使用
    if (t === 'superblack') return '/assets/axolotl/axo_superblack.png'; // スーパーブラック専用画像
    if (t === 'dalmatian') return '/assets/axolotl/axo_dalmatian.png'; // ダルメシアン専用画像
    return '/assets/axolotl/axo_' + t + '.png';
  }

  // 画像を動的に生成（Canvas APIを使用）
  var imageCache = {};
  function generateAxolotlImage(ax) {
    // スーパーブラックの場合は色味の変更がないため、タイプのみでキャッシュキーを作成
    var cacheKey = ax.type === 'superblack' 
      ? ax.type 
      : ax.id + '_' + ax.type + '_' + (ax.brightness || 1) + '_' + (ax.saturation || 1) + '_' + (ax.spots ? '1' : '0');
    if (imageCache[cacheKey]) {
      return imageCache[cacheKey];
    }
    
    // キメラの場合は特別な処理
    if (ax.type === 'chimera' && ax.chimeraTypes) {
      var canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      var ctx = canvas.getContext('2d');
      
      // 左半分と右半分を描画
      var img1 = new Image();
      var img2 = new Image();
      var loaded = 0;
      var drawChimera = function() {
        if (loaded < 2) return;
        ctx.drawImage(img1, 0, 0, 20, 40, 0, 0, 20, 40);
        ctx.drawImage(img2, 0, 0, 20, 40, 20, 0, 20, 40);
        imageCache[cacheKey] = canvas.toDataURL();
      };
      img1.onload = function() { loaded++; drawChimera(); };
      img2.onload = function() { loaded++; drawChimera(); };
      img1.src = typeImagePath(ax.chimeraTypes[0]);
      img2.src = typeImagePath(ax.chimeraTypes[1]);
      
      return typeImagePath(ax.chimeraTypes[0]); // 一時的に返す
    }
    
    // 通常の個体差適用
    var img = new Image();
    img.src = typeImagePath(ax.type);
    var canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    var ctx = canvas.getContext('2d');
    
    img.onload = function() {
      ctx.drawImage(img, 0, 0, 40, 40);
      
      // スーパーブラックの場合は画像をそのまま使用（色味の変更なし、固定）
      if (ax.type === 'superblack') {
        // 画像をそのまま使用し、色味の変更は行わない
        imageCache[cacheKey] = canvas.toDataURL();
        return;
      }
      
      // brightnessとsaturationを適用
      var imageData = ctx.getImageData(0, 0, 40, 40);
      var data = imageData.data;
      var brightness = ax.brightness || 1;
      var saturation = ax.saturation || 1;
      
      for (var i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // alpha == 0はスキップ
        
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        
        // brightness適用
        r = Math.min(255, r * brightness);
        g = Math.min(255, g * brightness);
        b = Math.min(255, b * brightness);
        
        // saturation適用
        var gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;
        
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // spotsを追加（marbleのみ）
      if (ax.spots && ax.type === 'marble') {
        var spotsCtx = ctx;
        var density = ax.spotsDensity || 0.1;
        for (var y = 10; y < 30; y++) {
          for (var x = 5; x < 35; x++) {
            // 目の周辺は避ける
            if (x >= 12 && x <= 28 && y >= 12 && y <= 20) continue;
            if (Math.random() < density) {
              spotsCtx.fillStyle = 'rgba(0,0,0,' + (0.3 + Math.random() * 0.4) + ')';
              spotsCtx.fillRect(x, y, 2, 2);
            }
          }
        }
      }
      
      imageCache[cacheKey] = canvas.toDataURL();
    };
    
    return typeImagePath(ax.type); // 一時的に返す
  }

  // ショップで購入可能な種類（品切れの可能性あり）
  var AXO_TYPES_BUY = ['nomal', 'albino', 'gold', 'marble', 'black', 'yellow'];
  
  // ショップの在庫状態（true: 在庫あり、false: 品切れ）
  var shopStock = {
    nomal: true,
    albino: true,
    gold: true,
    marble: true,
    black: true,
    yellow: true
  };

  // 交配確率テーブル: breedingTable[親1タイプ][親2タイプ] = { 子タイプ: 重み, ... }
  // 遺伝子ベースの繁殖システム
  var breedingTable = (function () {
    var types = AXO_TYPES;
    var table = {};
    types.forEach(function (k) { table[k] = {}; });
    types.forEach(function (t1) {
      types.forEach(function (t2) {
        if (table[t1][t2]) return;
        var weights = {};
        types.forEach(function (k) {
          var w = 0;
          
          // 基本確率（同じ種類同士は高確率）
          if (k === t1 && k === t2) {
            w = 60; // 同じ種類同士
          } else if (k === t1 || k === t2) {
            w = 35; // 親のどちらかと同じ
          } else {
            w = 8; // その他
          }
          
          // 特殊な繁殖ルール
          // ブラック: マーブルの濃いめから生まれる可能性
          if (k === 'black') {
            if (t1 === 'marble' || t2 === 'marble') {
              w = 15; // マーブルから生まれる可能性
            }
          }
          
          // アルビノ: リューシの薄めから生まれる可能性
          if (k === 'albino') {
            if (t1 === 'nomal' || t2 === 'nomal') {
              w = 20; // リューシから生まれる可能性
            }
          }
          
          // ゴールド: アルビノから生まれる可能性
          if (k === 'gold') {
            if (t1 === 'albino' || t2 === 'albino') {
              w = 25; // アルビノから生まれる可能性
            }
          }
          
          // コッパー: ブラックかマーブルから生まれる可能性
          if (k === 'copper') {
            if ((t1 === 'black' || t1 === 'marble') || (t2 === 'black' || t2 === 'marble')) {
              w = 3; // 低確率
            } else {
              w = 0;
            }
          }
          
          // ゴールド黒目: ゴールドとスーパーブラックの後輩で一番生まれやすい
          if (k === 'goldblackeye') {
            if ((t1 === 'gold' && t2 === 'superblack') || (t1 === 'superblack' && t2 === 'gold')) {
              w = 50; // ゴールドとスーパーブラックの後輩で一番生まれやすい
            } else if ((t1 === 'gold' && ['black', 'nomal', 'marble'].indexOf(t2) >= 0) ||
                (t2 === 'gold' && ['black', 'nomal', 'marble'].indexOf(t1) >= 0)) {
              w = 5; // 低確率
            } else {
              w = 0;
            }
          }
          
          // イエロー: ゴールドの濃いめから生まれる可能性
          if (k === 'yellow') {
            if (t1 === 'gold' || t2 === 'gold') {
              w = 12; // ゴールドから生まれる可能性
            }
          }
          
          // キメラ: 異なる種類同士から極めて低確率
          if (k === 'chimera') {
            if (t1 !== t2 && t1 !== 'chimera' && t2 !== 'chimera') {
              w = 1; // 極めて低確率
            } else {
              w = 0;
            }
          }
          
          // ダルメシアン: リューシとマーブルの間にのみ生まれる可能性（激レア）
          if (k === 'dalmatian') {
            if ((t1 === 'nomal' && t2 === 'marble') || (t1 === 'marble' && t2 === 'nomal')) {
              w = 2; // 非常に低確率（激レア）
            } else {
              w = 0;
            }
          }
          
          weights[k] = w;
        });
        table[t1][t2] = weights;
        table[t2][t1] = weights;
      });
    });
    return table;
  })();

  function pickOffspringType(parent1Type, parent2Type, parent1Id, parent2Id, relationshipMeter, parent1Shade, parent2Shade) {
    relationshipMeter = relationshipMeter || 50;
    parent1Shade = parent1Shade || 'normal';
    parent2Shade = parent2Shade || 'normal';
    
    // キメラの別抽選（異なる種類同士の場合のみ）
    if (parent1Type !== parent2Type) {
      var baseChance = 0.003; // 0.3%
      var relationBonus = relationshipMeter >= 50 ? ((relationshipMeter - 50) / 50) * 0.007 : 0; // 0%～0.7%
      var chimeraChance = baseChance + relationBonus;
      
      if (Math.random() < chimeraChance) {
        return { type: 'chimera', chimeraTypes: [parent1Type, parent2Type] };
      }
    }
    
    var inbreedingCoeff = calculateInbreedingCoefficient(parent1Id, parent2Id);
    
    var weights = breedingTable[parent1Type][parent2Type] || breedingTable[parent2Type][parent1Type];
    if (!weights) return { type: AXO_TYPES[0], inbreedingCoeff: inbreedingCoeff };
    
    // shade（色味）を考慮した繁殖
    // ブラック: マーブルの濃いめから生まれる可能性が高い
    if (parent1Type === 'marble' && parent1Shade === 'dark') {
      weights['black'] = (weights['black'] || 0) + 20;
    }
    if (parent2Type === 'marble' && parent2Shade === 'dark') {
      weights['black'] = (weights['black'] || 0) + 20;
    }
    
    // スーパーブラック: ブラックの濃いめから生まれる可能性
    if (parent1Type === 'black' && parent1Shade === 'dark') {
      weights['superblack'] = (weights['superblack'] || 0) + 15;
    }
    if (parent2Type === 'black' && parent2Shade === 'dark') {
      weights['superblack'] = (weights['superblack'] || 0) + 15;
    }
    
    // ゴールド黒目: ゴールドとスーパーブラックの後輩で一番生まれやすい
    if ((parent1Type === 'gold' && parent2Type === 'superblack') || 
        (parent1Type === 'superblack' && parent2Type === 'gold')) {
      weights['goldblackeye'] = (weights['goldblackeye'] || 0) + 50;
    }
    
    // アルビノ: リューシの薄めから生まれる可能性が高い
    if (parent1Type === 'nomal' && parent1Shade === 'light') {
      weights['albino'] = (weights['albino'] || 0) + 15;
    }
    if (parent2Type === 'nomal' && parent2Shade === 'light') {
      weights['albino'] = (weights['albino'] || 0) + 15;
    }
    
    // イエロー: ゴールドの濃いめから生まれる可能性が高い
    if (parent1Type === 'gold' && parent1Shade === 'dark') {
      weights['yellow'] = (weights['yellow'] || 0) + 18;
    }
    if (parent2Type === 'gold' && parent2Shade === 'dark') {
      weights['yellow'] = (weights['yellow'] || 0) + 18;
    }
    
    // ダルメシアン: リューシとマーブルの間にのみ生まれる可能性（激レア）
    // 関係値が高いほど生まれやすい
    if ((parent1Type === 'nomal' && parent2Type === 'marble') || 
        (parent1Type === 'marble' && parent2Type === 'nomal')) {
      var dalmatianBaseWeight = weights['dalmatian'] || 0;
      // 関係値が高いほど確率が上がる（50→2、80→5、100→8）
      var dalmatianBonus = relationshipMeter >= 100 ? 6 : 
                          relationshipMeter >= 80 ? 3 : 
                          relationshipMeter >= 60 ? 1 : 0;
      weights['dalmatian'] = dalmatianBaseWeight + dalmatianBonus;
    }
    
    // 近親交配度が高いと、親の形質が似やすい（85%→95%）
    var parentTraitChance = 0.85 + (inbreedingCoeff / 100) * 0.1;
    
    // 関係値が高いほどレアな個体が出やすい
    var rareBonus = (relationshipMeter - 50) / 100; // -0.5 から +0.5
    
    var total = 0;
    AXO_TYPES.forEach(function (k) {
      var w = weights[k] || 0;
      // レアな個体の確率を上げる（関係値が高い場合）
      if (relationshipMeter >= 70) {
        if (k === 'albino') w *= (1 + rareBonus * 0.5);
        if (k === 'gold') w *= (1 + rareBonus * 0.3);
        if (k === 'black') w *= (1 + rareBonus * 0.3);
        if (k === 'goldblackeye') w *= (1 + rareBonus * 0.5);
        if (k === 'yellow') w *= (1 + rareBonus * 0.3);
        if (k === 'dalmatian') w *= (1 + rareBonus * 0.8); // ダルメシアンは激レア
      }
      total += w;
    });
    
    var r = Math.random() * total;
    
    // 近親交配度が高い場合、親の形質を優先
    if (Math.random() < parentTraitChance) {
      var parentTypes = [parent1Type, parent2Type];
      return { type: parentTypes[Math.floor(Math.random() * parentTypes.length)], inbreedingCoeff: inbreedingCoeff };
    }
    
    // 関係値が高いほどレアな個体が出やすい
    var adjustedWeights = {};
    var adjustedTotal = 0;
    AXO_TYPES.forEach(function (k) {
      var w = weights[k] || 0;
      if (relationshipMeter >= 70) {
        if (k === 'albino') w *= (1 + rareBonus * 0.5);
        if (k === 'gold') w *= (1 + rareBonus * 0.3);
        if (k === 'black') w *= (1 + rareBonus * 0.3);
        if (k === 'goldblackeye') w *= (1 + rareBonus * 0.5);
        if (k === 'yellow') w *= (1 + rareBonus * 0.3);
        if (k === 'dalmatian') w *= (1 + rareBonus * 0.8); // ダルメシアンは激レア
      }
      adjustedWeights[k] = w;
      adjustedTotal += w;
    });
    
    var adjustedR = Math.random() * adjustedTotal;
    var currentTotal = 0;
    for (var i = 0; i < AXO_TYPES.length; i++) {
      var k = AXO_TYPES[i];
      currentTotal += adjustedWeights[k] || 0;
      if (adjustedR <= currentTotal) {
        return { type: k, inbreedingCoeff: inbreedingCoeff };
      }
    }
    
    return { type: AXO_TYPES[AXO_TYPES.length - 1], inbreedingCoeff: inbreedingCoeff };
  }

  var state = {
    month: 1,
    money: 50000,
    clean: 80,
    reputation: 30,
    tanks: [],
    ended: false,
    lastBreedParent1: null,
    lastBreedParent2: null,
    nextAxolotlId: 1,
    auctionAvailable: false,
    auctionType: null,
    auctionPrice: 0,
    fixedTypes: {},  // 固定化された種類 {type: true}
    obtainedTypes: {},  // 獲得した種類（図鑑用）
    achievements: {},  // 実績 {id: true}
    nameCounts: {},  // 種類ごとの名前カウント {type: count}
    shopName: 'ウーパールーパーショップ',  // ショップ名
    equipment: {  // 自動設備
      autoFeeder: false,
      filter: false,
      bottomCleaner: false
    },
    feedType: 'artificial',  // デフォルトの餌タイプ: 'artificial', 'bloodworm', 'earthworm'
    waterChangeType: 'normal'  // デフォルトの水替えタイプ: 'partial', 'normal', 'full'
  };
  
  // マイグレーション: feedTypeとwaterChangeTypeが無い場合は初期化
  if (state.feedType === undefined) {
    state.feedType = 'artificial';
  }
  if (state.waterChangeType === undefined) {
    state.waterChangeType = 'normal';
  }

  // 種類ごとの特徴説明
  var typeDescriptions = {
    nomal: '最も一般的な種類。丈夫で育てやすい。',
    albino: '白い体色が特徴。やや弱いが、価格が安い。',
    gold: '金色の美しい体色。やや弱いが、高価で人気。',
    marble: 'マーブル模様が特徴。最も丈夫で病気になりにくい。',
    copper: '銅色の体色。非常にレアで、固定化前は弱い。',
    black: '黒い体色が特徴。レアな種類。',
    superblack: '完全に真っ黒な体色。ブラックを濃いめで固定化すると生まれる。',
    goldblackeye: 'ゴールドの体色に黒い目。非常にレアで、固定化前は弱い。',
    chimera: '左右で異なる種類の特徴を持つ。極めてレアで、固定化前は弱い。',
    yellow: 'ゴールドの濃いめから生まれる種類。固定化可能。',
    dalmatian: '白い体色に黒い斑点が特徴の激レア個体。リューシとマーブルの間にのみ生まれる。'
  };

  // 実績定義
  var achievementDefinitions = [
    { id: 'first_sale', name: '初めての販売', desc: '初めてウーパールーパーを販売する', check: function() { return state.achievements.first_sale || false; } },
    { id: 'breed_success', name: '繁殖成功', desc: '初めて繁殖に成功する', check: function() { return state.achievements.breed_success || false; } },
    { id: 'marble_fixed', name: 'マーブル固定化', desc: 'マーブルを固定化する', check: function() { return state.fixedTypes.marble === true; } },
    { id: 'rare_fixed', name: 'レア種固定化', desc: 'レア種（ゴールド黒目、キメラ、銅）を固定化する', check: function() { return state.fixedTypes.goldblackeye === true || state.fixedTypes.chimera === true || state.fixedTypes.copper === true; } },
    { id: 'all_types', name: '全種類獲得', desc: 'すべての種類のウーパールーパーを獲得する', check: function() { return Object.keys(state.obtainedTypes).length >= AXO_TYPES.length; } },
    { id: 'money_100k', name: '資産家', desc: '所持金が10万円を超える', check: function() { return state.money >= 100000; } },
    { id: 'money_500k', name: '大富豪', desc: '所持金が50万円を超える', check: function() { return state.money >= 500000; } },
    { id: 'reputation_max', name: '最高の評判', desc: '評判が100に達する', check: function() { return state.reputation >= MAX_REP; } },
    { id: 'tanks_max', name: '水槽マスター', desc: '水槽を15個まで増やす', check: function() { return state.tanks.length >= MAX_TANKS; } },
    { id: 'long_life', name: '長寿', desc: '60ヶ月以上生きた個体を育てる', check: function() { 
      var found = false;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.age >= 60) found = true;
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(ax) {
            if (ax.age >= 60) found = true;
          });
        }
      });
      return found;
    }}
  ];

  // 個体レジストリ（家系図用）
  var axolotlRegistry = {};

  function $(id) { return document.getElementById(id); }

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function formatMoney(y) {
    return '¥' + y.toLocaleString('ja-JP');
  }

  // ランダムな人名漢字のリスト
  var nameKanjiList = ['太', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '郎', '助', '介', '吉', '次', '三', '蔵', '平', '八', '衛', '門', '左', '右', '衛', '門', '兵', '衛', '之', '助', '作', '之', '助', '治', '郎', '太', '郎', '次', '郎', '三', '郎', '四', '郎', '五', '郎', '六', '郎', '七', '郎', '八', '郎', '九', '郎', '十', '郎', '一', '郎', '二', '郎'];

  // 名前生成関数
  function generateDefaultName(type, parent1Id, parent2Id, isFirstChild) {
    // 繁殖の場合
    if (parent1Id && parent2Id) {
      var p1 = axolotlRegistry[parent1Id];
      var p2 = axolotlRegistry[parent2Id];
      if (p1 && p2) {
        var p1Name = p1.name || '';
        var p2Name = p2.name || '';
        
        // 親の名前から2文字目を取得（漢字二文字でない場合は通常の名付け法則を適用）
        var p1SecondChar = p1Name.length >= 2 ? p1Name.charAt(1) : '';
        var p2SecondChar = p2Name.length >= 2 ? p2Name.charAt(1) : '';
        
        // 親の名前が漢字二文字でない場合は、通常の名付け法則を適用
        if (p1Name.length < 2 || p2Name.length < 2) {
          // 通常の名付け法則にフォールバック
        } else if (isFirstChild && p1SecondChar && p2SecondChar) {
          // 最初の子：父の2文字目 + 母の2文字目
          return p1SecondChar + p2SecondChar;
        } else if (p1SecondChar) {
          // 2匹目以降：父の2文字目 + ランダムな漢字
          var randomKanji = nameKanjiList[Math.floor(Math.random() * nameKanjiList.length)];
          return p1SecondChar + randomKanji;
        }
      }
    }
    
    // 通常の購入・生成の場合
    var typeNameMap = {
      'nomal': { first: '白王', prefix: '白' },
      'albino': { first: '純真', prefix: '純' },
      'marble': { first: '斑尾', prefix: '斑' },
      'black': { first: '濃墨', prefix: '墨' },
      'superblack': { first: '黒王', prefix: '黒' },
      'gold': { first: '黄金', prefix: '金' },
      'copper': { first: '赤銅', prefix: '銅' },
      'goldblackeye': { first: '金塊', prefix: '金' },
      'chimera': { first: '君麿', prefix: '君' },
      'yellow': { first: '黄色', prefix: '黄' },
      'dalmatian': { first: '斑王', prefix: '斑' }
    };
    
    var nameInfo = typeNameMap[type] || { first: '白王', prefix: '白' };
    
    // カウントを取得・更新
    if (!state.nameCounts[type]) {
      state.nameCounts[type] = 0;
    }
    state.nameCounts[type]++;
    
    if (state.nameCounts[type] === 1) {
      return nameInfo.first;
    } else {
      // 2匹目以降：プレフィックス + ランダムな漢字
      var randomKanji = nameKanjiList[Math.floor(Math.random() * nameKanjiList.length)];
      return nameInfo.prefix + randomKanji;
    }
  }

  var SHADE_VALUES = ['light', 'normal', 'dark'];
  var shadeLabels = { light: '薄め', normal: '普通', dark: '濃いめ' };
  var shadePriceRate = { light: 0.9, normal: 1, dark: 1.15 };

  function pickRandomShade() {
    var r = Math.random();
    if (r < 0.25) return 'light';
    if (r < 0.75) return 'normal';
    return 'dark';
  }

  // シードベースの乱数生成（同じシードで同じ結果を返す）
  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // 個体差を生成（brightness, saturation, spots）
  function generateIndividualVariation(morph, seed) {
    var r1 = seededRandom(seed);
    var r2 = seededRandom(seed * 2);
    var r3 = seededRandom(seed * 3);
    
    var brightness = 0.92 + (r1 * 0.16); // 0.92〜1.08
    var saturation = 0.95 + (r2 * 0.10); // 0.95〜1.05
    var hasSpots = false;
    var spotsDensity = 0;
    
    // marbleのみ、30%の確率でspotsがtrue
    if (morph === 'marble' && r3 < 0.3) {
      hasSpots = true;
      spotsDensity = 0.06 + (r3 * 0.08); // 0.06〜0.14
    }
    
    return {
      brightness: brightness,
      saturation: saturation,
      spots: hasSpots,
      spotsDensity: spotsDensity,
      seed: seed
    };
  }

  function createAxolotl(isAdultOrAge, type, parent1Id, parent2Id, chimeraTypes) {
    if (type == null) {
      var roll = Math.random();
      if (roll < 0.85) type = 'nomal';
      else if (roll < 0.90) type = 'albino';  // レア（5%）
      else if (roll < 0.95) type = 'gold';
      else if (roll < 0.98) type = 'marble';
      else if (roll < 0.995) type = 'copper';
      else type = 'black';
    }
    var age = typeof isAdultOrAge === 'number' ? isAdultOrAge : (isAdultOrAge ? randInt(18, 24) : 0);
    var id = state.nextAxolotlId++;
    var seed = Math.floor(Math.random() * 1000000);
    var variation = generateIndividualVariation(type, seed);
    
    // 名前を生成（繁殖の場合は親の情報を使用）
    var isFirstChild = false;
    if (parent1Id && parent2Id) {
      // 同じ親から生まれた子の数をカウント（現在の水槽内の個体も含める）
      var siblingCount = 0;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.parent1Id === parent1Id && tank.axolotl.parent2Id === parent2Id) {
          siblingCount++;
        }
        if (tank.juveniles) {
          tank.juveniles.forEach(function(j) {
            if (j.parent1Id === parent1Id && j.parent2Id === parent2Id) {
              siblingCount++;
            }
          });
        }
      });
      Object.keys(axolotlRegistry).forEach(function(key) {
        var reg = axolotlRegistry[key];
        if (reg && reg.parent1Id === parent1Id && reg.parent2Id === parent2Id && !reg.removed) {
          siblingCount++;
        }
      });
      isFirstChild = (siblingCount === 0);
    }
    
    var defaultName = generateDefaultName(type, parent1Id || null, parent2Id || null, isFirstChild);
    
    // 苗字を継承（父から）
    var familyName = null;
    if (parent1Id && axolotlRegistry[parent1Id]) {
      var parent1 = null;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.id === parent1Id) {
          parent1 = tank.axolotl;
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(pairAx) {
            if (pairAx.id === parent1Id) {
              parent1 = pairAx;
            }
          });
        }
      });
      if (parent1 && parent1.familyName) {
        familyName = parent1.familyName;
      }
    }
    
    // サイズと濃さの設定
    var size = null;
    var shade = null;
    
    if (parent1Id && parent2Id) {
      // 繁殖個体：親の影響を受ける
      var parent1 = null;
      var parent2 = null;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.id === parent1Id) parent1 = tank.axolotl;
        if (tank.axolotl && tank.axolotl.id === parent2Id) parent2 = tank.axolotl;
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(pairAx) {
            if (pairAx.id === parent1Id) parent1 = pairAx;
            if (pairAx.id === parent2Id) parent2 = pairAx;
          });
        }
      });
      if (!parent1 && axolotlRegistry[parent1Id]) parent1 = axolotlRegistry[parent1Id];
      if (!parent2 && axolotlRegistry[parent2Id]) parent2 = axolotlRegistry[parent2Id];
      
      // サイズ：親の影響を受ける
      size = calculateSizeFromParents(parent1 ? parent1.size : null, parent2 ? parent2.size : null, age);
      
      // 濃さ：親の影響を受ける（濃いめ遺伝の強化）
      if (parent1 && parent2) {
        var darkParentCount = (parent1.shade === 'dark' ? 1 : 0) + (parent2.shade === 'dark' ? 1 : 0);
        if (darkParentCount > 0) {
          // 親のどちらかが濃いめの場合、濃いめになる確率を+20%
          var darkChance = 0.25 + (darkParentCount * 0.20); // 25% + 20% or 40%
          if (Math.random() < darkChance) {
            shade = 'dark';
          } else if (Math.random() < 0.5) {
            // 両親の濃さから選択
            var parentShades = [parent1.shade, parent2.shade];
            shade = parentShades[Math.floor(Math.random() * parentShades.length)];
          } else {
            shade = pickRandomShade();
          }
        } else {
          // 親が濃いめでない場合、既存の継承ロジック
          if (Math.random() < 0.5) {
            var parentShades = [parent1.shade, parent2.shade];
            shade = parentShades[Math.floor(Math.random() * parentShades.length)];
          } else {
            shade = pickRandomShade();
          }
        }
      } else {
        shade = pickRandomShade();
      }
    } else {
      // 入手個体：サイズと濃さをランダムに設定
      size = calculateSizeFromAge(age);
      shade = pickRandomShade();
    }
    
    // スーパーブラックは常に濃いめで固定
    if (type === 'superblack') {
      shade = 'dark';
    }
    
    var ax = {
      id: id,
      age: age,
      size: size,
      health: clamp(70 + randInt(-10, 10), 40, MAX_HEALTH),
      type: type,
      sex: Math.random() < 0.5 ? 'オス' : 'メス',
      shade: shade,
      injured: false,
      hunger: age >= 12 ? 80 : 70,
      sick: false,
      underTreatment: false,
      parent1Id: parent1Id || null,
      parent2Id: parent2Id || null,
      brightness: variation.brightness,
      saturation: variation.saturation,
      spots: variation.spots,
      spotsDensity: variation.spotsDensity,
      seed: seed,
      name: defaultName,  // デフォルト名を設定
      familyName: familyName,  // 苗字（父から継承）
      isFixedLineage: false  // 固定化血統フラグ（デフォルトfalse）
    };
    
    // キメラの場合はchimeraTypesを保存
    if (type === 'chimera' && chimeraTypes) {
      ax.chimeraTypes = chimeraTypes;
    }
    
    // レジストリに登録（家系図用のスナップショット）
    axolotlRegistry[id] = {
      id: id,
      type: type,
      sex: ax.sex,
      age: age,
      size: ax.size,
      shade: ax.shade,
      parent1Id: parent1Id || null,
      parent2Id: parent2Id || null,
      name: ax.name,
      familyName: ax.familyName,
      removed: false,
      isFixedLineage: ax.isFixedLineage || false
    };
    return ax;
  }

  function ageFromSizeBand(band) {
    var ages = [1, 2, 4, 7, 9, 12, 15, 21];
    return ages[band] != null ? ages[band] : 21;
  }

  var sizeBandLabels = ['2-3cm(幼生)', '3-5cm', '5-8cm', '8-12cm', '12-16cm', '16-18cm', '18-21cm(繁殖用)', '成体'];

  function initTanks() {
    state.tanks = [];
    state.nextAxolotlId = 1;
    axolotlRegistry = {};
    
    // リューシorマーブルの幼体一匹で最初に名前をつけるところから始まる
    var initialType = Math.random() < 0.5 ? 'nomal' : 'marble';
    var initialAx = createAxolotl(2, initialType, null, null); // 2ヶ月（幼体）
    state.tanks.push({
      id: 1,
      axolotl: initialAx,
      note: '最初のウパ',
      baby: true,
      customName: null,
      clean: 80,
      poop: false
    });
    state.tanks.push({
      id: 2,
      axolotl: null,
      note: '空き水槽',
      baby: false,
      customName: null,
      clean: 80,
      poop: false
    });
    state.tanks.push({
      id: 3,
      axolotl: null,
      note: '空き水槽',
      baby: false,
      customName: null,
      clean: 80,
      poop: false
    });
    
    // 最初のウパに名前をつけるモーダルを表示
    setTimeout(function() {
      if (initialAx && initialAx.id) {
        openDetailModal(initialAx.id);
      }
    }, 500);
  }

  // 既存個体のマイグレーション処理（isFixedLineageフィールドの追加）
  function migrateAxolotlData(ax) {
    if (ax && ax.isFixedLineage === undefined) {
      ax.isFixedLineage = false;
    }
    return ax;
  }

  function tankName(index, tank) {
    if (tank.customName) {
      return tank.customName;
    }
    if (tank.breedingPair) return '水槽' + (index + 1) + '（同棲中）';
    if (tank.egg) return '水槽' + (index + 1) + '（卵）';
    if (!tank.axolotl) return '水槽' + (index + 1) + '（空）';
    return '水槽' + (index + 1);
  }

  function typeLabel(t) {
    return typeLabels[t] || typeLabels.nomal;
  }

  function sizeBandFromAge(age) {
    if (age <= 2) return 0;
    if (age <= 4) return 1;
    if (age <= 6) return 2;
    if (age <= 9) return 3;
    if (age <= 12) return 4;
    if (age <= 15) return 5;
    if (age <= 18) return 6;
    return 7;
  }

  // サイズをcm単位で計算（年齢から）
  function calculateSizeFromAge(age) {
    if (age <= 2) return 2 + Math.random() * 1; // 2-3cm
    if (age <= 4) return 3 + Math.random() * 2; // 3-5cm
    if (age <= 6) return 5 + Math.random() * 3; // 5-8cm
    if (age <= 9) return 8 + Math.random() * 4; // 8-12cm
    if (age <= 12) return 12 + Math.random() * 4; // 12-16cm
    if (age <= 15) return 16 + Math.random() * 2; // 16-18cm
    if (age <= 18) return 18 + Math.random() * 3; // 18-21cm
    return 20 + Math.random() * 2; // 20-22cm（成体）
  }

  // サイズを表示用の文字列に変換
  function formatSize(size) {
    if (size == null) return '不明';
    return Math.round(size * 10) / 10 + 'cm';
  }

  // サイズに応じたアイコンサイズを計算（px単位）
  function getIconSizeFromSize(size) {
    if (size == null) return 32; // デフォルトサイズ
    // サイズに応じてアイコンサイズを計算
    // 2-3cm: 16px（最小）
    // 3-5cm: 20px
    // 5-8cm: 24px
    // 8-12cm: 28px
    // 12-16cm: 32px
    // 16-18cm: 36px
    // 18-21cm: 40px
    // 20-22cm: 44px（最大）
    if (size <= 3) return 16;
    if (size <= 5) return 20;
    if (size <= 8) return 24;
    if (size <= 12) return 28;
    if (size <= 16) return 32;
    if (size <= 18) return 36;
    if (size <= 21) return 40;
    return 44;
  }

  // 親のサイズから子のサイズを計算（親の影響を受ける）
  function calculateSizeFromParents(parent1Size, parent2Size, age) {
    if (parent1Size == null || parent2Size == null) {
      // 親のサイズが不明な場合はランダム
      return calculateSizeFromAge(age);
    }
    // 親のサイズの平均に近い値（±20%の範囲でランダム）
    var avgSize = (parent1Size + parent2Size) / 2;
    var baseSize = calculateSizeFromAge(age);
    // 親の影響を30%反映
    var influencedSize = baseSize * 0.7 + avgSize * 0.3;
    // ±10%のランダム性を追加
    var variation = influencedSize * 0.1 * (Math.random() * 2 - 1);
    return Math.max(2, Math.min(22, influencedSize + variation));
  }
  var sizePriceTable = {
    nomal: [5500, 7400, 8900, 12700, 15800, 24800, 43000, 45000],
    albino: [2000, 3000, 4000, 5000, 6000, 8000, 12000, 15000],  // 一番安い
    gold: [8000, 12000, 15000, 20000, 25000, 35000, 50000, 60000],  // 一番高い
    marble: [4000, 6000, 8000, 10000, 12000, 18000, 28000, 35000],
    black: [6000, 9000, 11000, 15000, 18000, 28000, 45000, 50000],
    superblack: [10000, 15000, 18000, 22000, 28000, 40000, 60000, 70000],
    copper: [5500, 7400, 8900, 12700, 15800, 24800, 43000, 45000],
    goldblackeye: [8000, 12000, 15000, 20000, 28000, 40000, 60000, 65000],
    chimera: [10000, 15000, 20000, 28000, 35000, 50000, 80000, 90000],
    yellow: [9000, 13000, 16000, 21000, 26000, 36000, 51000, 61000],
    dalmatian: [15000, 20000, 25000, 35000, 45000, 60000, 90000, 100000]  // 激レア
  };
  function calcBaseMarketPrice(ax) {
    var band = sizeBandFromAge(ax.age);
    var bandPrices = sizePriceTable[ax.type] || sizePriceTable.nomal;
    var base = (bandPrices[band] || bandPrices[bandPrices.length - 1]) || 8000;
    return base;
  }

  function calcPrice(ax) {
    var band = sizeBandFromAge(ax.age);
    var bandPrices = sizePriceTable[ax.type] || sizePriceTable.nomal;
    var base = (bandPrices[band] || bandPrices[bandPrices.length - 1]) || 8000;
    var healthRate = ax.health / 100;
    var repBonus = clamp(0.85 + state.reputation / 300, 0.85, 1.20);
    var shadeRate = shadePriceRate[ax.shade] != null ? shadePriceRate[ax.shade] : 1;
    var price = base * healthRate * repBonus * shadeRate;
    if (ax.sick) price *= SICK_PRICE_RATE;
    if (ax.injured) price *= 0.3;
    return Math.round(price / 1000) * 1000;
  }

  function getHealthBarColor(health) {
    if (health >= 80) return '#22c55e'; // 緑
    if (health >= 50) return '#eab308'; // 黄
    if (health >= 30) return '#f97316'; // オレンジ
    return '#dc2626'; // 赤
  }

  function getSexDisplay(ax) {
    if (ax.age < 12) return ''; // 不明の場合は非表示
    return ax.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>';
  }

  function getRelationshipColor(relationshipMeter) {
    if (relationshipMeter >= 80) return '#ef4444'; // 赤（順調）
    if (relationshipMeter >= 60) return '#f97316'; // オレンジ（良好）
    if (relationshipMeter >= 40) return '#eab308'; // 黄（普通）
    return '#94a3b8'; // グレー（悪い）
  }

  function getCleanColor(clean) {
    if (clean >= 80) return '#e0f2fe'; // 青系（良好）
    if (clean >= 50) return '#fef3c7'; // 黄系（普通）
    if (clean >= 30) return '#fed7aa'; // オレンジ系（悪い）
    return '#fee2e2'; // 赤系（非常に悪い）
  }

  function getFamilyTree(axolotlId) {
    var ax = axolotlRegistry[axolotlId];
    if (!ax) return null;
    var tree = {
      self: ax,
      parents: [],
      grandparents: []
    };
    // 親を取得
    if (ax.parent1Id && axolotlRegistry[ax.parent1Id]) {
      tree.parents.push(axolotlRegistry[ax.parent1Id]);
    }
    if (ax.parent2Id && axolotlRegistry[ax.parent2Id]) {
      tree.parents.push(axolotlRegistry[ax.parent2Id]);
    }
    // 祖父母を取得
    tree.parents.forEach(function (parent) {
      if (parent.parent1Id && axolotlRegistry[parent.parent1Id]) {
        tree.grandparents.push(axolotlRegistry[parent.parent1Id]);
      }
      if (parent.parent2Id && axolotlRegistry[parent.parent2Id]) {
        tree.grandparents.push(axolotlRegistry[parent.parent2Id]);
      }
    });
    return tree;
  }

  // 固定化チェック（家系図が全部同じ個体の場合）
  function checkIfFixed(axolotlId) {
    var ax = axolotlRegistry[axolotlId];
    if (!ax || !ax.type) return false;
    return state.fixedTypes[ax.type] === true;
  }

  // 固定化判定（家系図が全部同じ個体の場合に固定化成功）
  function checkForFixation(axolotlId) {
    var ax = axolotlRegistry[axolotlId];
    if (!ax || !ax.type) return false;
    
    // 既に固定化されている場合はスキップ
    if (state.fixedTypes[ax.type]) return false;
    
    // 親が2人とも同じ種類で、祖父母も全て同じ種類の場合
    if (!ax.parent1Id || !ax.parent2Id) return false;
    
    var p1 = axolotlRegistry[ax.parent1Id];
    var p2 = axolotlRegistry[ax.parent2Id];
    if (!p1 || !p2) return false;
    
    // 両親が同じ種類
    if (p1.type !== ax.type || p2.type !== ax.type) return false;
    
    // 祖父母も全て同じ種類かチェック
    var allGrandparentsSame = true;
    var grandparents = [];
    if (p1.parent1Id && axolotlRegistry[p1.parent1Id]) grandparents.push(axolotlRegistry[p1.parent1Id]);
    if (p1.parent2Id && axolotlRegistry[p1.parent2Id]) grandparents.push(axolotlRegistry[p1.parent2Id]);
    if (p2.parent1Id && axolotlRegistry[p2.parent1Id]) grandparents.push(axolotlRegistry[p2.parent1Id]);
    if (p2.parent2Id && axolotlRegistry[p2.parent2Id]) grandparents.push(axolotlRegistry[p2.parent2Id]);
    
    if (grandparents.length === 0) return false; // 祖父母がいない場合は固定化不可
    
    for (var i = 0; i < grandparents.length; i++) {
      if (grandparents[i].type !== ax.type) {
        allGrandparentsSame = false;
        break;
      }
    }
    
    if (allGrandparentsSame) {
      // 固定化成功！
      state.fixedTypes[ax.type] = true;
      
      // 固定化報酬計算（種類基本価格 × レア度係数）
      var rarity = typeRarityMap[ax.type] || 'common';
      var multiplier = rarityMultiplierMap[rarity] || 10;
      var reward = Math.ceil((typePriceBase[ax.type] * multiplier) / 1000) * 1000;
      state.money += reward;
      
      // 個体のisFixedLineageをtrueに設定
      var currentAx = null;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.id === ax.id) {
          currentAx = tank.axolotl;
          tank.axolotl.isFixedLineage = true;
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(pairAx) {
            if (pairAx.id === ax.id) {
              currentAx = pairAx;
              pairAx.isFixedLineage = true;
            }
          });
        }
      });
      if (axolotlRegistry[ax.id]) {
        axolotlRegistry[ax.id].isFixedLineage = true;
      }
      
      // ブラックが濃いめで固定化された場合はスーパーブラックが生まれる
      if (ax.type === 'black') {
        // 現在の個体の濃さを確認
        var currentAx = null;
        state.tanks.forEach(function(tank) {
          if (tank.axolotl && tank.axolotl.id === ax.id) currentAx = tank.axolotl;
          if (tank.breedingPair) {
            tank.breedingPair.forEach(function(pairAx) {
              if (pairAx.id === ax.id) currentAx = pairAx;
            });
          }
        });
        
        if (currentAx && currentAx.shade === 'dark') {
          // スーパーブラックを固定化済みにする
          state.fixedTypes['superblack'] = true;
          logLine('【固定化成功！】' + typeLabel(ax.type) + 'が固定化されました！濃いめのブラックが固定化されたため、スーパーブラックも固定化されました！固定化権を獲得し、' + formatMoney(reward) + 'を獲得しました。ショップで購入可能になりました。');
        } else {
          logLine('【固定化成功！】' + typeLabel(ax.type) + 'が固定化されました！固定化権を獲得し、' + formatMoney(reward) + 'を獲得しました。ショップで購入可能になりました。');
        }
      } else {
        logLine('【固定化成功！】' + typeLabel(ax.type) + 'が固定化されました！固定化権を獲得し、' + formatMoney(reward) + 'を獲得しました。ショップで購入可能になりました。');
      }
      return true;
    }
    
    return false;
  }

  // 近親交配度を計算（0-100、高いほど血が濃い）
  function calculateInbreedingCoefficient(parent1Id, parent2Id) {
    if (!parent1Id || !parent2Id) return 0;
    var p1 = axolotlRegistry[parent1Id];
    var p2 = axolotlRegistry[parent2Id];
    if (!p1 || !p2) return 0;
    
    var coefficient = 0;
    
    // 同じ親から生まれた場合（兄弟）
    if (p1.parent1Id && p2.parent1Id && p1.parent1Id === p2.parent1Id) coefficient += 25;
    if (p1.parent2Id && p2.parent2Id && p1.parent2Id === p2.parent2Id) coefficient += 25;
    if (p1.parent1Id && p2.parent2Id && p1.parent1Id === p2.parent2Id) coefficient += 25;
    if (p1.parent2Id && p2.parent1Id && p1.parent2Id === p2.parent1Id) coefficient += 25;
    
    // 親子関係
    if (p1.id === p2.parent1Id || p1.id === p2.parent2Id) coefficient += 50;
    if (p2.id === p1.parent1Id || p2.id === p1.parent2Id) coefficient += 50;
    
    // 祖父母が共通
    var p1Grandparents = [];
    var p2Grandparents = [];
    if (p1.parent1Id && axolotlRegistry[p1.parent1Id]) {
      var gp1 = axolotlRegistry[p1.parent1Id];
      if (gp1.parent1Id) p1Grandparents.push(gp1.parent1Id);
      if (gp1.parent2Id) p1Grandparents.push(gp1.parent2Id);
    }
    if (p1.parent2Id && axolotlRegistry[p1.parent2Id]) {
      var gp2 = axolotlRegistry[p1.parent2Id];
      if (gp2.parent1Id) p1Grandparents.push(gp2.parent1Id);
      if (gp2.parent2Id) p1Grandparents.push(gp2.parent2Id);
    }
    if (p2.parent1Id && axolotlRegistry[p2.parent1Id]) {
      var gp3 = axolotlRegistry[p2.parent1Id];
      if (gp3.parent1Id) p2Grandparents.push(gp3.parent1Id);
      if (gp3.parent2Id) p2Grandparents.push(gp3.parent2Id);
    }
    if (p2.parent2Id && axolotlRegistry[p2.parent2Id]) {
      var gp4 = axolotlRegistry[p2.parent2Id];
      if (gp4.parent1Id) p2Grandparents.push(gp4.parent1Id);
      if (gp4.parent2Id) p2Grandparents.push(gp4.parent2Id);
    }
    
    var commonGrandparents = 0;
    p1Grandparents.forEach(function (gpid) {
      if (p2Grandparents.indexOf(gpid) >= 0) commonGrandparents++;
    });
    coefficient += commonGrandparents * 12.5;
    
    return clamp(coefficient, 0, 100);
  }

  function openDetailModal(axolotlId) {
    var ax = axolotlRegistry[axolotlId];
    if (!ax) return;
    
    // 現在の状態を取得（水槽内の個体から）
    var currentAx = null;
    var foundTank = null;
    state.tanks.forEach(function (tank) {
      if (tank.axolotl && tank.axolotl.id === axolotlId) {
        currentAx = tank.axolotl;
        foundTank = tank;
      }
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function (pairAx) {
          if (pairAx.id === axolotlId) {
            currentAx = pairAx;
            foundTank = tank;
          }
        });
      }
    });
    
    // レジストリの情報と現在の状態をマージ
    var displayAx = currentAx || ax;
    
    var tree = getFamilyTree(axolotlId);
    var nameEl = $('axDetailName');
    var bodyEl = $('axDetailBody');
    var familyEl = $('axDetailFamily');
    
    var sexDisplay = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '♂' : '♀') : '';
    var namePart = displayAx.name || typeLabel(displayAx.type);
    var displayName = (displayAx.familyName ? displayAx.familyName + ' ' : '') + namePart;
    var sexDisplayHtml = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
    nameEl.innerHTML = displayName + (sexDisplayHtml ? ' ' + sexDisplayHtml : '');
    
    var sizeBand = sizeBandFromAge(displayAx.age);
    bodyEl.innerHTML = '';
    
    // 名前編集欄
    var nameEditDiv = document.createElement('div');
    nameEditDiv.style.marginBottom = '8px';
    nameEditDiv.innerHTML = '<label style="font-size:11px;">名前：</label>';
    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = displayAx.name || '';
    nameInput.placeholder = typeLabel(displayAx.type);
    nameInput.style.width = '100%';
    nameInput.style.padding = '4px';
    nameInput.style.marginTop = '2px';
    nameInput.style.fontSize = '12px';
    var isInitialAxolotl = false;
    state.tanks.forEach(function(tank) {
      if (tank.axolotl && tank.axolotl.id === axolotlId && tank.note === '最初のウパ') {
        isInitialAxolotl = true;
      }
    });
    
    nameInput.addEventListener('change', function() {
      var newName = this.value.trim() || null;
      if (currentAx) {
        currentAx.name = newName;
        if (axolotlRegistry[axolotlId]) {
          axolotlRegistry[axolotlId].name = newName;
        }
        updateUI();
        openDetailModal(axolotlId); // 再表示
      }
    });
    nameEditDiv.appendChild(nameInput);
    bodyEl.appendChild(nameEditDiv);
    
    // 苗字編集欄（繁殖ペアの場合のみ）
    if (displayAx.age >= 12 && (displayAx.sex === 'オス' || displayAx.sex === 'メス')) {
      var familyNameEditDiv = document.createElement('div');
      familyNameEditDiv.style.marginBottom = '8px';
      familyNameEditDiv.innerHTML = '<label style="font-size:11px;">苗字（繁殖用）：</label>';
      var familyNameInput = document.createElement('input');
      familyNameInput.type = 'text';
      familyNameInput.value = displayAx.familyName || '';
      familyNameInput.placeholder = '苗字を入力（子に継承されます）';
      familyNameInput.style.width = '100%';
      familyNameInput.style.padding = '4px';
      familyNameInput.style.marginTop = '2px';
      familyNameInput.style.fontSize = '12px';
      familyNameInput.addEventListener('change', function() {
        var newFamilyName = this.value.trim() || null;
        if (currentAx) {
          currentAx.familyName = newFamilyName;
          if (axolotlRegistry[axolotlId]) {
            axolotlRegistry[axolotlId].familyName = newFamilyName;
          }
          updateUI();
          openDetailModal(axolotlId); // 再表示
        }
      });
      familyNameEditDiv.appendChild(familyNameInput);
      bodyEl.appendChild(familyNameEditDiv);
    }
    
    var bodyText = 
      'サイズ：' + formatSize(displayAx.size) + '\n' +
      '年齢：' + displayAx.age + 'ヶ月\n' +
      '健康：' + Math.round(displayAx.health || 100) + '/100\n' +
      '空腹：' + Math.round(displayAx.hunger || 100) + '/100\n' +
      '色味：' + (shadeLabels[displayAx.shade] || '普通') + '\n' +
      '状態：' + (displayAx.injured ? '欠損' : '') + (displayAx.sick ? '病気' : '') + (displayAx.underTreatment ? '治療中' : '') + (!displayAx.injured && !displayAx.sick && !displayAx.underTreatment ? '健康' : '') + '\n' +
      '予想販売価格：' + formatMoney(calcPrice(displayAx));
    var bodyTextDiv = document.createElement('div');
    bodyTextDiv.style.whiteSpace = 'pre-line';
    bodyTextDiv.textContent = bodyText;
    bodyEl.appendChild(bodyTextDiv);
    
    // 家系図を表示
    familyEl.innerHTML = '';
    if (tree && (tree.parents.length > 0 || tree.grandparents.length > 0)) {
      var h3 = document.createElement('h3');
      h3.textContent = '家系図';
      familyEl.appendChild(h3);
      
      if (tree.parents.length > 0) {
        var parentDiv = document.createElement('div');
        parentDiv.className = 'ax-detail-family-item';
        parentDiv.innerHTML = '親：';
        tree.parents.forEach(function (p, idx) {
          if (idx > 0) parentDiv.innerHTML += '、';
          var pSexDisplay = p.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>';
          parentDiv.innerHTML += typeLabel(p.type) + ' ' + pSexDisplay;
        });
        familyEl.appendChild(parentDiv);
      } else {
        var noParentDiv = document.createElement('div');
        noParentDiv.className = 'ax-detail-family-item';
        noParentDiv.textContent = '親：不明（ショップ・初期個体）';
        familyEl.appendChild(noParentDiv);
      }
      
      if (tree.grandparents.length > 0) {
        var grandparentDiv = document.createElement('div');
        grandparentDiv.className = 'ax-detail-family-item';
        grandparentDiv.innerHTML = '祖父母：';
        tree.grandparents.forEach(function (gp, idx) {
          if (idx > 0) grandparentDiv.innerHTML += '、';
          var gpSexDisplay = gp.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>';
          grandparentDiv.innerHTML += typeLabel(gp.type) + ' ' + gpSexDisplay;
        });
        familyEl.appendChild(grandparentDiv);
      }
    } else {
      var noFamilyDiv = document.createElement('div');
      noFamilyDiv.className = 'ax-detail-family-item';
      noFamilyDiv.textContent = '親：不明（ショップ・初期個体）';
      familyEl.appendChild(noFamilyDiv);
    }
    
    // 最初のウパの名付け画面の場合のみ「決定」に変更
    var isInitialAxolotl = false;
    state.tanks.forEach(function(tank) {
      if (tank.axolotl && tank.axolotl.id === axolotlId && tank.note === '最初のウパ') {
        isInitialAxolotl = true;
      }
    });
    
    var cancelBtn = $('axDetailCancel');
    if (isInitialAxolotl) {
      cancelBtn.textContent = '決定';
    } else {
      cancelBtn.textContent = '閉じる';
    }
    
    $('axOverlayDetail').classList.add('visible');
  }

  function closeDetailModal() {
    // 最初のウパに名前がつけられたかチェック
    var initialTank = state.tanks.find(function(tank) {
      return tank.axolotl && tank.note === '最初のウパ';
    });
    if (initialTank && initialTank.axolotl && initialTank.axolotl.name) {
      // まだメッセージが表示されていない場合のみ表示
      if (!state.initialNamingMessageShown) {
        state.initialNamingMessageShown = true;
        var axName = initialTank.axolotl.name;
        // 店名を更新
        state.shopName = 'ウーパーショップ『' + axName + '』';
        setTimeout(function() {
          logLine(axName + 'と一緒にいい店にできるように頑張ろう！');
          updateUI();
        }, 300);
      }
    }
    $('axOverlayDetail').classList.remove('visible');
  }

  function openHatchSelectionModal(tankIdx, candidates, remainingJuveniles) {
    var tank = state.tanks[tankIdx];
    if (!tank || !candidates || candidates.length === 0) return;
    
    var list = $('axHatchList');
    if (!list) {
      // モーダルが存在しない場合は作成
      var overlay = document.createElement('div');
      overlay.className = 'ax-overlay';
      overlay.id = 'axOverlayHatch';
      overlay.innerHTML = '<div class="ax-overlay-box"><h2>孵化した幼生から1匹を選ぶ</h2><p style="font-size:12px; margin-bottom:8px;">3匹の候補から1匹を選んでください。残りは自動的に売却されます。</p><div id="axHatchList" style="margin-bottom:12px; max-height:50vh; overflow-y:auto;"></div><button type="button" class="btn" style="background:#64748b; border-color:#64748b;" id="axHatchCancel">キャンセル</button></div>';
      document.body.appendChild(overlay);
      list = $('axHatchList');
      $('axHatchCancel').addEventListener('click', function() {
        $('axOverlayHatch').classList.remove('visible');
      });
    }
    
    list.innerHTML = '';
    
    candidates.forEach(function(candidate, idx) {
      var div = document.createElement('div');
      div.style.marginBottom = '12px';
      div.style.padding = '8px';
      div.style.border = '2px solid #bfdbfe';
      div.style.borderRadius = '6px';
      div.style.background = '#f0f9ff';
      
      var header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.gap = '8px';
      header.style.marginBottom = '4px';
      
      var img = document.createElement('img');
      img.src = typeImagePath(candidate.type);
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.imageRendering = 'pixelated';
      header.appendChild(img);
      
      var info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = '<div style="font-weight:bold;">' + typeLabel(candidate.type) + '</div><div style="font-size:10px; color:#64748b;">健康度: ' + candidate.health + ' / 空腹度: ' + candidate.hunger + '</div>';
      header.appendChild(info);
      div.appendChild(header);
      
      var selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'ax-btn breed';
      selectBtn.textContent = 'この子を育てる';
      selectBtn.style.width = '100%';
      selectBtn.dataset.candidateIndex = String(idx);
      selectBtn.addEventListener('click', function() {
        selectHatchCandidate(tankIdx, parseInt(this.dataset.candidateIndex, 10), candidates, remainingJuveniles);
      });
      div.appendChild(selectBtn);
      
      list.appendChild(div);
    });
    
    // 一時的に候補と残りを保存
    tank._hatchCandidates = candidates;
    tank._hatchRemaining = remainingJuveniles;
    
    $('axOverlayHatch').classList.add('visible');
  }

  function selectHatchCandidate(tankIdx, candidateIndex, candidates, remainingJuveniles) {
    var tank = state.tanks[tankIdx];
    if (!tank || !candidates || candidateIndex < 0 || candidateIndex >= candidates.length) return;
    
    var selected = candidates[candidateIndex];
    
    // 残りの候補とremainingJuvenilesを自動売却
    var toSell = [];
    candidates.forEach(function(c, idx) {
      if (idx !== candidateIndex) {
        toSell.push(c);
      }
    });
    if (remainingJuveniles) {
      toSell = toSell.concat(remainingJuveniles);
    }
    
    var totalPrice = 0;
    toSell.forEach(function(j) {
      // 幼生の価格計算（サイズ2-3cm相当）
      var price = calcPrice(j);
      totalPrice += price;
      if (axolotlRegistry[j.id]) {
        axolotlRegistry[j.id].removed = true;
      }
    });
    
    state.money += totalPrice;
    
    // 選択した1匹を保持
    tank.juveniles = [selected];
    tank.juvenileAge = 0;
    tank.note = '幼生 1匹（0/5ヶ月）';
    
    // 一時データをクリア
    tank._hatchCandidates = null;
    tank._hatchRemaining = null;
    
    logLine('孵化した幼生から' + typeLabel(selected.type) + 'を選んだ。残り' + toSell.length + '匹を' + formatMoney(totalPrice) + 'で販売した。');
    $('axOverlayHatch').classList.remove('visible');
    updateUI();
  }

  function openJuvenileSelectionModal(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.juveniles || tank.juveniles.length === 0) return;
    
    var list = $('axJuvenileList');
    list.innerHTML = '';
    
    // 種類ごとにグループ化
    var grouped = {};
    tank.juveniles.forEach(function (j) {
      if (!grouped[j.type]) grouped[j.type] = [];
      grouped[j.type].push(j);
    });
    
    Object.keys(grouped).forEach(function (type) {
      var juveniles = grouped[type];
      var div = document.createElement('div');
      div.style.marginBottom = '8px';
      div.innerHTML = '<div style="font-weight:bold; margin-bottom:4px;">' + typeLabel(type) + ' ' + juveniles.length + '匹</div>';
      
      var sellAllBtn = document.createElement('button');
      sellAllBtn.type = 'button';
      sellAllBtn.className = 'ax-btn sell';
      sellAllBtn.style.marginRight = '4px';
      sellAllBtn.textContent = '全' + juveniles.length + '匹を売る';
      sellAllBtn.addEventListener('click', function () {
        sellJuveniles(tankIdx, type, 'all');
      });
      div.appendChild(sellAllBtn);
      
      var selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'ax-btn breed';
      selectBtn.textContent = '1匹を選ぶ';
      selectBtn.addEventListener('click', function () {
        selectJuvenile(tankIdx, type);
      });
      div.appendChild(selectBtn);
      
      list.appendChild(div);
    });
    
    $('axOverlayJuvenile').classList.add('visible');
    $('axJuvenileTankIndex').value = String(tankIdx);
  }

  function sellJuveniles(tankIdx, type, mode) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.juveniles) return;
    
    var toSell = mode === 'all' 
      ? tank.juveniles.filter(function (j) { return j.type === type; })
      : [tank.juveniles.find(function (j) { return j.type === type; })].filter(Boolean);
    
    var totalPrice = 0;
    toSell.forEach(function (j) {
      var price = calcPrice(j);
      totalPrice += price;
      if (axolotlRegistry[j.id]) {
        axolotlRegistry[j.id].removed = true;
      }
    });
    
    state.money += totalPrice;
    tank.juveniles = tank.juveniles.filter(function (j) {
      return toSell.indexOf(j) < 0;
    });
    
    if (tank.juveniles.length === 0) {
      tank.juveniles = null;
      tank.juvenileAge = null;
      tank.note = '空き水槽';
    } else {
      tank.note = '幼生 ' + tank.juveniles.length + '匹（' + (tank.juvenileAge || 0) + '/5ヶ月）';
    }
    
    logLine(typeLabel(type) + 'の幼生' + toSell.length + '匹を' + formatMoney(totalPrice) + 'で販売した。');
    $('axOverlayJuvenile').classList.remove('visible');
    updateUI();
  }

  function selectJuvenile(tankIdx, type) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.juveniles) return;
    
    var available = tank.juveniles.filter(function (j) { return j.type === type; });
    if (available.length === 0) return;
    
    // 空き水槽を探す
    var emptyTank = state.tanks.find(function (t) {
      return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles;
    });
    
    if (!emptyTank) {
      // 空き水槽がない場合、確認ダイアログを表示
      var selected = available[Math.floor(Math.random() * available.length)];
      var selectedName = selected.name || typeLabel(selected.type);
      var otherCount = tank.juveniles.length - 1;
      var otherPrice = 0;
      tank.juveniles.forEach(function(j) {
        if (j.id !== selected.id) {
          otherPrice += calcPrice(j);
        }
      });
      
      var confirmMsg = 'ほかの卵を売ってこのウーパーを残しますか？\n\n';
      confirmMsg += '残す個体：' + selectedName + '\n';
      confirmMsg += '売却する個体：' + otherCount + '匹（' + formatMoney(otherPrice) + '）';
      
      if (confirm(confirmMsg)) {
        // 他の幼生を売却
        tank.juveniles.forEach(function(j) {
          if (j.id !== selected.id) {
            var price = calcPrice(j);
            state.money += price;
            if (axolotlRegistry[j.id]) {
              axolotlRegistry[j.id].removed = true;
            }
          }
        });
        
        // 選んだ個体を空き水槽に移動（空き水槽がないので、現在の水槽に残す）
        tank.axolotl = selected;
        tank.juveniles = null;
        tank.juvenileAge = null;
        tank.baby = selected.age < 12;
        tank.note = '選んだ幼生';
        
        logLine(selectedName + 'を残し、他の' + otherCount + '匹を' + formatMoney(otherPrice) + 'で販売した。');
        $('axOverlayJuvenile').classList.remove('visible');
        updateUI();
      }
      return;
    }
    
    var selected = available[Math.floor(Math.random() * available.length)];
    emptyTank.axolotl = selected;
    emptyTank.baby = selected.age < 12;
    emptyTank.note = '選んだ幼生';
    
    tank.juveniles = tank.juveniles.filter(function (j) { return j.id !== selected.id; });
    
    if (tank.juveniles.length === 0) {
      tank.juveniles = null;
      tank.juvenileAge = null;
      tank.note = '空き水槽';
    } else {
      tank.note = '幼生 ' + tank.juveniles.length + '匹（' + (tank.juvenileAge || 0) + '/5ヶ月）';
    }
    
    logLine(typeLabel(type) + 'の幼生1匹を選んで別の水槽に移動した。');
    $('axOverlayJuvenile').classList.remove('visible');
    updateUI();
  }

  function updateTanksDOM() {
    var root = $('axTanks');
    root.innerHTML = '';
    state.tanks.forEach(function (tank, idx) {
      var div = document.createElement('div');
      div.className = 'ax-tank';
      // 水質に応じた背景色を設定（空き水槽は色なし）
      var isEmpty = !tank.axolotl && !tank.breedingPair && !tank.juveniles && !tank.egg;
      if (!isEmpty) {
        var tankClean = tank.clean !== undefined ? tank.clean : 80;
        div.style.background = getCleanColor(tankClean);
      } else {
        div.style.background = 'transparent';
      }

      var header = document.createElement('div');
      header.className = 'ax-tank-header';
      var nameEl = document.createElement('div');
      nameEl.className = 'ax-tank-name';
      nameEl.textContent = tankName(idx, tank);
      nameEl.style.cursor = 'pointer';
      nameEl.title = 'クリックで名前を変更';
      nameEl.dataset.tankIndex = String(idx);
      nameEl.addEventListener('click', function() {
        var newName = prompt('水槽の名前を入力してください:', tank.customName || '水槽' + (idx + 1));
        if (newName !== null) {
          newName = newName.trim();
          if (newName === '') {
            state.tanks[idx].customName = null;
          } else {
            state.tanks[idx].customName = newName;
          }
          updateUI();
        }
      });
      var tag = document.createElement('div');
      tag.className = 'ax-tank-tag';
      if (tank.breedingPair) {
        tag.textContent = '同棲中';
        tag.classList.add('ax-tag-breeding');
      } else if (tank.egg) {
        tag.textContent = '卵';
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        tag.textContent = '幼生';
        tag.classList.add('ax-tag-juvenile');
      } else if (tank.axolotl) {
        if (tank.axolotl.age >= 12) {
          tag.textContent = '成体';
          tag.classList.add('ax-tag-adult');
        } else {
          tag.textContent = '幼体';
          tag.classList.add('ax-tag-juvenile');
        }
      } else {
        tag.textContent = '空き';
      }
      header.appendChild(nameEl);
      header.appendChild(tag);
      div.appendChild(header);

      var body = document.createElement('div');
      body.className = 'ax-tank-body';
      var lines = document.createElement('div');
      lines.className = 'ax-tank-lines';
      if (tank.breedingPair) {
        var months = tank.breedingMonthsLeft != null ? tank.breedingMonthsLeft : 0;
        var p1 = tank.breedingPair[0];
        var p2 = tank.breedingPair[1];
        var p1Sex = p1.age >= 12 ? (p1.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
        var p2Sex = p2.age >= 12 ? (p2.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
        var relationshipMeter = tank.relationshipMeter || 50;
        var relationshipColor = getRelationshipColor(relationshipMeter);
        var avgAge = (p1.age + p2.age) / 2;
        var ageNote = '';
        if (avgAge >= 60) ageNote = '<div style="color:#dc2626; font-size:11px; margin-top:4px;">加齢で産卵しにくくなっています</div>';
        else if (avgAge >= 48) ageNote = '<div style="color:#f97316; font-size:11px; margin-top:4px;">加齢で産卵率が下がっています</div>';
        else if (avgAge >= 36) ageNote = '<div style="color:#eab308; font-size:11px; margin-top:4px;">やや加齢の影響があります</div>';
        
        var p1NamePart = p1.name || typeLabel(p1.type);
        var p2NamePart = p2.name || typeLabel(p2.type);
        var p1Name = (p1.familyName ? p1.familyName + ' ' : '') + p1NamePart;
        var p2Name = (p2.familyName ? p2.familyName + ' ' : '') + p2NamePart;
        var tankClean = tank.clean !== undefined ? tank.clean : 80;
        var avgHunger = ((p1.hunger || 100) + (p2.hunger || 100)) / 2;
        var avgHealth = (p1.health + p2.health) / 2;
        // 中心で二分割
        lines.innerHTML = 
          '<div style="display:flex; justify-content:space-around; border-bottom:1px solid #e5e7eb; padding-bottom:8px; margin-bottom:8px;">' +
          '<div style="flex:1; text-align:center; border-right:1px solid #e5e7eb; padding-right:8px;">' +
          '<div style="font-weight:bold; margin-bottom:4px;">' + p1Name + (p1Sex ? ' ' + p1Sex : '') + '</div>' +
          '<div style="font-size:11px; color:#64748b; margin-bottom:4px;">齢: ' + p1.age + 'ヶ月</div>' +
          '</div>' +
          '<div style="flex:1; text-align:center; padding-left:8px;">' +
          '<div style="font-weight:bold; margin-bottom:4px;">' + p2Name + (p2Sex ? ' ' + p2Sex : '') + '</div>' +
          '<div style="font-size:11px; color:#64748b; margin-bottom:4px;">齢: ' + p2.age + 'ヶ月</div>' +
          '</div>' +
          '</div>' +
          '<div class="ax-tank-status-bars" style="margin-bottom:8px;">' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">水質</div><div class="ax-bar"><div class="ax-bar-fill clean" style="width:' + Math.round(tankClean) + '%;"></div></div></div>' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">空腹</div><div class="ax-bar"><div class="ax-bar-fill food" style="width:' + Math.round(avgHunger) + '%;"></div></div></div>' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">健康</div><div class="ax-bar"><div class="ax-bar-fill" style="width:' + Math.round(avgHealth) + '%;background:' + getHealthBarColor(avgHealth) + ';"></div></div></div>' +
          '</div>' +
          '<div style="text-align:center; font-size:14px; color:' + relationshipColor + '; margin-bottom:4px;">❤ ' + Math.round(relationshipMeter) + '</div>' +
          ageNote;
        lines.classList.add('clickable');
        lines.dataset.axolotlId = String(p1.id);
        lines.addEventListener('click', function () {
          openDetailModal(parseInt(this.dataset.axolotlId, 10));
        });
      } else if (tank.egg) {
        var eggText = '卵 ' + (tank.eggCount || 500) + '個\n孵化まであと' + (tank.hatchMonthsLeft != null ? tank.hatchMonthsLeft : 1) + 'ヶ月';
        lines.textContent = eggText;
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        lines.textContent = '幼生：' + tank.juveniles.length + '匹\n' + (tank.juvenileAge || 0) + '/5ヶ月\n（混雑で死亡率が高い）';
        lines.classList.add('clickable');
        lines.addEventListener('click', function () {
          openJuvenileSelectionModal(idx);
        });
      } else if (tank.axolotl) {
        var ax = tank.axolotl;
        var sexDisplay = getSexDisplay(ax);
        var namePart = ax.name || typeLabel(ax.type);
        var displayName = (ax.familyName ? ax.familyName + ' ' : '') + namePart;
        var tankClean = tank.clean !== undefined ? tank.clean : 80;
        lines.innerHTML =
          '<div style="font-weight:bold; margin-bottom:4px;">' + displayName + (sexDisplay ? ' ' + sexDisplay : '') + '</div>' +
          '<div style="font-size:11px; color:#64748b; margin-bottom:8px;">サイズ: ' + formatSize(ax.size) + ' / 齢: ' + ax.age + 'ヶ月</div>' +
          '<div class="ax-tank-status-bars">' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">水質</div><div class="ax-bar"><div class="ax-bar-fill clean" style="width:' + Math.round(tankClean) + '%;"></div></div></div>' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">空腹</div><div class="ax-bar"><div class="ax-bar-fill food" style="width:' + Math.round(ax.hunger || 100) + '%;"></div></div></div>' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">健康</div><div class="ax-bar"><div class="ax-bar-fill" style="width:' + Math.round(ax.health || 100) + '%;background:' + getHealthBarColor(ax.health) + ';"></div></div></div>' +
          '</div>' +
          '<div style="margin-top:8px;">' + (ax.injured ? '<span style="color:#f97316; font-size:11px;">欠損</span> ' : '') + (ax.sick ? '<span style="color:#dc2626; font-weight:bold; background:#fee2e2; padding:2px 6px; border-radius:4px; font-size:11px;">病気</span> ' : '') + (ax.underTreatment ? '<span style="color:#3b82f6; font-size:11px;">治療中</span>' : '') + '</div>';
        lines.classList.add('clickable');
        lines.dataset.axolotlId = String(ax.id);
        lines.addEventListener('click', function () {
          openDetailModal(parseInt(this.dataset.axolotlId, 10));
        });
      } else {
        // 空き水槽の場合はlinesに何も表示しない（footにのみ表示）
        lines.textContent = '';
      }
      body.appendChild(lines);

      if (tank.breedingPair) {
        var pair = tank.breedingPair;
        var wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.gap = '4px';
        wrap.style.justifyContent = 'center';
        [pair[0], pair[1]].forEach(function (ax, idx) {
          var sprite = document.createElement('img');
          var healthLevel = ax.health || 100;
          var animClass = '';
          if (!ax.injured && !ax.sick && healthLevel > 0) {
            if (healthLevel < 50) animClass = ' slow';
            else if (healthLevel > 80) animClass = ' fast';
            else animClass = ' alive';
          }
          sprite.className = 'ax-axolotl-img ax-shade-' + (ax.shade || 'normal') + animClass;
          var cacheKey = ax.id + '_' + ax.type + '_' + (ax.brightness || 1) + '_' + (ax.saturation || 1) + '_' + (ax.spots ? '1' : '0');
          var imgSrc = imageCache[cacheKey] || generateAxolotlImage(ax);
          sprite.src = imgSrc;
          sprite.alt = typeLabel(ax.type);
          sprite.dataset.axolotlId = String(ax.id);
          sprite.style.filter = 'brightness(' + (ax.brightness || 1) + ') saturate(' + (ax.saturation || 1) + ')';
          // サイズに応じたアイコンサイズを設定
          var iconSize = getIconSizeFromSize(ax.size);
          sprite.style.width = iconSize + 'px';
          sprite.style.height = iconSize + 'px';
          sprite.addEventListener('click', function () {
            openDetailModal(parseInt(this.dataset.axolotlId, 10));
          });
          wrap.appendChild(sprite);
          // 中心で分割するための区切り線（最初の要素の後）
          if (idx === 0) {
            var divider = document.createElement('div');
            divider.style.width = '1px';
            divider.style.background = '#e5e7eb';
            divider.style.margin = '0 2px';
            wrap.appendChild(divider);
          }
        });
        body.appendChild(wrap);
        
        // うんこの表示（繁殖ペアの場合）
        if (tank.poop) {
          var poopEl = document.createElement('img');
          poopEl.src = '/assets/unko-9250e8d5-2b39-43ed-b760-387753235a7f.png';
          poopEl.style.width = '16px';
          poopEl.style.height = '16px';
          poopEl.style.position = 'absolute';
          poopEl.style.bottom = '20px';
          poopEl.style.right = '4px';
          poopEl.style.cursor = 'pointer';
          poopEl.style.zIndex = '10';
          poopEl.style.imageRendering = 'pixelated';
          poopEl.title = 'クリックでうんこを掃除';
          poopEl.dataset.tankIndex = String(idx);
          poopEl.addEventListener('click', function(e) {
            e.stopPropagation();
            removePoop(parseInt(this.dataset.tankIndex, 10));
          });
          body.style.position = 'relative';
          body.appendChild(poopEl);
        }
      } else if (tank.egg) {
        var eggEl = document.createElement('div');
        eggEl.className = 'ax-tank-egg';
        eggEl.textContent = '🥚 ' + (tank.eggCount || 500);
        body.appendChild(eggEl);
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        var juvenileEl = document.createElement('div');
        juvenileEl.className = 'ax-tank-juvenile';
        juvenileEl.textContent = '🐟 ' + tank.juveniles.length + '匹';
        body.appendChild(juvenileEl);
      } else if (tank.axolotl) {
        var ax = tank.axolotl;
        var sprite = document.createElement('img');
        var healthLevel = ax.health || 100;
        var animClass = '';
        if (!ax.injured && !ax.sick && healthLevel > 0) {
          if (healthLevel < 50) animClass = ' slow';
          else if (healthLevel > 80) animClass = ' fast';
          else animClass = ' alive';
        }
        sprite.className = 'ax-axolotl-img ax-shade-' + (ax.shade || 'normal') + animClass;
        var cacheKey = ax.id + '_' + ax.type + '_' + (ax.brightness || 1) + '_' + (ax.saturation || 1) + '_' + (ax.spots ? '1' : '0');
        var imgSrc = imageCache[cacheKey] || generateAxolotlImage(ax);
        sprite.src = imgSrc;
        sprite.alt = typeLabel(ax.type);
        sprite.dataset.axolotlId = String(ax.id);
        sprite.style.filter = 'brightness(' + (ax.brightness || 1) + ') saturate(' + (ax.saturation || 1) + ')';
        // サイズに応じたアイコンサイズを設定
        var iconSize = getIconSizeFromSize(ax.size);
        sprite.style.width = iconSize + 'px';
        sprite.style.height = iconSize + 'px';
        sprite.addEventListener('click', function () {
          openDetailModal(parseInt(this.dataset.axolotlId, 10));
        });
        body.appendChild(sprite);
        
        // うんこの表示
        if (tank.poop) {
          var poopEl = document.createElement('img');
          poopEl.src = '/assets/unko-9250e8d5-2b39-43ed-b760-387753235a7f.png';
          poopEl.style.width = '16px';
          poopEl.style.height = '16px';
          poopEl.style.position = 'absolute';
          poopEl.style.bottom = '20px';
          poopEl.style.right = '4px';
          poopEl.style.cursor = 'pointer';
          poopEl.style.zIndex = '10';
          poopEl.style.imageRendering = 'pixelated';
          poopEl.title = 'クリックでうんこを掃除';
          poopEl.dataset.tankIndex = String(idx);
          poopEl.addEventListener('click', function(e) {
            e.stopPropagation();
            removePoop(parseInt(this.dataset.tankIndex, 10));
          });
          body.style.position = 'relative';
          body.appendChild(poopEl);
        }
      }
      div.appendChild(body);

      var foot = document.createElement('div');
      foot.className = 'ax-tank-footer';
      if (tank.axolotl) {
        var ax = tank.axolotl;
        // 給餌ボタン
        var feedBtn = document.createElement('button');
        feedBtn.type = 'button';
        feedBtn.className = 'ax-tank-action-btn feed';
        feedBtn.textContent = '給餌';
        feedBtn.dataset.tankIndex = String(idx);
        feedBtn.addEventListener('click', function () {
          openTankFeedModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(feedBtn);
        
        // 水替えボタン
        var cleanBtn = document.createElement('button');
        cleanBtn.type = 'button';
        cleanBtn.className = 'ax-tank-action-btn clean';
        cleanBtn.textContent = '水替え';
        cleanBtn.dataset.tankIndex = String(idx);
        cleanBtn.addEventListener('click', function () {
          doCleanTank(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(cleanBtn);
        
        // 詳細ボタン
        var detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'ax-tank-action-btn detail';
        detailBtn.textContent = '詳細';
        detailBtn.dataset.axolotlId = String(ax.id);
        detailBtn.addEventListener('click', function () {
          openDetailModal(parseInt(this.dataset.axolotlId, 10));
        });
        foot.appendChild(detailBtn);
      } else if (tank.breedingPair) {
        var pair = tank.breedingPair;
        // 給餌ボタン
        var feedBtn = document.createElement('button');
        feedBtn.type = 'button';
        feedBtn.className = 'ax-tank-action-btn feed';
        feedBtn.textContent = '給餌';
        feedBtn.dataset.tankIndex = String(idx);
        feedBtn.addEventListener('click', function () {
          openTankFeedModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(feedBtn);
        
        // 水替えボタン
        var cleanBtn = document.createElement('button');
        cleanBtn.type = 'button';
        cleanBtn.className = 'ax-tank-action-btn clean';
        cleanBtn.textContent = '水替え';
        cleanBtn.dataset.tankIndex = String(idx);
        cleanBtn.addEventListener('click', function () {
          doCleanTank(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(cleanBtn);
        
        // 詳細ボタン（最初の個体を表示）
        var detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'ax-tank-action-btn detail';
        detailBtn.textContent = '詳細';
        detailBtn.dataset.axolotlId = String(pair[0].id);
        detailBtn.addEventListener('click', function () {
          openDetailModal(parseInt(this.dataset.axolotlId, 10));
        });
        foot.appendChild(detailBtn);
      } else if (tank.egg) {
        var eggPrice = Math.floor((tank.eggCount || 500) * 50);
        var sellEggBtn = document.createElement('button');
        sellEggBtn.type = 'button';
        sellEggBtn.className = 'ax-tank-action-btn sell';
        sellEggBtn.style.width = '100%';
        sellEggBtn.textContent = '卵を売る ' + formatMoney(eggPrice);
        sellEggBtn.dataset.tankIndex = String(idx);
        sellEggBtn.addEventListener('click', function () {
          sellEggs(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(sellEggBtn);
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        var sellJuvenileBtn = document.createElement('button');
        sellJuvenileBtn.type = 'button';
        sellJuvenileBtn.className = 'ax-tank-action-btn detail';
        sellJuvenileBtn.style.width = '100%';
        sellJuvenileBtn.textContent = '選ぶ/売る';
        sellJuvenileBtn.dataset.tankIndex = String(idx);
        sellJuvenileBtn.addEventListener('click', function () {
          openJuvenileSelectionModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(sellJuvenileBtn);
      } else {
        foot.innerHTML = '<div style="text-align:center; color:#94a3b8; font-size:12px; padding:8px;">' + (tank.note || 'ここに新しいウパを入れられる。') + '</div>';
      }
      div.appendChild(foot);

      root.appendChild(div);
    });
  }

  function updateUI() {
    $('axDay').textContent = state.month + '月目';
    $('axMoney').textContent = formatMoney(state.money);
    $('axRepBar').style.width = clamp(state.reputation, 0, MAX_REP) / MAX_REP * 100 + '%';
    
    // ショップ名を更新
    var shopTitleEl = document.getElementById('axShopTitle');
    if (shopTitleEl && state.shopName) {
      shopTitleEl.textContent = state.shopName;
    }

    var disabled = state.ended;
    $('btnNextMonth').disabled = disabled;
    
    // 全体操作ボタン
    var btnFeedAll = document.getElementById('btnFeedAll');
    var btnCleanAll = document.getElementById('btnCleanAll');
    if (btnFeedAll) btnFeedAll.disabled = disabled;
    if (btnCleanAll) btnCleanAll.disabled = disabled;
    
    // メニューボタン
    var btnBreed = document.getElementById('btnBreed');
    var btnTreat = document.getElementById('btnTreat');
    var btnBuy = document.getElementById('btnBuy');
    var btnEncyclopedia = document.getElementById('btnEncyclopedia');
    var btnAchievements = document.getElementById('btnAchievements');
    var btnAuction = document.getElementById('btnAuction');
    
    if (btnBreed) {
      var adults = getAdultTanks();
      var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
      var canBreed = !disabled && adults.length >= 2 && empty && adults.filter(function (x) { return x.tank.axolotl.sex === 'オス'; }).length > 0 && adults.filter(function (x) { return x.tank.axolotl.sex === 'メス'; }).length > 0;
      btnBreed.disabled = !canBreed;
    }
    if (btnTreat) btnTreat.disabled = disabled;
    if (btnBuy) btnBuy.disabled = disabled;
    if (btnEncyclopedia) btnEncyclopedia.disabled = disabled;
    if (btnAchievements) btnAchievements.disabled = disabled;
    if (btnAuction) {
      var canAuction = !disabled && state.auctionAvailable && state.auctionType;
      btnAuction.disabled = !canAuction;
    }
    
    // 未対応アラートの更新
    updateNextMonthAlerts();

    updateTanksDOM();
  }

  function updateNextMonthAlerts() {
    var alertsEl = document.getElementById('axNextMonthAlerts');
    if (!alertsEl) return;
    
    var alerts = [];
    
    // 水質が低い水槽をチェック
    var lowCleanTanks = state.tanks.filter(function(t, idx) {
      var tankClean = t.clean !== undefined ? t.clean : 80;
      return (t.axolotl || t.breedingPair || t.juveniles || t.egg) && tankClean < 40;
    });
    if (lowCleanTanks.length > 0) {
      alerts.push({ text: '水質低', count: lowCleanTanks.length });
    }
    
    // うんこがある水槽をチェック
    var poopTanks = state.tanks.filter(function(t) {
      return t.poop === true;
    });
    if (poopTanks.length > 0) {
      alerts.push({ text: 'うんこ', count: poopTanks.length });
    }
    
    // 病気の個体をチェック
    var sickAxolotls = [];
    state.tanks.forEach(function(t) {
      if (t.axolotl && t.axolotl.sick && !t.axolotl.underTreatment) {
        sickAxolotls.push(t);
      }
      if (t.breedingPair) {
        t.breedingPair.forEach(function(ax) {
          if (ax.sick && !ax.underTreatment) {
            sickAxolotls.push(t);
          }
        });
      }
    });
    if (sickAxolotls.length > 0) {
      alerts.push({ text: '病気', count: sickAxolotls.length });
    }
    
    alertsEl.innerHTML = '';
    if (alerts.length > 0) {
      alerts.forEach(function(alert) {
        var badge = document.createElement('span');
        badge.className = 'ax-alert-badge';
        badge.textContent = alert.text + (alert.count > 1 ? '×' + alert.count : '');
        alertsEl.appendChild(badge);
      });
    }
  }

  function logLine(text) {
    var log = $('axLog');
    var prefix = '【' + state.month + '月目】';
    var line = prefix + ' ' + text;
    log.textContent = line + (log.textContent ? '\n' + log.textContent : '');
  }

  function checkEnd() {
    if (state.ended) return;
    if (state.money >= TARGET_MONEY && state.reputation >= 60) {
      state.ended = true;
      $('axOverlayEnd').classList.add('visible');
      $('axEndTitle').textContent = '人気店エンド';
      $('axEndMessage').textContent =
        '所持金 ' + formatMoney(state.money) + '、評判 ' + Math.round(state.reputation) + '。\n' +
        '大切に育てたウーパールーパーのおかげで、地域で有名なショップになった。';
      updateUI();
      return;
    }
    var hasAxolotlOrHope = state.tanks.some(function (t) { return t.axolotl || t.breedingPair || t.egg; });
    if (state.money <= 0 && !hasAxolotlOrHope) {
      state.ended = true;
      $('axOverlayEnd').classList.add('visible');
      $('axEndTitle').textContent = '閉店エンド';
      $('axEndMessage').textContent =
        '資金もウーパールーパーも尽きてしまった。\n' +
        '次は、水とエサを優先して、ゆっくり増やしていこう。';
      updateUI();
    }
  }

  function tryBreeding(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.breedingPair) return false;
    var pair = tank.breedingPair;
    var relationshipMeter = tank.relationshipMeter || 50; // 0-100
    var inbreedingCoeff = calculateInbreedingCoefficient(pair[0].id, pair[1].id);
    
    // 加齢による繁殖能力の低下
    var avgAge = (pair[0].age + pair[1].age) / 2;
    var agePenalty = 0;
    if (avgAge >= 60) agePenalty = 0.5; // 60ヶ月以上で50%減
    else if (avgAge >= 48) agePenalty = 0.3; // 48ヶ月以上で30%減
    else if (avgAge >= 36) agePenalty = 0.15; // 36ヶ月以上で15%減
    
    // 関係メーターに基づいて成功率を調整（毎月試行）
    var baseSuccessRate = 0.9; // 90%の基本確率（血が濃くない限り）
    var relationshipBonus = (relationshipMeter - 50) / 200; // -0.25 から +0.25
    var successRate = clamp(baseSuccessRate + relationshipBonus - agePenalty, 0.1, 0.95);
    
    // 近親交配度が高いと成功率が下がる
    var inbreedingPenalty = inbreedingCoeff / 200; // 最大-0.5
    successRate = clamp(successRate - inbreedingPenalty, 0.05, 0.95);
    
    var success = Math.random() < successRate;
    
    if (success) {
      // 卵の数を決定（300-1000個）
      // 関係値が高いほど卵の数が多い
      var baseEggCount = randInt(300, 1000);
      var relationshipMultiplier = 0.7 + (relationshipMeter / 100) * 0.6; // 0.7倍～1.3倍
      var eggCount = Math.floor(baseEggCount * relationshipMultiplier);
      
      // 近親交配度が高いと卵の数が減る
      eggCount = Math.floor(eggCount * (1 - inbreedingCoeff / 200)); // 最大50%減
      eggCount = Math.max(100, eggCount); // 最低100個
      
      // 空き水槽を探す
      var emptySlots = [];
      state.tanks.forEach(function (t, i) {
        if (i !== tankIdx && !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles) {
          emptySlots.push(i);
        }
      });
      
      if (emptySlots.length > 0) {
        // 空き水槽があれば卵を配置
        var eggTank = state.tanks[emptySlots[0]];
        eggTank.egg = true;
        eggTank.eggCount = eggCount;
        eggTank.eggParentTypes = [pair[0].type, pair[1].type];
        eggTank.eggParentIds = [pair[0].id, pair[1].id];
        eggTank.eggParentShades = [pair[0].shade || 'normal', pair[1].shade || 'normal']; // shadeを保存
        eggTank.eggRelationshipMeter = relationshipMeter; // 関係値を保存
        eggTank.hatchMonthsLeft = 1;
        eggTank.note = '卵 ' + eggCount + '個（あと1ヶ月で孵化）';
        state.reputation = clamp(state.reputation + 3, 0, MAX_REP);
        
        // 実績チェック
        if (!state.achievements.breed_success) {
          state.achievements.breed_success = true;
          logLine('【実績解除】繁殖成功');
        }
        
        logLine('繁殖に成功！水槽' + (emptySlots[0] + 1) + 'に' + eggCount + '個の卵が産まれた。');
        return true;
      } else {
        // 空き水槽がない場合は卵を売却
        var eggPrice = Math.floor(eggCount * 50);
        state.money += eggPrice;
        logLine('空き水槽がないため、' + eggCount + '個の卵を' + formatMoney(eggPrice) + 'で販売した。');
        return true;
      }
    }
    
    return false;
  }

  function countOccupiedTanks() {
    return state.tanks.filter(function (t) { return t.axolotl || t.breedingPair; }).length;
  }

  function removePoop(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.poop) return;
    tank.poop = false;
    logLine('水槽' + (tankIdx + 1) + 'のうんこを掃除した。');
    updateUI();
  }

  function checkAuction() {
    // オークションは低確率で発生（5%）、固定化していない個体が稀に売られる
    if (Math.random() < 0.05) {
      // 固定化されていない種類から選択
      var unfixedTypes = AXO_TYPES.filter(function(type) {
        return !state.fixedTypes[type];
      });
      if (unfixedTypes.length > 0) {
        var selectedType = unfixedTypes[Math.floor(Math.random() * unfixedTypes.length)];
        var basePrice = typePriceBase[selectedType] || 20000;
        var auctionPrice = basePrice * randInt(8, 15); // 8-15倍の価格
        state.auctionAvailable = true;
        state.auctionType = selectedType;
        state.auctionPrice = auctionPrice;
        logLine('【オークション】' + typeLabel(selectedType) + 'が' + formatMoney(auctionPrice) + 'で出品されています！オークションボタン!を確認してください。');
        updateAuctionButton();
      } else {
        state.auctionAvailable = false;
        state.auctionType = null;
        state.auctionPrice = 0;
        updateAuctionButton();
      }
    } else {
      state.auctionAvailable = false;
      state.auctionType = null;
      state.auctionPrice = 0;
      updateAuctionButton();
    }
    
    // ショップの在庫状態を日ごとに更新（品切れの可能性）
    state.shopStockDaily = {};
  }

  function endOfMonthDrift() {
    // マイグレーション: equipmentが無い場合は初期化
    if (!state.equipment) {
      state.equipment = { autoFeeder: false, filter: false, bottomCleaner: false };
    }
    
    state.tanks.forEach(function (tank, idx) {
      // 水質の初期化（未設定の場合）
      if (tank.clean === undefined) tank.clean = 80;
      if (tank.poop === undefined) tank.poop = false;
      
      // マイグレーション: 個体データのisFixedLineageフィールド
      if (tank.axolotl) {
        migrateAxolotlData(tank.axolotl);
      }
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function(ax) {
          migrateAxolotlData(ax);
        });
      }
      if (tank.juveniles) {
        tank.juveniles.forEach(function(ax) {
          migrateAxolotlData(ax);
        });
      }
      
      // 空の水槽は水質が悪化しない
      if (!tank.axolotl && !tank.breedingPair && !tank.juveniles && !tank.egg) {
        return; // 空の水槽はスキップ
      }
      
      // うんこ未処理時の水質低下（次のターンから著しく下がる）
      if (tank.poop) {
        var poopPenalty = POOP_PENALTY_PER_MONTH;
        // 底面掃除機がある場合は半減
        if (state.equipment && state.equipment.bottomCleaner) {
          poopPenalty = Math.floor(poopPenalty / 2);
        }
        tank.clean = clamp(tank.clean - poopPenalty, 0, MAX_CLEAN);
      }
      
      // 個体数とサイズに応じた水質悪化
      var axolotlCount = 0;
      var totalSizeFactor = 0;
      if (tank.axolotl) {
        axolotlCount = 1;
        var sizeBand = sizeBandFromAge(tank.axolotl.age);
        totalSizeFactor += sizeBand + 1; // サイズバンド+1（0-8）
      } else if (tank.breedingPair) {
        axolotlCount = 2;
        tank.breedingPair.forEach(function(ax) {
          var sizeBand = sizeBandFromAge(ax.age);
          totalSizeFactor += sizeBand + 1;
        });
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        axolotlCount = tank.juveniles.length;
        totalSizeFactor = axolotlCount * 0.5; // 幼生は小さいので0.5倍
      }
      
      // 水質悪化：個体数とサイズに応じて
      var cleanDecay = 2 + (axolotlCount * 1.5) + (totalSizeFactor * 0.8);
      tank.clean = clamp(tank.clean - cleanDecay, 0, MAX_CLEAN);
      
      // うんこ発生（ウーパーがいる水槽に一定確率で発生）
      if ((tank.axolotl || tank.breedingPair) && !tank.poop && Math.random() < 0.3) {
        tank.poop = true;
        logLine('水槽' + (idx + 1) + 'のウーパーがうんこをした。');
      }
      
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function (a) {
          a.hunger = clamp((a.hunger || MAX_HUNGER) - HUNGER_DECAY_PER_MONTH, 0, MAX_HUNGER);
        });
        // 関係メーターの更新（健康と空腹度に基づく）
        if (tank.relationshipMeter != null) {
          var avgHealth = (tank.breedingPair[0].health + tank.breedingPair[1].health) / 2;
          var avgHunger = (tank.breedingPair[0].hunger + tank.breedingPair[1].hunger) / 2;
          var healthBonus = (avgHealth - 70) / 10; // 70を基準に
          var hungerBonus = (avgHunger - 70) / 10; // 70を基準に
          tank.relationshipMeter = clamp(tank.relationshipMeter + healthBonus + hungerBonus, 0, 100);
        }
        
        // 毎月繁殖を試行
        tryBreeding(idx);
        
        return;
      }
      if (tank.egg) {
        tank.hatchMonthsLeft = (tank.hatchMonthsLeft || 1) - 1;
        if (tank.hatchMonthsLeft <= 0) {
          var parentTypes = tank.eggParentTypes || ['nomal', 'nomal'];
          var parentIds = tank.eggParentIds || [null, null];
          var parentShades = tank.eggParentShades || ['normal', 'normal'];
          var eggCount = tank.eggCount || 500;
          
          // 空き水槽がない場合は卵を売却
          var emptySlots = [];
          state.tanks.forEach(function (t, i) {
            if (i !== idx && !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles) {
              emptySlots.push(i);
            }
          });
          
          if (emptySlots.length === 0) {
            var eggPrice = Math.floor(eggCount * 50);
            state.money += eggPrice;
            tank.egg = false;
            tank.eggCount = null;
            tank.eggParentTypes = null;
            tank.eggParentIds = null;
            tank.eggParentShades = null;
            tank.eggRelationshipMeter = null;
            tank.hatchMonthsLeft = null;
            tank.note = '空き水槽';
            logLine('空き水槽がないため、卵' + eggCount + '個を' + formatMoney(eggPrice) + 'で販売した。');
            return;
          }
          
          // 卵が孵化して幼生が生まれる
          tank.egg = false;
          tank.eggCount = null;
          tank.eggParentTypes = null;
          tank.eggParentIds = null;
          tank.eggRelationshipMeter = null;
          tank.hatchMonthsLeft = null;
          tank.juveniles = [];
          tank.juvenileAge = 0; // 0ヶ月（孵化直後）
          
          // 孵化数の計算（基本90%、健康度や水の汚れ、血の濃さやカップル関係性にも依存）
          var baseHatchRate = 0.9; // 基本90%
          var relationshipMeter = tank.eggRelationshipMeter || 50;
          var relationshipBonus = (relationshipMeter - 50) / 200; // -0.25 から +0.25
          
          // 親の健康度とshadeを取得
          var parent1Health = 100;
          var parent2Health = 100;
          var parent1Shade = parentShades[0] || 'normal';
          var parent2Shade = parentShades[1] || 'normal';
          
          // 現在の水槽から健康度を取得
          state.tanks.forEach(function(t) {
            if (t.breedingPair) {
              t.breedingPair.forEach(function(ax) {
                if (ax.id === parentIds[0]) parent1Health = ax.health || 100;
                if (ax.id === parentIds[1]) parent2Health = ax.health || 100;
              });
            }
          });
          
          var avgHealth = (parent1Health + parent2Health) / 2;
          var healthBonus = (avgHealth - 70) / 300; // 健康度による補正
          
          // 水の汚れによる影響（水槽ごとの水質を使用）
          var tankClean = tank.clean !== undefined ? tank.clean : 80;
          var cleanPenalty = (100 - tankClean) / 500; // 汚れがひどいほど減る
          
          // 近親交配度による影響
          var inbreedingCoeff = calculateInbreedingCoefficient(parentIds[0], parentIds[1]);
          var inbreedingPenalty = inbreedingCoeff / 300; // 血が濃いほど減る
          
          var hatchRate = clamp(baseHatchRate + relationshipBonus + healthBonus - cleanPenalty - inbreedingPenalty, 0.1, 0.95);
          var hatchCount = Math.floor(eggCount * hatchRate);
          
          // 幼生を内部的に生成（全数）
          var allJuveniles = [];
          for (var i = 0; i < Math.min(hatchCount, 100); i++) { // 最大100匹まで
            var offspringResult;
            var parentTraitChance = 0.85 + (inbreedingCoeff / 100) * 0.1;
            
            if (Math.random() < parentTraitChance) {
              offspringResult = { type: parentTypes[Math.floor(Math.random() * parentTypes.length)], inbreedingCoeff: inbreedingCoeff };
            } else {
              offspringResult = pickOffspringType(parentTypes[0], parentTypes[1], parentIds[0], parentIds[1], relationshipMeter, parent1Shade, parent2Shade);
            }
            var juvenile = createAxolotl(0, offspringResult.type, parentIds[0], parentIds[1], offspringResult.chimeraTypes);
            juvenile.inbreedingCoeff = offspringResult.inbreedingCoeff || 0;
            allJuveniles.push(juvenile);
            
            // 図鑑に追加
            state.obtainedTypes[juvenile.type] = true;
            
            // 固定化チェック
            checkForFixation(juvenile.id);
          }
          
          // 3匹の候補をランダムに選択
          var candidates = [];
          var candidateIndices = [];
          var maxCandidates = Math.min(3, allJuveniles.length);
          while (candidates.length < maxCandidates && allJuveniles.length > 0) {
            var randomIndex = Math.floor(Math.random() * allJuveniles.length);
            candidates.push(allJuveniles[randomIndex]);
            allJuveniles.splice(randomIndex, 1);
          }
          
          // 孵化選択モーダルを開く
          openHatchSelectionModal(idx, candidates, allJuveniles);
        }
        return;
      }
      
      // 幼生の処理（5ヶ月まで）
      if (tank.juveniles && tank.juveniles.length > 0) {
        tank.juvenileAge = (tank.juvenileAge || 0) + 1;
        
        // 混雑度に基づいて死亡率を計算（死亡率を下げる）
        var crowdingFactor = tank.juveniles.length / 100; // 100匹を基準に変更
        var baseDeathRate = 0.02; // 2%の基本死亡率（下げる）
        
        // 近親交配度が高いと死亡率が上がる
        var avgInbreeding = 0;
        tank.juveniles.forEach(function (j) {
          if (j.inbreedingCoeff) avgInbreeding += j.inbreedingCoeff;
        });
        avgInbreeding = tank.juveniles.length > 0 ? avgInbreeding / tank.juveniles.length : 0;
        var inbreedingDeathBonus = avgInbreeding > 50 ? (avgInbreeding - 50) / 200 : 0; // 最大+0.25（下げる）
        
        var deathRate = baseDeathRate * crowdingFactor + inbreedingDeathBonus;
        
        // 幼生の死亡処理
        var survivors = [];
        tank.juveniles.forEach(function (juvenile) {
          if (Math.random() < deathRate) {
            if (axolotlRegistry[juvenile.id]) {
              axolotlRegistry[juvenile.id].removed = true;
            }
          } else {
            juvenile.age = tank.juvenileAge;
            survivors.push(juvenile);
          }
        });
        
        tank.juveniles = survivors;
        
        if (tank.juveniles.length === 0) {
          tank.juveniles = null;
          tank.juvenileAge = null;
          tank.note = '空き水槽';
          logLine('すべての幼生が★になってしまった…');
        } else if (tank.juvenileAge >= 5) {
          // 5ヶ月経過したら、1匹を選んで成体にする
          var remainingCount = tank.juveniles.length - 1;
          var selected = tank.juveniles[Math.floor(Math.random() * tank.juveniles.length)];
          tank.axolotl = selected;
          tank.juveniles = null;
          tank.juvenileAge = null;
          tank.baby = false;
          tank.note = '育ったウパ';
          logLine('幼生が成長し、' + typeLabel(selected.type) + 'の成体になった。残り' + remainingCount + '匹は売却された。');
        } else {
          tank.note = '幼生 ' + tank.juveniles.length + '匹（' + tank.juvenileAge + '/5ヶ月）';
        }
        return;
      }
      if (!tank.axolotl) return;
      var ax = tank.axolotl;
      ax.hunger = clamp((ax.hunger || MAX_HUNGER) - HUNGER_DECAY_PER_MONTH, 0, MAX_HUNGER);
      
      // 種類ごとの丈夫さ設定（isFixedLineageを使用）
      var healthDecayMultiplier = 1.0;
      var isFixedLineage = ax.isFixedLineage === true; // マイグレーション対応
      if (ax.type === 'marble') {
        healthDecayMultiplier = 0.7; // マーブルは一番丈夫（30%減）
      } else if (ax.type === 'gold' || ax.type === 'albino') {
        healthDecayMultiplier = 1.3; // ゴールドとアルビノは少し弱い（30%増）
      } else if (ax.type === 'yellow') {
        // イエローは固定化可能だが、固定化前は弱い
        if (!isFixedLineage) {
          healthDecayMultiplier = 1.5; // 固定化前は50%増（やや弱い）
        }
      } else if (ax.type === 'goldblackeye' || ax.type === 'chimera' || ax.type === 'copper' || ax.type === 'dalmatian') {
        // 固定化されていないレア種は弱い
        if (!isFixedLineage) {
          healthDecayMultiplier = 1.8; // 固定化前は80%増（弱い）
        } else {
          // 固定化後は緩和（1.2～1.4程度）
          healthDecayMultiplier = 1.3;
        }
      }
      
      // 水槽ごとの水質に基づいて健康度を計算
      var tankClean = tank.clean !== undefined ? tank.clean : 80;
      if (tankClean < 40) ax.health -= Math.round(12 * healthDecayMultiplier);
      else if (tankClean < 70) ax.health -= Math.round(6 * healthDecayMultiplier);
      if (ax.hunger < 30) ax.health -= Math.round(6 * healthDecayMultiplier);
      ax.health = clamp(ax.health, 0, MAX_HEALTH);
      // 近親交配度が高いと病気になりやすい
      var inbreedingCoeff = calculateInbreedingCoefficient(ax.parent1Id, ax.parent2Id);
      
      // 病気確率を段階式に変更（水質・空腹度に応じて）
      var W = tankClean;
      var H = ax.hunger;
      var baseChance = 0;
      if (W >= 70 && H >= 70) {
        baseChance = 0.01; // 1% - 良好
      } else if (W >= 50 && H >= 50) {
        baseChance = 0.03; // 3% - 普通
      } else if (W < 50 || H < 50) {
        baseChance = 0.08; // 8% - 悪化
      }
      if (W < 35 || H < 35) {
        baseChance = 0.15; // 15% - 危険
      }
      
      var sickChance = baseChance;
      
      // 近親交配度補正
      if (inbreedingCoeff > 50) {
        sickChance *= (1 + inbreedingCoeff / 100); // 最大2倍
      }
      
      // 種類ごとの病気になりやすさ（isFixedLineageを使用）
      var isFixedLineage = ax.isFixedLineage === true; // マイグレーション対応
      if (ax.type === 'marble') {
        sickChance *= 0.6; // マーブルは病気になりにくい
      } else if (ax.type === 'gold' || ax.type === 'albino') {
        sickChance *= 1.4; // ゴールドとアルビノは病気になりやすい
      } else if (ax.type === 'yellow') {
        // イエローは固定化可能だが、固定化前は病気になりやすい
        if (!isFixedLineage) {
          sickChance *= 1.6; // 固定化前は病気になりやすい
        }
      } else if (ax.type === 'goldblackeye' || ax.type === 'chimera' || ax.type === 'copper' || ax.type === 'dalmatian') {
        if (!isFixedLineage) {
          sickChance *= 2.0; // 固定化前のレア種は病気になりやすい
        } else {
          // 固定化後は緩和
          sickChance *= 1.3;
        }
      }
      
      // 最終確率を0-50%にclamp
      sickChance = clamp(sickChance, 0, 0.50);
      
      // 水槽ごとの水質に基づいて病気判定（条件満たした時だけ判定）
      if (!ax.sick && Math.random() < sickChance) {
        ax.sick = true;
        logLine((ax.name || typeLabel(ax.type)) + 'が病気になった。' + (inbreedingCoeff > 50 ? '（血が濃いため）' : ''));
      }
      if (ax.sick) {
        if (ax.underTreatment && Math.random() < TREATMENT_RECOVER_CHANCE) {
          ax.sick = false;
          ax.underTreatment = false;
          logLine(typeLabel(ax.type) + 'のウパが治療で回復した。');
        } else if (!ax.underTreatment) {
          if (Math.random() < SICK_DEATH_CHANCE) {
            if (axolotlRegistry[ax.id]) {
              axolotlRegistry[ax.id].removed = true;
            }
            tank.axolotl = null;
            tank.note = '病気で★になってしまった…';
            logLine('ウーパールーパーが1匹病気で★になってしまった。');
            state.reputation = clamp(state.reputation - 10, 0, MAX_REP);
            return;
          }
          if (Math.random() < SICK_INJURY_CHANCE) {
            ax.injured = true;
            logLine(typeLabel(ax.type) + 'のウパが病気で欠損を負った。');
          }
        }
      }
      ax.age += 1;
      // 12ヶ月で成体になる
      if (ax.age >= 12 && tank.baby) {
        tank.baby = false;
        tank.note = '育ったウパ';
      }
      
      // 寿命による死亡（60ヶ月以上で確率が上がる）
      var ageDeathChance = 0;
      if (ax.age >= 72) ageDeathChance = 0.15; // 72ヶ月以上で15%
      else if (ax.age >= 60) ageDeathChance = 0.08; // 60ヶ月以上で8%
      else if (ax.age >= 48) ageDeathChance = 0.03; // 48ヶ月以上で3%
      
      // 急死の可能性（低確率）
      var suddenDeathChance = 0.005; // 0.5%
      
      if (Math.random() < ageDeathChance) {
        if (axolotlRegistry[ax.id]) {
          axolotlRegistry[ax.id].removed = true;
        }
        tank.axolotl = null;
        tank.note = '寿命で★になってしまった…';
        logLine(typeLabel(ax.type) + 'が寿命で★になってしまった。（' + ax.age + 'ヶ月）');
        state.reputation = clamp(state.reputation - 5, 0, MAX_REP);
        return;
      }
      
      if (Math.random() < suddenDeathChance) {
        if (axolotlRegistry[ax.id]) {
          axolotlRegistry[ax.id].removed = true;
        }
        tank.axolotl = null;
        tank.note = '急死で★になってしまった…';
        logLine(typeLabel(ax.type) + 'が急死で★になってしまった。');
        state.reputation = clamp(state.reputation - 8, 0, MAX_REP);
        return;
      }
      if (ax.health <= 0) {
        if (axolotlRegistry[ax.id]) {
          axolotlRegistry[ax.id].removed = true;
        }
        tank.axolotl = null;
        tank.note = '体調を崩して★になってしまった…';
        logLine('水やエサの状態が悪く、ウーパールーパーが1匹★になってしまった。');
        state.reputation = clamp(state.reputation - 10, 0, MAX_REP);
      }
    });
    
    // 水質が悪い水槽が多いと評判が下がる
    var badCleanTanks = state.tanks.filter(function(t) {
      var tankClean = t.clean !== undefined ? t.clean : 80;
      return tankClean < 40;
    }).length;
    if (badCleanTanks > 0) {
      state.reputation = clamp(state.reputation - (badCleanTanks * 2), 0, MAX_REP);
    }
  }

  function updateAuctionButton() {
    var auctionBtn = document.getElementById('btnAuction');
    if (auctionBtn) {
      var auctionMark = state.auctionAvailable && state.auctionType ? ' !' : '';
      auctionBtn.innerHTML = '<span class="label">オークション' + auctionMark + '</span>';
    }
  }
  
  function openAuctionOverlay() {
    if (!state.auctionAvailable || !state.auctionType) {
      logLine('現在オークションに出ている個体はありません。');
      return;
    }
    // ショップオーバーレイを開いて、オークション表示に切り替え
    var tabsEl = $('axBuyTabs');
    tabsEl.innerHTML = '';
    
    // オークション専用のタブ表示
    var auctionTab = document.createElement('button');
    auctionTab.type = 'button';
    auctionTab.className = 'ax-buy-tab';
    auctionTab.textContent = 'オークション';
    auctionTab.dataset.tab = 'auction';
    auctionTab.classList.add('active');
    tabsEl.appendChild(auctionTab);
    
    showBuyTypeList('auction');
    $('axOverlayBuy').classList.add('visible');
  }

  function nextMonth() {
    state.month += 1;
    applyAutoEquipment();
    checkAuction();
    endOfMonthDrift();
    checkEnd();
    updateUI();
    updateAuctionButton();
  }

  function applyAutoEquipment() {
    // 自動給餌器
    if (state.equipment && state.equipment.autoFeeder) {
      var fedCount = 0;
      var totalCost = 0;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.hunger < AUTO_FEEDER_HUNGER_THRESHOLD) {
          tank.axolotl.health = clamp(tank.axolotl.health + FEED_ARTIFICIAL_HEALTH, 0, MAX_HEALTH);
          tank.axolotl.hunger = clamp((tank.axolotl.hunger || 80) + FEED_ARTIFICIAL_HUNGER, 0, MAX_HUNGER);
          tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - FEED_ARTIFICIAL_DIRT, 0, MAX_CLEAN);
          fedCount++;
          totalCost += AUTO_FEEDER_COST_PER_FEED;
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(ax) {
            if (ax.hunger < AUTO_FEEDER_HUNGER_THRESHOLD) {
              ax.health = clamp(ax.health + FEED_ARTIFICIAL_HEALTH, 0, MAX_HEALTH);
              ax.hunger = clamp((ax.hunger || 80) + FEED_ARTIFICIAL_HUNGER, 0, MAX_HUNGER);
              fedCount++;
              totalCost += AUTO_FEEDER_COST_PER_FEED;
            }
          });
          tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - FEED_ARTIFICIAL_DIRT, 0, MAX_CLEAN);
        }
      });
      if (fedCount > 0) {
        state.money -= totalCost;
        logLine('自動給餌器が' + fedCount + '匹に給餌しました（費用: ¥' + totalCost.toLocaleString('ja-JP') + '）。');
      }
    }
    
    // フィルタ
    if (state.equipment && state.equipment.filter) {
      state.tanks.forEach(function(tank) {
        if (tank.axolotl || tank.breedingPair || tank.juveniles || tank.egg) {
          tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) + 2, 0, MAX_CLEAN);
        }
      });
    }
  }

  function applyFeedToTanks(healthBonus, hungerBonus, cleanPenalty) {
    // アカムシは全体にあげる（全水槽の水質を下げる）
    state.tanks.forEach(function (tank) {
      if (tank.axolotl || tank.breedingPair) {
        tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - cleanPenalty, 0, MAX_CLEAN);
        if (tank.axolotl) {
          tank.axolotl.health = clamp(tank.axolotl.health + healthBonus, 0, MAX_HEALTH);
          tank.axolotl.hunger = clamp((tank.axolotl.hunger || 80) + hungerBonus, 0, MAX_HUNGER);
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function (ax) {
            ax.health = clamp(ax.health + healthBonus, 0, MAX_HEALTH);
            ax.hunger = clamp((ax.hunger || 80) + hungerBonus, 0, MAX_HUNGER);
          });
        }
      }
    });
  }

  function actFeedArtificial() {
    // 人工飼料は全体に一気にあげる
    var occupied = countOccupiedTanks();
    if (occupied === 0) {
      logLine('エサをあげる対象の水槽がない。');
      return;
    }
    var totalCost = FEED_ARTIFICIAL_COST * occupied;
    if (state.money < totalCost) {
      logLine('人工飼料代が足りない…。（¥' + totalCost.toLocaleString('ja-JP') + '）');
      return;
    }
    state.money -= totalCost;
    
    // 全水槽に人工飼料をあげる
    state.tanks.forEach(function(tank) {
      if (tank.axolotl || tank.breedingPair) {
        if (tank.axolotl) {
          tank.axolotl.health = clamp(tank.axolotl.health + FEED_ARTIFICIAL_HEALTH, 0, MAX_HEALTH);
          tank.axolotl.hunger = clamp((tank.axolotl.hunger || 80) + FEED_ARTIFICIAL_HUNGER, 0, MAX_HUNGER);
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(ax) {
            ax.health = clamp(ax.health + FEED_ARTIFICIAL_HEALTH, 0, MAX_HEALTH);
            ax.hunger = clamp((ax.hunger || 80) + FEED_ARTIFICIAL_HUNGER, 0, MAX_HUNGER);
          });
        }
        // 水質を下げる
        tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - FEED_ARTIFICIAL_DIRT, 0, MAX_CLEAN);
      }
    });
    
    logLine('人工飼料を全体にあげた。汚れ低・成長普通。');
    updateUI();
  }

  function actFeedBloodworm() {
    // アカムシは全体にあげる
    var occupied = countOccupiedTanks();
    if (occupied === 0) {
      logLine('エサをあげる対象の水槽がない。');
      return;
    }
    if (state.money < FEED_BLOODWORM_COST) {
      logLine('アカムシ代が足りない…。');
      return;
    }
    state.money -= FEED_BLOODWORM_COST;
    applyFeedToTanks(FEED_BLOODWORM_HEALTH, FEED_BLOODWORM_HUNGER, FEED_BLOODWORM_DIRT);
    logLine('アカムシを全体にあげた。汚れ高・成長やや高（ブースト）。');
    updateUI();
  }

  function doFeedTank(tankIdx, feedType) {
    var tank = state.tanks[tankIdx];
    if (!tank) {
      updateUI();
      return;
    }
    
    var cost = 0;
    var healthBonus = 0;
    var hungerBonus = 0;
    var cleanPenalty = 0;
    var feedName = '';
    
    if (feedType === 'artificial') {
      cost = FEED_ARTIFICIAL_COST;
      healthBonus = FEED_ARTIFICIAL_HEALTH;
      hungerBonus = FEED_ARTIFICIAL_HUNGER;
      cleanPenalty = FEED_ARTIFICIAL_DIRT;
      feedName = '人工飼料';
    } else if (feedType === 'earthworm') {
      cost = FEED_EARTHWORM_COST;
      healthBonus = FEED_EARTHWORM_HEALTH;
      hungerBonus = FEED_EARTHWORM_HUNGER;
      cleanPenalty = FEED_EARTHWORM_DIRT;
      feedName = 'ミミズ';
    } else {
      updateUI();
      return;
    }
    
    if (state.money < cost) {
      logLine(feedName + '代が足りない…。（¥' + cost.toLocaleString('ja-JP') + '）');
      updateUI();
      return;
    }
    
    state.money -= cost;
    
    // 指定した水槽のみにエサをあげる
    if (tank.axolotl) {
      tank.axolotl.health = clamp(tank.axolotl.health + healthBonus, 0, MAX_HEALTH);
      tank.axolotl.hunger = clamp((tank.axolotl.hunger || 80) + hungerBonus, 0, MAX_HUNGER);
    }
    if (tank.breedingPair) {
      tank.breedingPair.forEach(function(ax) {
        ax.health = clamp(ax.health + healthBonus, 0, MAX_HEALTH);
        ax.hunger = clamp((ax.hunger || 80) + hungerBonus, 0, MAX_HUNGER);
      });
    }
    
    // 水質を下げる
    tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - cleanPenalty, 0, MAX_CLEAN);
    
    logLine('水槽' + (tankIdx + 1) + 'に' + feedName + 'をあげた。');
    updateUI();
  }

  function actFeedEarthworm() {
    // ミミズは全体に一気にあげる
    var occupied = countOccupiedTanks();
    if (occupied === 0) {
      logLine('エサをあげる対象の水槽がない。');
      return;
    }
    var totalCost = FEED_EARTHWORM_COST * occupied;
    if (state.money < totalCost) {
      logLine('ミミズ代が足りない…。（¥' + totalCost.toLocaleString('ja-JP') + '）');
      return;
    }
    state.money -= totalCost;
    
    // 全水槽にミミズをあげる
    state.tanks.forEach(function(tank) {
      if (tank.axolotl || tank.breedingPair) {
        if (tank.axolotl) {
          tank.axolotl.health = clamp(tank.axolotl.health + FEED_EARTHWORM_HEALTH, 0, MAX_HEALTH);
          tank.axolotl.hunger = clamp((tank.axolotl.hunger || 80) + FEED_EARTHWORM_HUNGER, 0, MAX_HUNGER);
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(ax) {
            ax.health = clamp(ax.health + FEED_EARTHWORM_HEALTH, 0, MAX_HEALTH);
            ax.hunger = clamp((ax.hunger || 80) + FEED_EARTHWORM_HUNGER, 0, MAX_HUNGER);
          });
        }
        // 水質を下げる
        tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - FEED_EARTHWORM_DIRT, 0, MAX_CLEAN);
      }
    });
    
    logLine('ミミズを全体にあげた。汚れ中・成長最高（育成特化）。');
    updateUI();
  }

  function actClean() {
    // 即発動：デフォルトの水替え方法で全体水替え
    var waterChangeType = state.waterChangeType || 'normal';
    var cost = 500;
    var bonus = 25;
    if (waterChangeType === 'partial') {
      cost = WATER_CHANGE_PARTIAL_COST;
      bonus = WATER_CHANGE_PARTIAL_BONUS;
    } else if (waterChangeType === 'full') {
      cost = WATER_CHANGE_FULL_COST;
      bonus = WATER_CHANGE_FULL_BONUS;
    }
    applyWaterChange(0, true, cost, bonus);
  }

  function doCleanTank(tankIdx) {
    // 即発動：デフォルトの水替え方法で個別水替え
    var waterChangeType = state.waterChangeType || 'normal';
    var cost = 500;
    var bonus = 25;
    if (waterChangeType === 'partial') {
      cost = WATER_CHANGE_PARTIAL_COST;
      bonus = WATER_CHANGE_PARTIAL_BONUS;
    } else if (waterChangeType === 'full') {
      cost = WATER_CHANGE_FULL_COST;
      bonus = WATER_CHANGE_FULL_BONUS;
    }
    applyWaterChange(tankIdx, false, cost, bonus);
  }

  function openGlobalFeedModal() {
    // 即発動：デフォルトの餌タイプで全体給餌
    var feedType = state.feedType || 'artificial';
    if (feedType === 'artificial') {
      actFeedArtificial();
    } else if (feedType === 'bloodworm') {
      actFeedBloodworm();
    } else if (feedType === 'earthworm') {
      actFeedEarthworm();
    }
  }

  function openTankFeedModal(tankIdx) {
    // 即発動：デフォルトの餌タイプで給餌
    doFeedTank(tankIdx, state.feedType || 'artificial');
  }

  function openWaterChangeSelectionModal(tankIdx, isGlobal) {
    var overlay = document.getElementById('axOverlayWaterChange');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ax-overlay';
      overlay.id = 'axOverlayWaterChange';
      overlay.innerHTML = '<div class="ax-overlay-box"><h2>水替え方法を選ぶ</h2><p style="font-size:12px; margin-bottom:8px;">水替え方法を選択してください。</p><div id="axWaterChangeOptions" style="margin-bottom:12px;"></div><button type="button" class="btn" style="background:#64748b; border-color:#64748b;" id="axWaterChangeCancel">キャンセル</button></div>';
      document.body.appendChild(overlay);
      document.getElementById('axWaterChangeCancel').addEventListener('click', function() {
        $('axOverlayWaterChange').classList.remove('visible');
      });
    }
    
    var options = document.getElementById('axWaterChangeOptions');
    options.innerHTML = '';
    
    var methods = [
      { name: '部分水替え', cost: WATER_CHANGE_PARTIAL_COST, bonus: WATER_CHANGE_PARTIAL_BONUS },
      { name: '通常水替え', cost: 500, bonus: 25 },
      { name: '全換水', cost: WATER_CHANGE_FULL_COST, bonus: WATER_CHANGE_FULL_BONUS }
    ];
    
    methods.forEach(function(method) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ax-btn';
      btn.style.width = '100%';
      btn.style.marginBottom = '8px';
      btn.textContent = method.name + ' +' + method.bonus + ' / ¥' + method.cost.toLocaleString('ja-JP');
      btn.dataset.cost = String(method.cost);
      btn.dataset.bonus = String(method.bonus);
      if (state.money < method.cost) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      }
      btn.addEventListener('click', function() {
        if (!this.disabled) {
          applyWaterChange(tankIdx, isGlobal, parseInt(this.dataset.cost, 10), parseInt(this.dataset.bonus, 10));
        }
      });
      options.appendChild(btn);
    });
    
    overlay.dataset.tankIndex = String(tankIdx);
    overlay.dataset.isGlobal = String(isGlobal);
    overlay.classList.add('visible');
  }

  function applyWaterChange(tankIdx, isGlobal, cost, bonus) {
    if (isGlobal) {
      var occupiedTanks = state.tanks.filter(function(t) {
        return t.axolotl || t.breedingPair || t.juveniles || t.egg;
      });
      
      if (occupiedTanks.length === 0) {
        logLine('水替えする対象の水槽がない。');
        $('axOverlayWaterChange').classList.remove('visible');
        return;
      }
      
      var totalCost = cost * occupiedTanks.length;
      if (state.money < totalCost) {
        logLine('水換えの費用が足りない…。（¥' + totalCost.toLocaleString('ja-JP') + '）');
        $('axOverlayWaterChange').classList.remove('visible');
        return;
      }
      
      state.money -= totalCost;
      
      occupiedTanks.forEach(function(tank) {
        tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) + bonus, 0, MAX_CLEAN);
      });
      
      logLine('全水槽の水を一気にかえた。水質が上がった。');
    } else {
      var tank = state.tanks[tankIdx];
      if (!tank) {
        $('axOverlayWaterChange').classList.remove('visible');
        updateUI();
        return;
      }
      
      if (state.money < cost) {
        logLine('水換えの費用が足りない…。（¥' + cost.toLocaleString('ja-JP') + '）');
        $('axOverlayWaterChange').classList.remove('visible');
        updateUI();
        return;
      }
      
      state.money -= cost;
      tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) + bonus, 0, MAX_CLEAN);
      logLine('水槽' + (tankIdx + 1) + 'の水をかえた。水質が上がった。');
    }
    
    $('axOverlayWaterChange').classList.remove('visible');
    updateUI();
  }

  function actSellTank(idx) {
    var tank = state.tanks[idx];
    if (!tank || !tank.axolotl) return;
    var price = calcPrice(tank.axolotl);
    state.money += price;
    var typeName = typeLabel(tank.axolotl.type);
    if (axolotlRegistry[tank.axolotl.id]) {
      axolotlRegistry[tank.axolotl.id].removed = true;
    }
    tank.axolotl = null;
    tank.note = '空き水槽';
    tank.baby = false;
    state.reputation = clamp(state.reputation + 2, 0, MAX_REP);
    
    // 実績チェック
    if (!state.achievements.first_sale) {
      state.achievements.first_sale = true;
      logLine('【実績解除】初めての販売');
    }
    
    logLine(typeName + 'のウパを' + formatMoney(price) + 'で販売した。');
    updateUI();
  }

  function sellBreedingPair(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.breedingPair) return;
    var pair = tank.breedingPair;
    var totalPrice = 0;
    pair.forEach(function (ax) {
      var price = calcPrice(ax);
      totalPrice += price;
      if (axolotlRegistry[ax.id]) {
        axolotlRegistry[ax.id].removed = true;
      }
    });
    state.money += totalPrice;
    tank.breedingPair = null;
    tank.relationshipMeter = null;
    tank.note = '空き水槽';
    logLine('同棲中のペアを' + formatMoney(totalPrice) + 'で販売した。');
    updateUI();
  }

  function separateBreedingPair(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.breedingPair) return;
    var pair = tank.breedingPair;
    var emptySlots = [];
    state.tanks.forEach(function (t, i) {
      if (i !== tankIdx && !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles) {
        emptySlots.push(i);
      }
    });
    
    // 空き水槽があれば移動、なければ売却
    if (emptySlots.length >= pair.length) {
      for (var i = 0; i < pair.length; i++) {
        state.tanks[emptySlots[i]].axolotl = pair[i];
        state.tanks[emptySlots[i]].note = '親ウパ';
      }
      tank.breedingPair = null;
      tank.breedingMonthsLeft = null;
      tank.relationshipMeter = null;
      tank.note = '空き水槽';
      logLine('繁殖ペアを離別させた。');
    } else {
      // 空き水槽が足りない場合は売却
      var totalPrice = 0;
      pair.forEach(function (ax) {
        var price = calcPrice(ax);
        totalPrice += price;
        if (axolotlRegistry[ax.id]) {
          axolotlRegistry[ax.id].removed = true;
        }
      });
      state.money += totalPrice;
      tank.breedingPair = null;
      tank.breedingMonthsLeft = null;
      tank.relationshipMeter = null;
      tank.note = '空き水槽';
      logLine('空き水槽がないため、繁殖ペアを' + formatMoney(totalPrice) + 'で販売した。');
    }
    updateUI();
  }

  function sellEggs(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.egg) return;
    var eggCount = tank.eggCount || 500;
    var eggPrice = Math.floor(eggCount * 50); // 卵1個50円
    state.money += eggPrice;
    tank.egg = false;
    tank.eggCount = null;
    tank.eggParentTypes = null;
    tank.eggParentIds = null;
    tank.eggParentShades = null;
    tank.eggRelationshipMeter = null;
    tank.hatchMonthsLeft = null;
    tank.note = '空き水槽';
    logLine('卵' + eggCount + '個を' + formatMoney(eggPrice) + 'で販売した。');
    updateUI();
  }

  function getAdultTanks() {
    return state.tanks.map(function (t, idx) {
      return { tank: t, idx: idx };
    }).filter(function (x) {
      return x.tank.axolotl && !x.tank.breedingPair && x.tank.axolotl.age >= 12 && x.tank.axolotl.health >= 50 && !x.tank.axolotl.injured && !x.tank.axolotl.sick;
    });
  }


  function openBreedOverlay() {
    var adults = getAdultTanks();
    var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (adults.length < 2 || !empty) {
      logLine('12ヶ月以上の成体2匹と空き水槽が必要だ。');
      return;
    }
    var males = adults.filter(function (x) { return x.tank.axolotl.sex === 'オス'; });
    var females = adults.filter(function (x) { return x.tank.axolotl.sex === 'メス'; });
    if (males.length === 0 || females.length === 0) {
      logLine('交配にはオスとメスが1匹ずつ必要だ。');
      return;
    }
    var sel1 = $('axBreedParent1');
    var sel2 = $('axBreedParent2');
    
    // オス項目
    sel1.innerHTML = '';
    males.forEach(function (x) {
      var opt = document.createElement('option');
      opt.value = String(x.idx);
      var namePart = x.tank.axolotl.name || typeLabel(x.tank.axolotl.type);
      var displayName = (x.tank.axolotl.familyName ? x.tank.axolotl.familyName + ' ' : '') + namePart;
      opt.textContent = '水槽' + (x.idx + 1) + '：' + displayName;
      sel1.appendChild(opt);
    });
    
    // メス項目
    sel2.innerHTML = '';
    females.forEach(function (x) {
      var opt = document.createElement('option');
      opt.value = String(x.idx);
      var namePart = x.tank.axolotl.name || typeLabel(x.tank.axolotl.type);
      var displayName = (x.tank.axolotl.familyName ? x.tank.axolotl.familyName + ' ' : '') + namePart;
      opt.textContent = '水槽' + (x.idx + 1) + '：' + displayName;
      sel2.appendChild(opt);
    });
    
    // 前回の選択を復元
    var last1 = state.lastBreedParent1;
    var last2 = state.lastBreedParent2;
    var validLast1 = males.some(function (x) { return x.idx === last1; });
    var validLast2 = females.some(function (x) { return x.idx === last2; });
    
    if (validLast1) {
      sel1.value = String(last1);
    } else if (males.length > 0) {
      sel1.value = String(males[0].idx);
    }
    
    if (validLast2) {
      sel2.value = String(last2);
    } else if (females.length > 0) {
      sel2.value = String(females[0].idx);
    }
    
    $('axOverlayBreed').classList.add('visible');
  }

  function openLineageIntroductionOverlay(parent1Idx, parent2Idx) {
    var t1 = state.tanks[parent1Idx];
    var t2 = state.tanks[parent2Idx];
    if (!t1 || !t2 || !t1.axolotl || !t2.axolotl) {
      logLine('繁殖ペアが選択されていません。');
      return;
    }
    
    // 外部購入可能な個体を取得（固定化済み種類のみ）
    var fixedTypes = Object.keys(state.fixedTypes).filter(function(type) {
      return state.fixedTypes[type] === true;
    });
    
    if (fixedTypes.length === 0) {
      logLine('血統導入に使用できる固定化済み個体がありません。');
      return;
    }
    
    // モーダルを作成または取得
    var overlay = document.getElementById('axOverlayLineageIntroduction');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ax-overlay';
      overlay.id = 'axOverlayLineageIntroduction';
      overlay.innerHTML = '<div class="ax-overlay-box"><h2>血統導入</h2><p style="font-size:12px; margin-bottom:8px;">外部購入個体を選んで、近親度を-20減少させます。導入個体は消費されます。</p><div id="axLineageIntroductionList" style="margin-bottom:12px; max-height:50vh; overflow-y:auto;"></div><button type="button" class="btn" style="background:#64748b; border-color:#64748b;" id="axLineageIntroductionCancel">キャンセル</button></div>';
      document.body.appendChild(overlay);
      document.getElementById('axLineageIntroductionCancel').addEventListener('click', function() {
        $('axOverlayLineageIntroduction').classList.remove('visible');
      });
    }
    
    var list = document.getElementById('axLineageIntroductionList');
    list.innerHTML = '';
    
    // 固定化済み種類の成体を表示
    fixedTypes.forEach(function(type) {
      var bandPrices = sizePriceTable[type] || sizePriceTable.nomal;
      var price = bandPrices[7] || bandPrices[bandPrices.length - 1]; // 成体価格
      var totalCost = price + LINEAGE_INTRODUCTION_FEE;
      
      var div = document.createElement('div');
      div.style.marginBottom = '8px';
      div.style.padding = '8px';
      div.style.border = '1px solid #bfdbfe';
      div.style.borderRadius = '6px';
      
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ax-btn';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.innerHTML = '<img src="' + typeImagePath(type) + '" alt="" style="width:32px;height:32px;vertical-align:middle;margin-right:8px;image-rendering:pixelated;">' +
        '<span>' + typeLabel(type) + ' 成体</span>' +
        '<span style="float:right;">¥' + totalCost.toLocaleString('ja-JP') + '</span>';
      btn.dataset.type = type;
      btn.dataset.price = String(price);
      if (state.money < totalCost) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      }
      btn.addEventListener('click', function() {
        if (!this.disabled) {
          applyLineageIntroduction(parent1Idx, parent2Idx, this.dataset.type, parseInt(this.dataset.price, 10));
        }
      });
      div.appendChild(btn);
      list.appendChild(div);
    });
    
    overlay.classList.add('visible');
  }

  function applyLineageIntroduction(parent1Idx, parent2Idx, donorType, donorPrice) {
    var t1 = state.tanks[parent1Idx];
    var t2 = state.tanks[parent2Idx];
    if (!t1 || !t2 || !t1.axolotl || !t2.axolotl) {
      logLine('繁殖ペアが選択されていません。');
      $('axOverlayLineageIntroduction').classList.remove('visible');
      return;
    }
    
    var totalCost = donorPrice + LINEAGE_INTRODUCTION_FEE;
    if (state.money < totalCost) {
      logLine('資金が足りません。');
      $('axOverlayLineageIntroduction').classList.remove('visible');
      return;
    }
    
    state.money -= totalCost;
    
    // 近親度を計算して減少
    var parent1Id = t1.axolotl.id;
    var parent2Id = t2.axolotl.id;
    var currentInbreeding = calculateInbreedingCoefficient(parent1Id, parent2Id);
    var newInbreeding = Math.max(0, currentInbreeding - LINEAGE_INTRODUCTION_REDUCTION);
    
    // 近親度を保存する方法がないため、ログのみ
    logLine('血統導入を実行しました。近親度が' + currentInbreeding + 'から' + newInbreeding + 'に減少しました（導入個体: ' + typeLabel(donorType) + '、費用: ¥' + totalCost.toLocaleString('ja-JP') + '）。');
    
    // 注意: 実際の近親度減少は次回の繁殖時に反映されます（現在の実装では近親度は動的に計算されるため）
    
    $('axOverlayLineageIntroduction').classList.remove('visible');
    updateUI();
  }

  function doBreed(parent1Idx, parent2Idx) {
    if (parent1Idx === parent2Idx) {
      logLine('別々の2匹を選んでください。');
      return;
    }
    var t1 = state.tanks[parent1Idx];
    var t2 = state.tanks[parent2Idx];
    var emptyIdx = state.tanks.findIndex(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (!t1 || !t2 || !t1.axolotl || !t2.axolotl || emptyIdx < 0) {
      logLine('条件を満たしていません。');
      return;
    }
    if (t1.axolotl.sex === t2.axolotl.sex) {
      logLine('オスとメスを1匹ずつ選んでください。同じ性別では交配できません。');
      return;
    }
    if (t1.axolotl.age < 12 || t1.axolotl.health < 50 || t2.axolotl.age < 12 || t2.axolotl.health < 50) {
      logLine('12ヶ月以上の成体で健康な2匹を選んでください。');
      return;
    }
    state.lastBreedParent1 = parent1Idx;
    state.lastBreedParent2 = parent2Idx;
    var ax1 = t1.axolotl;
    var ax2 = t2.axolotl;
    t1.axolotl = null;
    t1.note = '空き水槽';
    t2.axolotl = null;
    t2.note = '空き水槽';
    var breedingTank = state.tanks[emptyIdx];
    breedingTank.breedingPair = [ax1, ax2];
    breedingTank.relationshipMeter = 50; // 初期関係メーター
    breedingTank.note = '同棲中（関係50）';
    logLine('水槽' + (emptyIdx + 1) + 'に' + typeLabel(ax1.type) + 'と' + typeLabel(ax2.type) + 'を入れて同棲を開始した。');
    $('axOverlayBreed').classList.remove('visible');
    updateUI();
  }

  function openTreatmentOverlay() {
    var sickTanks = state.tanks.map(function (t, idx) {
      return { tank: t, idx: idx };
    }).filter(function (x) {
      return x.tank.axolotl && x.tank.axolotl.sick && !x.tank.axolotl.underTreatment;
    });
    if (sickTanks.length === 0) {
      logLine('治療が必要なウパがいない。');
      return;
    }
    if (state.money < TREATMENT_COST) {
      logLine('治療費が足りない…。');
      return;
    }
    var list = $('axTreatTankList');
    list.innerHTML = '';
    sickTanks.forEach(function (x) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ax-btn treat';
      btn.style.marginBottom = '6px';
      btn.textContent = '水槽' + (x.idx + 1) + '：' + typeLabel(x.tank.axolotl.type) + '（¥5,000）';
      btn.dataset.tankIndex = String(x.idx);
      btn.addEventListener('click', function () {
        doTreatment(parseInt(this.dataset.tankIndex, 10));
      });
      list.appendChild(btn);
    });
    $('axOverlayTreat').classList.add('visible');
  }

  function doTreatment(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.axolotl || !tank.axolotl.sick || tank.axolotl.underTreatment || state.money < TREATMENT_COST) {
      $('axOverlayTreat').classList.remove('visible');
      updateUI();
      return;
    }
    state.money -= TREATMENT_COST;
    tank.axolotl.underTreatment = true;
    logLine('水槽' + (tankIdx + 1) + 'の' + typeLabel(tank.axolotl.type) + 'の治療を開始した。');
    $('axOverlayTreat').classList.remove('visible');
    updateUI();
  }

  function fillBuyTypeList(selectedType, isAuction, sizeBand, sex) {
    var list = $('axBuyTypeList');
    if (!list) return;
    
    if (isAuction && state.auctionAvailable && state.auctionType === selectedType) {
      // オークションの場合は1つのみ表示
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ax-buy-type-btn ax-auction-btn';
      btn.innerHTML = '<img src="' + typeImagePath(selectedType) + '" alt="" class="ax-buy-type-img">' +
        '<span class="ax-buy-type-name">🔴 オークション出品</span>' +
        '<span class="ax-buy-type-price">' + formatMoney(state.auctionPrice) + '</span>';
      btn.dataset.type = selectedType;
      btn.dataset.band = String(7); // 成体
      btn.dataset.price = String(state.auctionPrice);
      btn.dataset.isAuction = 'true';
      if (state.money < state.auctionPrice) btn.disabled = true;
      btn.addEventListener('click', function () {
        doBuy(this.dataset.type, parseInt(this.dataset.band, 10), parseInt(this.dataset.price, 10), true);
      });
      list.appendChild(btn);
      return;
    }
    
    // サイズ選択（3-5cmまたは成体）
    var bandPrices = sizePriceTable[selectedType] || sizePriceTable.nomal;
    var price = bandPrices[sizeBand || 1]; // デフォルトは3-5cm
    if (!price) return;
    
    // 品切れチェック（日によって品切れ中）
    var stockKey = selectedType + '_' + sizeBand + '_' + (sex || 'any');
    if (!state.shopStockDaily) state.shopStockDaily = {};
    if (state.shopStockDaily[stockKey] === undefined) {
      // 30%の確率で品切れ
      state.shopStockDaily[stockKey] = Math.random() >= 0.3;
    }
    var isOutOfStock = !state.shopStockDaily[stockKey];
    
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ax-buy-type-btn';
    var sizeLabel = sizeBand === 7 ? '成体' : '3-5cm';
    var sexLabel = sex ? (sex === 'オス' ? ' ♂' : ' ♀') : '';
    var stockStatus = isOutOfStock ? ' <span style="color:#dc2626; font-size:10px;">（品切れ）</span>' : '';
    btn.innerHTML = '<img src="' + typeImagePath(selectedType) + '" alt="" class="ax-buy-type-img">' +
      '<span class="ax-buy-type-name">' + typeLabel(selectedType) + ' (' + sizeLabel + sexLabel + ')' + stockStatus + '</span>' +
      '<span class="ax-buy-type-price">' + formatMoney(price) + '</span>';
    btn.dataset.type = selectedType;
    btn.dataset.band = String(sizeBand || 1);
    btn.dataset.sex = sex || '';
    btn.dataset.price = String(price);
    if (state.money < price || isOutOfStock) btn.disabled = true;
    if (isOutOfStock) btn.style.opacity = '0.5';
    btn.addEventListener('click', function () {
      if (!this.disabled && !isOutOfStock) {
        doBuy(this.dataset.type, parseInt(this.dataset.band, 10), parseInt(this.dataset.price, 10), false, this.dataset.sex || null);
      }
    });
    list.appendChild(btn);
  }

  function openBuyOverlay() {
    var tabsEl = $('axBuyTabs');
    tabsEl.innerHTML = '';
    
    // 固定化された種類のみ
    var fixedTypes = Object.keys(state.fixedTypes).filter(function(type) {
      return state.fixedTypes[type] === true;
    });
    
    // 「生体」タブ（固定化された種類のみ）
    var normalTab = document.createElement('button');
    normalTab.type = 'button';
    normalTab.className = 'ax-buy-tab';
    normalTab.textContent = '生体';
    normalTab.dataset.tab = 'normal';
    normalTab.classList.add('active');
    normalTab.addEventListener('click', function () {
      tabsEl.querySelectorAll('.ax-buy-tab').forEach(function (t) { t.classList.remove('active'); });
      normalTab.classList.add('active');
      showBuyTypeList('normal');
    });
    tabsEl.appendChild(normalTab);
    
    // 「設備」タブ
    var equipmentTab = document.createElement('button');
    equipmentTab.type = 'button';
    equipmentTab.className = 'ax-buy-tab';
    equipmentTab.textContent = '設備';
    equipmentTab.dataset.tab = 'equipment';
    equipmentTab.addEventListener('click', function () {
      tabsEl.querySelectorAll('.ax-buy-tab').forEach(function (t) { t.classList.remove('active'); });
      equipmentTab.classList.add('active');
      showBuyTypeList('equipment');
    });
    tabsEl.appendChild(equipmentTab);
    
    
    showBuyTypeList('normal');
    
    $('axOverlayBuy').classList.add('visible');
  }

  function showBuyTypeList(tabType) {
    var list = $('axBuyTypeList');
    list.innerHTML = '';
    
    if (tabType === 'auction' && state.auctionAvailable && state.auctionType) {
      // オークション：固定化していない個体が稀に売られる
      fillBuyTypeList(state.auctionType, true);
    } else if (tabType === 'equipment') {
      // 設備タブ：自動設備と水槽追加
      var equipmentDiv = document.createElement('div');
      equipmentDiv.style.padding = '12px';
      
      // 自動給餌器
      var autoFeederBtn = document.createElement('button');
      autoFeederBtn.type = 'button';
      autoFeederBtn.className = 'ax-btn';
      autoFeederBtn.style.width = '100%';
      autoFeederBtn.style.marginBottom = '8px';
      if (state.equipment && state.equipment.autoFeeder) {
        autoFeederBtn.disabled = true;
        autoFeederBtn.innerHTML = '<span class="label">自動給餌器（購入済み）</span>';
      } else if (state.money < EQUIPMENT_AUTO_FEEDER_COST) {
        autoFeederBtn.disabled = true;
        autoFeederBtn.innerHTML = '<span class="label">自動給餌器 ¥' + EQUIPMENT_AUTO_FEEDER_COST.toLocaleString('ja-JP') + '（資金不足）</span>';
      } else {
        autoFeederBtn.disabled = false;
        autoFeederBtn.innerHTML = '<span class="label">自動給餌器 ¥' + EQUIPMENT_AUTO_FEEDER_COST.toLocaleString('ja-JP') + '</span>';
      }
      autoFeederBtn.addEventListener('click', function () {
        if (!state.ended && !this.disabled) {
          buyEquipment('autoFeeder', EQUIPMENT_AUTO_FEEDER_COST);
        }
      });
      equipmentDiv.appendChild(autoFeederBtn);
      
      // フィルタ
      var filterBtn = document.createElement('button');
      filterBtn.type = 'button';
      filterBtn.className = 'ax-btn';
      filterBtn.style.width = '100%';
      filterBtn.style.marginBottom = '8px';
      if (state.equipment && state.equipment.filter) {
        filterBtn.disabled = true;
        filterBtn.innerHTML = '<span class="label">フィルタ（購入済み）</span>';
      } else if (state.money < EQUIPMENT_FILTER_COST) {
        filterBtn.disabled = true;
        filterBtn.innerHTML = '<span class="label">フィルタ ¥' + EQUIPMENT_FILTER_COST.toLocaleString('ja-JP') + '（資金不足）</span>';
      } else {
        filterBtn.disabled = false;
        filterBtn.innerHTML = '<span class="label">フィルタ ¥' + EQUIPMENT_FILTER_COST.toLocaleString('ja-JP') + '</span>';
      }
      filterBtn.addEventListener('click', function () {
        if (!state.ended && !this.disabled) {
          buyEquipment('filter', EQUIPMENT_FILTER_COST);
        }
      });
      equipmentDiv.appendChild(filterBtn);
      
      // 底面掃除機
      var bottomCleanerBtn = document.createElement('button');
      bottomCleanerBtn.type = 'button';
      bottomCleanerBtn.className = 'ax-btn';
      bottomCleanerBtn.style.width = '100%';
      bottomCleanerBtn.style.marginBottom = '8px';
      if (state.equipment && state.equipment.bottomCleaner) {
        bottomCleanerBtn.disabled = true;
        bottomCleanerBtn.innerHTML = '<span class="label">底面掃除機（購入済み）</span>';
      } else if (state.money < EQUIPMENT_BOTTOM_CLEANER_COST) {
        bottomCleanerBtn.disabled = true;
        bottomCleanerBtn.innerHTML = '<span class="label">底面掃除機 ¥' + EQUIPMENT_BOTTOM_CLEANER_COST.toLocaleString('ja-JP') + '（資金不足）</span>';
      } else {
        bottomCleanerBtn.disabled = false;
        bottomCleanerBtn.innerHTML = '<span class="label">底面掃除機 ¥' + EQUIPMENT_BOTTOM_CLEANER_COST.toLocaleString('ja-JP') + '</span>';
      }
      bottomCleanerBtn.addEventListener('click', function () {
        if (!state.ended && !this.disabled) {
          buyEquipment('bottomCleaner', EQUIPMENT_BOTTOM_CLEANER_COST);
        }
      });
      equipmentDiv.appendChild(bottomCleanerBtn);
      
      // 餌のアップグレード
      var feedUpgradeDiv = document.createElement('div');
      feedUpgradeDiv.style.marginTop = '16px';
      feedUpgradeDiv.style.paddingTop = '16px';
      feedUpgradeDiv.style.borderTop = '2px solid #e5e7eb';
      
      var feedUpgradeTitle = document.createElement('div');
      feedUpgradeTitle.style.fontSize = '14px';
      feedUpgradeTitle.style.fontWeight = 'bold';
      feedUpgradeTitle.style.marginBottom = '8px';
      feedUpgradeTitle.style.color = '#0f172a';
      feedUpgradeTitle.textContent = '餌のアップグレード';
      feedUpgradeDiv.appendChild(feedUpgradeTitle);
      
      var currentFeedLabel = document.createElement('div');
      currentFeedLabel.style.fontSize = '12px';
      currentFeedLabel.style.color = '#64748b';
      currentFeedLabel.style.marginBottom = '8px';
      var currentFeedName = state.feedType === 'artificial' ? '💊 人工餌' : state.feedType === 'bloodworm' ? 'アカムシ' : '🪱 みみず';
      currentFeedLabel.textContent = '現在: ' + currentFeedName;
      feedUpgradeDiv.appendChild(currentFeedLabel);
      
      var feedTypes = [
        { type: 'artificial', name: '💊 人工餌', cost: 0, desc: '基本の餌' },
        { type: 'bloodworm', name: 'アカムシ', cost: 10000, desc: '汚れ高・成長やや高' },
        { type: 'earthworm', name: '🪱 みみず', cost: 30000, desc: '汚れ中・成長最高' }
      ];
      
      feedTypes.forEach(function(feed) {
        var feedBtn = document.createElement('button');
        feedBtn.type = 'button';
        feedBtn.className = 'ax-btn';
        feedBtn.style.width = '100%';
        feedBtn.style.marginBottom = '8px';
        feedBtn.style.textAlign = 'left';
        feedBtn.style.padding = '10px';
        
        if (state.feedType === feed.type) {
          feedBtn.disabled = true;
          feedBtn.innerHTML = '<span class="label">' + feed.name + '（使用中）</span>';
          feedBtn.style.opacity = '0.7';
        } else if (state.feedType === 'artificial' && feed.type === 'bloodworm') {
          // 人工餌からアカムシへのアップグレード
          if (state.money < feed.cost) {
            feedBtn.disabled = true;
            feedBtn.innerHTML = '<span class="label">' + feed.name + ' ¥' + feed.cost.toLocaleString('ja-JP') + '（資金不足）</span>';
          } else {
            feedBtn.disabled = false;
            feedBtn.innerHTML = '<span class="label">' + feed.name + ' ¥' + feed.cost.toLocaleString('ja-JP') + ' - ' + feed.desc + '</span>';
          }
        } else if (state.feedType === 'bloodworm' && feed.type === 'earthworm') {
          // アカムシからみみずへのアップグレード
          if (state.money < feed.cost) {
            feedBtn.disabled = true;
            feedBtn.innerHTML = '<span class="label">' + feed.name + ' ¥' + feed.cost.toLocaleString('ja-JP') + '（資金不足）</span>';
          } else {
            feedBtn.disabled = false;
            feedBtn.innerHTML = '<span class="label">' + feed.name + ' ¥' + feed.cost.toLocaleString('ja-JP') + ' - ' + feed.desc + '</span>';
          }
        } else {
          feedBtn.disabled = true;
          feedBtn.innerHTML = '<span class="label">' + feed.name + '（未解放）</span>';
        }
        
        feedBtn.addEventListener('click', function () {
          if (!state.ended && !this.disabled) {
            upgradeFeedType(feed.type, feed.cost);
          }
        });
        feedUpgradeDiv.appendChild(feedBtn);
      });
      
      equipmentDiv.appendChild(feedUpgradeDiv);
      
      // 水槽追加
      var addTankBtn = document.createElement('button');
      addTankBtn.type = 'button';
      addTankBtn.className = 'ax-btn';
      addTankBtn.id = 'axBuyAddTankEquipment';
      addTankBtn.style.width = '100%';
      if (state.tanks.length >= MAX_TANKS) {
        addTankBtn.disabled = true;
        addTankBtn.innerHTML = '<span class="label">水槽は最大数に達しています</span>';
      } else if (state.money < 20000) {
        addTankBtn.disabled = true;
        addTankBtn.innerHTML = '<span class="label">水槽を増やす ¥20,000（資金不足）</span>';
      } else {
        addTankBtn.disabled = false;
        addTankBtn.innerHTML = '<span class="label">水槽を増やす ¥20,000</span>';
      }
      addTankBtn.addEventListener('click', function () {
        if (!state.ended && !this.disabled) {
          actAddTank();
        }
      });
      equipmentDiv.appendChild(addTankBtn);
      list.appendChild(equipmentDiv);
    } else {
      // 生体タブ：固定化された種類のみ表示（3-5cmは性別ランダム、成体はオスとメスそれぞれ）
      var fixedTypes = Object.keys(state.fixedTypes).filter(function(type) {
        return state.fixedTypes[type] === true;
      });
      fixedTypes.forEach(function(type) {
        // 3-5cm（性別ランダム、一種類のみ）
        fillBuyTypeList(type, false, 1);
        // 成体 オス
        fillBuyTypeList(type, false, 7, 'オス');
        // 成体 メス
        fillBuyTypeList(type, false, 7, 'メス');
      });
    }
  }

  function doBuy(type, sizeBand, price, isAuction, sex) {
    var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (!empty) {
      logLine('空き水槽がないので、新しいウパをお迎えできない。');
      $('axOverlayBuy').classList.remove('visible');
      updateUI();
      return;
    }
    if (state.money < price) {
      logLine('購入できません。資金が足りません。');
      $('axOverlayBuy').classList.remove('visible');
      updateUI();
      return;
    }
    state.money -= price;
    var age = ageFromSizeBand(sizeBand);
    var ax = createAxolotl(age, type, null, null);
    // 性別を指定
    if (sex) {
      ax.sex = sex;
      if (axolotlRegistry[ax.id]) {
        axolotlRegistry[ax.id].sex = sex;
      }
    }
      empty.axolotl = ax;
      empty.baby = age < 12;
      empty.note = 'ショップで購入したウパ';
      if (empty.clean === undefined) empty.clean = 80;
      if (empty.poop === undefined) empty.poop = false;
      
      // ショップ購入個体はisFixedLineage=true（固定化済み種のみ買えるため）
      ax.isFixedLineage = true;
      if (axolotlRegistry[ax.id]) {
        axolotlRegistry[ax.id].isFixedLineage = true;
      }
    
    // 図鑑に追加
    state.obtainedTypes[type] = true;
    
    if (isAuction) {
      logLine('【オークション落札】' + typeLabel(type) + 'を' + formatMoney(price) + 'で購入した！');
      state.auctionAvailable = false;
      state.auctionType = null;
      state.auctionPrice = 0;
      updateAuctionButton();
    } else {
      var sizeLabel = sizeBand === 7 ? '成体' : '3-5cm';
      var sexLabel = sex ? (sex === 'オス' ? '♂' : '♀') : '';
      logLine(typeLabel(type) + '（' + sizeLabel + sexLabel + '）を1匹お迎えした。');
    }
    $('axOverlayBuy').classList.remove('visible');
    updateUI();
  }

  function buyEquipment(equipmentType, cost) {
    if (state.money < cost) {
      logLine('資金が足りません。');
      return;
    }
    
    if (!state.equipment) {
      state.equipment = { autoFeeder: false, filter: false, bottomCleaner: false };
    }
    
    state.money -= cost;
    state.equipment[equipmentType] = true;
    
    var equipmentNames = {
      autoFeeder: '自動給餌器',
      filter: 'フィルタ',
      bottomCleaner: '底面掃除機'
    };
    
    logLine(equipmentNames[equipmentType] + 'を購入しました。');
    $('axOverlayBuy').classList.remove('visible');
    updateUI();
  }

  function upgradeFeedType(newFeedType, cost) {
    if (state.money < cost) {
      logLine('資金が足りません。');
      return;
    }
    
    // アップグレード可能かチェック
    if (state.feedType === 'artificial' && newFeedType === 'bloodworm') {
      // OK: 人工餌 → アカムシ
    } else if (state.feedType === 'bloodworm' && newFeedType === 'earthworm') {
      // OK: アカムシ → みみず
    } else {
      logLine('この餌にアップグレードできません。');
      return;
    }
    
    state.money -= cost;
    state.feedType = newFeedType;
    
    var feedNames = {
      artificial: '💊 人工餌',
      bloodworm: 'アカムシ',
      earthworm: '🪱 みみず'
    };
    
    logLine('餌を' + feedNames[newFeedType] + 'にアップグレードしました。');
    $('axOverlayBuy').classList.remove('visible');
    updateUI();
  }

  function actAddTank() {
    if (state.tanks.length >= MAX_TANKS) {
      logLine('これ以上水槽は増やせない。');
      return;
    }
    if (state.money < 20000) {
      logLine('水槽を増やす資金が足りない…。');
      return;
    }
    state.money -= 20000;
    state.tanks.push({
      id: state.tanks.length + 1,
      axolotl: null,
      note: '新しく導入した水槽',
      baby: false,
      customName: null,
      clean: 80,
      poop: false
    });
    logLine('新しい水槽を1つ増設した。');
    updateUI();
  }

  function resetGame() {
    state.month = 1;
    state.money = 50000;
    state.reputation = 30;
    state.ended = false;
    state.lastBreedParent1 = null;
    state.lastBreedParent2 = null;
    state.auctionAvailable = false;
    state.auctionType = null;
    state.auctionPrice = 0;
    // 最初はリューシとマーブルのみ固定化済み
    state.fixedTypes = {
      nomal: true,
      marble: true
    };
    state.obtainedTypes = {};
    state.achievements = {};
    state.nameCounts = {};  // 名前カウントをリセット
    state.shopName = 'ウーパールーパーショップ';  // ショップ名をリセット（後で最初のウパの名前で更新される）
    state.shopStockDaily = {};  // 日ごとの在庫状態をリセット
    state.initialNamingMessageShown = false;  // 最初のウパの名前付けメッセージ表示フラグをリセット
    state.equipment = { autoFeeder: false, filter: false, bottomCleaner: false };  // 設備をリセット
    state.feedType = 'artificial';  // デフォルトの餌タイプをリセット
    state.waterChangeType = 'normal';  // デフォルトの水替えタイプをリセット
    initTanks();
    
    // 初期個体を図鑑に追加
    state.tanks.forEach(function(tank) {
      if (tank.axolotl) {
        state.obtainedTypes[tank.axolotl.type] = true;
      }
    });
    $('axLog').textContent = 'ショップを始めた。最初のウパに名前をつけよう。';
    $('axOverlayEnd').classList.remove('visible');
    $('axOverlayBreed').classList.remove('visible');
    $('axOverlayBuy').classList.remove('visible');
    $('axOverlayTreat').classList.remove('visible');
      $('axOverlayDetail').classList.remove('visible');
      $('axOverlayJuvenile').classList.remove('visible');
      $('axOverlayClean').classList.remove('visible');
      $('axOverlayFeed').classList.remove('visible');
      updateUI();
    }
  
  // ショップ名を編集可能にする
  var shopTitleEl = document.getElementById('axShopTitle');
  if (shopTitleEl) {
    shopTitleEl.addEventListener('click', function() {
      var newName = prompt('ショップ名を入力してください:', state.shopName || 'ウーパールーパーショップ');
      if (newName !== null && newName.trim() !== '') {
        state.shopName = newName.trim();
        updateUI();
      }
    });
  }

  // 月送りボタン
  $('btnNextMonth').addEventListener('click', function () {
    if (!state.ended) nextMonth();
  });
  
  // 全体操作ボタン
  var btnFeedAll = document.getElementById('btnFeedAll');
  if (btnFeedAll) {
    btnFeedAll.addEventListener('click', function () {
      if (!state.ended) openGlobalFeedModal();
    });
  }
  var btnCleanAll = document.getElementById('btnCleanAll');
  if (btnCleanAll) {
    btnCleanAll.addEventListener('click', function () {
      if (!state.ended) actClean();
    });
  }
  
  // ハンバーガーメニュー
  var menuToggle = document.getElementById('axMenuToggle');
  var menuOverlay = document.getElementById('axMenuOverlay');
  var menu = document.getElementById('axMenu');
  var menuClose = document.getElementById('axMenuClose');
  
  function toggleMenu() {
    var isVisible = menu && menu.classList.contains('visible');
    if (isVisible) {
      closeMenu();
    } else {
      openMenu();
    }
  }
  
  function openMenu() {
    if (menuOverlay) menuOverlay.classList.add('visible');
    if (menu) menu.classList.add('visible');
  }
  
  function closeMenu() {
    if (menuOverlay) menuOverlay.classList.remove('visible');
    if (menu) menu.classList.remove('visible');
  }
  
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMenu);
  }
  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMenu);
  }
  if (menuClose) {
    menuClose.addEventListener('click', closeMenu);
  }
  $('axCleanCancel').addEventListener('click', function () {
    $('axOverlayClean').classList.remove('visible');
  });
  $('axFeedCancel').addEventListener('click', function () {
    $('axOverlayFeed').classList.remove('visible');
  });
  // メニュー内のボタン
  var btnBreed = document.getElementById('btnBreed');
  if (btnBreed) {
    btnBreed.addEventListener('click', function () {
      if (!state.ended) {
        openBreedOverlay();
        closeMenu();
      }
    });
  }
  $('axBreedConfirm').addEventListener('click', function () {
    doBreed(parseInt($('axBreedParent1').value, 10), parseInt($('axBreedParent2').value, 10));
  });
  var axBreedLineageIntroductionBtn = document.getElementById('axBreedLineageIntroduction');
  if (axBreedLineageIntroductionBtn) {
    axBreedLineageIntroductionBtn.addEventListener('click', function () {
      var parent1Idx = parseInt($('axBreedParent1').value, 10);
      var parent2Idx = parseInt($('axBreedParent2').value, 10);
      openLineageIntroductionOverlay(parent1Idx, parent2Idx);
    });
  }
  $('axBreedCancel').addEventListener('click', function () {
    $('axOverlayBreed').classList.remove('visible');
  });
  var btnTreat = document.getElementById('btnTreat');
  if (btnTreat) {
    btnTreat.addEventListener('click', function () {
      if (!state.ended) {
        openTreatmentOverlay();
        closeMenu();
      }
    });
  }
  $('axTreatCancel').addEventListener('click', function () {
    $('axOverlayTreat').classList.remove('visible');
  });
  var btnBuy = document.getElementById('btnBuy');
  if (btnBuy) {
    btnBuy.addEventListener('click', function () {
      if (!state.ended) {
        openBuyOverlay();
        closeMenu();
      }
    });
  }
  var btnAuction = document.getElementById('btnAuction');
  if (btnAuction) {
    btnAuction.addEventListener('click', function () {
      if (!state.ended) {
        openAuctionOverlay();
        closeMenu();
      }
    });
  }
  $('axBuyCancel').addEventListener('click', function () {
    $('axOverlayBuy').classList.remove('visible');
  });
  $('axBtnRetry').addEventListener('click', function () {
    resetGame();
  });
  $('axDetailCancel').addEventListener('click', function () {
    closeDetailModal();
  });
  $('axJuvenileCancel').addEventListener('click', function () {
    $('axOverlayJuvenile').classList.remove('visible');
  });
  var axHatchCancelBtn = document.getElementById('axHatchCancel');
  if (axHatchCancelBtn) {
    axHatchCancelBtn.addEventListener('click', function () {
      $('axOverlayHatch').classList.remove('visible');
    });
  }
  var btnEncyclopedia = document.getElementById('btnEncyclopedia');
  if (btnEncyclopedia) {
    btnEncyclopedia.addEventListener('click', function () {
      openEncyclopedia();
      closeMenu();
    });
  }
  $('axEncyclopediaCancel').addEventListener('click', function () {
    $('axOverlayEncyclopedia').classList.remove('visible');
  });
  var btnAchievements = document.getElementById('btnAchievements');
  if (btnAchievements) {
    btnAchievements.addEventListener('click', function () {
      openAchievements();
      closeMenu();
    });
  }
  $('axAchievementsCancel').addEventListener('click', function () {
    $('axOverlayAchievements').classList.remove('visible');
  });

  function openEncyclopedia() {
    var content = $('axEncyclopediaContent');
    content.innerHTML = '';
    
    AXO_TYPES.forEach(function(type) {
      var div = document.createElement('div');
      div.style.marginBottom = '16px';
      div.style.padding = '12px';
      div.style.border = '1px solid #bfdbfe';
      div.style.borderRadius = '6px';
      div.style.background = state.obtainedTypes[type] ? '#f0f9ff' : '#f9fafb';
      
      var header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.gap = '8px';
      header.style.marginBottom = '8px';
      
      var img = document.createElement('img');
      img.src = typeImagePath(type);
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.imageRendering = 'pixelated';
      header.appendChild(img);
      
      var title = document.createElement('h3');
      title.style.margin = '0';
      title.style.fontSize = '16px';
      title.textContent = typeLabel(type);
      if (state.obtainedTypes[type]) {
        title.innerHTML += ' <span style="color:#22c55e;">✓</span>';
      } else {
        title.innerHTML += ' <span style="color:#94a3b8;">（未獲得）</span>';
      }
      header.appendChild(title);
      div.appendChild(header);
      
      var desc = document.createElement('p');
      desc.style.margin = '4px 0';
      desc.style.fontSize = '12px';
      desc.style.color = state.obtainedTypes[type] ? '#475569' : '#94a3b8';
      desc.textContent = typeDescriptions[type] || '説明なし';
      div.appendChild(desc);
      
      if (state.fixedTypes[type]) {
        var fixedBadge = document.createElement('div');
        fixedBadge.style.marginTop = '4px';
        fixedBadge.style.fontSize = '11px';
        fixedBadge.style.color = '#f97316';
        fixedBadge.style.fontWeight = 'bold';
        fixedBadge.textContent = '⭐ 固定化済み';
        div.appendChild(fixedBadge);
      }
      
      content.appendChild(div);
    });
    
    $('axOverlayEncyclopedia').classList.add('visible');
  }

  function openAchievements() {
    var content = $('axAchievementsContent');
    content.innerHTML = '';
    
    // 実績をチェック
    achievementDefinitions.forEach(function(ach) {
      var achieved = ach.check();
      if (achieved && !state.achievements[ach.id]) {
        state.achievements[ach.id] = true;
        logLine('【実績解除】' + ach.name);
      }
    });
    
    achievementDefinitions.forEach(function(ach) {
      var achieved = state.achievements[ach.id] === true;
      var div = document.createElement('div');
      div.style.marginBottom = '12px';
      div.style.padding = '10px';
      div.style.border = '1px solid ' + (achieved ? '#22c55e' : '#e5e7eb');
      div.style.borderRadius = '6px';
      div.style.background = achieved ? '#f0fdf4' : '#f9fafb';
      
      var header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.gap = '8px';
      header.style.marginBottom = '4px';
      
      var icon = document.createElement('span');
      icon.style.fontSize = '20px';
      icon.textContent = achieved ? '✓' : '○';
      icon.style.color = achieved ? '#22c55e' : '#94a3b8';
      header.appendChild(icon);
      
      var name = document.createElement('span');
      name.style.fontWeight = 'bold';
      name.style.fontSize = '14px';
      name.textContent = ach.name;
      name.style.color = achieved ? '#166534' : '#6b7280';
      header.appendChild(name);
      div.appendChild(header);
      
      var desc = document.createElement('div');
      desc.style.fontSize = '12px';
      desc.style.color = achieved ? '#475569' : '#9ca3af';
      desc.textContent = ach.desc;
      div.appendChild(desc);
      
      content.appendChild(div);
    });
    
    $('axOverlayAchievements').classList.add('visible');
  }

  resetGame();
})();
