(function () {
  'use strict';

  // ===== 定数定義 =====
  var CANVAS_WIDTH = 800;
  var CANVAS_HEIGHT = 600;
  var TURN_DELAY = 1000; // 1秒ごとにターン進行

  // ===== ゲーム状態 =====
  var gameState = {
    // リソース
    coins: 100,
    
    // ウェーブ
    currentWave: 1,
    waveInProgress: false,
    
    // ウーパー
    axolotls: [],
    nextAxolotlId: 1,
    
    // 敵
    currentEnemy: null,
    
    // バトル
    turnTimer: 0,
    battleLog: [],
    
    // ゲーム状態
    state: 'playing' // 'playing' | 'waveClear' | 'upgrade' | 'recruit'
  };

  // ウーパータイプ定義
  var AXOLOTL_TYPES = {
    basic: {
      name: 'リューシ',
      cost: 50,
      baseHp: 100,
      baseAttack: 20,
      baseDefense: 5,
      imagePath: '/assets/axolotl/axo_nomal.png'
    },
    albino: {
      name: 'アルビノ',
      cost: 80,
      baseHp: 80,
      baseAttack: 25,
      baseDefense: 3,
      imagePath: '/assets/axolotl/axo_albino.png'
    },
    gold: {
      name: 'ゴールド',
      cost: 150,
      baseHp: 120,
      baseAttack: 30,
      baseDefense: 8,
      imagePath: '/assets/axolotl/axo_gold.png'
    },
    marble: {
      name: 'マーブル',
      cost: 120,
      baseHp: 110,
      baseAttack: 22,
      baseDefense: 7,
      imagePath: '/assets/axolotl/axo_marble.png'
    },
    black: {
      name: 'ブラック',
      cost: 200,
      baseHp: 150,
      baseAttack: 35,
      baseDefense: 10,
      imagePath: '/assets/axolotl/axo_black.png'
    }
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

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  }

  // ===== ウーパーシステム =====
  function createAxolotl(type) {
    var axolotlType = AXOLOTL_TYPES[type];
    return {
      id: gameState.nextAxolotlId++,
      type: type,
      name: axolotlType.name,
      hp: axolotlType.baseHp,
      maxHp: axolotlType.baseHp,
      attack: axolotlType.baseAttack,
      defense: axolotlType.baseDefense,
      level: 1,
      exp: 0,
      expToNext: 10,
      x: 0,
      y: 0,
      imagePath: axolotlType.imagePath
    };
  }

  function addAxolotl(type) {
    var axolotlType = AXOLOTL_TYPES[type];
    if (gameState.coins < axolotlType.cost) {
      alert('コインが足りません！');
      return false;
    }
    
    gameState.coins -= axolotlType.cost;
    var axolotl = createAxolotl(type);
    
    // 配置位置を計算
    var count = gameState.axolotls.length;
    var cols = 3;
    var spacing = 150;
    var startX = CANVAS_WIDTH / 2 - (cols - 1) * spacing / 2;
    axolotl.x = startX + (count % cols) * spacing;
    axolotl.y = CANVAS_HEIGHT / 2 + Math.floor(count / cols) * 100;
    
    gameState.axolotls.push(axolotl);
    updateUI();
    return true;
  }

  function upgradeAxolotl(axolotl) {
    var cost = 50 * axolotl.level;
    if (gameState.coins < cost) {
      alert('コインが足りません！');
      return false;
    }
    
    gameState.coins -= cost;
    axolotl.level++;
    axolotl.maxHp = Math.floor(axolotl.maxHp * 1.2);
    axolotl.hp = axolotl.maxHp;
    axolotl.attack = Math.floor(axolotl.attack * 1.15);
    axolotl.defense = Math.floor(axolotl.defense * 1.1);
    updateUI();
    return true;
  }

  // ===== 敵システム =====
  function createEnemy(wave) {
    var baseHp = 100 + wave * 50;
    var baseAttack = 15 + wave * 5;
    var baseDefense = 3 + wave * 2;
    
    return {
      hp: baseHp,
      maxHp: baseHp,
      attack: baseAttack,
      defense: baseDefense,
      x: CANVAS_WIDTH - 150,
      y: CANVAS_HEIGHT / 2,
      name: '敵 ' + wave
    };
  }

  function startWave() {
    gameState.currentEnemy = createEnemy(gameState.currentWave);
    gameState.waveInProgress = true;
    gameState.turnTimer = 0;
    $('btnNextWave').style.display = 'none';
    updateUI();
  }

  // ===== バトルシステム =====
  function processBattle() {
    if (!gameState.waveInProgress || !gameState.currentEnemy) return;
    if (gameState.axolotls.length === 0) return;
    
    gameState.turnTimer++;
    if (gameState.turnTimer < TURN_DELAY / 16) return; // 60FPS想定
    gameState.turnTimer = 0;
    
    var enemy = gameState.currentEnemy;
    
    // ウーパーが攻撃
    gameState.axolotls.forEach(function(axolotl) {
      if (axolotl.hp <= 0) return;
      
      var damage = Math.max(1, axolotl.attack - enemy.defense);
      enemy.hp -= damage;
      
      // 経験値獲得
      if (enemy.hp <= 0) {
        axolotl.exp += 5;
        checkLevelUp(axolotl);
      }
    });
    
    // 敵が攻撃（生存しているウーパーにランダム）
    var aliveAxolotls = gameState.axolotls.filter(function(a) { return a.hp > 0; });
    if (aliveAxolotls.length > 0 && enemy.hp > 0) {
      var target = aliveAxolotls[Math.floor(Math.random() * aliveAxolotls.length)];
      var damage = Math.max(1, enemy.attack - target.defense);
      target.hp -= damage;
      
      if (target.hp < 0) target.hp = 0;
    }
    
    // ウェーブクリアチェック
    if (enemy.hp <= 0) {
      clearWave();
    }
    
    // 全滅チェック
    if (aliveAxolotls.length === 0 && enemy.hp > 0) {
      gameOver();
    }
    
    updateUI();
  }

  function checkLevelUp(axolotl) {
    if (axolotl.exp >= axolotl.expToNext) {
      axolotl.exp -= axolotl.expToNext;
      axolotl.level++;
      axolotl.expToNext = Math.floor(axolotl.expToNext * 1.5);
      
      // レベルアップボーナス
      axolotl.maxHp = Math.floor(axolotl.maxHp * 1.1);
      axolotl.hp = axolotl.maxHp;
      axolotl.attack = Math.floor(axolotl.attack * 1.1);
      axolotl.defense = Math.floor(axolotl.defense * 1.05);
    }
  }

  function clearWave() {
    gameState.waveInProgress = false;
    var reward = 50 + gameState.currentWave * 20;
    gameState.coins += reward;
    
    $('waveClearContent').innerHTML = 
      '<p>ウェーブ ' + gameState.currentWave + ' をクリアしました！</p>' +
      '<p>報酬: ' + reward + ' コイン</p>';
    $('overlayWaveClear').classList.add('visible');
    gameState.state = 'waveClear';
  }

  function continueWave() {
    gameState.currentWave++;
    $('overlayWaveClear').classList.remove('visible');
    startWave();
    gameState.state = 'playing';
  }

  function gameOver() {
    alert('全滅しました！ウェーブ ' + gameState.currentWave + ' で敗北');
    restartGame();
  }

  function restartGame() {
    gameState.coins = 100;
    gameState.currentWave = 1;
    gameState.axolotls = [];
    gameState.nextAxolotlId = 1;
    gameState.currentEnemy = null;
    gameState.waveInProgress = false;
    startWave();
    updateUI();
  }

  // ===== 描画 =====
  function draw() {
    // クリア
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 背景線
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    
    // ウーパー表示
    gameState.axolotls.forEach(function(axolotl) {
      var x = axolotl.x;
      var y = axolotl.y;
      
      // ウーパー画像（プレースホルダー）
      ctx.fillStyle = axolotl.hp > 0 ? '#60a5fa' : '#666';
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
      
      // 名前
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(axolotl.name, x, y - 40);
      
      // HPバー
      var barWidth = 60;
      var barHeight = 6;
      ctx.fillStyle = '#333';
      ctx.fillRect(x - barWidth / 2, y + 35, barWidth, barHeight);
      if (axolotl.hp > 0) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x - barWidth / 2, y + 35, barWidth * (axolotl.hp / axolotl.maxHp), barHeight);
      }
      
      // レベル
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px sans-serif';
      ctx.fillText('Lv' + axolotl.level, x, y + 50);
    });
    
    // 敵表示
    if (gameState.currentEnemy) {
      var enemy = gameState.currentEnemy;
      var x = enemy.x;
      var y = enemy.y;
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // 名前
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.name, x, y - 50);
      
      // HPバー
      var barWidth = 80;
      var barHeight = 8;
      ctx.fillStyle = '#333';
      ctx.fillRect(x - barWidth / 2, y + 45, barWidth, barHeight);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - barWidth / 2, y + 45, barWidth * (enemy.hp / enemy.maxHp), barHeight);
    }
    
    // バトルログ（簡易）
    if (gameState.battleLog.length > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(10, 10, 200, 100);
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      var logLines = gameState.battleLog.slice(-5);
      logLines.forEach(function(line, i) {
        ctx.fillText(line, 15, 25 + i * 15);
      });
    }
  }

  // ===== UI更新 =====
  function updateUI() {
    $('coinValue').textContent = formatNumber(gameState.coins);
    $('waveValue').textContent = gameState.currentWave;
    
    if (gameState.currentEnemy) {
      var enemy = gameState.currentEnemy;
      var hpPercent = (enemy.hp / enemy.maxHp) * 100;
      $('enemyHpBar').style.width = hpPercent + '%';
      $('enemyHpValue').textContent = Math.floor(enemy.hp) + '/' + Math.floor(enemy.maxHp);
    }
    
    // ボタンの有効/無効
    $('btnNextWave').style.display = !gameState.waveInProgress ? 'inline-block' : 'none';
  }

  function showUpgradeModal() {
    var list = $('upgradeList');
    list.innerHTML = '';
    
    if (gameState.axolotls.length === 0) {
      list.innerHTML = '<p>ウーパーがいません。まず新規獲得でウーパーを獲得してください。</p>';
    } else {
      gameState.axolotls.forEach(function(axolotl) {
        var card = document.createElement('div');
        card.className = 'upgrade-card';
        var cost = 50 * axolotl.level;
        card.innerHTML = 
          '<div class="upgrade-header">' +
          '<div class="upgrade-name">' + axolotl.name + ' Lv' + axolotl.level + '</div>' +
          '<div class="upgrade-cost">¥' + cost + '</div>' +
          '</div>' +
          '<div class="upgrade-desc">HP: ' + Math.floor(axolotl.hp) + '/' + Math.floor(axolotl.maxHp) + '</div>' +
          '<div class="upgrade-stats">攻撃: ' + axolotl.attack + ' / 防御: ' + axolotl.defense + '</div>';
        card.addEventListener('click', function() {
          if (upgradeAxolotl(axolotl)) {
            showUpgradeModal(); // 更新
          }
        });
        list.appendChild(card);
      });
    }
    
    $('overlayUpgrade').classList.add('visible');
    gameState.state = 'upgrade';
  }

  function showRecruitModal() {
    var list = $('recruitList');
    list.innerHTML = '';
    
    Object.keys(AXOLOTL_TYPES).forEach(function(type) {
      var axolotlType = AXOLOTL_TYPES[type];
      var card = document.createElement('div');
      card.className = 'recruit-card';
      card.innerHTML = 
        '<div class="recruit-header">' +
        '<div class="recruit-name">' + axolotlType.name + '</div>' +
        '<div class="recruit-cost">¥' + axolotlType.cost + '</div>' +
        '</div>' +
        '<div class="recruit-desc">HP: ' + axolotlType.baseHp + ' / 攻撃: ' + axolotlType.baseAttack + ' / 防御: ' + axolotlType.baseDefense + '</div>';
      card.style.opacity = gameState.coins < axolotlType.cost ? '0.5' : '1';
      card.addEventListener('click', function() {
        if (addAxolotl(type)) {
          $('overlayRecruit').classList.remove('visible');
          gameState.state = 'playing';
        }
      });
      list.appendChild(card);
    });
    
    $('overlayRecruit').classList.add('visible');
    gameState.state = 'recruit';
  }

  // ===== イベントリスナー =====
  function initEventListeners() {
    $('btnUpgrade').addEventListener('click', showUpgradeModal);
    $('btnRecruit').addEventListener('click', showRecruitModal);
    $('btnNextWave').addEventListener('click', function() {
      startWave();
    });
    $('btnCloseUpgrade').addEventListener('click', function() {
      $('overlayUpgrade').classList.remove('visible');
      gameState.state = 'playing';
    });
    $('btnCloseRecruit').addEventListener('click', function() {
      $('overlayRecruit').classList.remove('visible');
      gameState.state = 'playing';
    });
    $('btnContinueWave').addEventListener('click', continueWave);
  }

  // ===== ゲームループ =====
  function gameLoop() {
    if (gameState.state === 'playing') {
      processBattle();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
  }

  // ===== 初期化 =====
  function init() {
    initEventListeners();
    startWave();
    updateUI();
    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
