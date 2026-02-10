(function () {
  'use strict';

  var WIDTH = 9;
  var HEIGHT = 9;

  var TILE_FLOOR = 0;
  var TILE_WALL = 1;
  var TILE_ENEMY = 2;
  var TILE_CHEST = 3;

  var state = {
    floor: 1,
    hp: 10,
    maxHp: 10,
    gold: 0,
    map: [],
    playerX: 1,
    playerY: 1,
    alive: true,
    lastEnemyHp: 0
  };

  var elBoard, elLog, elFloor, elHp, elGold, elHeroHpBar, elEnemyHpBar;

  function cacheDom() {
    elBoard = document.getElementById('id-board');
    elLog = document.getElementById('id-log');
    elFloor = document.getElementById('id-floor');
    elHp = document.getElementById('id-hp');
    elGold = document.getElementById('id-gold');
    elHeroHpBar = document.getElementById('id-hero-hp-bar');
    elEnemyHpBar = document.getElementById('id-enemy-hp-bar');
  }

  function log(msg) {
    if (!elLog) return;
    elLog.textContent = (elLog.textContent ? elLog.textContent + '\n' : '') + msg;
    elLog.scrollTop = elLog.scrollHeight;
  }

  function updateHud() {
    if (elFloor) elFloor.textContent = String(state.floor);
    if (elHp) elHp.textContent = state.hp + ' / ' + state.maxHp;
    if (elGold) elGold.textContent = String(state.gold);
    if (elHeroHpBar) {
      var heroPct = state.maxHp > 0 ? (state.hp / state.maxHp) * 100 : 0;
      elHeroHpBar.style.width = Math.max(0, Math.min(100, heroPct)) + '%';
    }
    if (elEnemyHpBar) {
      var enemyPct = state.lastEnemyHp > 0 ? (state.lastEnemyHp / 3) * 100 : 0;
      elEnemyHpBar.style.width = Math.max(0, Math.min(100, enemyPct)) + '%';
    }
  }

  function randInt(max) {
    return Math.floor(Math.random() * max);
  }

  function createEmptyMap() {
    var map = [];
    for (var y = 0; y < HEIGHT; y++) {
      var row = [];
      for (var x = 0; x < WIDTH; x++) {
        if (x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1) {
          row.push(TILE_WALL);
        } else {
          row.push(TILE_FLOOR);
        }
      }
      map.push(row);
    }
    return map;
  }

  function placeObjects(map) {
    // 敵2〜4体
    var enemies = 2 + randInt(3);
    for (var i = 0; i < enemies; i++) {
      var ex, ey;
      do {
        ex = 1 + randInt(WIDTH - 2);
        ey = 1 + randInt(HEIGHT - 2);
      } while (map[ey][ex] !== TILE_FLOOR || (ex === 1 && ey === 1));
      map[ey][ex] = TILE_ENEMY;
    }
    // 宝箱1〜3個
    var chests = 1 + randInt(3);
    for (i = 0; i < chests; i++) {
      var cx, cy;
      do {
        cx = 1 + randInt(WIDTH - 2);
        cy = 1 + randInt(HEIGHT - 2);
      } while (map[cy][cx] !== TILE_FLOOR || (cx === 1 && cy === 1));
      map[cy][cx] = TILE_CHEST;
    }
  }

  function generateFloor() {
    state.map = createEmptyMap();
    state.playerX = 1;
    state.playerY = 1;
    placeObjects(state.map);
    log('--- フロア ' + state.floor + ' ---');
    state.lastEnemyHp = 0;
    renderMap();
    updateHud();
  }

  function renderMap() {
    if (!elBoard) return;
    elBoard.innerHTML = '';
    for (var y = 0; y < HEIGHT; y++) {
      for (var x = 0; x < WIDTH; x++) {
        var div = document.createElement('div');
        div.className = 'id-tile';
        var tile = state.map[y][x];
        if (x === state.playerX && y === state.playerY && state.alive) {
          div.classList.add('player');
          div.textContent = '@';
        } else if (tile === TILE_WALL) {
          div.classList.add('wall');
        } else if (tile === TILE_ENEMY) {
          div.classList.add('enemy');
          div.textContent = 'S';
        } else if (tile === TILE_CHEST) {
          div.classList.add('chest');
          div.textContent = '□';
        } else {
          div.classList.add('floor');
        }
        elBoard.appendChild(div);
      }
    }
  }

  function tryMove(dx, dy) {
    if (!state.alive) return;
    var nx = state.playerX + dx;
    var ny = state.playerY + dy;
    if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) return;
    var tile = state.map[ny][nx];
    if (tile === TILE_WALL) {
      return;
    }
    if (tile === TILE_ENEMY) {
      var enemyHp = 3;
      while (enemyHp > 0 && state.hp > 0) {
        var dmgToEnemy = 2 + randInt(2);
        enemyHp -= dmgToEnemy;
        if (enemyHp < 0) enemyHp = 0;
        state.lastEnemyHp = enemyHp;
        log('あなたの攻撃！ 敵に ' + dmgToEnemy + ' ダメージ。');
        if (enemyHp <= 0) break;
        var dmgToHero = 1 + randInt(2);
        state.hp -= dmgToHero;
        if (state.hp < 0) state.hp = 0;
        log('敵の反撃！ あなたは ' + dmgToHero + ' ダメージを受けた。');
      }
      if (enemyHp <= 0) {
        log('スライムを倒した！');
        state.map[ny][nx] = TILE_FLOOR;
      }
      if (state.hp <= 0) {
        state.hp = 0;
        state.alive = false;
        log('力尽きた… ここで冒険は終わりだ。');
      }
    } else if (tile === TILE_CHEST) {
      var g = 5 + randInt(11);
      state.gold += g;
      log('宝箱を開けた！ ' + g + 'G 手に入れた。');
      state.map[ny][nx] = TILE_FLOOR;
    }
    state.playerX = nx;
    state.playerY = ny;
    renderMap();
    updateHud();
  }

  function bindControls() {
    document.querySelectorAll('.id-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = btn.dataset.dir;
        if (dir === 'up') tryMove(0, -1);
        if (dir === 'down') tryMove(0, 1);
        if (dir === 'left') tryMove(-1, 0);
        if (dir === 'right') tryMove(1, 0);
      });
    });

    var btnNext = document.getElementById('id-btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        if (!state.alive) {
          state.floor = 1;
          state.hp = state.maxHp;
          state.gold = 0;
          state.alive = true;
          elLog.textContent = '';
        } else {
          state.floor++;
          // フロアが進むごとに最大HP+1、全回復
          state.maxHp++;
          state.hp = state.maxHp;
          if (state.floor === 7) {
            log('フロア7に到達！ ここが最深部だ。');
          } else if (state.floor > 7) {
            log('全てのフロアを踏破した！ おつかれさま！');
          }
        }
        generateFloor();
      });
    }

    window.addEventListener('keydown', function (e) {
      var key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') { tryMove(0, -1); }
      else if (key === 's' || key === 'arrowdown') { tryMove(0, 1); }
      else if (key === 'a' || key === 'arrowleft') { tryMove(-1, 0); }
      else if (key === 'd' || key === 'arrowright') { tryMove(1, 0); }
    });
  }

  function init() {
    cacheDom();
    bindControls();
    generateFloor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

