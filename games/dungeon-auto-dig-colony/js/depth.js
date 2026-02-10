(function (global) {
  'use strict';

  var Depth = {};

  var BIOME_COLORS = [
    '#455a64', // surface rock
    '#37474f', // slate
    '#263238', // deep stone
    '#4e342e', // magma veins
    '#1b5e20', // mossy caverns
    '#311b92', // crystal caves
    '#000000'  // abyss
  ];

  Depth.getBiomeColor = function (depth) {
    var biomeIndex = Math.floor(depth / 50);
    if (biomeIndex >= BIOME_COLORS.length) biomeIndex = BIOME_COLORS.length - 1;
    if (biomeIndex < 0) biomeIndex = 0;
    return BIOME_COLORS[biomeIndex];
  };

  Depth.getRarityTier = function (depth) {
    // 0: only common/uncommon, 1: rare unlocked, 2+: ultra rare unlocked
    var tier = Math.floor(depth / 100);
    if (tier < 0) tier = 0;
    if (tier > 3) tier = 3;
    return tier;
  };

  global.DAC_Depth = Depth;
})(window);

