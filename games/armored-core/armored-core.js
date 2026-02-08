(function () {
  'use strict';

  // ===== パーツデータ =====
  var PARTS_DATA = {
    head: [
      { id: 'head-light', name: '軽量ヘッド', hp: 50, defense: 20, speed: 30, range: 0, firepower: 0 },
      { id: 'head-standard', name: '標準ヘッド', hp: 100, defense: 50, speed: 0, range: 20, firepower: 0 },
      { id: 'head-heavy', name: '重装ヘッド', hp: 200, defense: 100, speed: -20, range: 50, firepower: 0 }
    ],
    body: [
      { id: 'body-light', name: '軽量ボディ', hp: 200, defense: 50, speed: 50, range: 0, firepower: 0 },
      { id: 'body-standard', name: '標準ボディ', hp: 500, defense: 100, speed: 0, range: 0, firepower: 0 },
      { id: 'body-heavy', name: '重装ボディ', hp: 1000, defense: 200, speed: -50, range: 0, firepower: 0 }
    ],
    arms: [
      { id: 'arms-light', name: '軽量アーム', hp: 50, defense: 20, speed: 20, range: 0, firepower: 20 },
      { id: 'arms-standard', name: '標準アーム', hp: 100, defense: 50, speed: 0, range: 0, firepower: 50 },
      { id: 'arms-heavy', name: '重装アーム', hp: 200, defense: 100, speed: -20, range: 0, firepower: 100 }
    ],
    legs: [
      { id: 'legs-light', name: '軽量レッグ', hp: 100, defense: 30, speed: 100, range: 0, firepower: 0 },
      { id: 'legs-standard', name: '標準レッグ', hp: 200, defense: 50, speed: 0, range: 0, firepower: 0 },
      { id: 'legs-heavy', name: '重装レッグ', hp: 400, defense: 100, speed: -50, range: 0, firepower: 0 }
    ],
    weapon: [
      { id: 'weapon-melee', name: '近接武器', hp: 0, defense: 0, speed: 0, range: 50, firepower: 200, optimalRange: [0, 50] },
      { id: 'weapon-rifle', name: 'ライフル', hp: 0, defense: 0, speed: 0, range: 200, firepower: 150, optimalRange: [100, 200] },
      { id: 'weapon-sniper', name: 'スナイパー', hp: 0, defense: 0, speed: 0, range: 400, firepower: 300, optimalRange: [300, 400] },
      { id: 'weapon-missile', name: 'ミサイル', hp: 0, defense: 0, speed: 0, range: 300, firepower: 250, optimalRange: [150, 300] }
    ]
  };

  // ===== ゲーム状態 =====
  var state = {
    phase: 'customize', // 'customize' | 'battle'
    mech: {
      head: null,
      body: null,
      arms: null,
      legs: null,
      weapon: null
    },
    battle: {
      playerHP: 1000,
      playerMaxHP: 1000,
      enemyHP: 1000,
      enemyMaxHP: 1000,
      distance: 200, // メートル
      turn: 'player', // 'player' | 'enemy'
      enemyParts: {
        head: PARTS_DATA.head[1],
        body: PARTS_DATA.body[1],
        arms: PARTS_DATA.arms[1],
        legs: PARTS_DATA.legs[1],
        weapon: PARTS_DATA.weapon[1]
      }
    }
  };

  // ===== ユーティリティ =====
  function $(id) { return document.getElementById(id); }

  function calculateMechStats(parts) {
    var stats = {
      hp: 0,
      defense: 0,
      speed: 0,
      range: 0,
      firepower: 0
    };

    ['head', 'body', 'arms', 'legs', 'weapon'].forEach(function(partType) {
      var part = parts[partType];
      if (part) {
        stats.hp += part.hp || 0;
        stats.defense += part.defense || 0;
        stats.speed += part.speed || 0;
        stats.range += part.range || 0;
        stats.firepower += part.firepower || 0;
      }
    });

    // 最小値を保証
    stats.hp = Math.max(100, stats.hp);
    stats.defense = Math.max(10, stats.defense);
    stats.speed = Math.max(10, stats.speed);
    stats.range = Math.max(50, stats.range);
    stats.firepower = Math.max(50, stats.firepower);

    return stats;
  }

  // ===== UI更新 =====
  function updateMechStats() {
    var stats = calculateMechStats(state.mech);
    $('statHP').textContent = stats.hp;
    $('statDefense').textContent = stats.defense;
    $('statSpeed').textContent = stats.speed;
    $('statRange').textContent = stats.range;
    $('statFirepower').textContent = stats.firepower;

    // パーツスロットの表示更新
    ['head', 'body', 'arms', 'legs', 'weapon'].forEach(function(partType) {
      var slot = document.querySelector('.ac-part-slot[data-part="' + partType + '"]');
      if (slot) {
        var part = state.mech[partType];
        if (part) {
          slot.textContent = part.name;
          slot.classList.add('equipped');
        } else {
          slot.textContent = partType === 'head' ? '頭部' : 
                           partType === 'body' ? '胴体' :
                           partType === 'arms' ? '腕' :
                           partType === 'legs' ? '脚' : '武器';
          slot.classList.remove('equipped');
        }
      }
    });
  }

  function showPartsCategory(category) {
    var parts = PARTS_DATA[category] || [];
    var list = $('partsList');
    list.innerHTML = '';

    parts.forEach(function(part) {
      var card = document.createElement('div');
      card.className = 'ac-part-card';
      if (state.mech[category] && state.mech[category].id === part.id) {
        card.classList.add('equipped');
      }

      var name = document.createElement('div');
      name.className = 'ac-part-name';
      name.textContent = part.name;
      card.appendChild(name);

      var stats = document.createElement('div');
      stats.className = 'ac-part-stats';
      
      if (part.hp > 0) {
        var hpStat = document.createElement('div');
        hpStat.className = 'ac-part-stat';
        hpStat.innerHTML = '<span>HP</span><span>+' + part.hp + '</span>';
        stats.appendChild(hpStat);
      }
      if (part.defense > 0) {
        var defStat = document.createElement('div');
        defStat.className = 'ac-part-stat';
        defStat.innerHTML = '<span>防御</span><span>+' + part.defense + '</span>';
        stats.appendChild(defStat);
      }
      if (part.speed !== 0) {
        var spdStat = document.createElement('div');
        spdStat.className = 'ac-part-stat';
        spdStat.innerHTML = '<span>速度</span><span>' + (part.speed > 0 ? '+' : '') + part.speed + '</span>';
        stats.appendChild(spdStat);
      }
      if (part.range > 0) {
        var rngStat = document.createElement('div');
        rngStat.className = 'ac-part-stat';
        rngStat.innerHTML = '<span>射程</span><span>+' + part.range + '</span>';
        stats.appendChild(rngStat);
      }
      if (part.firepower > 0) {
        var fpStat = document.createElement('div');
        fpStat.className = 'ac-part-stat';
        fpStat.innerHTML = '<span>火力</span><span>+' + part.firepower + '</span>';
        stats.appendChild(fpStat);
      }
      if (part.optimalRange) {
        var optStat = document.createElement('div');
        optStat.className = 'ac-part-stat';
        optStat.innerHTML = '<span>最適射程</span><span>' + part.optimalRange[0] + '-' + part.optimalRange[1] + 'm</span>';
        stats.appendChild(optStat);
      }

      card.appendChild(stats);

      card.addEventListener('click', function() {
        state.mech[category] = part;
        updateMechStats();
        showPartsCategory(category);
      });

      list.appendChild(card);
    });
  }

  function switchPhase(phase) {
    state.phase = phase;
    
    document.querySelectorAll('.ac-phase').forEach(function(el) {
      el.classList.add('hidden');
    });
    
    $('phase' + phase.charAt(0).toUpperCase() + phase.slice(1)).classList.remove('hidden');
    
    document.querySelectorAll('.ac-btn-phase').forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.dataset.phase === phase) {
        btn.classList.add('active');
      }
    });

    if (phase === 'battle') {
      initBattle();
    }
  }

  // ===== 戦闘システム =====
  function initBattle() {
    var playerStats = calculateMechStats(state.mech);
    var enemyStats = calculateMechStats(state.battle.enemyParts);

    state.battle.playerMaxHP = playerStats.hp;
    state.battle.playerHP = playerStats.hp;
    state.battle.enemyMaxHP = enemyStats.hp;
    state.battle.enemyHP = enemyStats.hp;
    state.battle.distance = 200;
    state.battle.turn = 'player';

    updateBattleUI();
    addBattleLog('戦闘開始！', 'system');
  }

  function updateBattleUI() {
    // プレイヤーHP
    var playerHPPercent = (state.battle.playerHP / state.battle.playerMaxHP) * 100;
    $('playerHPBar').style.width = playerHPPercent + '%';
    $('playerHPText').textContent = Math.floor(state.battle.playerHP) + ' / ' + state.battle.playerMaxHP;

    // 敵HP
    var enemyHPPercent = (state.battle.enemyHP / state.battle.enemyMaxHP) * 100;
    $('enemyHPBar').style.width = enemyHPPercent + '%';
    $('enemyHPText').textContent = Math.floor(state.battle.enemyHP) + ' / ' + state.battle.enemyMaxHP;

    // 距離表示
    updateDistanceDisplay();
  }

  function updateDistanceDisplay() {
    var distance = state.battle.distance;
    $('distanceValue').textContent = Math.floor(distance) + 'm';
    $('playerDistance').textContent = '距離: ' + Math.floor(distance) + 'm';
    $('enemyDistance').textContent = '距離: ' + Math.floor(distance) + 'm';

    // 距離マーカーの位置（0-500mを0-100%にマッピング）
    var percent = Math.min(100, (distance / 500) * 100);
    $('distanceMark').style.left = percent + '%';
  }

  function calculateDamage(attackerParts, defenderParts, distance) {
    var attackerStats = calculateMechStats(attackerParts);
    var defenderStats = calculateMechStats(defenderParts);
    
    var weapon = attackerParts.weapon;
    if (!weapon) return 0;

    // 基本ダメージ
    var baseDamage = attackerStats.firepower;

    // 射程によるダメージ補正
    var rangeModifier = 1.0;
    if (weapon.optimalRange) {
      var [minRange, maxRange] = weapon.optimalRange;
      if (distance < minRange) {
        // 近すぎる場合はダメージ減少
        rangeModifier = 0.5 + (distance / minRange) * 0.5;
      } else if (distance > maxRange) {
        // 遠すぎる場合はダメージ減少
        rangeModifier = 1.0 - ((distance - maxRange) / (weapon.range - maxRange)) * 0.5;
        rangeModifier = Math.max(0.3, rangeModifier);
      } else {
        // 最適射程内
        rangeModifier = 1.0;
      }
    }

    var damage = baseDamage * rangeModifier;
    
    // 防御力による軽減
    var finalDamage = Math.max(1, damage - defenderStats.defense * 0.5);

    return Math.floor(finalDamage);
  }

  function playerMove() {
    if (state.battle.turn !== 'player') return;

    var playerStats = calculateMechStats(state.mech);
    var moveDistance = 50 + playerStats.speed * 0.5;
    
    // ランダムに近づくか離れるか
    var direction = Math.random() > 0.5 ? 1 : -1;
    state.battle.distance += moveDistance * direction;
    state.battle.distance = Math.max(0, Math.min(500, state.battle.distance));

    addBattleLog('プレイヤーが移動！距離: ' + Math.floor(state.battle.distance) + 'm', 'player');
    updateBattleUI();
    
    state.battle.turn = 'enemy';
    setTimeout(enemyTurn, 1000);
  }

  function playerAttack() {
    if (state.battle.turn !== 'player') return;

    var damage = calculateDamage(state.mech, state.battle.enemyParts, state.battle.distance);
    state.battle.enemyHP = Math.max(0, state.battle.enemyHP - damage);

    var weapon = state.mech.weapon;
    var rangeInfo = weapon && weapon.optimalRange ? 
      ' (最適射程: ' + weapon.optimalRange[0] + '-' + weapon.optimalRange[1] + 'm)' : '';
    
    addBattleLog('プレイヤーの攻撃！' + damage + 'ダメージ' + rangeInfo, 'damage');
    updateBattleUI();

    if (state.battle.enemyHP <= 0) {
      addBattleLog('勝利！', 'system');
      disableBattleButtons();
      return;
    }

    state.battle.turn = 'enemy';
    setTimeout(enemyTurn, 1000);
  }

  function playerBoost() {
    if (state.battle.turn !== 'player') return;

    var playerStats = calculateMechStats(state.mech);
    var boostDistance = 100 + playerStats.speed;
    
    // 敵に近づく
    state.battle.distance = Math.max(0, state.battle.distance - boostDistance);
    
    addBattleLog('プレイヤーがブースト！距離: ' + Math.floor(state.battle.distance) + 'm', 'player');
    updateBattleUI();
    
    state.battle.turn = 'enemy';
    setTimeout(enemyTurn, 1000);
  }

  function enemyTurn() {
    if (state.battle.enemyHP <= 0) return;

    var enemyStats = calculateMechStats(state.battle.enemyParts);
    var actions = ['move', 'attack'];
    
    // 距離が遠すぎる場合は移動優先
    var weapon = state.battle.enemyParts.weapon;
    if (weapon && weapon.optimalRange) {
      var [minRange, maxRange] = weapon.optimalRange;
      if (state.battle.distance > maxRange) {
        actions = ['move', 'move', 'attack'];
      } else if (state.battle.distance < minRange) {
        actions = ['move', 'attack'];
      }
    }

    var action = actions[Math.floor(Math.random() * actions.length)];

    if (action === 'move') {
      var moveDistance = 50 + enemyStats.speed * 0.5;
      var direction = Math.random() > 0.5 ? 1 : -1;
      state.battle.distance += moveDistance * direction;
      state.battle.distance = Math.max(0, Math.min(500, state.battle.distance));
      addBattleLog('敵が移動！距離: ' + Math.floor(state.battle.distance) + 'm', 'enemy');
    } else {
      var damage = calculateDamage(state.battle.enemyParts, state.mech, state.battle.distance);
      state.battle.playerHP = Math.max(0, state.battle.playerHP - damage);
      addBattleLog('敵の攻撃！' + damage + 'ダメージ', 'damage');
      
      if (state.battle.playerHP <= 0) {
        addBattleLog('敗北...', 'system');
        disableBattleButtons();
        return;
      }
    }

    updateBattleUI();
    state.battle.turn = 'player';
    enableBattleButtons();
  }

  function addBattleLog(message, type) {
    var log = $('battleLog');
    var entry = document.createElement('div');
    entry.className = 'ac-log-entry ' + type;
    entry.textContent = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  function enableBattleButtons() {
    $('btnMove').disabled = false;
    $('btnAttack').disabled = false;
    $('btnBoost').disabled = false;
  }

  function disableBattleButtons() {
    $('btnMove').disabled = true;
    $('btnAttack').disabled = true;
    $('btnBoost').disabled = true;
  }

  // ===== イベントリスナー =====
  function initEventListeners() {
    // フェーズ切り替え
    document.querySelectorAll('.ac-btn-phase').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchPhase(btn.dataset.phase);
      });
    });

    // カテゴリ選択
    document.querySelectorAll('.ac-btn-category').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.ac-btn-category').forEach(function(b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        showPartsCategory(btn.dataset.category);
      });
    });

    // 戦闘ボタン
    $('btnMove').addEventListener('click', playerMove);
    $('btnAttack').addEventListener('click', playerAttack);
    $('btnBoost').addEventListener('click', playerBoost);
  }

  // ===== 初期化 =====
  function init() {
    // デフォルトパーツを装備
    state.mech.head = PARTS_DATA.head[1];
    state.mech.body = PARTS_DATA.body[1];
    state.mech.arms = PARTS_DATA.arms[1];
    state.mech.legs = PARTS_DATA.legs[1];
    state.mech.weapon = PARTS_DATA.weapon[1];

    updateMechStats();
    showPartsCategory('head');
    initEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
