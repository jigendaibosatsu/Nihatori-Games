(function () {
  'use strict';

  // ===== 定数定義 =====
  var STORAGE_KEY = 'axolotl-escape-save';
  var CANVAS_WIDTH = 800;
  var CANVAS_HEIGHT = 600;
  var ROOM_WIDTH = 800;
  var ROOM_HEIGHT = 600;
  var ROOMS_PER_FLOOR = 5;
  var MAX_FLOORS = 3;

  // ===== ゲーム状態 =====
  var gameState = {
    // プレイヤー
    player: {
      x: 400,
      y: 300,
      width: 32,
      height: 32,
      speed: 3,
      dashSpeed: 8,
      dashCooldown: 0,
      maxDashCooldown: 60,
      hp: 100,
      maxHp: 100,
      attackPower: 10,
      attackCooldown: 0,
      attackRange: 50,
      autoAttackRange: 150,
      invulnerable: 0,
      targetX: null,
      targetY: null,
      isLongPress: false,
      longPressTimer: 0
    },
    
    // ダンジョン
    currentFloor: 1,
    currentRoom: 1,
    rooms: [],
    
    // 敵
    enemies: [],
    
    // プロジェクトタイル（攻撃）
    projectiles: [],
    
    // ボーナス
    bonuses: [],
    selectedBonuses: [],
    
    // 永続的な成長
    darkness: 0,
    upgrades: {
      maxHp: 0,
      attackPower: 0,
      speed: 0,
      dashCooldown: 0
    },
    
    // ゲーム状態
    state: 'house', // 'house' | 'playing' | 'bonus' | 'gameover'
    keys: {},
    mouse: { x: 0, y: 0, down: false }
  };

  // ===== Canvas設定 =====
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scale = 1;

  function resizeCanvas() {
    var container = canvas.parentElement;
    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;
    
    scale = Math.min(containerWidth / CANVAS_WIDTH, containerHeight / CANVAS_HEIGHT);
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ===== ユーティリティ =====
  function $(id) { return document.getElementById(id); }

  function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
  }

  // ===== セーブ/ロード =====
  function saveGame() {
    try {
      var saveData = {
        darkness: gameState.darkness,
        upgrades: gameState.upgrades
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.error('セーブ失敗:', e);
    }
  }

  function loadGame() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var data = JSON.parse(saved);
        gameState.darkness = data.darkness || 0;
        gameState.upgrades = Object.assign({}, gameState.upgrades, data.upgrades || {});
      }
    } catch (e) {
      console.error('ロード失敗:', e);
    }
  }

  // ===== プレイヤー操作 =====
  function updatePlayer() {
    var p = gameState.player;
    
    // タップ位置への移動
    if (p.targetX !== null && p.targetY !== null) {
      var dx = p.targetX - p.x;
      var dy = p.targetY - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 5) {
        // 目標位置に向かって移動
        var moveSpeed = p.isLongPress && p.dashCooldown <= 0 ? p.dashSpeed : (p.speed + (gameState.upgrades.speed * 0.5));
        
        if (dist < moveSpeed) {
          p.x = p.targetX;
          p.y = p.targetY;
          p.targetX = null;
          p.targetY = null;
        } else {
          p.x += (dx / dist) * moveSpeed;
          p.y += (dy / dist) * moveSpeed;
        }
        
        // ダッシュ使用時
        if (p.isLongPress && p.dashCooldown <= 0) {
          p.dashCooldown = p.maxDashCooldown - (gameState.upgrades.dashCooldown * 10);
        }
      } else {
        // 目標位置に到達
        p.targetX = null;
        p.targetY = null;
      }
    }
    
    // ダッシュクールダウン
    if (p.dashCooldown > 0) p.dashCooldown--;
    
    // 長押しタイマー
    if (gameState.mouse.down) {
      p.longPressTimer++;
      if (p.longPressTimer > 20) {
        p.isLongPress = true;
      }
    } else {
      p.longPressTimer = 0;
      p.isLongPress = false;
    }
    
    // 境界チェック
    p.x = Math.max(p.width / 2, Math.min(ROOM_WIDTH - p.width / 2, p.x));
    p.y = Math.max(p.height / 2, Math.min(ROOM_HEIGHT - p.height / 2, p.y));
    
    // 自動攻撃（近くの敵に向かって）
    if (p.attackCooldown > 0) p.attackCooldown--;
    
    // 最も近い敵を探す
    var nearestEnemy = null;
    var nearestDist = p.autoAttackRange;
    
    gameState.enemies.forEach(function(enemy) {
      var dist = distance(p.x, p.y, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    });
    
    // 近くに敵がいたら自動攻撃
    if (nearestEnemy && p.attackCooldown <= 0) {
      var attackPower = p.attackPower + (gameState.upgrades.attackPower * 2);
      var angle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
      
      gameState.projectiles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        damage: attackPower,
        radius: 8,
        lifetime: 60
      });
      
      p.attackCooldown = 20;
    }
    
    // 無敵時間
    if (p.invulnerable > 0) p.invulnerable--;
  }

  // ===== 敵システム =====
  function createEnemy(type, x, y) {
    var enemy = {
      x: x,
      y: y,
      width: 24,
      height: 24,
      hp: type === 'boss' ? 200 : 30,
      maxHp: type === 'boss' ? 200 : 30,
      speed: type === 'boss' ? 1.5 : 2,
      attackPower: type === 'boss' ? 20 : 10,
      attackCooldown: 0,
      attackRange: type === 'boss' ? 40 : 30,
      type: type,
      color: type === 'boss' ? '#ef4444' : '#f59e0b'
    };
    return enemy;
  }

  function spawnEnemies() {
    gameState.enemies = [];
    var room = gameState.rooms[gameState.currentFloor - 1][gameState.currentRoom - 1];
    
    if (room.type === 'boss') {
      // ボス
      gameState.enemies.push(createEnemy('boss', ROOM_WIDTH / 2, ROOM_HEIGHT / 2));
    } else if (room.type === 'combat') {
      // 通常敵
      var enemyCount = 3 + gameState.currentFloor;
      for (var i = 0; i < enemyCount; i++) {
        var x = random(100, ROOM_WIDTH - 100);
        var y = random(100, ROOM_HEIGHT - 100);
        gameState.enemies.push(createEnemy('normal', x, y));
      }
    }
  }

  function updateEnemies() {
    var p = gameState.player;
    
    gameState.enemies.forEach(function(enemy) {
      // AI: プレイヤーに向かって移動
      var dx = p.x - enemy.x;
      var dy = p.y - enemy.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }
      
      // 攻撃
      if (enemy.attackCooldown > 0) enemy.attackCooldown--;
      
      if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
        if (p.invulnerable <= 0) {
          p.hp -= enemy.attackPower;
          p.invulnerable = 30;
          
          if (p.hp <= 0) {
            gameOver();
          }
        }
        enemy.attackCooldown = 60;
      }
    });
  }

  // ===== プロジェクトタイル =====
  function updateProjectiles() {
    gameState.projectiles = gameState.projectiles.filter(function(proj) {
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.lifetime--;
      
      // 敵との衝突判定
      var hit = false;
      gameState.enemies.forEach(function(enemy) {
        if (!hit && distance(proj.x, proj.y, enemy.x, enemy.y) < enemy.width / 2 + proj.radius) {
          enemy.hp -= proj.damage;
          hit = true;
          
          if (enemy.hp <= 0) {
            // 敵を倒した
            gameState.darkness += enemy.type === 'boss' ? 50 : 10;
          }
        }
      });
      
      // 境界チェック
      if (proj.x < 0 || proj.x > ROOM_WIDTH || proj.y < 0 || proj.y > ROOM_HEIGHT) {
        return false;
      }
      
      return proj.lifetime > 0 && !hit;
    });
    
    // 倒された敵を削除
    gameState.enemies = gameState.enemies.filter(function(enemy) {
      return enemy.hp > 0;
    });
    
    // 敵が全滅したら
    if (gameState.enemies.length === 0 && gameState.state === 'playing') {
      completeRoom();
    }
  }

  // ===== ダンジョン生成 =====
  function generateDungeon() {
    gameState.rooms = [];
    
    for (var floor = 1; floor <= MAX_FLOORS; floor++) {
      var floorRooms = [];
      
      for (var room = 1; room <= ROOMS_PER_FLOOR; room++) {
        var roomType = 'combat';
        
        if (room === ROOMS_PER_FLOOR) {
          roomType = 'boss';
        } else if (room === Math.floor(ROOMS_PER_FLOOR / 2)) {
          roomType = 'bonus';
        } else if (room % 2 === 0 && Math.random() < 0.3) {
          roomType = 'shop';
        }
        
        floorRooms.push({ type: roomType, completed: false });
      }
      
      gameState.rooms.push(floorRooms);
    }
  }

  function completeRoom() {
    var room = gameState.rooms[gameState.currentFloor - 1][gameState.currentRoom - 1];
    room.completed = true;
    
    if (room.type === 'boss') {
      // ボスを倒した
      if (gameState.currentFloor >= MAX_FLOORS) {
        // クリア！
        victory();
      } else {
        // 次の階層へ
        gameState.currentFloor++;
        gameState.currentRoom = 1;
        startRoom();
      }
    } else if (room.type === 'bonus') {
      // ボーナス選択
      showBonusSelection();
    } else {
      // 次の部屋へ
      gameState.currentRoom++;
      if (gameState.currentRoom > ROOMS_PER_FLOOR) {
        gameState.currentRoom = 1;
        gameState.currentFloor++;
      }
      startRoom();
    }
  }

  function startRoom() {
    spawnEnemies();
    gameState.projectiles = [];
    gameState.state = 'playing';
  }

  // ===== ボーナス選択 =====
  function showBonusSelection() {
    gameState.bonuses = generateBonuses();
    var list = $('bonusList');
    list.innerHTML = '';
    
    gameState.bonuses.forEach(function(bonus, index) {
      var card = document.createElement('div');
      card.className = 'bonus-card';
      card.innerHTML = '<div class="bonus-name">' + bonus.name + '</div><div class="bonus-desc">' + bonus.desc + '</div>';
      card.addEventListener('click', function() {
        selectBonus(index);
      });
      list.appendChild(card);
    });
    
    $('overlayBonus').classList.add('visible');
    gameState.state = 'bonus';
  }

  function generateBonuses() {
    var bonuses = [
      { name: 'HP回復', desc: 'HPを50回復', type: 'heal', value: 50 },
      { name: '攻撃力アップ', desc: '攻撃力+5', type: 'attack', value: 5 },
      { name: '移動速度アップ', desc: '移動速度+1', type: 'speed', value: 1 },
      { name: '最大HPアップ', desc: '最大HP+20', type: 'maxHp', value: 20 },
      { name: 'ダッシュ強化', desc: 'ダッシュクールダウン-10', type: 'dash', value: 10 }
    ];
    
    // ランダムに3つ選択
    var selected = [];
    var available = bonuses.slice();
    
    for (var i = 0; i < 3; i++) {
      var index = randomInt(0, available.length - 1);
      selected.push(available[index]);
      available.splice(index, 1);
    }
    
    return selected;
  }

  function selectBonus(index) {
    var bonus = gameState.bonuses[index];
    var p = gameState.player;
    
    switch (bonus.type) {
      case 'heal':
        p.hp = Math.min(p.maxHp, p.hp + bonus.value);
        break;
      case 'attack':
        p.attackPower += bonus.value;
        break;
      case 'speed':
        p.speed += bonus.value;
        break;
      case 'maxHp':
        p.maxHp += bonus.value;
        p.hp += bonus.value;
        break;
      case 'dash':
        p.maxDashCooldown = Math.max(20, p.maxDashCooldown - bonus.value);
        break;
    }
    
    gameState.selectedBonuses.push(bonus);
    $('overlayBonus').classList.remove('visible');
    
    // 次の部屋へ
    gameState.currentRoom++;
    if (gameState.currentRoom > ROOMS_PER_FLOOR) {
      gameState.currentRoom = 1;
      gameState.currentFloor++;
    }
    startRoom();
  }

  // ===== ゲームオーバー/勝利 =====
  function gameOver() {
    gameState.state = 'gameover';
    $('gameOverTitle').textContent = 'ゲームオーバー';
    $('gameOverContent').innerHTML = 
      '<p>階層 ' + gameState.currentFloor + ' の部屋 ' + gameState.currentRoom + ' で倒れました</p>' +
      '<p>獲得ダークネス: ' + gameState.darkness + '</p>';
    $('overlayGameOver').classList.add('visible');
    saveGame();
  }

  function victory() {
    gameState.state = 'gameover';
    $('gameOverTitle').textContent = '脱出成功！';
    $('gameOverContent').innerHTML = 
      '<p>おめでとうございます！脱出に成功しました！</p>' +
      '<p>獲得ダークネス: ' + gameState.darkness + '</p>';
    $('overlayGameOver').classList.add('visible');
    saveGame();
  }

  function restartGame() {
    gameState.player.hp = gameState.player.maxHp = 100 + (gameState.upgrades.maxHp * 10);
    gameState.player.attackPower = 10 + (gameState.upgrades.attackPower * 2);
    gameState.player.speed = 3 + (gameState.upgrades.speed * 0.5);
    gameState.player.x = 400;
    gameState.player.y = 300;
    gameState.currentFloor = 1;
    gameState.currentRoom = 1;
    gameState.selectedBonuses = [];
    gameState.darkness = 0; // リセット（永続的なのはupgradesのみ）
    
    generateDungeon();
    startRoom();
    $('overlayGameOver').classList.remove('visible');
  }

  // ===== ハウス（強化画面） =====
  function showHouse() {
    updateHouseUI();
    $('overlayHouse').classList.add('visible');
    gameState.state = 'house';
  }

  function updateHouseUI() {
    $('darknessValue').textContent = gameState.darkness;
    
    var upgrades = $('houseUpgrades');
    upgrades.innerHTML = '';
    
    var upgradeList = [
      { id: 'maxHp', name: '最大HP強化', desc: '最大HP+10', cost: 50 + (gameState.upgrades.maxHp * 20) },
      { id: 'attackPower', name: '攻撃力強化', desc: '攻撃力+2', cost: 50 + (gameState.upgrades.attackPower * 20) },
      { id: 'speed', name: '移動速度強化', desc: '移動速度+0.5', cost: 50 + (gameState.upgrades.speed * 20) },
      { id: 'dashCooldown', name: 'ダッシュ強化', desc: 'ダッシュクールダウン-10', cost: 50 + (gameState.upgrades.dashCooldown * 20) }
    ];
    
    upgradeList.forEach(function(upgrade) {
      var card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = 
        '<div class="upgrade-header">' +
        '<div class="upgrade-name">' + upgrade.name + '</div>' +
        '<div class="upgrade-cost">' + upgrade.cost + ' ダークネス</div>' +
        '</div>' +
        '<div class="upgrade-desc">' + upgrade.desc + '</div>' +
        '<button class="btn" style="width:100%; margin-top:8px;" ' +
        (gameState.darkness >= upgrade.cost ? '' : 'disabled') +
        ' onclick="buyUpgrade(\'' + upgrade.id + '\', ' + upgrade.cost + ')">購入</button>';
      upgrades.appendChild(card);
    });
  }

  window.buyUpgrade = function(id, cost) {
    if (gameState.darkness >= cost) {
      gameState.darkness -= cost;
      gameState.upgrades[id] = (gameState.upgrades[id] || 0) + 1;
      updateHouseUI();
      saveGame();
    }
  };

  function startRun() {
    restartGame();
    $('overlayHouse').classList.remove('visible');
  }

  // ===== 描画 =====
  function draw() {
    // クリア
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (gameState.state === 'playing') {
      var p = gameState.player;
      
      // 目標位置の表示
      if (p.targetX !== null && p.targetY !== null) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.targetX, p.targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 目標位置のマーカー
        ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.beginPath();
        ctx.arc(p.targetX, p.targetY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // 自動攻撃範囲の表示（薄く）
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.autoAttackRange, 0, Math.PI * 2);
      ctx.stroke();
      
      // プレイヤー
      ctx.fillStyle = p.invulnerable > 0 && p.invulnerable % 10 < 5 ? '#888' : '#60a5fa';
      ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
      
      // ダッシュ中はエフェクト
      if (p.dashCooldown > p.maxDashCooldown - 10) {
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.width / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // 敵
      gameState.enemies.forEach(function(enemy) {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
        
        // HPバー
        var barWidth = enemy.width;
        var barHeight = 4;
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 8, barWidth, barHeight);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 8, barWidth * (enemy.hp / enemy.maxHp), barHeight);
      });
      
      // プロジェクトタイル
      gameState.projectiles.forEach(function(proj) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // ===== UI更新 =====
  function updateUI() {
    var p = gameState.player;
    var hpPercent = (p.hp / p.maxHp) * 100;
    $('hpBar').style.width = hpPercent + '%';
    $('hpValue').textContent = Math.floor(p.hp) + '/' + Math.floor(p.maxHp);
    $('floorValue').textContent = gameState.currentFloor;
    $('roomValue').textContent = gameState.currentRoom + '/' + ROOMS_PER_FLOOR;
  }

  // ===== イベントリスナー =====
  function initEventListeners() {
    // タップ操作のみ
    function handleTap(x, y) {
      var p = gameState.player;
      p.targetX = Math.max(p.width / 2, Math.min(ROOM_WIDTH - p.width / 2, x));
      p.targetY = Math.max(p.height / 2, Math.min(ROOM_HEIGHT - p.height / 2, y));
    }
    
    canvas.addEventListener('mousedown', function(e) {
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) / scale;
      var y = (e.clientY - rect.top) / scale;
      handleTap(x, y);
      gameState.mouse.down = true;
      e.preventDefault();
    });
    
    canvas.addEventListener('mousemove', function(e) {
      if (gameState.mouse.down) {
        var rect = canvas.getBoundingClientRect();
        var x = (e.clientX - rect.left) / scale;
        var y = (e.clientY - rect.top) / scale;
        handleTap(x, y);
      }
    });
    
    canvas.addEventListener('mouseup', function(e) {
      gameState.mouse.down = false;
    });
    
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var x = (touch.clientX - rect.left) / scale;
      var y = (touch.clientY - rect.top) / scale;
      handleTap(x, y);
      gameState.mouse.down = true;
    });
    
    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var x = (touch.clientX - rect.left) / scale;
      var y = (touch.clientY - rect.top) / scale;
      handleTap(x, y);
    });
    
    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      gameState.mouse.down = false;
    });
    
    // ボタン
    $('btnRestart').addEventListener('click', restartGame);
    $('btnHouse').addEventListener('click', showHouse);
    $('btnStartRun').addEventListener('click', startRun);
    $('btnCloseHouse').addEventListener('click', function() {
      $('overlayHouse').classList.remove('visible');
    });
    
  }

  // ===== ゲームループ =====
  function gameLoop() {
    if (gameState.state === 'playing') {
      updatePlayer();
      updateEnemies();
      updateProjectiles();
      updateUI();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
  }

  // ===== 初期化 =====
  function init() {
    loadGame();
    generateDungeon();
    initEventListeners();
    showHouse();
    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
