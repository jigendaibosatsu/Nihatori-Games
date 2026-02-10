(function (global) {
  'use strict';

  var Util = global.DAC_Util;
  var Depth = global.DAC_Depth;
  var Minerals = global.DAC_Minerals;

  function updateMiners(state, dt) {
    if (dt <= 0) return;
    var miners = state.miners;
    if (!Array.isArray(miners)) return;

    var speedMul = 1 + state.upgrades.speed * 0.15;
    var digMul = 1 + state.upgrades.digPower * 0.2;
    var maxReach = 50 + state.upgrades.depthReach * 50;

    // cap miner count by upgrade
    var allowed = state.upgrades.minerCount;
    if (miners.length > allowed) {
      miners.length = allowed;
    }

    var globalProgress = 0;

    for (var i = 0; i < miners.length; i++) {
      var m = miners[i];
      if (!m) continue;
      var effSpeed = m.speed * speedMul;
      m.progress += effSpeed * dt;
      if (m.progress >= 1) {
        m.progress -= 1;
        var depthGain = m.digPower * digMul;
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
          state.resources[mineral.id] =
            (state.resources[mineral.id] || 0) + 1;
          var encEntry = state.encyclopedia[mineral.id];
          if (encEntry && !encEntry.discovered) {
            encEntry.discovered = true;
            encEntry.firstDepth = Math.round(state.depth.currentDepth);
          }
        }
      }
      globalProgress += m.progress;
    }

    var avgProgress =
      miners.length > 0 ? globalProgress / miners.length : 0;
    avgProgress = Util.clamp(avgProgress, 0, 1);
    return {
      depthColor: Depth.getBiomeColor(state.depth.currentDepth),
      globalProgress: avgProgress
    };
  }

  global.DAC_Miners = {
    updateMiners: updateMiners
  };
})(window);

