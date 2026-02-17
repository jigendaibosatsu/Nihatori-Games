/**
 * 共通ヘッダーを1か所で管理するため、components/header.html を取得して挿入する。
 * プレースホルダー: <div id="site-header"></div> または data-header を持つ要素。
 * 挿入後にロゴの .svg → .png フォールバックを実行。
 * スマホ用：ハンバーガーボタンでピックアップメニュー（ドロワー）を開閉。
 */
(function () {
  'use strict';

  var placeholder = document.getElementById('site-header') || document.querySelector('[data-header]');
  if (!placeholder) return;

  var url = placeholder.getAttribute('data-src') || '/components/header.html';

  var AXOLOTL_LIGHT = [
    '/assets/characters/axolotl/axo_nomal.png',
    '/assets/characters/axolotl/axo_albino.png',
    '/assets/characters/axolotl/axo_gold.png',
    '/assets/characters/axolotl/axo_copper.png',
    '/assets/characters/axolotl/axo_yellow.png',
    '/assets/characters/axolotl/axo_dalmatian.png',
    '/assets/characters/axolotl/axo_chimera.png'
  ];
  var AXOLOTL_DARK = AXOLOTL_LIGHT;

  function getRandomAxolotlLogo() {
    var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var list = dark ? AXOLOTL_DARK : AXOLOTL_LIGHT;
    return list[Math.floor(Math.random() * list.length)];
  }

  function initLogo(container) {
    var img = container ? container.querySelector('.site-logo .logo-axo') : document.querySelector('.site-logo .logo-axo');
    if (!img) return;
    img.src = getRandomAxolotlLogo();
    img.onerror = function () {
      img.src = '/assets/characters/axolotl/axo_nomal.png';
    };
  }

  function initSearchToggle() {
    var btn = document.querySelector('.btn-search');
    if (!btn) return;
    var bar = document.querySelector('.search-bar');
    if (!bar) return;
    var input = document.getElementById('search-input');

    function toggle() {
      bar.classList.toggle('search-bar--hidden');
      if (!bar.classList.contains('search-bar--hidden') && input) {
        input.focus();
      }
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      toggle();
    });
  }

  function closeMenu() {
    document.body.classList.remove('menu-open');
  }

  function openMenu() {
    document.body.classList.add('menu-open');
  }

  function toggleMenu() {
    document.body.classList.toggle('menu-open');
  }

  function refreshMobileDrawer() {
    var drawer = document.getElementById('mobile-drawer');
    if (!drawer) return;
    var t = window.t || function (k) { return k; };
    drawer.querySelector('.mobile-drawer-overlay').setAttribute('aria-label', t('header.ariaClose'));
    drawer.querySelector('.mobile-drawer-close').setAttribute('aria-label', t('header.ariaClose'));
    drawer.querySelectorAll('.mobile-drawer-label').forEach(function (el, i) {
      el.textContent = i === 0 ? t('sidebar.pickup') : t('sidebar.sns');
    });
    var links = [
      { href: '/about.html', textKey: 'sidebar.about' },
      { href: '/roadmap.html', textKey: 'sidebar.roadmap' },
      { href: '/games/punipuni-arena/', text: 'ヘナヘナアリーナ' },
      { href: '/games/baba-nuki/', text: 'ババ抜き' },
      { href: '/games/omikuji/', text: 'おみくじ' },
      { href: '/games/mini-dq/', text: '洞窟の果てへ' },
      { href: '/games/jump-action/', text: 'ジャンプアクション' },
      { href: '/games/megami-like/', text: '悪魔契約' },
      { href: '/games/box-maker/', text: '宝箱コレクター' },
      { href: '/games/sv-like/', text: 'シャチクバース' },
      { href: '/games/poke-like/', text: 'ポンコツケモノバトル' },
      { href: '/games/poke-town/', text: 'まちあるき' },
      { href: '/games/mystery/', text: '推理ゲーム' },
      { href: '/games/punipuni/', text: 'ウパ揃え' },
      { href: '/games/japan-war/', text: '合戦' },
      { href: '/games/japan-war-b/', text: '合戦B' },
      { href: '/games/election/', text: '選挙で当選！' },
      { href: '/games/kart-race/', text: 'カートレース' },
      { href: '/games/horse-race/', text: '競馬ゲーム' },
      { href: '/games/lex-vocab/', text: 'Lex Vocab' },
      { href: '/games/tap-idle/', text: 'タップ放置ビジネス' },
      { href: '/games/word-battle/', text: '英単語カードバトル' },
      { href: '/games/table-tennis/', text: '卓球' },
      { href: '/games/tetris-like/', text: 'ブロック落とし' },
      { href: '/games/power-pro/', text: 'ウーパー野球' },
      { href: '/games/romance/', text: 'きゅーと恋愛' },
      { href: '/games/jinsei/', text: '人生ゲーム' },
      { href: '/games/monster-collection/', text: 'モンスターコレクション' },
      { href: '/games/monster-fusion/', text: 'モンスター配合' },
      { href: '/games/card-collection/', text: 'カードコレクション' },
      { href: '/games/friend-collection/', text: 'ともだちコレクション' },
      { href: '/games/boss-buster/', text: '成敗！ムカつくやつ' },
      { href: '/games/typing/', text: 'タイピング' },
      { href: '/games/kantai-battle/', text: '艦隊バトル' },
      { href: '/games/art-escape/', text: '芸大脱出サバイバル' },
      { href: '/games/axolotl-shop/', text: 'ウーパールーパーショップ' },
      { href: '/games/axolotl-cafe/', text: 'ウーパールーパーカフェ' },
      { href: '/games/stack-blocks/', text: 'ブロック積み上げ' },
      { href: '/games/smash-battle/', text: 'スマッシュバトル' },
      { href: '/games/grow-island/', text: 'Grow 島' },
      { href: '/games/unscrew/', text: 'ネジ外し' }
    ];
    var listItems = links.map(function (item) {
      var label = item.textKey ? t(item.textKey) : item.text;
      return '<li><a href="' + item.href + '">' + label + '</a></li>';
    }).join('');
    drawer.querySelector('.mobile-drawer-links').innerHTML = listItems;
  }

  function initMobileDrawer() {
    if (document.getElementById('mobile-drawer')) {
      refreshMobileDrawer();
      return;
    }

    var links = [
      { href: '/about.html', textKey: 'sidebar.about' },
      { href: '/roadmap.html', textKey: 'sidebar.roadmap' },
      { href: '/games/punipuni-arena/', text: 'ヘナヘナアリーナ' },
      { href: '/games/baba-nuki/', text: 'ババ抜き' },
      { href: '/games/omikuji/', text: 'おみくじ' },
      { href: '/games/mini-dq/', text: '洞窟の果てへ' },
      { href: '/games/jump-action/', text: 'ジャンプアクション' },
      { href: '/games/megami-like/', text: '悪魔契約' },
      { href: '/games/box-maker/', text: '宝箱コレクター' },
      { href: '/games/sv-like/', text: 'シャチクバース' },
      { href: '/games/poke-like/', text: 'ポンコツケモノバトル' },
      { href: '/games/poke-town/', text: 'まちあるき' },
      { href: '/games/mystery/', text: '推理ゲーム' },
      { href: '/games/punipuni/', text: 'ウパ揃え' },
      { href: '/games/japan-war/', text: '合戦' },
      { href: '/games/japan-war-b/', text: '合戦B' },
      { href: '/games/election/', text: '選挙で当選！' },
      { href: '/games/kart-race/', text: 'カートレース' },
      { href: '/games/horse-race/', text: '競馬ゲーム' },
      { href: '/games/lex-vocab/', text: 'Lex Vocab' },
      { href: '/games/tap-idle/', text: 'タップ放置ビジネス' },
      { href: '/games/word-battle/', text: '英単語カードバトル' },
      { href: '/games/table-tennis/', text: '卓球' },
      { href: '/games/tetris-like/', text: 'ブロック落とし' },
      { href: '/games/power-pro/', text: 'ウーパー野球' },
      { href: '/games/romance/', text: 'きゅーと恋愛' },
      { href: '/games/jinsei/', text: '人生ゲーム' },
      { href: '/games/monster-collection/', text: 'モンスターコレクション' },
      { href: '/games/monster-fusion/', text: 'モンスター配合' },
      { href: '/games/card-collection/', text: 'カードコレクション' },
      { href: '/games/friend-collection/', text: 'ともだちコレクション' },
      { href: '/games/boss-buster/', text: '成敗！ムカつくやつ' },
      { href: '/games/typing/', text: 'タイピング' },
      { href: '/games/kantai-battle/', text: '艦隊バトル' },
      { href: '/games/art-escape/', text: '芸大脱出サバイバル' },
      { href: '/games/axolotl-shop/', text: 'ウーパールーパーショップ' },
      { href: '/games/axolotl-cafe/', text: 'ウーパールーパーカフェ' },
      { href: '/games/stack-blocks/', text: 'ブロック積み上げ' },
      { href: '/games/smash-battle/', text: 'スマッシュバトル' },
      { href: '/games/grow-island/', text: 'Grow 島' },
      { href: '/games/unscrew/', text: 'ネジ外し' }
    ];

    var t = window.t || function (k) { return k; };
    var listHtml = links.map(function (item) {
      var label = item.textKey ? t(item.textKey) : item.text;
      return '<li><a href="' + item.href + '">' + label + '</a></li>';
    }).join('');

    var drawer = document.createElement('div');
    drawer.id = 'mobile-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    var closeAria = t('header.ariaClose');
    drawer.innerHTML =
      '<div class="mobile-drawer-overlay" id="mobile-drawer-overlay" aria-label="' + closeAria + '"></div>' +
      '<div class="mobile-drawer-panel">' +
        '<button type="button" class="mobile-drawer-close btn-icon" aria-label="' + closeAria + '">×</button>' +
        '<div class="mobile-drawer-inner">' +
          '<p class="mobile-drawer-label">' + t('sidebar.pickup') + '</p>' +
          '<ul class="mobile-drawer-links">' + listHtml + '</ul>' +
          '<div class="mobile-drawer-social">' +
            '<p class="mobile-drawer-label">' + t('sidebar.sns') + '</p>' +
            '<div class="social-links">' +
              '<a href="https://www.instagram.com/nihatori_zeroh/" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Instagram"><span>📷</span> Instagram</a>' +
              '<a href="https://x.com/Nihatori_Zeroh" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="X (Twitter)"><span>🐦</span> X (Twitter)</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(drawer);

    var overlay = document.getElementById('mobile-drawer-overlay');
    var closeBtn = drawer.querySelector('.mobile-drawer-close');
    overlay.addEventListener('click', closeMenu);
    closeBtn.addEventListener('click', closeMenu);
    drawer.querySelectorAll('.mobile-drawer-links a, .mobile-drawer-social a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });

    var menuBtn = document.querySelector('.btn-menu');
    if (menuBtn) {
      var lastTouchEnd = 0;
      menuBtn.addEventListener('touchend', function (e) {
        e.preventDefault();
        lastTouchEnd = Date.now();
        toggleMenu();
      }, { passive: false });
      menuBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (Date.now() - lastTouchEnd < 400) return;
        toggleMenu();
      });
    }

    function syncAria() {
      drawer.setAttribute('aria-hidden', document.body.classList.contains('menu-open') ? 'false' : 'true');
    }
    var observer = new MutationObserver(syncAria);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncAria();

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768) closeMenu();
    });
  }

  window.refreshMobileDrawer = refreshMobileDrawer;

  function afterHeaderInjected() {
    initLogo(placeholder);
    initMobileDrawer();
    initSearchToggle();
    if (window.nihatoriI18n) {
      window.nihatoriI18n.apply();
      var sw = document.getElementById('lang-switcher');
      if (sw) window.nihatoriI18n.renderSwitcher(sw);
    }
  }

  fetch(url)
    .then(function (res) { return res.ok ? res.text() : Promise.reject(new Error(res.status)); })
    .then(function (html) {
      placeholder.innerHTML = html;
      afterHeaderInjected();
    })
    .catch(function () {
      placeholder.innerHTML = '<header class="site-header"><div class="header-inner"><a href="/" class="site-logo" data-i18n-aria="header.ariaTop"><img class="logo-axo" src="/assets/characters/axolotl/axo_nomal.png" alt="" width="32" height="32" /><span class="logo-text" data-i18n="site.logo">ニハトリ</span></a><div class="header-actions"><div id="lang-switcher" class="lang-switcher-wrap"></div><button type="button" class="btn-icon btn-search" data-i18n-aria="search.ariaLabel">🔍</button><button type="button" class="btn-icon btn-menu" data-i18n-aria="header.ariaMenu">☰</button></div></div></header>';
      afterHeaderInjected();
    });
})();
