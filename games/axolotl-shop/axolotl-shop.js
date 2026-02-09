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
    copper: 'コッパー',
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
  var FEED_ARTIFICIAL_COST = 800;  // 採算調整：1500 → 800
  var FEED_BLOODWORM_COST = 300;  // 採算調整：500 → 300
  var FEED_BLOODWORM_DIRT = 12;
  var FEED_BLOODWORM_HEALTH = 8;
  var FEED_BLOODWORM_HUNGER = 25;
  var FEED_EARTHWORM_COST = 1200;  // 採算調整：2500 → 1200
  var FEED_EARTHWORM_DIRT = 6;
  var FEED_EARTHWORM_HEALTH = 12;
  var FEED_EARTHWORM_HUNGER = 30;
  var FEED_ARTIFICIAL_DIRT = 3;
  var FEED_ARTIFICIAL_HEALTH = 5;
  var FEED_ARTIFICIAL_HUNGER = 20;
  // 餌レベル倍率（レベルに応じて水質汚染低減・成長率アップ・コスト低減）
  function getFeedLevelMultipliers(feedType) {
    if (feedType === 'bloodworm') return { cost: 0.95, health: 1.1, hunger: 1.1, dirt: 0.9 };
    if (feedType === 'earthworm') return { cost: 0.9, health: 1.2, hunger: 1.2, dirt: 0.8 };
    return { cost: 1, health: 1, hunger: 1, dirt: 1 };
  }
  
  // うんこ未処理ペナルティ
  var POOP_PENALTY_PER_MONTH = 15;
  
  // 血統導入関連定数
  var LINEAGE_INTRODUCTION_FEE = 5000;
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
  var WATER_CHANGE_PARTIAL_COST = 200;  // 採算調整：300 → 200
  var WATER_CHANGE_PARTIAL_BONUS = 15;
  var WATER_CHANGE_NORMAL_COST = 400;  // 採算調整：500 → 400
  var WATER_CHANGE_NORMAL_BONUS = 25;
  var WATER_CHANGE_FULL_COST = 600;  // 採算調整：800 → 600
  var WATER_CHANGE_FULL_BONUS = 30;
  
  // 自動設備関連定数（レベル制）
  var EQUIPMENT_AUTO_FEEDER_COST = 25000;
  var EQUIPMENT_FILTER_COST = 15000;       // フィルタ Lv0→1
  var EQUIPMENT_FILTER_COST_LV2 = 8000;   // Lv1→2
  var EQUIPMENT_FILTER_COST_LV3 = 10000;   // Lv2→3
  var EQUIPMENT_BOTTOM_CLEANER_COST = 20000;   // Lv0→1
  var EQUIPMENT_BOTTOM_CLEANER_COST_LV2 = 10000;
  var EQUIPMENT_BOTTOM_CLEANER_COST_LV3 = 12000;
  var TANK_LEVEL_UP_BASE = 12000;          // 水槽設備レベルアップ基本料金
  var TANK_ADD_BASE = 10000;               // 水槽追加基本料金
  var AUTO_FEEDER_HUNGER_THRESHOLD = 50;
  var AUTO_FEEDER_COST_PER_FEED = 1000;
  var MAX_FILTER_LEVEL = 3;
  var MAX_BOTTOM_CLEANER_LEVEL = 3;
  var MAX_TANK_LEVEL = 14;                 // 最大15槽 = tankLevel+1
  
  // 共通アセットを使用（ルートの /assets/axolotl/）
  var AXOLOTL_IMAGE_BASE = '/assets/axolotl/';
  function typeImagePath(t) {
    if (t === 'goldblackeye') return AXOLOTL_IMAGE_BASE + 'axo_gold.png';
    if (t === 'yellow') return AXOLOTL_IMAGE_BASE + 'axo_yellow.png';
    if (t === 'superblack') return AXOLOTL_IMAGE_BASE + 'axo_superblack.png';
    if (t === 'dalmatian') return AXOLOTL_IMAGE_BASE + 'axo_dalmatian.png';
    return AXOLOTL_IMAGE_BASE + 'axo_' + t + '.png';
  }

  // ===== 32pxドット絵保護ユーティリティ =====
  var PIXEL_ART_BASE_SIZE = 32;
  
  // 32の整数倍に丸める（最も近い整数倍へ）
  function roundToPixelArtMultiple(size) {
    if (size <= 0) return PIXEL_ART_BASE_SIZE;
    var multiplier = Math.round(size / PIXEL_ART_BASE_SIZE);
    if (multiplier < 1) multiplier = 1;
    return multiplier * PIXEL_ART_BASE_SIZE;
  }
  
  // サイズが32の整数倍かチェック
  function isValidPixelArtSize(size) {
    return size > 0 && size % PIXEL_ART_BASE_SIZE === 0;
  }
  
  // Canvasの設定を検証・強制
  function ensurePixelArtCanvas(canvas, ctx) {
    if (!isValidPixelArtSize(canvas.width) || !isValidPixelArtSize(canvas.height)) {
      console.error('[PixelArt] Canvasサイズが32の整数倍ではありません:', canvas.width, 'x', canvas.height);
      canvas.width = roundToPixelArtMultiple(canvas.width);
      canvas.height = roundToPixelArtMultiple(canvas.height);
    }
    if (ctx.imageSmoothingEnabled !== false) {
      console.error('[PixelArt] imageSmoothingEnabledが有効です！強制的に無効化します。');
      ctx.imageSmoothingEnabled = false;
    }
  }
  
  // drawImageのラッパー（小数座標チェック）
  function safeDrawImage(ctx, img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    var args = Array.prototype.slice.call(arguments, 1);
    var allIntegers = true;
    var checkValues = [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight].filter(function(v) { return v != null; });
    
    for (var i = 0; i < checkValues.length; i++) {
      if (checkValues[i] % 1 !== 0) {
        allIntegers = false;
        console.warn('[PixelArt] drawImageに小数座標が検出されました:', checkValues);
        break;
      }
    }
    
    if (!allIntegers) {
      // 小数を整数に丸める
      args = args.map(function(v) {
        return typeof v === 'number' ? Math.round(v) : v;
      });
    }
    
    ctx.drawImage.apply(ctx, [img].concat(args));
  }
  
  // 画像要素のサイズを32の整数倍に設定（非整数倍で引き延ばさない＝ぼやけ防止）
  function setPixelArtImageSize(img, width, height) {
    var roundedWidth = roundToPixelArtMultiple(width);
    var roundedHeight = roundToPixelArtMultiple(height);
    if (roundedWidth !== width || roundedHeight !== height) {
      console.warn('[PixelArt] 画像サイズが32の整数倍ではありません。', width, 'x', height, '→', roundedWidth, 'x', roundedHeight);
    }
    img.style.width = roundedWidth + 'px';
    img.style.height = roundedHeight + 'px';
    img.style.minWidth = roundedWidth + 'px';
    img.style.minHeight = roundedHeight + 'px';
    img.style.flexShrink = '0';
    img.style.imageRendering = 'pixelated';
    img.style.imageRendering = '-webkit-optimize-contrast';
    img.style.imageRendering = 'crisp-edges';
    
    // 検証（DOMに追加されている場合のみ）
    if (img.parentNode && document.body.contains(img.parentNode)) {
      try {
        var computedWidth = parseFloat(window.getComputedStyle(img).width);
        var computedHeight = parseFloat(window.getComputedStyle(img).height);
        if (isNaN(computedWidth) || isNaN(computedHeight)) {
          // DOMに追加されていない、またはまだレンダリングされていない場合はスキップ
          return;
        }
        if (!isValidPixelArtSize(computedWidth) || !isValidPixelArtSize(computedHeight)) {
          console.error('[PixelArt] 計算後のサイズが32の整数倍ではありません:', computedWidth, 'x', computedHeight);
        }
      } catch (e) {
        // getComputedStyleが失敗した場合はスキップ
      }
    }
  }

  // 表示用: タイプに応じた画像パスを返すだけ。キャッシュ・濃淡・キメラ合成は使わない（シンプル表示）
  // キメラは画像表示しない（ax.type === 'chimera' のときは img を出さない）

  // 32pxテクスチャをくっきり表示するためのCanvas（DPR対応・補間なし）
  // ① image-rendering ② 実サイズ＝表示サイズ ③ devicePixelRatio ④ drawImage で拡大
  function createPixelArtCanvasSprite(ax, iconSize) {
    var dpr = window.devicePixelRatio || 1;
    var canvas = document.createElement('canvas');
    var w = Math.round(iconSize * dpr);
    var h = Math.round(iconSize * dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = iconSize + 'px';
    canvas.style.height = iconSize + 'px';
    canvas.style.minWidth = iconSize + 'px';
    canvas.style.minHeight = iconSize + 'px';
    canvas.style.flexShrink = '0';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = '-webkit-optimize-contrast';
    canvas.style.imageRendering = 'crisp-edges';
    canvas.style.pointerEvents = 'none';
    // イエロー・スーパーブラックは固定、それ以外は薄い・濃いを適用
    canvas.className = 'ax-axolotl-img' + (ax.type === 'yellow' || ax.type === 'superblack' ? '' : ' ax-shade-' + (ax.shade || 'normal'));
    canvas.dataset.axolotlId = String(ax.id);
    canvas.title = typeLabel(ax.type);
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, iconSize, iconSize);
    };
    img.src = typeImagePath(ax.type);
    return canvas;
  }

  // キメラ: 左右半分ずつ合成してDPR対応Canvasで表示（くっきり）
  function createChimeraCanvasSprite(ax, iconSize) {
    var dpr = window.devicePixelRatio || 1;
    var canvas = document.createElement('canvas');
    var w = Math.round(iconSize * dpr);
    var h = Math.round(iconSize * dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = iconSize + 'px';
    canvas.style.height = iconSize + 'px';
    canvas.style.minWidth = iconSize + 'px';
    canvas.style.minHeight = iconSize + 'px';
    canvas.style.flexShrink = '0';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = '-webkit-optimize-contrast';
    canvas.style.imageRendering = 'crisp-edges';
    canvas.style.pointerEvents = 'none';
    canvas.className = 'ax-axolotl-img ax-shade-' + (ax.shade || 'normal');
    canvas.dataset.axolotlId = String(ax.id);
    canvas.title = typeLabel('chimera');
    var chimeraTypes = ax.chimeraTypes && ax.chimeraTypes.length >= 2 ? ax.chimeraTypes : ['nomal', 'marble'];
    var img1 = new Image();
    var img2 = new Image();
    img1.crossOrigin = 'anonymous';
    img2.crossOrigin = 'anonymous';
    var loaded = 0;
    function tryDraw() {
      if (loaded < 2) return;
      if (!img1.complete || !img2.complete || !img1.naturalWidth || !img2.naturalHeight) return;
      var c32 = document.createElement('canvas');
      c32.width = PIXEL_ART_BASE_SIZE;
      c32.height = PIXEL_ART_BASE_SIZE;
      var ctx32 = c32.getContext('2d');
      ctx32.imageSmoothingEnabled = false;
      var half1 = Math.floor(img1.naturalWidth / 2);
      var half2 = Math.floor(img2.naturalWidth / 2);
      ctx32.drawImage(img1, 0, 0, half1, img1.naturalHeight, 0, 0, 16, PIXEL_ART_BASE_SIZE);
      ctx32.drawImage(img2, img2.naturalWidth - half2, 0, half2, img2.naturalHeight, 16, 0, 16, PIXEL_ART_BASE_SIZE);
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.scale(dpr, dpr);
      ctx.drawImage(c32, 0, 0, PIXEL_ART_BASE_SIZE, PIXEL_ART_BASE_SIZE, 0, 0, iconSize, iconSize);
    }
    img1.onload = function() { loaded++; tryDraw(); };
    img2.onload = function() { loaded++; tryDraw(); };
    img1.onerror = function() { loaded++; tryDraw(); };
    img2.onerror = function() { loaded++; tryDraw(); };
    img1.src = typeImagePath(chimeraTypes[0]);
    img2.src = typeImagePath(chimeraTypes[1]);
    return canvas;
  }

  // Idle Bob: 2コマのみ [0, AMPLITUDE]。体調に応じてテンポを遅く（要素ごとに時間管理）。
  var BOB_AMPLITUDE = 8;
  var _bob = [0, -BOB_AMPLITUDE];
  function getBobIntervalMs(ax) {
    if (!ax) return 500;
    if (ax.sick || ax.injured) return 1200;
    var h = ax.health != null ? ax.health : 100;
    if (h >= 80) return 500;
    if (h >= 50) return 700;
    if (h >= 20) return 1000;
    return 1200;
  }
  function idleBobUpdate(now) {
    now = now || (typeof performance !== 'undefined' ? performance.now() : Date.now());
    var list = document.querySelectorAll('.ax-axolotl-img.ax-idle');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var interval = parseInt(el.dataset.bobIntervalMs, 10) || 500;
      var lastStep = parseFloat(el.dataset.bobLastStep) || 0;
      if (lastStep === 0) { el.dataset.bobLastStep = String(now); lastStep = now; }
      var idx = parseInt(el.dataset.bobIndex, 10) || 0;
      if (now - lastStep >= interval) {
        idx ^= 1;
        el.dataset.bobIndex = String(idx);
        el.dataset.bobLastStep = String(now);
      }
      el.style.transform = 'translateY(' + _bob[idx] + 'px)';
    }
    requestAnimationFrame(idleBobUpdate);
  }
  requestAnimationFrame(idleBobUpdate);

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
    money: 60000,
    clean: 80,
    reputation: 30,
    tanks: [],
    ended: false,
    lastBreedParent1: null,
    lastBreedParent2: null,
    nextAxolotlId: 1,
    mutationShopAvailable: false,
    mutationShopItems: [],  // ミューテーションショップの4匹の個体リスト
    fixedTypes: {},  // 固定化された種類 {type: true}
    obtainedTypes: {},  // 獲得した種類（図鑑用）
    achievements: {},  // 実績 {id: true}
    nameCounts: {},  // 種類ごとの名前カウント {type: count}
    usedNames: {},  // 使用済みの名前 {fullName: true} 重複チェック用
    shopName: 'ウーパールーパーショップ',  // ショップ名
    equipment: {  // 自動設備（レベル制）最初から3槽 = tankLevel2
      autoFeeder: false,
      filter: false,
      bottomCleanerLevel: 0,
      tankLevel: 2
    },
    feedType: 'artificial',  // デフォルトの餌タイプ: 'artificial', 'bloodworm', 'earthworm'
    waterChangeType: 'normal',  // デフォルトの水替えタイプ: 'partial', 'normal', 'full'
    reputation100Celebrated: false,  // 満足度100達成時のポップアップ表示済みフラグ
    shopSale: false,  // ショップセール開催中フラグ
    shopSaleDiscount: 1.0,  // ショップセール割引率（1.0 = 通常価格）
    shopSaleItems: [],  // セール対象の商品リスト（タイプとサイズバンドの組み合わせ）
    settings: {
      autoReorderTanks: false  // 空になった水槽を自動的に下に移動する
    }
  };
  
  // マイグレーション: feedTypeとwaterChangeTypeが無い場合は初期化
  if (state.feedType === undefined) {
    state.feedType = 'artificial';
  }
  if (state.waterChangeType === undefined) {
    state.waterChangeType = 'normal';
  }
  if (state.reputation100Celebrated === undefined) {
    state.reputation100Celebrated = false;
  }
  if (state.shopSale === undefined) {
    state.shopSale = false;
  }
  if (state.shopSaleDiscount === undefined) {
    state.shopSaleDiscount = 1.0;
  }
  if (state.shopSaleItems === undefined) {
    state.shopSaleItems = [];
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

  // 基本5種: リューシ・アルビノ・ゴールド・マーブル・ブラック
  var BASIC_FIVE_TYPES = ['nomal', 'albino', 'gold', 'marble', 'black'];
  // レア種
  var RARE_TYPES = ['copper', 'superblack', 'goldblackeye', 'chimera', 'dalmatian'];

  // 実績定義（goal: true のものは達成時にゴール表示を出し、続ける/やめるを選べる）
  var achievementDefinitions = [
    { id: 'first_sale', name: '初めての販売', desc: '初めてウーパールーパーを販売する', goal: false, check: function() { return state.achievements.first_sale || false; } },
    { id: 'breed_success', name: '繁殖成功', desc: '初めて繁殖に成功する', goal: true, check: function() { return state.achievements.breed_success || false; } },
    { id: 'basic_five', name: '基本5種揃え', desc: '基本5種（リューシ・アルビノ・ゴールド・マーブル・ブラック）を揃える', goal: true, check: function() {
      return BASIC_FIVE_TYPES.every(function(t) { return state.fixedTypes[t] === true; });
    }},
    { id: 'money_1m', name: '100万円達成', desc: '所持金が100万円を超える', goal: true, check: function() { return state.money >= 1000000; } },
    { id: 'adult_raised', name: '成体にした', desc: '成体まで育てた個体がいる', goal: true, check: function() {
      var found = false;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.age >= 21) found = true;
        if (tank.breedingPair) { tank.breedingPair.forEach(function(ax) { if (ax.age >= 21) found = true; }); }
      });
      return found;
    }},
    { id: 'rare_obtained', name: 'レア種を手に入れた', desc: 'レア種を1種類以上獲得する', goal: true, check: function() {
      return RARE_TYPES.some(function(t) { return state.obtainedTypes[t] === true; });
    }},
    { id: 'rep_80', name: '評判80超え', desc: '評判が80を超える', goal: true, check: function() { return state.reputation > 80; } },
    { id: 'reputation_max', name: '評判100', desc: '評判が100に達する', goal: true, check: function() { return state.reputation >= MAX_REP; } },
    { id: 'marble_fixed', name: 'マーブル固定化', desc: 'マーブルを固定化する', goal: false, check: function() { return state.fixedTypes.marble === true; } },
    { id: 'rare_fixed', name: 'レア種固定化', desc: 'レア種を固定化する', goal: false, check: function() { return state.fixedTypes.goldblackeye === true || state.fixedTypes.chimera === true || state.fixedTypes.copper === true; } },
    { id: 'all_types', name: '全種類獲得', desc: 'すべての種類を獲得する', goal: false, check: function() { return Object.keys(state.obtainedTypes).length >= AXO_TYPES.length; } },
    { id: 'money_100k', name: '資産家', desc: '所持金が10万円を超える', goal: false, check: function() { return state.money >= 100000; } },
    { id: 'money_500k', name: '大富豪', desc: '所持金が50万円を超える', goal: false, check: function() { return state.money >= 500000; } },
    { id: 'tanks_max', name: '水槽マスター', desc: '水槽を15個まで増やす', goal: false, check: function() { return state.tanks.length >= MAX_TANKS; } },
    { id: 'long_life', name: '長寿', desc: '60ヶ月以上生きた個体を育てる', goal: false, check: function() { 
      var found = false;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.age >= 60) found = true;
        if (tank.breedingPair) { tank.breedingPair.forEach(function(ax) { if (ax.age >= 60) found = true; }); }
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
  // 各モーフの初期名A（種限定）
  var morphInitialNameA = {
    'nomal': 'リュウ',
    'marble': 'マー',
    'albino': 'アル',
    'gold': 'ゴル',
    'black': 'クロ',
    'superblack': 'スミ',
    'yellow': 'イエ',
    'dalmatian': 'ダル',
    'goldblackeye': 'カネ',
    'copper': 'コパ',
    'chimera': 'キメ'
  };

  // オスのA候補（通字候補）
  var maleNameElementA = ['義', '忠', '信', '直', '正', '清', '廉', '篤', '慎', '恭', '勇', '武', '剛', '猛', '勝', '威', '盛', '重', '堅', '吉', '昌', '久', '永', '長', '泰', '安', '保', '福', '寿', '政', '治', '成', '功', '元', '光', '顕', '章', '宣', '隆', '一', '龍', '虎', '家', '親', '綱', '経', '時', '頼', '兼', '定', '朝', '晴', '景', '秀', '宗', '氏', '房', '連', '満', '教', '敬', '仁', '礼', '誠', '寛', '良', '賢', '純', '征', '鎮', '衛', '統', '守', '督', '令', '明', '昭', '春', '秋', '興', '栄', '豊', '広', '弘', '祐', '祥', '延', '充', '恒', '尚', '基', '実', '康', '克', '照', '輝', '利', '英', '寧', '順', '則', '典', '規', '倫', '道', '方', '周', '通', '仲', '冬', '高', '夏'];

  // オスのB候補（二字以上のB、通字候補）
  var maleNameElementB = ['千代', '太郎', '一郎', '次郎', '二郎', '三郎', '四郎', '五郎', '六郎', '七郎', '八郎', '九郎', '十郎', '之助', '助', '右衛門', '左衛門', '兵衛', '之進', '太夫', '丸'];

  // メスのB候補（通字候補）
  var femaleNameElementB = ['子', '美', '女', '香', '枝', '恵', '絵', '江', '代', '世', '奈', '菜', '那', '南', '里', '理', '梨', '莉', '花', '華', '葉', '羽', '乃', '野', '緒', '栄', '鶴', '富', '登', '志', '千', '百', '万', '愛', '優', '萌', '咲', '陽', '結', '彩', '音', '詩', '心', '桜', '桃', '楓', '葵', '梅', '菫', '蘭', '蓮', '椿', '柚', '梢', '桂', '橙', '椛', '芽', '苗', '茜', '菊', '萩', '藤', '合', '実', '穂', '潮', '波', '渚', '汐', '海', '空', '月', '星', '雪', '風', '光', '霞', '露', '雫', '霧', '雲', '虹', '麗', '綺', '翠', '碧', '晶', '玉', '珠', '瑠', '琴', '歌', '和', '雅', '絹', '綾', '織', '夢', '希', '望', '真', '幸', '祈', '願', '温', '柔', '縁', '笑', '百合'];

  // 名前の重複チェック関数
  function isNameUsed(fullName) {
    if (!state.usedNames) state.usedNames = {};
    return state.usedNames[fullName] === true;
  }

  // 名前を登録する関数
  function registerName(fullName) {
    if (!state.usedNames) state.usedNames = {};
    state.usedNames[fullName] = true;
  }

  // 重複を避けて名前を生成する関数
  function generateUniqueName(baseName, maxAttempts) {
    maxAttempts = maxAttempts || 100;
    var fullName = baseName;
    var attempt = 0;
    
    while (isNameUsed(fullName) && attempt < maxAttempts) {
      attempt++;
      if (attempt === 1) {
        fullName = baseName + '2世';
      } else if (attempt === 2) {
        fullName = baseName + '3世';
      } else {
        fullName = baseName + (attempt + 1) + '世';
      }
    }
    
    registerName(fullName);
    return fullName;
  }

  // ランダムにB要素を選択（性別に応じて）
  function getRandomBElement(sex) {
    if (sex === 'オス') {
      return maleNameElementB[Math.floor(Math.random() * maleNameElementB.length)];
    } else {
      return femaleNameElementB[Math.floor(Math.random() * femaleNameElementB.length)];
    }
  }

  // 名前生成関数（要素A/Bシステム）
  function generateDefaultName(type, parent1Id, parent2Id, isFirstChild, sex) {
    var result = {
      nameElementA: null,
      nameElementB: null,
      isHereditaryA: false,
      isHereditaryB: false,
      name: null
    };
    
    // 性別が指定されていない場合はランダムに決定
    if (!sex) {
      sex = Math.random() < 0.5 ? 'オス' : 'メス';
    }
    
    // 繁殖の場合
    if (parent1Id && parent2Id) {
      var p1 = null;
      var p2 = null;
      
      // 親を取得（レジストリまたは現在の水槽から）
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.id === parent1Id) p1 = tank.axolotl;
        if (tank.axolotl && tank.axolotl.id === parent2Id) p2 = tank.axolotl;
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(pairAx) {
            if (pairAx.id === parent1Id) p1 = pairAx;
            if (pairAx.id === parent2Id) p2 = pairAx;
          });
        }
      });
      if (!p1 && axolotlRegistry[parent1Id]) p1 = axolotlRegistry[parent1Id];
      if (!p2 && axolotlRegistry[parent2Id]) p2 = axolotlRegistry[parent2Id];
      
      if (p1 && p2) {
        // 父（オス）と母（メス）を特定
        var maleParent = p1.sex === 'オス' ? p1 : p2;
        var femaleParent = p1.sex === 'メス' ? p1 : p2;
        
        // 父の通字を確認（AまたはB）
        var maleHereditaryA = maleParent.isHereditaryA && maleParent.nameElementA;
        var maleHereditaryB = maleParent.isHereditaryB && maleParent.nameElementB;
        
        // 母のB要素を確認（メスのBは通字候補）
        var femaleB = femaleParent.nameElementB;
        
        // 通字の継承ルール：父のAまたはBの通字を継承（両方ある場合はランダム）
        var inheritedHereditary = null;
        var inheritedPosition = null;
        if (maleHereditaryA && maleHereditaryB) {
          // 両方に通字がある場合はランダムに選択
          if (Math.random() < 0.5) {
            inheritedHereditary = maleHereditaryA;
            inheritedPosition = 'A';
          } else {
            inheritedHereditary = maleHereditaryB;
            inheritedPosition = 'B';
          }
        } else if (maleHereditaryA) {
          inheritedHereditary = maleHereditaryA;
          inheritedPosition = 'A';
        } else if (maleHereditaryB) {
          inheritedHereditary = maleHereditaryB;
          inheritedPosition = 'B';
        }
        
        // 名前を構成
        if (inheritedPosition === 'A') {
          // A位置に父の通字を継承
          result.nameElementA = inheritedHereditary;
          result.isHereditaryA = true;
          
          // B位置：父のB通字が両方可能な場合、ランダムで継承する可能性
          if (maleHereditaryB && Math.random() < 0.5) {
            result.nameElementB = maleHereditaryB;
            result.isHereditaryB = true;
          } else {
            // 母のB要素を優先的に使用、なければランダム
            result.nameElementB = femaleB || getRandomBElement(sex);
            result.isHereditaryB = false;
          }
        } else if (inheritedPosition === 'B') {
          // B位置に父の通字を継承
          result.nameElementB = inheritedHereditary;
          result.isHereditaryB = true;
          
          // A位置：父のA通字が両方可能な場合、ランダムで継承する可能性
          if (maleHereditaryA && Math.random() < 0.5) {
            result.nameElementA = maleHereditaryA;
            result.isHereditaryA = true;
          } else {
            // 母のA要素を優先的に使用、なければランダム（オスのA候補から）
            result.nameElementA = femaleParent.nameElementA || maleNameElementA[Math.floor(Math.random() * maleNameElementA.length)];
            result.isHereditaryA = false;
          }
        } else {
          // 通字がない場合：母から継承、なければランダム
          result.nameElementA = femaleParent.nameElementA || maleNameElementA[Math.floor(Math.random() * maleNameElementA.length)];
          result.nameElementB = femaleB || getRandomBElement(sex);
          result.isHereditaryA = false;
          result.isHereditaryB = false;
        }
      }
    } else {
      // 通常の購入・生成の場合：モーフの初期名A + ランダムなB
      var initialA = morphInitialNameA[type];
      if (!initialA) {
        // モーフが定義されていない場合はデフォルト
        initialA = 'リュウ';
      }
      
      result.nameElementA = initialA;
      result.isHereditaryA = false; // 初期名Aは通字ではない（種限定）
      result.nameElementB = getRandomBElement(sex);
      result.isHereditaryB = false;
    }
    
    // 名前を結合
    result.name = (result.nameElementA || '') + (result.nameElementB || '');
    if (result.name === '') result.name = null;
    
    // 重複チェックと調整
    if (result.name) {
      result.name = generateUniqueName(result.name);
    }
    
    return result;
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
    
    // 性別を決定（名前生成の前に必要）
    var sex = Math.random() < 0.5 ? 'オス' : 'メス';
    
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
    
    var defaultNameResult = generateDefaultName(type, parent1Id || null, parent2Id || null, isFirstChild, sex);
    var defaultName = defaultNameResult.name;
    
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
      sex: sex,
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
      nameElementA: defaultNameResult.nameElementA || null,  // 要素A
      nameElementB: defaultNameResult.nameElementB || null,  // 要素B
      isHereditaryA: defaultNameResult.isHereditaryA || false,  // 要素Aの通字フラグ
      isHereditaryB: defaultNameResult.isHereditaryB || false,  // 要素Bの通字フラグ
      familyName: familyName,  // 苗字（父から継承）
      isFixedLineage: false  // 固定化血統フラグ（デフォルトfalse）
    };
    
    // キメラの場合はchimeraTypesを保存
    if (type === 'chimera' && chimeraTypes) {
      ax.chimeraTypes = chimeraTypes;
    }
    
    // 名前を登録（重複チェック用）
    if (ax.name) {
      registerName(ax.name);
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
      nameElementA: ax.nameElementA,
      nameElementB: ax.nameElementB,
      isHereditaryA: ax.isHereditaryA,
      isHereditaryB: ax.isHereditaryB,
      name: ax.name,
      familyName: ax.familyName,
      removed: false,
      isFixedLineage: ax.isFixedLineage || false
    };
    return ax;
  }

  function ageFromSizeBand(band) {
    // ショップ band 1 = 3ヶ月目、band 7 = 成体(21ヶ月)
    var ages = [1, 3, 4, 7, 9, 12, 15, 21];
    return ages[band] != null ? ages[band] : 21;
  }
  // ショップ詳細用：バンドごとのランダムサイズ表示（cm）
  function getRandomSizeForShopBand(band) {
    var age = ageFromSizeBand(band);
    return calculateSizeFromAge(age);
  }

  var sizeBandLabels = ['2-3cm(幼生)', '3ヶ月目', '5-8cm', '8-12cm', '12-16cm', '16-18cm', '18-21cm(繁殖用)', '成体'];

  function initTanks() {
    state.tanks = [];
    state.nextAxolotlId = 1;
    axolotlRegistry = {};
    var maxT = (state.equipment && state.equipment.tankLevel) ? state.equipment.tankLevel + 1 : 3;
    maxT = Math.min(maxT, MAX_TANKS);
    var initialType = Math.random() < 0.5 ? 'nomal' : 'marble';
    var initialAx = createAxolotl(2, initialType, null, null);
    for (var i = 0; i < maxT; i++) {
      state.tanks.push({
        id: i + 1,
        axolotl: i === 0 ? initialAx : null,
        note: i === 0 ? '最初のウパ' : '空き水槽',
        baby: i === 0,
        customName: null,
        clean: 80,
        poop: false
      });
    }
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
    // 月ごとのサイズ目安（平均的飼育、ランダム要素あり）
    if (age <= 0) return 1 + Math.random() * 0.5; // 孵化直後：1〜1.5cm
    if (age === 1) return 2 + Math.random() * 1; // 1か月：2〜3cm
    if (age === 2) return 4 + Math.random() * 2; // 2か月：4〜6cm
    if (age === 3) return 6 + Math.random() * 2; // 3か月：6〜8cm
    if (age >= 4 && age <= 6) return 8 + Math.random() * 4; // 4〜6か月：8〜12cm
    if (age >= 7 && age <= 12) return 12 + Math.random() * 6; // 7〜12か月：12〜18cm
    // 1年以上（13ヶ月以上）：18〜25cm前後で成長緩やか
    return 18 + Math.random() * 7; // 18〜25cm
  }

  // サイズを表示用の文字列に変換
  function formatSize(size) {
    if (size == null) return '不明';
    return Math.round(size * 10) / 10 + 'cm';
  }

  // サイズに応じたアイコンサイズを計算（px単位、32の整数倍のみ）
  function getIconSizeFromSize(size) {
    if (size == null) return 80; // デフォルトサイズ（32の倍数）
    // サイズに応じてアイコンサイズを計算（32の整数倍で、CSSでスケール）
    // 最小と最大で2倍の差にする（64px〜128px）
    // 1-1.5cm（孵化直後）: 64px（32×2）
    // 2-3cm（1か月）: 64px（32×2）
    // 4-6cm（2か月）: 72px（32×2.25、32の倍数に丸める）
    // 6-8cm（3か月）: 80px（32×2.5）
    // 8-12cm（4-6か月）: 88px（32×2.75、32の倍数に丸める）
    // 12-18cm（7-12か月）: 96px（32×3）
    // 18-25cm（1年以上）: 128px（32×4、最大サイズ）
    var iconSize;
    if (size <= 1.5) iconSize = 64; // 孵化直後
    else if (size <= 3) iconSize = 64; // 1か月
    else if (size <= 6) iconSize = 64; // 2か月（64pxのまま）
    else if (size <= 8) iconSize = 80; // 3か月
    else if (size <= 12) iconSize = 96; // 4-6か月
    else if (size <= 18) iconSize = 96; // 7-12か月
    else iconSize = 128; // 1年以上（最大128px）
    
    // 32の整数倍であることを保証
    if (!isValidPixelArtSize(iconSize)) {
      console.warn('[PixelArt] getIconSizeFromSizeが32の整数倍でない値を返しました:', iconSize);
      iconSize = roundToPixelArtMultiple(iconSize);
    }
    
    return iconSize;
  }

  // ショップ用：サイズバンドからアイコンサイズ（レイアウト収めるため控えめ：3ヶ月目→64px、成体→96px）
  function getShopIconSizeFromBand(band) {
    return band === 7 ? 96 : 64;
  }
  // ショップ表示用：ランダムな空腹・健康度（55〜100%）
  function getRandomShopStats() {
    return {
      hunger: Math.floor(55 + Math.random() * 46),
      health: Math.floor(55 + Math.random() * 46)
    };
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
  // 価格は全体的に抑えめ。リューシ・マーブル成体は約10000。band0〜7（幼生〜成体）
  var sizePriceTable = {
    nomal: [800, 1800, 2500, 3500, 4500, 6000, 7500, 10000],
    albino: [500, 1000, 1500, 2100, 2800, 3500, 4500, 6000],
    gold: [1400, 2800, 3800, 5200, 6500, 8500, 10500, 13000],
    marble: [700, 1500, 2200, 3200, 4200, 5500, 7000, 10000],
    black: [1000, 2100, 3000, 4100, 5300, 6800, 8500, 10000],
    superblack: [1700, 3200, 4200, 5600, 7000, 9000, 11000, 13000],
    copper: [800, 1800, 2500, 3500, 4500, 6000, 7500, 8000],
    goldblackeye: [1400, 2800, 3800, 5200, 7000, 9000, 11000, 13000],
    chimera: [2100, 3800, 5200, 7000, 9000, 11000, 14000, 18000],
    yellow: [1500, 3000, 4100, 5500, 7000, 8800, 11000, 13000],
    dalmatian: [2800, 4900, 6700, 9100, 12000, 15500, 19500, 25000]
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
    
    // 幼生（age=0）の価格を大幅に下げる
    if (ax.age === 0) {
      base = Math.floor(base * 0.1); // 10%の価格
    }
    
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

  function openNamingModal(axolotlId, isHatch) {
    // 名付け専用モーダルを開く（openDetailModalを呼び出すが、名付けモードとして）
    openDetailModal(axolotlId);
    // 名付けモードのフラグを設定（openDetailModal内で使用）
    if (window._namingMode) window._namingMode = null;
    window._namingMode = { axolotlId: axolotlId, isHatch: isHatch };
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
    
    // 名前編集欄（要素A/Bシステム）
    var nameEditDiv = document.createElement('div');
    nameEditDiv.style.marginBottom = '8px';
    
    // 要素A
    var elementADiv = document.createElement('div');
    elementADiv.style.marginBottom = '4px';
    elementADiv.innerHTML = '<label style="font-size:11px;">要素A：</label>';
    var elementAInput = document.createElement('input');
    elementAInput.type = 'text';
    elementAInput.value = displayAx.nameElementA || '';
    elementAInput.placeholder = '要素A（例：斑）';
    elementAInput.style.width = 'calc(100% - 100px)';
    elementAInput.style.padding = '4px';
    elementAInput.style.marginTop = '2px';
    elementAInput.style.fontSize = '12px';
    elementAInput.style.marginRight = '4px';
    var hereditaryACheckbox = document.createElement('input');
    hereditaryACheckbox.type = 'checkbox';
    hereditaryACheckbox.checked = displayAx.isHereditaryA || false;
    hereditaryACheckbox.id = 'hereditaryA_' + axolotlId;
    var hereditaryALabel = document.createElement('label');
    hereditaryALabel.htmlFor = 'hereditaryA_' + axolotlId;
    hereditaryALabel.textContent = '通字';
    hereditaryALabel.style.fontSize = '11px';
    hereditaryALabel.style.marginLeft = '4px';
    elementADiv.appendChild(elementAInput);
    elementADiv.appendChild(hereditaryACheckbox);
    elementADiv.appendChild(hereditaryALabel);
    
    // 要素B
    var elementBDiv = document.createElement('div');
    elementBDiv.style.marginBottom = '4px';
    elementBDiv.innerHTML = '<label style="font-size:11px;">要素B：</label>';
    var elementBInput = document.createElement('input');
    elementBInput.type = 'text';
    elementBInput.value = displayAx.nameElementB || '';
    elementBInput.placeholder = '要素B（例：尾）';
    elementBInput.style.width = 'calc(100% - 100px)';
    elementBInput.style.padding = '4px';
    elementBInput.style.marginTop = '2px';
    elementBInput.style.fontSize = '12px';
    elementBInput.style.marginRight = '4px';
    var hereditaryBCheckbox = document.createElement('input');
    hereditaryBCheckbox.type = 'checkbox';
    hereditaryBCheckbox.checked = displayAx.isHereditaryB || false;
    hereditaryBCheckbox.id = 'hereditaryB_' + axolotlId;
    var hereditaryBLabel = document.createElement('label');
    hereditaryBLabel.htmlFor = 'hereditaryB_' + axolotlId;
    hereditaryBLabel.textContent = '通字';
    hereditaryBLabel.style.fontSize = '11px';
    hereditaryBLabel.style.marginLeft = '4px';
    elementBDiv.appendChild(elementBInput);
    elementBDiv.appendChild(hereditaryBCheckbox);
    elementBDiv.appendChild(hereditaryBLabel);
    
    // 名前の更新処理
    function updateNameFromElements() {
      var elementA = elementAInput.value.trim();
      var elementB = elementBInput.value.trim();
      var isHereditaryA = hereditaryACheckbox.checked;
      var isHereditaryB = hereditaryBCheckbox.checked;
      
      // Aが空欄でBに通字がある場合、Aにランダムな要素を入れる（オスのA候補から）
      if (!elementA && elementB && isHereditaryB) {
        elementA = maleNameElementA[Math.floor(Math.random() * maleNameElementA.length)];
        elementAInput.value = elementA;
      }
      
      var newName = (elementA || '') + (elementB || '');
      if (newName === '') newName = null;
      
      if (currentAx) {
        // 古い名前を削除（重複チェック用）
        var oldName = currentAx.name;
        if (oldName && state.usedNames && state.usedNames[oldName]) {
          delete state.usedNames[oldName];
        }
        
        // 新しい名前を登録（重複チェック）
        if (newName) {
          newName = generateUniqueName(newName);
        }
        
        currentAx.name = newName;
        currentAx.nameElementA = elementA || null;
        currentAx.nameElementB = elementB || null;
        currentAx.isHereditaryA = isHereditaryA;
        currentAx.isHereditaryB = isHereditaryB;
        if (axolotlRegistry[axolotlId]) {
          axolotlRegistry[axolotlId].name = newName;
          axolotlRegistry[axolotlId].nameElementA = elementA || null;
          axolotlRegistry[axolotlId].nameElementB = elementB || null;
          axolotlRegistry[axolotlId].isHereditaryA = isHereditaryA;
          axolotlRegistry[axolotlId].isHereditaryB = isHereditaryB;
        }
        // モーダル内の表示のみ更新
        var nameEl = $('axDetailName');
        var sexDisplayHtml = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
        var namePart = newName || typeLabel(displayAx.type);
        var displayName = (displayAx.familyName ? displayAx.familyName + ' ' : '') + namePart;
        nameEl.innerHTML = displayName + (sexDisplayHtml ? ' ' + sexDisplayHtml : '');
      }
    }
    
    elementAInput.addEventListener('change', updateNameFromElements);
    elementBInput.addEventListener('change', updateNameFromElements);
    hereditaryACheckbox.addEventListener('change', updateNameFromElements);
    hereditaryBCheckbox.addEventListener('change', updateNameFromElements);
    
    nameEditDiv.appendChild(elementADiv);
    nameEditDiv.appendChild(elementBDiv);
    bodyEl.appendChild(nameEditDiv);
    
    // 既存の名前がある場合は要素A/Bに分割
    if (displayAx.name && !displayAx.nameElementA && !displayAx.nameElementB) {
      // 既存の名前を2文字に分割（最初の1文字がA、残りがB）
      var existingName = displayAx.name;
      if (existingName.length >= 2) {
        elementAInput.value = existingName.substring(0, 1);
        elementBInput.value = existingName.substring(1);
      } else {
        elementBInput.value = existingName;
      }
      updateNameFromElements();
    }
    
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
          // モーダル内の表示のみ更新（アニメーションを維持）
          var nameEl = $('axDetailName');
          var sexDisplayHtml = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
          var namePart = displayAx.name || typeLabel(displayAx.type);
          var displayName = (newFamilyName ? newFamilyName + ' ' : '') + namePart;
          nameEl.innerHTML = displayName + (sexDisplayHtml ? ' ' + sexDisplayHtml : '');
        }
      });
      familyNameEditDiv.appendChild(familyNameInput);
      bodyEl.appendChild(familyNameEditDiv);
    }
    
    // 水質の数値を取得
    var tankClean = foundTank && foundTank.clean !== undefined ? foundTank.clean : 80;
    
    var bodyText = 
      'サイズ：' + formatSize(displayAx.size) + '\n' +
      '年齢：' + displayAx.age + 'ヶ月\n' +
      '健康：' + Math.round(displayAx.health || 100) + '/100\n' +
      '空腹：' + Math.round(displayAx.hunger || 100) + '/100\n' +
      '水質：' + Math.round(tankClean) + '/100\n' +
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
    
    // 最初のウパの名付け画面の場合のみ「決定」に変更（名前がついていない場合のみ）
    var isInitialAxolotl = false;
    var isHatchNaming = false;
    var isShopNaming = false;
    
    if (window._namingMode && window._namingMode.axolotlId === axolotlId) {
      isHatchNaming = window._namingMode.isHatch;
      isShopNaming = !isHatchNaming;
    } else {
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.id === axolotlId && tank.note === '最初のウパ' && !tank.axolotl.name) {
          isInitialAxolotl = true;
        }
        if (tank.axolotl && tank.axolotl.id === axolotlId && tank.note === '1ヶ月目のウパ' && !tank.axolotl.name) {
          isHatchNaming = true;
        }
        if (tank.axolotl && tank.axolotl.id === axolotlId && (tank.note === 'ショップで購入したウパ' || tank.note === 'ミューテーションショップで購入したウパ') && !tank.axolotl.name) {
          isShopNaming = true;
        }
      });
    }
    
    var cancelBtn = $('axDetailCancel');
    var sellBtn = $('axDetailSell');
    if (isInitialAxolotl || isHatchNaming || isShopNaming) {
      cancelBtn.textContent = '決定';
      if (sellBtn) sellBtn.style.display = 'none';
    } else {
      cancelBtn.textContent = '閉じる';
      if (sellBtn) {
        sellBtn.style.display = 'block';
        sellBtn.textContent = '販売 ' + formatMoney(calcPrice(displayAx));
        // 既存のイベントリスナーを削除
        var newSellBtn = sellBtn.cloneNode(true);
        sellBtn.parentNode.replaceChild(newSellBtn, sellBtn);
        // 新しいボタンにイベントリスナーを設定
        var currentAxolotlId = axolotlId; // クロージャで保持
        newSellBtn.onclick = function() {
          sellAxolotlFromDetail(currentAxolotlId);
        };
      }
    }
    
    $('axOverlayDetail').classList.add('visible');
  }
  
  function sellAxolotlFromDetail(axolotlId) {
    // 水槽から該当個体を探して販売
    var foundTank = null;
    var isBreedingPair = false;
    state.tanks.forEach(function(tank, idx) {
      if (tank.axolotl && tank.axolotl.id === axolotlId) {
        foundTank = { tank: tank, idx: idx };
      }
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function(pairAx) {
          if (pairAx.id === axolotlId) {
            foundTank = { tank: tank, idx: idx };
            isBreedingPair = true;
          }
        });
      }
    });
    
    if (!foundTank) {
      logLine('この個体は既に販売されています。');
      $('axOverlayDetail').classList.remove('visible');
      updateUI();
      return;
    }
    
    if (isBreedingPair) {
      // 繁殖ペアの場合は分離してから販売
      separateBreedingPair(foundTank.idx);
      // 分離後、該当個体を探して販売
      state.tanks.forEach(function(tank, idx) {
        if (tank.axolotl && tank.axolotl.id === axolotlId) {
          actSellTank(idx);
        }
      });
    } else {
      actSellTank(foundTank.idx);
    }
    
    $('axOverlayDetail').classList.remove('visible');
    updateUI();
  }

  function closeDetailModal() {
    // 名付け後の処理
    var hatchTank = state.tanks.find(function(tank) {
      return tank.axolotl && tank.note === '1ヶ月目のウパ' && tank.axolotl.name;
    });
    if (hatchTank) {
      hatchTank.note = '1ヶ月目のウパ';
      if (window._namingMode) window._namingMode = null;
    }
    
    var shopTank = state.tanks.find(function(tank) {
      return tank.axolotl && (tank.note === 'ショップで購入したウパ' || tank.note === 'ミューテーションショップで購入したウパ') && tank.axolotl.name;
    });
    if (shopTank) {
      shopTank.note = shopTank.note === 'ショップで購入したウパ' ? 'ショップで購入したウパ' : 'ミューテーションショップで購入したウパ';
      if (window._namingMode) window._namingMode = null;
    }
    
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
        // 最初のウパのnoteを更新（名前がついたので通常の個体として扱う）
        initialTank.note = '親ウパ';
        setTimeout(function() {
          logLine(axName + 'と一緒にいい店にできるように頑張ろう！');
        }, 300);
      }
    }
    // 名付けモードをクリア
    if (window._namingMode) window._namingMode = null;
    $('axOverlayDetail').classList.remove('visible');
    // モーダルを閉じた後にupdateUI()を呼ぶ（アニメーションを維持するため、少し遅延させる）
    setTimeout(function() {
      updateUI();
    }, 200);
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
      overlay.innerHTML = '<div class="ax-overlay-box"><h2>孵化した幼生から1匹を選ぶ</h2><p style="font-size:12px; margin-bottom:8px;">10匹の候補から1匹を選んでください。残りは自動的に売却されます。</p><div id="axHatchList" style="margin-bottom:12px; max-height:60vh; overflow-y:auto;"></div><button type="button" class="btn" style="background:#64748b; border-color:#64748b;" id="axHatchCancel">キャンセル</button></div>';
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
      div.style.padding = '12px';
      div.style.border = '2px solid #bfdbfe';
      div.style.borderRadius = '8px';
      div.style.background = '#f0f9ff';
      
      var header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.gap = '12px';
      header.style.marginBottom = '8px';
      
      var img = document.createElement('img');
      img.src = typeImagePath(candidate.type);
      setPixelArtImageSize(img, 64, 64);
      header.appendChild(img);
      
      var info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = '<div style="font-weight:bold; font-size:16px; margin-bottom:4px;">' + typeLabel(candidate.type) + '</div><div style="font-size:12px; color:#64748b;">健康度: ' + candidate.health + ' / 空腹度: ' + candidate.hunger + '</div>';
      header.appendChild(info);
      div.appendChild(header);
      
      var btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '8px';
      
      var detailBtn = document.createElement('button');
      detailBtn.type = 'button';
      detailBtn.className = 'ax-btn detail';
      detailBtn.textContent = '詳細';
      detailBtn.style.flex = '1';
      detailBtn.style.minHeight = '44px';
      detailBtn.dataset.axolotlId = String(candidate.id);
      detailBtn.addEventListener('click', function() {
        openDetailModal(parseInt(this.dataset.axolotlId, 10));
      });
      btnRow.appendChild(detailBtn);
      
      var selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'ax-btn breed';
      selectBtn.textContent = 'この子を育てる';
      selectBtn.style.flex = '1';
      selectBtn.style.minHeight = '44px';
      selectBtn.dataset.candidateIndex = String(idx);
      selectBtn.addEventListener('click', function() {
        selectHatchCandidate(tankIdx, parseInt(this.dataset.candidateIndex, 10), candidates, remainingJuveniles);
      });
      btnRow.appendChild(selectBtn);
      
      div.appendChild(btnRow);
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
    
    // 選択した1匹を1ヶ月の状態で水槽に入れる（juvenilesではなくaxolotlとして）
    selected.age = 1;
    selected.size = calculateSizeFromAge(1);
    if (axolotlRegistry[selected.id]) {
      axolotlRegistry[selected.id].age = 1;
      axolotlRegistry[selected.id].size = selected.size;
    }
    tank.axolotl = selected;
    tank.juveniles = null;
    tank.juvenileAge = null;
    tank.baby = true;
    tank.note = '1ヶ月目のウパ';
    
    // 一時データをクリア
    tank._hatchCandidates = null;
    tank._hatchRemaining = null;
    
    logLine('孵化した幼生から' + typeLabel(selected.type) + 'を選んだ。残り' + toSell.length + '匹を' + formatMoney(totalPrice) + 'で販売した。');
    $('axOverlayHatch').classList.remove('visible');
    
    // 名付けフェーズを表示
    openNamingModal(selected.id, true);
    
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
      // 水質に応じた背景色を設定（空き水槽と卵の水槽は色なし）
      var isEmpty = !tank.axolotl && !tank.breedingPair && !tank.juveniles && !tank.egg;
      if (!isEmpty && !tank.egg) {
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
        // 中心で二分割、それぞれクリック可能
        lines.innerHTML = 
          '<div style="display:flex; justify-content:space-around; border-bottom:1px solid #e5e7eb; padding-bottom:8px; margin-bottom:8px;">' +
          '<div class="ax-breeding-pair-item" style="flex:1; text-align:center; border-right:1px solid #e5e7eb; padding-right:8px; cursor:pointer;" data-axolotl-id="' + p1.id + '">' +
          '<div style="font-weight:bold; margin-bottom:4px;">' + p1Name + (p1Sex ? ' ' + p1Sex : '') + '</div>' +
          '<div style="font-size:11px; color:#64748b; margin-bottom:4px;">齢: ' + p1.age + 'ヶ月</div>' +
          '</div>' +
          '<div class="ax-breeding-pair-item" style="flex:1; text-align:center; padding-left:8px; cursor:pointer;" data-axolotl-id="' + p2.id + '">' +
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
        // 各個体をクリック可能にする
        var pairItems = lines.querySelectorAll('.ax-breeding-pair-item');
        pairItems.forEach(function(item) {
          item.addEventListener('click', function() {
            var axId = parseInt(this.dataset.axolotlId, 10);
            openDetailModal(axId);
          });
        });
      } else if (tank.egg) {
        var eggText = '卵 ' + (tank.eggCount || 500) + '個\n孵化まであと' + (tank.hatchMonthsLeft != null ? tank.hatchMonthsLeft : 1) + 'ヶ月';
        lines.textContent = eggText;
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        lines.textContent = '幼生：' + tank.juveniles.length + '匹\n' + (tank.juvenileAge || 0) + '/5ヶ月';
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
        wrap.className = 'ax-tank-sprite-wrap';
        wrap.style.display = 'flex';
        wrap.style.gap = '4px';
        wrap.style.justifyContent = 'center';
        var inner = document.createElement('div');
        inner.style.display = 'flex';
        inner.style.gap = '4px';
        inner.style.justifyContent = 'center';
        [pair[0], pair[1]].forEach(function (ax, idx) {
          var hopAnimations = ['ax-hop-left', 'ax-hop-right', 'ax-hop-center'];
          var randomHop = hopAnimations[Math.floor(Math.random() * hopAnimations.length)];
          if (ax.type === 'chimera') {
            var iconSize = getIconSizeFromSize(ax.size);
            var sprite = createChimeraCanvasSprite(ax, iconSize);
            sprite.classList.add('ax-idle');
            sprite.classList.add(randomHop);
            sprite.dataset.bobIntervalMs = String(getBobIntervalMs(ax));
            sprite.dataset.bobIndex = '0';
            sprite.dataset.bobLastStep = '0';
            inner.appendChild(sprite);
          } else {
            var iconSize = getIconSizeFromSize(ax.size);
            var sprite = createPixelArtCanvasSprite(ax, iconSize);
            sprite.classList.add('ax-idle');
            sprite.classList.add(randomHop);
            sprite.dataset.bobIntervalMs = String(getBobIntervalMs(ax));
            sprite.dataset.bobIndex = '0';
            sprite.dataset.bobLastStep = '0';
            inner.appendChild(sprite);
          }
          if (idx === 0) {
            var divider = document.createElement('div');
            divider.style.width = '1px';
            divider.style.background = '#e5e7eb';
            divider.style.margin = '0 2px';
            inner.appendChild(divider);
          }
        });
        wrap.appendChild(inner);
        body.appendChild(wrap);
        
        // うんこの表示（繁殖ペアの場合）
        if (tank.poop) {
          var poopEl = document.createElement('img');
          poopEl.src = '/assets/unko.png';
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
        var eggWrap = document.createElement('div');
        eggWrap.className = 'ax-tank-sprite-wrap';
        eggWrap.appendChild(eggEl);
        body.appendChild(eggWrap);
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        var juvenileEl = document.createElement('div');
        juvenileEl.className = 'ax-tank-juvenile';
        juvenileEl.textContent = '🐟 ' + tank.juveniles.length + '匹';
        var juvWrap = document.createElement('div');
        juvWrap.className = 'ax-tank-sprite-wrap';
        juvWrap.appendChild(juvenileEl);
        body.appendChild(juvWrap);
      } else if (tank.axolotl) {
        var ax = tank.axolotl;
        var spriteWrap = document.createElement('div');
        spriteWrap.className = 'ax-tank-sprite-wrap';
        var hopAnimations = ['ax-hop-left', 'ax-hop-right', 'ax-hop-center'];
        var randomHop = hopAnimations[Math.floor(Math.random() * hopAnimations.length)];
        if (ax.type === 'chimera') {
          var iconSize = getIconSizeFromSize(ax.size);
          var sprite = createChimeraCanvasSprite(ax, iconSize);
          sprite.classList.add('ax-idle');
          sprite.classList.add(randomHop);
          sprite.dataset.bobIntervalMs = String(getBobIntervalMs(ax));
          sprite.dataset.bobIndex = '0';
          sprite.dataset.bobLastStep = '0';
          spriteWrap.appendChild(sprite);
        } else {
          var iconSize = getIconSizeFromSize(ax.size);
          var sprite = createPixelArtCanvasSprite(ax, iconSize);
          sprite.classList.add('ax-idle');
          sprite.classList.add(randomHop);
          sprite.dataset.bobIntervalMs = String(getBobIntervalMs(ax));
          sprite.dataset.bobIndex = '0';
          sprite.dataset.bobLastStep = '0';
          spriteWrap.appendChild(sprite);
        }
        body.appendChild(spriteWrap);
        
        // うんこの表示
        if (tank.poop) {
          var poopEl = document.createElement('img');
          poopEl.src = '/assets/unko.png';
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
        // 水替えボタン
        var cleanBtn = document.createElement('button');
        cleanBtn.type = 'button';
        cleanBtn.className = 'ax-tank-action-btn clean';
        var waterChangeType = state.waterChangeType || 'normal';
        var waterChangeCost = WATER_CHANGE_NORMAL_COST;
        if (waterChangeType === 'partial') {
          waterChangeCost = WATER_CHANGE_PARTIAL_COST;
        } else if (waterChangeType === 'full') {
          waterChangeCost = WATER_CHANGE_FULL_COST;
        }
        cleanBtn.innerHTML = '水替え<br><span style="font-size:10px; opacity:0.8;">¥' + waterChangeCost.toLocaleString('ja-JP') + '</span>';
        cleanBtn.dataset.tankIndex = String(idx);
        cleanBtn.addEventListener('click', function () {
          doCleanTank(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(cleanBtn);
        
        // 給餌ボタン
        var feedBtn = document.createElement('button');
        feedBtn.type = 'button';
        feedBtn.className = 'ax-tank-action-btn feed';
        var feedType = state.feedType || 'artificial';
        var feedCost = FEED_ARTIFICIAL_COST;
        if (feedType === 'bloodworm') {
          feedCost = FEED_BLOODWORM_COST;
        } else if (feedType === 'earthworm') {
          feedCost = FEED_EARTHWORM_COST;
        }
        feedBtn.innerHTML = '給餌<br><span style="font-size:10px; opacity:0.8;">¥' + feedCost.toLocaleString('ja-JP') + '</span>';
        feedBtn.dataset.tankIndex = String(idx);
        feedBtn.addEventListener('click', function () {
          openTankFeedModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(feedBtn);
        
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
        // 水替えボタン
        var cleanBtn = document.createElement('button');
        cleanBtn.type = 'button';
        cleanBtn.className = 'ax-tank-action-btn clean';
        var waterChangeType = state.waterChangeType || 'normal';
        var waterChangeCost = WATER_CHANGE_NORMAL_COST;
        if (waterChangeType === 'partial') {
          waterChangeCost = WATER_CHANGE_PARTIAL_COST;
        } else if (waterChangeType === 'full') {
          waterChangeCost = WATER_CHANGE_FULL_COST;
        }
        cleanBtn.innerHTML = '水替え<br><span style="font-size:10px; opacity:0.8;">¥' + waterChangeCost.toLocaleString('ja-JP') + '</span>';
        cleanBtn.dataset.tankIndex = String(idx);
        cleanBtn.addEventListener('click', function () {
          doCleanTank(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(cleanBtn);
        
        // 給餌ボタン
        var feedBtn = document.createElement('button');
        feedBtn.type = 'button';
        feedBtn.className = 'ax-tank-action-btn feed';
        var feedType = state.feedType || 'artificial';
        var feedCost = FEED_ARTIFICIAL_COST;
        if (feedType === 'bloodworm') {
          feedCost = FEED_BLOODWORM_COST;
        } else if (feedType === 'earthworm') {
          feedCost = FEED_EARTHWORM_COST;
        }
        feedBtn.innerHTML = '給餌<br><span style="font-size:10px; opacity:0.8;">¥' + feedCost.toLocaleString('ja-JP') + '</span>';
        feedBtn.dataset.tankIndex = String(idx);
        feedBtn.addEventListener('click', function () {
          openTankFeedModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(feedBtn);
        
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
    
    if (btnBreed) {
      var adults = getAdultTanks();
      var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
      var males = adults.filter(function (x) { return x.tank.axolotl && x.tank.axolotl.sex === 'オス'; });
      var females = adults.filter(function (x) { return x.tank.axolotl && x.tank.axolotl.sex === 'メス'; });
      var canBreed = !disabled && adults.length >= 2 && empty && males.length > 0 && females.length > 0;
      btnBreed.disabled = !canBreed;
    }
    if (btnTreat) btnTreat.disabled = disabled;
    if (btnBuy) btnBuy.disabled = disabled;
    if (btnEncyclopedia) btnEncyclopedia.disabled = disabled;
    if (btnAchievements) btnAchievements.disabled = disabled;
    
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

    // ゴール実績のチェック（達成時にゴール表示を出し、続ける/やめるを選べる）
    checkGoalAchievements();
  }

  function checkGoalAchievements() {
    if (state.ended) return;
    var goalAchievements = achievementDefinitions.filter(function(a) { return a.goal === true; });
    for (var i = 0; i < goalAchievements.length; i++) {
      var ach = goalAchievements[i];
      if (ach.check() && !state.achievements[ach.id]) {
        state.achievements[ach.id] = true;
        logLine('【実績】' + ach.name + ' - ' + ach.desc);
        var titleEl = document.getElementById('axGoalTitle');
        var msgEl = document.getElementById('axGoalMessage');
        if (titleEl) titleEl.textContent = 'ゴール達成！';
        if (msgEl) msgEl.textContent = ach.name + '\n\n' + ach.desc + '\n\n続けてプレイするか、ここでやめますか？';
        var overlay = document.getElementById('axOverlayGoal');
        if (overlay) overlay.classList.add('visible');
        return;
      }
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
    // ゴール実績は checkGoalAchievements() で評判100含め「ゴール達成」表示に統一
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

  function removeAllPoop() {
    var cleanedCount = 0;
    state.tanks.forEach(function(tank) {
      if (tank.poop) {
        tank.poop = false;
        cleanedCount++;
      }
    });
    if (cleanedCount > 0) {
      logLine('全水槽のうんこを掃除した。（' + cleanedCount + '箇所）');
    } else {
      logLine('掃除するうんこがない。');
    }
    updateUI();
  }

  function checkMutationShop() {
    // ミューテーションショップ: 最大4匹の未固定（ミューテーション）個体をランダムに生成
    state.mutationShopItems = [];
    
    // 4匹をランダムに生成
    for (var i = 0; i < 4; i++) {
      // タイプをランダムに選択（全タイプから、固定化の有無に関わらず）
      var selectedType = AXO_TYPES[Math.floor(Math.random() * AXO_TYPES.length)];
      
      // 年齢をランダムに選択（最大18ヶ月）
      var age = randInt(1, 18);
      
      // キメラの場合はランダムな2種類を選択
      var chimeraTypes = null;
      if (selectedType === 'chimera') {
        var availableTypes = ['nomal', 'albino', 'gold', 'marble', 'copper', 'black'];
        var type1 = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        var type2 = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        while (type1 === type2) {
          type2 = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        }
        chimeraTypes = [type1, type2];
      }
      
      // 問題フラグ（病気または怪我）をランダムに設定
      var problemFlags = null;
      if (Math.random() < 0.3) { // 30%の確率で問題あり
        problemFlags = {};
        if (Math.random() < 0.5) {
          problemFlags.sick = true;
        } else {
          problemFlags.injured = true;
        }
      }
      
      // 価格を計算（基本価格 × 年齢係数 × 問題による割引）
      var basePrice = typePriceBase[selectedType] || 20000;
      var ageMultiplier = 0.5 + (age / 18) * 0.5; // 1ヶ月で0.5倍、18ヶ月で1.0倍
      var price = Math.floor(basePrice * ageMultiplier);
      
      // 問題がある場合は価格を下げる
      if (problemFlags) {
        price = Math.floor(price * SICK_PRICE_RATE); // 20%の価格
      }
      
      // 性別をランダムに決定
      var sex = Math.random() < 0.5 ? 'オス' : 'メス';
      
      state.mutationShopItems.push({
        type: selectedType,
        age: age,
        price: price,
        problemFlags: problemFlags,
        chimeraTypes: chimeraTypes,
        sex: sex
      });
    }
    
    state.mutationShopAvailable = true;
    logLine('【ミューテーションショップ】4匹の未固定個体が入荷しました！メニューボタン!を確認してください。');
    
    // ショップの在庫状態を日ごとに更新（品切れの可能性）
    state.shopStockDaily = {};
    
    // ショップにセールが発生（毎回1個か2個がランダムでセール）
    state.shopSale = true;
    state.shopSaleDiscount = 0.7; // 30%オフ
    state.shopSaleItems = []; // セール対象をリセット
    
    // 利用可能な商品タイプとサイズバンドの組み合わせを取得
    var availableItems = [];
    Object.keys(state.fixedTypes).forEach(function(type) {
      if (state.fixedTypes[type]) {
        // サイズバンド1（3ヶ月目）と7（成体）を追加
        availableItems.push({ type: type, band: 1 });
        availableItems.push({ type: type, band: 7 });
      }
    });
    
    // 1個か2個をランダムに選択
    var saleCount = Math.random() < 0.5 ? 1 : 2;
    saleCount = Math.min(saleCount, availableItems.length);
    
    for (var j = 0; j < saleCount; j++) {
      if (availableItems.length === 0) break;
      var randomIndex = Math.floor(Math.random() * availableItems.length);
      state.shopSaleItems.push(availableItems[randomIndex]);
      availableItems.splice(randomIndex, 1);
    }
    
    if (state.shopSaleItems.length > 0) {
      var saleTypes = state.shopSaleItems.map(function(item) {
        return typeLabel(item.type) + (item.band === 7 ? '（成体）' : '（3ヶ月目）');
      }).join('、');
      logLine('【セール開催中】' + saleTypes + 'が30%オフになっています！');
    }
  }

  function endOfMonthDrift() {
    // マイグレーション: equipmentが無い場合は初期化
    if (!state.equipment) {
      state.equipment = { autoFeeder: false, filter: false, bottomCleaner: false, bottomCleanerLevel: 0, tankLevel: 1 };
    }
    if (state.equipment.bottomCleanerLevel === undefined) {
      state.equipment.bottomCleanerLevel = state.equipment.bottomCleaner ? 1 : 0;
    }
    if (state.equipment.tankLevel === undefined) {
      state.equipment.tankLevel = 2;  // 最初から3槽
    }
    
    state.tanks.forEach(function (tank, idx) {
      // 水質の初期化（未設定の場合）
      if (tank.clean === undefined) tank.clean = 80;
      if (tank.poop === undefined) tank.poop = false;
      var bcLevel = (state.equipment && state.equipment.bottomCleanerLevel) || 0;
      
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
      
      // うんこ未処理時の水質低下（底面掃除機レベルで低減）
      if (tank.poop) {
        var poopPenalty = POOP_PENALTY_PER_MONTH;
        if (bcLevel >= 1) poopPenalty = Math.floor(poopPenalty * (1 - bcLevel * 0.25));
        tank.clean = clamp(tank.clean - poopPenalty, 0, MAX_CLEAN);
      }
      
      // 個体数とサイズに応じた水質悪化（フィルタは従来どおり）
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
      
      var cleanDecay = 2 + (axolotlCount * 1.5) + (totalSizeFactor * 0.8);
      tank.clean = clamp(tank.clean - cleanDecay, 0, MAX_CLEAN);
      
      // うんこ発生（底面掃除機レベルで発生率低減: Lv0=30%, Lv1=22%, Lv2=15%, Lv3=10%）
      var poopRate = 0.3;
      if (bcLevel >= 1) poopRate = 0.3 * (1 - bcLevel * 0.25);
      if ((tank.axolotl || tank.breedingPair) && !tank.poop && Math.random() < poopRate) {
        tank.poop = true;
        logLine('水槽' + (idx + 1) + 'のウーパーがうんこをした。');
      }
      
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function (a) {
          a.hunger = clamp((a.hunger || MAX_HUNGER) - HUNGER_DECAY_PER_MONTH, 0, MAX_HUNGER);
          // 年齢を更新
          a.age += 1;
          // サイズを年齢に応じて更新
          if (a.size != null) {
            var newSize = calculateSizeFromAge(a.age);
            if (newSize > a.size) {
              a.size = newSize;
              if (axolotlRegistry[a.id]) {
                axolotlRegistry[a.id].size = a.size;
              }
            }
          }
          
          // 繁殖ペアの病気処理
          if (a.sick) {
            if (a.underTreatment && Math.random() < TREATMENT_RECOVER_CHANCE) {
              a.sick = false;
              a.underTreatment = false;
              logLine(typeLabel(a.type) + 'のウパが治療で回復した。');
            } else if (!a.underTreatment) {
              if (Math.random() < SICK_DEATH_CHANCE) {
                if (axolotlRegistry[a.id]) {
                  axolotlRegistry[a.id].removed = true;
                }
                // 繁殖ペアから削除
                var otherAx = tank.breedingPair.find(function(ax) { return ax.id !== a.id; });
                if (otherAx) {
                  tank.axolotl = otherAx;
                  tank.breedingPair = null;
                  tank.note = '病気で★になってしまった…';
                } else {
                  tank.axolotl = null;
                  tank.breedingPair = null;
                  tank.note = '病気で★になってしまった…';
                }
                logLine('ウーパールーパーが1匹病気で★になってしまった。');
                state.reputation = clamp(state.reputation - 10, 0, MAX_REP);
                return;
              }
              if (Math.random() < SICK_INJURY_CHANCE) {
                a.injured = true;
                logLine(typeLabel(a.type) + 'のウパが病気で欠損を負った。');
              }
            }
          }
        });
        // 関係メーターの更新（健康と空腹度に基づく）
        if (tank.relationshipMeter != null && tank.breedingPair && tank.breedingPair.length === 2) {
          var avgHealth = (tank.breedingPair[0].health + tank.breedingPair[1].health) / 2;
          var avgHunger = (tank.breedingPair[0].hunger + tank.breedingPair[1].hunger) / 2;
          var healthBonus = (avgHealth - 70) / 10; // 70を基準に
          var hungerBonus = (avgHunger - 70) / 10; // 70を基準に
          tank.relationshipMeter = clamp(tank.relationshipMeter + healthBonus + hungerBonus, 0, 100);
        }
        
        // 毎月繁殖を試行（両方とも病気でない場合のみ）
        if (tank.breedingPair && tank.breedingPair.length === 2 && !tank.breedingPair[0].sick && !tank.breedingPair[1].sick) {
          tryBreeding(idx);
        }
        
        return;
      }
      if (tank.egg) {
        // 孵化までの月数を減らす（初期化されていない場合は1ヶ月に設定）
        if (tank.hatchMonthsLeft === undefined || tank.hatchMonthsLeft === null) {
          tank.hatchMonthsLeft = 1;
        }
        tank.hatchMonthsLeft = tank.hatchMonthsLeft - 1;
        
        if (tank.hatchMonthsLeft <= 0) {
          // 孵化前に必要な情報を保存
          var parentTypes = tank.eggParentTypes || ['nomal', 'nomal'];
          var parentIds = tank.eggParentIds || [null, null];
          var parentShades = tank.eggParentShades || ['normal', 'normal'];
          var eggCount = tank.eggCount || 500;
          var relationshipMeter = tank.eggRelationshipMeter || 50;
          
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
          
          // 親の健康度を取得（孵化前に取得）
          var parent1Health = 100;
          var parent2Health = 100;
          state.tanks.forEach(function(t) {
            if (t.breedingPair) {
              t.breedingPair.forEach(function(ax) {
                if (ax.id === parentIds[0]) parent1Health = ax.health || 100;
                if (ax.id === parentIds[1]) parent2Health = ax.health || 100;
              });
            }
          });
          
          var parent1Shade = parentShades[0] || 'normal';
          var parent2Shade = parentShades[1] || 'normal';
          
          // 孵化数の計算（基本90%、健康度や水の汚れ、血の濃さやカップル関係性にも依存）
          var baseHatchRate = 0.9; // 基本90%
          var relationshipBonus = (relationshipMeter - 50) / 200; // -0.25 から +0.25
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
          
          // 卵の状態をクリア（孵化処理の前に）
          tank.egg = false;
          tank.eggCount = null;
          tank.eggParentTypes = null;
          tank.eggParentIds = null;
          tank.eggParentShades = null;
          tank.eggRelationshipMeter = null;
          tank.hatchMonthsLeft = null;
          
          // 10匹の候補をランダムに選択
          var candidates = [];
          var maxCandidates = Math.min(10, allJuveniles.length);
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
          tank.note = '幼生（' + tank.juvenileAge + '/5ヶ月）';
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
      // サイズを年齢に応じて更新
      if (ax.size != null) {
        var newSize = calculateSizeFromAge(ax.age);
        // 既存のサイズより大きい場合のみ更新（成長）
        if (newSize > ax.size) {
          ax.size = newSize;
          if (axolotlRegistry[ax.id]) {
            axolotlRegistry[ax.id].size = ax.size;
          }
        }
      }
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

  function updateMutationShopButton() {
    // ハンバーガーアイコンに!を表示
    var menuToggle = document.getElementById('axMenuToggle');
    if (menuToggle) {
      if (state.mutationShopAvailable && state.mutationShopItems && state.mutationShopItems.length > 0) {
        menuToggle.classList.add('has-notification');
      } else {
        menuToggle.classList.remove('has-notification');
      }
    }
  }
  
  function openMutationShopOverlay() {
    if (!state.mutationShopAvailable || !state.mutationShopItems || state.mutationShopItems.length === 0) {
      logLine('現在ミューテーションショップに出ている個体はありません。');
      return;
    }
    // ショップオーバーレイを開いて、ミューテーションショップ表示に切り替え
    var tabsEl = $('axBuyTabs');
    tabsEl.innerHTML = '';
    
    // ミューテーションショップ専用のタブ表示
    var mutationTab = document.createElement('button');
    mutationTab.type = 'button';
    mutationTab.className = 'ax-buy-tab';
    mutationTab.textContent = 'ミューテーション';
    mutationTab.dataset.tab = 'mutation';
    mutationTab.classList.add('active');
    tabsEl.appendChild(mutationTab);
    
    showBuyTypeList('mutation');
    $('axOverlayBuy').classList.add('visible');
  }

  function nextMonth() {
    state.month += 1;
    applyAutoEquipment();
    checkMutationShop();
    endOfMonthDrift();
    // 設定が有効な場合、空の水槽を下に移動
    if (state.settings && state.settings.autoReorderTanks) {
      reorderTanks();
    }
    checkEnd();
    updateUI();
    updateMutationShopButton();
  }

  function reorderTanks() {
    // 空の水槽を最後に移動
    var nonEmptyTanks = [];
    var emptyTanks = [];
    state.tanks.forEach(function(tank) {
      if (tank.axolotl || tank.breedingPair || tank.egg || tank.juveniles) {
        nonEmptyTanks.push(tank);
      } else {
        emptyTanks.push(tank);
      }
    });
    state.tanks = nonEmptyTanks.concat(emptyTanks);
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
    
    // 空腹度が100%の水槽を除外
    var feedableTanks = state.tanks.filter(function(tank) {
      if (!tank.axolotl && !tank.breedingPair) return false;
      if (tank.axolotl && (tank.axolotl.hunger || 80) >= MAX_HUNGER) return false;
      if (tank.breedingPair) {
        var allFull = true;
        tank.breedingPair.forEach(function(ax) {
          if ((ax.hunger || 80) < MAX_HUNGER) allFull = false;
        });
        if (allFull) return false;
      }
      return true;
    });
    
    if (feedableTanks.length === 0) {
      logLine('給餌できる水槽がありません（全て満腹です）。');
      return;
    }
    
    var totalCost = FEED_ARTIFICIAL_COST * feedableTanks.length;
    if (state.money < totalCost) {
      logLine('人工飼料代が足りない…。（¥' + totalCost.toLocaleString('ja-JP') + '）');
      return;
    }
    state.money -= totalCost;
    
    // 給餌可能な水槽にのみ人工飼料をあげる
    feedableTanks.forEach(function(tank) {
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
      // 水質を下げる（重要：給餌は水質を下げる）
      tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - FEED_ARTIFICIAL_DIRT, 0, MAX_CLEAN);
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
    
    // 空腹度が100%の水槽を除外
    var feedableTanks = state.tanks.filter(function(tank) {
      if (!tank.axolotl && !tank.breedingPair) return false;
      if (tank.axolotl && (tank.axolotl.hunger || 80) >= MAX_HUNGER) return false;
      if (tank.breedingPair) {
        var allFull = true;
        tank.breedingPair.forEach(function(ax) {
          if ((ax.hunger || 80) < MAX_HUNGER) allFull = false;
        });
        if (allFull) return false;
      }
      return true;
    });
    
    if (feedableTanks.length === 0) {
      logLine('給餌できる水槽がありません（全て満腹です）。');
      return;
    }
    
    if (state.money < FEED_BLOODWORM_COST) {
      logLine('アカムシ代が足りない…。');
      return;
    }
    state.money -= FEED_BLOODWORM_COST;
    
    // 給餌可能な水槽にのみアカムシをあげる
    feedableTanks.forEach(function(tank) {
      if (tank.axolotl) {
        tank.axolotl.health = clamp(tank.axolotl.health + FEED_BLOODWORM_HEALTH, 0, MAX_HEALTH);
        tank.axolotl.hunger = clamp((tank.axolotl.hunger || 80) + FEED_BLOODWORM_HUNGER, 0, MAX_HUNGER);
      }
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function(ax) {
          ax.health = clamp(ax.health + FEED_BLOODWORM_HEALTH, 0, MAX_HEALTH);
          ax.hunger = clamp((ax.hunger || 80) + FEED_BLOODWORM_HUNGER, 0, MAX_HUNGER);
        });
      }
      // 水質を下げる（重要：給餌は水質を下げる）
      tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - FEED_BLOODWORM_DIRT, 0, MAX_CLEAN);
    });
    
    logLine('アカムシを全体にあげた。汚れ高・成長やや高（ブースト）。');
    updateUI();
  }

  function doFeedTank(tankIdx, feedType) {
    var tank = state.tanks[tankIdx];
    if (!tank) {
      updateUI();
      return;
    }
    
    // 給餌対象のチェック
    if (!tank.axolotl && !tank.breedingPair) {
      logLine('給餌する対象がありません。');
      updateUI();
      return;
    }
    
    // 空腹度が100%なら給餌できない
    var canFeed = false;
    if (tank.axolotl && (tank.axolotl.hunger || 80) < MAX_HUNGER) {
      canFeed = true;
    }
    if (tank.breedingPair) {
      tank.breedingPair.forEach(function(ax) {
        if ((ax.hunger || 80) < MAX_HUNGER) {
          canFeed = true;
        }
      });
    }
    if (!canFeed) {
      logLine('空腹度が満タンなので給餌できません。');
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
    } else if (feedType === 'bloodworm') {
      cost = FEED_BLOODWORM_COST;
      healthBonus = FEED_BLOODWORM_HEALTH;
      hungerBonus = FEED_BLOODWORM_HUNGER;
      cleanPenalty = FEED_BLOODWORM_DIRT;
      feedName = 'アカムシ';
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
    var m = getFeedLevelMultipliers(feedType);
    cost = Math.floor(cost * m.cost);
    healthBonus = Math.floor(healthBonus * m.health);
    hungerBonus = Math.floor(hungerBonus * m.hunger);
    cleanPenalty = Math.floor(cleanPenalty * m.dirt);
    
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
    
    // 水質を下げる（重要：給餌は水質を下げる）
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
    
    // 空腹度が100%の水槽を除外
    var feedableTanks = state.tanks.filter(function(tank) {
      if (!tank.axolotl && !tank.breedingPair) return false;
      if (tank.axolotl && (tank.axolotl.hunger || 80) >= MAX_HUNGER) return false;
      if (tank.breedingPair) {
        var allFull = true;
        tank.breedingPair.forEach(function(ax) {
          if ((ax.hunger || 80) < MAX_HUNGER) allFull = false;
        });
        if (allFull) return false;
      }
      return true;
    });
    
    if (feedableTanks.length === 0) {
      logLine('給餌できる水槽がありません（全て満腹です）。');
      return;
    }
    
    var totalCost = FEED_EARTHWORM_COST * feedableTanks.length;
    if (state.money < totalCost) {
      logLine('ミミズ代が足りない…。（¥' + totalCost.toLocaleString('ja-JP') + '）');
      return;
    }
    state.money -= totalCost;
    
    // 給餌可能な水槽にのみミミズをあげる
    feedableTanks.forEach(function(tank) {
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
      // 水質を下げる（重要：給餌は水質を下げる）
      tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - FEED_EARTHWORM_DIRT, 0, MAX_CLEAN);
    });
    
    logLine('ミミズを全体にあげた。汚れ中・成長最高（育成特化）。');
    updateUI();
  }

  function actClean() {
    // 即発動：デフォルトの水替え方法で全体水替え
    var waterChangeType = state.waterChangeType || 'normal';
    var cost = WATER_CHANGE_NORMAL_COST;
    var bonus = WATER_CHANGE_NORMAL_BONUS;
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
    var cost = WATER_CHANGE_NORMAL_COST;
    var bonus = WATER_CHANGE_NORMAL_BONUS;
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
      { name: '通常水替え', cost: WATER_CHANGE_NORMAL_COST, bonus: WATER_CHANGE_NORMAL_BONUS },
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
    var overlay = document.getElementById('axOverlayWaterChange');
    
    if (isGlobal) {
      var occupiedTanks = state.tanks.filter(function(t) {
        return t.axolotl || t.breedingPair || t.juveniles || t.egg;
      });
      
      if (occupiedTanks.length === 0) {
        logLine('水替えする対象の水槽がない。');
        if (overlay) overlay.classList.remove('visible');
        return;
      }
      
      var totalCost = cost * occupiedTanks.length;
      if (state.money < totalCost) {
        logLine('水換えの費用が足りない…。（¥' + totalCost.toLocaleString('ja-JP') + '）');
        if (overlay) overlay.classList.remove('visible');
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
        if (overlay) overlay.classList.remove('visible');
        updateUI();
        return;
      }
      
      if (state.money < cost) {
        logLine('水換えの費用が足りない…。（¥' + cost.toLocaleString('ja-JP') + '）');
        if (overlay) overlay.classList.remove('visible');
        updateUI();
        return;
      }
      
      state.money -= cost;
      tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) + bonus, 0, MAX_CLEAN);
      logLine('水槽' + (tankIdx + 1) + 'の水をかえた。水質が上がった。');
    }
    
    if (overlay) overlay.classList.remove('visible');
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

  function separateBreedingPairForBreeding(tankIdx, axId) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.breedingPair) return;
    var pair = tank.breedingPair;
    var targetAx = pair.find(function(ax) { return ax.id === axId; });
    if (!targetAx) return;
    
    // 空き水槽を探す
    var emptyIdx = state.tanks.findIndex(function (t, i) {
      return i !== tankIdx && !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles;
    });
    
    if (emptyIdx >= 0) {
      // 空き水槽に移動
      state.tanks[emptyIdx].axolotl = targetAx;
      state.tanks[emptyIdx].baby = targetAx.age < 12;
      state.tanks[emptyIdx].note = '繁殖用に分離';
      if (state.tanks[emptyIdx].clean === undefined) state.tanks[emptyIdx].clean = 80;
      if (state.tanks[emptyIdx].poop === undefined) state.tanks[emptyIdx].poop = false;
      
      // もう1匹を残す
      var otherAx = pair.find(function(ax) { return ax.id !== axId; });
      if (otherAx) {
        tank.axolotl = otherAx;
        tank.baby = otherAx.age < 12;
        tank.note = '繁殖用に分離';
      } else {
        tank.axolotl = null;
        tank.note = '空き水槽';
      }
      tank.breedingPair = null;
      tank.breedingMonthsLeft = null;
      tank.relationshipMeter = null;
    }
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
    var result = [];
    state.tanks.forEach(function (t, idx) {
      // 通常の個体
      if (t.axolotl && !t.breedingPair && t.axolotl.age >= 12 && t.axolotl.health > 0 && !t.axolotl.injured && !t.axolotl.sick && t.axolotl.sex && (t.axolotl.sex === 'オス' || t.axolotl.sex === 'メス')) {
        result.push({ tank: t, idx: idx });
      }
      // 繁殖ペアの個体も考慮
      if (t.breedingPair && t.breedingPair.length === 2) {
        t.breedingPair.forEach(function(ax) {
          if (ax.age >= 12 && ax.health > 0 && !ax.injured && !ax.sick && ax.sex && (ax.sex === 'オス' || ax.sex === 'メス')) {
            // 仮想的なタンクオブジェクトを作成（繁殖ペアの個体を個別に扱うため）
            var virtualTank = { axolotl: ax, breedingPair: null };
            result.push({ tank: virtualTank, idx: idx });
          }
        });
      }
    });
    return result;
  }


  function openBreedOverlay() {
    var adults = getAdultTanks();
    var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (adults.length < 2 || !empty) {
      logLine('12ヶ月以上の成体2匹と空き水槽が必要だ。');
      return;
    }
    // 繁殖ペアの個体は実際のタンクから取得する必要がある
    var actualAdults = state.tanks.map(function (t, idx) {
      return { tank: t, idx: idx };
    }).filter(function (x) {
      return x.tank.axolotl && !x.tank.breedingPair && x.tank.axolotl.age >= 12 && x.tank.axolotl.health > 0 && !x.tank.axolotl.injured && !x.tank.axolotl.sick && x.tank.axolotl.sex && (x.tank.axolotl.sex === 'オス' || x.tank.axolotl.sex === 'メス');
    });
    // 繁殖ペアからも取得
    state.tanks.forEach(function (t, idx) {
      if (t.breedingPair && t.breedingPair.length === 2) {
        t.breedingPair.forEach(function(ax) {
          if (ax.age >= 12 && ax.health > 0 && !ax.injured && !ax.sick && ax.sex && (ax.sex === 'オス' || ax.sex === 'メス')) {
            var virtualTank = { axolotl: ax, breedingPair: null };
            actualAdults.push({ tank: virtualTank, idx: idx });
          }
        });
      }
    });
    var males = actualAdults.filter(function (x) { return x.tank.axolotl.sex === 'オス'; });
    var females = actualAdults.filter(function (x) { return x.tank.axolotl.sex === 'メス'; });
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
      // 繁殖ペアの個体の場合は特別なマーカーを付ける
      var isBreedingPair = state.tanks[x.idx] && state.tanks[x.idx].breedingPair && state.tanks[x.idx].breedingPair.some(function(ax) { return ax.id === x.tank.axolotl.id; });
      opt.value = String(x.idx) + (isBreedingPair ? '_bp_' + x.tank.axolotl.id : '');
      var namePart = x.tank.axolotl.name || typeLabel(x.tank.axolotl.type);
      var displayName = (x.tank.axolotl.familyName ? x.tank.axolotl.familyName + ' ' : '') + namePart;
      opt.textContent = '水槽' + (x.idx + 1) + '：' + displayName + (isBreedingPair ? '（同棲中）' : '');
      sel1.appendChild(opt);
    });
    
    // メス項目
    sel2.innerHTML = '';
    females.forEach(function (x) {
      var opt = document.createElement('option');
      // 繁殖ペアの個体の場合は特別なマーカーを付ける
      var isBreedingPair = state.tanks[x.idx] && state.tanks[x.idx].breedingPair && state.tanks[x.idx].breedingPair.some(function(ax) { return ax.id === x.tank.axolotl.id; });
      opt.value = String(x.idx) + (isBreedingPair ? '_bp_' + x.tank.axolotl.id : '');
      var namePart = x.tank.axolotl.name || typeLabel(x.tank.axolotl.type);
      var displayName = (x.tank.axolotl.familyName ? x.tank.axolotl.familyName + ' ' : '') + namePart;
      opt.textContent = '水槽' + (x.idx + 1) + '：' + displayName + (isBreedingPair ? '（同棲中）' : '');
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
      if (x.tank.axolotl && x.tank.axolotl.sick && !x.tank.axolotl.underTreatment) return true;
      if (x.tank.breedingPair) {
        return x.tank.breedingPair.some(function(ax) { return ax.sick && !ax.underTreatment; });
      }
      return false;
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
      var label = '水槽' + (x.idx + 1) + '：';
      if (x.tank.axolotl && x.tank.axolotl.sick) {
        label += typeLabel(x.tank.axolotl.type);
      } else if (x.tank.breedingPair) {
        var sickNames = x.tank.breedingPair.filter(function(ax) { return ax.sick && !ax.underTreatment; }).map(function(ax) { return typeLabel(ax.type); });
        label += sickNames.length > 0 ? sickNames.join('・') + '（同棲中）' : '繁殖ペア';
      }
      label += '（¥5,000）';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ax-btn treat';
      btn.style.marginBottom = '6px';
      btn.textContent = label;
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
    if (!tank || state.money < TREATMENT_COST) {
      $('axOverlayTreat').classList.remove('visible');
      updateUI();
      return;
    }
    var targetAx = null;
    if (tank.axolotl && tank.axolotl.sick && !tank.axolotl.underTreatment) {
      targetAx = tank.axolotl;
    } else if (tank.breedingPair) {
      for (var i = 0; i < tank.breedingPair.length; i++) {
        if (tank.breedingPair[i].sick && !tank.breedingPair[i].underTreatment) {
          targetAx = tank.breedingPair[i];
          break;
        }
      }
    }
    if (!targetAx) {
      $('axOverlayTreat').classList.remove('visible');
      updateUI();
      return;
    }
    state.money -= TREATMENT_COST;
    targetAx.underTreatment = true;
    if (axolotlRegistry[targetAx.id]) axolotlRegistry[targetAx.id].underTreatment = true;
    logLine('水槽' + (tankIdx + 1) + 'の' + typeLabel(targetAx.type) + 'の治療を開始した。（¥5,000）');
    $('axOverlayTreat').classList.remove('visible');
    updateUI();
  }

  function fillBuyTypeList(selectedType, isAuction, sizeBand, sex, options) {
    var list = $('axBuyTypeList');
    if (!list) return;
    
    // ミューテーションショップの場合は特別処理
    if (selectedType === 'mutation' && state.mutationShopAvailable && state.mutationShopItems && state.mutationShopItems.length > 0) {
      state.mutationShopItems.forEach(function(item) {
        var card = document.createElement('div');
        card.className = 'ax-buy-type-card ax-buy-type-btn';
        // 年齢からサイズバンドを計算（簡易版：年齢に基づいて適切なサイズを表示）
        var ageBand = item.age <= 3 ? 1 : (item.age <= 6 ? 3 : (item.age <= 12 ? 5 : 7));
        var shopIconSize = getShopIconSizeFromBand(ageBand);
        
        if (item.type === 'chimera') {
          var fakeAx = { id: 0, type: 'chimera', chimeraTypes: item.chimeraTypes || ['nomal', 'marble'] };
          var sprite = createChimeraCanvasSprite(fakeAx, shopIconSize);
          sprite.classList.add('ax-idle');
          sprite.dataset.bobIntervalMs = '500';
          sprite.dataset.bobIndex = '0';
          sprite.dataset.bobLastStep = '0';
          sprite.style.width = shopIconSize + 'px';
          sprite.style.height = shopIconSize + 'px';
          card.appendChild(sprite);
        } else {
          var img = document.createElement('img');
          img.src = typeImagePath(item.type);
          img.alt = '';
          img.className = 'ax-buy-type-img ax-axolotl-img ax-idle';
          img.dataset.bobIntervalMs = '500';
          img.dataset.bobIndex = '0';
          img.dataset.bobLastStep = '0';
          img.width = shopIconSize;
          img.height = shopIconSize;
          img.style.width = shopIconSize + 'px';
          img.style.height = shopIconSize + 'px';
          card.appendChild(img);
        }
        
        var nameSpan = document.createElement('span');
        nameSpan.className = 'ax-buy-type-name';
        var problemLabel = '';
        if (item.problemFlags && item.problemFlags.injured) problemLabel = '【欠損】';
        else if (item.problemFlags && item.problemFlags.sick) problemLabel = '【病気】';
        var ageLabel = item.age + 'ヶ月';
        nameSpan.textContent = problemLabel + typeLabel(item.type) + ' (' + ageLabel + ')';
        card.appendChild(nameSpan);
        
        var priceSpan = document.createElement('span');
        priceSpan.className = 'ax-buy-type-price';
        priceSpan.textContent = formatMoney(item.price);
        card.appendChild(priceSpan);
        
        var btnRow = document.createElement('div');
        btnRow.className = 'ax-buy-btn-row';
        btnRow.style.display = 'flex';
        btnRow.style.gap = '6px';
        btnRow.style.justifyContent = 'center';
        btnRow.style.marginTop = '6px';
        
        var detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'ax-btn ax-buy-detail-btn';
        detailBtn.textContent = '詳細';
        detailBtn.style.fontSize = '10px';
        detailBtn.style.padding = '4px 8px';
        detailBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var stats = getRandomShopStats();
          if (item.problemFlags && (item.problemFlags.injured || item.problemFlags.sick)) stats.health = Math.min(stats.health, 50);
          var detailText = '<p><strong>価格:</strong> ' + formatMoney(item.price) + '</p>';
          detailText += '<p><strong>詳細（個体差あり）:</strong><br>空腹: ' + stats.hunger + '% 健康: ' + stats.health + '% サイズ: 約' + formatSize(calculateSizeFromAge(item.age)) + '</p>';
          if (item.problemFlags && item.problemFlags.injured) detailText += '<p><strong>状態:</strong> 欠損</p>';
          else if (item.problemFlags && item.problemFlags.sick) detailText += '<p><strong>状態:</strong> 病気</p>';
          detailText += '<p>治療や世話で回復の余地があります。</p>';
          openShopDetail((problemLabel || '') + typeLabel(item.type) + ' (' + ageLabel + ')', detailText);
        });
        btnRow.appendChild(detailBtn);
        
        var buyBtn = document.createElement('button');
        buyBtn.type = 'button';
        buyBtn.className = 'ax-btn ax-buy-buy-btn';
        buyBtn.textContent = '購入';
        buyBtn.style.fontSize = '10px';
        buyBtn.style.padding = '4px 8px';
        buyBtn.dataset.type = item.type;
        buyBtn.dataset.age = String(item.age);
        buyBtn.dataset.price = String(item.price);
        buyBtn.dataset.injured = (item.problemFlags && item.problemFlags.injured) ? 'true' : '';
        buyBtn.dataset.sick = (item.problemFlags && item.problemFlags.sick) ? 'true' : '';
        buyBtn.dataset.chimeraTypes = item.chimeraTypes ? JSON.stringify(item.chimeraTypes) : '';
        if (state.money < item.price) buyBtn.disabled = true;
        buyBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (this.disabled) return;
          var flags = {};
          if (this.dataset.injured === 'true') flags.injured = true;
          if (this.dataset.sick === 'true') flags.sick = true;
          var chimeraTypes = null;
          if (this.dataset.chimeraTypes) {
            try {
              chimeraTypes = JSON.parse(this.dataset.chimeraTypes);
            } catch(e) {}
          }
          doBuyMutation(this.dataset.type, parseInt(this.dataset.age, 10), parseInt(this.dataset.price, 10), flags, chimeraTypes);
        });
        btnRow.appendChild(buyBtn);
        
        card.appendChild(btnRow);
        list.appendChild(card);
      });
      return;
    }
    
    
    // 訳あり商品（固定種・欠損 or 病気・低価格）
    if (options && options.isProblem) {
      var problemPrice = options.price;
      var problemBtn = document.createElement('button');
      problemBtn.type = 'button';
      problemBtn.className = 'ax-buy-type-btn ax-buy-type-btn-problem';
      var problemIconSize = getShopIconSizeFromBand(sizeBand || 1);
      if (selectedType === 'chimera') {
        var fakeAx = { id: 0, type: 'chimera', chimeraTypes: ['nomal', 'marble'] };
        var sprite = createChimeraCanvasSprite(fakeAx, problemIconSize);
        sprite.classList.add('ax-idle');
        sprite.dataset.bobIntervalMs = '500';
        sprite.dataset.bobIndex = '0';
        sprite.dataset.bobLastStep = '0';
        sprite.style.width = problemIconSize + 'px';
        sprite.style.height = problemIconSize + 'px';
        problemBtn.appendChild(sprite);
      } else {
        var img = document.createElement('img');
        img.src = typeImagePath(selectedType);
        img.alt = '';
        img.className = 'ax-buy-type-img ax-axolotl-img ax-idle';
        img.dataset.bobIntervalMs = '500';
        img.dataset.bobIndex = '0';
        img.dataset.bobLastStep = '0';
        img.width = problemIconSize;
        img.height = problemIconSize;
        img.style.width = problemIconSize + 'px';
        img.style.height = problemIconSize + 'px';
        problemBtn.appendChild(img);
      }
      var defectLabel = options.injured ? '欠損' : '病気';
      var problemStats = getRandomShopStats();
      if (options.injured || options.sick) problemStats.health = Math.min(problemStats.health, 50);
      var problemName = document.createElement('span');
      problemName.className = 'ax-buy-type-name';
      problemName.innerHTML = '【訳あり】' + typeLabel(selectedType) + ' (' + (sizeBand === 7 ? '成体' : '3ヶ月目') + ') … ' + defectLabel;
      problemBtn.appendChild(problemName);
      var problemPriceSpan = document.createElement('span');
      problemPriceSpan.className = 'ax-buy-type-price';
      problemPriceSpan.textContent = formatMoney(problemPrice);
      problemBtn.appendChild(problemPriceSpan);
      var btnRow = document.createElement('div');
      btnRow.className = 'ax-buy-btn-row';
      btnRow.style.display = 'flex';
      btnRow.style.gap = '6px';
      btnRow.style.justifyContent = 'center';
      btnRow.style.marginTop = '6px';
      var problemDetailBtn = document.createElement('button');
      problemDetailBtn.type = 'button';
      problemDetailBtn.className = 'ax-btn ax-buy-detail-btn';
      problemDetailBtn.textContent = '詳細';
      problemDetailBtn.style.fontSize = '10px';
      problemDetailBtn.style.padding = '4px 8px';
      problemDetailBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openShopDetail('【訳あり】' + typeLabel(selectedType) + ' (' + (sizeBand === 7 ? '成体' : '3ヶ月目') + ')', '<p><strong>価格:</strong> ' + formatMoney(problemPrice) + '</p><p><strong>状態:</strong> ' + defectLabel + '</p><p><strong>詳細（個体差あり）:</strong><br>空腹: ' + problemStats.hunger + '% 健康: ' + problemStats.health + '% サイズ: 約' + formatSize(getRandomSizeForShopBand(sizeBand || 1)) + '</p><p>治療や世話で回復の余地があります。価格は通常の約25%です。</p>');
      });
      btnRow.appendChild(problemDetailBtn);
      var problemBuyBtn = document.createElement('button');
      problemBuyBtn.type = 'button';
      problemBuyBtn.className = 'ax-btn ax-buy-buy-btn';
      problemBuyBtn.textContent = '購入';
      problemBuyBtn.style.fontSize = '10px';
      problemBuyBtn.style.padding = '4px 8px';
      problemBuyBtn.dataset.type = selectedType;
      problemBuyBtn.dataset.band = String(sizeBand || 1);
      problemBuyBtn.dataset.price = String(problemPrice);
      problemBuyBtn.dataset.problemInjured = options.injured ? 'true' : '';
      problemBuyBtn.dataset.problemSick = options.sick ? 'true' : '';
      if (state.money < problemPrice) problemBuyBtn.disabled = true;
      problemBuyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (this.disabled) return;
        var flags = {};
        if (this.dataset.problemInjured === 'true') flags.injured = true;
        if (this.dataset.problemSick === 'true') flags.sick = true;
        doBuy(this.dataset.type, parseInt(this.dataset.band, 10), parseInt(this.dataset.price, 10), false, null, flags);
      });
      btnRow.appendChild(problemBuyBtn);
      problemBtn.appendChild(btnRow);
      list.appendChild(problemBtn);
      return;
    }
    
    // サイズ選択（3ヶ月目または成体）
    var bandPrices = sizePriceTable[selectedType] || sizePriceTable.nomal;
    var price = bandPrices[sizeBand || 1]; // デフォルトは3ヶ月目
    if (!price) return;
    
    // セール適用（該当商品のみ）
    var isOnSale = false;
    if (state.shopSale && state.shopSaleItems && state.shopSaleItems.length > 0) {
      isOnSale = state.shopSaleItems.some(function(item) {
        return item.type === selectedType && item.band === sizeBand;
      });
    }
    if (isOnSale) {
      var discount = state.shopSaleDiscount || 0.7;
      price = Math.floor(price * discount);
    }
    
    // 品切れチェック（日によって品切れ中）
    var stockKey = selectedType + '_' + sizeBand + '_' + (sex || 'any');
    if (!state.shopStockDaily) state.shopStockDaily = {};
    if (state.shopStockDaily[stockKey] === undefined) {
      // 30%の確率で品切れ
      state.shopStockDaily[stockKey] = Math.random() >= 0.3;
    }
    var isOutOfStock = !state.shopStockDaily[stockKey];
    
    var card = document.createElement('div');
    card.className = 'ax-buy-type-card ax-buy-type-btn';
    var sizeLabel = sizeBand === 7 ? '成体' : '3ヶ月目のうーぱー';
    var saleLabel = isOnSale ? '【セール】' : '';
    var sexLabel = sex ? (sex === 'オス' ? ' ♂' : ' ♀') : '';
    var stockStatus = isOutOfStock ? ' <span style="color:#dc2626; font-size:10px;">（品切れ）</span>' : '';
    var shopIconSize = getShopIconSizeFromBand(sizeBand || 1);
    var stats = getRandomShopStats();
    
    if (selectedType === 'chimera') {
      var fakeAx = { id: 0, type: 'chimera', chimeraTypes: ['nomal', 'marble'] };
      var sprite = createChimeraCanvasSprite(fakeAx, shopIconSize);
      sprite.classList.add('ax-idle');
      sprite.dataset.bobIntervalMs = '500';
      sprite.dataset.bobIndex = '0';
      sprite.dataset.bobLastStep = '0';
      sprite.style.width = shopIconSize + 'px';
      sprite.style.height = shopIconSize + 'px';
      card.appendChild(sprite);
    } else {
      var img = document.createElement('img');
      img.src = typeImagePath(selectedType);
      img.alt = '';
      img.className = 'ax-buy-type-img ax-axolotl-img ax-idle';
      img.dataset.bobIntervalMs = '500';
      img.dataset.bobIndex = '0';
      img.dataset.bobLastStep = '0';
      img.width = shopIconSize;
      img.height = shopIconSize;
      img.style.width = shopIconSize + 'px';
      img.style.height = shopIconSize + 'px';
      card.appendChild(img);
    }
    var nameSpan = document.createElement('span');
    nameSpan.className = 'ax-buy-type-name';
    nameSpan.innerHTML = saleLabel + typeLabel(selectedType) + ' (' + sizeLabel + sexLabel + ')' + stockStatus;
    card.appendChild(nameSpan);
    var priceSpan = document.createElement('span');
    priceSpan.className = 'ax-buy-type-price';
    priceSpan.textContent = formatMoney(price);
    card.appendChild(priceSpan);
    var btnRow = document.createElement('div');
    btnRow.className = 'ax-buy-btn-row';
    btnRow.style.display = 'flex';
    btnRow.style.gap = '6px';
    btnRow.style.justifyContent = 'center';
    btnRow.style.marginTop = '6px';
    var detailBtn = document.createElement('button');
    detailBtn.type = 'button';
    detailBtn.className = 'ax-btn ax-buy-detail-btn';
    detailBtn.textContent = '詳細';
    detailBtn.style.fontSize = '10px';
    detailBtn.style.padding = '4px 8px';
    detailBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var effect = sizeBand === 7 ? '成体は繁殖に使用できます。' : '成長するとサイズが大きくなります。';
      openShopDetail(typeLabel(selectedType) + ' (' + sizeLabel + sexLabel + ')', '<p><strong>価格:</strong> ' + formatMoney(price) + '</p><p><strong>詳細（個体差あり）:</strong><br>空腹: ' + stats.hunger + '% 健康: ' + stats.health + '% サイズ: 約' + formatSize(detailSizeCm) + '</p><p><strong>効果:</strong><br>' + effect + '</p>');
    });
    btnRow.appendChild(detailBtn);
    var buyBtn = document.createElement('button');
    buyBtn.type = 'button';
    buyBtn.className = 'ax-btn ax-buy-buy-btn';
    buyBtn.textContent = '購入';
    buyBtn.style.fontSize = '10px';
    buyBtn.style.padding = '4px 8px';
    buyBtn.dataset.type = selectedType;
    buyBtn.dataset.band = String(sizeBand || 1);
    buyBtn.dataset.sex = sex || '';
    buyBtn.dataset.price = String(price);
    if (state.money < price || isOutOfStock) buyBtn.disabled = true;
    buyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!this.disabled && !isOutOfStock) {
        doBuy(this.dataset.type, parseInt(this.dataset.band, 10), parseInt(this.dataset.price, 10), false, this.dataset.sex || null);
      }
    });
    btnRow.appendChild(buyBtn);
    card.appendChild(btnRow);
    if (isOutOfStock) card.style.opacity = '0.5';
    list.appendChild(card);
  }

  function openBuyOverlay() {
    var tabsEl = $('axBuyTabs');
    tabsEl.innerHTML = '';
    
    // ミューテーションショップが利用可能な場合はそれを表示
    if (state.mutationShopAvailable && state.mutationShopItems && state.mutationShopItems.length > 0) {
      var mutationTab = document.createElement('button');
      mutationTab.type = 'button';
      mutationTab.className = 'ax-buy-tab';
      mutationTab.textContent = 'ミューテーション !';
      mutationTab.dataset.tab = 'mutation';
      mutationTab.classList.add('active');
      tabsEl.appendChild(mutationTab);
      showBuyTypeList('mutation');
      $('axOverlayBuy').classList.add('visible');
      return;
    }
    
    // 通常のショップは削除（固定化済みの販売を削除）
    // 設備タブのみ表示
    var equipmentTab = document.createElement('button');
    equipmentTab.type = 'button';
    equipmentTab.className = 'ax-buy-tab';
    equipmentTab.textContent = '設備';
    equipmentTab.dataset.tab = 'equipment';
    equipmentTab.classList.add('active');
    equipmentTab.addEventListener('click', function () {
      tabsEl.querySelectorAll('.ax-buy-tab').forEach(function (t) { t.classList.remove('active'); });
      equipmentTab.classList.add('active');
      showBuyTypeList('equipment');
    });
    tabsEl.appendChild(equipmentTab);
    
    showBuyTypeList('equipment');
    
    $('axOverlayBuy').classList.add('visible');
  }

  function showBuyTypeList(tabType) {
    var list = $('axBuyTypeList');
    list.innerHTML = '';
    
    if (tabType === 'equipment') {
      // 設備タブ：生体と同じく箱ごとに表示し、詳細・効果を見れるようにする
      function addEquipmentCard(name, statusText, detailTitle, detailBody, buyLabel, cost, disabled, onBuy) {
        var card = document.createElement('div');
        card.className = 'ax-equipment-card';
        var nameEl = document.createElement('div');
        nameEl.className = 'ax-equipment-name';
        nameEl.textContent = name;
        card.appendChild(nameEl);
        var levelEl = document.createElement('div');
        levelEl.className = 'ax-equipment-level';
        levelEl.textContent = statusText;
        card.appendChild(levelEl);
        var btns = document.createElement('div');
        btns.className = 'ax-equipment-btns';
        var detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'ax-btn ax-buy-detail-btn';
        detailBtn.textContent = '詳細';
        detailBtn.style.fontSize = '10px';
        detailBtn.style.padding = '4px 8px';
        detailBtn.addEventListener('click', function (e) { e.stopPropagation(); openShopDetail(detailTitle, detailBody); });
        btns.appendChild(detailBtn);
        var buyBtn = document.createElement('button');
        buyBtn.type = 'button';
        buyBtn.className = 'ax-btn ax-buy-buy-btn';
        buyBtn.textContent = buyLabel;
        buyBtn.style.fontSize = '10px';
        buyBtn.style.padding = '4px 8px';
        if (disabled) buyBtn.disabled = true;
        buyBtn.addEventListener('click', function (e) { e.stopPropagation(); if (!this.disabled && onBuy) onBuy(); });
        btns.appendChild(buyBtn);
        card.appendChild(btns);
        list.appendChild(card);
      }
      var addTankCost = 20000;
      // 自動給餌器
      addEquipmentCard(
        '自動給餌器',
        state.equipment && state.equipment.autoFeeder ? '購入済み' : '¥' + EQUIPMENT_AUTO_FEEDER_COST.toLocaleString('ja-JP'),
        '自動給餌器',
        '<p><strong>効果:</strong><br>毎ターン、空腹のウパに自動で給餌します（1匹あたり¥' + AUTO_FEEDER_COST_PER_FEED.toLocaleString('ja-JP') + '）。</p>',
        state.equipment && state.equipment.autoFeeder ? '購入済み' : '購入',
        EQUIPMENT_AUTO_FEEDER_COST,
        !!(state.equipment && state.equipment.autoFeeder) || state.money < EQUIPMENT_AUTO_FEEDER_COST,
        function () { buyEquipment('autoFeeder', EQUIPMENT_AUTO_FEEDER_COST); showBuyTypeList('equipment'); updateUI(); }
      );
      // フィルタ（従来どおり1回購入）
      addEquipmentCard(
        'フィルタ',
        state.equipment && state.equipment.filter ? '購入済み' : '¥' + EQUIPMENT_FILTER_COST.toLocaleString('ja-JP'),
        'フィルタ',
        '<p><strong>効果:</strong><br>水質の下がりを抑えます。毎ターン、使用中水槽の水質が少し回復します。（水槽ごとにアップグレード可能にする場合は今後対応）</p>',
        state.equipment && state.equipment.filter ? '購入済み' : '購入',
        EQUIPMENT_FILTER_COST,
        !!(state.equipment && state.equipment.filter) || state.money < EQUIPMENT_FILTER_COST,
        function () { buyEquipment('filter', EQUIPMENT_FILTER_COST); showBuyTypeList('equipment'); updateUI(); }
      );
      // 底面掃除機（Lv0→1→2→3、うんこ発生率低減）
      (function () {
        var bcLv = (state.equipment && state.equipment.bottomCleanerLevel) || 0;
        var nextCost = bcLv === 0 ? EQUIPMENT_BOTTOM_CLEANER_COST : bcLv === 1 ? EQUIPMENT_BOTTOM_CLEANER_COST_LV2 : EQUIPMENT_BOTTOM_CLEANER_COST_LV3;
        var maxed = bcLv >= MAX_BOTTOM_CLEANER_LEVEL;
        addEquipmentCard(
          '底面掃除機',
          'Lv' + bcLv + (maxed ? '（最大）' : ' → Lv' + (bcLv + 1) + ' ¥' + nextCost.toLocaleString('ja-JP')),
          '底面掃除機',
          '<p><strong>レベル:</strong> Lv0〜Lv3<br><strong>効果:</strong><br>Lv1〜でうんこ未処理時の水質低下・うんこ発生率を低減します。レベルが高いほど効果大。</p>',
          maxed ? '最大' : 'Lvアップ',
          nextCost,
          maxed || state.money < nextCost,
          maxed ? null : function () { buyEquipment('bottomCleaner', nextCost); showBuyTypeList('equipment'); updateUI(); }
        );
      })();
      // 薬（治療：対象を選んで購入）
      (function () {
        var sickCount = 0;
        state.tanks.forEach(function(t) {
          if (t.axolotl && t.axolotl.sick && !t.axolotl.underTreatment) sickCount++;
          if (t.breedingPair) {
            t.breedingPair.forEach(function(ax) {
              if (ax.sick && !ax.underTreatment) sickCount++;
            });
          }
        });
        var canBuy = sickCount > 0 && state.money >= TREATMENT_COST;
        addEquipmentCard(
          '薬（治療）',
          '¥' + TREATMENT_COST.toLocaleString('ja-JP') + (sickCount > 0 ? ' 対象' + sickCount + '件' : ' 対象なし'),
          '薬（治療）',
          '<p><strong>効果:</strong><br>病気のウパに治療を開始します。対象を選んで購入してください。翌月に一定確率で回復します。（¥5,000/1匹）</p>',
          sickCount > 0 ? '対象を選ぶ' : '対象なし',
          TREATMENT_COST,
          !canBuy,
          function () {
            openTreatmentOverlay();
            showBuyTypeList('equipment');
            updateUI();
          }
        );
      })();
      // 餌（現在＋アップグレードを1カードに）
      var currentFeedName = state.feedType === 'artificial' ? '💊 人工餌' : state.feedType === 'bloodworm' ? 'アカムシ' : '🪱 みみず';
      var nextFeed = state.feedType === 'artificial' ? { type: 'bloodworm', name: 'アカムシ', cost: 5000 } : state.feedType === 'bloodworm' ? { type: 'earthworm', name: 'みみず', cost: 15000 } : null;
      var feedDetailBody = '<p><strong>人工餌:</strong> 基本の餌。<br><strong>アカムシ:</strong> ¥5,000 — 汚れ高・成長やや高。<br><strong>みみず:</strong> ¥15,000 — 汚れ中・成長最高。</p><p>上から順に解放されます。</p>';
      addEquipmentCard(
        '餌',
        '現在: ' + currentFeedName,
        '餌のアップグレード',
        feedDetailBody,
        nextFeed ? nextFeed.name + 'へ ¥' + nextFeed.cost.toLocaleString('ja-JP') : '使用中',
        0,
        !nextFeed || state.money < nextFeed.cost,
        nextFeed ? function() { upgradeFeedType(nextFeed.type, nextFeed.cost); showBuyTypeList('equipment'); updateUI(); } : null
      );
      // 水槽を増やす（レベルで最大槽数・購入金額が変動）
      (function () {
        var tl = state.equipment && state.equipment.tankLevel ? state.equipment.tankLevel : 1;
        var maxT = getMaxTanks();
        var addCost = getAddTankCost();
        var levelUpCost = getTankLevelUpCost();
        var card = document.createElement('div');
        card.className = 'ax-equipment-card';
        var nameEl = document.createElement('div');
        nameEl.className = 'ax-equipment-name';
        nameEl.textContent = '水槽を増やす';
        card.appendChild(nameEl);
        var levelEl = document.createElement('div');
        levelEl.className = 'ax-equipment-level';
        levelEl.textContent = 'Lv' + tl + ' 最大' + maxT + '槽';
        card.appendChild(levelEl);
        var btns = document.createElement('div');
        btns.className = 'ax-equipment-btns';
        var detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'ax-btn ax-buy-detail-btn';
        detailBtn.textContent = '詳細';
        detailBtn.style.fontSize = '10px';
        detailBtn.style.padding = '4px 8px';
        detailBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          openShopDetail('水槽を増やす', '<p><strong>水槽設備レベル:</strong> Lv1〜Lv' + MAX_TANK_LEVEL + '<br>レベルに応じて最大槽数が増えます（Lv1=2槽、Lv2=3槽…）。<br>レベルアップと水槽追加の両方に資金が必要です。</p>');
        });
        btns.appendChild(detailBtn);
        var levelUpBtn = document.createElement('button');
        levelUpBtn.type = 'button';
        levelUpBtn.className = 'ax-btn ax-buy-buy-btn';
        levelUpBtn.textContent = tl >= MAX_TANK_LEVEL ? '最大' : 'Lvアップ ¥' + levelUpCost.toLocaleString('ja-JP');
        levelUpBtn.style.fontSize = '10px';
        levelUpBtn.style.padding = '4px 8px';
        if (tl >= MAX_TANK_LEVEL || state.money < levelUpCost) levelUpBtn.disabled = true;
        levelUpBtn.addEventListener('click', function (e) { e.stopPropagation(); if (!this.disabled) { actTankLevelUp(); showBuyTypeList('equipment'); updateUI(); } });
        btns.appendChild(levelUpBtn);
        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'ax-btn ax-buy-buy-btn';
        addBtn.textContent = state.tanks.length >= maxT ? '最大' : '水槽追加 ¥' + addCost.toLocaleString('ja-JP');
        addBtn.style.fontSize = '10px';
        addBtn.style.padding = '4px 8px';
        if (state.tanks.length >= maxT || state.money < addCost) addBtn.disabled = true;
        addBtn.addEventListener('click', function (e) { e.stopPropagation(); if (!this.disabled) { actAddTank(); showBuyTypeList('equipment'); updateUI(); } });
        btns.appendChild(addBtn);
        card.appendChild(btns);
        list.appendChild(card);
      })();
    } else {
      // 生体タブ：固定化された種類のみ表示（3ヶ月目は性別ランダム、成体はオスとメスそれぞれ）
      var fixedTypes = Object.keys(state.fixedTypes).filter(function(type) {
        return state.fixedTypes[type] === true;
      });
      fixedTypes.forEach(function(type) {
        // 3ヶ月目（性別ランダム、一種類のみ）
        fillBuyTypeList(type, false, 1);
        // 成体 オス
        fillBuyTypeList(type, false, 7, 'オス');
        // 成体 メス
        fillBuyTypeList(type, false, 7, 'メス');
      });
      // 低確率で訳あり商品を1点追加（固定種・欠損 or 病気・大幅値引き）
      if (fixedTypes.length > 0 && Math.random() < 0.12) {
        var problemType = fixedTypes[Math.floor(Math.random() * fixedTypes.length)];
        var problemBand = Math.random() < 0.5 ? 1 : 7;
        var problemDefect = Math.random() < 0.5 ? 'injured' : 'sick';
        var bandPrices = sizePriceTable[problemType] || sizePriceTable.nomal;
        var normalPrice = bandPrices[problemBand] || 10000;
        var problemPrice = Math.max(500, Math.floor(normalPrice * 0.25));
        fillBuyTypeList(problemType, false, problemBand, null, {
          isProblem: true,
          injured: problemDefect === 'injured',
          sick: problemDefect === 'sick',
          price: problemPrice
        });
      }
    }
  }

  function doBuyMutation(type, age, price, problemFlags, chimeraTypes) {
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
    
    var ax = createAxolotl(age, type, null, null, chimeraTypes);
    // サイズを年齢に応じて再計算
    ax.size = calculateSizeFromAge(age);
    if (axolotlRegistry[ax.id]) {
      axolotlRegistry[ax.id].size = ax.size;
    }
    
    // 問題フラグの適用
    if (problemFlags) {
      if (problemFlags.injured) {
        ax.injured = true;
        if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].injured = true;
      }
      if (problemFlags.sick) {
        ax.sick = true;
        if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].sick = true;
      }
      if (problemFlags.injured || problemFlags.sick) {
        ax.health = Math.min(ax.health != null ? ax.health : 100, 50);
        if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].health = ax.health;
      }
    }
    
    empty.axolotl = ax;
    empty.baby = age < 12;
    empty.note = 'ミューテーションショップで購入したウパ';
    if (empty.clean === undefined) empty.clean = 80;
    if (empty.poop === undefined) empty.poop = false;
    
    // ミューテーションショップ購入個体はisFixedLineage=false（未固定種）
    ax.isFixedLineage = false;
    if (axolotlRegistry[ax.id]) {
      axolotlRegistry[ax.id].isFixedLineage = false;
    }
    
    // 図鑑に追加
    state.obtainedTypes[type] = true;
    
    var problemLabel = '';
    if (problemFlags && problemFlags.injured) problemLabel = '【欠損】';
    else if (problemFlags && problemFlags.sick) problemLabel = '【病気】';
    logLine(problemLabel + typeLabel(type) + '（' + age + 'ヶ月）を' + formatMoney(price) + 'でお迎えした。');
    
    // 購入したアイテムをリストから削除
    var itemIndex = state.mutationShopItems.findIndex(function(item) {
      return item.type === type && item.age === age && item.price === price;
    });
    if (itemIndex >= 0) {
      state.mutationShopItems.splice(itemIndex, 1);
      if (state.mutationShopItems.length === 0) {
        state.mutationShopAvailable = false;
        updateMutationShopButton();
      }
    }
    
    $('axOverlayBuy').classList.remove('visible');
    
    // 名付けフェーズを表示
    if (empty && empty.axolotl) {
      openNamingModal(empty.axolotl.id, false);
    }
    
    updateUI();
  }

  function doBuy(type, sizeBand, price, isAuction, sex, problemFlags) {
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
    // キメラの場合はchimeraTypesを設定
    var chimeraTypes = null;
    if (type === 'chimera') {
      chimeraTypes = ['nomal', 'marble']; // デフォルトでリューシとマーブルのキメラ
    }
    var ax = createAxolotl(age, type, null, null, chimeraTypes);
    // サイズを年齢に応じて再計算（ショップで買った個体のサイズを適切に設定）
    ax.size = calculateSizeFromAge(age);
    if (axolotlRegistry[ax.id]) {
      axolotlRegistry[ax.id].size = ax.size;
    }
    // 性別を指定
    if (sex) {
      ax.sex = sex;
      if (axolotlRegistry[ax.id]) {
        axolotlRegistry[ax.id].sex = sex;
      }
    }
    // 訳あり購入時：欠損 or 病気を付与し健康を下げる
    if (problemFlags) {
      if (problemFlags.injured) {
        ax.injured = true;
        if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].injured = true;
      }
      if (problemFlags.sick) {
        ax.sick = true;
        if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].sick = true;
      }
      if (problemFlags.injured || problemFlags.sick) {
        ax.health = Math.min(ax.health != null ? ax.health : 100, 50);
        if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].health = ax.health;
      }
    }
      empty.axolotl = ax;
      empty.baby = age < 12;
      empty.note = (problemFlags && (problemFlags.injured || problemFlags.sick)) ? '訳ありで購入したウパ' : 'ショップで購入したウパ';
      if (empty.clean === undefined) empty.clean = 80;
      if (empty.poop === undefined) empty.poop = false;
      
      // ショップ購入個体はisFixedLineage=true（固定化済み種のみ買えるため）
      ax.isFixedLineage = true;
      if (axolotlRegistry[ax.id]) {
        axolotlRegistry[ax.id].isFixedLineage = true;
      }
    
    // 図鑑に追加
    state.obtainedTypes[type] = true;
    
    // オークション機能は削除
    {
      var sizeLabel = sizeBand === 7 ? '成体' : '3ヶ月目のうーぱー';
      var sexLabel = sex ? (sex === 'オス' ? '♂' : '♀') : '';
      if (problemFlags && (problemFlags.injured || problemFlags.sick)) {
        var defectLabel = problemFlags.injured ? '欠損' : '病気';
        logLine('【訳あり】' + typeLabel(type) + '（' + sizeLabel + '・' + defectLabel + '）を' + formatMoney(price) + 'でお迎えした。');
      } else {
        logLine(typeLabel(type) + '（' + sizeLabel + sexLabel + '）を1匹お迎えした。');
      }
    }
    $('axOverlayBuy').classList.remove('visible');
    
    // 名付けフェーズを表示
    if (empty && empty.axolotl) {
      openNamingModal(empty.axolotl.id, false);
    }
    
    updateUI();
  }

  function buyEquipment(equipmentType, cost) {
    if (state.money < cost) {
      logLine('資金が足りません。');
      return;
    }
    
    if (!state.equipment) {
      state.equipment = { autoFeeder: false, filter: false, bottomCleanerLevel: 0, tankLevel: 1 };
    }
    if (state.equipment.bottomCleanerLevel === undefined) state.equipment.bottomCleanerLevel = 0;
    if (state.equipment.tankLevel === undefined) state.equipment.tankLevel = 1;
    
    state.money -= cost;
    if (equipmentType === 'bottomCleaner') {
      state.equipment.bottomCleanerLevel = (state.equipment.bottomCleanerLevel || 0) + 1;
      logLine('底面掃除機をレベル' + state.equipment.bottomCleanerLevel + 'にアップグレードしました。（うんこ発生率低減）');
    } else {
      state.equipment[equipmentType] = true;
      var equipmentNames = { autoFeeder: '自動給餌器', filter: 'フィルタ' };
      logLine(equipmentNames[equipmentType] + 'を購入しました。');
    }
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

  function getMaxTanks() {
    return Math.min((state.equipment && state.equipment.tankLevel ? state.equipment.tankLevel : 1) + 1, MAX_TANKS);
  }
  function getAddTankCost() {
    var tl = state.equipment && state.equipment.tankLevel ? state.equipment.tankLevel : 1;
    return TANK_ADD_BASE + (tl - 1) * 3000;
  }
  function getTankLevelUpCost() {
    var tl = state.equipment && state.equipment.tankLevel ? state.equipment.tankLevel : 1;
    return TANK_LEVEL_UP_BASE + tl * 5000;
  }
  function actTankLevelUp() {
    var tl = state.equipment && state.equipment.tankLevel ? state.equipment.tankLevel : 1;
    if (tl >= MAX_TANK_LEVEL) {
      logLine('水槽設備は最大レベルです。');
      return;
    }
    var cost = getTankLevelUpCost();
    if (state.money < cost) {
      logLine('水槽設備をレベルアップする資金が足りない…。');
      return;
    }
    state.money -= cost;
    state.equipment.tankLevel = tl + 1;
    logLine('水槽設備をレベル' + state.equipment.tankLevel + 'にアップグレードした。（最大' + getMaxTanks() + '槽）');
    updateUI();
  }
  function actAddTank() {
    var maxT = getMaxTanks();
    if (state.tanks.length >= maxT) {
      logLine('これ以上水槽は増やせない。（レベルを上げると最大槽数が増えます）');
      return;
    }
    var cost = getAddTankCost();
    if (state.money < cost) {
      logLine('水槽を増やす資金が足りない…。');
      return;
    }
    state.money -= cost;
    state.tanks.push({
      id: state.tanks.length + 1,
      axolotl: null,
      note: '新しく導入した水槽',
      baby: false,
      customName: null,
      clean: 80,
      poop: false
    });
    logLine('新しい水槽を1つ増設した。（¥' + cost.toLocaleString('ja-JP') + '）');
    updateUI();
  }

  function resetGame() {
    state.month = 1;
    state.money = 60000;
    state.reputation = 30;
    state.ended = false;
    state.lastBreedParent1 = null;
    state.lastBreedParent2 = null;
    state.mutationShopAvailable = false;
    state.mutationShopItems = [];
    // 最初はリューシとマーブルのみ固定化済み
    state.fixedTypes = {
      nomal: true,
      marble: true
    };
    state.obtainedTypes = {};
    state.achievements = {};
    state.nameCounts = {};  // 名前カウントをリセット
    state.usedNames = {};  // 使用済みの名前をリセット
    state.shopName = 'ウーパールーパーショップ';  // ショップ名をリセット（後で最初のウパの名前で更新される）
    state.shopStockDaily = {};  // 日ごとの在庫状態をリセット
    state.initialNamingMessageShown = false;  // 最初のウパの名前付けメッセージ表示フラグをリセット
    state.equipment = { autoFeeder: false, filter: false, bottomCleanerLevel: 0, tankLevel: 2 };  // 設備をリセット（最初から3槽）
    state.feedType = 'artificial';  // デフォルトの餌タイプをリセット
    state.waterChangeType = 'normal';  // デフォルトの水替えタイプをリセット
    state.reputation100Celebrated = false;  // 満足度100達成時のポップアップ表示済みフラグをリセット
    state.shopSale = false;  // ショップセールをリセット
    state.shopSaleDiscount = 1.0;  // ショップセール割引率をリセット
    state.shopSaleItems = [];  // ショップセール対象商品をリセット
    initTanks();
    
    // 初期個体を図鑑に追加し、名前を登録
    state.tanks.forEach(function(tank) {
      if (tank.axolotl) {
        state.obtainedTypes[tank.axolotl.type] = true;
        // 名前を登録（重複チェック用）
        if (tank.axolotl.name) {
          registerName(tank.axolotl.name);
        }
      }
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function(ax) {
          if (ax.name) {
            registerName(ax.name);
          }
        });
      }
    });
    
    // レジストリ内のすべてのaxolotlの名前も登録
    Object.keys(axolotlRegistry).forEach(function(key) {
      var reg = axolotlRegistry[key];
      if (reg && reg.name && !reg.removed) {
        registerName(reg.name);
      }
    });
    $('axLog').textContent = 'ショップを始めた。最初のウパに名前をつけよう。';
    $('axOverlayEnd').classList.remove('visible');
    $('axOverlayBreed').classList.remove('visible');
    $('axOverlayBuy').classList.remove('visible');
    $('axOverlayTreat').classList.remove('visible');
    var shopDetail = document.getElementById('axOverlayShopDetail');
    if (shopDetail) shopDetail.classList.remove('visible');
    var goalOverlay = document.getElementById('axOverlayGoal');
    if (goalOverlay) goalOverlay.classList.remove('visible');
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
  var btnRemoveAllPoop = document.getElementById('btnRemoveAllPoop');
  if (btnRemoveAllPoop) {
    btnRemoveAllPoop.addEventListener('click', function () {
      if (!state.ended) removeAllPoop();
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
    var val1 = $('axBreedParent1').value;
    var val2 = $('axBreedParent2').value;
    var parent1Idx, parent2Idx;
    
    // 繁殖ペアの個体の場合は分離してから繁殖
    if (val1.indexOf('_bp_') >= 0) {
      var parts1 = val1.split('_bp_');
      parent1Idx = parseInt(parts1[0], 10);
      var axId1 = parseInt(parts1[1], 10);
      separateBreedingPairForBreeding(parent1Idx, axId1);
      // 分離後、実際のタンクインデックスを取得
      var newTank1 = state.tanks.findIndex(function(t) { return t.axolotl && t.axolotl.id === axId1; });
      if (newTank1 >= 0) parent1Idx = newTank1;
    } else {
      parent1Idx = parseInt(val1, 10);
    }
    
    if (val2.indexOf('_bp_') >= 0) {
      var parts2 = val2.split('_bp_');
      parent2Idx = parseInt(parts2[0], 10);
      var axId2 = parseInt(parts2[1], 10);
      separateBreedingPairForBreeding(parent2Idx, axId2);
      // 分離後、実際のタンクインデックスを取得
      var newTank2 = state.tanks.findIndex(function(t) { return t.axolotl && t.axolotl.id === axId2; });
      if (newTank2 >= 0) parent2Idx = newTank2;
    } else {
      parent2Idx = parseInt(val2, 10);
    }
    
    doBreed(parent1Idx, parent2Idx);
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
  var btnSettings = document.getElementById('btnSettings');
  if (btnSettings) {
    btnSettings.addEventListener('click', function () {
      if (!state.ended) {
        openSettingsOverlay();
        closeMenu();
      }
    });
  }

  function openSettingsOverlay() {
    var overlay = $('axOverlaySettings');
    if (!overlay) return;
    
    // 設定値を反映
    var checkbox = document.getElementById('settingAutoReorderTanks');
    if (checkbox) {
      checkbox.checked = state.settings && state.settings.autoReorderTanks || false;
    }
    
    overlay.classList.add('visible');
  }

  var axSettingsClose = document.getElementById('axSettingsClose');
  if (axSettingsClose) {
    axSettingsClose.addEventListener('click', function () {
      $('axOverlaySettings').classList.remove('visible');
    });
  }

  var settingAutoReorderTanks = document.getElementById('settingAutoReorderTanks');
  if (settingAutoReorderTanks) {
    settingAutoReorderTanks.addEventListener('change', function () {
      if (!state.settings) state.settings = {};
      state.settings.autoReorderTanks = this.checked;
      saveGame();
    });
  }

  var btnManual = document.getElementById('btnManual');
  if (btnManual) {
    btnManual.addEventListener('click', function () {
      if (!state.ended) {
        $('axOverlayManual').classList.add('visible');
        closeMenu();
      }
    });
  }

  var axManualClose = document.getElementById('axManualClose');
  if (axManualClose) {
    axManualClose.addEventListener('click', function () {
      $('axOverlayManual').classList.remove('visible');
    });
  }
  $('axBuyCancel').addEventListener('click', function () {
    $('axOverlayBuy').classList.remove('visible');
  });
  function openShopDetail(title, bodyHtml) {
    var el = document.getElementById('axShopDetailTitle');
    if (el) el.textContent = title;
    el = document.getElementById('axShopDetailBody');
    if (el) el.innerHTML = bodyHtml;
    $('axOverlayShopDetail').classList.add('visible');
  }
  var axShopDetailClose = document.getElementById('axShopDetailClose');
  if (axShopDetailClose) {
    axShopDetailClose.addEventListener('click', function () {
      $('axOverlayShopDetail').classList.remove('visible');
    });
  }
  $('axBtnRetry').addEventListener('click', function () {
    resetGame();
  });
  $('axDetailCancel').addEventListener('click', function () {
    // 名付けモードの場合はクリア
    if (window._namingMode) window._namingMode = null;
    closeDetailModal();
  });
  
  // 販売ボタンのイベントリスナー（openDetailModal内で動的に設定されるが、念のため初期化時にも設定）
  var axDetailSellBtn = document.getElementById('axDetailSell');
  if (axDetailSellBtn) {
    // イベントリスナーはopenDetailModal内で設定される
  }
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
  var axGoalContinue = document.getElementById('axGoalContinue');
  if (axGoalContinue) {
    axGoalContinue.addEventListener('click', function () {
      document.getElementById('axOverlayGoal').classList.remove('visible');
      updateUI();
    });
  }
  var axGoalQuit = document.getElementById('axGoalQuit');
  if (axGoalQuit) {
    axGoalQuit.addEventListener('click', function () {
      document.getElementById('axOverlayGoal').classList.remove('visible');
      state.ended = true;
      var endTitle = document.getElementById('axEndTitle');
      var endMsg = document.getElementById('axEndMessage');
      if (endTitle) endTitle.textContent = 'おつかれさま！';
      if (endMsg) endMsg.textContent = 'ゴール達成おめでとうございます。またの挑戦をお待ちしています。';
      document.getElementById('axOverlayEnd').classList.add('visible');
      updateUI();
    });
  }

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
      
      if (type === 'chimera') {
        // 図鑑のキメラ: 基本種5種から毎回ランダムな2種類の組み合わせ
        var basicTypes = ['nomal', 'albino', 'gold', 'marble', 'black'];
        var i0 = Math.floor(Math.random() * basicTypes.length);
        var i1 = Math.floor(Math.random() * basicTypes.length);
        while (i1 === i0) i1 = Math.floor(Math.random() * basicTypes.length);
        var fakeAx = { id: 0, type: 'chimera', chimeraTypes: [basicTypes[i0], basicTypes[i1]] };
        var sprite = createChimeraCanvasSprite(fakeAx, 64);
        sprite.style.marginLeft = '0';
        header.appendChild(sprite);
      } else {
        var fakeAx = { id: 0, type: type };
        var sprite = createPixelArtCanvasSprite(fakeAx, 64);
        sprite.style.marginLeft = '0'; // 図鑑は左揃え（水槽は右寄せのため .ax-axolotl-img に margin-left:auto あり）
        header.appendChild(sprite);
      }
      
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
  
  // スマホのブラウザバーによるビューポート高さの変動を防ぐ
  function setViewportHeight() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', function() {
    setTimeout(setViewportHeight, 100);
  });
})();
