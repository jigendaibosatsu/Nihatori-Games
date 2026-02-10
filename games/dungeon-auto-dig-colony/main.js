(function () {
  'use strict';

  var Util = window.DAC_Util;
  var StateAPI = window.DAC_State;
  var MinersAPI = window.DAC_Miners;
  var UI = window.DAC_UI;
  var Minerals = window.DAC_Minerals;

  var state = null;
  var lastFrameTime = 0;
  var saveAccumulator = 0;

  // === Upgrade configuration ===
  var upgradeConfig = [
    {
      id: 'digPower',
      label: '掘削力アップ',
      currency: 'stone',
      currencyName: '石',
      getCost: function (nextLv) {
        return Math.floor(10 * Math.pow(1.4, nextLv - 1));
      },
      getDescription: function (lv) {
        var bonus = (1 + lv * 0.2).toFixed(1);
        return '全採掘力 x' + bonus + ' （Lvごとに+20%）';
      }
    },
    {
      id: 'speed',
      label: '掘削速度アップ',
      currency: 'coal',
      currencyName: '石炭',
      getCost: function (nextLv) {
        return Math.floor(8 * Math.pow(1.5, nextLv - 1));
      },
      getDescription: function (lv) {
        var bonus = (1 + lv * 0.15).toFixed(2);
        return '掘削速度 x' + bonus + ' （Lvごとに+15%）';
      }
    },
    {
      id: 'minerCount',
      label: '採掘班の増員',
      currency: 'iron',
      currencyName: '鉄鉱石',
      getCost: function (nextLv) {
        return Math.floor(15 * Math.pow(1.7, nextLv - 1));
      },
      getDescription: function (lv) {
        return '同時に働ける採掘者: ' + lv + ' 人';
      }
    },
    {
      id: 'depthReach',
      label: '深度限界の拡張',
      currency: 'gold',
      currencyName: '金鉱石',
      getCost: function (nextLv) {
        return Math.floor(5 * Math.pow(2, nextLv - 1));
      },
      getDescription: function (lv) {
        return '到達可能な最大深度: ' + (50 + lv * 50) + ' m';
      }
    }
  ];

  function tryUpgrade(id) {
    var cfg = null;
    for (var i = 0; i < upgradeConfig.length; i++) {
      if (upgradeConfig[i].id === id) {
        cfg = upgradeConfig[i];
        break;
      }
    }
    if (!cfg) return;
    var lvl = state.upgrades[id] || 0;
    var cost = cfg.getCost(lvl + 1);
    var have = state.resources[cfg.currency] || 0;
    if (have < cost) return;
    state.resources[cfg.currency] = have - cost;
    state.upgrades[id] = lvl + 1;
    // minerCount can add new miners if we have definitions available
    if (id === 'minerCount') {
      ensureMinersCount();
    }
  }

  function ensureMinersCount() {
    var desired = state.upgrades.minerCount;
    while (state.miners.length < desired) {
      // alternate between dwarf and kobold
      var idx = state.miners.length + 1;
      var type = idx % 2 === 0 ? 'kobold' : 'dwarf';
      var id = 'm' + (idx + 1);
      state.miners.push(window.DAC_MinerTypes.createMinerInstance(id, type));
    }
  }

  function init() {
    state = StateAPI.loadState();
    StateAPI.applyOfflineProgress(state);
    ensureMinersCount();

    UI.init({
      onOpenEncy: function () {
        UI.renderEncyclopedia(state);
      }
    });

    // initial render
    UI.render(state, { depthColor: '#455a64', globalProgress: 0 }, upgradeConfig, tryUpgrade);

    lastFrameTime = performance.now();
    requestAnimationFrame(loop);

    window.addEventListener('beforeunload', function () {
      StateAPI.saveState(state);
    });
  }

  function loop(now) {
    var dt = (now - lastFrameTime) / 1000;
    if (dt > 0.25) dt = 0.25; // clamp for tab switching
    lastFrameTime = now;

    var helpers = MinersAPI.updateMiners(state, dt) || {
      depthColor: '#455a64',
      globalProgress: 0
    };

    UI.render(state, helpers, upgradeConfig, tryUpgrade);

    saveAccumulator += dt;
    if (saveAccumulator >= 5) {
      StateAPI.saveState(state);
      saveAccumulator = 0;
    }

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

