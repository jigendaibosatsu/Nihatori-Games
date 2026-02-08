(function () {
  'use strict';

  // ===== 定数定義 =====
  var CANVAS_WIDTH = 800;
  var CANVAS_HEIGHT = 600;
  var PLAYER_SIZE = 24;
  var ENEMY_SPAWN_DISTANCE = 100; // 画面外からの距離

  // ===== ゲーム状態 =====
  var gameState = {
    // プレイヤー
    player: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      targetX: CANVAS_WIDTH / 2,
      targetY: CANVAS_HEIGHT / 2,
      speed: 3,
      hp: 100,
      maxHp: 100,
      radius: PLAYER_SIZE / 2,
      invulnerable: 0
    },
    
    // 敵
    enemies: [],
    enemySpawnTimer: 0,
    enemySpawnDelay: 60,
    
    // 攻撃
    attacks: [],
    attackCooldowns: {},
    
    // 経験値・レベル
    exp: 0,
    expToNext: 10,
    level: 1,
    
    // スキル
    skills: {
      attackPower: 0,
      attackSpeed: 0,
      moveSpeed: 0,
      maxHp: 0,
      attackRange: 0,
      projectileCount: 0
    },
    
    // 時間
    gameTime: 0,
    startTime: Date.now(),
    
    // ゲーム状態
    state: 'playing', // 'playing' | 'levelup' | 'gameover'
    mouse: { x: 0, y: 0 }
  };

  // スキル定義
  var SKILLS = [
    {
      id: 'attackPower',
      name: '攻撃力アップ',
      desc: '攻撃力が+5上がります',
      effect: function() { gameState.skills.attackPower++; }
    },
    {
      id: 'attackSpeed',
      name: '攻撃速度アップ',
      desc: '攻撃速度が+20%上がります',
      effect: function() { gameState.skills.attackSpeed++; }
    },
    {
      id: 'moveSpeed',
      name: '移動速度アップ',
      desc: '移動速度が+0.5上がります',
      effect: function() { gameState.player.speed += 0.5; }
    },
    {
      id: 'maxHp',
      name: '最大HPアップ',
      desc: '最大HPが+20上がります',
      effect: function() {
        gameState.skills.maxHp++;
        gameState.player.maxHp += 20;
        gameState.player.hp += 20;
      }
    },
    {
      id: 'attackRange',
      name: '攻撃範囲拡大',
      desc: '攻撃範囲が+20広がります',
      effect: function() { gameState.skills.attackRange++; }
    },
    {
      id: 'projectileCount',
      name: '投射物数増加',
      desc: '投射物の数が+1増えます',
      effect: function() { gameState.skills.projectileCount++; }
    }
  ];

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

  // ===== プレイヤー =====
  function updatePlayer() {
    var p = gameState.player;
    
    // 目標位置への移動
    var dx = p.targetX - p.x;
    var dy = p.targetY - p.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 2) {
      p.x += (dx / dist) * p.speed;
      p.y += (dy / dist) * p.speed;
    } else {
      p.x = p.targetX;
      p.y = p.targetY;
    }
    
    // 境界チェック
    p.x = Math.max(p.radius, Math.min(CANVAS_WIDTH - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(CANVAS_HEIGHT - p.radius, p.y));
    
    // 無敵時間
    if (p.invulnerable > 0) p.invulnerable--;
  }

  // ===== 敵システム =====
  function createEnemy() {
    // 画面外のランダムな位置から生成
    var side = randomInt(0, 3);
    var x, y;
    
    switch (side) {
      case 0: // 上
        x = random(0, CANVAS_WIDTH);
        y = -ENEMY_SPAWN_DISTANCE;
        break;
      case 1: // 右
        x = CANVAS_WIDTH + ENEMY_SPAWN_DISTANCE;
        y = random(0, CANVAS_HEIGHT);
        break;
      case 2: // 下
        x = random(0, CANVAS_WIDTH);
        y = CANVAS_HEIGHT + ENEMY_SPAWN_DISTANCE;
        break;
      case 3: // 左
        x = -ENEMY_SPAWN_DISTANCE;
        y = random(0, CANVAS_HEIGHT);
        break;
    }
    
    // 難易度に応じて敵の強さを調整
    var difficulty = Math.floor(gameState.gameTime / 60); // 秒単位
    var baseHp = 20 + difficulty * 5;
    var baseSpeed = 1.5 + difficulty * 0.1;
    
    return {
      id: Date.now() + Math.random(),
      x: x,
      y: y,
      hp: baseHp,
      maxHp: baseHp,
      speed: Math.min(baseSpeed, 4),
      radius: 10,
      color: '#ef4444',
      reward: 1 + Math.floor(difficulty / 10)
    };
  }

  function spawnEnemy() {
    var difficulty = Math.floor(gameState.gameTime / 60);
    var spawnRate = Math.max(30, 60 - difficulty * 2); // 難易度が上がると生成頻度が上がる
    
    gameState.enemySpawnTimer++;
    if (gameState.enemySpawnTimer >= spawnRate) {
      var count = 1 + Math.floor(difficulty / 30); // 後半は複数同時生成
      for (var i = 0; i < count; i++) {
        gameState.enemies.push(createEnemy());
      }
      gameState.enemySpawnTimer = 0;
    }
  }

  function updateEnemies() {
    var p = gameState.player;
    
    gameState.enemies.forEach(function(enemy) {
      // プレイヤーに向かって移動
      var dx = p.x - enemy.x;
      var dy = p.y - enemy.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }
      
      // プレイヤーとの衝突
      if (dist < p.radius + enemy.radius && p.invulnerable <= 0) {
        p.hp -= 10;
        p.invulnerable = 30;
        
        if (p.hp <= 0) {
          gameOver();
        }
      }
    });
    
    // 画面外の敵を削除
    gameState.enemies = gameState.enemies.filter(function(enemy) {
      return enemy.x > -100 && enemy.x < CANVAS_WIDTH + 100 &&
             enemy.y > -100 && enemy.y < CANVAS_HEIGHT + 100 &&
             enemy.hp > 0;
    });
  }

  // ===== 攻撃システム =====
  function performAttacks() {
    var p = gameState.player;
    var baseAttackSpeed = 30;
    var attackSpeed = baseAttackSpeed / (1 + gameState.skills.attackSpeed * 0.2);
    
    // 攻撃クールダウン管理
    if (!gameState.attackCooldowns.melee) gameState.attackCooldowns.melee = 0;
    if (!gameState.attackCooldowns.projectile) gameState.attackCooldowns.projectile = 0;
    
    gameState.attackCooldowns.melee--;
    gameState.attackCooldowns.projectile--;
    
    // 近接攻撃（周囲）
    if (gameState.attackCooldowns.melee <= 0) {
      var attackRange = 60 + gameState.skills.attackRange * 20;
      var attackPower = 10 + gameState.skills.attackPower * 5;
      
      gameState.enemies.forEach(function(enemy) {
        var dist = distance(p.x, p.y, enemy.x, enemy.y);
        if (dist < attackRange) {
          enemy.hp -= attackPower;
          
          // 経験値獲得
          if (enemy.hp <= 0) {
            gameState.exp += enemy.reward;
            checkLevelUp();
          }
        }
      });
      
      // 攻撃エフェクト
      gameState.attacks.push({
        type: 'melee',
        x: p.x,
        y: p.y,
        radius: attackRange,
        lifetime: 10,
        color: '#fbbf24'
      });
      
      gameState.attackCooldowns.melee = attackSpeed;
    }
    
    // 投射物攻撃
    if (gameState.attackCooldowns.projectile <= 0) {
      var projectileCount = 1 + gameState.skills.projectileCount;
      var angleStep = (Math.PI * 2) / projectileCount;
      
      for (var i = 0; i < projectileCount; i++) {
        var angle = (gameState.gameTime * 0.1) + (i * angleStep);
        var vx = Math.cos(angle) * 4;
        var vy = Math.sin(angle) * 4;
        
        gameState.attacks.push({
          type: 'projectile',
          x: p.x,
          y: p.y,
          vx: vx,
          vy: vy,
          damage: 5 + gameState.skills.attackPower * 3,
          radius: 8,
          lifetime: 120,
          color: '#60a5fa'
        });
      }
      
      gameState.attackCooldowns.projectile = attackSpeed * 2;
    }
  }

  function updateAttacks() {
    gameState.attacks = gameState.attacks.filter(function(attack) {
      attack.lifetime--;
        
      if (attack.type === 'projectile') {
        attack.x += attack.vx;
        attack.y += attack.vy;
        
        // 敵との衝突判定
        var hit = false;
        gameState.enemies.forEach(function(enemy) {
          if (!hit && distance(attack.x, attack.y, enemy.x, enemy.y) < enemy.radius + attack.radius) {
            enemy.hp -= attack.damage;
            hit = true;
            
            if (enemy.hp <= 0) {
              gameState.exp += enemy.reward;
              checkLevelUp();
            }
          }
        });
        
        // 画面外チェック
        if (attack.x < -50 || attack.x > CANVAS_WIDTH + 50 ||
            attack.y < -50 || attack.y > CANVAS_HEIGHT + 50) {
          return false;
        }
        
        return attack.lifetime > 0 && !hit;
      } else {
        // 近接攻撃エフェクト
        return attack.lifetime > 0;
      }
    });
  }

  // ===== レベルアップ =====
  function checkLevelUp() {
    if (gameState.exp >= gameState.expToNext) {
      gameState.exp -= gameState.expToNext;
      gameState.level++;
      gameState.expToNext = Math.floor(10 * Math.pow(1.2, gameState.level - 1));
      showLevelUp();
    }
  }

  function showLevelUp() {
    // ランダムに3つのスキルを選択
    var availableSkills = SKILLS.slice();
    var selectedSkills = [];
    
    for (var i = 0; i < 3 && availableSkills.length > 0; i++) {
      var index = randomInt(0, availableSkills.length - 1);
      selectedSkills.push(availableSkills[index]);
      availableSkills.splice(index, 1);
    }
    
    var list = $('skillList');
    list.innerHTML = '';
    
    selectedSkills.forEach(function(skill) {
      var card = document.createElement('div');
      card.className = 'skill-card';
      card.innerHTML = 
        '<div class="skill-name">' + skill.name + '</div>' +
        '<div class="skill-desc">' + skill.desc + '</div>';
      card.addEventListener('click', function() {
        selectSkill(skill);
      });
      list.appendChild(card);
    });
    
    $('overlayLevelUp').classList.add('visible');
    gameState.state = 'levelup';
  }

  function selectSkill(skill) {
    skill.effect();
    $('overlayLevelUp').classList.remove('visible');
    gameState.state = 'playing';
    updateUI();
  }

  // ===== ゲーム管理 =====
  function gameOver() {
    gameState.state = 'gameover';
    var minutes = Math.floor(gameState.gameTime / 60);
    var seconds = gameState.gameTime % 60;
    var timeStr = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    
    $('gameOverContent').innerHTML = 
      '<p>生存時間: ' + timeStr + '</p>' +
      '<p>到達レベル: ' + gameState.level + '</p>' +
      '<p>倒した敵: ' + (gameState.level * 10) + '体以上</p>';
    $('overlayGameOver').classList.add('visible');
  }

  function restartGame() {
    gameState.player.x = CANVAS_WIDTH / 2;
    gameState.player.y = CANVAS_HEIGHT / 2;
    gameState.player.targetX = CANVAS_WIDTH / 2;
    gameState.player.targetY = CANVAS_HEIGHT / 2;
    gameState.player.hp = 100;
    gameState.player.maxHp = 100;
    gameState.player.speed = 3;
    gameState.enemies = [];
    gameState.attacks = [];
    gameState.attackCooldowns = {};
    gameState.exp = 0;
    gameState.expToNext = 10;
    gameState.level = 1;
    gameState.skills = {
      attackPower: 0,
      attackSpeed: 0,
      moveSpeed: 0,
      maxHp: 0,
      attackRange: 0,
      projectileCount: 0
    };
    gameState.gameTime = 0;
    gameState.startTime = Date.now();
    gameState.state = 'playing';
    
    updateUI();
    $('overlayGameOver').classList.remove('visible');
    $('overlayLevelUp').classList.remove('visible');
  }

  // ===== 描画 =====
  function draw() {
    // クリア
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    var p = gameState.player;
    
    // 攻撃エフェクト
    gameState.attacks.forEach(function(attack) {
      if (attack.type === 'melee') {
        ctx.strokeStyle = attack.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else if (attack.type === 'projectile') {
        ctx.fillStyle = attack.color;
        ctx.beginPath();
        ctx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // 敵
    gameState.enemies.forEach(function(enemy) {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // HPバー
      var barWidth = enemy.radius * 2;
      var barHeight = 3;
      ctx.fillStyle = '#333';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 6, barWidth, barHeight);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 6, barWidth * (enemy.hp / enemy.maxHp), barHeight);
    });
    
    // プレイヤー
    ctx.fillStyle = p.invulnerable > 0 && p.invulnerable % 10 < 5 ? '#888' : '#60a5fa';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===== UI更新 =====
  function updateUI() {
    var p = gameState.player;
    var hpPercent = (p.hp / p.maxHp) * 100;
    $('hpBar').style.width = hpPercent + '%';
    $('hpValue').textContent = Math.floor(p.hp) + '/' + Math.floor(p.maxHp);
    $('levelValue').textContent = gameState.level;
    
    var expPercent = (gameState.exp / gameState.expToNext) * 100;
    $('expBar').style.width = expPercent + '%';
    $('expValue').textContent = gameState.exp + '/' + gameState.expToNext;
    
    var minutes = Math.floor(gameState.gameTime / 60);
    var seconds = gameState.gameTime % 60;
    $('timeValue').textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  // ===== イベントリスナー =====
  function initEventListeners() {
    // タップ/マウスで移動
    function handleMove(x, y) {
      var p = gameState.player;
      p.targetX = Math.max(p.radius, Math.min(CANVAS_WIDTH - p.radius, x));
      p.targetY = Math.max(p.radius, Math.min(CANVAS_HEIGHT - p.radius, y));
    }
    
    canvas.addEventListener('mousedown', function(e) {
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) / scale;
      var y = (e.clientY - rect.top) / scale;
      handleMove(x, y);
      e.preventDefault();
    });
    
    canvas.addEventListener('mousemove', function(e) {
      if (e.buttons === 1) {
        var rect = canvas.getBoundingClientRect();
        var x = (e.clientX - rect.left) / scale;
        var y = (e.clientY - rect.top) / scale;
        handleMove(x, y);
      }
    });
    
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var x = (touch.clientX - rect.left) / scale;
      var y = (touch.clientY - rect.top) / scale;
      handleMove(x, y);
    });
    
    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var x = (touch.clientX - rect.left) / scale;
      var y = (touch.clientY - rect.top) / scale;
      handleMove(x, y);
    });
    
    // ボタン
    $('btnRestart').addEventListener('click', restartGame);
  }

  // ===== ゲームループ =====
  function gameLoop() {
    if (gameState.state === 'playing') {
      // 時間更新
      gameState.gameTime = Math.floor((Date.now() - gameState.startTime) / 1000);
      
      updatePlayer();
      spawnEnemy();
      updateEnemies();
      performAttacks();
      updateAttacks();
      updateUI();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
  }

  // ===== 初期化 =====
  function init() {
    initEventListeners();
    updateUI();
    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
