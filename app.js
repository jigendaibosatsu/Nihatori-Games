/**
 * Nihatori Games – トップページ
 * タブ切替（URL ?tab= と pushState）、ヒーロー＋記事リスト、data/feed.json
 */

(function () {
  'use strict';

  var TAB_IDS = ['top', 'games', 'hobby', 'posts', 'trending', 'recommended'];
  var TAB_PARAM = 'tab';
  var SWIPE_THRESHOLD = 50;

  /**
   * feed.json 想定スキーマ:
   * items[]: id, type("game"|"post"), title, url, image, category("games"|"hobby"|"devlog"),
   *   publishedAt(ISO), commentCount(number), isNew(boolean) or newUntil(ISO), recommended(boolean), trendingScore(number)
   */

  var DUMMY_FEED = {
    items: [
      { id: 'post-2026-01-update-summary', type: 'post', title: '2026年1月 新作・アップデートまとめ', url: '/index.html?tab=games', image: null, category: 'devlog', publishedAt: '2026-01-31T20:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 90 },
      { id: 'card-collection', type: 'game', title: 'カードコレクション', url: './games/card-collection/', image: null, category: 'games', publishedAt: '2026-01-31T19:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 85 },
      { id: 'monster-collection', type: 'game', title: 'モンスターコレクション', url: './games/monster-collection/', image: null, category: 'games', publishedAt: '2026-01-31T18:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 78 },
      { id: 'jinsei', type: 'game', title: '人生ゲーム', url: './games/jinsei/', image: null, category: 'games', publishedAt: '2026-01-31T17:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 80 },
      { id: 'romance', type: 'game', title: 'きゅーと恋愛', url: './games/romance/', image: null, category: 'games', publishedAt: '2026-01-31T16:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 82 },
      { id: 'power-pro', type: 'game', title: 'きゅーと野球', url: './games/power-pro/', image: null, category: 'games', publishedAt: '2026-01-31T15:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 85 },
      { id: 'election', type: 'game', title: '選挙で当選！', url: './games/election/', image: null, category: 'games', publishedAt: '2026-01-31T14:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 88 },
      { id: 'japan-war', type: 'game', title: '合戦', url: './games/japan-war/', image: null, category: 'games', publishedAt: '2026-01-31T12:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 95 },
      { id: '1', type: 'game', title: 'ババ抜き（準備中）', url: './games/baba-nuki/', image: null, category: 'games', publishedAt: '2026-01-31T10:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 90 },
      { id: '2', type: 'post', title: '開発ロードマップ公開', url: '/roadmap.html', image: null, category: 'devlog', publishedAt: '2026-01-30T14:00:00+09:00', commentCount: 2, isNew: false, recommended: true, trendingScore: 70 },
      { id: '3', type: 'post', title: 'サイトオープンのお知らせ', url: null, image: null, category: 'devlog', publishedAt: '2026-01-29T09:00:00+09:00', commentCount: 0, isNew: false, recommended: false, trendingScore: 50 },
      { id: '4', type: 'game', title: '次のゲーム企画中', url: null, image: null, category: 'games', publishedAt: '2026-01-28T12:00:00+09:00', commentCount: 0, isNew: false, recommended: false, trendingScore: 40 },
      { id: '5', type: 'post', title: '趣味：音楽制作', url: null, image: null, category: 'hobby', publishedAt: '2026-01-20T10:00:00+09:00', commentCount: 1, isNew: false, recommended: false, trendingScore: 30 },
    ],
  };

  var feedData = { items: [] };

  function getTabFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var tab = params.get(TAB_PARAM) || 'top';
    return TAB_IDS.indexOf(tab) >= 0 ? tab : 'top';
  }

  function setUrlTab(tabId, replace) {
    var url = new URL(window.location.href);
    url.searchParams.set(TAB_PARAM, tabId);
    var target = url.pathname + '?' + url.searchParams.toString();
    if (replace) {
      window.history.replaceState({ tab: tabId }, '', target);
    } else {
      window.history.pushState({ tab: tabId }, '', target);
    }
  }

  function byPublishedAt(a, b) {
    var ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    var tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  }
  function byTrendingScore(a, b) {
    return (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
  }

  function getItemsForTab(tabId) {
    var items = feedData.items || [];
    switch (tabId) {
      case 'games':
        return items.filter(function (i) { return i.type === 'game'; }).sort(byPublishedAt);
      case 'hobby':
        return items.filter(function (i) { return i.category === 'hobby'; }).sort(byPublishedAt);
      case 'posts':
        return items.filter(function (i) { return i.type === 'post'; }).sort(byPublishedAt);
      case 'trending':
        return items.slice().sort(byTrendingScore);
      case 'recommended':
        return items.filter(function (i) { return i.recommended === true; }).sort(byPublishedAt);
      case 'top':
      default:
        return items.slice().sort(byPublishedAt);
    }
  }

  function formatTime(item) {
    var raw = item.publishedAt;
    if (!raw) return '';
    var d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    var now = Date.now();
    var diff = (now - d.getTime()) / 1000;
    if (diff < 60) return 'たった今';
    if (diff < 3600) return Math.floor(diff / 60) + '分前';
    if (diff < 86400) return Math.floor(diff / 3600) + '時間前';
    if (diff < 604800) return Math.floor(diff / 86400) + '日前';
    return d.getMonth() + 1 + '/' + d.getDate();
  }

  function showNewBadge(item) {
    if (item.isNew === true) return true;
    if (item.newUntil) {
      try { return new Date(item.newUntil).getTime() > Date.now(); } catch (e) { return false; }
    }
    return false;
  }

  function imagePlaceholderSvg(width, height) {
    width = width || 100;
    height = height || 70;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><rect width="100%" height="100%" fill="#e0e0e0"/></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function imageSrc(itemImage) {
    if (itemImage && typeof itemImage === 'string' && itemImage.trim() !== '') return itemImage.trim();
    return imagePlaceholderSvg(400, 225);
  }

  function imageSrcRow(itemImage) {
    if (itemImage && typeof itemImage === 'string' && itemImage.trim() !== '') return itemImage.trim();
    return imagePlaceholderSvg(100, 70);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderHero(item) {
    var url = item.url || '#';
    var src = imageSrc(item.image);
    var timeStr = formatTime(item);
    var newBadge = showNewBadge(item) ? '<span class="badge-new">NEW</span>' : '';
    var commentStr = (item.commentCount != null && item.commentCount > 0) ? 'コメント' + item.commentCount : '';
    var metaParts = [timeStr, newBadge, commentStr].filter(Boolean);
    return (
      '<a href="' + escapeHtml(url) + '">' +
        '<div class="hero-image-wrap">' +
          '<img src="' + escapeHtml(src) + '" alt="" loading="eager" />' +
        '</div>' +
        '<div class="hero-body">' +
          '<h2 class="hero-title">' + escapeHtml(item.title) + '</h2>' +
          '<div class="hero-meta">' + metaParts.join(' ') + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function renderRow(item) {
    var url = item.url || '#';
    var src = imageSrcRow(item.image);
    var timeStr = formatTime(item);
    var metaStr = (item.category || '') + (item.category && timeStr ? ' · ' : '') + timeStr;
    return (
      '<a class="article-row" href="' + escapeHtml(url) + '">' +
        '<div class="row-thumb">' +
          '<img src="' + escapeHtml(src) + '" alt="" loading="lazy" />' +
        '</div>' +
        '<div class="row-body">' +
          '<h3 class="row-title">' + escapeHtml(item.title) + '</h3>' +
          '<div class="row-meta">' + escapeHtml(metaStr) + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function renderPage(tabId) {
    var items = getItemsForTab(tabId);
    var skeleton = document.getElementById('page-skeleton');
    var tabPage = document.getElementById('tab-page');
    var heroCard = document.getElementById('hero-card');
    var articleList = document.getElementById('article-list');

    if (!tabPage || !heroCard || !articleList) return;

    if (skeleton) {
      skeleton.setAttribute('aria-hidden', 'true');
      skeleton.classList.add('hidden');
    }
    tabPage.removeAttribute('hidden');

    if (items.length === 0) {
      heroCard.innerHTML = '';
      articleList.innerHTML = '<p class="empty-message">表示するコンテンツがありません</p>';
      return;
    }

    var hero = items[0];
    var list = items.slice(1);
    heroCard.innerHTML = renderHero(hero);
    heroCard.style.display = '';

    if (list.length > 0) {
      articleList.innerHTML = list.map(renderRow).join('');
    } else {
      articleList.innerHTML = '';
    }
  }

  function setActiveTab(tabId) {
    var tabs = document.querySelectorAll('.category-tabs .tab');
    tabs.forEach(function (tab) {
      var id = tab.getAttribute('data-tab');
      var active = id === tabId;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function switchTab(tabId, replace) {
    var id = TAB_IDS.indexOf(tabId) >= 0 ? tabId : 'top';
    setUrlTab(id, !!replace);
    setActiveTab(id);
    renderPage(id);
  }

  function getCurrentTabIndex() {
    return TAB_IDS.indexOf(getTabFromUrl());
  }

  function goToPrevTab() {
    var i = getCurrentTabIndex();
    if (i <= 0) return;
    switchTab(TAB_IDS[i - 1]);
  }

  function goToNextTab() {
    var i = getCurrentTabIndex();
    if (i >= TAB_IDS.length - 1 || i < 0) return;
    switchTab(TAB_IDS[i + 1]);
  }

  function initSwipe(el) {
    if (!el) return;
    var startX = 0, startY = 0;
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (e.changedTouches.length !== 1) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0) goToPrevTab(); else goToNextTab();
    }, { passive: true });
  }

  function loadFeed(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/feed.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var json = JSON.parse(xhr.responseText);
          feedData = json && Array.isArray(json.items) ? json : { items: json.items || [] };
        } catch (e) {
          feedData = DUMMY_FEED;
        }
      } else {
        feedData = DUMMY_FEED;
      }
      if (callback) callback();
    };
    xhr.send();
  }

  function init() {
    loadFeed(function () {
      var tabId = getTabFromUrl();
      setActiveTab(tabId);
      setUrlTab(tabId, true);
      renderPage(tabId);
    });

    document.querySelectorAll('.category-tabs .tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-tab');
        if (id) switchTab(id);
      });
    });

    window.addEventListener('popstate', function () {
      var tabId = getTabFromUrl();
      setActiveTab(tabId);
      renderPage(tabId);
    });

    var pageContent = document.getElementById('page-content');
    if (pageContent) initSwipe(pageContent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
