(function () {
  'use strict';

  // ===== 定数定義 =====
  var CANVAS_WIDTH = 800;
  var CANVAS_HEIGHT = 600;
  var GRID_SIZE = 40;
  var GRID_COLS = Math.floor(CANVAS_WIDTH / GRID_SIZE);
  var GRID_ROWS = Math.floor(CANVAS_HEIGHT / GRID_SIZE);

  // タワータイプ
  var TOWER_TYPES = {
    basic: {
      name: '基本タワー',
      cost: 50,
      upgradeCost: 30,
      damage: 25,
      range: 100,
      attackSpeed: 20,
      color: '#60a5fa'
    },
    fast: {
      name: '高速タワー',
      cost: 100,
      upgradeCost: 50,
      damage: 15,
      range: 80,
      attackSpeed: 10,
      color: '#34d399'
    },
    power: {
      name: '強力タワー',
      cost: 200,
      upgradeCost: 100,
      damage: 50,
      range: 120,
      attackSpeed: 25,
      color: '#f87171'
    }
  };

  // 敵タイプ
  var ENEMY_TYPES = {
    normal: {
      name: '通常敵',
      hp: 40,
      speed: 1.5,
      reward: 10,
      color: '#f59e0b'
    },
    fast: {
      name: '高速敵',
      hp: 25,
      speed: 3,
      reward: 15,
      color: '#8b5cf6'
    },
    tank: {
      name: '重装敵',
      hp: 120,
      speed: 0.8,
      reward: 25,
      color: '#ef4444'
    }
  };

  // ===== ゲーム状態 =====
  var gameState = {
    // リソース
    coins: 100,
    life: 20,
    maxLife: 20,
    
    // ウェーブ
    currentWave: 1,
    waveInProgress: false,
    waveEnemies: [],
    waveSpawnTimer: 0,
    waveSpawnDelay: 60,
    
    // タワー
    towers: [],
    selectedTowerType: null,
    selectedTower: null,
    
    // 敵
    enemies: [],
    
    // プロジェクトタイル
    projectiles: [],
    
    // パス
    path: [],
    
    // ゲーム状態
    state: 'waveStart', // 'waveStart' | 'playing' | 'gameover' | 'victory'
    mouse: { x: 0, y: 0 }
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

  function snapToGrid(x, y) {
    return {
      x: Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2,
      y: Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2
    };
  }

  function isOnPath(x, y) {
    var gridX = Math.floor(x / GRID_SIZE);
    var gridY = Math.floor(y / GRID_SIZE);
    
    return gameState.path.some(function(point) {
      return Math.floor(point.x / GRID_SIZE) === gridX && 
             Math.floor(point.y / GRID_SIZE) === gridY;
    });
  }

  function canPlaceTower(x, y) {
    // パス上でない
    if (isOnPath(x, y)) return false;
    
    // 既存のタワーと重複しない
    return !gameState.towers.some(function(tower) {
      return distance(tower.x, tower.y, x, y) < GRID_SIZE;
    });
  }

  // ===== パス生成 =====
  function generatePath() {
    // シンプルなS字パス
    gameState.path = [];
    
    // スタート（左側中央）
    var startY = CANVAS_HEIGHT / 2;
    for (var x = 0; x < CANVAS_WIDTH / 3; x += GRID_SIZE) {
      gameState.path.push({ x: x, y: startY });
    }
    
    // 下へ
    for (var y = startY; y < CANVAS_HEIGHT - 50; y += GRID_SIZE) {
      gameState.path.push({ x: CANVAS_WIDTH / 3, y: y });
    }
    
    // 右へ
    for (var x = CANVAS_WIDTH / 3; x < CANVAS_WIDTH * 2 / 3; x += GRID_SIZE) {
      gameState.path.push({ x: x, y: CANVAS_HEIGHT - 50 });
    }
    
    // 上へ
    for (var y = CANVAS_HEIGHT - 50; y > 50; y -= GRID_SIZE) {
      gameState.path.push({ x: CANVAS_WIDTH * 2 / 3, y: y });
    }
    
    // ゴールへ（右側）
    for (var x = CANVAS_WIDTH * 2 / 3; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      gameState.path.push({ x: x, y: 50 });
    }
  }

  // ===== タワーシステム =====
  function createTower(type, x, y) {
    var towerType = TOWER_TYPES[type];
    return {
      id: Date.now() + Math.random(),
      type: type,
      x: x,
      y: y,
      level: 1,
      damage: towerType.damage,
      range: towerType.range,
      attackSpeed: towerType.attackSpeed,
      attackCooldown: 0,
      color: towerType.color
    };
  }

  function placeTower(type, x, y) {
    var snapped = snapToGrid(x, y);
    
    if (!canPlaceTower(snapped.x, snapped.y)) {
      return false;
    }
    
    var towerType = TOWER_TYPES[type];
    if (gameState.coins < towerType.cost) {
      alert('コインが足りません！');
      return false;
    }
    
    gameState.coins -= towerType.cost;
    gameState.towers.push(createTower(type, snapped.x, snapped.y));
    updateUI();
    return true;
  }

  function upgradeTower(tower) {
    var towerType = TOWER_TYPES[tower.type];
    var cost = towerType.upgradeCost * tower.level;
    
    if (gameState.coins < cost) {
      alert('コインが足りません！');
      return false;
    }
    
    gameState.coins -= cost;
    tower.level++;
    tower.damage = Math.floor(towerType.damage * (1 + tower.level * 0.3));
    tower.range = Math.floor(towerType.range * (1 + tower.level * 0.1));
    updateUI();
    return true;
  }

  function sellTower(tower) {
    var index = gameState.towers.indexOf(tower);
    if (index >= 0) {
      var refund = Math.floor(TOWER_TYPES[tower.type].cost * 0.5 * tower.level);
      gameState.coins += refund;
      gameState.towers.splice(index, 1);
      gameState.selectedTower = null;
      updateUI();
      return true;
    }
    return false;
  }

  function updateTowers() {
    gameState.towers.forEach(function(tower) {
      if (tower.attackCooldown > 0) {
        tower.attackCooldown--;
      }
      
      // 最も近い敵を探す
      var nearestEnemy = null;
      var nearestDist = tower.range;
      
      gameState.enemies.forEach(function(enemy) {
        var dist = distance(tower.x, tower.y, enemy.x, enemy.y);
        if (dist < nearestDist && enemy.hp > 0) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      });
      
      // 攻撃
      if (nearestEnemy && tower.attackCooldown <= 0) {
        var angle = Math.atan2(nearestEnemy.y - tower.y, nearestEnemy.x - tower.x);
        
        gameState.projectiles.push({
          x: tower.x,
          y: tower.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          damage: tower.damage,
          target: nearestEnemy,
          radius: 6,
          lifetime: 120
        });
        
        tower.attackCooldown = tower.attackSpeed;
      }
    });
  }

  // ===== 敵システム =====
  function createEnemy(type) {
    var enemyType = ENEMY_TYPES[type];
    var startPoint = gameState.path[0];
    
    return {
      id: Date.now() + Math.random(),
      type: type,
      x: startPoint.x,
      y: startPoint.y,
      pathIndex: 0,
      hp: enemyType.hp,
      maxHp: enemyType.hp,
      speed: enemyType.speed,
      reward: enemyType.reward,
      color: enemyType.color,
      radius: 12
    };
  }

  function generateWave(waveNumber) {
    var enemies = [];
    var enemyCount = 5 + waveNumber * 2;
    
    for (var i = 0; i < enemyCount; i++) {
      var type = 'normal';
      var rand = Math.random();
      
      if (waveNumber >= 3 && rand < 0.2) {
        type = 'tank';
      } else if (waveNumber >= 2 && rand < 0.3) {
        type = 'fast';
      }
      
      enemies.push({ type: type, delay: i * 30 });
    }
    
    return enemies;
  }

  function updateEnemies() {
    // ウェーブ中の敵生成
    if (gameState.waveInProgress && gameState.waveEnemies.length > 0) {
      gameState.waveSpawnTimer++;
      
      if (gameState.waveSpawnTimer >= gameState.waveSpawnDelay) {
        var nextEnemy = gameState.waveEnemies.shift();
        if (nextEnemy) {
          gameState.enemies.push(createEnemy(nextEnemy.type));
          gameState.waveSpawnTimer = nextEnemy.delay;
        }
      }
    }
    
    // 敵の移動
    gameState.enemies.forEach(function(enemy) {
      if (enemy.pathIndex >= gameState.path.length - 1) {
        // ゴール到達
        gameState.life--;
        if (gameState.life <= 0) {
          gameOver();
        }
        enemy.hp = 0;
        return;
      }
      
      var targetPoint = gameState.path[enemy.pathIndex + 1];
      var dx = targetPoint.x - enemy.x;
      var dy = targetPoint.y - enemy.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 5) {
        enemy.pathIndex++;
      } else {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }
    });
    
    // 倒された敵を削除
    gameState.enemies = gameState.enemies.filter(function(enemy) {
      if (enemy.hp <= 0 && enemy.pathIndex < gameState.path.length - 1) {
        gameState.coins += enemy.reward;
        return false;
      }
      return enemy.hp > 0;
    });
    
    // ウェーブ終了チェック
    if (gameState.waveInProgress && 
        gameState.enemies.length === 0 && 
        gameState.waveEnemies.length === 0) {
      completeWave();
    }
  }

  function completeWave() {
    gameState.waveInProgress = false;
    gameState.currentWave++;
    
    if (gameState.currentWave > 10) {
      victory();
    } else {
      showWaveStart();
    }
    
    updateUI();
  }

  function startWave() {
    gameState.waveInProgress = true;
    gameState.state = 'playing';
    gameState.waveEnemies = generateWave(gameState.currentWave);
    gameState.waveSpawnTimer = 0;
    $('overlayWaveStart').classList.remove('visible');
    updateUI();
  }

  function showWaveStart() {
    $('waveStartNumber').textContent = gameState.currentWave;
    $('waveStartInfo').textContent = '準備してください';
    $('overlayWaveStart').classList.add('visible');
    gameState.state = 'waveStart';
  }

  // ===== プロジェクトタイル =====
  function updateProjectiles() {
    gameState.projectiles = gameState.projectiles.filter(function(proj) {
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.lifetime--;
      
      // ターゲットとの衝突判定
      if (proj.target && proj.target.hp > 0) {
        var dist = distance(proj.x, proj.y, proj.target.x, proj.target.y);
        if (dist < proj.target.radius + proj.radius) {
          proj.target.hp -= proj.damage;
          return false;
        }
      }
      
      return proj.lifetime > 0;
    });
  }

  // ===== ゲーム管理 =====
  function gameOver() {
    gameState.state = 'gameover';
    $('gameOverTitle').textContent = 'ゲームオーバー';
    $('gameOverContent').innerHTML = 
      '<p>ウェーブ ' + gameState.currentWave + ' で敗北しました</p>' +
      '<p>クリアウェーブ: ' + (gameState.currentWave - 1) + '</p>';
    $('overlayGameOver').classList.add('visible');
  }

  function victory() {
    gameState.state = 'victory';
    $('gameOverTitle').textContent = '勝利！';
    $('gameOverContent').innerHTML = 
      '<p>おめでとうございます！全10ウェーブをクリアしました！</p>';
    $('overlayGameOver').classList.add('visible');
  }

  function restartGame() {
    gameState.coins = 100;
    gameState.life = 20;
    gameState.currentWave = 1;
    gameState.towers = [];
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.selectedTower = null;
    gameState.selectedTowerType = null;
    gameState.waveInProgress = false;
    
    generatePath();
    showWaveStart();
    updateUI();
    $('overlayGameOver').classList.remove('visible');
  }

  // ===== 描画 =====
  function draw() {
    // クリア
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // グリッド
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (var x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * GRID_SIZE, 0);
      ctx.lineTo(x * GRID_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (var y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * GRID_SIZE);
      ctx.lineTo(CANVAS_WIDTH, y * GRID_SIZE);
      ctx.stroke();
    }
    
    // パス
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = GRID_SIZE - 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (gameState.path.length > 0) {
      ctx.moveTo(gameState.path[0].x, gameState.path[0].y);
      for (var i = 1; i < gameState.path.length; i++) {
        ctx.lineTo(gameState.path[i].x, gameState.path[i].y);
      }
    }
    ctx.stroke();
    
    // スタート/ゴールマーカー
    if (gameState.path.length > 0) {
      var start = gameState.path[0];
      var goal = gameState.path[gameState.path.length - 1];
      
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // タワー配置プレビュー
    if (gameState.selectedTowerType && gameState.mouse.x > 0 && gameState.mouse.y > 0) {
      var snapped = snapToGrid(gameState.mouse.x, gameState.mouse.y);
      var canPlace = canPlaceTower(snapped.x, snapped.y);
      
      ctx.fillStyle = canPlace ? 'rgba(96,165,250,0.3)' : 'rgba(239,68,68,0.3)';
      ctx.beginPath();
      ctx.arc(snapped.x, snapped.y, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // タワー
    gameState.towers.forEach(function(tower) {
      // 範囲表示（選択時）
      if (gameState.selectedTower === tower) {
        ctx.strokeStyle = 'rgba(96,165,250,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // タワー本体
      ctx.fillStyle = tower.color;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // レベル表示
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tower.level, tower.x, tower.y);
    });
    
    // 敵
    gameState.enemies.forEach(function(enemy) {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // HPバー
      var barWidth = enemy.radius * 2;
      var barHeight = 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth, barHeight);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth * (enemy.hp / enemy.maxHp), barHeight);
    });
    
    // プロジェクトタイル
    gameState.projectiles.forEach(function(proj) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ===== UI更新 =====
  function updateUI() {
    var lifePercent = (gameState.life / gameState.maxLife) * 100;
    $('lifeBar').style.width = lifePercent + '%';
    $('lifeValue').textContent = gameState.life + '/' + gameState.maxLife;
    $('coinValue').textContent = gameState.coins;
    $('waveValue').textContent = gameState.currentWave;
    
    // ショップボタンの有効/無効
    Object.keys(TOWER_TYPES).forEach(function(type) {
      var btn = $('btnTower' + type.charAt(0).toUpperCase() + type.slice(1));
      if (btn) {
        btn.disabled = gameState.coins < TOWER_TYPES[type].cost;
        btn.classList.toggle('selected', gameState.selectedTowerType === type);
      }
    });
  }

  function showTowerInfo(tower) {
    gameState.selectedTower = tower;
    var towerType = TOWER_TYPES[tower.type];
    var upgradeCost = towerType.upgradeCost * tower.level;
    
    $('towerInfoName').textContent = towerType.name + ' Lv' + tower.level;
    $('towerInfoContent').innerHTML = 
      '<p>ダメージ: ' + tower.damage + '</p>' +
      '<p>範囲: ' + tower.range + '</p>' +
      '<p>攻撃速度: ' + tower.attackSpeed + '</p>' +
      '<p>アップグレードコスト: ' + upgradeCost + ' コイン</p>' +
      '<p>売却価格: ' + Math.floor(towerType.cost * 0.5 * tower.level) + ' コイン</p>';
    
    $('btnUpgradeTower').disabled = gameState.coins < upgradeCost;
    $('overlayTowerInfo').classList.add('visible');
  }

  // ===== イベントリスナー =====
  function initEventListeners() {
    // タワー選択
    Object.keys(TOWER_TYPES).forEach(function(type) {
      var btn = $('btnTower' + type.charAt(0).toUpperCase() + type.slice(1));
      if (btn) {
        btn.addEventListener('click', function() {
          if (gameState.selectedTowerType === type) {
            gameState.selectedTowerType = null;
          } else {
            gameState.selectedTowerType = type;
            gameState.selectedTower = null;
            $('overlayTowerInfo').classList.remove('visible');
          }
          updateUI();
        });
      }
    });
    
    // キャンバスクリック
    canvas.addEventListener('click', function(e) {
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) / scale;
      var y = (e.clientY - rect.top) / scale;
      
      // タワー選択チェック
      var clickedTower = null;
      gameState.towers.forEach(function(tower) {
        if (distance(x, y, tower.x, tower.y) < 20) {
          clickedTower = tower;
        }
      });
      
      if (clickedTower) {
        showTowerInfo(clickedTower);
        gameState.selectedTowerType = null;
        updateUI();
      } else if (gameState.selectedTowerType) {
        // タワー配置
        if (placeTower(gameState.selectedTowerType, x, y)) {
          gameState.selectedTowerType = null;
        }
      } else {
        // 選択解除
        gameState.selectedTower = null;
        $('overlayTowerInfo').classList.remove('visible');
      }
    });
    
    canvas.addEventListener('mousemove', function(e) {
      var rect = canvas.getBoundingClientRect();
      gameState.mouse.x = (e.clientX - rect.left) / scale;
      gameState.mouse.y = (e.clientY - rect.top) / scale;
    });
    
    // タッチ対応
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var x = (touch.clientX - rect.left) / scale;
      var y = (touch.clientY - rect.top) / scale;
      
      var clickedTower = null;
      gameState.towers.forEach(function(tower) {
        if (distance(x, y, tower.x, tower.y) < 20) {
          clickedTower = tower;
        }
      });
      
      if (clickedTower) {
        showTowerInfo(clickedTower);
        gameState.selectedTowerType = null;
        updateUI();
      } else if (gameState.selectedTowerType) {
        if (placeTower(gameState.selectedTowerType, x, y)) {
          gameState.selectedTowerType = null;
        }
      } else {
        gameState.selectedTower = null;
        $('overlayTowerInfo').classList.remove('visible');
      }
    });
    
    // ボタン
    $('btnStartWave').addEventListener('click', startWave);
    $('btnRestart').addEventListener('click', restartGame);
    $('btnUpgradeTower').addEventListener('click', function() {
      if (gameState.selectedTower) {
        if (upgradeTower(gameState.selectedTower)) {
          showTowerInfo(gameState.selectedTower);
        }
      }
    });
    $('btnSellTower').addEventListener('click', function() {
      if (gameState.selectedTower) {
        sellTower(gameState.selectedTower);
        $('overlayTowerInfo').classList.remove('visible');
      }
    });
    $('btnCloseTowerInfo').addEventListener('click', function() {
      $('overlayTowerInfo').classList.remove('visible');
      gameState.selectedTower = null;
    });
  }

  // ===== ゲームループ =====
  function gameLoop() {
    if (gameState.state === 'playing' || gameState.waveInProgress) {
      updateTowers();
      updateEnemies();
      updateProjectiles();
      updateUI();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
  }

  // ===== 初期化 =====
  function init() {
    generatePath();
    initEventListeners();
    showWaveStart();
    updateUI();
    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
