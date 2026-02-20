(function () {
  'use strict';

  function t(key, params) {
    return window.i18n && window.i18n.t ? window.i18n.t(key, params) : key;
  }
  var NOTE_TO_KEY = {
    '空き水槽': 'game.note.empty',
    '最初のウパ': 'game.note.firstAxo',
    '1ヶ月目のウパ': 'game.note.oneMonth',
    'ショップで購入したウパ': 'game.note.shopBought',
    'ミューテーションショップで購入したウパ': 'game.note.mutationBought',
    '訳ありで購入したウパ': 'game.note.problemBought',
    '選んだ幼生': 'game.note.selectedJuvenile',
    '繁殖用に分離': 'game.note.breedingSeparated',
    '親ウパ': 'game.note.parentAxo',
    '同棲中（関係50）': 'game.note.cohabiting',
    '病気で★になってしまった…': 'game.note.diedSick',
    '寿命で★になってしまった…': 'game.note.diedAge',
    '急死で★になってしまった…': 'game.note.diedSudden',
    '体調を崩して★になってしまった…': 'game.note.diedNeglect',
    '育ったウパ': 'game.note.grewUp'
  };
  function noteDisplayLabel(tank) {
    var note = tank.note || '';
    if (tank.juveniles) {
      return t('game.note.juvenileCount', { count: tank.juveniles.length, age: tank.juvenileAge || 0 });
    }
    if (tank.egg && tank.eggCount) {
      return t('game.note.eggCount', { count: tank.eggCount });
    }
    if (tank.egg) {
      return t('game.note.eggCount', { count: tank.eggCount || 500 });
    }
    var key = NOTE_TO_KEY[note];
    return key ? t(key) : note;
  }

  var MAX_CLEAN = 100;
  var MAX_FOOD = 100;
  var MAX_REP = 100;
  var MAX_HEALTH = 100;
  var TARGET_MONEY = 1000000;
  var MAX_TANKS = 15;
  var WATER_CHANGE_COST = 1000;

  var AXO_TYPES = ['nomal', 'albino', 'gold', 'marble', 'copper', 'black', 'superblack', 'goldblackeye', 'chimera', 'yellow', 'dalmatian'];
  var typePriceBase = {
    nomal: 3000,   // Leucistic
    albino: 3000,
    gold: 6000,
    marble: 3000,
    copper: 100000,
    black: 5000,
    superblack: 30000,
    goldblackeye: 100000,
    chimera: 300000,
    yellow: 10000,
    dalmatian: 60000
  };
  var MAX_HUNGER = 100;
  var SICK_PRICE_RATE = 0.2;
  var MEDICINE_TIERS = [
    { cost: 500, recoverChance: 0.35, nameKey: 'game.equipment.medicineMedicine' },
    { cost: 1500, recoverChance: 0.60, nameKey: 'game.equipment.medicineGreatMedicine' },
    { cost: 3000, recoverChance: 0.85, nameKey: 'game.equipment.medicineSuperMedicine' },
    { cost: 5000, recoverChance: 1.0, nameKey: 'game.equipment.medicineHiperMedicine' }
  ];
  var MAX_MEDICINE_LEVEL = 3;
  var TREATMENT_COST = 5000;  // legacy fallback
  var TREATMENT_RECOVER_CHANCE = 0.35;  // legacy fallback
  function getTreatmentCost() {
    var lv = (state.medicineLevel != null ? state.medicineLevel : 0);
    return MEDICINE_TIERS[Math.min(lv, MAX_MEDICINE_LEVEL)].cost;
  }
  function getTreatmentRecoverChance(level) {
    var lv = (level != null ? level : 0);
    return MEDICINE_TIERS[Math.min(lv, MAX_MEDICINE_LEVEL)].recoverChance;
  }
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
  function getAutoFeederTier() {
    var lv = (state.equipment && state.equipment.autoFeederLevel != null) ? state.equipment.autoFeederLevel : -1;
    if (lv < 0) return null;
    return AUTO_FEEDER_TIERS[Math.min(lv, MAX_AUTO_FEEDER_LEVEL)];
  }
  function getFilterTier() {
    var lv = (state.equipment && state.equipment.filterLevel != null) ? state.equipment.filterLevel : -1;
    if (lv < 0) return null;
    return FILTER_TIERS[Math.min(lv, MAX_FILTER_LEVEL)];
  }
  function getFoodTier() {
    var lv = (state.foodLevel != null ? state.foodLevel : 0);
    return FOOD_TIERS[Math.min(lv, 3)];
  }
  
  // うんこ未処理ペナルティ
  var POOP_PENALTY_PER_MONTH = 15;
  
  // 固定化報酬レア度マップ
  var rarityMultiplierMap = {
    common: 10,
    uncommon: 12,
    rare: 30,
    veryrare: 50,
    superRare: 80,
    ultraRare: 100
  };
  var typeRarityMap = {
    nomal: 'common',
    albino: 'common',
    gold: 'uncommon',
    marble: 'common',
    copper: 'veryrare',
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
  var AUTO_FEEDER_TIERS = [
    { cost: 5000, costPerFeed: 800, hungerThreshold: 50, health: 5, hunger: 20, dirt: 3, nameKey: 'game.equipment.autoFeederAutoFeeder' },
    { cost: 10000, costPerFeed: 600, hungerThreshold: 45, health: 6, hunger: 22, dirt: 2, nameKey: 'game.equipment.autoFeederCopper' },
    { cost: 15000, costPerFeed: 500, hungerThreshold: 40, health: 7, hunger: 24, dirt: 1, nameKey: 'game.equipment.autoFeederSilver' },
    { cost: 20000, costPerFeed: 400, hungerThreshold: 35, health: 8, hunger: 25, dirt: 0, nameKey: 'game.equipment.autoFeederGolden' }
  ];
  var FILTER_TIERS = [
    { cost: 5000, cleanBonus: 2, ageDeathMult: 1.0, nameKey: 'game.equipment.filterSpongeFilter' },
    { cost: 10000, cleanBonus: 4, ageDeathMult: 0.75, nameKey: 'game.equipment.filterTopFilter' },
    { cost: 15000, cleanBonus: 6, ageDeathMult: 0.5, nameKey: 'game.equipment.filterCanisterFilter' }
  ];
  var FOOD_TIERS = [
    { cost: 500, health: 5, hunger: 20, dirt: 3, nameKey: 'game.equipment.foodFood' },
    { cost: 800, health: 7, hunger: 24, dirt: 2, nameKey: 'game.equipment.foodSilverFood' },
    { cost: 1200, health: 9, hunger: 28, dirt: 1, nameKey: 'game.equipment.foodGoldenFood' },
    { cost: 1500, health: 12, hunger: 30, dirt: 0, nameKey: 'game.equipment.foodDiamondFood' }
  ];
  var EQUIPMENT_BOTTOM_CLEANER_COST = 20000;   // Lv0→1
  var EQUIPMENT_BOTTOM_CLEANER_COST_LV2 = 10000;
  var EQUIPMENT_BOTTOM_CLEANER_COST_LV3 = 12000;
  // Auto Feeder / Filter use tier costs from AUTO_FEEDER_TIERS / FILTER_TIERS
  var BASE_TANK_COST = 20000;              // 水槽追加の基本料金
  var TANK_COST_SCALE = 0.2;               // 現在の槽数に応じたスケール（cost = BASE_TANK_COST * (1 + TANK_COST_SCALE * n)）
  var AUTO_FEEDER_HUNGER_THRESHOLD = 50;   // legacy
  var AUTO_FEEDER_COST_PER_FEED = 1000;    // legacy
  var MAX_AUTO_FEEDER_LEVEL = 3;
  var MAX_FILTER_LEVEL = 2;  // 0=Sponge, 1=Top, 2=Canister
  var MAX_BOTTOM_CLEANER_LEVEL = 3;
  var MAX_TANK_LEVEL = 14;                 // 最大15槽 = tankLevel+1
  
  // 共通アセットを使用（ルートの ./assets/characters/axolotl/）
  var AXOLOTL_IMAGE_BASE = './assets/axolotl/';
  var EQUIPMENT_IMAGE_BASE = './assets/items/aquarium/';
  function equipmentImagePath(folder, filename) {
    var f = folder;
    var n = filename;
    if (typeof f === 'string' && typeof n === 'string') {
      return EQUIPMENT_IMAGE_BASE + encodeURIComponent(f) + '/' + encodeURIComponent(n);
    }
    return EQUIPMENT_IMAGE_BASE + (f || '') + '.png';
  }
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

  // 生体の品揃えは毎月変わる（state.monthで決定的に在庫ありの種類を返す）
  function getShopStockForMonth() {
    var types = AXO_TYPES_BUY.slice();
    var result = {};
    var seed = state.month || 1;
    types.forEach(function(type, i) {
      var h = (seed * 31 + (type.length * 17) + i * 13) % 100;
      result[type] = h < 85;
    });
    return result;
  }

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
    money: 30000,
    clean: 80,
    reputation: 30,
    tanks: [],
    ended: false,
    lastBreedParent1: null,
    lastBreedParent2: null,
    nextAxolotlId: 1,
    mutationShopAvailable: false,
    mutationShopItems: [],  // ミューテーションショップの4匹の個体リスト
    mutationShopSeenThisPeriod: false,  // メニュー!を消す用（ショップを開いたらtrue）
    fixedTypes: {},  // 固定化された種類 {type: true}
    obtainedTypes: {},  // 獲得した種類（図鑑用）
    achievements: {},  // 実績 {id: true}
    nameCounts: {},  // 種類ごとの名前カウント {type: count}
    usedNames: {},  // 使用済みの名前 {fullName: true} 重複チェック用
    deadAxolotls: [],  // 死んだウパの記録 [{id, type, name, age, deathReason, ...}]
    shopName: null,
    equipment: {  // 自動設備（レベル制）最初から3槽 = tankLevel2
      autoFeederLevel: -1,   // -1=none, 0-3=Normal,Copper,Silver,Golden
      filterLevel: -1,       // -1=none, 0-2=Sponge,Top,Canister
      bottomCleanerLevel: -1,
      tankLevel: 2
    },
    foodLevel: 0,  // 0-3: Copper, Silver, Golden, Diamond
    waterChangeType: 'normal',  // デフォルトの水替えタイプ: 'partial', 'normal', 'full'
    reputation100Celebrated: false,  // 満足度100達成時のポップアップ表示済みフラグ
    shopSale: false,  // ショップセール開催中フラグ
    shopSaleDiscount: 1.0,  // ショップセール割引率（1.0 = 通常価格）
    shopSaleItems: [],  // セール対象の商品リスト（タイプとサイズバンドの組み合わせ）
    settings: {
      autoReorderTanks: false,  // 空になった水槽を自動的に下に移動する
      simpleNameMode: false  // シンプルな名前運用（幼名のみ、成体になっても変化なし）
    }
  };
  
  // マイグレーション: feedType→foodLevel, equipment tiers
  if (state.feedType !== undefined) {
    state.foodLevel = state.feedType === 'artificial' ? 0 : state.feedType === 'bloodworm' ? 1 : 2;
    delete state.feedType;
  }
  if (state.foodLevel === undefined) state.foodLevel = 0;
  if (state.medicineLevel === undefined) state.medicineLevel = 0;
  if (state.equipment) {
    if (state.equipment.autoFeeder === true) {
      state.equipment.autoFeederLevel = 0;
      delete state.equipment.autoFeeder;
    }
    if (state.equipment.autoFeederLevel === undefined) state.equipment.autoFeederLevel = -1;
    if (state.equipment.filter === true) {
      state.equipment.filterLevel = 0;
      delete state.equipment.filter;
    }
    if (state.equipment.filterLevel === undefined) state.equipment.filterLevel = -1;
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

  // セーブデータのバージョン管理
  var SAVE_DATA_VERSION = '1.0.0';
  var SAVE_KEY = 'axolotl-shop-save';

  // ゲーム状態を保存
  function saveGame() {
    try {
      var saveData = {
        version: SAVE_DATA_VERSION,
        state: JSON.parse(JSON.stringify(state)),
        axolotlRegistry: JSON.parse(JSON.stringify(axolotlRegistry))
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      console.log('[Save] ゲームを保存しました');
    } catch (e) {
      console.error('[Save] セーブに失敗しました:', e);
    }
  }

  // ゲーム状態を読み込み
  function loadGame() {
    try {
      var saveDataStr = localStorage.getItem(SAVE_KEY);
      if (!saveDataStr) {
        console.log('[Load] セーブデータが見つかりません');
        return false;
      }

      var saveData = JSON.parse(saveDataStr);
      var loadedVersion = saveData.version || '0.0.0';
      
      // バージョンチェックとマイグレーション
      if (loadedVersion !== SAVE_DATA_VERSION) {
        console.log('[Load] バージョンが異なります。マイグレーションを実行します:', loadedVersion, '->', SAVE_DATA_VERSION);
        saveData = migrateSaveData(saveData, loadedVersion, SAVE_DATA_VERSION);
      }

      // 状態を復元
      if (saveData.state) {
        Object.assign(state, saveData.state);
        state.version = SAVE_DATA_VERSION;
        if (!state.saveLocale) state.saveLocale = 'ja';
      }
      
      if (saveData.axolotlRegistry) {
        axolotlRegistry = saveData.axolotlRegistry;
      }

      console.log('[Load] ゲームを読み込みました');
      return true;
    } catch (e) {
      console.error('[Load] ロードに失敗しました:', e);
      return false;
    }
  }

  // セーブデータのマイグレーション
  function migrateSaveData(saveData, fromVersion, toVersion) {
    console.log('[Migration]', fromVersion, '->', toVersion);
    
    // バージョン1.0.0へのマイグレーション
    if (!saveData.state.version) {
      saveData.state.version = '1.0.0';
      
      // 新しいフィールドの初期化
      if (!saveData.state.usedNames) saveData.state.usedNames = {};
      if (!saveData.state.settings) saveData.state.settings = { autoReorderTanks: false, simpleNameMode: false };
      if (saveData.state.settings.simpleNameMode === undefined) saveData.state.settings.simpleNameMode = false;
      if (!saveData.state.mutationShopAvailable) {
        saveData.state.mutationShopAvailable = false;
        saveData.state.mutationShopItems = [];
      }
      if (saveData.state.mutationShopSeenThisPeriod === undefined) saveData.state.mutationShopSeenThisPeriod = false;
      if (!saveData.state.deadAxolotls) {
        saveData.state.deadAxolotls = [];
      }
      if (!saveData.state.saveLocale) saveData.state.saveLocale = 'ja';
      
      // axolotlのマイグレーション
      function migrateAxolotl(ax) {
        if (!ax) return;
        if (ax.isFixedLineage === undefined) ax.isFixedLineage = false;
        if (!ax.nameElementA) ax.nameElementA = null;
        if (!ax.nameElementB) ax.nameElementB = null;
        if (ax.isHereditaryA === undefined) ax.isHereditaryA = false;
        if (ax.isHereditaryB === undefined) ax.isHereditaryB = false;
        if (ax.isJuvenile === undefined) ax.isJuvenile = (ax.age < 12 && !ax.nameElementA && !ax.nameElementB);
      }
      
      if (saveData.state.tanks) {
        saveData.state.tanks.forEach(function(tank) {
          if (tank.axolotl) migrateAxolotl(tank.axolotl);
          if (tank.breedingPair) tank.breedingPair.forEach(migrateAxolotl);
          if (tank.juveniles) tank.juveniles.forEach(migrateAxolotl);
          // 最初のウパは販売不可：noteで識別しisInitialを設定（ロード時・旧セーブ対策）
          if (tank.axolotl && (tank.note === '最初のウパ' || tank.note === 'First axolotl' || tank.note === '親ウパ')) {
            tank.axolotl.isInitial = true;
            if (saveData.axolotlRegistry && saveData.axolotlRegistry[tank.axolotl.id]) {
              saveData.axolotlRegistry[tank.axolotl.id].isInitial = true;
            }
          }
        });
      }
      
      if (saveData.axolotlRegistry) {
        Object.keys(saveData.axolotlRegistry).forEach(function(key) {
          migrateAxolotl(saveData.axolotlRegistry[key]);
        });
      }
    }
    
      // 将来のバージョンアップ時のマイグレーション処理をここに追加
    // if (fromVersion < '1.1.0') { ... }
    
    // 設備・餌のレベル制マイグレーション（autoFeeder/filter/feedType → レベル）
    if (saveData.state.equipment) {
      var eq = saveData.state.equipment;
      if (eq.autoFeeder === true && eq.autoFeederLevel == null) {
        eq.autoFeederLevel = 0;
      }
      if (eq.autoFeeder === false && eq.autoFeederLevel == null) {
        eq.autoFeederLevel = -1;
      }
      if (eq.filter === true && eq.filterLevel == null) {
        eq.filterLevel = 0;
      }
      if (eq.filter === false && eq.filterLevel == null) {
        eq.filterLevel = -1;
      }
    }
    if (saveData.state.feedType != null && saveData.state.foodLevel == null) {
      saveData.state.foodLevel = saveData.state.feedType === 'artificial' ? 0 : saveData.state.feedType === 'bloodworm' ? 1 : 2;
    }
    
    return saveData;
  }

  // 復活の呪文を生成（JSONをBase64エンコード）
  function generatePassword() {
    try {
      var saveData = {
        version: SAVE_DATA_VERSION,
        state: JSON.parse(JSON.stringify(state)),
        axolotlRegistry: JSON.parse(JSON.stringify(axolotlRegistry))
      };
      var jsonStr = JSON.stringify(saveData);
      // Base64エンコード（スマホでも動作するように）
      var base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      return base64;
    } catch (e) {
      console.error('[Password] 復活の呪文生成に失敗しました:', e);
      return null;
    }
  }

  // 復活の呪文から復元
  function loadFromPassword(password) {
    try {
      // Base64デコード
      var jsonStr = decodeURIComponent(escape(atob(password)));
      var saveData = JSON.parse(jsonStr);
      
      var loadedVersion = saveData.version || '0.0.0';
      if (loadedVersion !== SAVE_DATA_VERSION) {
        saveData = migrateSaveData(saveData, loadedVersion, SAVE_DATA_VERSION);
      }

      if (saveData.state) {
        Object.assign(state, saveData.state);
        state.version = SAVE_DATA_VERSION;
      }
      
      if (saveData.axolotlRegistry) {
        axolotlRegistry = saveData.axolotlRegistry;
      }

      // 名前を再登録
      if (state.usedNames) state.usedNames = {};
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.name) {
          registerName(tank.axolotl.name);
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(ax) {
            if (ax.name) registerName(ax.name);
          });
        }
      });
      Object.keys(axolotlRegistry).forEach(function(key) {
        var reg = axolotlRegistry[key];
        if (reg && reg.name && !reg.removed) {
          registerName(reg.name);
        }
      });

      return true;
    } catch (e) {
      console.error('[Password] 復活の呪文の復元に失敗しました:', e);
      return false;
    }
  }

  function typeDescription(typeKey) {
    return t('game.typeDesc.' + typeKey) || t('dialog.noDescription');
  }

  // 基本5種: リューシ・アルビノ・ゴールド・マーブル・ブラック
  var BASIC_FIVE_TYPES = ['nomal', 'albino', 'gold', 'marble', 'black'];
  // レア種
  var RARE_TYPES = ['copper', 'superblack', 'goldblackeye', 'chimera', 'dalmatian'];

  function achievementName(id) { return t('game.achievement.' + id); }
  function achievementDesc(id) { return t('game.achievement.' + id + '_desc'); }
  var achievementDefinitions = [
    { id: 'first_sale', goal: false, check: function() { return state.achievements.first_sale || false; } },
    { id: 'breed_success', goal: true, check: function() { return state.achievements.breed_success || false; } },
    { id: 'basic_five', name: '基本5種揃え', desc: '基本5種（リューシ・アルビノ・ゴールド・マーブル・ブラック）を揃える', goal: true, check: function() {
      return BASIC_FIVE_TYPES.every(function(t) { return state.fixedTypes[t] === true; });
    }},
    { id: 'money_1m', goal: true, check: function() { return state.money >= 1000000; } },
    { id: 'adult_raised', goal: true, check: function() {
      var found = false;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.age >= 21) found = true;
        if (tank.breedingPair) { tank.breedingPair.forEach(function(ax) { if (ax.age >= 21) found = true; }); }
      });
      return found;
    }},
    { id: 'rare_obtained', goal: true, check: function() {
      return RARE_TYPES.some(function(t) { return state.obtainedTypes[t] === true; });
    }},
    { id: 'rep_80', goal: true, check: function() { return state.reputation > 80; } },
    { id: 'reputation_max', goal: true, check: function() { return state.reputation >= MAX_REP; } },
    { id: 'marble_fixed', goal: false, check: function() { return state.fixedTypes.marble === true; } },
    { id: 'rare_fixed', goal: false, check: function() { return state.fixedTypes.goldblackeye === true || state.fixedTypes.chimera === true || state.fixedTypes.copper === true; } },
    { id: 'all_types', goal: false, check: function() { return Object.keys(state.obtainedTypes).length >= AXO_TYPES.length; } },
    { id: 'money_100k', goal: false, check: function() { return state.money >= 100000; } },
    { id: 'money_500k', goal: false, check: function() { return state.money >= 500000; } },
    { id: 'tanks_max', goal: false, check: function() { return state.tanks.length >= MAX_TANKS; } },
    { id: 'long_life', goal: false, check: function() { 
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
    return 'Ƀ ' + y.toLocaleString('ja-JP');
  }

  // English mode: 100 simple random names (no elementA/B) - fallback when name data not loaded
  var ENGLISH_NAMES = ['Albert', 'Isaac', 'Charles', 'Nikola', 'Leonardo', 'Galileo', 'Marie', 'Ada', 'Alfred', 'Louis', 'Thomas', 'James', 'Alexander', 'Julius', 'Marcus', 'Augustus', 'Plato', 'Socrates', 'Dante', 'Marco', 'Pablo', 'Vincent', 'Claude', 'Andy', 'Frida', 'Georgia', 'William', 'Edgar', 'Oscar', 'Franz', 'Johann', 'Ludwig', 'Wolfgang', 'Hector', 'Igor', 'Leo', 'Anton', 'Victor', 'Miguel', 'Rafael', 'Napoleon', 'Winston', 'Abraham', 'George', 'John', 'Franklin', 'Theodore', 'Nelson', 'Martin', 'Mahatma', 'Indira', 'Cleopatra', 'Elizabeth', 'Victoria', 'Diana', 'Catherine', 'Peter', 'Ivan', 'Timur', 'Saladin', 'Edison', 'Henry', 'Wright', 'Orville', 'Wilbur', 'Yuri', 'Neil', 'Buzz', 'Ferdinand', 'Vasco', 'Michael', 'Elvis', 'Freddie', 'David', 'Prince', 'Madonna', 'Whitney', 'Taylor', 'Beyonce', 'Adele', 'Charlie', 'Audrey', 'Marilyn', 'Bruce', 'Jackie', 'Arnold', 'Sylvester', 'Clint', 'Keanu', 'Tom', 'Max', 'Alex', 'Leo', 'Theo', 'Noah', 'Liam', 'Emma', 'Luna', 'Aria', 'Mira'];

  // モーフ→名前データキー（外部JSON）
  function getMorphNameKey(type) {
    if (type === 'albino') return 'albino';
    if (type === 'black' || type === 'superblack') return 'black';
    if (type === 'nomal') return 'nomal';
    if (type === 'gold' || type === 'goldblackeye' || type === 'yellow') return 'gold';
    if (type === 'marble') return 'marble';
    if (type === 'copper') return 'copper';
    if (type === 'dalmatian' || type === 'chimera') return 'rare';
    return 'nomal';
  }
  function getMorphNameData(type) {
    var nd = window.axolotlNameData;
    if (!nd || !nd.morphs) return null;
    return nd.morphs[getMorphNameKey(type)] || nd.morphs.nomal;
  }
  function getAdultElementsJa() {
    var nd = window.axolotlNameData;
    if (!nd || !nd.adultElementsJa) return null;
    return nd.adultElementsJa;
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
  // 名付けは男女関係なく使うB候補（合体リスト）
  var nameElementB = maleNameElementB.concat(femaleNameElementB);

  function getLocale() {
    return window.i18n && window.i18n.getLocale ? window.i18n.getLocale() : 'ja';
  }
  /** Game locale (locked when in game). Language can only be changed on title screen. */
  function getGameLocale() {
    if (state.saveLocale) return state.saveLocale;
    return getLocale();
  }
  /** For name display: use game locale when in game (English = simple names, Japanese = kanji). */
  function localeForNameDisplay() {
    return getGameLocale();
  }
  function nameForDisplay(ax, locale) {
    if (!ax) return '';
    var namePart = ax.name || typeLabel(ax.type);
    if (locale === 'en') return namePart;
    return namePart;
  }

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
    var isEn = getGameLocale() === 'en';
    var suffix = isEn ? function (n) { return n === 1 ? ' Jr.' : n === 2 ? ' III' : ' ' + (n + 1); } : function (n) { return n === 1 ? '2世' : n === 2 ? '3世' : (n + 1) + '世'; };
    
    while (isNameUsed(fullName) && attempt < maxAttempts) {
      attempt++;
      fullName = baseName + suffix(attempt);
    }
    
    registerName(fullName);
    return fullName;
  }

  function getRandomEnglishName() {
    return ENGLISH_NAMES[Math.floor(Math.random() * ENGLISH_NAMES.length)];
  }

  // ランダムにB要素を選択（男女関係なく合体リストから）
  function getRandomBElement() {
    var ae = getAdultElementsJa();
    if (ae && ae.elementBFemale && ae.elementBMale) {
      var combined = ae.elementBMale.concat(ae.elementBFemale);
      return combined[Math.floor(Math.random() * combined.length)];
    }
    return nameElementB[Math.floor(Math.random() * nameElementB.length)];
  }
  function getRandomBElementForSex(sex) {
    var ae = getAdultElementsJa();
    if (ae && ae.elementBFemale && ae.elementBMale) {
      var arr = sex === 'オス' ? ae.elementBMale : ae.elementBFemale;
      return arr[Math.floor(Math.random() * arr.length)];
    }
    return nameElementB[Math.floor(Math.random() * nameElementB.length)];
  }
  function getRandomElementA() {
    var ae = getAdultElementsJa();
    if (ae && ae.elementA) {
      return ae.elementA[Math.floor(Math.random() * ae.elementA.length)];
    }
    return maleNameElementA[Math.floor(Math.random() * maleNameElementA.length)];
  }

  // 幼名生成（12ヶ月未満用）
  function generateJuvenileName(type) {
    var data = getMorphNameData(type);
    var isEn = getGameLocale() === 'en';
    var list = data && (isEn ? data.juvenileEn : data.juvenileJa);
    if (list && list.length > 0) {
      var base = list[Math.floor(Math.random() * list.length)];
      return { name: generateUniqueName(base), isJuvenile: true };
    }
    return { name: generateUniqueName(typeLabel(type)), isJuvenile: true };
  }

  // 成体名生成（英語：オス/メス別）
  function generateAdultNameEn(type, sex) {
    var data = getMorphNameData(type);
    var list = data && (sex === 'オス' ? data.maleEn : data.femaleEn);
    if (list && list.length > 0) {
      var base = list[Math.floor(Math.random() * list.length)];
      return { name: generateUniqueName(base), nameElementA: null, nameElementB: null, isHereditaryA: false, isHereditaryB: false };
    }
    return { name: generateUniqueName(getRandomEnglishName()), nameElementA: null, nameElementB: null, isHereditaryA: false, isHereditaryB: false };
  }

  // 家系図（男系優先）を辿り、使用可能な通字を取得（同時期2匹未満のもの）
  function getHereditaryFromFamilyTree(parent1Id, parent2Id) {
    var seen = {};
    var maleFirst = [];
    function collect(pid) {
      if (!pid || !axolotlRegistry[pid] || seen[pid]) return;
      seen[pid] = true;
      var p = axolotlRegistry[pid];
      if (p.sex === 'オス') maleFirst.push(p);
      if (p.parent1Id) collect(p.parent1Id);
      if (p.parent2Id) collect(p.parent2Id);
    }
    function collectFemale(pid) {
      if (!pid || !axolotlRegistry[pid] || seen[pid]) return;
      seen[pid] = true;
      var p = axolotlRegistry[pid];
      if (p.sex === 'オス') maleFirst.push(p);
      if (p.parent1Id) collectFemale(p.parent1Id);
      if (p.parent2Id) collectFemale(p.parent2Id);
    }
    [parent1Id, parent2Id].forEach(function(pid) {
      if (!pid || !axolotlRegistry[pid]) return;
      var p = axolotlRegistry[pid];
      if (p.sex === 'オス') collect(pid);
    });
    [parent1Id, parent2Id].forEach(function(pid) {
      if (!pid || !axolotlRegistry[pid]) return;
      var p = axolotlRegistry[pid];
      if (p.sex === 'メス') collectFemale(pid);
    });
    for (var i = 0; i < maleFirst.length; i++) {
      var a = maleFirst[i];
      if (a.isHereditaryA && a.nameElementA && countMalesWithHereditary(a.nameElementA, 'A') < 2) {
        return { value: a.nameElementA, pos: 'A' };
      }
      if (a.isHereditaryB && a.nameElementB && countMalesWithHereditary(a.nameElementB, 'B') < 2) {
        return { value: a.nameElementB, pos: 'B' };
      }
    }
    return null;
  }

  // 生存中のオスで指定通字を持つ個体数をカウント（12ヶ月以上の成体のみ）
  function countMalesWithHereditary(value, position) {
    var count = 0;
    state.tanks.forEach(function(tank) {
      var ax = tank.axolotl;
      if (ax && ax.sex === 'オス' && ax.age >= 12 && !ax.isJuvenile) {
        var match = (position === 'A' && ax.isHereditaryA && ax.nameElementA === value) ||
          (position === 'B' && ax.isHereditaryB && ax.nameElementB === value);
        if (match) count++;
      }
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function(p) {
          if (p && p.sex === 'オス' && p.age >= 12 && !p.isJuvenile) {
            var m = (position === 'A' && p.isHereditaryA && p.nameElementA === value) ||
              (position === 'B' && p.isHereditaryB && p.nameElementB === value);
            if (m) count++;
          }
        });
      }
    });
    return count;
  }

  function isSimpleNameMode() {
    return state.settings && state.settings.simpleNameMode === true;
  }

  // 12ヶ月到達時に幼名から成人名へ切り替え（メスは幼名のまま、オスのみ成人名に）
  function assignAdultNameAt12(ax) {
    if (!ax || !ax.isJuvenile) return;
    if (isSimpleNameMode()) {
      ax.isJuvenile = false;
      if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].isJuvenile = false;
      return;
    }
    if (ax.sex === 'メス') {
      ax.isJuvenile = false; /* フラグのみ解除、名前は幼名のまま */
      if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].isJuvenile = false;
      return;
    }
    var oldName = ax.name;
    if (oldName && state.usedNames && state.usedNames[oldName]) delete state.usedNames[oldName];
    
    var sex = ax.sex || 'オス';
    var type = ax.type;
    
    if (getGameLocale() === 'en') {
      var adult = generateAdultNameEn(type, sex);
      ax.name = adult.name;
      ax.nameElementA = null;
      ax.nameElementB = null;
      ax.isHereditaryA = false;
      ax.isHereditaryB = false;
    } else {
      var parent1Id = ax.parent1Id;
      var parent2Id = ax.parent2Id;
      var maleParent = null;
      var femaleParent = null;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.id === parent1Id) {
          if (tank.axolotl.sex === 'オス') maleParent = tank.axolotl;
          else femaleParent = tank.axolotl;
        }
        if (tank.axolotl && tank.axolotl.id === parent2Id) {
          if (tank.axolotl.sex === 'オス') maleParent = tank.axolotl;
          else femaleParent = tank.axolotl;
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(p) {
            if (p.id === parent1Id) p.sex === 'オス' ? (maleParent = p) : (femaleParent = p);
            if (p.id === parent2Id) p.sex === 'オス' ? (maleParent = p) : (femaleParent = p);
          });
        }
      });
      [parent1Id, parent2Id].forEach(function(pid) {
        if (!pid || !axolotlRegistry[pid]) return;
        var r = axolotlRegistry[pid];
        if (r.sex === 'オス' && !maleParent) maleParent = r;
        else if (r.sex === 'メス' && !femaleParent) femaleParent = r;
      });
      
      if (sex === 'メス') {
        ax.nameElementB = (femaleParent && femaleParent.nameElementB) ? femaleParent.nameElementB : getRandomBElementForSex(sex);
        ax.isHereditaryB = true;
        ax.nameElementA = getRandomElementA();
        ax.isHereditaryA = false;
      } else {
        var maleHereditaryA = maleParent && maleParent.isHereditaryA && maleParent.nameElementA;
        var maleHereditaryB = maleParent && maleParent.isHereditaryB && maleParent.nameElementB;
        var useA = false;
        var useB = false;
        if (maleHereditaryA && maleHereditaryB) {
          var cntA = countMalesWithHereditary(maleHereditaryA, 'A');
          var cntB = countMalesWithHereditary(maleHereditaryB, 'B');
          if (cntA < 2 && cntB >= 2) useA = true;
          else if (cntB < 2 && cntA >= 2) useB = true;
          else if (cntA >= 2 && cntB >= 2) {
            var fromTree = getHereditaryFromFamilyTree(ax.parent1Id, ax.parent2Id);
            if (fromTree) {
              useA = fromTree.pos === 'A';
              useB = fromTree.pos === 'B';
              if (useA) maleHereditaryA = fromTree.value;
              if (useB) maleHereditaryB = fromTree.value;
            }
            // fromTreeがnullならuseA/useBはfalse→下のelseで初期名+ランダムB（通字なし）
          } else {
            useA = Math.random() < 0.5;
          }
        } else if (maleHereditaryA) {
          var cA = countMalesWithHereditary(maleHereditaryA, 'A');
          useA = cA < 2;
        } else if (maleHereditaryB) {
          var cB = countMalesWithHereditary(maleHereditaryB, 'B');
          useB = cB < 2;
        }
        if (useA) {
          ax.nameElementA = maleHereditaryA || getRandomElementA();
          ax.isHereditaryA = true;
          ax.nameElementB = getRandomBElementForSex(sex);
          ax.isHereditaryB = false;
        } else if (useB) {
          ax.nameElementB = maleHereditaryB || getRandomBElementForSex(sex);
          ax.isHereditaryB = true;
          ax.nameElementA = getRandomElementA();
          ax.isHereditaryA = false;
        } else {
          var initialA = morphInitialNameA[type] || 'リュウ';
          ax.nameElementA = initialA;
          ax.nameElementB = getRandomBElementForSex(sex);
          if (Math.random() < 0.5) {
            ax.isHereditaryA = true;
            ax.isHereditaryB = false;
          } else {
            ax.isHereditaryA = false;
            ax.isHereditaryB = true;
          }
        }
      }
      ax.name = (ax.nameElementA || '') + (ax.nameElementB || '');
      if (ax.name) ax.name = generateUniqueName(ax.name);
    }
    
    ax.isJuvenile = false;
    if (axolotlRegistry[ax.id]) {
      axolotlRegistry[ax.id].name = ax.name;
      axolotlRegistry[ax.id].nameElementA = ax.nameElementA;
      axolotlRegistry[ax.id].nameElementB = ax.nameElementB;
      axolotlRegistry[ax.id].isHereditaryA = ax.isHereditaryA;
      axolotlRegistry[ax.id].isHereditaryB = ax.isHereditaryB;
      axolotlRegistry[ax.id].isJuvenile = false;
    }
  }

  // 名前生成関数（要素A/Bシステム）age: 生成時の年齢（12未満なら幼名）
  function generateDefaultName(type, parent1Id, parent2Id, isFirstChild, sex, age) {
    var result = {
      nameElementA: null,
      nameElementB: null,
      isHereditaryA: false,
      isHereditaryB: false,
      name: null,
      isJuvenile: false
    };
    var useJuvenile = isSimpleNameMode() || (age == null || age < 12);
    
    if (useJuvenile) {
      var juv = generateJuvenileName(type);
      result.name = juv.name;
      result.isJuvenile = true;
      return result;
    }
    
    if (getGameLocale() === 'en') {
      var adultEn = generateAdultNameEn(type, sex);
      result.name = adultEn.name;
      return result;
    }
    
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
            result.nameElementB = femaleB || getRandomBElement();
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
          result.nameElementB = femaleB || getRandomBElement();
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
      result.nameElementB = getRandomBElement();
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
  function shadeLabel(shade) {
    if (shade === 'light') return t('game.shadeLight');
    if (shade === 'dark') return t('game.shadeDark');
    return t('game.shadeNormal');
  }
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
    
    var defaultNameResult = generateDefaultName(type, parent1Id || null, parent2Id || null, isFirstChild, sex, age);
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
      isFixedLineage: false,  // 固定化血統フラグ（デフォルトfalse）
      isJuvenile: defaultNameResult.isJuvenile || false  // 幼名か（12ヶ月で成人名に切り替え）
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
      familyName: ax.familyName,
      removed: false,
      isFixedLineage: ax.isFixedLineage || false,
      isJuvenile: ax.isJuvenile || false
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

  function sizeBandLabel(band) {
    return t('sizeBand.' + band);
  }

  function initTanks() {
    state.tanks = [];
    state.nextAxolotlId = 1;
    axolotlRegistry = {};
    var initialSlotCount = 3;
    var initialType = Math.random() < 0.5 ? 'nomal' : 'marble';
    var initialAx = createAxolotl(2, initialType, null, null);
    initialAx.isInitial = true;  // 最初のウパは販売不可
    if (axolotlRegistry[initialAx.id]) axolotlRegistry[initialAx.id].isInitial = true;
    for (var i = 0; i < initialSlotCount; i++) {
      state.tanks.push({
        id: i + 1,
        axolotl: i === 0 ? initialAx : null,
        note: i === 0 ? t('ui.firstAxo') : t('ui.emptyTank'),
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
    if (!ax) return ax;
    if (ax.isFixedLineage === undefined) ax.isFixedLineage = false;
    if (ax.isJuvenile === undefined) {
      ax.isJuvenile = (ax.age < 12 && !ax.nameElementA && !ax.nameElementB);
    }
    return ax;
  }

  function tankName(index, tank) {
    if (tank.customName) {
      return tank.customName;
    }
    var n = index + 1;
    if (tank.breedingPair) return t('ui.tankCohabiting', { n: n });
    if (tank.egg) return t('ui.tankEgg', { n: n });
    if (!tank.axolotl) return t('ui.tankEmpty', { n: n });
    return t('ui.tankSimple', { n: n });
  }

  function typeLabel(typeKey) {
    return t('type.' + typeKey) || t('type.nomal');
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
    // 1年以上（13ヶ月以上）：18〜25cm前後、まれに40cmまで
    if (Math.random() < 0.05) return 25 + Math.random() * 15; // 5%で25〜40cm
    return 18 + Math.random() * 7; // 18〜25cm
  }

  // サイズを表示用の文字列に変換
  function formatSize(size) {
    if (size == null) return t('ui.unknown');
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
  // ショップ表示用：ランダムなステータス（幼体1-3ヶ月、成体12-21ヶ月、濃さ・健康等で価格変動）
  function getRandomShopStats(sizeBandOrOpts) {
    var age;
    if (sizeBandOrOpts && typeof sizeBandOrOpts === 'object' && sizeBandOrOpts.age != null) {
      age = sizeBandOrOpts.age;
    } else {
      var band = typeof sizeBandOrOpts === 'number' ? sizeBandOrOpts : 1;
      if (band === 7 || band >= 5) {
        age = 12 + Math.floor(Math.random() * 10);
      } else {
        age = 1 + Math.floor(Math.random() * 3);
      }
    }
    var baseSize = calculateSizeFromAge(age);
    var sizeCm = Math.round((baseSize * (0.9 + Math.random() * 0.2)) * 10) / 10;
    var hunger = Math.floor(55 + Math.random() * 46);
    var health = Math.floor(55 + Math.random() * 46);
    var water = Math.floor(70 + Math.random() * 31);
    var shades = ['light', 'normal', 'dark'];
    var shade = shades[Math.floor(Math.random() * shades.length)];
    var statusStr = t('ui.healthy');
    return { age: age, size: sizeCm, hunger: hunger, health: health, water: water, shade: shade, status: statusStr };
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
  // band0〜7（幼生〜成体）、common相場：子供(3ヶ月)3000円、成体(12ヶ月〜)10000円
  var sizePriceTable = {
    nomal: [1000, 3000, 4000, 5500, 7000, 8500, 9500, 10000],
    albino: [1000, 3000, 4000, 5500, 7000, 8500, 9500, 10000],
    marble: [1000, 3000, 4000, 5500, 7000, 8500, 9500, 10000],
    gold: [1500, 4500, 6000, 8000, 10000, 12000, 14000, 15000],
    black: [1300, 4000, 5300, 7000, 9000, 11000, 12500, 13000],
    superblack: [10000, 30000, 40000, 55000, 70000, 85000, 95000, 100000],
    copper: [30000, 100000, 130000, 180000, 230000, 280000, 320000, 350000],
    goldblackeye: [30000, 100000, 130000, 180000, 230000, 280000, 320000, 350000],
    chimera: [90000, 300000, 400000, 550000, 700000, 850000, 950000, 1000000],
    yellow: [3000, 10000, 13000, 18000, 23000, 28000, 32000, 35000],
    dalmatian: [18000, 60000, 80000, 110000, 140000, 170000, 190000, 200000]
  };
  function calcBaseMarketPrice(ax) {
    var band = sizeBandFromAge(ax.age);
    var bandPrices = sizePriceTable[ax.type] || sizePriceTable.nomal;
    var base = (bandPrices[band] || bandPrices[bandPrices.length - 1]) || 10000;
    return base;
  }

  function calcPrice(ax) {
    var band = sizeBandFromAge(ax.age);
    var bandPrices = sizePriceTable[ax.type] || sizePriceTable.nomal;
    var base = (bandPrices[band] || bandPrices[bandPrices.length - 1]) || 10000;
    
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
      grandparents: [],
      grandparentsPerParent: [] // [parent1's grandparents, parent2's grandparents]
    };
    // 親を取得
    if (ax.parent1Id && axolotlRegistry[ax.parent1Id]) {
      tree.parents.push(axolotlRegistry[ax.parent1Id]);
    }
    if (ax.parent2Id && axolotlRegistry[ax.parent2Id]) {
      tree.parents.push(axolotlRegistry[ax.parent2Id]);
    }
    // 祖父母を取得（親ごとに分離）
    tree.parents.forEach(function (parent) {
      var gps = [];
      if (parent.parent1Id && axolotlRegistry[parent.parent1Id]) {
        gps.push(axolotlRegistry[parent.parent1Id]);
        tree.grandparents.push(axolotlRegistry[parent.parent1Id]);
      }
      if (parent.parent2Id && axolotlRegistry[parent.parent2Id]) {
        gps.push(axolotlRegistry[parent.parent2Id]);
        tree.grandparents.push(axolotlRegistry[parent.parent2Id]);
      }
      tree.grandparentsPerParent.push(gps);
    });
    return tree;
  }

  // 固定化チェック（家系図が全部同じ個体の場合）
  function checkIfFixed(axolotlId) {
    var ax = axolotlRegistry[axolotlId];
    if (!ax || !ax.type) return false;
    return state.fixedTypes[ax.type] === true;
  }

  // 固定化判定（家系図の75%以上が同じ種類の場合に固定化成功）
  function checkForFixation(axolotlId) {
    var ax = axolotlRegistry[axolotlId];
    if (!ax || !ax.type) return false;
    
    // 既に固定化されている場合はスキップ
    if (state.fixedTypes[ax.type]) return false;
    
    // 親が2人必要
    if (!ax.parent1Id || !ax.parent2Id) return false;
    
    var p1 = axolotlRegistry[ax.parent1Id];
    var p2 = axolotlRegistry[ax.parent2Id];
    if (!p1 || !p2) return false;
    
    // 家系図を収集（自分・両親・祖父母、重複除く）
    var seen = {};
    var family = [];
    function addIfNew(axo) {
      if (axo && axo.id && !seen[axo.id]) {
        seen[axo.id] = true;
        family.push(axo);
      }
    }
    addIfNew(ax);
    addIfNew(p1);
    addIfNew(p2);
    if (p1.parent1Id && axolotlRegistry[p1.parent1Id]) addIfNew(axolotlRegistry[p1.parent1Id]);
    if (p1.parent2Id && axolotlRegistry[p1.parent2Id]) addIfNew(axolotlRegistry[p1.parent2Id]);
    if (p2.parent1Id && axolotlRegistry[p2.parent1Id]) addIfNew(axolotlRegistry[p2.parent1Id]);
    if (p2.parent2Id && axolotlRegistry[p2.parent2Id]) addIfNew(axolotlRegistry[p2.parent2Id]);
    
    if (family.length < 3) return false; // 最低3人（自分+両親）必要
    
    var sameCount = 0;
    for (var i = 0; i < family.length; i++) {
      if (family[i].type === ax.type) sameCount++;
    }
    var ratio = sameCount / family.length;
    
    if (ratio >= 0.75) {
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
          logLine(t('game.fixedSuccessSuperblack', { type: typeLabel(ax.type), reward: formatMoney(reward) }));
        } else {
          logLine(t('game.fixedSuccess', { type: typeLabel(ax.type), reward: formatMoney(reward) }));
        }
      } else {
        logLine(t('game.fixedSuccess', { type: typeLabel(ax.type), reward: formatMoney(reward) }));
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

  function openDetailModal(axolotlId, options) {
    var ax = axolotlRegistry[axolotlId];
    if (!ax) return;
    var fromHatch = options && options.fromHatch;
    
    // 現在の状態を取得（水槽内の個体から）
    var currentAx = null;
    var foundTank = null;
    var foundTankIdx = -1;
    state.tanks.forEach(function (tank, idx) {
      if (tank.axolotl && tank.axolotl.id === axolotlId) {
        currentAx = tank.axolotl;
        foundTank = tank;
        foundTankIdx = idx;
      }
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function (pairAx) {
          if (pairAx.id === axolotlId) {
            currentAx = pairAx;
            foundTank = tank;
            foundTankIdx = idx;
          }
        });
      }
    });
    
    // レジストリの情報と現在の状態をマージ
    var displayAx = currentAx || ax;
    
    var tree = getFamilyTree(axolotlId);
    var nameEl = $('axDetailName');
    var iconWrapEl = $('axDetailIconWrap');
    var bodyEl = $('axDetailBody');
    var familyEl = $('axDetailFamily');
    
    var sexDisplay = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '♂' : '♀') : '';
    var namePart = nameForDisplay(displayAx, localeForNameDisplay());
    var displayName = (displayAx.familyName ? displayAx.familyName + ' ' : '') + namePart;
    var sexDisplayHtml = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
    if (foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2) {
      var pairNames = foundTank.breedingPair.map(function (p) {
        return (p.familyName ? p.familyName + ' ' : '') + nameForDisplay(p, localeForNameDisplay()) + (p.age >= 12 ? (p.sex === 'オス' ? ' ♂' : ' ♀') : '');
      }).join(' & ');
      nameEl.innerHTML = pairNames;
    } else {
      nameEl.innerHTML = displayName + (sexDisplayHtml ? ' ' + sexDisplayHtml : '');
    }
    
    // 中央揃えのアイコンをヘッダーに表示（繁殖ペアの場合は各カラムに表示するため非表示）
    iconWrapEl.innerHTML = '';
    if (!(foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2)) {
      var detailSprite = (displayAx.type === 'chimera' && displayAx.chimeraTypes && displayAx.chimeraTypes.length >= 2)
        ? createChimeraCanvasSprite(displayAx, 80)
        : createPixelArtCanvasSprite(displayAx, 80);
      iconWrapEl.appendChild(detailSprite);
    }
    
    var sizeBand = sizeBandFromAge(displayAx.age);
    bodyEl.innerHTML = '';
    
    // 繁殖ペアの場合は左右2カラムで各個体の詳細を表示
    if (foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2) {
      var pairColumnsDiv = document.createElement('div');
      pairColumnsDiv.className = 'ax-detail-pair-columns';
      foundTank.breedingPair.forEach(function (pairAx) {
        var col = document.createElement('div');
        col.className = 'ax-detail-pair-column';
        var colIconWrap = document.createElement('div');
        colIconWrap.className = 'ax-detail-pair-column-icon-wrap';
        var colSprite = (pairAx.type === 'chimera' && pairAx.chimeraTypes && pairAx.chimeraTypes.length >= 2)
          ? createChimeraCanvasSprite(pairAx, 48)
          : createPixelArtCanvasSprite(pairAx, 48);
        colIconWrap.appendChild(colSprite);
        col.appendChild(colIconWrap);
        var colTitle = document.createElement('h4');
        colTitle.textContent = (pairAx.familyName ? pairAx.familyName + ' ' : '') + nameForDisplay(pairAx, localeForNameDisplay()) + (pairAx.age >= 12 ? (pairAx.sex === 'オス' ? ' ♂' : ' ♀') : '');
        col.appendChild(colTitle);
        var colContent = document.createElement('div');
        colContent.className = 'ax-detail-pair-column-content';
        var pairTankClean = foundTank && foundTank.clean !== undefined ? foundTank.clean : 80;
        var pairStatusStr = (pairAx.injured ? t('ui.injured') : '') + (pairAx.sick ? t('ui.sick') : '') + (pairAx.underTreatment ? t('ui.underTreatment') : '') + (!pairAx.injured && !pairAx.sick && !pairAx.underTreatment ? t('ui.healthy') : '');
        var pairBodyText = t('ui.sizeLabel') + formatSize(pairAx.size) + '\n' + t('ui.ageFormat', { n: pairAx.age }) + '\n' + t('ui.healthLabel') + Math.round(pairAx.health || 100) + '/100\n' + t('ui.hungerLabelShort') + Math.round(pairAx.hunger || 100) + '/100\n' + t('ui.waterQualityLabel') + Math.round(pairTankClean) + '/100\n' + t('ui.shadeLabel') + shadeLabel(pairAx.shade) + '\n' + t('ui.statusFormat', { status: pairStatusStr }) + '\n' + t('ui.estimatedPrice') + formatMoney(calcPrice(pairAx));
        var pairTextDiv = document.createElement('div');
        pairTextDiv.style.whiteSpace = 'pre-line';
        pairTextDiv.style.fontSize = '11px';
        pairTextDiv.textContent = pairBodyText;
        colContent.appendChild(pairTextDiv);
        var pairNameLabel = document.createElement('label');
        pairNameLabel.style.fontSize = '10px';
        pairNameLabel.textContent = t('ui.name');
        var pairNameInput = document.createElement('input');
        pairNameInput.type = 'text';
        pairNameInput.value = pairAx.name || '';
        pairNameInput.placeholder = t('dialog.namePlaceholder');
        pairNameInput.style.width = '100%';
        pairNameInput.style.padding = '4px';
        pairNameInput.style.fontSize = '11px';
        pairNameInput.style.marginTop = '4px';
        pairNameInput.dataset.axolotlId = String(pairAx.id);
        pairNameInput.addEventListener('change', function () {
          var axId = parseInt(this.dataset.axolotlId, 10);
          var ax = axolotlRegistry[axId];
          if (!ax) return;
          var newName = this.value.trim() || null;
          var oldName = ax.name;
          if (oldName && state.usedNames && state.usedNames[oldName]) delete state.usedNames[oldName];
          if (newName) newName = generateUniqueName(newName);
          ax.name = newName;
          ax.nameElementA = null;
          ax.nameElementB = null;
          if (displayAx.id === axId) {
            var nameEl = $('axDetailName');
            var sexDisplayHtml = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
            var namePart = newName ? nameForDisplay({ name: newName, nameElementA: null, nameElementB: null, type: displayAx.type }, 'en') : typeLabel(displayAx.type);
            nameEl.innerHTML = (displayAx.familyName ? displayAx.familyName + ' ' : '') + namePart + (sexDisplayHtml ? ' ' + sexDisplayHtml : '');
          }
          colTitle.textContent = (pairAx.familyName ? pairAx.familyName + ' ' : '') + (newName || typeLabel(pairAx.type)) + (pairAx.age >= 12 ? (pairAx.sex === 'オス' ? ' ♂' : ' ♀') : '');
          saveGame();
        });
        colContent.appendChild(pairNameLabel);
        colContent.appendChild(pairNameInput);
        var pairTree = getFamilyTree(pairAx.id);
        var pairTreeDiv = document.createElement('div');
        pairTreeDiv.className = 'ax-detail-pair-family';
        pairTreeDiv.style.marginTop = '8px';
        pairTreeDiv.style.paddingTop = '8px';
        pairTreeDiv.style.borderTop = '1px solid #bae6fd';
        pairTreeDiv.style.fontSize = '10px';
        var pairTreeH4 = document.createElement('h4');
        pairTreeH4.textContent = t('ui.familyTree');
        pairTreeH4.style.fontSize = '11px';
        pairTreeH4.style.marginBottom = '4px';
        pairTreeH4.style.color = '#0369a1';
        pairTreeDiv.appendChild(pairTreeH4);
        if (pairTree && (pairTree.parents.length > 0 || pairTree.grandparents.length > 0)) {
          if (pairTree.parents.length > 0) {
            pairTree.parents.forEach(function (p, idx) {
              var entry = document.createElement('div');
              entry.className = 'ax-detail-family-entry';
              entry.style.marginBottom = '4px';
              var pSprite = (p.type === 'chimera' && p.chimeraTypes && p.chimeraTypes.length >= 2)
                ? createChimeraCanvasSprite(p, 24)
                : createPixelArtCanvasSprite(p, 24);
              entry.appendChild(pSprite);
              var morphSpan = document.createElement('div');
              morphSpan.className = 'ax-detail-family-entry-morph';
              morphSpan.style.fontSize = '10px';
              morphSpan.innerHTML = typeLabel(p.type) + ' ' + (p.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>');
              entry.appendChild(morphSpan);
              var nameSpan = document.createElement('div');
              nameSpan.className = 'ax-detail-family-entry-name';
              nameSpan.textContent = p.name || '-';
              entry.appendChild(nameSpan);
              pairTreeDiv.appendChild(entry);
              var gps = pairTree.grandparentsPerParent && pairTree.grandparentsPerParent[idx] ? pairTree.grandparentsPerParent[idx] : [];
              gps.forEach(function (gp) {
                var gpEntry = document.createElement('div');
                gpEntry.className = 'ax-detail-family-entry';
                gpEntry.style.marginBottom = '4px';
                gpEntry.style.marginLeft = '8px';
                var gpSprite = (gp.type === 'chimera' && gp.chimeraTypes && gp.chimeraTypes.length >= 2)
                  ? createChimeraCanvasSprite(gp, 20)
                  : createPixelArtCanvasSprite(gp, 20);
                gpEntry.appendChild(gpSprite);
                var gpMorphSpan = document.createElement('div');
                gpMorphSpan.className = 'ax-detail-family-entry-morph';
                gpMorphSpan.style.fontSize = '9px';
                gpMorphSpan.innerHTML = typeLabel(gp.type) + ' ' + (gp.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>');
                gpEntry.appendChild(gpMorphSpan);
                var gpNameSpan = document.createElement('div');
                gpNameSpan.className = 'ax-detail-family-entry-name';
                gpNameSpan.textContent = gp.name || '-';
                gpEntry.appendChild(gpNameSpan);
                pairTreeDiv.appendChild(gpEntry);
              });
            });
          } else {
            var noP = document.createElement('div');
            noP.textContent = t('ui.parentUnknown');
            pairTreeDiv.appendChild(noP);
          }
        } else {
          var noP2 = document.createElement('div');
          noP2.textContent = t('ui.parentUnknown');
          pairTreeDiv.appendChild(noP2);
        }
        colContent.appendChild(pairTreeDiv);
        col.appendChild(colContent);
        pairColumnsDiv.appendChild(col);
      });
      bodyEl.appendChild(pairColumnsDiv);
    }
    
    // 名前編集欄（孵化プレビュー時は非表示、繁殖ペア時は各カラムに含めるか下に表示）
    var nameEditDiv = document.createElement('div');
    nameEditDiv.style.marginBottom = '8px';
    
    if (fromHatch) {
      nameEditDiv.style.display = 'none';
    }
    // 繁殖ペアの場合は名前編集を非表示（各カラムに統計のみ表示）
    if (foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2) {
      nameEditDiv.style.display = 'none';
    }
    var useSimpleName = isSimpleNameMode() || getGameLocale() === 'en' || displayAx.age < 12 || displayAx.sex === 'メス';
    if (useSimpleName) {
      /* 英語／幼名（12ヶ月未満）／メス：要素A/B・通字なし、シンプルな名前入力のみ（メスは幼名のまま） */
      var nameInputId = 'axDetailName_' + axolotlId;
      var nameLabel = document.createElement('label');
      nameLabel.htmlFor = nameInputId;
      nameLabel.style.fontSize = '11px';
      nameLabel.textContent = t('ui.name');
      var nameInput = document.createElement('input');
      nameInput.id = nameInputId;
      nameInput.name = nameInputId;
      nameInput.type = 'text';
      nameInput.value = displayAx.name || '';
      nameInput.placeholder = t('dialog.namePlaceholder');
      nameInput.style.width = '100%';
      nameInput.style.padding = '4px';
      nameInput.style.marginTop = '2px';
      nameInput.style.fontSize = '12px';
      nameInput.addEventListener('change', function () {
        var newName = this.value.trim() || null;
        if (currentAx) {
          var oldName = currentAx.name;
          if (oldName && state.usedNames && state.usedNames[oldName]) delete state.usedNames[oldName];
          if (newName) newName = generateUniqueName(newName);
          currentAx.name = newName;
          currentAx.nameElementA = null;
          currentAx.nameElementB = null;
          if (axolotlRegistry[axolotlId]) {
            axolotlRegistry[axolotlId].name = newName;
            axolotlRegistry[axolotlId].nameElementA = null;
            axolotlRegistry[axolotlId].nameElementB = null;
          }
          var nameEl = $('axDetailName');
          var sexDisplayHtml = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
          var namePart = newName ? nameForDisplay({ name: newName, nameElementA: null, nameElementB: null, type: displayAx.type }, localeForNameDisplay()) : typeLabel(displayAx.type);
          nameEl.innerHTML = (displayAx.familyName ? displayAx.familyName + ' ' : '') + namePart + (sexDisplayHtml ? ' ' + sexDisplayHtml : '');
          saveGame();
        }
      });
      nameEditDiv.appendChild(nameLabel);
      nameEditDiv.appendChild(nameInput);
    } else {
      /* 日本語・成体（12ヶ月以上）：要素A/B＋通字UI */
      var nameElementsContainer = document.createElement('div');
      nameElementsContainer.style.display = 'flex';
      nameElementsContainer.style.gap = '8px';
      nameElementsContainer.style.marginBottom = '8px';
      var elementAInputId = 'axDetailElementA_' + axolotlId;
      var elementADiv = document.createElement('div');
      elementADiv.style.flex = '1';
      var elementALabel = document.createElement('label');
      elementALabel.htmlFor = elementAInputId;
      elementALabel.style.fontSize = '11px';
      elementALabel.textContent = t('ui.elementA');
      var elementAInput = document.createElement('input');
      elementAInput.id = elementAInputId;
      elementAInput.name = elementAInputId;
      elementAInput.type = 'text';
      elementAInput.value = displayAx.nameElementA || '';
      elementAInput.placeholder = t('dialog.elementAPlaceholder');
      elementAInput.style.width = '100%';
      elementAInput.style.padding = '4px';
      elementAInput.style.marginTop = '2px';
      elementAInput.style.fontSize = '12px';
      elementAInput.style.marginBottom = '4px';
      var hereditaryACheckbox = document.createElement('input');
      hereditaryACheckbox.type = 'checkbox';
      hereditaryACheckbox.checked = displayAx.isHereditaryA || false;
      hereditaryACheckbox.id = 'hereditaryA_' + axolotlId;
      var hereditaryALabel = document.createElement('label');
      hereditaryALabel.htmlFor = 'hereditaryA_' + axolotlId;
      hereditaryALabel.textContent = t('ui.hereditary');
      hereditaryALabel.style.fontSize = '11px';
      hereditaryALabel.style.marginLeft = '4px';
      elementADiv.appendChild(elementALabel);
      elementADiv.appendChild(elementAInput);
      elementADiv.appendChild(hereditaryACheckbox);
      elementADiv.appendChild(hereditaryALabel);
      var elementBInputId = 'axDetailElementB_' + axolotlId;
      var elementBDiv = document.createElement('div');
      elementBDiv.style.flex = '1';
      var elementBLabel = document.createElement('label');
      elementBLabel.htmlFor = elementBInputId;
      elementBLabel.style.fontSize = '11px';
      elementBLabel.textContent = t('ui.elementB');
      var elementBInput = document.createElement('input');
      elementBInput.id = elementBInputId;
      elementBInput.name = elementBInputId;
      elementBInput.type = 'text';
      elementBInput.value = displayAx.nameElementB || '';
      elementBInput.placeholder = t('dialog.elementBPlaceholder');
      elementBInput.style.width = '100%';
      elementBInput.style.padding = '4px';
      elementBInput.style.marginTop = '2px';
      elementBInput.style.fontSize = '12px';
      elementBInput.style.marginBottom = '4px';
      var hereditaryBCheckbox = document.createElement('input');
      hereditaryBCheckbox.type = 'checkbox';
      hereditaryBCheckbox.checked = displayAx.isHereditaryB || false;
      hereditaryBCheckbox.id = 'hereditaryB_' + axolotlId;
      var hereditaryBLabel = document.createElement('label');
      hereditaryBLabel.htmlFor = 'hereditaryB_' + axolotlId;
      hereditaryBLabel.textContent = t('ui.hereditary');
      hereditaryBLabel.style.fontSize = '11px';
      hereditaryBLabel.style.marginLeft = '4px';
      elementBDiv.appendChild(elementBLabel);
      elementBDiv.appendChild(elementBInput);
      elementBDiv.appendChild(hereditaryBCheckbox);
      elementBDiv.appendChild(hereditaryBLabel);
      nameElementsContainer.appendChild(elementADiv);
      nameElementsContainer.appendChild(elementBDiv);
      function updateNameFromElements() {
        var elementA = elementAInput.value.trim();
        var elementB = elementBInput.value.trim();
        var isHereditaryA = hereditaryACheckbox.checked;
        var isHereditaryB = hereditaryBCheckbox.checked;
        if (!elementA && elementB && isHereditaryB) {
          elementA = maleNameElementA[Math.floor(Math.random() * maleNameElementA.length)];
          elementAInput.value = elementA;
        }
        var newName = (elementA || '') + (elementB || '');
        if (newName === '') newName = null;
        if (currentAx) {
          var oldName = currentAx.name;
          if (oldName && state.usedNames && state.usedNames[oldName]) delete state.usedNames[oldName];
          if (newName) newName = generateUniqueName(newName);
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
          var nameEl = $('axDetailName');
          var sexDisplayHtml = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '';
          var namePart = newName ? nameForDisplay({ name: newName, nameElementA: elementA || null, nameElementB: elementB || null, type: displayAx.type }, 'ja') : typeLabel(displayAx.type);
          nameEl.innerHTML = (displayAx.familyName ? displayAx.familyName + ' ' : '') + namePart + (sexDisplayHtml ? ' ' + sexDisplayHtml : '');
          saveGame();
        }
      }
      elementAInput.addEventListener('change', updateNameFromElements);
      elementBInput.addEventListener('change', updateNameFromElements);
      hereditaryACheckbox.addEventListener('change', updateNameFromElements);
      hereditaryBCheckbox.addEventListener('change', updateNameFromElements);
      nameEditDiv.appendChild(nameElementsContainer);
      if (displayAx.name && !displayAx.nameElementA && !displayAx.nameElementB) {
        var existingName = displayAx.name;
        if (existingName.length >= 2) {
          elementAInput.value = existingName.substring(0, 1);
          elementBInput.value = existingName.substring(1);
        } else {
          elementBInput.value = existingName;
        }
        updateNameFromElements();
      }
    }
    bodyEl.appendChild(nameEditDiv);
    
    // 苗字編集欄（繁殖ペアの場合のみ、孵化プレビュー時は非表示）
    if (!fromHatch && displayAx.age >= 12 && (displayAx.sex === 'オス' || displayAx.sex === 'メス')) {
      var familyNameInputId = 'axDetailFamilyName_' + axolotlId;
      var familyNameEditDiv = document.createElement('div');
      familyNameEditDiv.style.marginBottom = '8px';
      var familyNameLabel = document.createElement('label');
      familyNameLabel.htmlFor = familyNameInputId;
      familyNameLabel.style.fontSize = '11px';
      familyNameLabel.textContent = t('ui.familyNameLabel');
      var familyNameInput = document.createElement('input');
      familyNameInput.id = familyNameInputId;
      familyNameInput.name = familyNameInputId;
      familyNameInput.type = 'text';
      familyNameInput.value = displayAx.familyName || '';
      familyNameInput.placeholder = t('dialog.familyNamePlaceholder');
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
          var namePart = nameForDisplay(displayAx, localeForNameDisplay());
          var displayName = (newFamilyName ? newFamilyName + ' ' : '') + namePart;
          nameEl.innerHTML = displayName + (sexDisplayHtml ? ' ' + sexDisplayHtml : '');
        }
      });
      familyNameEditDiv.appendChild(familyNameLabel);
      familyNameEditDiv.appendChild(familyNameInput);
      bodyEl.appendChild(familyNameEditDiv);
    }
    
    // 水質の数値を取得
    var tankClean = foundTank && foundTank.clean !== undefined ? foundTank.clean : 80;
    
    var statusStr = (displayAx.injured ? t('ui.injured') : '') + (displayAx.sick ? t('ui.sick') : '') + (displayAx.underTreatment ? t('ui.underTreatment') : '') + (!displayAx.injured && !displayAx.sick && !displayAx.underTreatment ? t('ui.healthy') : '');
    var bodyText = 
      t('ui.sizeLabel') + formatSize(displayAx.size) + '\n' +
      t('ui.ageFormat', { n: displayAx.age }) + '\n' +
      t('ui.healthLabel') + Math.round(displayAx.health || 100) + '/100\n' +
      t('ui.hungerLabelShort') + Math.round(displayAx.hunger || 100) + '/100\n' +
      t('ui.waterQualityLabel') + Math.round(tankClean) + '/100\n' +
      t('ui.shadeLabel') + shadeLabel(displayAx.shade) + '\n' +
      t('ui.statusFormat', { status: statusStr }) + '\n' +
      t('ui.estimatedPrice') + formatMoney(calcPrice(displayAx));
    var bodyTextDiv = document.createElement('div');
    bodyTextDiv.style.whiteSpace = 'pre-line';
    bodyTextDiv.textContent = bodyText;
    if (!(foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2)) {
      bodyEl.appendChild(bodyTextDiv);
    }
    
    // 家系図を表示（繁殖ペアの場合は各カラム内に表示するためスキップ）
    familyEl.innerHTML = '';
    if (foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2) {
      familyEl.style.display = 'none';
    } else {
      familyEl.style.display = '';
    }
    if (!(foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2) && tree && (tree.parents.length > 0 || tree.grandparents.length > 0)) {
      var h3 = document.createElement('h3');
      h3.textContent = t('ui.familyTree');
      familyEl.appendChild(h3);
      
      if (tree.parents.length > 0) {
        var treeContainer = document.createElement('div');
        treeContainer.className = 'ax-detail-family-tree';
        tree.parents.forEach(function (p, idx) {
          var side = document.createElement('div');
          side.className = 'ax-detail-family-side';
          var sideLabel = document.createElement('div');
          sideLabel.className = 'ax-detail-family-side-label';
          sideLabel.textContent = t('ui.parent') + ' (' + (p.sex === 'オス' ? '♂' : '♀') + ')';
          side.appendChild(sideLabel);
          var entry = document.createElement('div');
          entry.className = 'ax-detail-family-entry';
          var pSprite = (p.type === 'chimera' && p.chimeraTypes && p.chimeraTypes.length >= 2)
            ? createChimeraCanvasSprite(p, 32)
            : createPixelArtCanvasSprite(p, 32);
          entry.appendChild(pSprite);
          var morphSpan = document.createElement('div');
          morphSpan.className = 'ax-detail-family-entry-morph';
          morphSpan.innerHTML = typeLabel(p.type) + ' ' + (p.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>');
          entry.appendChild(morphSpan);
          var nameSpan = document.createElement('div');
          nameSpan.className = 'ax-detail-family-entry-name';
          nameSpan.textContent = p.name || '-';
          entry.appendChild(nameSpan);
          side.appendChild(entry);
          var gps = tree.grandparentsPerParent && tree.grandparentsPerParent[idx] ? tree.grandparentsPerParent[idx] : [];
          gps.forEach(function (gp) {
            var gpEntry = document.createElement('div');
            gpEntry.className = 'ax-detail-family-entry';
            var gpSprite = (gp.type === 'chimera' && gp.chimeraTypes && gp.chimeraTypes.length >= 2)
              ? createChimeraCanvasSprite(gp, 24)
              : createPixelArtCanvasSprite(gp, 24);
            gpEntry.appendChild(gpSprite);
            var gpMorphSpan = document.createElement('div');
            gpMorphSpan.className = 'ax-detail-family-entry-morph';
            gpMorphSpan.style.fontSize = '10px';
            gpMorphSpan.innerHTML = typeLabel(gp.type) + ' ' + (gp.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>');
            gpEntry.appendChild(gpMorphSpan);
            var gpNameSpan = document.createElement('div');
            gpNameSpan.className = 'ax-detail-family-entry-name';
            gpNameSpan.textContent = gp.name || '-';
            gpEntry.appendChild(gpNameSpan);
            side.appendChild(gpEntry);
          });
          treeContainer.appendChild(side);
        });
        familyEl.appendChild(treeContainer);
      } else {
        var noParentDiv = document.createElement('div');
        noParentDiv.className = 'ax-detail-family-item';
        noParentDiv.textContent = t('ui.parentUnknown');
        familyEl.appendChild(noParentDiv);
      }
    } else if (!(foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2)) {
      var noFamilyDiv = document.createElement('div');
      noFamilyDiv.className = 'ax-detail-family-item';
      noFamilyDiv.textContent = t('ui.parentUnknown');
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
        if (tank.axolotl && tank.axolotl.id === axolotlId && (tank.axolotl.isInitial || tank.note === t('ui.firstAxo') || tank.note === '最初のウパ' || tank.note === 'First axolotl' || tank.note === '親ウパ')) {
          isInitialAxolotl = true;
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(pairAx) {
            if (pairAx.id === axolotlId && pairAx.isInitial) isInitialAxolotl = true;
          });
        }
        if (tank.axolotl && tank.axolotl.id === axolotlId && (tank.note === '1ヶ月目のウパ' || tank.note === t('game.note.oneMonth')) && !tank.axolotl.name) {
          isHatchNaming = true;
        }
        if (tank.axolotl && tank.axolotl.id === axolotlId && (tank.note === 'ショップで購入したウパ' || tank.note === 'ミューテーションショップで購入したウパ') && !tank.axolotl.name) {
          isShopNaming = true;
        }
      });
    }
    
    var cancelBtn = $('axDetailCancel');
    var sellBtn = $('axDetailSell');
    var sellBtn2 = $('axDetailSell2');
    var sellPairBtn = $('axDetailSellPair');
    if (fromHatch) {
      cancelBtn.textContent = t('ui.close');
      if (sellBtn) sellBtn.style.display = 'none';
      if (sellBtn2) sellBtn2.style.display = 'none';
      if (sellPairBtn) sellPairBtn.style.display = 'none';
    } else if (isHatchNaming || isShopNaming) {
      cancelBtn.textContent = t('ui.confirm');
      if (sellBtn) sellBtn.style.display = 'none';
      if (sellBtn2) sellBtn2.style.display = 'none';
      if (sellPairBtn) sellPairBtn.style.display = 'none';
    } else if (foundTank && foundTank.breedingPair && foundTank.breedingPair.length === 2) {
      cancelBtn.textContent = t('ui.close');
      if (sellPairBtn) {
        var pairTotalPrice = 0;
        var pairCannotSell = false;
        foundTank.breedingPair.forEach(function (pairAx) {
          pairTotalPrice += calcPrice(pairAx);
          var pairIsInitial = pairAx.isInitial;
          state.tanks.forEach(function (tank) {
            if (tank.breedingPair) {
              tank.breedingPair.forEach(function (p) {
                if (p.id === pairAx.id && p.isInitial) pairIsInitial = true;
              });
            }
          });
          var sameMonthBought = (pairAx.boughtAtMonth != null && pairAx.boughtAtMonth === state.month);
          var sameMonthWelcomed = (pairAx.welcomedAtMonth != null && pairAx.welcomedAtMonth === state.month);
          if (sameMonthBought || sameMonthWelcomed || (pairIsInitial && state.month < 2)) pairCannotSell = true;
        });
        sellPairBtn.style.display = 'block';
        sellPairBtn.textContent = pairCannotSell ? t('ui.cannotSellThisMonth') : (t('ui.sellPair') + ' ' + formatMoney(pairTotalPrice));
        sellPairBtn.disabled = pairCannotSell;
        var newPairBtn = sellPairBtn.cloneNode(true);
        sellPairBtn.parentNode.replaceChild(newPairBtn, sellPairBtn);
        var tankIdxToSell = foundTankIdx;
        newPairBtn.onclick = function () {
          if (this.disabled) return;
          sellBreedingPair(tankIdxToSell);
          $('axOverlayDetail').classList.remove('visible');
          updateUI();
        };
      }
      foundTank.breedingPair.forEach(function (pairAx, idx) {
        var btn = idx === 0 ? sellBtn : sellBtn2;
        if (!btn) return;
        var pairIsInitial = false;
        if (pairAx.isInitial) pairIsInitial = true;
        state.tanks.forEach(function (tank) {
          if (tank.breedingPair) {
            tank.breedingPair.forEach(function (p) {
              if (p.id === pairAx.id && p.isInitial) pairIsInitial = true;
            });
          }
        });
        var sameMonthBought = (pairAx.boughtAtMonth != null && pairAx.boughtAtMonth === state.month);
        var sameMonthWelcomed = (pairAx.welcomedAtMonth != null && pairAx.welcomedAtMonth === state.month);
        var cannotSellThisMonth = sameMonthBought || sameMonthWelcomed;
        if (pairIsInitial) cannotSellThisMonth = (state.month < 2) || cannotSellThisMonth;
        btn.style.display = 'block';
        btn.textContent = cannotSellThisMonth ? t('ui.cannotSellThisMonth') : t('ui.sellPrice', { price: formatMoney(calcPrice(pairAx)) });
        btn.disabled = cannotSellThisMonth;
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        var targetId = pairAx.id;
        newBtn.onclick = function () {
          if (this.disabled) return;
          sellAxolotlFromDetail(targetId);
        };
      });
    } else {
      cancelBtn.textContent = t('ui.close');
      if (sellPairBtn) sellPairBtn.style.display = 'none';
      if (sellBtn) {
        if (sellBtn2) sellBtn2.style.display = 'none';
        var sameMonthBought = (displayAx.boughtAtMonth != null && displayAx.boughtAtMonth === state.month);
        var sameMonthWelcomed = (displayAx.welcomedAtMonth != null && displayAx.welcomedAtMonth === state.month);
        var cannotSellThisMonth = sameMonthBought || sameMonthWelcomed;
        if (isInitialAxolotl) cannotSellThisMonth = (state.month < 2) || cannotSellThisMonth;
        sellBtn.style.display = 'block';
        sellBtn.textContent = cannotSellThisMonth ? t('ui.cannotSellThisMonth') : t('ui.sellPrice', { price: formatMoney(calcPrice(displayAx)) });
        sellBtn.disabled = cannotSellThisMonth;
        var newSellBtn = sellBtn.cloneNode(true);
        sellBtn.parentNode.replaceChild(newSellBtn, sellBtn);
        var currentAxolotlId = axolotlId;
        newSellBtn.onclick = function() {
          if (this.disabled) return;
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
      logLine(t('ui.alreadySold'));
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
      return tank.axolotl && (tank.note === '1ヶ月目のウパ' || tank.note === t('game.note.oneMonth')) && tank.axolotl.name;
    });
    if (hatchTank) {
      hatchTank.note = t('game.note.oneMonth');
      if (window._namingMode) window._namingMode = null;
    }
    
    var shopTank = state.tanks.find(function(tank) {
      return tank.axolotl && (tank.note === 'ショップで購入したウパ' || tank.note === 'ミューテーションショップで購入したウパ') && tank.axolotl.name;
    });
    if (shopTank) {
      shopTank.note = shopTank.note === 'ショップで購入したウパ' ? 'ショップで購入したウパ' : 'ミューテーションショップで購入したウパ';
      if (window._namingMode) window._namingMode = null;
    }
    
    // 最初のウパに名前がつけられたかチェック（locale非依存：noteは保存時の言語で保存される）
    var initialTank = state.tanks.find(function(tank) {
      return tank.axolotl && (tank.note === t('ui.firstAxo') || tank.note === '最初のウパ' || tank.note === 'First axolotl');
    });
    if (initialTank && initialTank.axolotl && initialTank.axolotl.name) {
      // まだメッセージが表示されていない場合のみ表示
      if (!state.initialNamingMessageShown) {
        state.initialNamingMessageShown = true;
        var axName = initialTank.axolotl.name;
        var displayNameStr = nameForDisplay(initialTank.axolotl, getLocale());
        // 店名を更新
        state.shopName = t('ui.shopNameWithAx', { name: displayNameStr });
        // 最初のウパのnoteを更新（名前がついたので通常の個体として扱う）
        initialTank.note = '親ウパ';
        setTimeout(function() {
          logLine(t('ui.namingSuccess', { name: displayNameStr }));
        }, 300);
      }
    }
    // 名付けモードをクリア
    if (window._namingMode) window._namingMode = null;
    $('axOverlayDetail').classList.remove('visible');
    if (window._detailFromHatch) {
      window._detailFromHatch = null;
      $('axOverlayHatch').classList.add('visible');
    }
    // モーダルを閉じた後にupdateUI()を呼ぶ（アニメーションを維持するため、少し遅延させる）
    setTimeout(function() {
      updateUI();
      saveGame();
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
      overlay.innerHTML = '<div class="ax-overlay-box"><h2>' + t('ui.selectHatchTitle') + '</h2><p style="font-size:12px; margin-bottom:8px;">' + t('ui.selectHatchDesc') + '</p><div id="axHatchList" style="margin-bottom:12px; max-height:60vh; overflow-y:auto;"></div><div style="display:flex; gap:8px; margin-top:8px;"><button type="button" class="btn" id="axHatchSellAll" style="background:#dc2626; border-color:#dc2626;">' + t('ui.hatchSellAll') + '</button><button type="button" class="btn" id="axHatchRandom" style="background:#16a34a; border-color:#16a34a;">' + t('ui.hatchRandom') + '</button></div></div>';
      document.body.appendChild(overlay);
      list = $('axHatchList');
      $('axHatchSellAll').addEventListener('click', function() { var ctx = window._hatchContext; if (ctx && ctx.tank) sellAllHatchByTank(ctx.tank, ctx.candidates, ctx.remainingJuveniles); });
      $('axHatchRandom').addEventListener('click', function() { var ctx = window._hatchContext; if (ctx && ctx.tank && ctx.candidates && ctx.candidates.length > 0) { var idx = Math.floor(Math.random() * ctx.candidates.length); selectHatchCandidateByTank(ctx.tank, idx, ctx.candidates, ctx.remainingJuveniles); } });
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
      
      var sprite = (candidate.type === 'chimera' && candidate.chimeraTypes && candidate.chimeraTypes.length >= 2)
        ? createChimeraCanvasSprite(candidate, 64)
        : createPixelArtCanvasSprite(candidate, 64);
      header.appendChild(sprite);
      
      var info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = '<div style="font-weight:bold; font-size:16px; margin-bottom:4px;">' + typeLabel(candidate.type) + '</div><div style="font-size:12px; color:#64748b;">' + t('ui.healthLabel') + candidate.health + ' / ' + t('ui.hungerLabel') + candidate.hunger + '</div>';
      header.appendChild(info);
      div.appendChild(header);
      
      var btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '8px';
      
      var detailBtn = document.createElement('button');
      detailBtn.type = 'button';
      detailBtn.className = 'ax-btn detail';
      detailBtn.textContent = t('ui.detail');
      detailBtn.style.flex = '1';
      detailBtn.style.minHeight = '44px';
      detailBtn.dataset.axolotlId = String(candidate.id);
      detailBtn.addEventListener('click', function() {
        var axId = parseInt(this.dataset.axolotlId, 10);
        $('axOverlayHatch').classList.remove('visible');
        window._detailFromHatch = true;
        openDetailModal(axId, { fromHatch: true });
      });
      btnRow.appendChild(detailBtn);
      
      var selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'ax-btn breed';
      selectBtn.textContent = t('ui.selectThisOne');
      selectBtn.style.flex = '1';
      selectBtn.style.minHeight = '44px';
      selectBtn.dataset.candidateIndex = String(idx);
      selectBtn.addEventListener('click', function() {
        selectHatchCandidateByTank(tank, parseInt(this.dataset.candidateIndex, 10), candidates, remainingJuveniles);
      });
      btnRow.appendChild(selectBtn);
      
      div.appendChild(btnRow);
      list.appendChild(div);
    });
    
    // 一時的に候補と残りを保存（tank参照を保存→reorderTanks後も正しい水槽に配置するため）
    tank._hatchCandidates = candidates;
    tank._hatchRemaining = remainingJuveniles;
    window._hatchContext = { tank: tank, tankIdx: tankIdx, candidates: candidates, remainingJuveniles: remainingJuveniles || [] };
    
    $('axOverlayHatch').classList.add('visible');
  }

  function sellAllHatchByTank(tank, candidates, remainingJuveniles) {
    if (!tank) return;
    var toSell = (candidates || []).concat(remainingJuveniles || []);
    var totalPrice = 0;
    toSell.forEach(function(j) {
      var price = calcPrice(j);
      totalPrice += price;
      if (axolotlRegistry[j.id]) axolotlRegistry[j.id].removed = true;
    });
    state.money += totalPrice;
    tank.axolotl = null;
    tank.juveniles = null;
    tank.juvenileAge = null;
    tank._hatchCandidates = null;
    tank._hatchRemaining = null;
    tank.note = t('game.note.empty');
    logLine(t('game.hatchSoldAll', { count: toSell.length, price: formatMoney(totalPrice) }));
    $('axOverlayHatch').classList.remove('visible');
    window._hatchContext = null;
    if (state.settings && state.settings.autoReorderTanks) reorderTanks();
    updateUI();
    saveGame();
  }

  function selectHatchCandidate(tankIdx, candidateIndex, candidates, remainingJuveniles) {
    selectHatchCandidateByTank(state.tanks[tankIdx], candidateIndex, candidates, remainingJuveniles);
  }

  function selectHatchCandidateByTank(tank, candidateIndex, candidates, remainingJuveniles) {
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
    tank.egg = false;
    tank.eggCount = null;
    tank.eggParentTypes = null;
    tank.eggParentIds = null;
    tank.eggParentShades = null;
    tank.eggRelationshipMeter = null;
    tank.hatchMonthsLeft = null;
    tank.baby = true;
    tank.note = t('game.note.oneMonth');
    selected.welcomedAtMonth = state.month;
    
    // 一時データをクリア
    tank._hatchCandidates = null;
    tank._hatchRemaining = null;
    window._hatchContext = null;
    
    logLine(t('game.hatchSelected', { type: typeLabel(selected.type), count: toSell.length, price: formatMoney(totalPrice) }));
    $('axOverlayHatch').classList.remove('visible');
    
    if (state.settings && state.settings.autoReorderTanks) reorderTanks();
    
    // 名付けフェーズを表示
    openNamingModal(selected.id, true);
    
    updateUI();
    saveGame();
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
      div.innerHTML = '<div style="font-weight:bold; margin-bottom:4px;">' + typeLabel(type) + ' ' + t('ui.juvenileCountShort', { count: juveniles.length }) + '</div>';
      
      var sellAllBtn = document.createElement('button');
      sellAllBtn.type = 'button';
      sellAllBtn.className = 'ax-btn sell';
      sellAllBtn.style.marginRight = '4px';
      sellAllBtn.textContent = t('ui.sellAll', { count: juveniles.length });
      sellAllBtn.addEventListener('click', function () {
        sellJuveniles(tankIdx, type, 'all');
      });
      div.appendChild(sellAllBtn);
      
      var selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'ax-btn breed';
      selectBtn.textContent = t('ui.selectOne');
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
      tank.note = t('game.note.empty');
    } else {
      tank.note = t('game.note.juvenileCount', { count: tank.juveniles.length, age: tank.juvenileAge || 0 });
    }
    
    logLine(t('game.juvenileSold', { type: typeLabel(type), count: toSell.length, price: formatMoney(totalPrice) }));
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
      var selectedName = nameForDisplay(selected, getLocale());
      var otherCount = tank.juveniles.length - 1;
      var otherPrice = 0;
      tank.juveniles.forEach(function(j) {
        if (j.id !== selected.id) {
          otherPrice += calcPrice(j);
        }
      });
      
      var confirmMsg = t('game.hatchConfirmTitle') + '\n\n';
      confirmMsg += t('game.hatchConfirmKeep', { name: selectedName }) + '\n';
      confirmMsg += t('game.hatchConfirmSell', { count: otherCount, price: formatMoney(otherPrice) });
      
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
        selected.welcomedAtMonth = state.month;
        
        logLine(t('game.juvenileSelected', { name: selectedName, count: otherCount, price: formatMoney(otherPrice) }));
        $('axOverlayJuvenile').classList.remove('visible');
        updateUI();
      }
      return;
    }
    
    var selected = available[Math.floor(Math.random() * available.length)];
    emptyTank.axolotl = selected;
    emptyTank.baby = selected.age < 12;
    emptyTank.note = '選んだ幼生';
    selected.welcomedAtMonth = state.month;
    
    tank.juveniles = tank.juveniles.filter(function (j) { return j.id !== selected.id; });
    
    if (tank.juveniles.length === 0) {
      tank.juveniles = null;
      tank.juvenileAge = null;
      tank.note = t('game.note.empty');
    } else {
      tank.note = t('game.note.juvenileCount', { count: tank.juveniles.length, age: tank.juvenileAge || 0 });
    }
    
    logLine(t('game.juvenileMoved', { type: typeLabel(type) }));
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
      nameEl.title = t('ui.clickToRename');
      nameEl.dataset.tankIndex = String(idx);
      nameEl.addEventListener('click', function() {
        var newName = prompt(t('ui.tankNamePrompt'), tank.customName || t('ui.tankSimple', { n: idx + 1 }));
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
        tag.textContent = t('ui.cohabiting');
        tag.classList.add('ax-tag-breeding');
      } else if (tank.egg) {
        tag.textContent = t('ui.egg');
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        tag.textContent = t('ui.juvenile');
        tag.classList.add('ax-tag-juvenile');
      } else if (tank.axolotl) {
        if (tank.axolotl.age >= 12) {
          tag.textContent = t('ui.adult');
          tag.classList.add('ax-tag-adult');
        } else {
          tag.textContent = t('ui.young');
          tag.classList.add('ax-tag-juvenile');
        }
      } else {
        tag.textContent = t('ui.empty');
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
        if (avgAge >= 60) ageNote = '<div style="color:#dc2626; font-size:11px; margin-top:4px;">' + t('ui.ageNoteLowFertility') + '</div>';
        else if (avgAge >= 48) ageNote = '<div style="color:#f97316; font-size:11px; margin-top:4px;">' + t('ui.ageNoteLowerFertility') + '</div>';
        else if (avgAge >= 36) ageNote = '<div style="color:#eab308; font-size:11px; margin-top:4px;">' + t('ui.ageNoteSlightAge') + '</div>';
        
        var p1NamePart = nameForDisplay(p1, getLocale());
        var p2NamePart = nameForDisplay(p2, getLocale());
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
          '<div style="font-size:11px; color:#64748b; margin-bottom:4px;">' + t('ui.ageFormat', { n: p1.age }) + '</div>' +
          '</div>' +
          '<div class="ax-breeding-pair-item" style="flex:1; text-align:center; padding-left:8px; cursor:pointer;" data-axolotl-id="' + p2.id + '">' +
          '<div style="font-weight:bold; margin-bottom:4px;">' + p2Name + (p2Sex ? ' ' + p2Sex : '') + '</div>' +
          '<div style="font-size:11px; color:#64748b; margin-bottom:4px;">' + t('ui.ageFormat', { n: p2.age }) + '</div>' +
          '</div>' +
          '</div>' +
          '<div class="ax-tank-status-bars" style="margin-bottom:8px;">' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">' + t('ui.waterQuality') + '</div><div class="ax-bar"><div class="ax-bar-fill clean" style="width:' + Math.round(tankClean) + '%;"></div></div></div>' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">' + t('ui.hunger') + '</div><div class="ax-bar"><div class="ax-bar-fill food" style="width:' + Math.round(avgHunger) + '%;"></div></div></div>' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">' + t('ui.health') + '</div><div class="ax-bar"><div class="ax-bar-fill" style="width:' + Math.round(avgHealth) + '%;background:' + getHealthBarColor(avgHealth) + ';"></div></div></div>' +
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
        lines.textContent = t('ui.eggDisplayInTank', { count: tank.eggCount || 500, months: tank.hatchMonthsLeft != null ? tank.hatchMonthsLeft : 1 });
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        lines.textContent = t('ui.juvenileCountFormat', { count: tank.juveniles.length }) + '\n' + t('ui.juvenileAgeFormat', { age: tank.juvenileAge || 0 });
        lines.classList.add('clickable');
        lines.addEventListener('click', function () {
          openJuvenileSelectionModal(idx);
        });
      } else if (tank.axolotl) {
        var ax = tank.axolotl;
        var sexDisplay = getSexDisplay(ax);
        var namePart = nameForDisplay(ax, getLocale());
        var displayName = (ax.familyName ? ax.familyName + ' ' : '') + namePart;
        var tankClean = tank.clean !== undefined ? tank.clean : 80;
        lines.innerHTML =
          '<div style="font-weight:bold; margin-bottom:4px;">' + displayName + (sexDisplay ? ' ' + sexDisplay : '') + '</div>' +
          '<div style="font-size:11px; color:#64748b; margin-bottom:8px;">' + t('ui.sizeLabel') + formatSize(ax.size) + ' / ' + t('ui.ageFormat', { n: ax.age }) + '</div>' +
          '<div class="ax-tank-status-bars">' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">' + t('ui.waterQuality') + '</div><div class="ax-bar"><div class="ax-bar-fill clean" style="width:' + Math.round(tankClean) + '%;"></div></div></div>' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">' + t('ui.hunger') + '</div><div class="ax-bar"><div class="ax-bar-fill food" style="width:' + Math.round(ax.hunger || 100) + '%;"></div></div></div>' +
          '<div class="ax-tank-status-bar"><div class="ax-tank-status-label">' + t('ui.health') + '</div><div class="ax-bar"><div class="ax-bar-fill" style="width:' + Math.round(ax.health || 100) + '%;background:' + getHealthBarColor(ax.health) + ';"></div></div></div>' +
          '</div>' +
          '<div style="margin-top:8px;">' + (ax.injured ? '<span style="color:#f97316; font-size:11px;">' + t('ui.injured') + '</span> ' : '') + (ax.sick ? '<span style="color:#dc2626; font-weight:bold; background:#fee2e2; padding:2px 6px; border-radius:4px; font-size:11px;">' + t('ui.sick') + '</span> ' : '') + (ax.underTreatment ? '<span style="color:#3b82f6; font-size:11px;">' + t('ui.underTreatment') + '</span>' : '') + '</div>';
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
          poopEl.src = './assets/items/unko_32.png';
          poopEl.style.width = '16px';
          poopEl.style.height = '16px';
          poopEl.style.position = 'absolute';
          poopEl.style.bottom = '20px';
          poopEl.style.right = '4px';
          poopEl.style.cursor = 'pointer';
          poopEl.style.zIndex = '10';
          poopEl.style.imageRendering = 'pixelated';
          poopEl.title = t('ui.clickToCleanPoop');
          poopEl.dataset.tankIndex = String(idx);
          poopEl.addEventListener('click', function(e) {
            e.stopPropagation();
            removePoop(parseInt(this.dataset.tankIndex, 10), this);
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
        juvenileEl.textContent = '🐟 ' + t('ui.juvenileCountShort', { count: tank.juveniles.length });
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
          poopEl.src = './assets/items/unko_32.png';
          poopEl.style.width = '16px';
          poopEl.style.height = '16px';
          poopEl.style.position = 'absolute';
          poopEl.style.bottom = '20px';
          poopEl.style.right = '4px';
          poopEl.style.cursor = 'pointer';
          poopEl.style.zIndex = '10';
          poopEl.style.imageRendering = 'pixelated';
          poopEl.title = t('ui.clickToCleanPoop');
          poopEl.dataset.tankIndex = String(idx);
          poopEl.addEventListener('click', function(e) {
            e.stopPropagation();
            removePoop(parseInt(this.dataset.tankIndex, 10), this);
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
        cleanBtn.innerHTML = t('ui.waterChange') + '<br><span style="font-size:10px; opacity:0.8;">' + formatMoney(waterChangeCost) + '</span>';
        cleanBtn.dataset.tankIndex = String(idx);
        cleanBtn.addEventListener('click', function () {
          doCleanTank(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(cleanBtn);
        
        // 給餌ボタン
        var feedBtn = document.createElement('button');
        feedBtn.type = 'button';
        feedBtn.className = 'ax-tank-action-btn feed';
        var feedCost = getFoodTier().cost;
        feedBtn.innerHTML = t('ui.feed') + '<br><span style="font-size:10px; opacity:0.8;">' + formatMoney(feedCost) + '</span>';
        feedBtn.dataset.tankIndex = String(idx);
        feedBtn.addEventListener('click', function () {
          openTankFeedModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(feedBtn);
        
        // 詳細ボタン
        var detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'ax-tank-action-btn detail';
        detailBtn.textContent = t('ui.detail');
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
        cleanBtn.innerHTML = t('ui.waterChange') + '<br><span style="font-size:10px; opacity:0.8;">' + formatMoney(waterChangeCost) + '</span>';
        cleanBtn.dataset.tankIndex = String(idx);
        cleanBtn.addEventListener('click', function () {
          doCleanTank(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(cleanBtn);
        
        // 給餌ボタン
        var feedBtn = document.createElement('button');
        feedBtn.type = 'button';
        feedBtn.className = 'ax-tank-action-btn feed';
        var feedCost = getFoodTier().cost;
        feedBtn.innerHTML = t('ui.feed') + '<br><span style="font-size:10px; opacity:0.8;">' + formatMoney(feedCost) + '</span>';
        feedBtn.dataset.tankIndex = String(idx);
        feedBtn.addEventListener('click', function () {
          openTankFeedModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(feedBtn);
        
        // 詳細ボタン（最初の個体を表示）
        var detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'ax-tank-action-btn detail';
        detailBtn.textContent = t('ui.detail');
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
        sellEggBtn.textContent = t('ui.sellEgg') + ' ' + formatMoney(eggPrice);
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
        sellJuvenileBtn.textContent = t('ui.selectOrSell');
        sellJuvenileBtn.dataset.tankIndex = String(idx);
        sellJuvenileBtn.addEventListener('click', function () {
          openJuvenileSelectionModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(sellJuvenileBtn);
      } else {
        foot.innerHTML = '<div style="text-align:center; color:#94a3b8; font-size:12px; padding:8px;">' + (tank.note ? noteDisplayLabel(tank) : t('ui.emptyTankHint')) + '</div>';
      }
      div.appendChild(foot);

      root.appendChild(div);
    });
  }

  function updateUI() {
    var seasonM = getSeasonMonth();
    var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var monthNamesJa = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    var monthStr = (getLocale() === 'ja' ? monthNamesJa : monthNames)[seasonM - 1];
    var axDayEl = $('axDay');
    axDayEl.textContent = t('ui.monthLabel', { n: state.month }) + ' (' + monthStr + ')';
    axDayEl.style.color = isBreedingSeason() ? '#dc2626' : '';
    $('axMoney').textContent = formatMoney(state.money);
    $('axRepBar').style.width = clamp(state.reputation, 0, MAX_REP) / MAX_REP * 100 + '%';
    
    // ショップ名を更新
    var shopTitleEl = document.getElementById('axShopTitle');
    if (shopTitleEl) {
      var titleValue = state.shopName || t('game.defaultShopName');
      shopTitleEl.textContent = titleValue;
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
      var males = adults.filter(function (x) { return x.tank.axolotl && x.tank.axolotl.sex === 'オス'; });
      var females = adults.filter(function (x) { return x.tank.axolotl && x.tank.axolotl.sex === 'メス'; });
      var canBreed = !disabled && adults.length >= 2 && males.length > 0 && females.length > 0;
      btnBreed.disabled = !canBreed;
    }
    if (btnTreat) {
      btnTreat.disabled = disabled;
      var treatSub = btnTreat.querySelector('.ax-menu-sub');
      if (treatSub) treatSub.textContent = formatMoney(getTreatmentCost());
    }
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
      alerts.push({ text: t('game.alertWaterLow'), count: lowCleanTanks.length });
    }
    
    // うんこがある水槽をチェック
    var poopTanks = state.tanks.filter(function(t) {
      return t.poop === true;
    });
    if (poopTanks.length > 0) {
      alerts.push({ text: t('game.alertPoop'), count: poopTanks.length });
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
      alerts.push({ text: t('game.alertSick'), count: sickAxolotls.length });
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
        logLine(t('game.achievementUnlocked', { name: achievementName(ach.id), desc: achievementDesc(ach.id) }));
        var titleEl = document.getElementById('axGoalTitle');
        var msgEl = document.getElementById('axGoalMessage');
        if (titleEl) titleEl.textContent = t('ui.goalTitle');
        if (msgEl) msgEl.textContent = achievementName(ach.id) + '\n\n' + achievementDesc(ach.id) + '\n\n' + t('game.goalPrompt');
        var quitBtn = document.getElementById('axGoalQuit');
        if (quitBtn) quitBtn.style.display = 'none';
        var overlay = document.getElementById('axOverlayGoal');
        if (overlay) overlay.classList.add('visible');
        return;
      }
    }
  }

  function logLine(text) {
    var log = $('axLog');
    var prefix = t('ui.logMonthPrefix', { n: state.month });
    var line = prefix + ' ' + text;
    var wrap = document.createElement('div');
    wrap.className = 'ax-log-line';
    wrap.style.whiteSpace = 'pre-line';
    wrap.textContent = line;
    log.insertBefore(wrap, log.firstChild);
  }

  function checkEnd() {
    if (state.ended) return;
    // ゴール実績は checkGoalAchievements() で評判100含め「ゴール達成」表示に統一
  }

  function getSeasonMonth() {
    return ((state.month - 1) % 12) + 1; // 1=1月, 12=12月
  }
  function isBreedingSeason() {
    var m = getSeasonMonth();
    return m === 12 || m >= 1 && m <= 5; // 12月〜5月が産卵シーズン
  }

  function tryBreeding(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.breedingPair) return false;
    if (!isBreedingSeason()) return false;
    
    var pair = tank.breedingPair;
    var relationshipMeter = tank.relationshipMeter || 50; // 0-100
    var inbreedingCoeff = calculateInbreedingCoefficient(pair[0].id, pair[1].id);
    
    // シーズンごとの産卵回数制限（0-4回、相性と年齢による）
    if (tank.breedingAttemptsThisSeason === undefined) tank.breedingAttemptsThisSeason = 0;
    var avgAgeMonths = (pair[0].age + pair[1].age) / 2;
    var avgAgeYears = avgAgeMonths / 12;
    var maxAttempts = 0;
    if (avgAgeYears >= 1 && avgAgeYears <= 4) {
      maxAttempts = Math.floor(1 + (relationshipMeter / 50) * 2 + (4 - Math.abs(avgAgeYears - 2.5)) * 0.3);
      maxAttempts = clamp(maxAttempts, 1, 4);
    } else if (avgAgeYears > 4) {
      maxAttempts = relationshipMeter >= 80 ? 1 : 0;
    }
    if (tank.breedingAttemptsThisSeason >= maxAttempts) return false;
    
    // 加齢による繁殖能力の低下（1-4歳が最盛期、4歳以降は劇的に低下）
    var agePenalty = 0;
    if (avgAgeMonths >= 60) agePenalty = 0.7; // 5歳以上で70%減
    else if (avgAgeMonths >= 48) agePenalty = 0.5; // 4歳以上で50%減
    else if (avgAgeMonths >= 36) agePenalty = 0.2; // 3歳以上で20%減
    
    // 関係メーターに基づいて成功率を調整
    var baseSuccessRate = 0.5;
    var relationshipBonus = (relationshipMeter - 50) / 200;
    var successRate = clamp(baseSuccessRate + relationshipBonus - agePenalty, 0.05, 0.95);
    
    // 近親交配度が高いと成功率が下がる
    var inbreedingPenalty = inbreedingCoeff / 200; // 最大-0.5
    successRate = clamp(successRate - inbreedingPenalty, 0.05, 0.95);
    
    var success = Math.random() < successRate;
    
    if (success) {
      // 卵の数を決定（平均200-600個、関係値で1000まで変動）
      var baseEggCount = randInt(200, 600);
      var relationshipMultiplier = 0.7 + (relationshipMeter / 100) * 0.6; // 0.7倍～1.3倍
      var eggCount = Math.floor(baseEggCount * relationshipMultiplier);
      
      // 近親交配度が高いと卵の数が減る
      eggCount = Math.floor(eggCount * (1 - inbreedingCoeff / 200)); // 最大50%減
      eggCount = Math.min(Math.max(100, eggCount), 1000); // 100〜1000個
      
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
        eggTank.hatchMonthsLeft = 1; // 1=今月表示→翌月孵化（1回目の月送りで孵化）
        eggTank.note = t('game.note.eggCount', { count: eggCount });
        state.reputation = clamp(state.reputation + 3, 0, MAX_REP);
        
        // 実績チェック
        if (!state.achievements.breed_success) {
          state.achievements.breed_success = true;
          logLine(t('game.breedSuccessAchievement'));
        }
        
        logLine(t('game.eggsLaid', { n: emptySlots[0] + 1, count: eggCount }));
        tank.breedingAttemptsThisSeason = (tank.breedingAttemptsThisSeason || 0) + 1;
        return true;
      } else {
        // 空き水槽がない場合は卵を売却
        var eggPrice = Math.floor(eggCount * 50);
        state.money += eggPrice;
        logLine(t('game.eggsSoldNoSpace', { count: eggCount, price: formatMoney(eggPrice) }));
        tank.breedingAttemptsThisSeason = (tank.breedingAttemptsThisSeason || 0) + 1;
        return true;
      }
    }
    
    return false;
  }

  function countOccupiedTanks() {
    return state.tanks.filter(function (t) { return t.axolotl || t.breedingPair; }).length;
  }

  // Poop clean reward: vacuum level sets min (Copper 1000+, Silver 5000+, Gold 10000+). Rare/large individuals can reach 2万+.
  var POOP_CLEAN_BASE_BY_VACUUM = [30, 2500, 7500, 10000];  // Lv0 Black, Lv1 Copper, Lv2 Silver, Lv3 Gold
  var POOP_CLEAN_FILTER_MULT = [1, 1.2, 1.4];     // Sponge, Top, Canister
  function calcPoopCleanReward(tank) {
    var vacuumLv = Math.max(0, (state.equipment && state.equipment.bottomCleanerLevel != null) ? state.equipment.bottomCleanerLevel : -1);
    var filterLv = Math.max(0, (state.equipment && state.equipment.filterLevel != null) ? state.equipment.filterLevel : -1);
    var filterMult = POOP_CLEAN_FILTER_MULT[Math.min(filterLv, 2)] || 1;
    var maxSize = 0;
    if (tank.axolotl && tank.axolotl.size != null) maxSize = Math.max(maxSize, tank.axolotl.size);
    if (tank.breedingPair) {
      tank.breedingPair.forEach(function(ax) {
        if (ax && ax.size != null) maxSize = Math.max(maxSize, ax.size);
      });
    }
    if (tank.juveniles && tank.juveniles.length) {
      tank.juveniles.forEach(function(j) {
        if (j && j.size != null) maxSize = Math.max(maxSize, j.size);
      });
    }
    var sizeMult = maxSize > 0 ? 0.5 + (maxSize / 25) * 1 : 0.5;  // 0.5~1.5: レアな大型個体で2万超え
    var base = POOP_CLEAN_BASE_BY_VACUUM[Math.min(vacuumLv, 3)] || 30;
    var money = Math.floor(base * filterMult * sizeMult);
    var seed = (maxSize * 100 | 0) + (tank.axolotl ? (tank.axolotl.id || 0) : 0) + (tank.breedingPair ? tank.breedingPair.length * 17 : 0);
    var variance = 1 + (seed % 397);
    money += variance;
    if (vacuumLv >= 1) {
      if (vacuumLv === 1) money = Math.max(1001, Math.min(4998, money));
      else if (vacuumLv === 2) money = Math.max(5001, Math.min(9998, money));
      else if (vacuumLv === 3) money = Math.max(10001, money);
    }
    var iconPath = getPoopRewardIcon(money, vacuumLv);
    return { money: money, iconPath: iconPath, vacuumLv: vacuumLv };
  }

  // vacuumLv: 0=Black, 1=Copper, 2=Silver, 3=Gold (bottom cleaner level)
  function getPoopRewardIcon(money, vacuumLv) {
    if (vacuumLv >= 3 && money >= 10000) return './assets/ores/gold_ingot.png';   // Gold vacuum (Lv3): 10000+
    if (vacuumLv >= 2 && money >= 5000 && money < 10000) return './assets/ores/silver_ingot.png';  // Silver vacuum (Lv2): 5000-9999
    if (vacuumLv >= 1 && money >= 1000 && money < 5000) return './assets/ores/copper_ingot.png';   // Copper vacuum (Lv1): 1000-4999
    if (money >= 500) return './assets/money/500yen.png';
    if (money >= 100) return './assets/money/100yen.png';
    if (money >= 10) return './assets/money/10yen.png';
    return './assets/money/1yen.png';
  }

  function showPoopRewardAnimation(money, iconPath, anchorEl) {
    if (!anchorEl) return;
    var rect = anchorEl.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top;
    var rewardEl = document.createElement('div');
    rewardEl.className = 'ax-poop-reward-anim';
    rewardEl.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-100%);z-index:100;display:flex;align-items:center;gap:4px;padding:4px 8px;background:rgba(0,0,0,0.7);border-radius:6px;color:#22c55e;font-weight:bold;font-size:14px;pointer-events:none;animation:ax-poop-reward-float 1.8s ease-out forwards;';
    var img = document.createElement('img');
    img.src = iconPath;
    img.alt = '';
    img.style.cssText = 'width:20px;height:20px;image-rendering:pixelated;';
    rewardEl.appendChild(img);
    rewardEl.appendChild(document.createTextNode('+' + money));
    document.body.appendChild(rewardEl);
    setTimeout(function() {
      if (rewardEl.parentNode) rewardEl.parentNode.removeChild(rewardEl);
    }, 1800);
  }

  var poopCleanAudio = null;
  function playPoopCleanSound() {
    try {
      if (!poopCleanAudio) {
        poopCleanAudio = new Audio('./assets/sound/damege/se_itemget_014.ogg');
        poopCleanAudio.volume = 0.6;
      }
      poopCleanAudio.currentTime = 0;
      poopCleanAudio.play().catch(function() {});
    } catch (e) {}
  }

  function logLineWithIcon(text, iconPath) {
    var log = $('axLog');
    var prefix = t('ui.logMonthPrefix', { n: state.month });
    var imgHtml = iconPath ? '<img src="' + iconPath + '" alt="" style="width:14px;height:14px;vertical-align:middle;image-rendering:pixelated;margin-right:2px;">' : '';
    var line = prefix + ' ' + imgHtml + text;
    var wrap = document.createElement('div');
    wrap.className = 'ax-log-line';
    wrap.style.whiteSpace = 'pre-line';
    wrap.innerHTML = line;
    log.insertBefore(wrap, log.firstChild);
  }

  function removePoop(tankIdx, anchorEl) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.poop) return;
    var reward = calcPoopCleanReward(tank);
    tank.poop = false;
    state.money += reward.money;
    playPoopCleanSound();
    showPoopRewardAnimation(reward.money, reward.iconPath, anchorEl);
    logLine(t('ui.cleanedPoop', { n: tankIdx + 1 }) + ' ' + formatMoney(reward.money));
    updateUI();
    saveGame();
  }

  function removeAllPoop(anchorEl) {
    var totalMoney = 0;
    var bestIconPath = null;
    var bestVacuumLv = -1;
    var cleanedCount = 0;
    state.tanks.forEach(function(tank) {
      if (tank.poop) {
        cleanedCount++;
        var reward = calcPoopCleanReward(tank);
        totalMoney += reward.money;
        if (reward.vacuumLv > bestVacuumLv) {
          bestVacuumLv = reward.vacuumLv;
          bestIconPath = reward.iconPath;
        }
        tank.poop = false;
      }
    });
    if (totalMoney > 0) {
      state.money += totalMoney;
      playPoopCleanSound();
      var iconPath = bestIconPath || getPoopRewardIcon(totalMoney, bestVacuumLv >= 0 ? bestVacuumLv : 0);
      showPoopRewardAnimation(totalMoney, iconPath, anchorEl);
      logLine(t('game.allPoopCleaned', { n: cleanedCount }) + ' ' + formatMoney(totalMoney));
      saveGame();
    } else {
      logLine(t('game.noPoopToClean'));
    }
    updateUI();
  }

  function checkMutationShop() {
    // ミューテーション: ごく稀に1匹だけ生体ショップに入荷（生体タブに統合表示）
    state.mutationShopItems = [];
    
    // 1%の確率で1匹のみ入荷
    if (Math.random() >= 0.01) return;
    
    (function addOneMutation() {
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
    })();
    
    state.mutationShopAvailable = true;
    state.mutationShopSeenThisPeriod = false;
    logLine(t('game.shopArrival'));
    
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
        return typeLabel(item.type) + (item.band === 7 ? '（' + t('game.sizeLabelAdult') + '）' : '（' + t('ui.threeMonthLabel') + '）');
      }).join('、');
      logLine(t('game.saleActive', { types: saleTypes }));
    }
  }

  function endOfMonthDrift() {
    // 12月（産卵シーズン開始）に繁殖回数カウントをリセット
    if (getSeasonMonth() === 12) {
      state.tanks.forEach(function(t) {
        if (t.breedingPair) t.breedingAttemptsThisSeason = 0;
      });
    }
    // マイグレーション: equipmentが無い場合は初期化
    if (!state.equipment) {
      state.equipment = { autoFeederLevel: -1, filterLevel: -1, bottomCleanerLevel: -1, tankLevel: 1 };
    }
    if (state.equipment.bottomCleanerLevel === undefined) {
      state.equipment.bottomCleanerLevel = -1;
    }
    if (state.equipment.tankLevel === undefined) {
      state.equipment.tankLevel = 2;  // 最初から3槽
    }
    
    var bcLevel = Math.max(0, (state.equipment && state.equipment.bottomCleanerLevel != null ? state.equipment.bottomCleanerLevel : -1));
    
    // 今月初めに卵があったタンク（今月産まれた卵は即孵化させない）
    var eggTanksAtStart = {};
    state.tanks.forEach(function(t, i) { if (t.egg) eggTanksAtStart[i] = true; });
    
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
        logLine(t('ui.pooped', { n: idx + 1 }));
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
          // 12ヶ月で幼名→成人名へ切り替え
          if (a.age >= 12 && a.isJuvenile) assignAdultNameAt12(a);
          
          // 繁殖ペアの病気処理
          if (a.sick) {
            if (a.underTreatment && Math.random() < getTreatmentRecoverChance(a.underTreatmentLevel)) {
              a.sick = false;
              a.underTreatment = false;
              logLine(t('game.recovered', { type: typeLabel(a.type) }));
            } else if (!a.underTreatment) {
              if (Math.random() < SICK_DEATH_CHANCE) {
                // 死んだウパの記録を保存
                var deadRecord = {
                  id: a.id,
                  type: a.type,
                  name: a.name || typeLabel(a.type),
                  age: a.age,
                  deathReason: t('game.deathSick'),
                  deathMonth: state.month,
                  chimeraTypes: a.chimeraTypes || null,
                  sex: a.sex || null
                };
                state.deadAxolotls.push(deadRecord);
                
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
                logLine(t('game.diedSick'));
                state.reputation = clamp(state.reputation - 10, 0, MAX_REP);
                return;
              }
              if (Math.random() < SICK_INJURY_CHANCE) {
                a.injured = true;
                logLine(t('game.injuredSick', { type: typeLabel(a.type) }));
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
          tank.note = t('game.note.empty');
          logLine(t('game.allJuvenilesDied'));
        } else if (tank.juvenileAge >= 5) {
          // 5ヶ月経過したら、1匹を選んで成体にする
          var remainingCount = tank.juveniles.length - 1;
          var selected = tank.juveniles[Math.floor(Math.random() * tank.juveniles.length)];
          tank.axolotl = selected;
          tank.juveniles = null;
          tank.juvenileAge = null;
          tank.baby = false;
          tank.note = '育ったウパ';
          logLine(t('game.juvenileGrew', { type: typeLabel(selected.type), count: remainingCount }));
        } else {
          tank.note = t('game.note.juvenileCount', { count: tank.juveniles.length, age: tank.juvenileAge });
        }
        return;
      }
      // 卵の処理は最後に実行（繁殖で空きを埋めた後に孵化→上書きを防ぐ）
      // 今月産まれた卵はスキップ（翌月からカウント開始）
      if (tank.egg) {
        if (!eggTanksAtStart[idx]) {
          return; // 今月産まれた卵→来月から処理
        }
        if (tank.hatchMonthsLeft === undefined || tank.hatchMonthsLeft === null) {
          tank.hatchMonthsLeft = 1;
        }
        tank.hatchMonthsLeft = tank.hatchMonthsLeft - 1;
        
        if (tank.hatchMonthsLeft <= 0) {
          var parentTypes = tank.eggParentTypes || ['nomal', 'nomal'];
          var parentIds = tank.eggParentIds || [null, null];
          var parentShades = tank.eggParentShades || ['normal', 'normal'];
          var eggCount = tank.eggCount || 500;
          var relationshipMeter = tank.eggRelationshipMeter || 50;
          
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
          
          var baseHatchRate = 0.9;
          var relationshipBonus = (relationshipMeter - 50) / 200;
          var avgHealth = (parent1Health + parent2Health) / 2;
          var healthBonus = (avgHealth - 70) / 300;
          var tankClean = tank.clean !== undefined ? tank.clean : 80;
          var cleanPenalty = (100 - tankClean) / 500;
          var inbreedingCoeff = calculateInbreedingCoefficient(parentIds[0], parentIds[1]);
          var inbreedingPenalty = inbreedingCoeff / 300;
          var hatchRate = clamp(baseHatchRate + relationshipBonus + healthBonus - cleanPenalty - inbreedingPenalty, 0.1, 0.95);
          var hatchCount = Math.floor(eggCount * hatchRate);
          
          var allJuveniles = [];
          for (var i = 0; i < Math.min(hatchCount, 100); i++) {
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
            state.obtainedTypes[juvenile.type] = true;
            checkForFixation(juvenile.id);
          }
          
          tank.egg = false;
          tank.eggCount = null;
          tank.eggParentTypes = null;
          tank.eggParentIds = null;
          tank.eggParentShades = null;
          tank.eggRelationshipMeter = null;
          tank.hatchMonthsLeft = null;
          
          var candidates = [];
          var selectableCount = Math.max(1, Math.floor(eggCount * 0.01));
          var maxCandidates = Math.min(selectableCount, allJuveniles.length);
          while (candidates.length < maxCandidates && allJuveniles.length > 0) {
            var randomIndex = Math.floor(Math.random() * allJuveniles.length);
            candidates.push(allJuveniles[randomIndex]);
            allJuveniles.splice(randomIndex, 1);
          }
          
          openHatchSelectionModal(idx, candidates, allJuveniles);
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
      } else if (W >= 50 && H >= 60) {
        baseChance = 0.03; // 3% - 普通
      } else if (W < 50 || H < 50) {
        baseChance = 0.08; // 8% - 悪化
      }
      if (W < 35 || H < 40) {
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
        logLine(t('game.gotSick', { name: nameForDisplay(ax, getLocale()), reason: inbreedingCoeff > 50 ? t('game.inbreedingReason') : '' }));
      }
      if (ax.sick) {
        if (ax.underTreatment && Math.random() < getTreatmentRecoverChance(ax.underTreatmentLevel)) {
          ax.sick = false;
          ax.underTreatment = false;
          logLine(t('game.recovered', { type: typeLabel(ax.type) }));
        } else if (!ax.underTreatment) {
          if (Math.random() < SICK_DEATH_CHANCE) {
            if (axolotlRegistry[ax.id]) {
              axolotlRegistry[ax.id].removed = true;
            }
            tank.axolotl = null;
            tank.note = '病気で★になってしまった…';
            logLine(t('game.diedSick'));
            state.reputation = clamp(state.reputation - 10, 0, MAX_REP);
            return;
          }
          if (Math.random() < SICK_INJURY_CHANCE) {
            ax.injured = true;
            logLine(t('game.injuredSick', { type: typeLabel(ax.type) }));
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
      // 12ヶ月で成体になる（幼名→成人名へ切り替え）
      if (ax.age >= 12) {
        if (ax.isJuvenile) assignAdultNameAt12(ax);
        if (tank.baby) {
          tank.baby = false;
          tank.note = '育ったウパ';
        }
      }
      
      // 寿命による死亡（60ヶ月以上で確率が上がる）
      var ageDeathChance = 0;
      if (ax.age >= 72) ageDeathChance = 0.15; // 72ヶ月以上で15%
      else if (ax.age >= 60) ageDeathChance = 0.08; // 60ヶ月以上で8%
      else if (ax.age >= 48) ageDeathChance = 0.03; // 48ヶ月以上で3%
      var filterTier = getFilterTier();
      if (filterTier && filterTier.ageDeathMult != null) {
        ageDeathChance *= filterTier.ageDeathMult; // 高ランクフィルタで寿命延長
      }
      
      // 急死の可能性（低確率）
      var suddenDeathChance = 0.005; // 0.5%
      
      if (Math.random() < ageDeathChance) {
        // 死んだウパの記録を保存
        var deadRecord = {
          id: ax.id,
          type: ax.type,
          name: ax.name || typeLabel(ax.type),
          age: ax.age,
          deathReason: t('game.deathAge'),
          deathMonth: state.month,
          chimeraTypes: ax.chimeraTypes || null,
          sex: ax.sex || null
        };
        state.deadAxolotls.push(deadRecord);
        
        if (axolotlRegistry[ax.id]) {
          axolotlRegistry[ax.id].removed = true;
        }
        tank.axolotl = null;
        tank.note = '寿命で★になってしまった…';
        logLine(t('game.diedAge', { type: typeLabel(ax.type), age: ax.age }));
        state.reputation = clamp(state.reputation - 5, 0, MAX_REP);
        return;
      }
      
      if (Math.random() < suddenDeathChance) {
        // 死んだウパの記録を保存
        var deadRecord = {
          id: ax.id,
          type: ax.type,
          name: ax.name || typeLabel(ax.type),
          age: ax.age,
          deathReason: t('game.deathSuddenReason'),
          deathMonth: state.month,
          chimeraTypes: ax.chimeraTypes || null,
          sex: ax.sex || null
        };
        state.deadAxolotls.push(deadRecord);
        
        if (axolotlRegistry[ax.id]) {
          axolotlRegistry[ax.id].removed = true;
        }
        tank.axolotl = null;
        tank.note = '急死で★になってしまった…';
        logLine(t('game.diedSudden', { type: typeLabel(ax.type) }));
        state.reputation = clamp(state.reputation - 8, 0, MAX_REP);
        return;
      }
      if (ax.health <= 0) {
        // 死んだウパの記録を保存
        var deadRecord = {
          id: ax.id,
          type: ax.type,
          name: ax.name || typeLabel(ax.type),
          age: ax.age,
          deathReason: t('game.deathNeglectReason'),
          deathMonth: state.month,
          chimeraTypes: ax.chimeraTypes || null,
          sex: ax.sex || null
        };
        state.deadAxolotls.push(deadRecord);
        
        if (axolotlRegistry[ax.id]) {
          axolotlRegistry[ax.id].removed = true;
        }
        tank.axolotl = null;
        tank.note = '体調を崩して★になってしまった…';
        logLine(t('game.diedNeglect'));
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
    // ミューテーションが売られている時だけ!表示。ショップを開いたら消す
    var menuToggle = document.getElementById('axMenuToggle');
    if (menuToggle) {
      var hasMutation = state.mutationShopAvailable && state.mutationShopItems && state.mutationShopItems.length > 0;
      var notSeen = !state.mutationShopSeenThisPeriod;
      if (hasMutation && notSeen) {
        menuToggle.classList.add('has-notification');
      } else {
        menuToggle.classList.remove('has-notification');
      }
    }
  }
  
  function nextMonth() {
    state.month += 1;
    applyAutoEquipment();
    checkMutationShop();
    endOfMonthDrift();
    // 設定が有効な場合、空の水槽を下に移動（孵化選択モーダル表示中はスキップ→選択後に正しい水槽に配置するため）
    if (state.settings && state.settings.autoReorderTanks && !window._hatchContext) {
      reorderTanks();
    }
    checkEnd();
    updateUI();
    updateMutationShopButton();
    saveGame();
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
    var feederTier = getAutoFeederTier();
    if (feederTier) {
      var fedCount = 0;
      var totalCost = 0;
      var thresh = feederTier.hungerThreshold;
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.hunger < thresh) {
          tank.axolotl.health = clamp(tank.axolotl.health + feederTier.health, 0, MAX_HEALTH);
          tank.axolotl.hunger = clamp((tank.axolotl.hunger || 80) + feederTier.hunger, 0, MAX_HUNGER);
          tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - feederTier.dirt, 0, MAX_CLEAN);
          fedCount++;
          totalCost += feederTier.costPerFeed;
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(ax) {
            if (ax.hunger < thresh) {
              ax.health = clamp(ax.health + feederTier.health, 0, MAX_HEALTH);
              ax.hunger = clamp((ax.hunger || 80) + feederTier.hunger, 0, MAX_HUNGER);
              fedCount++;
              totalCost += feederTier.costPerFeed;
            }
          });
          tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - feederTier.dirt, 0, MAX_CLEAN);
        }
      });
      if (fedCount > 0) {
        state.money -= totalCost;
        logLine(t('game.autoFeederFed', { count: fedCount, cost: formatMoney(totalCost) }));
      }
    }
    var filterTier = getFilterTier();
    if (filterTier) {
      state.tanks.forEach(function(tank) {
        if (tank.axolotl || tank.breedingPair || tank.juveniles || tank.egg) {
          tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) + filterTier.cleanBonus, 0, MAX_CLEAN);
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

  function actFeedAll() {
    var food = getFoodTier();
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
      logLine(t('game.noTanksToFeed'));
      updateUI();
      return;
    }
    var totalCost = food.cost * feedableTanks.length;
    if (state.money < totalCost) {
      logLine(t('game.notEnoughFeedCost', { feed: t(food.nameKey), cost: formatMoney(totalCost) }));
      updateUI();
      return;
    }
    state.money -= totalCost;
    feedableTanks.forEach(function(tank) {
      if (tank.axolotl) {
        tank.axolotl.health = clamp(tank.axolotl.health + food.health, 0, MAX_HEALTH);
        tank.axolotl.hunger = clamp((tank.axolotl.hunger || 80) + food.hunger, 0, MAX_HUNGER);
      }
      if (tank.breedingPair) {
        tank.breedingPair.forEach(function(ax) {
          ax.health = clamp(ax.health + food.health, 0, MAX_HEALTH);
          ax.hunger = clamp((ax.hunger || 80) + food.hunger, 0, MAX_HUNGER);
        });
      }
      tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) - food.dirt, 0, MAX_CLEAN);
    });
    logLine(t('game.fedAllFood', { feed: t(food.nameKey) }));
    updateUI();
  }

  function doFeedTank(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank) {
      updateUI();
      return;
    }
    if (!tank.axolotl && !tank.breedingPair) {
      logLine(t('game.noFeedTarget'));
      updateUI();
      return;
    }
    var canFeed = false;
    if (tank.axolotl && (tank.axolotl.hunger || 80) < MAX_HUNGER) canFeed = true;
    if (tank.breedingPair) {
      tank.breedingPair.forEach(function(ax) {
        if ((ax.hunger || 80) < MAX_HUNGER) canFeed = true;
      });
    }
    if (!canFeed) {
      logLine(t('game.hungerFull'));
      updateUI();
      return;
    }
    var food = getFoodTier();
    var cost = food.cost;
    var healthBonus = food.health;
    var hungerBonus = food.hunger;
    var cleanPenalty = food.dirt;
    var feedName = t(food.nameKey);
    
    if (state.money < cost) {
      logLine(t('game.notEnoughFeedCost', { feed: feedName, cost: formatMoney(cost) }));
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
    
    logLine(t('ui.fed', { n: tankIdx + 1, feed: feedName }));
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
    actFeedAll();
  }

  function openTankFeedModal(tankIdx) {
    doFeedTank(tankIdx);
  }

  function openWaterChangeSelectionModal(tankIdx, isGlobal) {
    var overlay = document.getElementById('axOverlayWaterChange');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ax-overlay';
      overlay.id = 'axOverlayWaterChange';
      overlay.innerHTML = '<div class="ax-overlay-box"><h2>' + t('ui.waterChangeSelectTitle') + '</h2><p style="font-size:12px; margin-bottom:8px;">' + t('ui.waterChangeSelectDesc') + '</p><div id="axWaterChangeOptions" style="margin-bottom:12px;"></div><button type="button" class="btn" style="background:#64748b; border-color:#64748b;" id="axWaterChangeCancel">' + t('ui.cancel') + '</button></div>';
      document.body.appendChild(overlay);
      document.getElementById('axWaterChangeCancel').addEventListener('click', function() {
        $('axOverlayWaterChange').classList.remove('visible');
      });
    }
    
    var options = document.getElementById('axWaterChangeOptions');
    options.innerHTML = '';
    
    var methods = [
      { name: t('ui.waterChangePartial'), cost: WATER_CHANGE_PARTIAL_COST, bonus: WATER_CHANGE_PARTIAL_BONUS },
      { name: t('ui.waterChangeNormal'), cost: WATER_CHANGE_NORMAL_COST, bonus: WATER_CHANGE_NORMAL_BONUS },
      { name: t('ui.waterChangeFull'), cost: WATER_CHANGE_FULL_COST, bonus: WATER_CHANGE_FULL_BONUS }
    ];
    
    methods.forEach(function(method) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ax-btn';
      btn.style.width = '100%';
      btn.style.marginBottom = '8px';
      btn.textContent = method.name + ' +' + method.bonus + ' / Ƀ ' + method.cost.toLocaleString('ja-JP');
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
        return t.axolotl || t.breedingPair || t.juveniles;
      });
      
      if (occupiedTanks.length === 0) {
        logLine(t('game.noWaterTarget'));
        if (overlay) overlay.classList.remove('visible');
        return;
      }
      
      var totalCost = cost * occupiedTanks.length;
      if (state.money < totalCost) {
        logLine(t('game.notEnoughWaterCost', { cost: formatMoney(totalCost) }));
        if (overlay) overlay.classList.remove('visible');
        return;
      }
      
      state.money -= totalCost;
      
      occupiedTanks.forEach(function(tank) {
        tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) + bonus, 0, MAX_CLEAN);
      });
      
      logLine(t('game.allWaterChanged'));
    } else {
      var tank = state.tanks[tankIdx];
      if (!tank) {
        if (overlay) overlay.classList.remove('visible');
        updateUI();
        return;
      }
      
      if (state.money < cost) {
        logLine(t('game.notEnoughWaterCost', { cost: formatMoney(cost) }));
        if (overlay) overlay.classList.remove('visible');
        updateUI();
        return;
      }
      
      state.money -= cost;
      tank.clean = clamp((tank.clean !== undefined ? tank.clean : 80) + bonus, 0, MAX_CLEAN);
      logLine(t('ui.waterChanged', { n: tankIdx + 1 }));
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
    tank.note = t('game.note.empty');
    tank.baby = false;
    state.reputation = clamp(state.reputation + 2, 0, MAX_REP);
    
    // 実績チェック
    if (!state.achievements.first_sale) {
      state.achievements.first_sale = true;
        logLine(t('game.firstSaleAchievement'));
    }
    
    logLine(t('game.soldAxolotl', { type: typeName, price: formatMoney(price) }));
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
    tank.note = t('game.note.empty');
    logLine(t('game.soldPair', { price: formatMoney(totalPrice) }));
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
        tank.note = t('game.note.empty');
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
    
    // 空き水槽が1つ以上あれば離別（1匹を空きへ、もう1匹は現水槽に残す）
    if (emptySlots.length >= 1) {
      state.tanks[emptySlots[0]].axolotl = pair[1];
      state.tanks[emptySlots[0]].baby = pair[1].age < 12;
      state.tanks[emptySlots[0]].note = '親ウパ';
      if (state.tanks[emptySlots[0]].clean === undefined) state.tanks[emptySlots[0]].clean = 80;
      if (state.tanks[emptySlots[0]].poop === undefined) state.tanks[emptySlots[0]].poop = false;
      tank.axolotl = pair[0];
      tank.baby = pair[0].age < 12;
      tank.breedingPair = null;
      tank.breedingMonthsLeft = null;
      tank.relationshipMeter = null;
      tank.note = '親ウパ';
      logLine(t('game.pairSeparated'));
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
      tank.note = t('game.note.empty');
      logLine(t('game.pairSoldNoSpace', { price: formatMoney(totalPrice) }));
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
    tank.note = t('game.note.empty');
    logLine(t('ui.eggsSold', { count: eggCount, price: formatMoney(eggPrice) }));
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
    var breedingPairs = state.tanks.filter(function(t) { return t.breedingPair && t.breedingPair.length === 2; });
    var emptyCount = state.tanks.filter(function(t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; }).length;
    var canSeparate = breedingPairs.length > 0 && emptyCount >= 1;
    if (adults.length < 2 && !canSeparate) {
      logLine(t('game.needTwoAdults'));
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
    var canBreed = males.length > 0 && females.length > 0;
    if (!canBreed && !canSeparate) {
      logLine(t('game.needMaleFemale'));
      return;
    }
    var sel1 = $('axBreedParent1');
    var sel2 = $('axBreedParent2');
    
    // 繁殖ペアの離別リスト（空き水槽が1つ以上あれば表示）
    var breedingPairsForSep = state.tanks.map(function(t, idx) { return { tank: t, idx: idx }; }).filter(function(x) { return x.tank.breedingPair && x.tank.breedingPair.length === 2; });
    var sepList = document.getElementById('axBreedSeparateList');
    if (sepList) {
      if (canSeparate) {
        sepList.style.display = 'block';
        sepList.innerHTML = '<div style="font-size:11px; font-weight:600; margin-bottom:6px; color:#64748b;">' + t('ui.currentBreedingPairs') + '</div>';
        breedingPairsForSep.forEach(function(x) {
          var pair = x.tank.breedingPair;
          var names = pair.map(function(ax) { return (ax.familyName ? ax.familyName + ' ' : '') + nameForDisplay(ax, getLocale()); }).join(' × ');
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn';
          btn.style.cssText = 'font-size:12px; padding:4px 8px; margin:2px 4px 2px 0;';
          btn.textContent = t('ui.tankSimple', { n: x.idx + 1 }) + ' ' + names + ' ' + t('ui.separatePair');
          btn.dataset.tankIdx = String(x.idx);
          btn.addEventListener('click', function() {
            separateBreedingPair(parseInt(this.dataset.tankIdx, 10));
            $('axOverlayBreed').classList.remove('visible');
            updateUI();
          });
          sepList.appendChild(btn);
        });
      } else {
        sepList.style.display = 'none';
        sepList.innerHTML = '';
      }
    }
    
    var breedFormEl = document.getElementById('axBreedForm');
    if (breedFormEl) breedFormEl.style.display = canBreed ? 'block' : 'none';
    
    // オス項目（繁殖可能な場合のみ）
    sel1.innerHTML = '';
    if (canBreed) {
      males.forEach(function (x) {
        var opt = document.createElement('option');
        var isBreedingPair = state.tanks[x.idx] && state.tanks[x.idx].breedingPair && state.tanks[x.idx].breedingPair.some(function(ax) { return ax.id === x.tank.axolotl.id; });
        opt.value = String(x.idx) + (isBreedingPair ? '_bp_' + x.tank.axolotl.id : '');
        var namePart = nameForDisplay(x.tank.axolotl, getLocale());
        var displayName = (x.tank.axolotl.familyName ? x.tank.axolotl.familyName + ' ' : '') + namePart;
        opt.textContent = t('ui.tankWithName', { n: x.idx + 1, name: displayName }) + (isBreedingPair ? ' (' + t('ui.cohabiting') + ')' : '');
        sel1.appendChild(opt);
      });
      females.forEach(function (x) {
        var opt = document.createElement('option');
        var isBreedingPair = state.tanks[x.idx] && state.tanks[x.idx].breedingPair && state.tanks[x.idx].breedingPair.some(function(ax) { return ax.id === x.tank.axolotl.id; });
        opt.value = String(x.idx) + (isBreedingPair ? '_bp_' + x.tank.axolotl.id : '');
        var namePart = nameForDisplay(x.tank.axolotl, getLocale());
        var displayName = (x.tank.axolotl.familyName ? x.tank.axolotl.familyName + ' ' : '') + namePart;
        opt.textContent = t('ui.tankWithName', { n: x.idx + 1, name: displayName }) + (isBreedingPair ? ' (' + t('ui.cohabiting') + ')' : '');
        sel2.appendChild(opt);
      });
      var last1 = state.lastBreedParent1;
      var last2 = state.lastBreedParent2;
      var validLast1 = males.some(function (x) { return x.idx === last1; });
      var validLast2 = females.some(function (x) { return x.idx === last2; });
      if (validLast1) sel1.value = String(last1);
      else if (males.length > 0) sel1.value = String(males[0].idx);
      if (validLast2) sel2.value = String(last2);
      else if (females.length > 0) sel2.value = String(females[0].idx);
    }
    
    $('axOverlayBreed').classList.add('visible');
  }

  function doBreed(parent1Idx, parent2Idx) {
    if (parent1Idx === parent2Idx) {
      logLine(t('game.selectDifferent'));
      return;
    }
    var t1 = state.tanks[parent1Idx];
    var t2 = state.tanks[parent2Idx];
    if (!t1 || !t2 || !t1.axolotl || !t2.axolotl) {
      logLine(t('game.conditionsNotMet'));
      return;
    }
    if (t1.axolotl.sex === t2.axolotl.sex) {
      logLine(t('game.selectMaleFemale'));
      return;
    }
    if (t1.axolotl.age < 12 || t1.axolotl.health < 50 || t2.axolotl.age < 12 || t2.axolotl.health < 50) {
      logLine(t('game.selectHealthyAdults'));
      return;
    }
    state.lastBreedParent1 = parent1Idx;
    state.lastBreedParent2 = parent2Idx;
    var ax1 = t1.axolotl;
    var ax2 = t2.axolotl;
    // 空き水槽がなくても、2匹のうちどちらかの水槽にペアを収容できる
    var targetIdx = parent1Idx; // デフォルトで親1の水槽を使用
    t1.axolotl = null;
    t1.note = t('game.note.empty');
    t2.axolotl = null;
    t2.note = t('game.note.empty');
    var breedingTank = state.tanks[targetIdx];
    breedingTank.breedingPair = [ax1, ax2];
    breedingTank.relationshipMeter = 50; // 初期関係メーター
    breedingTank.breedingAttemptsThisSeason = 0;
    breedingTank.note = '同棲中（関係50）';
    logLine(t('ui.breedingStarted', { n: targetIdx + 1, t1: typeLabel(ax1.type), t2: typeLabel(ax2.type) }));
    $('axOverlayBreed').classList.remove('visible');
    updateUI();
    saveGame();
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
      logLine(t('game.noSickAxolotl'));
      return;
    }
    var treatmentCost = getTreatmentCost();
    if (state.money < treatmentCost) {
      logLine(t('game.notEnoughTreatmentCost'));
      return;
    }
    var descEl = document.getElementById('axTreatDesc');
    if (descEl) descEl.textContent = t('ui.treatSelectDescDynamic', { cost: formatMoney(treatmentCost) });
    var list = $('axTreatTankList');
    list.innerHTML = '';
    sickTanks.forEach(function (x) {
      var label = t('ui.tankLabel', { n: x.idx + 1 });
      if (x.tank.axolotl && x.tank.axolotl.sick) {
        label += typeLabel(x.tank.axolotl.type);
      } else if (x.tank.breedingPair) {
        var sickNames = x.tank.breedingPair.filter(function(ax) { return ax.sick && !ax.underTreatment; }).map(function(ax) { return typeLabel(ax.type); });
        label += sickNames.length > 0 ? sickNames.join('・') + t('ui.breedingPairCohabiting') : t('ui.breedingPairLabel');
      }
      label += '（' + formatMoney(treatmentCost) + '）';
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
    var treatmentCost = getTreatmentCost();
    if (!tank || state.money < treatmentCost) {
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
    state.money -= treatmentCost;
    targetAx.underTreatment = true;
    targetAx.underTreatmentLevel = state.medicineLevel != null ? state.medicineLevel : 0;
    if (axolotlRegistry[targetAx.id]) axolotlRegistry[targetAx.id].underTreatment = true;
    logLine(t('ui.treatmentStarted', { n: tankIdx + 1, type: typeLabel(targetAx.type), cost: formatMoney(treatmentCost) }));
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
        var ageBand = item.age <= 3 ? 1 : (item.age <= 6 ? 3 : (item.age <= 12 ? 5 : 7));
        var shopIconSize = getShopIconSizeFromBand(ageBand);
        var displayStats = getRandomShopStats({ age: item.age });
        if (item.problemFlags && (item.problemFlags.injured || item.problemFlags.sick)) displayStats.health = Math.min(displayStats.health, 50);
        
        if (item.type === 'chimera') {
          var fakeAx = { id: 0, type: 'chimera', chimeraTypes: item.chimeraTypes || ['nomal', 'marble'], shade: displayStats.shade };
          var sprite = createChimeraCanvasSprite(fakeAx, shopIconSize);
          sprite.classList.add('ax-idle');
          sprite.dataset.bobIntervalMs = '500';
          sprite.dataset.bobIndex = '0';
          sprite.dataset.bobLastStep = '0';
          sprite.style.width = shopIconSize + 'px';
          sprite.style.height = shopIconSize + 'px';
          card.appendChild(sprite);
        } else {
          var fakeAx = { id: 0, type: item.type, shade: displayStats.shade };
          var sprite = createPixelArtCanvasSprite(fakeAx, shopIconSize);
          sprite.classList.add('ax-idle');
          sprite.dataset.bobIntervalMs = '500';
          sprite.dataset.bobIndex = '0';
          sprite.dataset.bobLastStep = '0';
          sprite.style.width = shopIconSize + 'px';
          sprite.style.height = shopIconSize + 'px';
          card.appendChild(sprite);
        }
        
        var nameSpan = document.createElement('span');
        nameSpan.className = 'ax-buy-type-name';
        var problemLabel = '';
        if (item.problemFlags && item.problemFlags.injured) problemLabel = t('ui.injuredTag');
        else if (item.problemFlags && item.problemFlags.sick) problemLabel = t('ui.sickTag');
        var ageLabel = t('ui.ageMonths', { n: item.age });
        nameSpan.textContent = problemLabel + typeLabel(item.type) + ' (' + ageLabel + ')';
        card.appendChild(nameSpan);
        
        var briefDiv = document.createElement('div');
        briefDiv.className = 'ax-buy-type-stats';
        briefDiv.style.fontSize = '10px';
        briefDiv.style.color = '#64748b';
        briefDiv.style.marginTop = '2px';
        briefDiv.textContent = t('ui.sizeLabel') + formatSize(displayStats.size) + ' / ' + t('ui.ageFormat', { n: displayStats.age });
        card.appendChild(briefDiv);
        
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
        detailBtn.textContent = t('ui.detail');
        detailBtn.style.fontSize = '10px';
        detailBtn.style.padding = '4px 8px';
        detailBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var detailText = '<p><strong>' + t('ui.priceLabel') + '</strong> ' + formatMoney(item.price) + '</p>';
          detailText += '<p><strong>' + t('ui.sizeLabel') + '</strong> ' + formatSize(displayStats.size) + '<br>';
          detailText += '<strong>' + t('ui.ageFormat', { n: displayStats.age }) + '</strong><br>';
          detailText += '<strong>' + t('ui.healthLabel') + '</strong> ' + displayStats.health + '/100<br>';
          detailText += '<strong>' + t('ui.hungerLabelShort') + '</strong> ' + displayStats.hunger + '/100<br>';
          detailText += '<strong>' + t('ui.waterQualityLabel') + '</strong> ' + displayStats.water + '/100<br>';
          detailText += '<strong>' + t('ui.shadeLabel') + '</strong> ' + shadeLabel(displayStats.shade) + '</p>';
          if (item.problemFlags && item.problemFlags.injured) detailText += '<p><strong>' + t('ui.conditionLabel') + '</strong> ' + t('ui.injured') + '</p>';
          else if (item.problemFlags && item.problemFlags.sick) detailText += '<p><strong>' + t('ui.conditionLabel') + '</strong> ' + t('ui.sick') + '</p>';
          detailText += '<p>' + t('ui.problemRecovery') + '</p>';
          openShopDetail((problemLabel || '') + typeLabel(item.type) + ' (' + ageLabel + ')', detailText);
        });
        btnRow.appendChild(detailBtn);
        
        var buyBtn = document.createElement('button');
        buyBtn.type = 'button';
        buyBtn.className = 'ax-btn ax-buy-buy-btn';
        buyBtn.textContent = t('dialog.buy');
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
      var problemStats = getRandomShopStats(sizeBand || 1);
      if (options.injured || options.sick) problemStats.health = Math.min(problemStats.health, 50);
      if (selectedType === 'chimera') {
        var fakeAx = { id: 0, type: 'chimera', chimeraTypes: ['nomal', 'marble'], shade: problemStats.shade };
        var sprite = createChimeraCanvasSprite(fakeAx, problemIconSize);
        sprite.classList.add('ax-idle');
        sprite.dataset.bobIntervalMs = '500';
        sprite.dataset.bobIndex = '0';
        sprite.dataset.bobLastStep = '0';
        sprite.style.width = problemIconSize + 'px';
        sprite.style.height = problemIconSize + 'px';
        problemBtn.appendChild(sprite);
      } else {
        var fakeAx = { id: 0, type: selectedType, shade: problemStats.shade };
        var sprite = createPixelArtCanvasSprite(fakeAx, problemIconSize);
        sprite.classList.add('ax-idle');
        sprite.dataset.bobIntervalMs = '500';
        sprite.dataset.bobIndex = '0';
        sprite.dataset.bobLastStep = '0';
        sprite.style.width = problemIconSize + 'px';
        sprite.style.height = problemIconSize + 'px';
        problemBtn.appendChild(sprite);
      }
      var defectLabel = options.injured ? t('ui.injured') : t('ui.sick');
      var problemName = document.createElement('span');
      problemName.className = 'ax-buy-type-name';
      problemName.innerHTML = t('ui.problemPrefix') + typeLabel(selectedType) + ' (' + (sizeBand === 7 ? t('ui.adultLabel') : t('ui.threeMonthLabel')) + ') … ' + defectLabel;
      problemBtn.appendChild(problemName);
      var problemBriefDiv = document.createElement('div');
      problemBriefDiv.className = 'ax-buy-type-stats';
      problemBriefDiv.style.fontSize = '10px';
      problemBriefDiv.style.color = '#64748b';
      problemBriefDiv.style.marginTop = '2px';
      problemBriefDiv.textContent = t('ui.sizeLabel') + formatSize(problemStats.size) + ' / ' + t('ui.ageFormat', { n: problemStats.age });
      problemBtn.appendChild(problemBriefDiv);
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
      problemDetailBtn.textContent = t('ui.detail');
      problemDetailBtn.style.fontSize = '10px';
      problemDetailBtn.style.padding = '4px 8px';
      problemDetailBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var detailHtml = '<p><strong>' + t('ui.priceLabel') + '</strong> ' + formatMoney(problemPrice) + '</p>';
        detailHtml += '<p><strong>' + t('ui.conditionLabel') + '</strong> ' + defectLabel + '</p>';
        detailHtml += '<p><strong>' + t('ui.sizeLabel') + '</strong> ' + formatSize(problemStats.size) + '<br>';
        detailHtml += '<strong>' + t('ui.ageFormat', { n: problemStats.age }) + '</strong><br>';
        detailHtml += '<strong>' + t('ui.healthLabel') + '</strong> ' + problemStats.health + '/100<br>';
        detailHtml += '<strong>' + t('ui.hungerLabelShort') + '</strong> ' + problemStats.hunger + '/100<br>';
        detailHtml += '<strong>' + t('ui.waterQualityLabel') + '</strong> ' + problemStats.water + '/100<br>';
        detailHtml += '<strong>' + t('ui.shadeLabel') + '</strong> ' + shadeLabel(problemStats.shade) + '</p>';
        detailHtml += '<p>' + t('ui.problemRecovery') + '</p>';
        openShopDetail(t('ui.problemPrefix') + typeLabel(selectedType) + ' (' + (sizeBand === 7 ? t('ui.adultLabel') : t('ui.threeMonthLabel')) + ')', detailHtml);
      });
      btnRow.appendChild(problemDetailBtn);
      var problemBuyBtn = document.createElement('button');
      problemBuyBtn.type = 'button';
      problemBuyBtn.className = 'ax-btn ax-buy-buy-btn';
      problemBuyBtn.textContent = t('dialog.buy');
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
    
    // 幼体1-3ヶ月 or 成体12-21ヶ月でランダム、濃さ・健康等で価格変動
    var stats = getRandomShopStats(sizeBand || 1);
    var priceAx = { type: selectedType, age: stats.age, size: stats.size, health: stats.health, hunger: stats.hunger, shade: stats.shade, sick: false, injured: false };
    var price = calcPrice(priceAx);
    
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
    var sizeLabel = sizeBand === 7 ? t('ui.adultLabel') : t('ui.youngLabel');
    var saleLabel = isOnSale ? t('ui.sale') : '';
    var sexLabel = sex ? (sex === 'オス' ? ' ♂' : ' ♀') : '';
    var stockStatus = isOutOfStock ? ' <span style="color:#dc2626; font-size:10px;">' + t('dialog.outOfStock') + '</span>' : '';
    var shopIconSize = getShopIconSizeFromBand(sizeBand || 1);
    
    if (selectedType === 'chimera') {
      var fakeAx = { id: 0, type: 'chimera', chimeraTypes: ['nomal', 'marble'], shade: stats.shade };
      var sprite = createChimeraCanvasSprite(fakeAx, shopIconSize);
      sprite.classList.add('ax-idle');
      sprite.dataset.bobIntervalMs = '500';
      sprite.dataset.bobIndex = '0';
      sprite.dataset.bobLastStep = '0';
      sprite.style.width = shopIconSize + 'px';
      sprite.style.height = shopIconSize + 'px';
      card.appendChild(sprite);
    } else {
      var fakeAx = { id: 0, type: selectedType, shade: stats.shade };
      var sprite = createPixelArtCanvasSprite(fakeAx, shopIconSize);
      sprite.classList.add('ax-idle');
      sprite.dataset.bobIntervalMs = '500';
      sprite.dataset.bobIndex = '0';
      sprite.dataset.bobLastStep = '0';
      sprite.style.width = shopIconSize + 'px';
      sprite.style.height = shopIconSize + 'px';
      card.appendChild(sprite);
    }
    var nameSpan = document.createElement('span');
    nameSpan.className = 'ax-buy-type-name';
    nameSpan.innerHTML = saleLabel + typeLabel(selectedType) + ' (' + sizeLabel + sexLabel + ')' + stockStatus;
    card.appendChild(nameSpan);
    var briefDiv = document.createElement('div');
    briefDiv.className = 'ax-buy-type-stats';
    briefDiv.style.fontSize = '10px';
    briefDiv.style.color = '#64748b';
    briefDiv.style.marginTop = '2px';
    briefDiv.textContent = t('ui.sizeLabel') + formatSize(stats.size) + ' / ' + t('ui.ageFormat', { n: stats.age });
    card.appendChild(briefDiv);
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
    detailBtn.textContent = t('ui.detail');
    detailBtn.style.fontSize = '10px';
    detailBtn.style.padding = '4px 8px';
    detailBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isOutOfStock) return;
      var detailHtml = '<p><strong>' + t('ui.priceLabel') + '</strong> ' + formatMoney(price) + '</p>';
      detailHtml += '<p><strong>' + t('ui.sizeLabel') + '</strong> ' + formatSize(stats.size) + '<br>';
      detailHtml += '<strong>' + t('ui.ageFormat', { n: stats.age }) + '</strong><br>';
      detailHtml += '<strong>' + t('ui.healthLabel') + '</strong> ' + stats.health + '/100<br>';
      detailHtml += '<strong>' + t('ui.hungerLabelShort') + '</strong> ' + stats.hunger + '/100<br>';
      detailHtml += '<strong>' + t('ui.waterQualityLabel') + '</strong> ' + stats.water + '/100<br>';
      detailHtml += '<strong>' + t('ui.shadeLabel') + '</strong> ' + shadeLabel(stats.shade) + '<br>';
      detailHtml += '<strong>' + t('ui.statusFormat', { status: stats.status }) + '</strong></p>';
      openShopDetail(typeLabel(selectedType) + ' (' + sizeLabel + sexLabel + ')', detailHtml);
    });
    btnRow.appendChild(detailBtn);
    var buyBtn = document.createElement('button');
    buyBtn.type = 'button';
    buyBtn.className = 'ax-btn ax-buy-buy-btn';
    buyBtn.textContent = t('dialog.buy');
    buyBtn.style.fontSize = '10px';
    buyBtn.style.padding = '4px 8px';
    buyBtn.dataset.type = selectedType;
    buyBtn.dataset.band = String(sizeBand || 1);
    buyBtn.dataset.sex = sex || '';
    buyBtn.dataset.price = String(price);
    buyBtn.dataset.stockKey = stockKey;
    buyBtn.dataset.statsJson = JSON.stringify(stats);
    if (state.money < price || isOutOfStock) buyBtn.disabled = true;
    if (isOutOfStock) detailBtn.disabled = true;
    buyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!this.disabled && !isOutOfStock) {
        var shopStats = null;
        try {
          if (this.dataset.statsJson) shopStats = JSON.parse(this.dataset.statsJson);
        } catch (err) {}
        doBuy(this.dataset.type, parseInt(this.dataset.band, 10), parseInt(this.dataset.price, 10), false, this.dataset.sex || null, null, shopStats);
        state.shopStockDaily[this.dataset.stockKey] = false;
        if ($('axOverlayBuy') && $('axOverlayBuy').classList.contains('visible')) {
          showBuyTypeList('creature');
        }
      }
    });
    btnRow.appendChild(buyBtn);
    card.appendChild(btnRow);
    if (isOutOfStock) {
      card.style.opacity = '0.5';
      card.style.pointerEvents = 'none';
    }
    list.appendChild(card);
  }

  function openBuyOverlay() {
    state.mutationShopSeenThisPeriod = true;
    updateMutationShopButton();
    var tabsEl = document.getElementById('axBuyTabs');
    var listEl = document.getElementById('axBuyTypeList');
    if (!tabsEl || !listEl) return;
    tabsEl.innerHTML = '';
    
    // 生体タブ
    var creatureTab = document.createElement('button');
    creatureTab.type = 'button';
    creatureTab.className = 'ax-buy-tab';
    creatureTab.textContent = t('ui.creatureTab');
    creatureTab.dataset.tab = 'creature';
    creatureTab.addEventListener('click', function () {
      tabsEl.querySelectorAll('.ax-buy-tab').forEach(function (t) { t.classList.remove('active'); });
      creatureTab.classList.add('active');
      showBuyTypeList('creature');
    });
    tabsEl.appendChild(creatureTab);
    
    // 設備タブ（水槽追加など・最初に表示）
    var equipmentTab = document.createElement('button');
    equipmentTab.type = 'button';
    equipmentTab.className = 'ax-buy-tab active';
    equipmentTab.textContent = t('ui.equipmentTab');
    equipmentTab.dataset.tab = 'equipment';
    equipmentTab.addEventListener('click', function () {
      tabsEl.querySelectorAll('.ax-buy-tab').forEach(function (t) { t.classList.remove('active'); });
      equipmentTab.classList.add('active');
      showBuyTypeList('equipment');
    });
    tabsEl.appendChild(equipmentTab);
    
    showBuyTypeList('equipment');
    var overlay = document.getElementById('axOverlayBuy');
    if (overlay) overlay.classList.add('visible');
  }

  function showBuyTypeList(tabType) {
    var list = document.getElementById('axBuyTypeList');
    if (!list) return;
    list.innerHTML = '';
    if (tabType === 'equipment') {
      // 設備タブ：生体と同じく箱ごとに表示し、詳細・効果を見れるようにする
      function addEquipmentCard(name, statusText, detailTitle, detailBody, buyLabel, cost, disabled, onBuy, imageSrc) {
        var card = document.createElement('div');
        card.className = 'ax-equipment-card';
        if (imageSrc) {
          var imgWrap = document.createElement('div');
          imgWrap.className = 'ax-equipment-icon-wrap';
          var img = document.createElement('img');
          img.className = 'ax-equipment-icon';
          img.src = imageSrc;
          img.alt = name;
          img.onerror = function() { this.style.display = 'none'; };
          imgWrap.appendChild(img);
          card.appendChild(imgWrap);
        }
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
        detailBtn.textContent = t('ui.detail');
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
      // 自動給餌器（Lv1 Auto Feeder→Lv2 Copper→Lv3 Silver→Lv4 Golden、4段階）
      (function () {
        var afLv = (state.equipment && state.equipment.autoFeederLevel != null) ? state.equipment.autoFeederLevel : -1;
        var maxed = afLv >= MAX_AUTO_FEEDER_LEVEL;
        var nextCost = maxed ? 0 : AUTO_FEEDER_TIERS[afLv + 1].cost;
        var tierName = afLv < 0 ? t('game.equipment.none') : t(AUTO_FEEDER_TIERS[afLv].nameKey);
        var nextTierName = afLv < 0 ? t(AUTO_FEEDER_TIERS[0].nameKey) : (afLv + 1 <= MAX_AUTO_FEEDER_LEVEL ? t(AUTO_FEEDER_TIERS[afLv + 1].nameKey) : '');
        var statusText = afLv < 0 ? 'Lv0 → Lv1 ' + formatMoney(nextCost) : tierName + (maxed ? ' (' + t('game.equipment.maxLevel') + ')' : ' → ' + nextTierName + ' ' + formatMoney(nextCost));
        var afIcon = afLv < 0 ? null : afLv === 0 ? 'Auto_Feeder.png' : afLv === 1 ? 'Copper_Feeder.png' : afLv === 2 ? 'Silver_Feeder.png' : 'Golden_Feeder.png';
        addEquipmentCard(
          t('game.equipment.autoFeeder'),
          statusText,
          t('game.equipment.autoFeeder'),
          '<p><strong>' + t('ui.effectLabel') + '</strong><br>' + t('game.equipment.autoFeederDescTier') + '</p>',
          maxed ? t('game.equipment.lvMax') : (afLv < 0 ? t('game.equipment.buyFirst') : t('game.equipment.levelUp')),
          nextCost,
          maxed || state.money < nextCost,
          maxed ? null : function () { buyEquipment('autoFeeder', nextCost); showBuyTypeList('equipment'); updateUI(); },
          afIcon ? equipmentImagePath('Auto Feeder', afIcon) : null
        );
      })();
      // フィルタ（Lv1 Sponge→Lv2 Top→Lv3 Canister、3段階）
      (function () {
        var flLv = (state.equipment && state.equipment.filterLevel != null) ? state.equipment.filterLevel : -1;
        var maxed = flLv >= MAX_FILTER_LEVEL;
        var nextCost = maxed ? 0 : FILTER_TIERS[flLv + 1].cost;
        var tierName = flLv < 0 ? t('game.equipment.none') : t(FILTER_TIERS[flLv].nameKey);
        var nextTierName = flLv < 0 ? t(FILTER_TIERS[0].nameKey) : (flLv + 1 <= MAX_FILTER_LEVEL ? t(FILTER_TIERS[flLv + 1].nameKey) : '');
        var statusText = flLv < 0 ? 'Lv0 → Lv1 ' + formatMoney(nextCost) : tierName + (maxed ? ' (' + t('game.equipment.maxLevel') + ')' : ' → ' + nextTierName + ' ' + formatMoney(nextCost));
        var flIcon = flLv < 0 ? null : flLv === 0 ? 'Sponge Filiter.png' : flLv === 1 ? 'Top Filter.png' : 'Canister Filter.png';
        addEquipmentCard(
          t('game.equipment.filter'),
          statusText,
          t('game.equipment.filter'),
          '<p><strong>' + t('ui.effectLabel') + '</strong><br>' + t('game.equipment.filterDescTier') + '</p>',
          maxed ? t('game.equipment.lvMax') : (flLv < 0 ? t('game.equipment.buyFirst') : t('game.equipment.levelUp')),
          nextCost,
          maxed || state.money < nextCost,
          maxed ? null : function () { buyEquipment('filter', nextCost); showBuyTypeList('equipment'); updateUI(); },
          flIcon ? equipmentImagePath('Filter', flIcon) : null
        );
      })();
      // 底面掃除機（Lv0→1→2→3、Black→Copper→Silver→Gold、4段階）
      (function () {
        var bcLv = (state.equipment && state.equipment.bottomCleanerLevel) != null ? state.equipment.bottomCleanerLevel : -1;
        var nextCost = bcLv === -1 ? EQUIPMENT_BOTTOM_CLEANER_COST : bcLv === 0 ? EQUIPMENT_BOTTOM_CLEANER_COST_LV2 : bcLv === 1 ? EQUIPMENT_BOTTOM_CLEANER_COST_LV3 : 0;
        var maxed = bcLv >= MAX_BOTTOM_CLEANER_LEVEL;
        var tierName = bcLv < 0 ? t('game.equipment.none') : 'Lv' + bcLv;
        var nextTierName = bcLv < 0 ? 'Lv0' : (bcLv + 1 <= MAX_BOTTOM_CLEANER_LEVEL ? 'Lv' + (bcLv + 1) : '');
        var statusText = bcLv < 0 ? 'Lv0 → Lv1 ' + formatMoney(nextCost) : tierName + (maxed ? '（' + t('game.equipment.maxLevel') + '）' : ' → ' + nextTierName + ' ' + formatMoney(nextCost));
        var bcIcon = bcLv < 0 ? null : bcLv === 0 ? 'Black_Vacuum.png' : bcLv === 1 ? 'Copper_Vacuum.png' : bcLv === 2 ? 'Silver_Vacuum.png' : 'Golden_Vacuum.png';
        addEquipmentCard(
          t('game.equipment.bottomCleaner'),
          statusText,
          t('game.equipment.bottomCleaner'),
          '<p><strong>' + t('ui.levelLabel') + '</strong> Lv0〜Lv3<br><strong>' + t('ui.effectLabel') + '</strong><br>' + t('game.equipment.bottomCleanerDesc') + '</p>',
          maxed ? t('game.equipment.maxLevel') : (bcLv < 0 ? t('game.equipment.buyFirst') : t('game.equipment.levelUp')),
          nextCost,
          maxed || state.money < nextCost,
          maxed ? null : function () { buyEquipment('bottomCleaner', nextCost); showBuyTypeList('equipment'); updateUI(); },
          bcIcon ? equipmentImagePath('Vacuum', bcIcon) : null
        );
      })();
      // 薬（治療：Normal→Great→Super→Hiper、ランクで回復率上昇・最大100%）
      (function () {
        var medLv = state.medicineLevel != null ? state.medicineLevel : 0;
        var maxed = medLv >= MAX_MEDICINE_LEVEL;
        var nextCost = maxed ? 0 : MEDICINE_TIERS[medLv + 1].cost;
        var tierName = t(MEDICINE_TIERS[medLv].nameKey);
        var sickCount = 0;
        state.tanks.forEach(function(t) {
          if (t.axolotl && t.axolotl.sick && !t.axolotl.underTreatment) sickCount++;
          if (t.breedingPair) {
            t.breedingPair.forEach(function(ax) {
              if (ax.sick && !ax.underTreatment) sickCount++;
            });
          }
        });
        var treatmentCost = getTreatmentCost();
        var statusText = tierName + ' ' + formatMoney(treatmentCost) + '/' + t('game.equipment.perTreatment');
        if (!maxed) statusText += ' → ' + t(MEDICINE_TIERS[medLv + 1].nameKey) + ' ' + formatMoney(nextCost);
        var detailBody = '<p><strong>' + t('ui.effectLabel') + '</strong><br>' + t('game.equipment.medicineDescTier') + '</p>';
        var primaryAction = sickCount > 0 ? t('game.equipment.selectTarget') : (maxed ? t('game.equipment.lvMax') : t('game.equipment.levelUp'));
        var canUpgrade = !maxed && state.money >= nextCost;
        var canTreat = sickCount > 0 && state.money >= treatmentCost;
        var onPrimary = sickCount > 0 ? function() { openTreatmentOverlay(); showBuyTypeList('equipment'); updateUI(); } : (maxed ? null : function() { buyEquipment('medicine', nextCost); showBuyTypeList('equipment'); updateUI(); });
        var medIcon = medLv === 0 ? 'Medicine.png' : medLv === 1 ? 'Great Medicine.png' : medLv === 2 ? 'Super Medicine.png' : 'Hiper Medicine.png';
        addEquipmentCard(
          t('game.equipment.medicine'),
          statusText,
          t('game.equipment.medicine'),
          detailBody,
          primaryAction,
          sickCount > 0 ? treatmentCost : nextCost,
          !canTreat && !canUpgrade,
          onPrimary,
          equipmentImagePath('Medicine', medIcon)
        );
      })();
      // 餌（Food→Silver Food→Golden Food→Diamond Food）
      (function () {
        var fdLv = (state.foodLevel != null ? state.foodLevel : 0);
        var maxed = fdLv >= 3;
        var nextCost = maxed ? 0 : FOOD_TIERS[fdLv + 1].cost;
        var tierName = t(FOOD_TIERS[fdLv].nameKey);
        var statusText = tierName + (maxed ? ' (' + t('game.equipment.maxLevel') + ')' : ' → ' + t(FOOD_TIERS[fdLv + 1].nameKey) + ' ' + formatMoney(nextCost));
        var fdIcon = fdLv === 0 ? 'Copper_Food.png' : fdLv === 1 ? 'Silver_Food.png' : fdLv === 2 ? 'Golden_Food.png' : 'Diamond_food.png';
        addEquipmentCard(
          t('game.equipment.foodTab'),
          statusText,
          t('game.equipment.foodTab'),
          '<p><strong>' + t('ui.effectLabel') + '</strong><br>' + t('game.equipment.foodDetailTier') + '</p>',
          maxed ? t('game.equipment.lvMax') : t('game.equipment.levelUp'),
          nextCost,
          maxed || state.money < nextCost,
          maxed ? null : function () { buyEquipment('food', nextCost); showBuyTypeList('equipment'); updateUI(); },
          equipmentImagePath('Food', fdIcon)
        );
      })();
      // 水槽を増やす（金額のみ・スケール料金で最大MAX_TANKSまで）
      (function () {
        var maxT = getMaxTanks();
        var addCost = getAddTankCost();
        var atMax = state.tanks.length >= maxT;
        var tankCount = state.tanks.length;
        var tankIconName = tankCount <= 4 ? 'Tank.png' : tankCount <= 9 ? 'Silver_Tank.png' : 'Golden_Tank.png';
        var card = document.createElement('div');
        card.className = 'ax-equipment-card';
        var imgWrap = document.createElement('div');
        imgWrap.className = 'ax-equipment-icon-wrap';
        var img = document.createElement('img');
        img.className = 'ax-equipment-icon';
        img.src = equipmentImagePath('Tank', tankIconName);
        img.alt = t('game.equipment.addTank');
        img.onerror = function() { this.style.display = 'none'; };
        imgWrap.appendChild(img);
        card.appendChild(imgWrap);
        var nameEl = document.createElement('div');
        nameEl.className = 'ax-equipment-name';
        nameEl.textContent = t('game.equipment.addTank');
        card.appendChild(nameEl);
        var descEl = document.createElement('div');
        descEl.className = 'ax-equipment-level';
        descEl.textContent = t('game.equipment.addTankSlotFormat', { n: state.tanks.length, max: maxT });
        card.appendChild(descEl);
        var btns = document.createElement('div');
        btns.className = 'ax-equipment-btns';
        var detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'ax-btn ax-buy-detail-btn';
        detailBtn.textContent = t('ui.detail');
        detailBtn.style.fontSize = '10px';
        detailBtn.style.padding = '4px 8px';
        detailBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          openShopDetail(t('game.equipment.addTank'), '<p>' + t('game.equipment.addTankDetailSimple') + '</p>');
        });
        btns.appendChild(detailBtn);
        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'ax-btn ax-buy-buy-btn';
        addBtn.textContent = atMax ? t('game.equipment.maxTanks') : t('game.equipment.addTankBtn') + ' ' + formatMoney(addCost);
        addBtn.style.fontSize = '10px';
        addBtn.style.padding = '4px 8px';
        if (atMax || state.money < addCost) addBtn.disabled = true;
        addBtn.addEventListener('click', function (e) { e.stopPropagation(); if (!this.disabled) { actAddTank(); showBuyTypeList('equipment'); updateUI(); } });
        btns.appendChild(addBtn);
        card.appendChild(btns);
        list.appendChild(card);
      })();
    } else {
      // 生体タブ：固定化された種類のうち、今月の品揃えのみ表示（毎月変わる）
      var stockThisMonth = getShopStockForMonth();
      var fixedTypes = Object.keys(state.fixedTypes).filter(function(type) {
        return state.fixedTypes[type] === true && stockThisMonth[type];
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
      if (fixedTypes.length > 0) {
        var problemSeed = (state.month || 1) * 7 + 3;
        if ((problemSeed % 100) < 12) {
          var problemType = fixedTypes[problemSeed % fixedTypes.length];
          var problemBand = (problemSeed >> 2) % 2 === 0 ? 1 : 7;
          var problemDefect = (problemSeed >> 1) % 2 === 0 ? 'injured' : 'sick';
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
      // 稀に入荷したミューテーション（未固定）個体を生体タブに統合表示
      if (state.mutationShopAvailable && state.mutationShopItems && state.mutationShopItems.length > 0) {
        state.mutationShopItems.forEach(function(item) {
          var card = document.createElement('div');
          card.className = 'ax-buy-type-card ax-buy-type-btn';
          var ageBand = item.age <= 3 ? 1 : (item.age <= 6 ? 3 : (item.age <= 12 ? 5 : 7));
          var shopIconSize = getShopIconSizeFromBand(ageBand);
          var mutDisplayStats = getRandomShopStats({ age: item.age });
          if (item.problemFlags && (item.problemFlags.injured || item.problemFlags.sick)) mutDisplayStats.health = Math.min(mutDisplayStats.health, 50);
          if (item.type === 'chimera') {
            var fakeAx = { id: 0, type: 'chimera', chimeraTypes: item.chimeraTypes || ['nomal', 'marble'], shade: mutDisplayStats.shade };
            var sprite = createChimeraCanvasSprite(fakeAx, shopIconSize);
            sprite.classList.add('ax-idle');
            sprite.dataset.bobIntervalMs = '500';
            sprite.dataset.bobIndex = '0';
            sprite.dataset.bobLastStep = '0';
            sprite.style.width = shopIconSize + 'px';
            sprite.style.height = shopIconSize + 'px';
            card.appendChild(sprite);
          } else {
            var fakeAx = { id: 0, type: item.type, shade: mutDisplayStats.shade };
            var sprite = createPixelArtCanvasSprite(fakeAx, shopIconSize);
            sprite.classList.add('ax-idle');
            sprite.dataset.bobIntervalMs = '500';
            sprite.dataset.bobIndex = '0';
            sprite.dataset.bobLastStep = '0';
            sprite.style.width = shopIconSize + 'px';
            sprite.style.height = shopIconSize + 'px';
            card.appendChild(sprite);
          }
          var nameSpan = document.createElement('span');
          nameSpan.className = 'ax-buy-type-name';
          var problemLabel = '';
          if (item.problemFlags && item.problemFlags.injured) problemLabel = t('ui.injuredTag');
          else if (item.problemFlags && item.problemFlags.sick) problemLabel = t('ui.sickTag');
          nameSpan.textContent = problemLabel + typeLabel(item.type) + ' (' + t('ui.ageMonths', { n: item.age }) + ') ' + t('ui.rareTag');
          card.appendChild(nameSpan);
          var mutBriefDiv = document.createElement('div');
          mutBriefDiv.className = 'ax-buy-type-stats';
          mutBriefDiv.style.fontSize = '10px';
          mutBriefDiv.style.color = '#64748b';
          mutBriefDiv.style.marginTop = '2px';
          mutBriefDiv.textContent = t('ui.sizeLabel') + formatSize(mutDisplayStats.size) + ' / ' + t('ui.ageFormat', { n: mutDisplayStats.age });
          card.appendChild(mutBriefDiv);
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
          detailBtn.textContent = t('ui.detail');
          detailBtn.style.fontSize = '10px';
          detailBtn.style.padding = '4px 8px';
          detailBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var detailText = '<p><strong>' + t('ui.priceLabel') + '</strong> ' + formatMoney(item.price) + '</p>';
            detailText += '<p><strong>' + t('ui.sizeLabel') + '</strong> ' + formatSize(mutDisplayStats.size) + '<br>';
            detailText += '<strong>' + t('ui.ageFormat', { n: mutDisplayStats.age }) + '</strong><br>';
            detailText += '<strong>' + t('ui.healthLabel') + '</strong> ' + mutDisplayStats.health + '/100<br>';
            detailText += '<strong>' + t('ui.hungerLabelShort') + '</strong> ' + mutDisplayStats.hunger + '/100<br>';
            detailText += '<strong>' + t('ui.waterQualityLabel') + '</strong> ' + mutDisplayStats.water + '/100<br>';
            detailText += '<strong>' + t('ui.shadeLabel') + '</strong> ' + shadeLabel(mutDisplayStats.shade) + '</p>';
            if (item.problemFlags && item.problemFlags.injured) detailText += '<p><strong>' + t('ui.conditionLabel') + '</strong> ' + t('ui.injured') + '</p>';
            else if (item.problemFlags && item.problemFlags.sick) detailText += '<p><strong>' + t('ui.conditionLabel') + '</strong> ' + t('ui.sick') + '</p>';
            detailText += '<p>' + t('ui.mutationRecoveryNote') + '</p>';
            openShopDetail(typeLabel(item.type) + ' ' + t('ui.rareArrival'), detailText);
          });
          btnRow.appendChild(detailBtn);
          var buyBtn = document.createElement('button');
          buyBtn.type = 'button';
          buyBtn.className = 'ax-btn ax-buy-buy-btn';
          buyBtn.textContent = t('dialog.buy');
          buyBtn.style.fontSize = '10px';
          buyBtn.style.padding = '4px 8px';
          if (state.money < item.price) buyBtn.disabled = true;
          buyBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            doBuyMutation(item.type, item.age, item.price, item.problemFlags, item.chimeraTypes);
          });
          btnRow.appendChild(buyBtn);
          card.appendChild(btnRow);
          list.appendChild(card);
        });
      }
    }
  }

  function doBuyMutation(type, age, price, problemFlags, chimeraTypes) {
    var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (!empty) {
      logLine(t('game.noTankSpace'));
      updateUI();
      return;
    }
    if (state.money < price) {
      logLine(t('game.cannotAfford'));
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
    empty.clean = 80;  // 購入時は水槽を良好な状態にリセット（前の個体の悪い水質を引き継がない）
    empty.poop = false;
    empty.boughtAtMonth = state.month;
    ax.boughtAtMonth = state.month;
    
    // ミューテーションショップ購入個体はisFixedLineage=false（未固定種）
    ax.isFixedLineage = false;
    if (axolotlRegistry[ax.id]) {
      axolotlRegistry[ax.id].isFixedLineage = false;
    }
    
    // 図鑑に追加
    state.obtainedTypes[type] = true;
    
    var problemLabel = '';
    if (problemFlags && problemFlags.injured) problemLabel = t('ui.injuredTag');
    else if (problemFlags && problemFlags.sick) problemLabel = t('ui.sickTag');
    logLine(problemLabel + t('game.welcomedWithAge', { type: typeLabel(type), age: age, price: formatMoney(price) }));
    
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
    
    // 名付けフェーズを表示
    if (empty && empty.axolotl) {
      openNamingModal(empty.axolotl.id, false);
    }
    
    if ($('axOverlayBuy') && $('axOverlayBuy').classList.contains('visible')) {
      showBuyTypeList('creature');
    }
    updateUI();
    saveGame();
  }

  function doBuy(type, sizeBand, price, isAuction, sex, problemFlags, shopStats) {
    var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (!empty) {
      logLine(t('game.noTankSpace'));
      updateUI();
      return;
    }
    if (state.money < price) {
      logLine(t('game.cannotAfford'));
      updateUI();
      return;
    }
    state.money -= price;
    var age = (shopStats && shopStats.age != null) ? shopStats.age : ageFromSizeBand(sizeBand);
    // キメラの場合はchimeraTypesを設定
    var chimeraTypes = null;
    if (type === 'chimera') {
      chimeraTypes = ['nomal', 'marble']; // デフォルトでリューシとマーブルのキメラ
    }
    var ax = createAxolotl(age, type, null, null, chimeraTypes);
    if (shopStats) {
      ax.size = shopStats.size;
      ax.health = shopStats.health;
      ax.hunger = shopStats.hunger;
      ax.shade = shopStats.shade;
      if (axolotlRegistry[ax.id]) {
        axolotlRegistry[ax.id].size = ax.size;
        axolotlRegistry[ax.id].health = ax.health;
        axolotlRegistry[ax.id].shade = ax.shade;
      }
    } else {
      ax.size = calculateSizeFromAge(age);
      if (axolotlRegistry[ax.id]) axolotlRegistry[ax.id].size = ax.size;
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
      empty.clean = 80;  // 購入時は水槽を良好な状態にリセット（前の個体の悪い水質を引き継がない）
      empty.poop = false;
      empty.boughtAtMonth = state.month;
      ax.boughtAtMonth = state.month;
      
      // ショップ購入個体はisFixedLineage=true（固定化済み種のみ買えるため）
      ax.isFixedLineage = true;
      if (axolotlRegistry[ax.id]) {
        axolotlRegistry[ax.id].isFixedLineage = true;
      }
    
    // 図鑑に追加
    state.obtainedTypes[type] = true;
    
    // オークション機能は削除
    {
      var sizeLabel = sizeBand === 7 ? t('game.sizeLabelAdult') : t('game.sizeLabelThreeMonth');
      var sexLabel = sex ? (sex === 'オス' ? '♂' : '♀') : '';
      if (problemFlags && (problemFlags.injured || problemFlags.sick)) {
        var defectLabel = problemFlags.injured ? t('ui.injured') : t('ui.sick');
        logLine(t('game.welcomedProblem', { type: typeLabel(type), size: sizeLabel, defect: defectLabel, price: formatMoney(price) }));
      } else {
        logLine(t('game.welcomed', { type: typeLabel(type), size: sizeLabel, sex: sexLabel }));
      }
    }
    
    // 名付けフェーズを表示
    if (empty && empty.axolotl) {
      openNamingModal(empty.axolotl.id, false);
    }
    
    updateUI();
    saveGame();
  }

  function buyEquipment(equipmentType, cost) {
    if (state.money < cost) {
      logLine(t('game.notEnoughMoney'));
      return;
    }
    
    if (!state.equipment) {
      state.equipment = { autoFeederLevel: -1, filterLevel: -1, bottomCleanerLevel: -1, tankLevel: 1 };
    }
    if (state.equipment.bottomCleanerLevel === undefined) state.equipment.bottomCleanerLevel = -1;
    if (state.equipment.tankLevel === undefined) state.equipment.tankLevel = 1;
    if (state.equipment.autoFeederLevel === undefined) state.equipment.autoFeederLevel = -1;
    if (state.equipment.filterLevel === undefined) state.equipment.filterLevel = -1;
    
    state.money -= cost;
    if (equipmentType === 'bottomCleaner') {
      state.equipment.bottomCleanerLevel = (state.equipment.bottomCleanerLevel != null ? state.equipment.bottomCleanerLevel : -1) + 1;
      logLine(t('game.bottomCleanerUpgrade', { level: state.equipment.bottomCleanerLevel }));
    } else if (equipmentType === 'medicine') {
      state.medicineLevel = (state.medicineLevel != null ? state.medicineLevel : 0) + 1;
      logLine(t('game.medicineUpgrade', { tier: t(MEDICINE_TIERS[state.medicineLevel].nameKey) }));
    } else if (equipmentType === 'autoFeeder') {
      var nextLv = (state.equipment.autoFeederLevel == null ? -1 : state.equipment.autoFeederLevel) + 1;
      state.equipment.autoFeederLevel = nextLv;
      logLine(t('game.autoFeederUpgrade', { tier: t(AUTO_FEEDER_TIERS[nextLv].nameKey) }));
    } else if (equipmentType === 'filter') {
      var nextLv = (state.equipment.filterLevel == null ? -1 : state.equipment.filterLevel) + 1;
      state.equipment.filterLevel = nextLv;
      logLine(t('game.filterUpgrade', { tier: t(FILTER_TIERS[nextLv].nameKey) }));
    } else if (equipmentType === 'food') {
      var nextLv = (state.foodLevel != null ? state.foodLevel : 0) + 1;
      state.foodLevel = nextLv;
      logLine(t('game.feedUpgraded', { feed: t(FOOD_TIERS[nextLv].nameKey) }));
    } else {
      state.equipment[equipmentType] = true;
      logLine(t('game.equipmentBought', { equipment: t('game.equipment.' + equipmentType) }));
    }
    updateUI();
  }

  function getMaxTanks() {
    return MAX_TANKS;
  }
  function getAddTankCost() {
    var n = state.tanks ? state.tanks.length : 0;
    return Math.floor(BASE_TANK_COST * (1 + TANK_COST_SCALE * n));
  }
  function canAddTank() {
    if (!state.tanks || state.tanks.length >= MAX_TANKS) return false;
    return state.money >= getAddTankCost();
  }
  function actAddTank() {
    if (state.tanks.length >= MAX_TANKS) {
      logLine(t('game.cannotAddTank'));
      return false;
    }
    var cost = getAddTankCost();
    if (state.money < cost) {
      logLine(t('game.notEnoughTankCost'));
      return false;
    }
    state.money -= cost;
    state.tanks.push({
      id: state.tanks.length + 1,
      axolotl: null,
      note: t('ui.emptyTank'),
      baby: false,
      customName: null,
      clean: 80,
      poop: false
    });
    logLine(t('game.tankAdded', { cost: formatMoney(cost) }));
    saveGame();
    updateUI();
    return true;
  }

  function resetGame() {
    state.month = 1;
    state.money = 30000;
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
    state.shopName = t('game.defaultShopName');
    state.shopStockDaily = {};  // 日ごとの在庫状態をリセット
    state.initialNamingMessageShown = false;  // 最初のウパの名前付けメッセージ表示フラグをリセット
    state.equipment = { autoFeederLevel: -1, filterLevel: -1, bottomCleanerLevel: -1, tankLevel: 2 };  // 設備をリセット（最初から3槽）
    state.foodLevel = 0;  // 餌レベル（Copper=0）
    state.medicineLevel = 0;  // 薬レベルをリセット（Normal）
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
    $('axLog').textContent = t('ui.initialLog');
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
      var newName = prompt(t('dialog.shopNamePrompt'), state.shopName || t('game.defaultShopName'));
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
      if (!state.ended) removeAllPoop(this);
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
    var simpleNameCheckbox = document.getElementById('settingSimpleNameMode');
    if (simpleNameCheckbox) {
      simpleNameCheckbox.checked = state.settings && state.settings.simpleNameMode || false;
    }
    // 音楽設定（localStorageから）
    var musicMuted = document.getElementById('settingMusicMuted');
    var musicVolume = document.getElementById('settingMusicVolume');
    var musicVolumeValue = document.getElementById('settingMusicVolumeValue');
    if (musicMuted && window.axolotlShopGetMusicMuted) {
      musicMuted.checked = window.axolotlShopGetMusicMuted();
    }
    if (musicVolume && musicVolumeValue && window.axolotlShopGetMusicVolume) {
      var volPct = Math.round(window.axolotlShopGetMusicVolume() * 100);
      musicVolume.value = volPct;
      musicVolumeValue.textContent = volPct;
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
  var settingSimpleNameMode = document.getElementById('settingSimpleNameMode');
  if (settingSimpleNameMode) {
    settingSimpleNameMode.addEventListener('change', function () {
      if (!state.settings) state.settings = {};
      state.settings.simpleNameMode = this.checked;
      saveGame();
    });
  }

  var settingMusicMuted = document.getElementById('settingMusicMuted');
  if (settingMusicMuted) {
    settingMusicMuted.addEventListener('change', function () {
      if (window.axolotlShopSetMusicMuted) window.axolotlShopSetMusicMuted(this.checked);
      if (window.axolotlShopApplyBgmSettings) window.axolotlShopApplyBgmSettings();
    });
  }
  var settingMusicVolume = document.getElementById('settingMusicVolume');
  var settingMusicVolumeValue = document.getElementById('settingMusicVolumeValue');
  if (settingMusicVolume && settingMusicVolumeValue) {
    settingMusicVolume.addEventListener('input', function () {
      var v = parseInt(this.value, 10) / 100;
      if (window.axolotlShopSetMusicVolume) window.axolotlShopSetMusicVolume(v);
      settingMusicVolumeValue.textContent = this.value;
      if (window.axolotlShopApplyBgmSettings) window.axolotlShopApplyBgmSettings();
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

  var btnPassword = document.getElementById('btnPassword');
  if (btnPassword) {
    btnPassword.addEventListener('click', function () {
      if (!state.ended) {
        openPasswordOverlay();
        closeMenu();
      }
    });
  }

  function openPasswordOverlay() {
    var overlay = $('axOverlayPassword');
    if (!overlay) return;
    
    // 出力エリアをクリア
    var output = document.getElementById('axPasswordOutput');
    var copyBtn = document.getElementById('btnCopyPassword');
    if (output) output.value = '';
    if (copyBtn) copyBtn.style.display = 'none';
    
    overlay.classList.add('visible');
  }

  var axPasswordClose = document.getElementById('axPasswordClose');
  if (axPasswordClose) {
    axPasswordClose.addEventListener('click', function () {
      $('axOverlayPassword').classList.remove('visible');
    });
  }

  var btnDeleteSave = document.getElementById('btnDeleteSave');
  if (btnDeleteSave) {
    btnDeleteSave.addEventListener('click', function () {
      var msg = t('ui.deleteSaveConfirm');
      if (confirm(msg)) {
        localStorage.removeItem(SAVE_KEY);
        resetGame();
        $('axOverlayPassword').classList.remove('visible');
        logLine(t('game.saveDeleted'));
      }
    });
  }

  var btnGeneratePassword = document.getElementById('btnGeneratePassword');
  if (btnGeneratePassword) {
    btnGeneratePassword.addEventListener('click', function () {
      var password = generatePassword();
      var output = document.getElementById('axPasswordOutput');
      var copyBtn = document.getElementById('btnCopyPassword');
      if (password && output) {
        output.value = password;
        if (copyBtn) copyBtn.style.display = 'block';
        logLine(t('game.passwordGenerated'));
      } else {
        logLine(t('game.passwordGenerateFailed'));
      }
    });
  }

  var btnCopyPassword = document.getElementById('btnCopyPassword');
  if (btnCopyPassword) {
    btnCopyPassword.addEventListener('click', function () {
      var output = document.getElementById('axPasswordOutput');
      if (output && output.value) {
        output.select();
        try {
          document.execCommand('copy');
          logLine(t('game.passwordCopied'));
          alert(t('game.passwordCopiedAlert'));
        } catch (e) {
          // モダンブラウザの場合はClipboard APIを使用
          if (navigator.clipboard) {
            navigator.clipboard.writeText(output.value).then(function() {
              logLine(t('game.passwordCopied'));
              alert(t('game.passwordCopiedAlert'));
            }).catch(function(err) {
              console.error('コピーに失敗しました:', err);
              alert('コピーに失敗しました。手動で選択してコピーしてください。');
            });
          } else {
            alert('コピー機能が利用できません。手動で選択してコピーしてください。');
          }
        }
      }
    });
  }

  var btnLoadPassword = document.getElementById('btnLoadPassword');
  if (btnLoadPassword) {
    btnLoadPassword.addEventListener('click', function () {
      var input = document.getElementById('axPasswordInput');
      if (input && input.value.trim()) {
        if (confirm(t('game.passwordRestoreConfirm'))) {
          if (loadFromPassword(input.value.trim())) {
            logLine(t('game.passwordRestored'));
            $('axOverlayPassword').classList.remove('visible');
            updateUI();
            // 名前を再登録
            if (state.usedNames) state.usedNames = {};
            state.tanks.forEach(function(tank) {
              if (tank.axolotl && tank.axolotl.name) {
                registerName(tank.axolotl.name);
              }
              if (tank.breedingPair) {
                tank.breedingPair.forEach(function(ax) {
                  if (ax.name) registerName(ax.name);
                });
              }
            });
            Object.keys(axolotlRegistry).forEach(function(key) {
              var reg = axolotlRegistry[key];
              if (reg && reg.name && !reg.removed) {
                registerName(reg.name);
              }
            });
          } else {
            alert(t('game.passwordInvalid'));
          }
        }
      } else {
        alert(t('game.passwordRequired'));
      }
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
  var axHatchSellAllBtn = document.getElementById('axHatchSellAll');
  if (axHatchSellAllBtn) {
    axHatchSellAllBtn.addEventListener('click', function () {
      var ctx = window._hatchContext;
      if (ctx && ctx.tank) sellAllHatchByTank(ctx.tank, ctx.candidates, ctx.remainingJuveniles);
    });
  }
  var axHatchRandomBtn = document.getElementById('axHatchRandom');
  if (axHatchRandomBtn) {
    axHatchRandomBtn.addEventListener('click', function () {
      var ctx = window._hatchContext;
      if (ctx && ctx.tank && ctx.candidates && ctx.candidates.length > 0) {
        var idx = Math.floor(Math.random() * ctx.candidates.length);
        selectHatchCandidateByTank(ctx.tank, idx, ctx.candidates, ctx.remainingJuveniles);
      }
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
      if (endTitle) endTitle.textContent = t('ui.endThanks');
      if (endMsg) endMsg.textContent = t('ui.endMessage');
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
      div.style.cursor = 'pointer';
      div.addEventListener('click', function() {
        showDeadAxolotls(type);
      });
      
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
        title.innerHTML += ' <span style="color:#94a3b8;">' + t('ui.unobtained') + '</span>';
      }
      header.appendChild(title);
      div.appendChild(header);
      
      var desc = document.createElement('p');
      desc.style.margin = '4px 0';
      desc.style.fontSize = '12px';
      desc.style.color = state.obtainedTypes[type] ? '#475569' : '#94a3b8';
      desc.textContent = typeDescription(type);
      div.appendChild(desc);
      
      if (state.fixedTypes[type]) {
        var fixedBadge = document.createElement('div');
        fixedBadge.style.marginTop = '4px';
        fixedBadge.style.fontSize = '11px';
        fixedBadge.style.color = '#f97316';
        fixedBadge.style.fontWeight = 'bold';
        fixedBadge.textContent = t('ui.fixedBadge');
        div.appendChild(fixedBadge);
      }
      
      // 死んだウパの数を表示
      var deadCount = state.deadAxolotls ? state.deadAxolotls.filter(function(dead) {
        return dead.type === type || (type === 'chimera' && dead.chimeraTypes);
      }).length : 0;
      if (deadCount > 0) {
        var deadBadge = document.createElement('div');
        deadBadge.style.marginTop = '4px';
        deadBadge.style.fontSize = '11px';
        deadBadge.style.color = '#dc2626';
        deadBadge.textContent = '★ ' + t('ui.deadCountSummary', { count: deadCount });
        div.appendChild(deadBadge);
      }
      
      content.appendChild(div);
    });
    
    $('axOverlayEncyclopedia').classList.add('visible');
  }

  function showDeadAxolotls(type) {
    var deadList = state.deadAxolotls ? state.deadAxolotls.filter(function(dead) {
      return dead.type === type || (type === 'chimera' && dead.chimeraTypes);
    }) : [];
    
    if (deadList.length === 0) {
      alert(typeLabel(type) + 'で★になったウパはいません。');
      return;
    }
    
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '20px';
    
    var content = document.createElement('div');
    content.style.background = '#fff';
    content.style.borderRadius = '12px';
    content.style.padding = '20px';
    content.style.maxWidth = '500px';
    content.style.maxHeight = '80vh';
    content.style.overflowY = 'auto';
    content.style.color = '#064e3b';
    
    var title = document.createElement('h2');
    title.textContent = typeLabel(type) + 'で★になったウパたち';
    title.style.marginBottom = '16px';
    title.style.fontSize = '18px';
    content.appendChild(title);
    
    deadList.forEach(function(dead) {
      var item = document.createElement('div');
      item.style.marginBottom = '12px';
      item.style.padding = '12px';
      item.style.border = '1px solid #bfdbfe';
      item.style.borderRadius = '6px';
      item.style.background = '#f0f9ff';
      
      var itemHeader = document.createElement('div');
      itemHeader.style.display = 'flex';
      itemHeader.style.alignItems = 'center';
      itemHeader.style.gap = '12px';
      itemHeader.style.marginBottom = '8px';
      
      // スプライト表示
      var spriteDiv = document.createElement('div');
      if (dead.chimeraTypes) {
        var fakeAx = { id: 0, type: 'chimera', chimeraTypes: dead.chimeraTypes };
        var sprite = createChimeraCanvasSprite(fakeAx, 48);
        spriteDiv.appendChild(sprite);
      } else {
        var fakeAx = { id: 0, type: dead.type };
        var sprite = createPixelArtCanvasSprite(fakeAx, 48);
        spriteDiv.appendChild(sprite);
      }
      itemHeader.appendChild(spriteDiv);
      
      var info = document.createElement('div');
      info.style.flex = '1';
      var nameText = nameForDisplay(dead, getLocale());
      info.innerHTML = '<div style="font-weight:bold; font-size:14px;">' + nameText + '</div>';
      info.innerHTML += '<div style="font-size:12px; color:#64748b; margin-top:4px;">';
      info.innerHTML += t('ui.ageLabel') + ' ' + t('ui.ageMonths', { n: dead.age });
      if (dead.sex) info.innerHTML += ' / ' + dead.sex;
      info.innerHTML += '</div>';
      info.innerHTML += '<div style="font-size:12px; color:#dc2626; margin-top:4px;">★ ' + dead.deathReason + ' (' + t('ui.deathMonthSuffix', { n: dead.deathMonth }) + ')</div>';
      itemHeader.appendChild(info);
      
      item.appendChild(itemHeader);
      content.appendChild(item);
    });
    
    var closeBtn = document.createElement('button');
    closeBtn.textContent = t('ui.close');
    closeBtn.style.width = '100%';
    closeBtn.style.padding = '10px';
    closeBtn.style.marginTop = '16px';
    closeBtn.style.background = '#64748b';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', function() {
      document.body.removeChild(modal);
    });
    content.appendChild(closeBtn);
    
    modal.appendChild(content);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    document.body.appendChild(modal);
  }

  function openAchievements() {
    var content = $('axAchievementsContent');
    content.innerHTML = '';
    
    // 実績をチェック
    achievementDefinitions.forEach(function(ach) {
      var achieved = ach.check();
      if (achieved && !state.achievements[ach.id]) {
        state.achievements[ach.id] = true;
        logLine(t('game.achievementUnlockedLog', { name: achievementName(ach.id) }));
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
      name.textContent = achievementName(ach.id);
      name.style.color = achieved ? '#166534' : '#6b7280';
      header.appendChild(name);
      div.appendChild(header);
      
      var desc = document.createElement('div');
      desc.style.fontSize = '12px';
      desc.style.color = achieved ? '#475569' : '#9ca3af';
      desc.textContent = achievementDesc(ach.id);
      div.appendChild(desc);
      
      content.appendChild(div);
    });
    
    $('axOverlayAchievements').classList.add('visible');
  }

  // ゲーム開始（タイトル画面から呼ばれる）
  function doStartGame(isNewGame) {
    if (isNewGame) {
      state.saveLocale = window.i18n && window.i18n.getLocale ? window.i18n.getLocale() : 'en';
      resetGame();
    } else {
      if (!loadGame()) return false;
      if (state.saveLocale && window.i18n && window.i18n.setLocale) {
        window.i18n.setLocale(state.saveLocale);
        if (window.axolotlShopI18n && window.axolotlShopI18n.update) window.axolotlShopI18n.update();
      }
      updateUI();
      if (state.usedNames) state.usedNames = {};
      state.tanks.forEach(function(tank) {
        if (tank.axolotl && tank.axolotl.name) {
          registerName(tank.axolotl.name);
        }
        if (tank.breedingPair) {
          tank.breedingPair.forEach(function(ax) {
            if (ax.name) registerName(ax.name);
          });
        }
      });
      Object.keys(axolotlRegistry).forEach(function(key) {
        var reg = axolotlRegistry[key];
        if (reg && reg.name && !reg.removed) {
          registerName(reg.name);
        }
      });
    }
    return true;
  }

  window.axolotlShopStartGame = doStartGame;
  window.axolotlShopHasSave = function() {
    return !!localStorage.getItem(SAVE_KEY);
  };
  window.axolotlShopUpdateUI = updateUI;

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
