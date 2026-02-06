(function () {
  'use strict';

  var MAX_CLEAN = 100;
  var MAX_FOOD = 100;
  var MAX_REP = 100;
  var MAX_HEALTH = 100;
  var TARGET_MONEY = 200000;
  var MAX_TANKS = 15;
  var WATER_CHANGE_COST = 1000;

  var AXO_TYPES = ['nomal', 'albino', 'gold', 'marble', 'copper', 'black', 'goldblackeye', 'chimera'];
  var typeLabels = {
    nomal: 'リューシ',
    albino: 'アルビノ',
    gold: 'ゴールド',
    marble: 'マーブル',
    copper: '銅',
    black: 'ブラック',
    goldblackeye: 'ゴールド黒目',
    chimera: 'キメラ'
  };
  var typePriceBase = {
    nomal: 8000,
    albino: 12000,
    gold: 18000,
    marble: 22000,
    copper: 15000,
    black: 25000,
    goldblackeye: 35000,
    chimera: 50000
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
  function typeImagePath(t) {
    if (t === 'goldblackeye') return '/assets/axolotl/axo_gold.png';
    return '/assets/axolotl/axo_' + t + '.png';
  }

  // 画像を動的に生成（Canvas APIを使用）
  var imageCache = {};
  function generateAxolotlImage(ax) {
    var cacheKey = ax.id + '_' + ax.type + '_' + (ax.brightness || 1) + '_' + (ax.saturation || 1) + '_' + (ax.spots ? '1' : '0');
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

  // コッパーはショップで売っていない（シークレット）。交配でごく低確率でのみ出現
  var AXO_TYPES_BUY = ['nomal', 'albino', 'gold', 'marble', 'black'];

  // 交配確率テーブル: breedingTable[親1タイプ][親2タイプ] = { 子タイプ: 重み, ... }
  // copper は重み1でごく低確率
  // goldblackeye は gold x (black/marble/nomal/gold/copper) から低確率で発生
  // chimera は非常に低確率で発生
  var breedingTable = (function () {
    var types = AXO_TYPES;
    var table = {};
    types.forEach(function (k) { table[k] = {}; });
    types.forEach(function (t1) {
      types.forEach(function (t2) {
        if (table[t1][t2]) return;
        var weights = {};
        types.forEach(function (k) {
          var w = (k === t1 || k === t2) ? 35 : 10;
          if (t1 === t2) w = k === t1 ? 60 : 8;
          if (k === 'copper') w = 1;
          // ゴールド黒目: gold x (black/marble/nomal/gold/copper) から低確率
          if (k === 'goldblackeye') {
            if ((t1 === 'gold' && ['black', 'marble', 'nomal', 'gold', 'copper'].indexOf(t2) >= 0) ||
                (t2 === 'gold' && ['black', 'marble', 'nomal', 'gold', 'copper'].indexOf(t1) >= 0)) {
              w = 2; // 非常に低確率
            } else {
              w = 0;
            }
          } else if (k === 'chimera') {
            // キメラは非常に低確率で発生（親が異なる種類の場合）
            if (t1 !== t2 && t1 !== 'chimera' && t2 !== 'chimera') {
              w = 1; // 極めて低確率
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

  function pickOffspringType(parent1Type, parent2Type, parent1Id, parent2Id) {
    // キメラのチェック（非常に低確率）
    if (parent1Type !== parent2Type && Math.random() < 0.01) {
      return { type: 'chimera', chimeraTypes: [parent1Type, parent2Type] };
    }
    
    var inbreedingCoeff = calculateInbreedingCoefficient(parent1Id, parent2Id);
    
    var weights = breedingTable[parent1Type][parent2Type] || breedingTable[parent2Type][parent1Type];
    if (!weights) return { type: AXO_TYPES[0], inbreedingCoeff: inbreedingCoeff };
    
    // 近親交配度が高いと、親の形質が似やすい（85%→95%）
    var parentTraitChance = 0.85 + (inbreedingCoeff / 100) * 0.1;
    
    var total = 0;
    AXO_TYPES.forEach(function (k) { total += weights[k] || 0; });
    var r = Math.random() * total;
    
    // 近親交配度が高い場合、親の形質を優先
    if (Math.random() < parentTraitChance) {
      var parentTypes = [parent1Type, parent2Type];
      return { type: parentTypes[Math.floor(Math.random() * parentTypes.length)], inbreedingCoeff: inbreedingCoeff };
    }
    
    for (var i = 0; i < AXO_TYPES.length; i++) {
      var k = AXO_TYPES[i];
      r -= weights[k] || 0;
      if (r <= 0) return { type: k, inbreedingCoeff: inbreedingCoeff };
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
    auctionPrice: 0
  };

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
      if (roll < 0.5) type = 'nomal';
      else if (roll < 0.75) type = 'albino';
      else if (roll < 0.88) type = 'gold';
      else if (roll < 0.95) type = 'marble';
      else if (roll < 0.98) type = 'copper';
      else type = 'black';
    }
    var age = typeof isAdultOrAge === 'number' ? isAdultOrAge : (isAdultOrAge ? randInt(18, 24) : 0);
    var id = state.nextAxolotlId++;
    var seed = Math.floor(Math.random() * 1000000);
    var variation = generateIndividualVariation(type, seed);
    
    var ax = {
      id: id,
      age: age,
      health: clamp(70 + randInt(-10, 10), 40, MAX_HEALTH),
      type: type,
      sex: Math.random() < 0.5 ? 'オス' : 'メス',
      shade: pickRandomShade(),
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
      seed: seed
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
      shade: ax.shade,
      parent1Id: parent1Id || null,
      parent2Id: parent2Id || null,
      removed: false
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
    state.tanks.push({
      id: 1,
      axolotl: createAxolotl(true, 'nomal', null, null),
      note: '親ウパ',
      baby: false
    });
    state.tanks.push({
      id: 2,
      axolotl: createAxolotl(true, 'nomal', null, null),
      note: '親ウパ',
      baby: false
    });
    state.tanks.push({
      id: 3,
      axolotl: null,
      note: '空き水槽',
      baby: false
    });
  }

  function tankName(index, tank) {
    if (tank.breedingPair) return '水槽' + (index + 1) + '（繁殖中）';
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
  var sizePriceTable = {
    nomal: [5500, 7400, 8900, 12700, 15800, 24800, 43000, 45000],
    albino: [5500, 7400, 8900, 12700, 15800, 24800, 38000, 40000],
    gold: [5900, 9200, 9400, 12700, 15800, 24800, 43000, 45000],
    marble: [5500, 7400, 8900, 12700, 15800, 24800, 38000, 40000],
    black: [13200, 13200, 13200, 13200, 16800, 26200, 43000, 45000],
    copper: [5500, 7400, 8900, 12700, 15800, 24800, 43000, 45000],
    goldblackeye: [8000, 12000, 15000, 20000, 28000, 40000, 60000, 65000],
    chimera: [10000, 15000, 20000, 28000, 35000, 50000, 80000, 90000]
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
    var repBonus = 0.7 + state.reputation / 150;
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
    if (ax.age < 12) return '不明';
    return ax.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>';
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
    
    var sexDisplay = displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '♂' : '♀') : '不明';
    nameEl.innerHTML = typeLabel(displayAx.type) + ' ' + (displayAx.age >= 12 ? (displayAx.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '不明');
    
    var sizeBand = sizeBandFromAge(displayAx.age);
    var bodyText = 
      'サイズ：' + sizeBandLabels[sizeBand] + '\n' +
      '年齢：' + displayAx.age + 'ヶ月\n' +
      '健康：' + Math.round(displayAx.health || 100) + '/100\n' +
      '空腹：' + Math.round(displayAx.hunger || 100) + '/100\n' +
      '色味：' + (shadeLabels[displayAx.shade] || '普通') + '\n' +
      '状態：' + (displayAx.injured ? '欠損' : '') + (displayAx.sick ? '病気' : '') + (displayAx.underTreatment ? '治療中' : '') + (!displayAx.injured && !displayAx.sick && !displayAx.underTreatment ? '健康' : '') + '\n' +
      '予想販売価格：' + formatMoney(calcPrice(displayAx));
    bodyEl.textContent = bodyText;
    
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
        noParentDiv.textContent = '親：不明（仕入れ・初期個体）';
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
      noFamilyDiv.textContent = '親：不明（仕入れ・初期個体）';
      familyEl.appendChild(noFamilyDiv);
    }
    
    $('axOverlayDetail').classList.add('visible');
  }

  function closeDetailModal() {
    $('axOverlayDetail').classList.remove('visible');
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
      logLine('空き水槽がないので、幼生を移動できない。');
      $('axOverlayJuvenile').classList.remove('visible');
      return;
    }
    
    var selected = available[Math.floor(Math.random() * available.length)];
    emptyTank.axolotl = selected;
    emptyTank.baby = selected.age < 4;
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

      var header = document.createElement('div');
      header.className = 'ax-tank-header';
      var nameEl = document.createElement('div');
      nameEl.className = 'ax-tank-name';
      nameEl.textContent = tankName(idx, tank);
      var tag = document.createElement('div');
      tag.className = 'ax-tank-tag';
      if (tank.breedingPair) tag.textContent = '繁殖中';
      else if (tank.egg) tag.textContent = '卵';
      else if (tank.juveniles && tank.juveniles.length > 0) tag.textContent = '幼生';
      else tag.textContent = tank.axolotl ? (tank.baby ? '子ウパ' : '成体') : '空き';
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
        var p1Sex = p1.age >= 12 ? (p1.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '不明';
        var p2Sex = p2.age >= 12 ? (p2.sex === 'オス' ? '<span style="color:#3b82f6;">♂</span>' : '<span style="color:#ef4444;">♀</span>') : '不明';
        lines.innerHTML = 
          '<div>' + typeLabel(p1.type) + ' ' + p1Sex + ' / ' + typeLabel(p2.type) + ' ' + p2Sex + '</div>' +
          '<div>齢: ' + p1.age + ' / ' + p2.age + '</div>' +
          '<div class="ax-health-bar-wrap"><div class="ax-health-bar"><div class="ax-health-bar-fill" style="width:' + Math.round(p1.health) + '%;background:' + getHealthBarColor(p1.health) + ';"></div></div><div class="ax-health-bar"><div class="ax-health-bar-fill" style="width:' + Math.round(p2.health) + '%;background:' + getHealthBarColor(p2.health) + ';"></div></div></div>' +
          '<div class="ax-hunger-bar-wrap"><div class="ax-hunger-bar"><div class="ax-hunger-bar-fill" style="width:' + Math.round(p1.hunger || 100) + '%"></div></div><div class="ax-hunger-bar"><div class="ax-hunger-bar-fill" style="width:' + Math.round(p2.hunger || 100) + '%"></div></div></div>' +
          '<div>あと' + months + 'ヶ月';
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
        lines.innerHTML =
          '<div>' + typeLabel(ax.type) + ' ' + sexDisplay + '</div>' +
          '<div>齢: ' + ax.age + '</div>' +
          '<div class="ax-health-bar-wrap"><div class="ax-health-bar"><div class="ax-health-bar-fill" style="width:' + Math.round(ax.health) + '%;background:' + getHealthBarColor(ax.health) + ';"></div></div></div>' +
          '<div class="ax-hunger-bar-wrap"><div class="ax-hunger-bar"><div class="ax-hunger-bar-fill" style="width:' + Math.round(ax.hunger || 100) + '%"></div></div></div>' +
          '<div>' + (ax.injured ? '欠損 ' : '') + (ax.sick ? '病気 ' : '') + (ax.underTreatment ? '治療中' : '') + '</div>';
        lines.classList.add('clickable');
        lines.dataset.axolotlId = String(ax.id);
        lines.addEventListener('click', function () {
          openDetailModal(parseInt(this.dataset.axolotlId, 10));
        });
      } else {
        lines.textContent = tank.note;
      }
      body.appendChild(lines);

      if (tank.breedingPair) {
        var pair = tank.breedingPair;
        var wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.gap = '4px';
        [pair[0], pair[1]].forEach(function (ax) {
          var sprite = document.createElement('img');
          var healthLevel = ax.health || 100;
          var animClass = '';
          if (!ax.injured && !ax.sick) {
            if (healthLevel < 50) animClass = ' slow';
            else if (healthLevel > 80) animClass = ' fast';
            else animClass = ' alive';
          }
          sprite.className = 'ax-axolotl-img ax-shade-' + (ax.shade || 'normal') + animClass;
          var imgSrc = generateAxolotlImage(ax);
          sprite.src = imgSrc;
          sprite.alt = typeLabel(ax.type);
          sprite.dataset.axolotlId = String(ax.id);
          sprite.style.filter = 'brightness(' + (ax.brightness || 1) + ') saturate(' + (ax.saturation || 1) + ')';
          sprite.addEventListener('click', function () {
            openDetailModal(parseInt(this.dataset.axolotlId, 10));
          });
          wrap.appendChild(sprite);
        });
        body.appendChild(wrap);
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
        if (!ax.injured && !ax.sick) {
          if (healthLevel < 50) animClass = ' slow';
          else if (healthLevel > 80) animClass = ' fast';
          else animClass = ' alive';
        }
        sprite.className = 'ax-axolotl-img ax-shade-' + (ax.shade || 'normal') + animClass;
        var imgSrc = generateAxolotlImage(ax);
        sprite.src = imgSrc;
        sprite.alt = typeLabel(ax.type);
        sprite.dataset.axolotlId = String(ax.id);
        sprite.style.filter = 'brightness(' + (ax.brightness || 1) + ') saturate(' + (ax.saturation || 1) + ')';
        sprite.addEventListener('click', function () {
          openDetailModal(parseInt(this.dataset.axolotlId, 10));
        });
        body.appendChild(sprite);
      }
      div.appendChild(body);

      var foot = document.createElement('div');
      foot.className = 'ax-tank-footer';
      if (tank.axolotl) {
        var price = calcPrice(tank.axolotl);
        var basePrice = calcBaseMarketPrice(tank.axolotl);
        var priceRatio = price / basePrice;
        foot.innerHTML = '';
        var priceSpan = document.createElement('span');
        priceSpan.textContent = '予想販売：' + formatMoney(price);
        // 相場より高い場合は色を変更（1.2倍以上で青、1.5倍以上で濃い青）
        if (priceRatio >= 1.5) {
          priceSpan.style.color = '#1e40af'; // 濃い青
          priceSpan.style.fontWeight = 'bold';
        } else if (priceRatio >= 1.2) {
          priceSpan.style.color = '#3b82f6'; // 青
        }
        foot.appendChild(priceSpan);
        var sellBtn = document.createElement('button');
        sellBtn.type = 'button';
        sellBtn.className = 'ax-tank-sell';
        sellBtn.textContent = '売る';
        sellBtn.dataset.tankIndex = String(idx);
        sellBtn.addEventListener('click', function () {
          actSellTank(parseInt(this.dataset.tankIndex, 10));
        });
        foot.appendChild(sellBtn);
      } else if (tank.breedingPair) {
        var separateBtn = document.createElement('button');
        separateBtn.type = 'button';
        separateBtn.className = 'ax-tank-sell';
        separateBtn.textContent = '離別';
        separateBtn.dataset.tankIndex = String(idx);
        separateBtn.addEventListener('click', function () {
          separateBreedingPair(parseInt(this.dataset.tankIndex, 10));
        });
        foot.innerHTML = '';
        foot.appendChild(separateBtn);
      } else if (tank.egg) {
        var eggPrice = Math.floor((tank.eggCount || 500) * 50); // 卵1個50円
        var sellEggBtn = document.createElement('button');
        sellEggBtn.type = 'button';
        sellEggBtn.className = 'ax-tank-sell';
        sellEggBtn.textContent = '卵を売る ' + formatMoney(eggPrice);
        sellEggBtn.dataset.tankIndex = String(idx);
        sellEggBtn.addEventListener('click', function () {
          sellEggs(parseInt(this.dataset.tankIndex, 10));
        });
        foot.innerHTML = '';
        foot.appendChild(sellEggBtn);
      } else if (tank.juveniles && tank.juveniles.length > 0) {
        var sellJuvenileBtn = document.createElement('button');
        sellJuvenileBtn.type = 'button';
        sellJuvenileBtn.className = 'ax-tank-sell';
        sellJuvenileBtn.textContent = '選ぶ/売る';
        sellJuvenileBtn.dataset.tankIndex = String(idx);
        sellJuvenileBtn.addEventListener('click', function () {
          openJuvenileSelectionModal(parseInt(this.dataset.tankIndex, 10));
        });
        foot.innerHTML = '';
        foot.appendChild(sellJuvenileBtn);
      } else {
        foot.textContent = tank.note || 'ここに新しいウパを入れられる。';
      }
      div.appendChild(foot);

      root.appendChild(div);
    });
  }

  function updateUI() {
    $('axDay').textContent = state.month + '月目';
    $('axMoney').textContent = formatMoney(state.money);
    $('axCleanBar').style.width = clamp(state.clean, 0, MAX_CLEAN) / MAX_CLEAN * 100 + '%';
    $('axRepBar').style.width = clamp(state.reputation, 0, MAX_REP) / MAX_REP * 100 + '%';

    var disabled = state.ended;
    $('btnNextMonth').disabled = disabled;
    $('btnFeedArtificial').disabled = disabled;
    $('btnFeedBloodworm').disabled = disabled;
    $('btnFeedEarthworm').disabled = disabled;
    $('btnClean').disabled = disabled;
    $('btnBreed').disabled = disabled;
    $('btnTreat').disabled = disabled;
    $('btnBuy').disabled = disabled;
    $('btnAddTank').disabled = disabled;

    updateTanksDOM();
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

  function resolveBreeding(tankIdx) {
    var tank = state.tanks[tankIdx];
    if (!tank || !tank.breedingPair) return;
    var pair = tank.breedingPair;
    var relationshipMeter = tank.relationshipMeter || 50; // 0-100
    var inbreedingCoeff = calculateInbreedingCoefficient(pair[0].id, pair[1].id);
    
    // 関係メーターに基づいて成功率を調整
    var baseSuccessRate = 0.7;
    var relationshipBonus = (relationshipMeter - 50) / 100; // -0.5 から +0.5
    
    // 近親交配度が高いと成功率が下がる、卵も生まれづらくなる
    var inbreedingPenalty = inbreedingCoeff / 200; // 最大-0.5
    var successRate = clamp(baseSuccessRate + relationshipBonus - inbreedingPenalty, 0.2, 0.95);
    var success = Math.random() < successRate;
    
    // 関係メーターが低いと大失敗の確率が上がる
    // 近親交配度が高いと大失敗の確率も上がる
    var baseBigFailChance = relationshipMeter < 30 ? 0.3 : (relationshipMeter < 50 ? 0.15 : 0.05);
    var inbreedingFailBonus = inbreedingCoeff / 200; // 最大+0.5
    var bigFailChance = clamp(baseBigFailChance + inbreedingFailBonus, 0.05, 0.6);
    
    if (success) {
      // 卵の数を決定（300-1000個）
      // 近親交配度が高いと卵の数が減る
      var baseEggCount = randInt(300, 1000);
      var eggCount = Math.floor(baseEggCount * (1 - inbreedingCoeff / 200)); // 最大50%減
      eggCount = Math.max(100, eggCount); // 最低100個
      
      tank.egg = true;
      tank.eggCount = eggCount;
      tank.eggParentTypes = [pair[0].type, pair[1].type];
      tank.eggParentIds = [pair[0].id, pair[1].id];
      tank.hatchMonthsLeft = 1;
      tank.breedingPair = null;
      tank.breedingMonthsLeft = null;
      tank.relationshipMeter = null;
      tank.note = '卵 ' + eggCount + '個（あと1ヶ月で孵化）';
      state.reputation = clamp(state.reputation + 3, 0, MAX_REP);
      logLine('繁殖に成功！水槽' + (tankIdx + 1) + 'に' + eggCount + '個の卵が産まれた。' + (inbreedingCoeff > 50 ? '（血が濃いため卵が少ない）' : ''));
    } else {
      var bigFail = Math.random() < bigFailChance;
      if (bigFail) {
        // 近親交配度が高いと死亡・欠損の確率が上がる
        var deathChance = 0.1 + (inbreedingCoeff / 200); // 最大0.6
        var injuryChance = 0.4 + (inbreedingCoeff / 200); // 最大0.9
        
        [0, 1].forEach(function (i) {
          var ax = pair[i];
          var roll = Math.random();
          if (roll < deathChance) {
            logLine(typeLabel(ax.type) + 'が繁殖中の事故で★になってしまった…' + (inbreedingCoeff > 50 ? '（血が濃すぎた）' : ''));
            state.reputation = clamp(state.reputation - 8, 0, MAX_REP);
            if (axolotlRegistry[ax.id]) {
              axolotlRegistry[ax.id].removed = true;
            }
            pair[i] = null;
          } else if (roll < deathChance + injuryChance) {
            ax.injured = true;
            logLine(typeLabel(ax.type) + 'が欠損を負った。値段が下がる。' + (inbreedingCoeff > 50 ? '（血が濃すぎた）' : ''));
          }
        });
        // nullを除去
        tank.breedingPair = pair.filter(function (ax) { return ax != null; });
        if (tank.breedingPair.length === 0) {
          tank.breedingPair = null;
          tank.breedingMonthsLeft = null;
          tank.relationshipMeter = null;
          tank.note = '空き水槽';
        } else if (tank.breedingPair.length === 1) {
          tank.axolotl = tank.breedingPair[0];
          tank.breedingPair = null;
          tank.breedingMonthsLeft = null;
          tank.relationshipMeter = null;
          tank.note = '親ウパ';
        }
      } else {
        logLine('繁殖に失敗した。' + (inbreedingCoeff > 50 ? '（血が濃すぎる）' : ''));
        // 失敗しても同じ水槽に残る（何もしない）
      }
    }
  }

  function countOccupiedTanks() {
    return state.tanks.filter(function (t) { return t.axolotl || t.breedingPair; }).length;
  }

  function checkAuction() {
    // オークションは低確率で発生（5%）
    if (Math.random() < 0.05) {
      var rareTypes = ['goldblackeye', 'chimera', 'copper', 'black'];
      var selectedType = rareTypes[Math.floor(Math.random() * rareTypes.length)];
      var basePrice = typePriceBase[selectedType] || 20000;
      var auctionPrice = basePrice * randInt(8, 15); // 8-15倍の価格
      state.auctionAvailable = true;
      state.auctionType = selectedType;
      state.auctionPrice = auctionPrice;
      logLine('【オークション】' + typeLabel(selectedType) + 'が' + formatMoney(auctionPrice) + 'で出品されています！仕入れ画面を確認してください。');
    } else {
      state.auctionAvailable = false;
      state.auctionType = null;
      state.auctionPrice = 0;
    }
  }

  function endOfMonthDrift() {
    state.clean = clamp(state.clean - (5 + state.tanks.length), 0, MAX_CLEAN);
    state.tanks.forEach(function (tank, idx) {
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
        tank.breedingMonthsLeft = (tank.breedingMonthsLeft || 0) - 1;
        if (tank.breedingMonthsLeft <= 0) {
          resolveBreeding(idx);
        } else {
          tank.note = '繁殖中（あと' + tank.breedingMonthsLeft + 'ヶ月・関係' + Math.round(tank.relationshipMeter || 50) + '）';
        }
        return;
      }
      if (tank.egg) {
        tank.hatchMonthsLeft = (tank.hatchMonthsLeft || 1) - 1;
        if (tank.hatchMonthsLeft <= 0) {
          var parentTypes = tank.eggParentTypes || ['nomal', 'nomal'];
          var parentIds = tank.eggParentIds || [null, null];
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
          tank.hatchMonthsLeft = null;
          tank.juveniles = [];
          tank.juvenileAge = 0; // 0ヶ月（孵化直後）
          
          // 幼生を生成（300-1000個から、種類ごとに確率で生成）
          for (var i = 0; i < Math.min(eggCount, 100); i++) { // 最大100匹まで表示
          var offspringResult;
          var inbreedingCoeff = calculateInbreedingCoefficient(parentIds[0], parentIds[1]);
          var parentTraitChance = 0.85 + (inbreedingCoeff / 100) * 0.1;
          
          if (Math.random() < parentTraitChance) {
            offspringResult = { type: parentTypes[Math.floor(Math.random() * parentTypes.length)], inbreedingCoeff: inbreedingCoeff };
          } else {
            offspringResult = pickOffspringType(parentTypes[0], parentTypes[1], parentIds[0], parentIds[1]);
          }
          var juvenile = createAxolotl(0, offspringResult.type, parentIds[0], parentIds[1], offspringResult.chimeraTypes);
          juvenile.inbreedingCoeff = offspringResult.inbreedingCoeff || 0;
            tank.juveniles.push(juvenile);
          }
          
          tank.note = '幼生 ' + eggCount + '匹（5ヶ月まで）';
          logLine('卵が孵化！' + eggCount + '匹の幼生が生まれた。5ヶ月まで死亡率が高い。');
        }
        return;
      }
      
      // 幼生の処理（5ヶ月まで）
      if (tank.juveniles && tank.juveniles.length > 0) {
        tank.juvenileAge = (tank.juvenileAge || 0) + 1;
        
        // 混雑度に基づいて死亡率を計算
        var crowdingFactor = tank.juveniles.length / 50; // 50匹を基準
        var baseDeathRate = 0.05; // 5%の基本死亡率
        
        // 近親交配度が高いと死亡率が上がる
        var avgInbreeding = 0;
        tank.juveniles.forEach(function (j) {
          if (j.inbreedingCoeff) avgInbreeding += j.inbreedingCoeff;
        });
        avgInbreeding = tank.juveniles.length > 0 ? avgInbreeding / tank.juveniles.length : 0;
        var inbreedingDeathBonus = avgInbreeding > 50 ? (avgInbreeding - 50) / 100 : 0; // 最大+0.5
        
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
      if (state.clean < 40) ax.health -= 12;
      else if (state.clean < 70) ax.health -= 6;
      if (ax.hunger < 30) ax.health -= 6;
      ax.health = clamp(ax.health, 0, MAX_HEALTH);
      // 近親交配度が高いと病気になりやすい
      var inbreedingCoeff = calculateInbreedingCoefficient(ax.parent1Id, ax.parent2Id);
      var sickChance = SICK_CHANCE_PER_MONTH;
      if (inbreedingCoeff > 50) {
        sickChance *= (1 + inbreedingCoeff / 100); // 最大2倍
      }
      
      if (!ax.sick && (state.clean < 40 || ax.hunger < 30) && Math.random() < sickChance) {
        ax.sick = true;
        logLine(typeLabel(ax.type) + 'のウパが病気になった。' + (inbreedingCoeff > 50 ? '（血が濃いため）' : ''));
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
      if (ax.age >= 4 && tank.baby) {
        tank.baby = false;
        tank.note = '育ったウパ';
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
    if (state.clean < 40) {
      state.reputation = clamp(state.reputation - 4, 0, MAX_REP);
    }
  }

  function nextMonth() {
    state.month += 1;
    checkAuction();
    endOfMonthDrift();
    checkEnd();
    updateUI();
  }

  function applyFeedToTanks(healthBonus, hungerBonus, cleanPenalty) {
    state.clean = clamp(state.clean - cleanPenalty, 0, MAX_CLEAN);
    state.tanks.forEach(function (tank) {
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
    });
  }

  function actFeedArtificial() {
    var occupied = countOccupiedTanks();
    if (occupied === 0) {
      logLine('エサをあげる対象の水槽がない。');
      return;
    }
    if (state.money < FEED_ARTIFICIAL_COST) {
      logLine('人工飼料代が足りない…。（¥1,500）');
      return;
    }
    state.money -= FEED_ARTIFICIAL_COST;
    applyFeedToTanks(FEED_ARTIFICIAL_HEALTH, FEED_ARTIFICIAL_HUNGER, FEED_ARTIFICIAL_DIRT * occupied);
    logLine('人工飼料をあげた。汚れ低・成長普通。');
    updateUI();
  }

  function actFeedBloodworm() {
    if (state.money < FEED_BLOODWORM_COST) {
      logLine('アカムシ代が足りない…。');
      return;
    }
    state.money -= FEED_BLOODWORM_COST;
    applyFeedToTanks(FEED_BLOODWORM_HEALTH, FEED_BLOODWORM_HUNGER, FEED_BLOODWORM_DIRT);
    logLine('アカムシをあげた。汚れ高・成長やや高（ブースト）。');
    updateUI();
  }

  function actFeedEarthworm() {
    if (state.money < FEED_EARTHWORM_COST) {
      logLine('ミミズ代が足りない…。');
      return;
    }
    state.money -= FEED_EARTHWORM_COST;
    applyFeedToTanks(FEED_EARTHWORM_HEALTH, FEED_EARTHWORM_HUNGER, FEED_EARTHWORM_DIRT);
    logLine('ミミズをあげた。汚れ中・成長最高（育成特化）。');
    updateUI();
  }

  function actClean() {
    if (state.money < WATER_CHANGE_COST) {
      logLine('水換えの費用が足りない…。');
      return;
    }
    state.money -= WATER_CHANGE_COST;
    state.clean = clamp(state.clean + 25, 0, MAX_CLEAN);
    logLine('水をかえた。水質が上がった。');
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
    logLine(typeName + 'のウパを' + formatMoney(price) + 'で販売した。');
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

  function fillBreedParent2Excluding(sel1, sel2, adults) {
    var aIdx = parseInt(sel1.value, 10);
    var parent1 = state.tanks[aIdx] && state.tanks[aIdx].axolotl;
    var parent1Sex = parent1 ? parent1.sex : null;
    sel2.innerHTML = '';
    adults.forEach(function (x) {
      if (x.idx === aIdx) return;
      if (parent1Sex && x.tank.axolotl.sex === parent1Sex) return;
      var opt = document.createElement('option');
      opt.value = String(x.idx);
      var sexSymbol = x.tank.axolotl.sex === 'オス' ? '♂' : '♀';
      opt.textContent = '水槽' + (x.idx + 1) + '（' + typeLabel(x.tank.axolotl.type) + ' ' + sexSymbol + '）';
      sel2.appendChild(opt);
    });
    var curB = parseInt(sel2.value, 10);
    if (curB === aIdx || [].slice.call(sel2.options).every(function (o) { return parseInt(o.value, 10) !== curB; })) {
      if (sel2.options.length) sel2.value = sel2.options[0].value;
    }
  }

  function openBreedOverlay() {
    var adults = getAdultTanks();
    var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (adults.length < 2 || !empty) {
      logLine('12ヶ月以上の成体2匹と空き水槽が必要だ。');
      return;
    }
    var hasMaleAndFemale = adults.some(function (a) {
      return adults.some(function (b) {
        return a.idx !== b.idx && a.tank.axolotl.sex !== b.tank.axolotl.sex;
      });
    });
    if (!hasMaleAndFemale) {
      logLine('交配にはオスとメスが1匹ずつ必要だ。');
      return;
    }
    var sel1 = $('axBreedParent1');
    var sel2 = $('axBreedParent2');
    sel1.innerHTML = '';
    adults.forEach(function (x) {
      var opt = document.createElement('option');
      opt.value = String(x.idx);
      var sexSymbol = x.tank.axolotl.sex === 'オス' ? '♂' : '♀';
      opt.textContent = '水槽' + (x.idx + 1) + '（' + typeLabel(x.tank.axolotl.type) + ' ' + sexSymbol + '）';
      sel1.appendChild(opt);
    });
    var last1 = state.lastBreedParent1;
    var last2 = state.lastBreedParent2;
    var validLast1 = adults.some(function (x) { return x.idx === last1; });
    var validLast2 = adults.some(function (x) { return x.idx === last2; }) && last1 !== last2;
    if (validLast1) {
      sel1.value = String(last1);
      fillBreedParent2Excluding(sel1, sel2, adults);
      if (validLast2 && last2 !== last1 && [].slice.call(sel2.options).some(function (o) { return o.value === String(last2); })) {
        sel2.value = String(last2);
      } else if (sel2.options.length) sel2.value = sel2.options[0].value;
    } else {
      var found = false;
      for (var i = 0; i < adults.length; i++) {
        sel1.value = String(adults[i].idx);
        fillBreedParent2Excluding(sel1, sel2, adults);
        if (sel2.options.length > 0) {
          sel2.value = sel2.options[0].value;
          found = true;
          break;
        }
      }
      if (!found && sel2.options.length) sel2.value = sel2.options[0].value;
    }
    $('axOverlayBreed').classList.add('visible');
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
    var daysLeft = randInt(30, 90);
    breedingTank.breedingPair = [ax1, ax2];
    breedingTank.breedingMonthsLeft = randInt(1, 3);
    breedingTank.relationshipMeter = 50; // 初期関係メーター
    breedingTank.note = '繁殖中（あと' + breedingTank.breedingMonthsLeft + 'ヶ月・関係50）';
    logLine('水槽' + (emptyIdx + 1) + 'に' + typeLabel(ax1.type) + 'と' + typeLabel(ax2.type) + 'を入れて繁殖を開始した。');
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

  function fillBuySizeList(selectedType, isAuction) {
    var list = $('axBuyTypeList');
    list.innerHTML = '';
    
    if (isAuction && state.auctionAvailable && state.auctionType === selectedType) {
      // オークションの場合は1つのみ表示
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ax-buy-type-btn ax-auction-btn';
      btn.innerHTML = '<img src="' + typeImagePath(selectedType) + '" alt="" class="ax-buy-type-img">' +
        '<span class="ax-buy-type-name">🔴 オークション出品</span>' +
        '<span class="ax-buy-type-price">' + formatMoney(state.auctionPrice) + '</span>';
      btn.dataset.type = selectedType;
      btn.dataset.band = '7'; // 成体
      btn.dataset.price = String(state.auctionPrice);
      btn.dataset.isAuction = 'true';
      if (state.money < state.auctionPrice) btn.disabled = true;
      btn.addEventListener('click', function () {
        doBuy(this.dataset.type, parseInt(this.dataset.band, 10), parseInt(this.dataset.price, 10), true);
      });
      list.appendChild(btn);
      return;
    }
    
    var bandPrices = sizePriceTable[selectedType] || sizePriceTable.nomal;
    for (var band = 0; band < sizeBandLabels.length; band++) {
      var price = bandPrices[band];
      if (!price) continue;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ax-buy-type-btn';
      btn.innerHTML = '<img src="' + typeImagePath(selectedType) + '" alt="" class="ax-buy-type-img">' +
        '<span class="ax-buy-type-name">' + sizeBandLabels[band] + '</span>' +
        '<span class="ax-buy-type-price">' + formatMoney(price) + '</span>';
      btn.dataset.type = selectedType;
      btn.dataset.band = String(band);
      btn.dataset.price = String(price);
      if (state.money < price) btn.disabled = true;
      btn.addEventListener('click', function () {
        doBuy(this.dataset.type, parseInt(this.dataset.band, 10), parseInt(this.dataset.price, 10), false);
      });
      list.appendChild(btn);
    }
  }

  function openBuyOverlay() {
    var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (!empty) {
      logLine('空き水槽がないので、新しいウパをお迎えできない。');
      return;
    }
    var tabsEl = $('axBuyTabs');
    tabsEl.innerHTML = '';
    
    // オークションがある場合は最初に表示
    if (state.auctionAvailable && state.auctionType) {
      var auctionTab = document.createElement('button');
      auctionTab.type = 'button';
      auctionTab.className = 'ax-buy-tab ax-auction-tab';
      auctionTab.innerHTML = '🔴 ' + typeLabel(state.auctionType) + ' !';
      auctionTab.dataset.type = state.auctionType;
      auctionTab.classList.add('active');
      auctionTab.addEventListener('click', function () {
        tabsEl.querySelectorAll('.ax-buy-tab').forEach(function (t) { t.classList.remove('active'); });
        auctionTab.classList.add('active');
        fillBuySizeList(state.auctionType, true);
      });
      tabsEl.appendChild(auctionTab);
    }
    
    AXO_TYPES_BUY.forEach(function (type, i) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'ax-buy-tab';
      tab.textContent = typeLabel(type);
      tab.dataset.type = type;
      if (i === 0 && !state.auctionAvailable) tab.classList.add('active');
      tab.addEventListener('click', function () {
        tabsEl.querySelectorAll('.ax-buy-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        fillBuySizeList(tab.dataset.type, false);
      });
      tabsEl.appendChild(tab);
    });
    
    if (state.auctionAvailable && state.auctionType) {
      fillBuySizeList(state.auctionType, true);
    } else {
      fillBuySizeList(AXO_TYPES_BUY[0], false);
    }
    $('axOverlayBuy').classList.add('visible');
  }

  function doBuy(type, sizeBand, price, isAuction) {
    var empty = state.tanks.find(function (t) { return !t.axolotl && !t.breedingPair && !t.egg && !t.juveniles; });
    if (!empty || state.money < price) {
      logLine('購入できません。');
      $('axOverlayBuy').classList.remove('visible');
      updateUI();
      return;
    }
    state.money -= price;
    var age = ageFromSizeBand(sizeBand);
    var ax = createAxolotl(age, type, null, null);
    empty.axolotl = ax;
    empty.baby = age < 4;
    empty.note = '仕入れたウパ';
    
    if (isAuction) {
      logLine('【オークション落札】' + typeLabel(type) + 'を' + formatMoney(price) + 'で購入した！');
      state.auctionAvailable = false;
      state.auctionType = null;
      state.auctionPrice = 0;
    } else {
      logLine(typeLabel(type) + ' ' + sizeBandLabels[sizeBand] + 'を1匹お迎えした。');
    }
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
      baby: false
    });
    logLine('新しい水槽を1つ増設した。');
    updateUI();
  }

  function resetGame() {
    state.month = 1;
    state.money = 50000;
    state.clean = 80;
    state.reputation = 30;
    state.ended = false;
    state.lastBreedParent1 = null;
    state.lastBreedParent2 = null;
    state.auctionAvailable = false;
    state.auctionType = null;
    state.auctionPrice = 0;
    initTanks();
    $('axLog').textContent = 'ショップを始めた。親ウパ2匹・水槽3つから。水とエサを整えよう。';
    $('axOverlayEnd').classList.remove('visible');
    $('axOverlayBreed').classList.remove('visible');
    $('axOverlayBuy').classList.remove('visible');
    $('axOverlayTreat').classList.remove('visible');
    $('axOverlayDetail').classList.remove('visible');
    $('axOverlayJuvenile').classList.remove('visible');
    updateUI();
  }

  $('btnNextMonth').addEventListener('click', function () {
    if (!state.ended) nextMonth();
  });
  $('btnFeedArtificial').addEventListener('click', function () {
    if (!state.ended) actFeedArtificial();
  });
  $('btnFeedBloodworm').addEventListener('click', function () {
    if (!state.ended) actFeedBloodworm();
  });
  $('btnFeedEarthworm').addEventListener('click', function () {
    if (!state.ended) actFeedEarthworm();
  });
  $('btnClean').addEventListener('click', function () {
    if (!state.ended) actClean();
  });
  $('btnBreed').addEventListener('click', function () {
    if (!state.ended) openBreedOverlay();
  });
  $('axBreedParent1').addEventListener('change', function () {
    fillBreedParent2Excluding($('axBreedParent1'), $('axBreedParent2'), getAdultTanks());
  });
  $('axBreedConfirm').addEventListener('click', function () {
    doBreed(parseInt($('axBreedParent1').value, 10), parseInt($('axBreedParent2').value, 10));
  });
  $('axBreedCancel').addEventListener('click', function () {
    $('axOverlayBreed').classList.remove('visible');
  });
  $('btnTreat').addEventListener('click', function () {
    if (!state.ended) openTreatmentOverlay();
  });
  $('axTreatCancel').addEventListener('click', function () {
    $('axOverlayTreat').classList.remove('visible');
  });
  $('btnBuy').addEventListener('click', function () {
    if (!state.ended) openBuyOverlay();
  });
  $('axBuyCancel').addEventListener('click', function () {
    $('axOverlayBuy').classList.remove('visible');
  });
  $('btnAddTank').addEventListener('click', function () {
    if (!state.ended) actAddTank();
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

  resetGame();
})();
