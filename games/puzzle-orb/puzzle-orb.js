(function () {
  'use strict';

  var ROWS = 5;
  var COLS = 6;
  var COLOR_COUNT = 5;

  var ENEMY_MAX_HP = 3000;

  var state = {
    board: [],
    dragging: null,
    enemyHp: ENEMY_MAX_HP,
    turn: 1,
    lastCombo: 0
  };

  var elBoard, elEnemyHpInner, elEnemyHpText, elTurn, elLastCombo, elMessage;

  function cacheDom() {
    elBoard = document.getElementById('po-board');
    elEnemyHpInner = document.getElementById('po-enemy-hp-inner');
    elEnemyHpText = document.getElementById('po-enemy-hp-text');
    elTurn = document.getElementById('po-turn');
    elLastCombo = document.getElementById('po-last-combo');
    elMessage = document.getElementById('po-message');
  }

  function randInt(max) {
    return Math.floor(Math.random() * max);
  }

  function buildBoard() {
    state.board = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        row.push(randInt(COLOR_COUNT));
      }
      state.board.push(row);
    }
  }

  function renderHud() {
    if (elEnemyHpInner) {
      var ratio = Math.max(0, state.enemyHp) / ENEMY_MAX_HP;
      elEnemyHpInner.style.width = (ratio * 100) + '%';
    }
    if (elEnemyHpText) {
      elEnemyHpText.textContent = Math.max(0, state.enemyHp) + ' / ' + ENEMY_MAX_HP;
    }
    if (elTurn) elTurn.textContent = String(state.turn);
    if (elLastCombo) elLastCombo.textContent = String(state.lastCombo);
  }

  function clearMessage() {
    if (!elMessage) return;
    elMessage.textContent = '';
    elMessage.className = 'po-message';
  }

  function setMessage(text, kind) {
    if (!elMessage) return;
    elMessage.textContent = text || '';
    elMessage.className = 'po-message';
    if (kind === 'positive') elMessage.classList.add('positive');
    if (kind === 'negative') elMessage.classList.add('negative');
  }

  function renderBoard() {
    if (!elBoard) return;
    elBoard.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var orb = document.createElement('div');
        orb.className = 'po-orb po-color-' + state.board[r][c];
        orb.dataset.row = String(r);
        orb.dataset.col = String(c);
        frag.appendChild(orb);
      }
    }
    elBoard.appendChild(frag);
  }

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function swap(posA, posB) {
    var tmp = state.board[posA.row][posA.col];
    state.board[posA.row][posA.col] = state.board[posB.row][posB.col];
    state.board[posB.row][posB.col] = tmp;
  }

  function findMatches() {
    var toClear = [];
    var r, c;
    // 横
    for (r = 0; r < ROWS; r++) {
      var count = 1;
      for (c = 1; c < COLS; c++) {
        if (state.board[r][c] === state.board[r][c - 1]) {
          count++;
        } else {
          if (count >= 3) {
            for (var k = 0; k < count; k++) {
              toClear.push({ row: r, col: c - 1 - k });
            }
          }
          count = 1;
        }
      }
      if (count >= 3) {
        for (var k2 = 0; k2 < count; k2++) {
          toClear.push({ row: r, col: COLS - 1 - k2 });
        }
      }
    }
    // 縦
    for (c = 0; c < COLS; c++) {
      count = 1;
      for (r = 1; r < ROWS; r++) {
        if (state.board[r][c] === state.board[r - 1][c]) {
          count++;
        } else {
          if (count >= 3) {
            for (k = 0; k < count; k++) {
              toClear.push({ row: r - 1 - k, col: c });
            }
          }
          count = 1;
        }
      }
      if (count >= 3) {
        for (k2 = 0; k2 < count; k2++) {
          toClear.push({ row: ROWS - 1 - k2, col: c });
        }
      }
    }
    // 重複除去
    var map = {};
    var unique = [];
    for (var i = 0; i < toClear.length; i++) {
      var key = toClear[i].row + '-' + toClear[i].col;
      if (!map[key]) {
        map[key] = true;
        unique.push(toClear[i]);
      }
    }
    return unique;
  }

  function applyGravity() {
    for (var c = 0; c < COLS; c++) {
      var stack = [];
      for (var r = ROWS - 1; r >= 0; r--) {
        stack.push(state.board[r][c]);
      }
      for (r = 0; r < ROWS; r++) {
        var val = stack[r];
        if (val == null) {
          state.board[ROWS - 1 - r][c] = randInt(COLOR_COUNT);
        } else {
          state.board[ROWS - 1 - r][c] = val;
        }
      }
    }
  }

  function resolveMatchesOnce() {
    var matches = findMatches();
    if (!matches.length) return 0;
    // 消去
    for (var i = 0; i < matches.length; i++) {
      var p = matches[i];
      state.board[p.row][p.col] = null;
    }
    applyGravity();
    return matches.length;
  }

  function resolveAllMatches() {
    var totalCleared = 0;
    var combo = 0;
    while (true) {
      var cleared = resolveMatchesOnce();
      if (!cleared) break;
      totalCleared += cleared;
      combo++;
    }
    return { total: totalCleared, combo: combo };
  }

  function damageEnemy(orbsCleared, combo) {
    if (orbsCleared <= 0 || combo <= 0) return 0;
    var base = orbsCleared * 50;
    var dmg = Math.floor(base * (1 + combo * 0.5));
    state.enemyHp = Math.max(0, state.enemyHp - dmg);
    return dmg;
  }

  function handleMoveEnd() {
    var result = resolveAllMatches();
    state.lastCombo = result.combo;
    if (result.combo > 0) {
      var dmg = damageEnemy(result.total, result.combo);
      setMessage(
        result.combo + 'コンボ！ ' + result.total + '個消えて ' + dmg + ' ダメージ！',
        'positive'
      );
    } else {
      setMessage('そろわなかった…。次の一手でコンボを狙おう。', 'negative');
    }
    state.turn++;
    renderBoard();
    renderHud();
    if (state.enemyHp <= 0) {
      setMessage('敵を倒しました！ おつかれさまです。', 'positive');
    }
  }

  function startDrag(row, col) {
    state.dragging = { row: row, col: col };
    if (!elBoard) return;
    var sel = elBoard.querySelector(
      '.po-orb[data-row="' + row + '"][data-col="' + col + '"]'
    );
    if (sel) sel.classList.add('dragging');
  }

  function moveDrag(row, col) {
    if (!state.dragging) return;
    var dr = row - state.dragging.row;
    var dc = col - state.dragging.col;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;
    if (!inBounds(row, col)) return;
    swap(state.dragging, { row: row, col: col });
    state.dragging = { row: row, col: col };
    renderBoard();
    var sel = elBoard.querySelector(
      '.po-orb[data-row="' + row + '"][data-col="' + col + '"]'
    );
    if (sel) sel.classList.add('dragging');
  }

  function endDrag() {
    state.dragging = null;
    if (elBoard) {
      elBoard
        .querySelectorAll('.po-orb.dragging')
        .forEach(function (el) { el.classList.remove('dragging'); });
    }
    handleMoveEnd();
  }

  function bindEvents() {
    if (!elBoard) return;

    var pointerDown = false;

    elBoard.addEventListener('pointerdown', function (ev) {
      var target = ev.target.closest('.po-orb');
      if (!target) return;
      ev.preventDefault();
      pointerDown = true;
      var r = parseInt(target.dataset.row, 10);
      var c = parseInt(target.dataset.col, 10);
      startDrag(r, c);
    }, { passive: false });

    elBoard.addEventListener('pointermove', function (ev) {
      if (!pointerDown || !state.dragging) return;
      var target = ev.target.closest('.po-orb');
      if (!target) return;
      var r = parseInt(target.dataset.row, 10);
      var c = parseInt(target.dataset.col, 10);
      moveDrag(r, c);
    });

    elBoard.addEventListener('pointerup', function () {
      if (!pointerDown || !state.dragging) {
        pointerDown = false;
        return;
      }
      pointerDown = false;
      endDrag();
    });

    elBoard.addEventListener('pointerleave', function () {
      if (!pointerDown || !state.dragging) return;
      pointerDown = false;
      endDrag();
    });
  }

  function initGame() {
    state.enemyHp = ENEMY_MAX_HP;
    state.turn = 1;
    state.lastCombo = 0;
    clearMessage();
    buildBoard();
    renderBoard();
    renderHud();
  }

  function init() {
    cacheDom();
    initGame();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

