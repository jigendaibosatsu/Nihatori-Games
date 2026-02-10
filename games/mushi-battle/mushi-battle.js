(function () {
  'use strict';

  var MAX_HP = 100;

  var TYPES = ['rock', 'scissors', 'paper'];

  var CARDS = [
    { id: 'stag', name: 'クワガタキング', type: 'rock', atk: 26, hp: 90, tag: 'バランス' },
    { id: 'kabuto', name: 'カブトチャンピオン', type: 'paper', atk: 22, hp: 110, tag: 'タフ' },
    { id: 'mantis', name: 'カマキリエース', type: 'scissors', atk: 30, hp: 80, tag: 'こうげき' }
  ];

  var enemyDeck = [
    { id: 'rhino', name: 'サイカブト', type: 'rock', atk: 24, hp: 100, tag: 'ライバル' },
    { id: 'stag2', name: 'ノコギリクワガタ', type: 'scissors', atk: 28, hp: 85, tag: 'きりさき' },
    { id: 'beetle', name: 'ヘラクレス', type: 'paper', atk: 20, hp: 120, tag: 'おもい' }
  ];

  var state = {
    yourHp: MAX_HP,
    enemyHp: MAX_HP,
    round: 1,
    selectedCardId: null
  };

  var elYourHpInner, elEnemyHpInner, elYourHpText, elEnemyHpText, elRound, elMessage;
  var elYourCards, elEnemyCards;

  function cacheDom() {
    elYourHpInner = document.getElementById('mb-your-hp-inner');
    elEnemyHpInner = document.getElementById('mb-enemy-hp-inner');
    elYourHpText = document.getElementById('mb-your-hp-text');
    elEnemyHpText = document.getElementById('mb-enemy-hp-text');
    elRound = document.getElementById('mb-round');
    elMessage = document.getElementById('mb-message');
    elYourCards = document.getElementById('mb-your-cards');
    elEnemyCards = document.getElementById('mb-enemy-cards');
  }

  function setMessage(text) {
    if (!elMessage) return;
    elMessage.textContent = text || '';
  }

  function updateHud() {
    if (elYourHpInner) {
      elYourHpInner.style.width = Math.max(0, state.yourHp) + '%';
    }
    if (elEnemyHpInner) {
      elEnemyHpInner.style.width = Math.max(0, state.enemyHp) + '%';
    }
    if (elYourHpText) elYourHpText.textContent = Math.max(0, state.yourHp) + ' / ' + MAX_HP;
    if (elEnemyHpText) elEnemyHpText.textContent = Math.max(0, state.enemyHp) + ' / ' + MAX_HP;
    if (elRound) elRound.textContent = String(state.round);
  }

  function typeLabel(t) {
    if (t === 'rock') return 'グー（かぶと）';
    if (t === 'scissors') return 'チョキ（かまきり）';
    if (t === 'paper') return 'パー（くわがた）';
    return t;
  }

  function typeEmoji(t) {
    if (t === 'rock') return '✊';
    if (t === 'scissors') return '✌️';
    if (t === 'paper') return '✋';
    return '🐛';
  }

  function renderCards() {
    if (elYourCards) {
      elYourCards.innerHTML = '';
      CARDS.forEach(function (c) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'mb-card you';
        if (state.selectedCardId === c.id) card.classList.add('selected');
        card.dataset.id = c.id;

        var icon = document.createElement('div');
        icon.className = 'mb-card-icon mb-type-' + c.type;
        icon.textContent = typeEmoji(c.type);

        var main = document.createElement('div');
        main.className = 'mb-card-main';
        var name = document.createElement('div');
        name.className = 'mb-card-name';
        name.textContent = c.name;
        var meta = document.createElement('div');
        meta.className = 'mb-card-meta';
        meta.textContent = typeLabel(c.type) + ' ／ ATK ' + c.atk + ' ／ HP ' + c.hp;
        main.appendChild(name);
        main.appendChild(meta);

        var tag = document.createElement('div');
        tag.className = 'mb-card-tag';
        tag.textContent = c.tag;

        card.appendChild(icon);
        card.appendChild(main);
        card.appendChild(tag);
        elYourCards.appendChild(card);
      });
    }

    if (elEnemyCards) {
      elEnemyCards.innerHTML = '';
      enemyDeck.forEach(function (c) {
        var card = document.createElement('div');
        card.className = 'mb-card';

        var icon = document.createElement('div');
        icon.className = 'mb-card-icon mb-type-' + c.type;
        icon.textContent = typeEmoji(c.type);

        var main = document.createElement('div');
        main.className = 'mb-card-main';
        var name = document.createElement('div');
        name.className = 'mb-card-name';
        name.textContent = c.name;
        var meta = document.createElement('div');
        meta.className = 'mb-card-meta';
        meta.textContent = typeLabel(c.type) + ' ／ ATK ' + c.atk + ' ／ HP ' + c.hp;
        main.appendChild(name);
        main.appendChild(meta);

        var tag = document.createElement('div');
        tag.className = 'mb-card-tag';
        tag.textContent = c.tag;

        card.appendChild(icon);
        card.appendChild(main);
        card.appendChild(tag);
        elEnemyCards.appendChild(card);
      });
    }
  }

  function judge(a, b) {
    if (a === b) return 0;
    if (
      (a === 'rock' && b === 'scissors') ||
      (a === 'scissors' && b === 'paper') ||
      (a === 'paper' && b === 'rock')
    ) {
      return 1;
    }
    return -1;
  }

  function doBattle() {
    var yourCard = CARDS.find(function (c) { return c.id === state.selectedCardId; });
    if (!yourCard) {
      setMessage('まずは自分のムシを選んでください。');
      return;
    }
    var enemyCard = enemyDeck[Math.floor(Math.random() * enemyDeck.length)];

    var result = judge(yourCard.type, enemyCard.type);
    var log = 'あなた: ' + yourCard.name + '（' + typeLabel(yourCard.type) + '）\n';
    log += 'あいて: ' + enemyCard.name + '（' + typeLabel(enemyCard.type) + '）\n\n';

    if (result === 0) {
      log += 'あいこ！ どちらにもダメージは入りません。';
    } else if (result === 1) {
      var dmg = yourCard.atk;
      // 属性有利ならダメージアップ
      dmg = Math.floor(dmg * 1.5);
      state.enemyHp -= dmg;
      log += 'あなたの勝ち！ ' + dmg + ' ダメージを与えた。';
    } else {
      var edmg = enemyCard.atk;
      edmg = Math.floor(edmg * 1.5);
      state.yourHp -= edmg;
      log += '相手の勝ち！ あなたは ' + edmg + ' ダメージを受けた…。';
    }

    state.round++;
    updateHud();
    setMessage(log);

    if (state.yourHp <= 0 || state.enemyHp <= 0) {
      if (state.yourHp <= 0 && state.enemyHp <= 0) {
        setMessage(log + '\n\n相打ち！ 互いに力尽きた…。');
      } else if (state.enemyHp <= 0) {
        setMessage(log + '\n\n勝利！ キング・オブ・ムシはあなたです。');
      } else {
        setMessage(log + '\n\n敗北… 次のデッキ構成を試してみよう。');
      }
    }
  }

  function bindEvents() {
    if (elYourCards) {
      elYourCards.addEventListener('click', function (ev) {
        var card = ev.target.closest('.mb-card.you');
        if (!card || !card.dataset.id) return;
        state.selectedCardId = card.dataset.id;
        renderCards();
        if (state.yourHp > 0 && state.enemyHp > 0) {
          doBattle();
        }
      });
    }

    var btnRestart = document.getElementById('mb-btn-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', function () {
        initGame();
      });
    }
  }

  function initGame() {
    state.yourHp = MAX_HP;
    state.enemyHp = MAX_HP;
    state.round = 1;
    state.selectedCardId = null;
    setMessage('自分のムシをタップして、じゃんけんバトルを始めましょう。');
    updateHud();
    renderCards();
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

