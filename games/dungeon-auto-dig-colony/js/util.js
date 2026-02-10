(function (global) {
  'use strict';

  var Util = {};

  Util.clamp = function (v, min, max) {
    return v < min ? min : v > max ? max : v;
  };

  Util.formatInt = function (n) {
    if (!isFinite(n)) return '0';
    return Math.floor(n).toLocaleString('en-US');
  };

  Util.formatFloat = function (n, digits) {
    if (!isFinite(n)) return '0';
    return n.toFixed(digits == null ? 1 : digits);
  };

  Util.randomRange = function (min, max) {
    return Math.random() * (max - min) + min;
  };

  Util.randomChoiceWeighted = function (entries) {
    // entries: [{ item, weight }]
    var total = 0;
    for (var i = 0; i < entries.length; i++) {
      total += entries[i].weight;
    }
    if (total <= 0) return null;
    var r = Math.random() * total;
    var acc = 0;
    for (var j = 0; j < entries.length; j++) {
      acc += entries[j].weight;
      if (r <= acc) return entries[j].item;
    }
    return entries[entries.length - 1].item;
  };

  global.DAC_Util = Util;
})(window);

