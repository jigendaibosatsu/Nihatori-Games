(function () {
  'use strict';

  // ====== コア状態 ======
  var state = {
    money: 0,
    employees: 1,
    reputation: 0,
    timeMinutes: 0,
    mails: [],
    nextMailId: 1
  };

  var TICK_MS = 2000; // 2秒ごとに1「社内時間」進行
  var MAX_MAILS = 50;

  // メール生成レート: 社員数と評判でスケール
  function calcMailSpawnChancePerTick() {
    var base = 0.18; // 18%
    var empBonus = Math.min(state.employees * 0.015, 0.35); // 上限+35%
    var repBonus = Math.max(Math.min(state.reputation / 200, 0.25), -0.15);
    return base + empBonus + repBonus;
  }

  // メール種別
  var MAIL_TYPES = ['order', 'hire', 'trouble'];

  function pickMailType() {
    var r = Math.random();
    // 売上メールが基本、社員が多いほど「採用メール」が増える
    var hireWeight = Math.min(state.employees * 0.02, 0.3);
    var troubleWeight = 0.15 + Math.max(state.employees - 10, 0) * 0.01;
    var orderWeight = 1 - hireWeight - troubleWeight;
    if (r < orderWeight) return 'order';
    if (r < orderWeight + hireWeight) return 'hire';
    return 'trouble';
  }

  function formatTime(mins) {
    var d = Math.floor(mins / (24 * 60));
    var mOfDay = mins % (24 * 60);
    var h = Math.floor(mOfDay / 60);
    var m = mOfDay % 60;
    if (d === 0) {
      return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
    }
    return d + '日目 ' + (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }

  // ====== メール文面生成 ======
  function createOrderMail() {
    var revenue = Math.round((3000 + Math.random() * 12000) * (1 + state.employees * 0.02));
    var repGain = 1 + Math.floor(Math.random() * 3);
    return {
      id: state.nextMailId++,
      type: 'order',
      from: '取引先企業',
      subject: '【受注依頼】メールだけで完結する案件のご相談',
      body: 'いつもお世話になっております。御社の「通知だけで回る組織運営」に興味があります。\n' +
        '簡単な業務を継続的にお願いしたく、まずはテスト案件からいかがでしょうか？',
      createdAt: state.timeMinutes,
      revenue: revenue,
      repGain: repGain,
      repLoss: 1,
      handled: false
    };
  }

  function createHireMail() {
    var empGain = 1 + (Math.random() < 0.25 ? 1 : 0); // たまに2人増える
    var salary = 500; // 1人あたり1社内時間あたりの固定費イメージ
    return {
      id: state.nextMailId++,
      type: 'hire',
      from: '候補者 / リファラル',
      subject: '【応募】通知ベースの働き方に魅力を感じました',
      body: 'はじめまして。御社の「メールを待つだけ」のワークスタイルに惹かれました。\n' +
        '自動返信ボットの調整や、通知ルール設計の経験があります。ぜひ一度お話させてください。',
      createdAt: state.timeMinutes,
      empGain: empGain,
      salary: salary,
      handled: false
    };
  }

  function createTroubleMail() {
    var loss = Math.round(2000 + Math.random() * 6000);
    var repPenalty = 2 + Math.floor(Math.random() * 3);
    return {
      id: state.nextMailId++,
      type: 'trouble',
      from: 'クレーム窓口 / システム監視',
      subject: '【要確認】返信の自動化が過剰になっています',
      body: '一部のお客様から、「人間味が無さすぎる」とのご指摘が届いています。\n' +
        '放置しすぎると評判の低下や解約に繋がる恐れがあります。どこまで自動化を進めるか、ご判断ください。',
      createdAt: state.timeMinutes,
      loss: loss,
      repPenalty: repPenalty,
      handled: false
    };
  }

  function spawnMail() {
    if (state.mails.length >= MAX_MAILS) {
      state.mails.shift(); // 古いのを捨てる
    }
    var t = pickMailType();
    var mail;
    if (t === 'order') mail = createOrderMail();
    else if (t === 'hire') mail = createHireMail();
    else mail = createTroubleMail();
    state.mails.push(mail);
    renderMail(mail, true);
    updateUnreadCount();
    document.getElementById('mc-empty-hint').style.display = 'none';
  }

  // ====== UI ======
  var elMoney, elEmployees, elReputation, elMailList, elUnread;

  function initDom() {
    elMoney = document.getElementById('mc-money');
    elEmployees = document.getElementById('mc-employees');
    elReputation = document.getElementById('mc-reputation');
    elMailList = document.getElementById('mc-mail-list');
    elUnread = document.getElementById('mc-unread-count');
    updateStats();
  }

  function yen(n) {
    return '¥' + n.toLocaleString('ja-JP');
  }

  function updateStats() {
    if (!elMoney) return;
    elMoney.textContent = yen(Math.max(0, Math.floor(state.money)));
    elEmployees.textContent = state.employees + '人';
    elReputation.textContent = state.reputation.toString();
  }

  function updateUnreadCount() {
    var unread = state.mails.filter(function (m) { return !m.handled; }).length;
    elUnread.textContent = unread;
  }

  function createMailElement(mail) {
    var root = document.createElement('article');
    root.className = 'mc-mail mc-new';
    root.dataset.mailId = String(mail.id);

    // ヘッダ
    var header = document.createElement('div');
    header.className = 'mc-mail-header';
    var from = document.createElement('span');
    from.className = 'mc-mail-from';
    from.textContent = mail.from;
    var tag = document.createElement('span');
    tag.className = 'mc-mail-tag';
    if (mail.type === 'order') tag.textContent = '案件 / 売上通知';
    else if (mail.type === 'hire') tag.textContent = '採用 / 自動増殖';
    else tag.textContent = 'トラブル / リスク';
    var time = document.createElement('span');
    time.className = 'mc-mail-time';
    time.textContent = formatTime(mail.createdAt);
    header.appendChild(from);
    header.appendChild(tag);
    header.appendChild(time);

    // 本文
    var subject = document.createElement('div');
    subject.className = 'mc-mail-subject';
    subject.textContent = mail.subject;
    var body = document.createElement('div');
    body.className = 'mc-mail-body';
    body.textContent = mail.body;

    // フッタ
    var footer = document.createElement('div');
    footer.className = 'mc-mail-footer';
    var impact = document.createElement('div');
    impact.className = 'mc-mail-impact';

    if (mail.type === 'order') {
      impact.innerHTML =
        '<span class="gain">+' + yen(mail.revenue) + '</span>' +
        '<span class="gain">評判 +' + mail.repGain + '</span>';
    } else if (mail.type === 'hire') {
      impact.innerHTML =
        '<span class="gain">社員 +' + mail.empGain + '</span>' +
        '<span class="loss">固定費 +' + yen(mail.salary * mail.empGain) + '</span>';
    } else {
      impact.innerHTML =
        '<span class="loss">-' + yen(mail.loss) + '</span>' +
        '<span class="loss">評判 -' + mail.repPenalty + '</span>';
    }

    var actions = document.createElement('div');
    actions.className = 'mc-mail-actions';
    var primary = document.createElement('button');
    primary.className = 'mc-btn primary';
    var secondary = document.createElement('button');
    secondary.className = 'mc-btn secondary';

    if (mail.type === 'order') {
      primary.textContent = '受注する';
      secondary.textContent = '今回は見送る';
      primary.addEventListener('click', function () { handleOrder(mail, true, root); });
      secondary.addEventListener('click', function () { handleOrder(mail, false, root); });
    } else if (mail.type === 'hire') {
      primary.textContent = '採用する';
      secondary.textContent = '今は増やさない';
      primary.addEventListener('click', function () { handleHire(mail, true, root); });
      secondary.addEventListener('click', function () { handleHire(mail, false, root); });
    } else {
      primary.textContent = '対応する';
      secondary.textContent = '放置する';
      primary.addEventListener('click', function () { handleTrouble(mail, true, root); });
      secondary.addEventListener('click', function () { handleTrouble(mail, false, root); });
    }

    actions.appendChild(primary);
    actions.appendChild(secondary);
    footer.appendChild(impact);
    footer.appendChild(actions);

    root.appendChild(header);
    root.appendChild(subject);
    root.appendChild(body);
    root.appendChild(footer);

    setTimeout(function () {
      root.classList.remove('mc-new');
    }, 300);

    return root;
  }

  function renderMail(mail, append) {
    var el = createMailElement(mail);
    if (append) {
      elMailList.appendChild(el);
    } else {
      elMailList.prepend(el);
    }
  }

  function disableMailActions(root) {
    var btns = root.querySelectorAll('button');
    btns.forEach(function (b) { b.disabled = true; });
  }

  // ====== メール処理 ======
  function markHandled(mail, root) {
    mail.handled = true;
    root.style.opacity = '0.75';
    root.style.borderColor = 'rgba(55, 65, 81, 0.9)';
    updateUnreadCount();
  }

  function handleOrder(mail, accept, root) {
    if (mail.handled) return;
    if (accept) {
      state.money += mail.revenue;
      state.reputation += mail.repGain;
      // 売上メールからごくまれに「勝手に採用」が発生し、社員自動増殖感を出す
      if (Math.random() < 0.15) {
        var autoHire = 1;
        state.employees += autoHire;
        pushSystemNote('大口案件のため、現場判断で社員が自動増員されました（+' + autoHire + '人）。');
      }
    } else {
      state.reputation = Math.max(0, state.reputation - mail.repLoss);
    }
    markHandled(mail, root);
    disableMailActions(root);
    updateStats();
  }

  function handleHire(mail, accept, root) {
    if (mail.handled) return;
    if (accept) {
      state.employees += mail.empGain;
      // 人数が一定を超えると、以後は放置していても「社員が勝手に紹介で増える」
      if (state.employees >= 10) {
        pushSystemNote('組織が自走し始めました。以後、放置していても社員が紹介で増殖します。');
      }
    } else {
      state.reputation = Math.max(0, state.reputation - 1);
    }
    markHandled(mail, root);
    disableMailActions(root);
    updateStats();
  }

  function handleTrouble(mail, accept, root) {
    if (mail.handled) return;
    if (accept) {
      state.money = Math.max(0, state.money - Math.floor(mail.loss / 2));
      state.reputation = Math.max(0, state.reputation - Math.floor(mail.repPenalty / 2));
    } else {
      state.money = Math.max(0, state.money - mail.loss);
      state.reputation = Math.max(0, state.reputation - mail.repPenalty);
    }
    markHandled(mail, root);
    disableMailActions(root);
    updateStats();
  }

  // システムメモ（社員自動増殖などの説明用）
  function pushSystemNote(text) {
    var mail = {
      id: state.nextMailId++,
      type: 'system',
      from: '社内メモ',
      subject: '【自動化ログ】組織からのお知らせ',
      body: text,
      createdAt: state.timeMinutes,
      handled: true
    };
    if (state.mails.length >= MAX_MAILS) state.mails.shift();
    state.mails.push(mail);
    var el = document.createElement('article');
    el.className = 'mc-mail';
    el.dataset.mailId = String(mail.id);
    el.innerHTML =
      '<div class="mc-mail-header">' +
      '<span class="mc-mail-from">' + mail.from + '</span>' +
      '<span class="mc-mail-tag">自動ログ</span>' +
      '<span class="mc-mail-time">' + formatTime(mail.createdAt) + '</span>' +
      '</div>' +
      '<div class="mc-mail-subject">' + mail.subject + '</div>' +
      '<div class="mc-mail-body">' + mail.body + '</div>';
    elMailList.appendChild(el);
  }

  // ====== 時間経過と自動増殖 ======
  function tick() {
    state.timeMinutes += 10; // 1tick = 10分

    // 給与コスト（極小にしておく）
    var salaryCostPerEmp = 100;
    var totalSalary = state.employees * salaryCostPerEmp;
    state.money = Math.max(0, state.money - totalSalary * 0.05); // 少しずつ減る程度

    // 一定以上の規模からは、放置していても紹介で社員が増殖
    if (state.employees >= 10) {
      var chance = Math.min(0.05 + state.employees * 0.002, 0.25);
      if (Math.random() < chance) {
        var gained = 1;
        if (Math.random() < 0.1) gained = 2;
        state.employees += gained;
        pushSystemNote('社員同士の紹介で' + gained + '人採用されました（完全自動）。');
      }
    }

    // メール生成
    var p = calcMailSpawnChancePerTick();
    if (Math.random() < p) {
      spawnMail();
    }

    updateStats();
  }

  function startLoop() {
    setInterval(tick, TICK_MS);
  }

  // ====== init ======
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initDom();
      startLoop();
    });
  } else {
    initDom();
    startLoop();
  }
})();

