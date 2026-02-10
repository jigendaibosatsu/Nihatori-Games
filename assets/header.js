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

  function initLogo(container) {
    var img = container ? container.querySelector('.site-logo .logo-img') : document.querySelector('.site-logo .logo-img');
    var fallback = container ? container.querySelector('.site-logo .logo-fallback') : document.querySelector('.site-logo .logo-fallback');
    if (!img || !fallback) return;
    function showFallback() {
      img.setAttribute('hidden', '');
      fallback.removeAttribute('hidden');
    }
    img.onerror = function () {
      showFallback();
    };
    img.onload = function () {
      img.removeAttribute('hidden');
      fallback.setAttribute('hidden', '');
    };
    if (img.complete && img.naturalWidth > 0) {
      fallback.setAttribute('hidden', '');
    } else if (img.complete) {
      img.onerror();
    }
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

  function initMobileDrawer() {
    if (document.getElementById('mobile-drawer')) return;

    var links = [
      { href: '/about.html', text: 'このサイトについて' },
      { href: '/roadmap.html', text: '開発ロードマップ' },
      { href: '/games/punipuni-arena/', text: 'PuniPuni Arena' },
      { href: '/games/baba-nuki/', text: 'ババ抜き' },
      { href: '/games/omikuji/', text: 'おみくじ' },
      { href: '/games/mini-dq/', text: '小さな冒険' },
      { href: '/games/jump-action/', text: 'ジャンプアクション' },
      { href: '/games/megami-like/', text: '悪魔契約' },
      { href: '/games/box-maker/', text: 'ボックスメーカー' },
      { href: '/games/sv-like/', text: 'シャチクバース' },
      { href: '/games/poke-like/', text: 'ポケもんバトル' },
      { href: '/games/poke-town/', text: 'まちあるき' },
      { href: '/games/mystery/', text: '推理ゲーム' },
      { href: '/games/punipuni/', text: 'ウパ揃え' },
      { href: '/games/japan-war/', text: '合戦' },
      { href: '/games/japan-war-b/', text: '合戦B' },
      { href: '/games/election/', text: '選挙で当選！' },
      { href: '/games/kart-race/', text: 'カートレース' },
      { href: '/games/table-tennis/', text: '卓球' },
      { href: '/games/tetris-like/', text: 'ブロック落とし' },
      { href: '/games/power-pro/', text: 'きゅーと野球' },
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
      { href: '/games/smash-battle/', text: 'スマッシュバトル' },
      { href: '/games/grow-island/', text: 'Grow 島' },
      { href: '/games/unscrew/', text: 'ネジ外し' }
    ];

    var listHtml = links.map(function (item) {
      return '<li><a href="' + item.href + '">' + item.text + '</a></li>';
    }).join('');

    var drawer = document.createElement('div');
    drawer.id = 'mobile-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="mobile-drawer-overlay" id="mobile-drawer-overlay" aria-label="メニューを閉じる"></div>' +
      '<div class="mobile-drawer-panel">' +
        '<button type="button" class="mobile-drawer-close btn-icon" aria-label="メニューを閉じる">×</button>' +
        '<div class="mobile-drawer-inner">' +
          '<p class="mobile-drawer-label">ピックアップ</p>' +
          '<ul class="mobile-drawer-links">' + listHtml + '</ul>' +
          '<div class="mobile-drawer-social">' +
            '<p class="mobile-drawer-label">SNS</p>' +
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

  fetch(url)
    .then(function (res) { return res.ok ? res.text() : Promise.reject(new Error(res.status)); })
    .then(function (html) {
      placeholder.innerHTML = html;
      initLogo(placeholder);
      initMobileDrawer();
    })
    .catch(function () {
      placeholder.innerHTML = '<header class="site-header"><div class="header-inner"><a href="/" class="site-logo">NIHATORI</a><div class="header-actions"><button type="button" class="btn-icon btn-search" aria-label="検索">🔍</button><button type="button" class="btn-icon btn-menu" aria-label="メニュー">☰</button></div></div></header>';
      initMobileDrawer();
    });
})();
