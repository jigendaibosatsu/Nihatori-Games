/**
 * Axolotl Baseball (ウーパー野球) – game logic
 */
(function (global) {
  'use strict';

  function t(key, params) {
    return global.i18n && global.i18n.t ? global.i18n.t(key, params) : key;
  }

  var AXOLOTL_IDS = ['nomal', 'albino', 'black', 'chimera', 'copper', 'dalmatian', 'gold', 'marble', 'superblack', 'yellow'];
  var NAME_POOL_JA = ['ウパ太郎', 'ぷく', 'アックス', 'ルパ', 'マーブル', 'ゴロ', 'ピンク', 'ミント', 'ソラ', 'ユキ', 'コッパ', 'キン', 'モカ', 'チョコ', 'クリーム', 'ポチ', 'テン', 'ハナ', 'モモ', 'サクラ'];
  var NAME_POOL_EN = ['Axo', 'Puddles', 'Bubbles', 'Gilly', 'Splash', 'Wiggles', 'Bloop', 'Noodle', 'Finn', 'Sunny', 'Mochi', 'Bean', 'Pip', 'Dew', 'Coral', 'Pepper', 'Mint', 'Honey', 'Olive', 'Coco'];

  function randomAxoId() {
    return AXOLOTL_IDS[Math.floor(Math.random() * AXOLOTL_IDS.length)];
  }

  function randomName() {
    var pool = (global.i18n && global.i18n.getLocale && global.i18n.getLocale() === 'en')
      ? NAME_POOL_EN : NAME_POOL_JA;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function randomStat() {
    return Math.floor(Math.random() * 10) + 1;
  }

  var SPECIAL_ABILITIES = ['powerSurge', 'contactBoost', 'speedster', 'controlMaster', 'lucky'];

  function randomSpecial() {
    return Math.random() < 0.3 ? SPECIAL_ABILITIES[Math.floor(Math.random() * SPECIAL_ABILITIES.length)] : null;
  }

  function getAxolotlImagePath(spriteKey) {
    return '/assets/characters/axolotl/axo_' + spriteKey + '.png';
  }

  function createBatter() {
    return {
      name: randomName(),
      sprite: randomAxoId(),
      power: randomStat(),
      contact: randomStat(),
      speed: randomStat(),
      special: randomSpecial()
    };
  }

  function createPitcher() {
    return {
      name: randomName(),
      sprite: randomAxoId(),
      accuracy: randomStat(),
      control: randomStat(),
      speed: randomStat(),
      special: randomSpecial()
    };
  }

  var TOTAL_INNINGS = 3;
  var SWEET_LEFT_MIN = 20;
  var SWEET_LEFT_MAX = 60;
  var SWEET_WIDTH_MIN = 15;
  var SWEET_WIDTH_MAX = 35;
  var BALL_DURATION_MS = 1200;

  var state = {
    inning: 1,
    topBottom: 'bottom',
    outs: 0,
    scoreYou: 0,
    scoreCpu: 0,
    runners: [false, false, false],
    ballPos: 0,
    ballMoving: false,
    ballStartTime: 0,
    animId: null,
    gameOver: false,
    pitchType: 'normal',
    pitchOpposite: false,
    pitchWobble: false,
    pitchBreak: 0,
    ballSpeedKmh: 130,
    currentBatter: null,
    currentPitcher: null,
    isPitchingTurn: false,
    pitchingMode: false,
    sweetLeft: 35,
    sweetWidth: 30,
    playerBat: null,
    playerBall: null,
    cpuBall: null
  };

  function updateEquipmentDisplay() {
    var batEl = document.getElementById('bbEquipBat');
    var ballEl = document.getElementById('bbEquipBall');
    if (state.playerBat && batEl) batEl.textContent = t('ui.equipmentBat', { name: t('ui.' + state.playerBat.key) });
    if (state.playerBall && ballEl) ballEl.textContent = t('ui.equipmentBall', { name: t('ui.' + state.playerBall.key) });
  }

  function updateCharacterDisplay() {
    var batterEl = document.getElementById('bbBatterImg');
    var batterNameEl = document.getElementById('bbBatterName');
    var pitcherEl = document.getElementById('bbPitcherImg');
    var pitcherNameEl = document.getElementById('bbPitcherName');
    if (state.currentBatter && batterEl) batterEl.src = getAxolotlImagePath(state.currentBatter.sprite);
    if (state.currentBatter && batterNameEl) batterNameEl.textContent = state.currentBatter.name;
    if (state.currentPitcher && pitcherEl) pitcherEl.src = getAxolotlImagePath(state.currentPitcher.sprite);
    if (state.currentPitcher && pitcherNameEl) pitcherNameEl.textContent = state.currentPitcher.name;
  }

  function addLog(msg) {
    var el = document.getElementById('bbLog');
    if (el) {
      el.textContent = (el.textContent ? el.textContent + '\n' : '') + msg;
      el.scrollTop = el.scrollHeight;
    }
  }

  function updateScoreboard() {
    var el;
    if (el = document.getElementById('bbInning')) el.textContent = state.inning;
    if (el = document.getElementById('bbTopBottom')) el.textContent = state.topBottom === 'top' ? t('ui.top') : t('ui.bottom');
    if (el = document.getElementById('bbOuts')) el.textContent = state.outs;
    if (el = document.getElementById('bbScoreYou')) el.textContent = state.scoreYou;
    if (el = document.getElementById('bbScoreCpu')) el.textContent = state.scoreCpu;
    if (el = document.getElementById('bb1st')) el.className = 'bb-runner' + (state.runners[0] ? ' on' : '');
    if (el = document.getElementById('bb2nd')) el.className = 'bb-runner' + (state.runners[1] ? ' on' : '');
    if (el = document.getElementById('bb3rd')) el.className = 'bb-runner' + (state.runners[2] ? ' on' : '');
  }

  function advanceRunnersSimple(bases) {
    var score = 0;
    if (bases >= 4) {
      score = 1 + (state.runners[0] ? 1 : 0) + (state.runners[1] ? 1 : 0) + (state.runners[2] ? 1 : 0);
      state.runners[0] = state.runners[1] = state.runners[2] = false;
      state.scoreYou += score;
      return score;
    }
    if (bases === 1) {
      score = (state.runners[2] ? 1 : 0);
      state.runners[2] = state.runners[1];
      state.runners[1] = state.runners[0];
      state.runners[0] = true;
    } else if (bases === 2) {
      score = (state.runners[1] ? 1 : 0) + (state.runners[2] ? 1 : 0);
      state.runners[2] = state.runners[0];
      state.runners[1] = true;
      state.runners[0] = false;
    } else if (bases === 3) {
      score = (state.runners[0] ? 1 : 0) + (state.runners[1] ? 1 : 0) + (state.runners[2] ? 1 : 0);
      state.runners[0] = state.runners[1] = false;
      state.runners[2] = true;
    }
    state.scoreYou += score;
    return score;
  }

  function advanceCpuRunners(bases) {
    var score = 0;
    if (bases >= 4) {
      score = 1 + (state.runners[0] ? 1 : 0) + (state.runners[1] ? 1 : 0) + (state.runners[2] ? 1 : 0);
      state.runners[0] = state.runners[1] = state.runners[2] = false;
      state.scoreCpu += score;
      return score;
    }
    if (bases === 1) {
      score = (state.runners[2] ? 1 : 0);
      state.runners[2] = state.runners[1];
      state.runners[1] = state.runners[0];
      state.runners[0] = true;
    } else if (bases === 2) {
      score = (state.runners[1] ? 1 : 0) + (state.runners[2] ? 1 : 0);
      state.runners[2] = state.runners[0];
      state.runners[1] = true;
      state.runners[0] = false;
    } else if (bases === 3) {
      score = (state.runners[0] ? 1 : 0) + (state.runners[1] ? 1 : 0) + (state.runners[2] ? 1 : 0);
      state.runners[0] = state.runners[1] = false;
      state.runners[2] = true;
    }
    state.scoreCpu += score;
    return score;
  }

  var BATS = [
    { id: 'basic', key: 'itemBasicBat', power: 0, contact: 0, sweetBonus: 0 },
    { id: 'power', key: 'itemPowerBat', power: 2, contact: 0, sweetBonus: 0 },
    { id: 'contact', key: 'itemContactBat', power: 0, contact: 2, sweetBonus: 0 },
    { id: 'wide', key: 'itemWideBat', power: 0, contact: 0, sweetBonus: 5 }
  ];
  var BALLS = [
    { id: 'basic', key: 'itemBasicBall', speedMod: 0, controlMod: 0 },
    { id: 'slow', key: 'itemSlowBall', speedMod: -8, controlMod: 0 },
    { id: 'control', key: 'itemControlBall', speedMod: 0, controlMod: 1 }
  ];

  function randomBat() {
    return BATS[Math.floor(Math.random() * BATS.length)];
  }
  function randomBall() {
    return BALLS[Math.floor(Math.random() * BALLS.length)];
  }

  var PITCH_TYPES = {
    normal: { key: 'pitchNormal', duration: 1, speedKmh: 130, opposite: false, wobble: false, break: 0 },
    fast: { key: 'pitchFast', duration: 0.6, speedKmh: 155, opposite: false, wobble: false, break: 0 },
    slow: { key: 'pitchSlow', duration: 1.5, speedKmh: 95, opposite: false, wobble: false, break: 0 },
    invisible: { key: 'pitchInvisible', duration: 1, speedKmh: 125, opposite: false, wobble: false, break: 0 },
    random: { key: 'pitchRandom', duration: 1.1, speedKmh: 118, opposite: false, wobble: true, break: 0 },
    opposite: { key: 'pitchOpposite', duration: 1, speedKmh: 128, opposite: true, wobble: false, break: 0 },
    curve: { key: 'pitchCurve', duration: 1.05, speedKmh: 115, opposite: false, wobble: false, break: -8 },
    slider: { key: 'pitchSlider', duration: 0.95, speedKmh: 132, opposite: false, wobble: false, break: 6 },
    sinker: { key: 'pitchSinker', duration: 1, speedKmh: 122, opposite: false, wobble: false, break: -5 },
    cutter: { key: 'pitchCutter', duration: 0.9, speedKmh: 138, opposite: false, wobble: false, break: 4 }
  };

  function doCpuHalfInning() {
    state.topBottom = 'top';
    state.outs = 0;
    state.runners = [false, false, false];
    var runs = 0;
    for (var o = 0; o < 3; ) {
      if (Math.random() < 0.65) {
        o++;
      } else {
        var bases = Math.random() < 0.5 ? 1 : (Math.random() < 0.5 ? 2 : (Math.random() < 0.5 ? 3 : 4));
        if (bases === 4) runs += 1 + (state.runners[0] ? 1 : 0) + (state.runners[1] ? 1 : 0) + (state.runners[2] ? 1 : 0);
        else if (bases === 1) {
          if (state.runners[2]) { runs++; state.runners[2] = false; }
          state.runners[2] = state.runners[1];
          state.runners[1] = state.runners[0];
          state.runners[0] = true;
        } else if (bases === 2) {
          if (state.runners[2]) runs++;
          if (state.runners[1]) runs++;
          state.runners[2] = state.runners[0];
          state.runners[1] = true;
          state.runners[0] = false;
        } else {
          runs += (state.runners[0] ? 1 : 0) + (state.runners[1] ? 1 : 0) + (state.runners[2] ? 1 : 0) + 1;
          state.runners[0] = state.runners[1] = state.runners[2] = false;
        }
      }
    }
    state.scoreCpu += runs;
    state.topBottom = 'bottom';
    state.outs = 0;
    state.runners = [false, false, false];
    addLog(t('game.logCpuHalf', { inning: state.inning, runs: runs }));
    updateScoreboard();
  }

  var PITCH_TYPE_IDS = ['normal', 'fast', 'slow', 'invisible', 'random', 'opposite', 'curve', 'slider', 'sinker', 'cutter'];

  function choosePitchType() {
    var r = Math.random();
    if (r < 0.2) return 'normal';
    if (r < 0.35) return 'fast';
    if (r < 0.45) return 'slow';
    if (r < 0.55) return 'invisible';
    if (r < 0.65) return 'random';
    if (r < 0.75) return 'opposite';
    if (r < 0.82) return 'curve';
    if (r < 0.88) return 'slider';
    if (r < 0.94) return 'sinker';
    return 'cutter';
  }

  function startBall(overridePitchType) {
    if (state.ballMoving || state.gameOver) return;
    state.pitchType = overridePitchType != null ? overridePitchType : choosePitchType();
    state.pitchingMode = state.isPitchingTurn && overridePitchType != null;
    if (state.pitchingMode) {
      var pitchSelect = document.getElementById('bbPitchSelect');
      var timingBar = document.getElementById('bbTimingBar');
      var swingBtn = document.getElementById('bbSwingBtn');
      if (pitchSelect) pitchSelect.style.display = 'none';
      if (timingBar) timingBar.style.display = '';
      if (swingBtn) swingBtn.style.display = 'none';
    }
    var def = PITCH_TYPES[state.pitchType] || PITCH_TYPES.normal;
    state.pitchOpposite = def.opposite;
    state.pitchWobble = def.wobble;
    state.pitchBreak = def.break || 0;
    state.ballSpeedKmh = def.speedKmh + (state.pitchingMode ? (state.playerBall && state.playerBall.speedMod) || 0 : (state.cpuBall && state.cpuBall.speedMod) || 0);
    state.ballMoving = true;
    state.ballStartTime = Date.now();
    state.ballPos = state.pitchOpposite ? 100 : 0;
    var ballEl = document.getElementById('bbBall');
    if (ballEl) ballEl.classList.add('moving');
    var zoneLabel = document.getElementById('bbZoneLabel');
    zoneLabel.textContent = t('ui.' + def.key);
    var speedEl = document.getElementById('bbSpeedDisplay');
    if (speedEl) speedEl.textContent = t('ui.speedUnit', { speed: state.ballSpeedKmh });
    if (!state.pitchingMode) {
      state.sweetLeft = SWEET_LEFT_MIN + Math.random() * (SWEET_LEFT_MAX - SWEET_LEFT_MIN);
      state.sweetWidth = SWEET_WIDTH_MIN + Math.random() * (SWEET_WIDTH_MAX - SWEET_WIDTH_MIN);
      var bat = state.playerBat;
      if (bat && bat.sweetBonus) state.sweetWidth = Math.min(SWEET_WIDTH_MAX, state.sweetWidth + bat.sweetBonus);
      var sweetEl = document.getElementById('bbSweet');
      if (sweetEl) {
        sweetEl.style.left = state.sweetLeft + '%';
        sweetEl.style.width = state.sweetWidth + '%';
      }
    }
    document.getElementById('bbResult').classList.remove('visible');
    requestAnimationFrame(animateBall);
  }

  function animateBall() {
    if (!state.ballMoving) return;
    var def = PITCH_TYPES[state.pitchType] || PITCH_TYPES.normal;
    var duration = BALL_DURATION_MS * def.duration;
    var tVal = (Date.now() - state.ballStartTime) / duration;
    if (tVal >= 1) {
      state.ballMoving = false;
      state.ballPos = state.pitchOpposite ? 0 : 100;
      updateBallPos();
      document.getElementById('bbBall').classList.remove('moving');
      if (state.pitchingMode) {
        state.pitchingMode = false;
        resolveCpuAtBat();
        return;
      }
      state.outs++;
      addLog(t('game.logTaken'));
      document.getElementById('bbZoneLabel').textContent = t('ui.zoneTaken');
      var resultEl = document.getElementById('bbResult');
      resultEl.textContent = t('ui.resultStrike');
      resultEl.className = 'bb-result visible strike';
      nextAfterOut();
      return;
    }
    var linearPos = state.pitchOpposite ? (1 - tVal) * 100 : tVal * 100;
    var breakOffset = state.pitchBreak ? state.pitchBreak * Math.sin(tVal * Math.PI) : 0;
    var wobbleOffset = state.pitchWobble ? (Math.random() - 0.5) * 12 : 0;
    state.ballPos = Math.max(0, Math.min(100, linearPos + breakOffset + wobbleOffset));
    var ballEl = document.getElementById('bbBall');
    if (ballEl) {
      ballEl.style.opacity = (state.pitchType === 'invisible' && tVal > 0.4 && tVal < 0.7) ? '0' : '1';
    }
    updateBallPos();
    state.animId = requestAnimationFrame(animateBall);
  }

  function updateBallPos() {
    var ballEl = document.getElementById('bbBall');
    if (ballEl) ballEl.style.left = state.ballPos + '%';
  }

  function swing() {
    if (!state.ballMoving || state.gameOver) return;
    state.ballMoving = false;
    if (state.animId) cancelAnimationFrame(state.animId);
    state.animId = null;
    var pos = state.ballPos;
    var center = state.sweetLeft + state.sweetWidth / 2;
    var dist = Math.abs(pos - center);
    var resultEl = document.getElementById('bbResult');
    resultEl.classList.add('visible');
    var batter = state.currentBatter;
    var bat = state.playerBat;
    var powerBonus = bat ? (bat.power || 0) / 10 : 0;
    var contactBonus = bat ? (bat.contact || 0) / 10 : 0;
    var powerNorm = batter ? (batter.power - 5) / 10 : 0;
    var contactNorm = batter ? (batter.contact - 5) / 10 : 0;
    powerNorm += powerBonus;
    contactNorm += contactBonus;
    if (batter && batter.special === 'powerSurge') powerNorm += 0.15;
    if (batter && batter.special === 'contactBoost') contactNorm += 0.1;
    var hrThresh = Math.max(0.2, Math.min(0.6, 0.4 + powerNorm * 0.2));
    var doubleThresh = Math.max(0.5, Math.min(0.85, 0.7 + powerNorm * 0.1));
    if (dist <= state.sweetWidth / 2) {
      var r = Math.random();
      if (r < hrThresh) {
        resultEl.textContent = t('ui.resultHr');
        resultEl.className = 'bb-result visible hr';
        var sc = advanceRunnersSimple(4);
        addLog(t('game.logHr', { count: sc }));
      } else if (r < doubleThresh) {
        resultEl.textContent = t('ui.resultDouble');
        resultEl.className = 'bb-result visible hit';
        advanceRunnersSimple(2);
        addLog(t('game.logDouble'));
      } else {
        resultEl.textContent = t('ui.resultHit');
        resultEl.className = 'bb-result visible hit';
        advanceRunnersSimple(1);
        addLog(t('game.logHit'));
      }
    } else if (dist <= state.sweetWidth) {
      var hitBonus = contactNorm * 0.15;
      var r2 = Math.random();
      if (r2 < 0.6 + hitBonus) {
        resultEl.textContent = t('ui.resultHit');
        resultEl.className = 'bb-result visible hit';
        advanceRunnersSimple(1);
        addLog(t('game.logHit'));
      } else if (r2 < 0.85 - hitBonus * 0.5) {
        resultEl.textContent = t('ui.resultOut');
        resultEl.className = 'bb-result visible out';
        state.outs++;
        addLog(t('game.logOut'));
        nextAfterOut();
        return;
      } else {
        resultEl.textContent = t('ui.resultDouble');
        resultEl.className = 'bb-result visible hit';
        advanceRunnersSimple(2);
        addLog(t('game.logDouble'));
      }
    } else if (dist <= state.sweetWidth + 15) {
      var hitChance = 0.3 + contactNorm * 0.2;
      var r3 = Math.random();
      if (r3 < 0.7 - hitChance) {
        resultEl.textContent = t('ui.resultOut');
        resultEl.className = 'bb-result visible out';
        state.outs++;
        addLog(t('game.logOut'));
        nextAfterOut();
        return;
      } else {
        resultEl.textContent = t('ui.resultHit');
        resultEl.className = 'bb-result visible hit';
        advanceRunnersSimple(1);
        addLog(t('game.logHit'));
      }
    } else {
      resultEl.textContent = t('ui.resultStrike');
      resultEl.className = 'bb-result visible strike';
      state.outs++;
      addLog(t('game.logSwingMiss'));
      nextAfterOut();
      return;
    }
    updateScoreboard();
    setTimeout(startBall, 800);
  }

  function showPitchSelect() {
    var pitchSelect = document.getElementById('bbPitchSelect');
    var battingZone = document.getElementById('bbBattingZone');
    var timingBar = document.getElementById('bbTimingBar');
    var swingBtn = document.getElementById('bbSwingBtn');
    if (pitchSelect) pitchSelect.style.display = '';
    if (timingBar) timingBar.style.display = 'none';
    if (swingBtn) swingBtn.style.display = 'none';
    var zoneLabel = document.getElementById('bbZoneLabel');
    if (zoneLabel) zoneLabel.textContent = t('ui.selectPitch');
    var speedEl = document.getElementById('bbSpeedDisplay');
    if (speedEl) speedEl.textContent = '';
  }

  function hidePitchSelect() {
    var pitchSelect = document.getElementById('bbPitchSelect');
    var timingBar = document.getElementById('bbTimingBar');
    var swingBtn = document.getElementById('bbSwingBtn');
    if (pitchSelect) pitchSelect.style.display = 'none';
    if (timingBar) timingBar.style.display = '';
    if (swingBtn) swingBtn.style.display = '';
  }

  function resolveCpuAtBat() {
    var strikeBonus = (state.playerBall && state.playerBall.controlMod) ? state.playerBall.controlMod * 0.05 : 0;
    var r = Math.random();
    var resultEl = document.getElementById('bbResult');
    resultEl.classList.add('visible');
    if (r < 0.65 + strikeBonus) {
      state.outs++;
      resultEl.textContent = t('ui.resultStrike');
      resultEl.className = 'bb-result visible strike';
      addLog(t('game.logTaken'));
    } else {
      var bases = r < 0.78 ? 1 : (r < 0.9 ? 2 : 4);
      if (bases === 1) {
        resultEl.textContent = t('ui.resultHit');
        advanceCpuRunners(1);
        addLog(t('game.logHit'));
      } else if (bases === 2) {
        resultEl.textContent = t('ui.resultDouble');
        advanceCpuRunners(2);
        addLog(t('game.logDouble'));
      } else {
        resultEl.textContent = t('ui.resultHr');
        var sc = advanceCpuRunners(4);
        addLog(t('game.logHr', { count: sc }));
      }
      resultEl.className = 'bb-result visible hit';
    }
    updateScoreboard();
    if (state.outs >= 3) {
      state.outs = 0;
      state.runners = [false, false, false];
      state.topBottom = 'bottom';
      state.isPitchingTurn = false;
      hidePitchSelect();
      document.getElementById('bbZoneLabel').textContent = t('ui.zoneBattingShort');
      setTimeout(function () { startBall(); }, 600);
    } else {
      setTimeout(showPitchSelect, 800);
    }
  }

  function nextAfterOut() {
    updateScoreboard();
    if (state.outs >= 3) {
      state.outs = 0;
      state.runners = [false, false, false];
      if (state.topBottom === 'bottom') {
        state.inning++;
        if (state.inning > TOTAL_INNINGS) {
          endGame();
          return;
        }
        addLog(t('game.logCpuAttack', { inning: state.inning }));
        state.topBottom = 'top';
        state.isPitchingTurn = true;
        setTimeout(showPitchSelect, 500);
      }
      return;
    }
    if (state.isPitchingTurn) {
      setTimeout(showPitchSelect, 800);
    } else {
      setTimeout(function () { startBall(); }, 800);
    }
  }

  function endGame() {
    state.gameOver = true;
    var win = state.scoreYou > state.scoreCpu;
    document.getElementById('bbFinal').classList.add('visible');
    document.getElementById('bbFinal').classList.toggle('win', win);
    document.getElementById('bbFinal').classList.toggle('lose', !win);
    document.getElementById('bbFinalTitle').textContent = win ? t('game.finalWin') : t('game.finalLose');
    document.getElementById('bbFinalScore').textContent = t('game.finalScore', { you: state.scoreYou, cpu: state.scoreCpu });
    document.getElementById('bbBattingZone').style.display = 'none';
    addLog(win ? t('game.logWin') : t('game.logGameOver'));
  }

  function initGame() {
    state.inning = 1;
    state.topBottom = 'bottom';
    state.outs = 0;
    state.scoreYou = 0;
    state.scoreCpu = 0;
    state.runners = [false, false, false];
    state.ballMoving = false;
    state.gameOver = false;
    state.currentBatter = createBatter();
    state.currentPitcher = createPitcher();
    state.playerBat = randomBat();
    state.playerBall = randomBall();
    state.cpuBall = randomBall();
    document.getElementById('bbFinal').classList.remove('visible');
    updateEquipmentDisplay();
    document.getElementById('bbBattingZone').style.display = 'block';
    document.getElementById('bbLog').textContent = '';
    updateCharacterDisplay();
    buildPitchButtons();
    addLog(t('game.logGameStart'));
    updateScoreboard();
    state.topBottom = 'top';
    state.isPitchingTurn = true;
    state.outs = 0;
    state.runners = [false, false, false];
    setTimeout(showPitchSelect, 500);
  }

  function buildPitchButtons() {
    var container = document.getElementById('bbPitchButtons');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < PITCH_TYPE_IDS.length; i++) {
      var id = PITCH_TYPE_IDS[i];
      var def = PITCH_TYPES[id];
      if (!def) continue;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bb-pitch-btn';
      btn.textContent = t('ui.' + def.key);
      btn.addEventListener('click', (function (pitchId) {
        return function () {
          if (state.ballMoving || state.gameOver) return;
          startBall(pitchId);
        };
      })(id));
      container.appendChild(btn);
    }
  }

  global.bbInitGame = initGame;

  var btnRetry = document.getElementById('bbBtnRetry');
  var btnSwing = document.getElementById('bbSwingBtn');
  var timingBar = document.getElementById('bbTimingBar');
  if (btnRetry) btnRetry.addEventListener('click', initGame);
  if (btnSwing) btnSwing.addEventListener('click', swing);
  if (timingBar) {
    timingBar.addEventListener('click', function () {
      if (state.ballMoving) swing();
    });
  }
})(typeof window !== 'undefined' ? window : this);
