(function () {
  'use strict';

  // ====== データ定義 ======
  var PHENOMENA = [
    {
      id: 'dark-silence',
      name: '暗黒の静寂',
      rarity: 'common',
      minMinutes: 0,
      flavor: '何もないと思っていた場所にも、実は背景放射だけがかすかに満ちている。',
      detail: '宇宙観測の最初の一歩は、「何も起きていない状態」をちゃんと測ることから始まる。'
    },
    {
      id: 'lonely-star',
      name: '孤独な恒星',
      rarity: 'common',
      minMinutes: 3,
      flavor: '銀河のはずれで、だれにも見つからないまま燃え続ける星がある。',
      detail: 'その光が地球に届くころには、星そのものはもう存在しないかもしれない。'
    },
    {
      id: 'binary-dance',
      name: '双子星のダンス',
      rarity: 'rare',
      minMinutes: 8,
      flavor: '二つの恒星が、お互いを引き寄せながら、決して触れ合わない軌道を描く。',
      detail: '周期的な明るさの変化から、遠く離れた観測者はその存在を推測する。'
    },
    {
      id: 'nebula-garden',
      name: '星雲庭園',
      rarity: 'rare',
      minMinutes: 15,
      flavor: 'かつて星だったものと、これから星になるものが、同じ雲の中で混ざり合っている。',
      detail: '色とりどりのガスは、分光してみると意外なほどシンプルな線スペクトルになる。'
    },
    {
      id: 'black-hole-echo',
      name: 'ブラックホールの残響',
      rarity: 'epic',
      minMinutes: 25,
      flavor: '落ちていく光は帰ってこない。それでも境界面のゆらぎだけが、外側の世界にささやく。',
      detail: '直接見ることはできないが、周囲の時空のゆがみが、そこにあるはずの穴を形作る。'
    },
    {
      id: 'gravitational-wave',
      name: '重力波のさざなみ',
      rarity: 'epic',
      minMinutes: 40,
      flavor: 'はるか昔の衝突の音が、今もなお、空間そのものを微かに揺らしている。',
      detail: 'レーザー干渉計のほんのわずかなズレとして、かろうじて記録される宇宙の鼓動。'
    },
    {
      id: 'cosmic-web',
      name: '宇宙の泡構造',
      rarity: 'mythic',
      minMinutes: 60,
      flavor: '銀河は点ではなく、糸と結び目でできた巨大な網として宇宙に広がっている。',
      detail: '空っぽだと思っていた空間も、そのスケールで見ると「隙間」にすぎない。'
    },
    {
      id: 'heat-death-horizon',
      name: '熱的死の地平',
      rarity: 'mythic',
      minMinutes: 120,
      flavor: 'すべての星が燃え尽きたあとにも、なお背景放射だけが、ほのかに宇宙を満たす未来。',
      detail: 'たどり着けない終点を想像することも、観測者だけに許された営みのひとつだ。'
    }
  ];

  var RARITY_LABEL = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    mythic: 'Mythic'
  };

  // ====== 状態 ======
  var state = {
    elapsedSeconds: 0,
    discovered: {}, // id -> true
    log: []         // {id, atSeconds}
  };

  var TICK_MS = 5000; // 5秒ごとに時間を進めてチェック

  // ====== DOM ======
  var elElapsed, elDiscovered, elLogList, elDex;
  var elCurrentTitle, elCurrentFlavor;

  function cacheDom() {
    elElapsed = document.getElementById('ic-elapsed');
    elDiscovered = document.getElementById('ic-discovered');
    elLogList = document.getElementById('ic-log-list');
    elDex = document.getElementById('ic-dex');
    elCurrentTitle = document.getElementById('ic-current-title');
    elCurrentFlavor = document.getElementById('ic-current-flavor');
  }

  function fmtElapsed(sec) {
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  function fmtMinutes(sec) {
    var m = Math.floor(sec / 60);
    return m + ' 分';
  }

  function getPhenomenonById(id) {
    for (var i = 0; i < PHENOMENA.length; i++) {
      if (PHENOMENA[i].id === id) return PHENOMENA[i];
    }
    return null;
  }

  function renderStats() {
    if (elElapsed) elElapsed.textContent = fmtElapsed(state.elapsedSeconds);
    var discoveredCount = Object.keys(state.discovered).length;
    if (elDiscovered) {
      elDiscovered.textContent = discoveredCount + ' / ' + PHENOMENA.length;
    }
  }

  function renderLog() {
    if (!elLogList) return;
    if (!state.log.length) {
      elLogList.innerHTML =
        '<div class="ic-log-entry ic-log-empty">' +
          '<div class="ic-log-desc">まだ何も検出されていません。宇宙が自分から話し始めるまで、ただ待ってみましょう。</div>' +
        '</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.log.length; i++) {
      var entry = state.log[i];
      var p = getPhenomenonById(entry.id);
      if (!p) continue;
      html +=
        '<article class="ic-log-entry">' +
          '<div class="ic-log-meta">' +
            '<span class="ic-log-time">' + fmtElapsed(entry.atSeconds) + '</span>' +
            '<span class="ic-log-name">' + p.name + '</span>' +
            '<span class="ic-log-rarity" data-rarity="' + p.rarity + '">' +
              (RARITY_LABEL[p.rarity] || p.rarity) +
            '</span>' +
          '</div>' +
          '<div class="ic-log-desc">' + p.flavor + '</div>' +
        '</article>';
    }
    elLogList.innerHTML = html;
  }

  function renderDex() {
    if (!elDex) return;
    var ids = Object.keys(state.discovered);
    if (!ids.length) {
      elDex.innerHTML =
        '<div class="ic-dex-item ic-dex-empty">' +
          'まだ図鑑には何も登録されていません。<br>' +
          '放置しているあいだに、少しずつページが増えていきます。' +
        '</div>';
      return;
    }
    ids.sort(function (a, b) { return a.localeCompare(b); });
    var html = '';
    for (var i = 0; i < ids.length; i++) {
      var p = getPhenomenonById(ids[i]);
      if (!p) continue;
      html +=
        '<article class="ic-dex-item">' +
          '<div class="ic-dex-row">' +
            '<span class="ic-dex-name">' + p.name + '</span>' +
            '<span class="ic-dex-rarity" data-rarity="' + p.rarity + '">' +
              (RARITY_LABEL[p.rarity] || p.rarity) +
            '</span>' +
          '</div>' +
          '<div class="ic-dex-desc">' + p.detail + '</div>' +
        '</article>';
    }
    elDex.innerHTML = html;
  }

  function updateCurrentPhenomenon() {
    var latest = state.log[state.log.length - 1];
    if (!latest) return;
    var p = getPhenomenonById(latest.id);
    if (!p) return;
    elCurrentTitle.textContent = p.name;
    elCurrentFlavor.textContent = p.detail;
  }

  // ====== ロジック ======
  function maybeDiscover() {
    var minutes = state.elapsedSeconds / 60;
    // まだ条件を満たしていて、未発見のものから候補を探す
    var candidates = [];
    for (var i = 0; i < PHENOMENA.length; i++) {
      var p = PHENOMENA[i];
      if (state.discovered[p.id]) continue;
      if (minutes >= p.minMinutes) {
        candidates.push(p);
      }
    }
    if (!candidates.length) return;

    // 後ろの（minMinutes が大きい）ほど出にくくするが、完全ランダムに近い形で一つ選ぶ
    var baseChance = 0.45;
    var bonusPer = 0.04 * candidates.length;
    var chance = baseChance + bonusPer;
    if (Math.random() > chance) return;

    var picked = candidates[Math.floor(Math.random() * candidates.length)];
    state.discovered[picked.id] = true;
    var logEntry = { id: picked.id, atSeconds: state.elapsedSeconds };
    state.log.push(logEntry);

    renderStats();
    renderLog();
    renderDex();
    updateCurrentPhenomenon();
  }

  function tick() {
    state.elapsedSeconds += TICK_MS / 1000;
    renderStats();
    maybeDiscover();
  }

  function startLoop() {
    setInterval(tick, TICK_MS);
  }

  // ====== 初期化 ======
  function init() {
    cacheDom();
    renderStats();
    renderLog();
    renderDex();
    startLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

