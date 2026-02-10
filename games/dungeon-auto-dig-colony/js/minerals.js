(function (global) {
  'use strict';

  var Util = global.DAC_Util;
  var Depth = global.DAC_Depth;

  var minerals = [
    // Common
    {
      id: 'stone',
      name: '石',
      rarity: 'common',
      color: '#90a4ae',
      value: 1,
      baseDepth: 0,
      description: 'どこにでもあるごく普通の岩石。基礎建材としてコロニーを支える。'
    },
    {
      id: 'coal',
      name: '石炭',
      rarity: 'common',
      color: '#424242',
      value: 2,
      baseDepth: 10,
      description: '黒くて軽い燃料岩。古いドワーフの炉は今でもこれで動いている。'
    },
    {
      id: 'copper',
      name: '銅鉱石',
      rarity: 'common',
      color: '#ffb74d',
      value: 3,
      baseDepth: 20,
      description: '柔らかく加工しやすい金属。最初のツルハシや配線に使われる。'
    },
    {
      id: 'iron',
      name: '鉄鉱石',
      rarity: 'common',
      color: '#b0bec5',
      value: 4,
      baseDepth: 30,
      description: 'ずっしり重い金属鉱石。強い道具と支柱に欠かせない。'
    },
    // Uncommon
    {
      id: 'silver',
      name: '銀鉱石',
      rarity: 'uncommon',
      color: '#e0e0e0',
      value: 10,
      baseDepth: 60,
      description: '淡く光る貴金属。装飾品としても人気で、交易価値が高い。'
    },
    {
      id: 'gold',
      name: '金鉱石',
      rarity: 'uncommon',
      color: '#ffd54f',
      value: 20,
      baseDepth: 80,
      description: 'まばゆい黄金の鉱脈。コロニーの金庫番を笑顔にする鉱石。'
    },
    // Rare gems
    {
      id: 'ruby',
      name: 'ルビー',
      rarity: 'rare',
      color: '#e53935',
      value: 60,
      baseDepth: 120,
      description: '深紅に輝く宝石。溶岩の熱と圧力で生まれると言われている。'
    },
    {
      id: 'sapphire',
      name: 'サファイア',
      rarity: 'rare',
      color: '#1e88e5',
      value: 65,
      baseDepth: 130,
      description: '澄んだ青が印象的な宝石。地下湖の近くでよく見つかる。'
    },
    {
      id: 'emerald',
      name: 'エメラルド',
      rarity: 'rare',
      color: '#43a047',
      value: 70,
      baseDepth: 140,
      description: '深い緑色の宝石。苔むした洞窟でひっそり輝いている。'
    },
    {
      id: 'amethyst',
      name: 'アメジスト',
      rarity: 'rare',
      color: '#8e24aa',
      value: 55,
      baseDepth: 110,
      description: '紫水晶の結晶。ドワーフは「眠りの守り石」として枕元に置く。'
    },
    {
      id: 'diamond',
      name: 'ダイヤモンド',
      rarity: 'rare',
      color: '#ffffff',
      value: 120,
      baseDepth: 160,
      description: '地底の膨大な圧力で生まれた透明な宝石。ツルハシの刃にも応用される。'
    },
    // Ultra-rare
    {
      id: 'alexandrite',
      name: 'アレキサンドライト',
      rarity: 'ultra',
      color: '#7e57c2',
      value: 400,
      baseDepth: 220,
      description: '光の当たり方で色が変わる不思議な宝石。コボルドたちの大のお気に入り。'
    },
    {
      id: 'moissanite_core',
      name: 'モアサナイト核結晶',
      rarity: 'ultra',
      color: '#b2ff59',
      value: 450,
      baseDepth: 260,
      description: '隕石由来と噂される超硬質結晶。ドリルの心臓部として利用できる。'
    },
    {
      id: 'deep_core_crystal',
      name: '深層コアクリスタル',
      rarity: 'ultra',
      color: '#ff6e40',
      value: 600,
      baseDepth: 300,
      description: '地底の鼓動そのものが結晶化したとされる伝説級の鉱物。'
    }
  ];

  function getAllMinerals() {
    return minerals;
  }

  function getMineralById(id) {
    for (var i = 0; i < minerals.length; i++) {
      if (minerals[i].id === id) return minerals[i];
    }
    return null;
  }

  function rollMineral(depth, luck) {
    var tier = Depth.getRarityTier(depth);
    var luckMul = 1 + (luck - 1) * 0.25;

    var weightsByRarity;
    if (tier === 0) {
      weightsByRarity = { common: 80, uncommon: 20, rare: 0, ultra: 0 };
    } else if (tier === 1) {
      weightsByRarity = { common: 65, uncommon: 25, rare: 8, ultra: 2 };
    } else {
      weightsByRarity = { common: 50, uncommon: 25, rare: 15, ultra: 10 };
    }

    // adjust rare/ultra by luck
    weightsByRarity.rare *= luckMul;
    weightsByRarity.ultra *= 1 + (luck - 1) * 0.5;

    var entries = [];
    for (var i = 0; i < minerals.length; i++) {
      var m = minerals[i];
      // simple depth gating
      if (depth + 30 < m.baseDepth) continue;
      var w = weightsByRarity[m.rarity] || 0;
      if (w <= 0) continue;
      entries.push({ item: m, weight: w });
    }
    if (!entries.length) {
      // fallback to stone
      return getMineralById('stone');
    }
    return Util.randomChoiceWeighted(entries);
  }

  global.DAC_Minerals = {
    getAll: getAllMinerals,
    getById: getMineralById,
    roll: rollMineral
  };
})(window);

