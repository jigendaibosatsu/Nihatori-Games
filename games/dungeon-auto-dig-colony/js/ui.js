(function (global) {
  'use strict';

  var Util = global.DAC_Util;
  var Minerals = global.DAC_Minerals;
  var MinerTypes = global.DAC_MinerTypes;
  var Depth = global.DAC_Depth;

  var els = {};

  function cacheElements() {
    els.depthCurrent = document.getElementById('depth-current');
    els.depthMax = document.getElementById('depth-max');
    els.biomeColor = document.getElementById('biome-color');
    els.digProgress = document.getElementById('dig-progress');
    els.minersList = document.getElementById('miners-list');
    els.resourcesList = document.getElementById('resources-list');
    els.resourcesTotal = document.getElementById('resources-total');
    els.upgradesList = document.getElementById('upgrades-list');
    els.btnOpenEncy = document.getElementById('open-encyclopedia');
    els.overlay = document.getElementById('encyclopedia-overlay');
    els.overlayBackdrop = document.getElementById('encyclopedia-backdrop');
    els.btnCloseEncy = document.getElementById('close-encyclopedia');
    els.encyGrid = document.getElementById('encyclopedia-grid');
    els.encyCompletion = document.getElementById('encyclopedia-completion');
  }

  function bindEncyclopedia(handlers) {
    if (!els.btnOpenEncy || !els.overlay) {
      console.warn('[DAC] Encyclopedia elements not ready');
      return;
    }
    els.btnOpenEncy.addEventListener('click', function () {
      els.overlay.hidden = false;
      if (handlers && handlers.onOpenEncy) handlers.onOpenEncy();
    });
    var close = function () {
      if (!els.overlay) return;
      els.overlay.hidden = true;
    };
    if (els.btnCloseEncy) {
      els.btnCloseEncy.setAttribute('tabindex', '0');
      els.btnCloseEncy.addEventListener('click', close);
      els.btnCloseEncy.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          close();
        }
      });
    }
    if (els.overlayBackdrop) {
      els.overlayBackdrop.addEventListener('click', close);
    }

    // Escapeキーでいつでも図鑑を閉じる
    window.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && els.overlay && !els.overlay.hidden) {
        close();
      }
    });
  }

  function renderDepth(state, helpers) {
    if (!els.depthCurrent) return;
    els.depthCurrent.textContent =
      Math.floor(state.depth.currentDepth) + ' m';
    els.depthMax.textContent =
      Math.floor(state.depth.maxDepthReached) + ' m';
    var color = helpers && helpers.depthColor
      ? helpers.depthColor
      : Depth.getBiomeColor(state.depth.currentDepth);
    els.biomeColor.style.background = color;
    els.digProgress.style.width =
      Util.formatFloat((helpers && helpers.globalProgress) || 0, 2) * 100 +
      '%';
  }

  function renderMiners(state) {
    if (!els.minersList) return;
    var html = '';
    for (var i = 0; i < state.miners.length; i++) {
      var m = state.miners[i];
      var def = MinerTypes[m.type];
      var progressPct = Math.round(Util.clamp(m.progress, 0, 1) * 100);
      html +=
        '<li class="miner-row">' +
        '<div class="miner-icon" style="background:' +
        (def ? def.color : '#455a64') +
        '"></div>' +
        '<div class="miner-body">' +
        '<div class="miner-name">' +
        '<span>' +
        (def ? def.name : m.type) +
        '</span>' +
        '<span>進行 ' +
        progressPct +
        '%</span>' +
        '</div>' +
        '<div class="miner-stats">' +
        '掘削力 ' +
        Util.formatFloat(m.digPower, 1) +
        ' / 速さ ' +
        Util.formatFloat(m.speed, 2) +
        ' / 幸運 ' +
        Util.formatFloat(m.luck, 2) +
        ' / 積載 ' +
        m.carryCapacity +
        '</div>' +
        '<div class="miner-progress progress-bar"><div class="progress-inner" style="width:' +
        progressPct +
        '%"></div></div>' +
        '</div>' +
        '</li>';
    }
    els.minersList.innerHTML = html;
  }

  function computeTotalValue(resources) {
    var total = 0;
    var all = Minerals.getAll();
    for (var i = 0; i < all.length; i++) {
      var m = all[i];
      var count = resources[m.id] || 0;
      total += count * m.value;
    }
    return total;
  }

  function renderResources(state) {
    if (!els.resourcesList) return;
    var html = '';
    var all = Minerals.getAll();
    for (var i = 0; i < all.length; i++) {
      var m = all[i];
      var count = state.resources[m.id] || 0;
      if (count <= 0) continue;
      html +=
        '<li class="resource-row">' +
        '<div class="resource-icon" style="background:' +
        m.color +
        '"></div>' +
        '<div class="resource-label">' +
        m.name +
        '</div>' +
        '<div class="resource-count">x ' +
        Util.formatInt(count) +
        '</div>' +
        '</li>';
    }
    if (!html) {
      html = '<li class="resource-row">まだ鉱物はありません。</li>';
    }
    els.resourcesList.innerHTML = html;
    els.resourcesTotal.textContent = Util.formatInt(
      computeTotalValue(state.resources)
    );
  }

  function renderUpgrades(state, upgradeConfig, onClickUpgrade) {
    if (!els.upgradesList) return;
    var resources = state.resources;
    var html = '';
    for (var i = 0; i < upgradeConfig.length; i++) {
      var u = upgradeConfig[i];
      var level = state.upgrades[u.id] || 0;
      var costValue = u.getCost(level + 1);
      var have = (resources[u.currency] || 0) >= costValue;
      var costLabel = u.currencyName + ' ' + Util.formatInt(costValue);
      html +=
        '<div class="upgrade-row">' +
        '<div class="upgrade-header">' +
        '<span>' +
        u.label +
        ' Lv.' +
        level +
        '</span>' +
        '<span>' +
        costLabel +
        '</span>' +
        '</div>' +
        '<div class="upgrade-meta">' +
        u.getDescription(level) +
        '</div>' +
        '<button class="btn btn-upgrade" data-upg="' +
        u.id +
        '" ' +
        (have ? '' : 'disabled') +
        '>強化する</button>' +
        '</div>';
    }
    els.upgradesList.innerHTML = html;
    els.upgradesList.querySelectorAll('button[data-upg]').forEach(function (
      btn
    ) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-upg');
        if (onClickUpgrade) onClickUpgrade(id);
      });
    });
  }

  function renderEncyclopedia(state) {
    if (!els.encyGrid) return;
    var all = Minerals.getAll();
    var discoveredCount = 0;
    var html = '';
    for (var i = 0; i < all.length; i++) {
      var m = all[i];
      var entry = state.encyclopedia[m.id];
      var known = entry && entry.discovered;
      if (known) discoveredCount++;
      var name = known ? m.name : '???';
      var rarity = known ? m.rarity : '?';
      var color = known ? m.color : '#424242';
      var depthText =
        known && entry.firstDepth != null
          ? '初発見: ' + entry.firstDepth + ' m'
          : '初発見: ---';
      var desc = known
        ? m.description
        : 'まだ誰もこの鉱石を見たことがない…。';
      html +=
        '<div class="encyclopedia-item">' +
        '<div class="encyclopedia-title-row">' +
        '<div class="encyclopedia-icon" style="background:' +
        color +
        '"></div>' +
        '<div>' +
        '<div class="encyclopedia-name">' +
        name +
        '</div>' +
        '<div class="encyclopedia-rarity">' +
        'レア度: ' +
        rarity +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="encyclopedia-desc">' +
        desc +
        '</div>' +
        '<div class="encyclopedia-rarity">' +
        depthText +
        '</div>' +
        '</div>';
    }
    els.encyGrid.innerHTML = html;
    var completion =
      all.length > 0 ? (discoveredCount / all.length) * 100 : 0;
    els.encyCompletion.textContent =
      Util.formatFloat(completion, 1) + '% (' + discoveredCount + '/' + all.length + ')';
  }

  function init(handlers) {
    cacheElements();
    bindEncyclopedia(handlers || {});
  }

  function render(state, helpers, upgradeConfig, onClickUpgrade) {
    renderDepth(state, helpers || {});
    renderMiners(state);
    renderResources(state);
    renderUpgrades(state, upgradeConfig, onClickUpgrade);
  }

  global.DAC_UI = {
    init: init,
    render: render,
    renderEncyclopedia: renderEncyclopedia
  };
})(window);

