(function (global) {
  'use strict';

  var MinerTypes = {
    dwarf: {
      id: 'dwarf',
      name: 'ドワーフ',
      baseDigPower: 1,
      baseSpeed: 0.18, // progress per second
      baseLuck: 1,
      baseCarry: 3,
      color: '#8d6e63'
    },
    kobold: {
      id: 'kobold',
      name: '犬面コボルド',
      baseDigPower: 0.8,
      baseSpeed: 0.28,
      baseLuck: 1.6,
      baseCarry: 2,
      color: '#90a4ae'
    }
  };

  MinerTypes.createMinerInstance = function (id, typeId) {
    var def = MinerTypes[typeId];
    if (!def) throw new Error('Unknown miner type: ' + typeId);
    return {
      id: id,
      type: typeId,
      digPower: def.baseDigPower,
      speed: def.baseSpeed,
      luck: def.baseLuck,
      carryCapacity: def.baseCarry,
      progress: 0
    };
  };

  global.DAC_MinerTypes = MinerTypes;
})(window);

