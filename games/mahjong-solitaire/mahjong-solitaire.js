(function () {
  'use strict';

  var ROWS = 6;
  var COLS = 12;

  var SYMBOLS = [
    { key: 'man1', label: '一萬' },
    { key: 'man2', label: '二萬' },
    { key: 'man3', label: '三萬' },
    { key: 'man4', label: '四萬' },
    { key: 'sou1', label: '一索' },
    { key: 'sou2', label: '二索' },
    { key: 'sou3', label: '三索' },
    { key: 'pin1', label: '一筒' },
    { key: 'pin2', label: '二筒' },
    { key: 'pin3', label: '三筒' },
    { key: 'honorE', label: '東' },
    { key: 'honorS', label: '南' },
    { key: 'honorW', label: '西' },
    { key: 'honorN', label: '北' },
    { key: 'honorH', label: '白' },
    { key: 'honorF', label: '發' },
    { key: 'honorC', label: '中' }
  ];

  var state = {
    tiles: [],
    selectedId: null
  };

  var elBoard, elRemaining, elPairs, elStatus;

  function cacheDom() {
    elBoard = document.getElementById('ms-board');
    elRemaining = document.getElementById('ms-remaining');
    elPairs = document.getElementById('ms-pairs');
    elStatus = document.getElementById('ms-status');
  }

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  function buildTiles() {
    var totalSlots = ROWS * COLS;
    var pairCount = Math.floor(totalSlots / 2);
    var needTiles = pairCount * 2;

    var pool = [];
    var idx = 0;
    while (pool.length < needTiles) {
      var sym = SYMBOLS[idx % SYMBOLS.length];
      pool.push({ key: sym.key, label: sym.label });
      pool.push({ key: sym.key, label: sym.label });
      idx++;
    }

    shuffle(pool);

    var tiles = [];
    var id = 1;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var pIndex = r * COLS + c;
        if (pIndex >= needTiles) break;
        var symInfo = pool[pIndex];
        tiles.push({
          id: id++,
          row: r,
          col: c,
          key: symInfo.key,
          label: symInfo.label,
          removed: false
        });
      }
    }
    state.tiles = tiles;
    state.selectedId = null;
  }

  function getTileById(id) {
    for (var i = 0; i < state.tiles.length; i++) {
      if (state.tiles[i].id === id) return state.tiles[i];
    }
    return null;
  }

  function getTileAt(row, col) {
    for (var i = 0; i < state.tiles.length; i++) {
      var t = state.tiles[i];
      if (!t.removed && t.row === row && t.col === col) return t;
    }
    return null;
  }

  function isFree(tile) {
    if (!tile || tile.removed) return false;
    var left = getTileAt(tile.row, tile.col - 1);
    var right = getTileAt(tile.row, tile.col + 1);
    return !left || !right;
  }

  function updateHud() {
    var remaining = 0;
    for (var i = 0; i < state.tiles.length; i++) {
      if (!state.tiles[i].removed) remaining++;
    }
    if (elRemaining) elRemaining.textContent = remaining.toString();
    if (elPairs) elPairs.textContent = Math.floor(remaining / 2).toString();

    if (remaining === 0) {
      elStatus.textContent = 'クリア！';
      return;
    }

    var hasMove = false;
    for (var a = 0; a < state.tiles.length; a++) {
      var ta = state.tiles[a];
      if (ta.removed || !isFree(ta)) continue;
      for (var b = a + 1; b < state.tiles.length; b++) {
        var tb = state.tiles[b];
        if (tb.removed || ta.key !== tb.key || !isFree(tb)) continue;
        hasMove = true;
        break;
      }
      if (hasMove) break;
    }
    elStatus.textContent = hasMove ? '進行可能' : '詰み（新しい局を始めてください）';
  }

  function renderBoard() {
    if (!elBoard) return;
    elBoard.innerHTML = '';
    var frag = document.createDocumentFragment();
    state.tiles.forEach(function (tile) {
      var div = document.createElement('button');
      div.type = 'button';
      div.className = 'ms-tile';
      if (isFree(tile)) div.classList.add('free');
      if (tile.removed) div.classList.add('removed');
      if (state.selectedId === tile.id) div.classList.add('selected');
      div.dataset.id = String(tile.id);

      var inner = document.createElement('div');
      inner.className = 'ms-tile-inner';

      var span = document.createElement('div');
      span.className = 'ms-tile-text';
      span.textContent = tile.label;
      inner.appendChild(span);
      div.appendChild(inner);
      frag.appendChild(div);
    });
    elBoard.appendChild(frag);
    updateHud();
  }

  function handleTileClick(id) {
    var tile = getTileById(id);
    if (!tile || tile.removed) return;
    if (!isFree(tile)) return;

    if (state.selectedId == null) {
      state.selectedId = tile.id;
    } else if (state.selectedId === tile.id) {
      state.selectedId = null;
    } else {
      var other = getTileById(state.selectedId);
      if (other && !other.removed && other.key === tile.key && isFree(other)) {
        tile.removed = true;
        other.removed = true;
        state.selectedId = null;
      } else {
        state.selectedId = tile.id;
      }
    }
    renderBoard();
  }

  function bindEvents() {
    if (elBoard) {
      elBoard.addEventListener('click', function (ev) {
        var tileEl = ev.target.closest('.ms-tile');
        if (!tileEl || !tileEl.dataset.id) return;
        var id = parseInt(tileEl.dataset.id, 10);
        if (isNaN(id)) return;
        handleTileClick(id);
      });
    }

    var btnNew = document.getElementById('ms-btn-new');
    if (btnNew) {
      btnNew.addEventListener('click', function () {
        startNewGame();
      });
    }
  }

  function startNewGame() {
    buildTiles();
    renderBoard();
  }

  function init() {
    cacheDom();
    bindEvents();
    startNewGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

