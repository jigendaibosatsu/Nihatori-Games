(function () {
  'use strict';

  // ====== 状態 ======
  var state = {
    soft: 0,
    dense: 0,
    radiant: 0,
    slots: [null, null, null],
    activeSlot: 0,
    discovered: {}, // id -> true
    currentSoulId: null,
    tickAccum: 0
  };

  // 放置生成
  var TICK_MS = 2500;
  var SOFT_PER_TICK = 1;
  var DENSE_CHANCE = 0.35;
  var RADIANT_CHANCE = 0.08;

  // ====== レシピ定義 ======
  // key: "soft-soft-dense" のような形（null はスキップ）
  var RECIPES = {
    'soft-soft-soft': {
      id: 'gentle-wisp',
      name: 'やわらかな灯',
      rarity: 'common',
      flavor: 'だれかの小さな「うれしい」が、ぼんやりとした灯になったもの。',
      bonus: { softRate: 0.15 }
    },
    'soft-soft-dense': {
      id: 'memory-guardian',
      name: '記憶の番犬',
      rarity: 'rare',
      flavor: '大切な日を忘れないように、玄関の前でじっと見守ってくれる魂。',
      bonus: { denseChance: 0.1 }
    },
    'soft-dense-dense': {
      id: 'flower-spirit',
      name: '花守りの精霊',
      rarity: 'rare',
      flavor: 'しおれた花びらをあつめて、もう一度だけ咲かせることができる。',
      bonus: { softPerTick: 0.5 }
    },
    'dense-dense-radiant': {
      id: 'half-goddess',
      name: '半神の魂',
      rarity: 'epic',
      flavor: 'まだ人の温度を残したまま、神話の入り口に立っている存在。',
      bonus: { radiantChance: 0.05 }
    },
    'soft-radiant-radiant': {
      id: 'starlight-maiden',
      name: '星灯りの巫女',
      rarity: 'epic',
      flavor: '夜ふかしの友だち。あなたが眠るまで、星を数えてくれる。',
      bonus: { allRate: 0.1 }
    },
    'dense-radiant-radiant': {
      id: 'mythic-goddess',
      name: '神話級の女神',
      rarity: 'mythic',
      flavor: '遠い昔、だれかが願った「いつか幸せになりますように」の結晶体。',
      bonus: { allRate: 0.2, radiantChance: 0.1 }
    },
    'dense-dense-dense': {
      id: 'cracked-guardian',
      name: 'ひび割れた守護像',
      rarity: 'common',
      flavor: '守りきれなかった想いが、そのまま石像になってしまったもの。',
      bonus: {}
    },
    'radiant-radiant-radiant': {
      id: 'fallen-star',
      name: '落星の残響',
      rarity: 'mythic',
      flavor: '願いごとが多すぎて、空からこぼれ落ちた星のなれの果て。',
      bonus: { radiantChance: 0.15 }
    }
  };

  var RARITY_LABEL = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    mythic: 'Mythic'
  };

  // グローバルボーナス
  var bonuses = {
    softRate: 0,
    softPerTick: 0,
    denseChance: 0,
    radiantChance: 0,
    allRate: 0
  };

  // ====== ユーティリティ ======
  function fmtInt(n) {
    return Math.floor(n).toLocaleString('ja-JP');
  }

  function normalizeKey(slots) {
    // null は無視して、有効な順番で key を作る
    var filtered = slots.filter(function (s) { return !!s; });
    if (!filtered.length) return '';
    return filtered.join('-');
  }

  function applyBonus(bonus) {
    if (!bonus) return;
    if (bonus.softRate) bonuses.softRate += bonus.softRate;
    if (bonus.softPerTick) bonuses.softPerTick += bonus.softPerTick;
    if (bonus.denseChance) bonuses.denseChance += bonus.denseChance;
    if (bonus.radiantChance) bonuses.radiantChance += bonus.radiantChance;
    if (bonus.allRate) bonuses.allRate += bonus.allRate;
  }

  function computeRates() {
    var softRate = 1 + bonuses.softRate + bonuses.allRate;
    var denseChance = DENSE_CHANCE + bonuses.denseChance;
    var radiantChance = RADIANT_CHANCE + bonuses.radiantChance;
    return {
      softPerTick: SOFT_PER_TICK * softRate + bonuses.softPerTick,
      denseChance: Math.max(0, Math.min(0.7, denseChance)),
      radiantChance: Math.max(0, Math.min(0.35, radiantChance))
    };
  }

  // ====== DOM ======
  var elSoft, elDense, elRadiant;
  var elSlots;
  var elMessage;
  var elCurrentName, elCurrentFlavor, elCurrentRarity;
  var elDex;

  function cacheDom() {
    elSoft = document.getElementById('sa-soft');
    elDense = document.getElementById('sa-dense');
    elRadiant = document.getElementById('sa-radiant');
    elSlots = document.getElementById('sa-slots');
    elMessage = document.getElementById('sa-message');
    elCurrentName = document.getElementById('sa-current-name');
    elCurrentFlavor = document.getElementById('sa-current-flavor');
    elCurrentRarity = document.getElementById('sa-current-rarity');
    elDex = document.getElementById('sa-dex');
  }

  function renderStats() {
    elSoft.textContent = fmtInt(state.soft);
    elDense.textContent = fmtInt(state.dense);
    elRadiant.textContent = fmtInt(state.radiant);
  }

  function renderSlots() {
    var children = elSlots.querySelectorAll('.sa-slot');
    children.forEach(function (btn, idx) {
      var valueSpan = btn.querySelector('.sa-slot-value');
      var v = state.slots[idx];
      var label;
      if (!v) {
        label = '空';
      } else if (v === 'soft') {
        label = '淡い魂';
      } else if (v === 'dense') {
        label = '濃い魂';
      } else {
        label = '輝く魂';
      }
      valueSpan.textContent = label;
      if (idx === state.activeSlot) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function showMessage(text, kind) {
    elMessage.textContent = text || '';
    elMessage.classList.remove('positive', 'negative');
    if (kind === 'positive') elMessage.classList.add('positive');
    else if (kind === 'negative') elMessage.classList.add('negative');
  }

  function rarityColor(rarity) {
    if (rarity === 'rare') return 'var(--sa-rarity-rare)';
    if (rarity === 'epic') return 'var(--sa-rarity-epic)';
    if (rarity === 'mythic') return 'var(--sa-rarity-mythic)';
    return 'var(--sa-rarity-common)';
  }

  function renderCurrentSoul(soul) {
    if (!soul) {
      elCurrentRarity.textContent = 'Common';
      elCurrentRarity.style.color = rarityColor('common');
      elCurrentName.textContent = 'まだ何も生まれていません';
      elCurrentFlavor.textContent = '合成に成功すると、ここに新しい魂が飾られます。';
      return;
    }
    elCurrentRarity.textContent = RARITY_LABEL[soul.rarity] || 'Unknown';
    elCurrentRarity.style.color = rarityColor(soul.rarity);
    elCurrentName.textContent = soul.name;
    elCurrentFlavor.textContent = soul.flavor;
  }

  function renderDex() {
    var ids = Object.keys(state.discovered);
    if (!ids.length) {
      elDex.innerHTML = '<div class="sa-dex-item sa-dex-empty">まだ記録された魂はありません。</div>';
      return;
    }
    // 決まった順序で並べる
    ids.sort();
    var html = '';
    ids.forEach(function (id) {
      var soul;
      Object.keys(RECIPES).forEach(function (key) {
        var r = RECIPES[key];
        if (r.id === id) soul = r;
      });
      if (!soul) return;
      html +=
        '<article class="sa-dex-item">' +
          '<div class="sa-dex-row">' +
            '<div class="sa-dex-name">' + soul.name + '</div>' +
            '<div class="sa-dex-rarity" data-rarity="' + soul.rarity + '">' +
              (RARITY_LABEL[soul.rarity] || soul.rarity) +
            '</div>' +
          '</div>' +
          '<div class="sa-dex-flavor">' + soul.flavor + '</div>' +
        '</article>';
    });
    elDex.innerHTML = html;
  }

  // ====== 合成処理 ======
  function consumeResource(kind) {
    if (kind === 'soft') {
      if (state.soft <= 0) return false;
      state.soft--;
      return true;
    }
    if (kind === 'dense') {
      if (state.dense <= 0) return false;
      state.dense--;
      return true;
    }
    if (kind === 'radiant') {
      if (state.radiant <= 0) return false;
      state.radiant--;
      return true;
    }
    return false;
  }

  function synthesize() {
    var key = normalizeKey(state.slots);
    if (!key) {
      showMessage('まずはスロットに魂のかけらを入れてください。', 'negative');
      return;
    }

    // リソースを消費（足りないときは失敗）
    var counts = { soft: 0, dense: 0, radiant: 0 };
    state.slots.forEach(function (k) {
      if (k) counts[k]++;
    });
    if (counts.soft > state.soft || counts.dense > state.dense || counts.radiant > state.radiant) {
      showMessage('かけらが足りません。少し放置して集めましょう。', 'negative');
      return;
    }
    // 消費
    Object.keys(counts).forEach(function (k) {
      for (var i = 0; i < counts[k]; i++) consumeResource(k);
    });

    var soul = RECIPES[key];

    if (!soul) {
      // 失敗パターン: ひび割れた欠片を見つける演出にする
      showMessage('合成は失敗しましたが、ひび割れた魂のかけらが床に落ちた…。', 'negative');
      state.dense += 0; // バランス上、ここでは何も増やさない
      renderStats();
      return;
    }

    state.currentSoulId = soul.id;
    state.discovered[soul.id] = true;
    applyBonus(soul.bonus);
    renderCurrentSoul(soul);
    renderDex();
    renderStats();

    // スロットをリセット
    state.slots = [null, null, null];
    renderSlots();

    var msg;
    if (soul.rarity === 'mythic') {
      msg = '神話級の魂が生まれました。アトリエ全体に静かなざわめきが広がります。';
    } else if (soul.rarity === 'epic') {
      msg = 'とても強い気配の魂が生まれました。放置効率にも良い影響がありそうです。';
    } else if (soul.rarity === 'rare') {
      msg = '新しい魂が目をひらきました。図鑑に記録されました。';
    } else {
      msg = '小さな魂がふわりと浮かび上がりました。';
    }
    showMessage(msg, 'positive');
  }

  // ====== イベントバインド ======
  function bindEvents() {
    // スロット選択
    elSlots.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.sa-slot');
      if (!btn) return;
      var idx = parseInt(btn.dataset.index, 10);
      if (isNaN(idx)) return;
      state.activeSlot = idx;
      renderSlots();
    });

    // リソース選択
    document.querySelectorAll('.sa-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var res = chip.dataset.res;
        if (!res) return;
        state.slots[state.activeSlot] = res;
        renderSlots();
      });
    });

    // 合成
    var btnSynth = document.getElementById('sa-btn-synthesize');
    if (btnSynth) {
      btnSynth.addEventListener('click', function () {
        synthesize();
      });
    }

    // スロットクリア
    var btnClear = document.getElementById('sa-btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        state.slots = [null, null, null];
        renderSlots();
        showMessage('スロットを空にしました。', null);
      });
    }
  }

  // ====== 放置生成 ======
  function tick() {
    var rates = computeRates();
    state.soft += rates.softPerTick;
    var r = Math.random();
    if (r < rates.radiantChance) {
      state.radiant += 1;
    } else if (r < rates.radiantChance + rates.denseChance) {
      state.dense += 1;
    }
    renderStats();
  }

  function startLoop() {
    setInterval(tick, TICK_MS);
  }

  // ====== 初期化 ======
  function init() {
    cacheDom();
    renderStats();
    renderSlots();
    renderCurrentSoul(null);
    renderDex();
    bindEvents();
    startLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

