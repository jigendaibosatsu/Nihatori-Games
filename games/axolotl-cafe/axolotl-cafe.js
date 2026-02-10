(function () {
  'use strict';

  // ===== 定数定義 =====
  var STORAGE_KEY = 'axolotl-cafe-save';
  function getGachaCost() {
    var count = state.gachaPullCount || 0;
    return 100 * (count + 1);
  }
  var MAX_POOP_DISPLAY = 20;
  var POOP_BASE_RATE = 5.0; // 秒
  var COMPOST_REQUIRED_BASE = 10; // うんこ10個で肥料1個
  var FERTILIZER_VALUE_BASE = 20; // 肥料1個 = 20コイン
  var FARM_PROCESS_RATE_BASE = 0.5; // 個/秒

  // ウーパータイプ定義
  var AXO_TYPES = ['nomal', 'albino', 'gold', 'marble', 'black', 'chimera'];
  var typeLabels = {
    nomal: 'リューシ',
    albino: 'アルビノ',
    gold: 'ゴールド',
    marble: 'マーブル',
    black: 'ブラック',
    chimera: 'キメラ'
  };

  // ガチャ排出テーブル
  var gachaTable = [
    { type: 'nomal', rarity: 'C', weight: 50 },
    { type: 'albino', rarity: 'C', weight: 30 },
    { type: 'marble', rarity: 'C', weight: 15 },
    { type: 'gold', rarity: 'R', weight: 4 },
    { type: 'black', rarity: 'R', weight: 0.9 },
    { type: 'chimera', rarity: 'UR', weight: 0.1 }
  ];

  // レア度別のうんこ生成速度
  var rarityPoopRate = {
    'C': 5.0,
    'R': 4.0,
    'UR': 3.0
  };

  // レア度別の価値（店長ボーナス用）
  var rarityValue = {
    'C': 1,
    'R': 2,
    'UR': 5
  };

  // 店舗定義
  var shops = {
    rural: { name: '田舎店', revenueMultiplier: 1.0, unlockAt: 0 },
    koriyama: { name: '郡山店', revenueMultiplier: 1.5, unlockAt: 50000 },
    fukushima: { name: '福島店', revenueMultiplier: 2.5, unlockAt: 200000 }
  };

  // 画像パス（共通アセットを使用）
  var AXOLOTL_IMAGE_BASE = '/assets/axolotl/';
  function typeImagePath(t) {
    if (t === 'goldblackeye') return AXOLOTL_IMAGE_BASE + 'axo_gold.png';
    if (t === 'yellow') return AXOLOTL_IMAGE_BASE + 'axo_yellow.png';
    if (t === 'superblack') return AXOLOTL_IMAGE_BASE + 'axo_superblack.png';
    if (t === 'dalmatian') return AXOLOTL_IMAGE_BASE + 'axo_dalmatian.png';
    return AXOLOTL_IMAGE_BASE + 'axo_' + t + '.png';
  }

  // ===== ゲーム状態 =====
  var defaultState = {
    // 基本資源
    coins: 0,
    poopStorage: 0,
    fertilizer: 0,
    compostGauge: 0,
    
    // 店舗名（空なら「ウーパーカフェ」表示）
    cafeName: '',
    
    // ウーパー管理
    axolotls: [],
    managers: [],
    
    // 店舗
    currentShop: 'rural',
    totalRevenue: 0,
    unlockedShops: ['rural'],
    
    // アップグレード
    clickUpgradeLevel: 0,
    compostEfficiencyLevel: 0,
    farmLevel: 1,
    
    // 自動化フラグ
    autoPoopCollect: false,
    
    // ガチャ
    gachaPoints: 0,
    gachaPullCount: 0,
    
    // 図鑑
    managerEncyclopedia: {}
  };

  var state = JSON.parse(JSON.stringify(defaultState));

  // ===== ゲーム変数 =====
  var activePoops = []; // 画面上のうんこ配列
  var lastTick = Date.now();
  var nextAxolotlId = 1;
  var gameTickInterval = null;

  // ===== ユーティリティ =====
  function $(id) { return document.getElementById(id); }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  }

  function formatMoney(y) {
    return '¥' + y.toLocaleString('ja-JP');
  }

  // ===== セーブ/ロード =====
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('セーブ失敗:', e);
    }
  }

  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var loaded = JSON.parse(saved);
        state = Object.assign({}, defaultState, loaded);
        // マイグレーション処理
        if (!state.unlockedShops) {
          state.unlockedShops = ['rural'];
        }
        if (state.totalRevenue >= shops.koriyama.unlockAt && state.unlockedShops.indexOf('koriyama') === -1) {
          state.unlockedShops.push('koriyama');
        }
        if (state.totalRevenue >= shops.fukushima.unlockAt && state.unlockedShops.indexOf('fukushima') === -1) {
          state.unlockedShops.push('fukushima');
        }
      }
    } catch (e) {
      console.error('ロード失敗:', e);
    }
  }

  // ===== クリックシステム =====
  function handleClick(e) {
    var clickGain = 1 + state.clickUpgradeLevel;
    state.coins += clickGain;
    updateUI();
    
    // タップ位置にコイン画像＋数値を表示
    showCoinGain(clickGain, e);
  }

  function showCoinGain(amount, e) {
    var tankArea = $('cafeTankClickable');
    var rect = tankArea.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    if (e) {
      if (e.changedTouches && e.changedTouches.length > 0) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
      } else if (e.clientX != null) {
        x = e.clientX;
        y = e.clientY;
      }
    }
    var effect = document.createElement('div');
    effect.className = 'cafe-coin-gain-effect';
    effect.style.cssText = 'position:fixed; left:' + x + 'px; top:' + y + 'px; transform:translate(-50%,-50%); pointer-events:none; z-index:100; display:flex; align-items:center; gap:4px; font-weight:bold; font-size:18px; color:#22c55e; text-shadow:0 1px 2px rgba(0,0,0,0.3);';
    var img = document.createElement('img');
    img.src = '/assets/money/coin_32.png';
    img.alt = '';
    img.style.cssText = 'width:28px; height:28px; display:block; animation:cafe-coin-pop 0.3s ease;';
    var text = document.createElement('span');
    text.textContent = '+' + amount;
    text.style.animation = 'cafe-coin-pop 0.3s ease';
    effect.appendChild(img);
    effect.appendChild(text);
    document.body.appendChild(effect);
    setTimeout(function() {
      effect.style.transition = 'all 0.5s ease';
      effect.style.opacity = '0';
      effect.style.transform = 'translate(-50%, -50%) translateY(-40px) scale(1.1)';
      setTimeout(function() {
        if (effect.parentNode) document.body.removeChild(effect);
      }, 500);
    }, 10);
  }

  // ===== うんこ生成システム =====
  function generatePoop(deltaTime) {
    if (state.axolotls.length === 0) return;
    
    state.axolotls.forEach(function(ax) {
      if (!ax.lastPoopTime) ax.lastPoopTime = Date.now();
      
      var now = Date.now();
      var elapsed = (now - ax.lastPoopTime) / 1000; // 秒
      
      if (elapsed >= ax.poopRate) {
        // うんこ生成
        if (activePoops.length < MAX_POOP_DISPLAY) {
          createPoopOnScreen();
        } else {
          // 画面に表示できない場合は直接保管
          state.poopStorage++;
        }
        ax.lastPoopTime = now;
      }
    });
  }

  function createPoopOnScreen() {
    var poopArea = $('cafePoopArea');
    if (!poopArea) return;
    
    var poop = document.createElement('div');
    poop.className = 'cafe-poop';
    var x = Math.random() * (poopArea.offsetWidth - 24);
    var y = Math.random() * (poopArea.offsetHeight - 24);
    poop.style.left = x + 'px';
    poop.style.top = y + 'px';
    
    // うんこ画像を使用（共通アセット）
    var img = document.createElement('img');
    img.src = '/assets/unko.png';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    poop.appendChild(img);
    
    var poopId = Date.now() + Math.random();
    poop.dataset.poopId = poopId;
    
    // クリックとタッチの両方に対応
    poop.addEventListener('click', function() {
      collectPoop(poop);
    });
    poop.addEventListener('touchend', function(e) {
      e.preventDefault();
      collectPoop(poop);
    });
    
    activePoops.push({ id: poopId, element: poop });
    poopArea.appendChild(poop);
  }

  function collectPoop(poopElement) {
    if (!poopElement) return;
    
    poopElement.classList.add('collecting');
    state.poopStorage++;
    
    setTimeout(function() {
      if (poopElement.parentNode) {
        poopElement.parentNode.removeChild(poopElement);
      }
      // activePoopsから削除
      var poopId = poopElement.dataset.poopId;
      activePoops = activePoops.filter(function(p) { return p.id != poopId; });
    }, 300);
    
    updateUI();
  }

  function autoCollectPoop() {
    // 自動回収：画面上のうんこを全て回収
    var collected = 0;
    activePoops.forEach(function(poop) {
      if (poop.element && poop.element.parentNode) {
        state.poopStorage++;
        collected++;
        if (poop.element.parentNode) {
          poop.element.parentNode.removeChild(poop.element);
        }
      }
    });
    activePoops = [];
    
    if (collected > 0) {
      updateUI();
    }
  }

  // ===== 堆肥化システム =====
  function processCompost(deltaTime) {
    var requiredPoop = Math.max(5, COMPOST_REQUIRED_BASE - state.compostEfficiencyLevel);
    
    if (state.poopStorage >= requiredPoop) {
      state.poopStorage -= requiredPoop;
      state.fertilizer++;
      state.compostGauge = 0;
      updateUI();
    } else {
      // ゲージ更新
      state.compostGauge = (state.poopStorage / requiredPoop) * 100;
    }
  }

  // ===== 畑システム =====
  function processFarm(deltaTime) {
    if (state.fertilizer <= 0) return;
    
    var processRate = state.farmLevel * FARM_PROCESS_RATE_BASE; // 個/秒
    var fertilizerValue = FERTILIZER_VALUE_BASE + (state.farmLevel - 1) * 5;
    var processed = Math.min(state.fertilizer, processRate * deltaTime);
    
    if (processed > 0) {
      state.fertilizer -= processed;
      var coinsGained = processed * fertilizerValue;
      state.coins += coinsGained;
      state.totalRevenue += coinsGained;
      
      // 店舗解放チェック
      checkShopUnlock();
    }
  }

  // ===== 店舗システム =====
  function processShopRevenue(deltaTime) {
    if (state.managers.length === 0) return;
    
    var baseRevenue = 10; // 基本収益/秒
    var shop = shops[state.currentShop];
    if (!shop) return;
    
    var managerBonus = 1.0;
    state.managers.forEach(function(manager) {
      var ax = state.axolotls.find(function(a) { return a.id === manager.axolotlId; });
      if (ax) {
        managerBonus += 0.05 * rarityValue[ax.rarity];
      }
    });
    
    var revenue = baseRevenue * shop.revenueMultiplier * managerBonus * deltaTime;
    state.coins += revenue;
    state.totalRevenue += revenue;
    
    // 店長の貢献額を更新
    state.managers.forEach(function(manager) {
      if (!manager.totalRevenue) manager.totalRevenue = 0;
      var ax = state.axolotls.find(function(a) { return a.id === manager.axolotlId; });
      if (ax) {
        var share = revenue * (0.05 * rarityValue[ax.rarity] / managerBonus);
        manager.totalRevenue += share;
        
        // 図鑑にも反映
        if (state.managerEncyclopedia[manager.shopName]) {
          state.managerEncyclopedia[manager.shopName].forEach(function(entry) {
            if (entry.axolotl.id === ax.id) {
              if (!entry.totalRevenue) entry.totalRevenue = 0;
              entry.totalRevenue += share;
            }
          });
        }
      }
    });
  }

  function checkShopUnlock() {
    // 郡山店解放
    if (state.totalRevenue >= shops.koriyama.unlockAt && state.unlockedShops.indexOf('koriyama') === -1) {
      state.unlockedShops.push('koriyama');
      showNotification('【店舗解放】' + shops.koriyama.name + 'が解放されました！');
    }
    // 福島店解放
    if (state.totalRevenue >= shops.fukushima.unlockAt && state.unlockedShops.indexOf('fukushima') === -1) {
      state.unlockedShops.push('fukushima');
      showNotification('【店舗解放】' + shops.fukushima.name + 'が解放されました！');
    }
  }

  function showNotification(message) {
    // 簡易通知（後で改善可能）
    alert(message);
  }

  // ===== ガチャシステム =====
  function pullGacha() {
    var cost = getGachaCost();
    if (state.coins < cost) {
      alert('コインが足りません！');
      return null;
    }
    
    state.coins -= cost;
    state.gachaPullCount = (state.gachaPullCount || 0) + 1;
    
    // 排出テーブルから抽選
    var totalWeight = 0;
    gachaTable.forEach(function(item) {
      totalWeight += item.weight;
    });
    
    var roll = Math.random() * totalWeight;
    var currentWeight = 0;
    var selected = null;
    
    for (var i = 0; i < gachaTable.length; i++) {
      currentWeight += gachaTable[i].weight;
      if (roll <= currentWeight) {
        selected = gachaTable[i];
        break;
      }
    }
    
    if (!selected) selected = gachaTable[0];
    
    // ウーパー作成
    var axolotl = {
      id: nextAxolotlId++,
      type: selected.type,
      rarity: selected.rarity,
      poopRate: rarityPoopRate[selected.rarity],
      value: rarityValue[selected.rarity],
      lastPoopTime: Date.now()
    };
    
    // 重複チェック
    var existing = state.axolotls.find(function(a) { return a.type === axolotl.type; });
    var isDuplicate = !!existing;
    
    if (isDuplicate) {
      // 重複時はブリーダーポイント
      state.gachaPoints++;
    } else {
      state.axolotls.push(axolotl);
    }
    
    updateUI();
    saveState();
    
    return { axolotl: axolotl, isDuplicate: isDuplicate };
  }

  // ===== 委任システム =====
  function assignManager(axolotlId) {
    var ax = state.axolotls.find(function(a) { return a.id === axolotlId; });
    if (!ax) return;
    
    // 既に委任済みかチェック
    var existing = state.managers.find(function(m) { return m.axolotlId === axolotlId; });
    if (existing) {
      alert('このウーパーは既に店長です');
      return;
    }
    
    var manager = {
      axolotlId: axolotlId,
      shopName: state.currentShop,
      assignedAt: Date.now(),
      totalRevenue: 0
    };
    
    state.managers.push(manager);
    state.autoPoopCollect = true; // 自動回収ON
    
    // 図鑑に記録
    if (!state.managerEncyclopedia[state.currentShop]) {
      state.managerEncyclopedia[state.currentShop] = [];
    }
    state.managerEncyclopedia[state.currentShop].push({
      axolotl: ax,
      assignedAt: manager.assignedAt,
      totalRevenue: 0
    });
    
    updateUI();
    saveState();
    closeAssignModal();
  }

  // ===== アップグレードシステム =====
  function upgradeClick() {
    var cost = 100 * Math.pow(2, state.clickUpgradeLevel);
    if (state.coins < cost) {
      alert('コインが足りません！');
      return;
    }
    
    state.coins -= cost;
    state.clickUpgradeLevel++;
    updateUI();
    saveState();
  }

  function upgradeCompost() {
    var cost = 200 * Math.pow(2, state.compostEfficiencyLevel);
    if (state.coins < cost) {
      alert('コインが足りません！');
      return;
    }
    
    state.coins -= cost;
    state.compostEfficiencyLevel++;
    updateUI();
    saveState();
  }

  function upgradeFarm() {
    var cost = 500 * Math.pow(2, state.farmLevel - 1);
    if (state.coins < cost) {
      alert('コインが足りません！');
      return;
    }
    
    state.coins -= cost;
    state.farmLevel++;
    updateUI();
    saveState();
  }

  // ===== UI更新 =====
  function updateUI() {
    // 店舗名（タイトル）
    var titleEl = $('cafeTitle');
    if (titleEl) {
      titleEl.textContent = (state.cafeName && state.cafeName.trim()) ? state.cafeName.trim() : 'ウーパーカフェ';
    }
    // リソース表示
    var coinsEl = $('cafeCoins');
    if (coinsEl) {
      coinsEl.innerHTML = '<img src="/assets/money/coin_32.png" style="width:16px;height:16px;vertical-align:middle;margin-right:2px;" />' + formatNumber(state.coins);
    }
    $('cafeFertilizer').textContent = formatNumber(state.fertilizer);
    $('cafePoop').textContent = formatNumber(state.poopStorage);
    
    // 堆肥化ゲージ
    var requiredPoop = Math.max(5, COMPOST_REQUIRED_BASE - state.compostEfficiencyLevel);
    var gaugePercent = Math.min(100, (state.poopStorage / requiredPoop) * 100);
    $('cafeCompostBar').style.width = gaugePercent + '%';
    $('cafeCompostText').textContent = state.poopStorage + ' / ' + requiredPoop;
    
    // 水槽のウーパー表示
    updateTankVisual();
    
    // ボタン有効/無効
    $('btnGacha').disabled = state.coins < getGachaCost();
    var gc = $('gachaCost');
    if (gc) gc.textContent = '¥' + getGachaCost();
    var gp = $('btnGachaPull');
    if (gp) gp.textContent = '1回引く (¥' + getGachaCost() + ')';
    var gachaDesc = document.getElementById('gachaDesc');
    if (gachaDesc) gachaDesc.textContent = getGachaCost() + 'コインでウーパーを引けます（回数で価格上昇）';
  }

  function updateTankVisual() {
    var tankVisual = $('cafeTankVisual');
    if (!tankVisual) return;
    
    tankVisual.innerHTML = '';
    
    if (state.axolotls.length === 0) {
      // 初期ウーパーがいない場合はデフォルト表示
      var defaultText = document.createElement('div');
      defaultText.textContent = 'ガチャでウーパーを引こう！';
      defaultText.style.fontSize = '12px';
      defaultText.style.color = '#64748b';
      tankVisual.appendChild(defaultText);
    } else {
      // 最初のウーパーを表示（または店長）
      var displayAx = state.axolotls[0];
      if (state.managers.length > 0) {
        var managerAx = state.axolotls.find(function(a) {
          return state.managers.some(function(m) { return m.axolotlId === a.id; });
        });
        if (managerAx) displayAx = managerAx;
      }
      
      var img = document.createElement('img');
      img.src = typeImagePath(displayAx.type);
      img.className = 'cafe-axolotl-img';
      img.alt = typeLabels[displayAx.type];
      tankVisual.appendChild(img);
    }
  }

  // ===== モーダル管理 =====
  function openGachaModal() {
    // 結果をクリア
    $('gachaResult').innerHTML = '';
    $('overlayGacha').classList.add('visible');
  }

  function closeGachaModal() {
    $('overlayGacha').classList.remove('visible');
  }

  function openAssignModal() {
    var list = $('assignList');
    list.innerHTML = '';
    
    if (state.axolotls.length === 0) {
      list.innerHTML = '<p>ウーパーがいません。ガチャで引いてください。</p>';
      return;
    }
    
    state.axolotls.forEach(function(ax) {
      var isManager = state.managers.some(function(m) { return m.axolotlId === ax.id; });
      
      var card = document.createElement('div');
      card.style.padding = '8px';
      card.style.border = '2px solid #bae6fd';
      card.style.borderRadius = '8px';
      card.style.marginBottom = '8px';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '8px';
      
      var img = document.createElement('img');
      img.src = typeImagePath(ax.type);
      img.style.width = '48px';
      img.style.height = '48px';
      img.style.imageRendering = 'pixelated';
      card.appendChild(img);
      
      var info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = '<div style="font-weight:bold;">' + typeLabels[ax.type] + '</div>' +
                       '<div style="font-size:10px; color:#64748b;">レア度: ' + ax.rarity + '</div>';
      card.appendChild(info);
      
      if (isManager) {
        var badge = document.createElement('span');
        badge.textContent = '店長';
        badge.style.background = '#fbbf24';
        badge.style.color = '#fff';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '4px';
        badge.style.fontSize = '10px';
        card.appendChild(badge);
      } else {
        var btn = document.createElement('button');
        btn.textContent = '委任';
        btn.className = 'btn';
        btn.style.fontSize = '12px';
        btn.style.padding = '6px 12px';
        btn.addEventListener('click', function() {
          assignManager(ax.id);
        });
        card.appendChild(btn);
      }
      
      list.appendChild(card);
    });
    
    $('overlayAssign').classList.add('visible');
  }

  function closeAssignModal() {
    $('overlayAssign').classList.remove('visible');
  }

  function openUpgradeModal() {
    var list = $('upgradeList');
    list.innerHTML = '';
    
    // クリック強化
    var clickCard = createUpgradeCard(
      'クリック強化',
      'クリックで獲得できるコインが+1増えます',
      state.clickUpgradeLevel,
      100 * Math.pow(2, state.clickUpgradeLevel),
      upgradeClick
    );
    list.appendChild(clickCard);
    
    // 堆肥化効率
    var compostCard = createUpgradeCard(
      '堆肥化効率',
      '肥料生成に必要なうんこ数が-1減ります（最小5個）',
      state.compostEfficiencyLevel,
      200 * Math.pow(2, state.compostEfficiencyLevel),
      upgradeCompost
    );
    list.appendChild(compostCard);
    
    // 畑拡張
    var farmCard = createUpgradeCard(
      '畑拡張',
      '肥料処理速度と価値が上がります',
      state.farmLevel,
      500 * Math.pow(2, state.farmLevel - 1),
      upgradeFarm
    );
    list.appendChild(farmCard);
    
    $('overlayUpgrade').classList.add('visible');
  }

  function createUpgradeCard(name, desc, level, cost, onClick) {
    var card = document.createElement('div');
    card.className = 'upgrade-card';
    
    var header = document.createElement('div');
    header.className = 'upgrade-card-header';
    var nameEl = document.createElement('div');
    nameEl.className = 'upgrade-card-name';
    nameEl.textContent = name;
    var levelEl = document.createElement('div');
    levelEl.className = 'upgrade-card-level';
    levelEl.textContent = 'Lv' + level;
    header.appendChild(nameEl);
    header.appendChild(levelEl);
    card.appendChild(header);
    
    var descEl = document.createElement('div');
    descEl.className = 'upgrade-card-desc';
    descEl.textContent = desc;
    card.appendChild(descEl);
    
    var costEl = document.createElement('div');
    costEl.className = 'upgrade-card-cost';
    costEl.textContent = 'コスト: ' + formatMoney(cost);
    card.appendChild(costEl);
    
    var btn = document.createElement('button');
    btn.textContent = '購入';
    btn.className = 'btn';
    btn.style.width = '100%';
    btn.style.marginTop = '8px';
    btn.disabled = state.coins < cost;
    btn.addEventListener('click', onClick);
    card.appendChild(btn);
    
    return card;
  }

  function closeUpgradeModal() {
    $('overlayUpgrade').classList.remove('visible');
  }

  function changeCafeName() {
    var current = (state.cafeName && state.cafeName.trim()) ? state.cafeName.trim() : 'ウーパーカフェ';
    var name = window.prompt('店舗名を入力してください', current);
    if (name != null && name.trim() !== '') {
      state.cafeName = name.trim();
      updateUI();
      saveState();
      if ($('overlayShop').classList.contains('visible')) {
        openShopModal();
      }
    }
  }

  function openShopModal() {
    var info = $('shopInfo');
    info.innerHTML = '';
    
    var displayName = (state.cafeName && state.cafeName.trim()) ? state.cafeName.trim() : 'ウーパーカフェ';
    var html = '<p><strong>店舗名:</strong> ' + displayName + ' <button type="button" class="btn" style="font-size:11px; padding:4px 8px; margin-left:8px;" id="btnChangeCafeName">変更</button></p>';
    
    var currentShop = shops[state.currentShop];
    html += '<p><strong>現在の店舗:</strong> ' + currentShop.name + '</p>';
    html += '<p><strong>累計売上:</strong> ' + formatMoney(state.totalRevenue) + '</p>';
    html += '<p><strong>店長数:</strong> ' + state.managers.length + '人</p>';
    
    html += '<div style="margin-top:16px;"><strong>解放済み店舗:</strong><ul style="text-align:left; margin-top:8px;">';
    state.unlockedShops.forEach(function(shopKey) {
      var shop = shops[shopKey];
      var isCurrent = shopKey === state.currentShop;
      html += '<li style="margin-bottom:4px;">';
      html += shop.name + (isCurrent ? ' <span style="color:#22c55e;">(現在)</span>' : '');
      if (!isCurrent) {
        html += ' <button class="btn" style="font-size:10px; padding:4px 8px;" onclick="switchShop(\'' + shopKey + '\')">切り替え</button>';
      }
      html += '</li>';
    });
    html += '</ul></div>';
    
    info.innerHTML = html;
    var btnChangeName = document.getElementById('btnChangeCafeName');
    if (btnChangeName) btnChangeName.addEventListener('click', changeCafeName);
    $('overlayShop').classList.add('visible');
  }

  function closeShopModal() {
    $('overlayShop').classList.remove('visible');
  }

  function switchShop(shopKey) {
    if (state.unlockedShops.indexOf(shopKey) === -1) {
      alert('この店舗はまだ解放されていません');
      return;
    }
    state.currentShop = shopKey;
    showNotification(shops[shopKey].name + 'に切り替えました');
    updateUI();
    saveState();
    closeShopModal();
  }

  function openEncyclopediaModal() {
    var content = $('encyclopediaContent');
    content.innerHTML = '';
    
    if (Object.keys(state.managerEncyclopedia).length === 0) {
      content.innerHTML = '<p>まだ店長がいません。</p>';
    } else {
      Object.keys(state.managerEncyclopedia).forEach(function(shopKey) {
        var shop = shops[shopKey];
        var managers = state.managerEncyclopedia[shopKey];
        
        var section = document.createElement('div');
        section.style.marginBottom = '16px';
        section.style.padding = '12px';
        section.style.border = '2px solid #bae6fd';
        section.style.borderRadius = '8px';
        
        var title = document.createElement('h3');
        title.textContent = shop.name;
        title.style.fontSize = '14px';
        title.style.marginBottom = '8px';
        section.appendChild(title);
        
        managers.forEach(function(entry) {
          var item = document.createElement('div');
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.gap = '8px';
          item.style.marginBottom = '4px';
          
          var img = document.createElement('img');
          img.src = typeImagePath(entry.axolotl.type);
          img.style.width = '32px';
          img.style.height = '32px';
          img.style.imageRendering = 'pixelated';
          item.appendChild(img);
          
          var text = document.createElement('div');
          text.innerHTML = typeLabels[entry.axolotl.type] + ' (' + entry.axolotl.rarity + ')<br>' +
                          '<span style="font-size:10px; color:#64748b;">貢献: ' + formatMoney(Math.floor(entry.totalRevenue || 0)) + '</span>';
          item.appendChild(text);
          
          section.appendChild(item);
        });
        
        content.appendChild(section);
      });
    }
    
    $('overlayEncyclopedia').classList.add('visible');
  }

  function closeEncyclopediaModal() {
    $('overlayEncyclopedia').classList.remove('visible');
  }

  // ===== ゲームループ =====
  function gameTick() {
    var now = Date.now();
    var deltaTime = (now - lastTick) / 1000; // 秒単位
    
    // 1. ウーパーのうんこ生成
    generatePoop(deltaTime);
    
    // 2. 自動回収（委任時）
    if (state.autoPoopCollect) {
      autoCollectPoop();
    }
    
    // 3. 堆肥化処理
    processCompost(deltaTime);
    
    // 4. 畑で肥料→コイン変換
    processFarm(deltaTime);
    
    // 5. 店舗収益（裏で自動）
    processShopRevenue(deltaTime);
    
    updateUI();
    lastTick = now;
  }

  // ===== イベントリスナー =====
  function initEventListeners() {
    // 店舗名タップで変更
    var titleEl = $('cafeTitle');
    if (titleEl) {
      titleEl.style.cursor = 'pointer';
      titleEl.title = 'タップで店舗名を変更';
      titleEl.addEventListener('click', function() { changeCafeName(); });
    }
    // クリック（タッチにも対応）
    var tankClickable = $('cafeTankClickable');
    tankClickable.addEventListener('click', function(e) { handleClick(e); });
    tankClickable.addEventListener('touchend', function(e) {
      e.preventDefault();
      handleClick(e);
    });
    
    // ガチャ
    $('btnGacha').addEventListener('click', function() {
      openGachaModal();
    });
    
    $('btnGachaPull').addEventListener('click', function() {
      var result = pullGacha();
      if (result) {
        var resultDiv = $('gachaResult');
        resultDiv.innerHTML = '';
        var card = document.createElement('div');
        card.className = 'gacha-result-card gacha-result-rarity-' + result.axolotl.rarity;
        
        if (result.isDuplicate) {
          var dupMsg = document.createElement('div');
          dupMsg.style.color = '#f59e0b';
          dupMsg.style.fontWeight = 'bold';
          dupMsg.style.marginBottom = '8px';
          dupMsg.textContent = '重複！ブリーダーポイント +1';
          card.appendChild(dupMsg);
        }
        
        var img = document.createElement('img');
        img.src = typeImagePath(result.axolotl.type);
        img.style.width = '64px';
        img.style.height = '64px';
        img.style.imageRendering = 'pixelated';
        card.appendChild(img);
        var name = document.createElement('div');
        name.style.fontWeight = 'bold';
        name.style.marginTop = '8px';
        name.textContent = typeLabels[result.axolotl.type] + ' (' + result.axolotl.rarity + ')';
        card.appendChild(name);
        
        if (result.isDuplicate) {
          var dupNote = document.createElement('div');
          dupNote.style.fontSize = '10px';
          dupNote.style.color = '#64748b';
          dupNote.style.marginTop = '4px';
          dupNote.textContent = '（既に所持しているため追加されませんでした）';
          card.appendChild(dupNote);
        }
        
        resultDiv.appendChild(card);
        updateUI();
      }
    });
    
    $('btnGachaClose').addEventListener('click', closeGachaModal);
    
    // 委任
    $('btnAssign').addEventListener('click', openAssignModal);
    $('btnAssignClose').addEventListener('click', closeAssignModal);
    
    // アップグレード
    $('btnUpgrade').addEventListener('click', openUpgradeModal);
    $('btnUpgradeClose').addEventListener('click', closeUpgradeModal);
    
    // 店舗
    $('btnShop').addEventListener('click', openShopModal);
    $('btnShopClose').addEventListener('click', closeShopModal);
    
    // 図鑑
    $('btnEncyclopedia').addEventListener('click', openEncyclopediaModal);
    $('btnEncyclopediaClose').addEventListener('click', closeEncyclopediaModal);
  }

  // ===== 初期化 =====
  function init() {
    loadState();
    
    initEventListeners();
    updateUI();
    
    // ゲームループ開始（1秒ごと）
    lastTick = Date.now();
    var saveCounter = 0;
    gameTickInterval = setInterval(function() {
      gameTick();
      // 5秒ごとにセーブ
      saveCounter++;
      if (saveCounter >= 5) {
        saveState();
        saveCounter = 0;
      }
    }, 1000);
    
    // ウィンドウを閉じる前にセーブ
    window.addEventListener('beforeunload', saveState);
  }

  // グローバルに公開
  window.switchShop = switchShop;
  window.changeCafeName = changeCafeName;

  // 初期化実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
