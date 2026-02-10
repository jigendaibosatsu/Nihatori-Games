(function (global) {
  'use strict';

  var Util = global.DAC_Util;
  var MinerTypes = global.DAC_MinerTypes;
  var Minerals = global.DAC_Minerals;

  var SAVE_KEY = 'dungeon-auto-dig-save-v1';
  var VERSION = 1;

  function createDefaultState() {
    var allMinerals = Minerals.getAll();
    var enc = {};
    for (var i = 0; i < allMinerals.length; i++) {
      enc[allMinerals[i].id] = {
        discovered: false,
        firstDepth: null
      };
    }
    return {
      version: VERSION,
      resources: {},
      miners: [
        MinerTypes.createMinerInstance('m1', 'dwarf'),
        MinerTypes.createMinerInstance('m2', 'kobold')
      ],
      depth: {
        currentDepth: 0,
        maxDepthReached: 0
      },
      upgrades: {
        digPower: 0,
        speed: 0,
        minerCount: 2,
        depthReach: 0
      },
      encyclopedia: enc,
      lastTimestamp: Date.now()
    };
  }

  function sanitizeState(raw) {
    if (!raw || typeof raw !== 'object') return createDefaultState();
    if (raw.version !== VERSION) return createDefaultState();
    // shallow sanity checks
    if (!Array.isArray(raw.miners)) raw.miners = [];
    if (!raw.depth) raw.depth = { currentDepth: 0, maxDepthReached: 0 };
    if (!raw.resources) raw.resources = {};
    if (!raw.upgrades) {
      raw.upgrades = { digPower: 0, speed: 0, minerCount: 1, depthReach: 0 };
    }
    if (!raw.encyclopedia) raw.encyclopedia = createDefaultState().encyclopedia;
    if (!raw.lastTimestamp) raw.lastTimestamp = Date.now();
    return raw;
  }

  function loadState() {
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return createDefaultState();
      var parsed = JSON.parse(raw);
      return sanitizeState(parsed);
    } catch (e) {
      return createDefaultState();
    }
  }

  function saveState(state) {
    try {
      state.lastTimestamp = Date.now();
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }

  function applyOfflineProgress(state) {
    var now = Date.now();
    var deltaMs = now - (state.lastTimestamp || now);
    if (deltaMs <= 1000) {
      state.lastTimestamp = now;
      return;
    }
    // cap at 8 hours
    var maxMs = 8 * 60 * 60 * 1000;
    if (deltaMs > maxMs) deltaMs = maxMs;
    var offlineSeconds = deltaMs / 1000;

    // approximate: each miner repeats full cycles
    for (var i = 0; i < state.miners.length; i++) {
      var m = state.miners[i];
      if (!m) continue;
      var speedMul = 1 + state.upgrades.speed * 0.15;
      var effectiveSpeed = m.speed * speedMul;
      if (effectiveSpeed <= 0) continue;
      var cycles = Math.floor(offlineSeconds * effectiveSpeed);
      if (cycles <= 0) continue;

      for (var c = 0; c < cycles; c++) {
        var digMul = 1 + state.upgrades.digPower * 0.2;
        var depthGain = m.digPower * digMul;
        var maxReach = 50 + state.upgrades.depthReach * 50;
        state.depth.currentDepth = Util.clamp(
          state.depth.currentDepth + depthGain,
          0,
          maxReach
        );
        if (state.depth.currentDepth > state.depth.maxDepthReached) {
          state.depth.maxDepthReached = state.depth.currentDepth;
        }
        var rolls = m.carryCapacity;
        for (var r = 0; r < rolls; r++) {
          var mineral = Minerals.roll(state.depth.currentDepth, m.luck);
          if (!mineral) continue;
          var prev = state.resources[mineral.id] || 0;
          state.resources[mineral.id] = prev + 1;
          var encEntry = state.encyclopedia[mineral.id];
          if (encEntry && !encEntry.discovered) {
            encEntry.discovered = true;
            encEntry.firstDepth = Math.round(state.depth.currentDepth);
          }
        }
      }
    }

    state.lastTimestamp = now;
  }

  global.DAC_State = {
    createDefaultState: createDefaultState,
    loadState: loadState,
    saveState: saveState,
    applyOfflineProgress: applyOfflineProgress,
    version: VERSION
  };
})(window);

