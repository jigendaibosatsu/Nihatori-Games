(function () {
  'use strict';

  var PHASE_IDLE = 'idle';
  var PHASE_WINDUP = 'windup';
  var PHASE_ATTACK = 'attack';
  var PHASE_COOLDOWN = 'cooldown';

  var HP_MAX = 3;

  var state = {
    hp: HP_MAX,
    streak: 0,
    best: 0,
    phase: PHASE_IDLE,
    timeInPhase: 0,
    barPos: 0,     // 0〜100
    barDir: 1,     // 1 or -1
    lastTimestamp: null
  };

  var elHpInner, elHpText, elStreak, elBest, elEnemyState, elTimingBar, elMessage;
  var elBtnParry;

  function cacheDom() {
    elHpInner = document.getElementById('pd-hp-inner');
    elHpText = document.getElementById('pd-hp-text');
    elStreak = document.getElementById('pd-streak');
    elBest = document.getElementById('pd-best');
    elEnemyState = document.getElementById('pd-enemy-state');
    elTimingBar = document.getElementById('pd-timing-bar');
    elMessage = document.getElementById('pd-message');
    elBtnParry = document.getElementById('pd-btn-parry');
  }

  function setMessage(text, kind) {
    if (!elMessage) return;
    elMessage.textContent = text || '';
    elMessage.className = 'pd-message';
    if (kind === 'positive') elMessage.classList.add('positive');
    if (kind === 'negative') elMessage.classList.add('negative');
  }

  function updateHud() {
    if (elHpInner) {
      var ratio = Math.max(0, state.hp) / HP_MAX;
      elHpInner.style.width = (ratio * 100) + '%';
    }
    if (elHpText) elHpText.textContent = state.hp + ' / ' + HP_MAX;
    if (elStreak) elStreak.textContent = String(state.streak);
    if (elBest) elBest.textContent = String(state.best);
  }

  function updateEnemyView() {
    if (!elEnemyState || !elTimingBar) return;
    var label;
    if (state.phase === PHASE_IDLE) label = '待機中…';
    else if (state.phase === PHASE_WINDUP) label = 'ため中';
    else if (state.phase === PHASE_ATTACK) label = '攻撃！';
    else label = 'クールダウン';
    elEnemyState.textContent = label;
    elTimingBar.style.transform = 'translateX(' + state.barPos + '%)';
  }

  function resetForNewRound() {
    state.phase = PHASE_WINDUP;
    state.timeInPhase = 0;
    state.barPos = 0;
    state.barDir = 1;
    setMessage('敵が構えた…。タイミングを見計らってパリィ！', null);
  }

  function resolveParry() {
    if (state.phase !== PHASE_ATTACK) {
      // タイミング外
      state.hp--;
      state.streak = 0;
      setMessage('早すぎる or 遅すぎる！ パリィ失敗で 1 ダメージ…。', 'negative');
      if (state.hp <= 0) {
        setMessage('力尽きた…。ベスト連続パリィ数: ' + state.best + '。', 'negative');
        state.phase = PHASE_IDLE;
      }
      updateHud();
      return;
    }

    // バーが中央ゾーン（40〜60％）にあるかチェック
    if (state.barPos >= 40 && state.barPos <= 60) {
      state.streak++;
      if (state.streak > state.best) state.best = state.streak;
      setMessage('完璧なパリィ！ 連続: ' + state.streak, 'positive');
      updateHud();
      // 連続でパリィし続けられるよう、すぐ次のラウンドへ
      resetForNewRound();
    } else {
      state.hp--;
      state.streak = 0;
      setMessage('かすった… パリィ失敗で 1 ダメージ。', 'negative');
      updateHud();
      if (state.hp <= 0) {
        setMessage('力尽きた…。ベスト連続パリィ数: ' + state.best + '。', 'negative');
        state.phase = PHASE_IDLE;
      } else {
        resetForNewRound();
      }
    }
  }

  function tick(deltaMs) {
    state.timeInPhase += deltaMs;

    if (state.phase === PHASE_IDLE) {
      return;
    }

    if (state.phase === PHASE_WINDUP) {
      // ため時間 800〜1300ms
      var windupTime = 800 + Math.random() * 500;
      if (state.timeInPhase >= windupTime) {
        state.phase = PHASE_ATTACK;
        state.timeInPhase = 0;
        setMessage('今だ！ 緑のバーが中央に来た瞬間にパリィ！', null);
      }
    } else if (state.phase === PHASE_ATTACK) {
      // バーを左右に往復させる
      var speed = 0.18; // % / ms
      state.barPos += state.barDir * speed * deltaMs;
      if (state.barPos <= 0) { state.barPos = 0; state.barDir = 1; }
      if (state.barPos >= 90) { state.barPos = 90; state.barDir = -1; }
      // 一定時間（1500ms）で強制攻撃判定
      if (state.timeInPhase >= 1500) {
        // パリィし損ねた扱い
        state.hp--;
        state.streak = 0;
        setMessage('攻撃をもらってしまった…。', 'negative');
        updateHud();
        if (state.hp <= 0) {
          setMessage('力尽きた…。ベスト連続パリィ数: ' + state.best + '。', 'negative');
          state.phase = PHASE_IDLE;
        } else {
          state.phase = PHASE_COOLDOWN;
          state.timeInPhase = 0;
        }
      }
    } else if (state.phase === PHASE_COOLDOWN) {
      if (state.timeInPhase >= 700) {
        resetForNewRound();
      }
    }

    updateEnemyView();
  }

  function loop(timestamp) {
    if (state.lastTimestamp == null) state.lastTimestamp = timestamp;
    var delta = timestamp - state.lastTimestamp;
    state.lastTimestamp = timestamp;
    tick(delta);
    requestAnimationFrame(loop);
  }

  function bindEvents() {
    if (elBtnParry) {
      elBtnParry.addEventListener('click', function () {
        if (state.hp <= 0) return;
        resolveParry();
      });
    }

    var btnRestart = document.getElementById('pd-btn-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', function () {
        initGame();
      });
    }
  }

  function initGame() {
    state.hp = HP_MAX;
    state.streak = 0;
    state.phase = PHASE_WINDUP;
    state.timeInPhase = 0;
    state.barPos = 0;
    state.barDir = 1;
    setMessage('パリィ修行開始。バーの動きを目で追ってみよう。', null);
    updateHud();
    updateEnemyView();
  }

  function init() {
    cacheDom();
    initGame();
    bindEvents();
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

