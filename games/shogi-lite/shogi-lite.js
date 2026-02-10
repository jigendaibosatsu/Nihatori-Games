(function () {
  'use strict';

  // 5×5 ミニ将棋
  var SIZE = 5;
  // 先手: 'S', 後手: 'G'

  // 駒コード: { side:'S'|'G', type:'K'|'G'|'S'|'B'|'R'|'P' }
  var state = {
    board: [],
    turn: 'S',
    selected: null, // {x,y}
    statusText: '駒を選んでください'
  };

  var elBoard, elTurn, elStatus;

  function cacheDom() {
    elBoard = document.getElementById('sl-board');
    elTurn = document.getElementById('sl-turn');
    elStatus = document.getElementById('sl-status');
  }

  function clonePiece(p) {
    return p ? { side: p.side, type: p.type } : null;
  }

  function inBounds(x, y) {
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
  }

  function pieceGlyph(p) {
    if (!p) return '';
    var base;
    switch (p.type) {
      case 'K': base = '玉'; break;
      case 'G': base = '金'; break;
      case 'S': base = '銀'; break;
      case 'B': base = '角'; break;
      case 'R': base = '飛'; break;
      case 'P': base = '歩'; break;
      default: base = '?';
    }
    return base;
  }

  function initialBoard() {
    var b = [];
    for (var y = 0; y < SIZE; y++) {
      var row = [];
      for (var x = 0; x < SIZE; x++) row.push(null);
      b.push(row);
    }
    // 先手（下側）
    b[4][0] = { side: 'S', type: 'R' };
    b[4][1] = { side: 'S', type: 'S' };
    b[4][2] = { side: 'S', type: 'K' };
    b[4][3] = { side: 'S', type: 'G' };
    b[4][4] = { side: 'S', type: 'B' };
    b[3][2] = { side: 'S', type: 'P' };

    // 後手（上側）
    b[0][0] = { side: 'G', type: 'B' };
    b[0][1] = { side: 'G', type: 'G' };
    b[0][2] = { side: 'G', type: 'K' };
    b[0][3] = { side: 'G', type: 'S' };
    b[0][4] = { side: 'G', type: 'R' };
    b[1][2] = { side: 'G', type: 'P' };

    return b;
  }

  function resetGame() {
    state.board = initialBoard();
    state.turn = 'S';
    state.selected = null;
    state.statusText = '駒を選んでください';
    render();
  }

  function render() {
    if (!elBoard) return;
    elBoard.innerHTML = '';
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var sq = document.createElement('button');
        sq.type = 'button';
        sq.className = 'sl-square';
        if ((x + y) % 2 === 1) sq.classList.add('dark');
        sq.dataset.x = String(x);
        sq.dataset.y = String(y);
        if (state.selected && state.selected.x === x && state.selected.y === y) {
          sq.classList.add('selected');
        }
        var p = state.board[y][x];
        if (p) {
          var span = document.createElement('span');
          span.className = 'sl-piece' + (p.side === 'G' ? ' gote' : '');
          span.textContent = pieceGlyph(p);
          sq.appendChild(span);
        }
        elBoard.appendChild(sq);
      }
    }
    if (elTurn) elTurn.textContent = state.turn === 'S' ? '先手' : '後手';
    if (elStatus) elStatus.textContent = state.statusText;
  }

  function getPiece(x, y) {
    if (!inBounds(x, y)) return null;
    return state.board[y][x];
  }

  function setPiece(x, y, p) {
    state.board[y][x] = p;
  }

  function isEnemy(p, side) {
    return p && p.side !== side;
  }

  function canSlide(x, y, dx, dy, side, maxSteps) {
    var moves = [];
    var steps = 0;
    while (true) {
      x += dx; y += dy;
      if (!inBounds(x, y)) break;
      steps++;
      if (maxSteps && steps > maxSteps) break;
      var t = getPiece(x, y);
      if (!t) {
        moves.push({ x: x, y: y });
      } else {
        if (isEnemy(t, side)) moves.push({ x: x, y: y });
        break;
      }
    }
    return moves;
  }

  function getMovesForPiece(x, y, p) {
    var moves = [];
    var dir = p.side === 'S' ? -1 : 1; // 先手は上向き
    if (p.type === 'P') {
      var ny = y + dir;
      if (inBounds(x, ny) && !getPiece(x, ny)) {
        moves.push({ x: x, y: ny });
      }
      return moves;
    }
    if (p.type === 'K') {
      var deltasK = [
        [1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]
      ];
      deltasK.forEach(function (d) {
        var nx = x + d[0], ny = y + d[1];
        if (!inBounds(nx, ny)) return;
        var t = getPiece(nx, ny);
        if (!t || isEnemy(t, p.side)) moves.push({ x: nx, y: ny });
      });
      return moves;
    }
    if (p.type === 'G') {
      var deltasG = p.side === 'S'
        ? [[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1]]
        : [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]];
      deltasG.forEach(function (d) {
        var nx = x + d[0], ny = y + d[1];
        if (!inBounds(nx, ny)) return;
        var t = getPiece(nx, ny);
        if (!t || isEnemy(t, p.side)) moves.push({ x: nx, y: ny });
      });
      return moves;
    }
    if (p.type === 'S') {
      var deltasS = p.side === 'S'
        ? [[1,-1],[-1,-1],[1,1],[-1,1],[0,-1]]
        : [[1,1],[-1,1],[1,-1],[-1,-1],[0,1]];
      deltasS.forEach(function (d) {
        var nx = x + d[0], ny = y + d[1];
        if (!inBounds(nx, ny)) return;
        var t = getPiece(nx, ny);
        if (!t || isEnemy(t, p.side)) moves.push({ x: nx, y: ny });
      });
      return moves;
    }
    if (p.type === 'B') {
      [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(function (d) {
        moves = moves.concat(canSlide(x, y, d[0], d[1], p.side));
      });
      return moves;
    }
    if (p.type === 'R') {
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (d) {
        moves = moves.concat(canSlide(x, y, d[0], d[1], p.side));
      });
      return moves;
    }
    return moves;
  }

  function isMoveLegal(fromX, fromY, toX, toY) {
    var p = getPiece(fromX, fromY);
    if (!p || p.side !== state.turn) return false;
    var moves = getMovesForPiece(fromX, fromY, p);
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].x === toX && moves[i].y === toY) return true;
    }
    return false;
  }

  function handleSquareClick(x, y) {
    var clicked = getPiece(x, y);
    if (!state.selected) {
      // まだ選んでいない
      if (clicked && clicked.side === state.turn) {
        state.selected = { x: x, y: y };
        state.statusText = '移動先を選んでください';
      } else {
        state.statusText = '自分の駒を選んでください';
      }
      render();
      return;
    }

    // すでに駒選択中
    if (state.selected.x === x && state.selected.y === y) {
      // 同じマスを再度クリックでキャンセル
      state.selected = null;
      state.statusText = '駒を選んでください';
      render();
      return;
    }

    if (!isMoveLegal(state.selected.x, state.selected.y, x, y)) {
      state.statusText = 'そのマスには動けません';
      render();
      return;
    }

    var moving = getPiece(state.selected.x, state.selected.y);
    var target = getPiece(x, y);
    if (target && target.type === 'K') {
      // 玉を取ったら勝ち
      setPiece(x, y, moving);
      setPiece(state.selected.x, state.selected.y, null);
      state.selected = null;
      state.statusText = (state.turn === 'S' ? '先手' : '後手') + 'の勝ち！ 玉を取りました。';
      render();
      return;
    }

    setPiece(x, y, moving);
    setPiece(state.selected.x, state.selected.y, null);
    state.selected = null;
    state.turn = state.turn === 'S' ? 'G' : 'S';
    state.statusText = '駒を選んでください';
    render();
  }

  function bindEvents() {
    if (elBoard) {
      elBoard.addEventListener('click', function (ev) {
        var sq = ev.target.closest('.sl-square');
        if (!sq || !sq.dataset.x) return;
        var x = parseInt(sq.dataset.x, 10);
        var y = parseInt(sq.dataset.y, 10);
        if (isNaN(x) || isNaN(y)) return;
        handleSquareClick(x, y);
      });
    }

    var btnReset = document.getElementById('sl-btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        resetGame();
      });
    }
  }

  function init() {
    cacheDom();
    bindEvents();
    resetGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

