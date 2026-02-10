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

  var ITEMS_PER_PAGE = 20;
  var AXOLOTL_THUMBS = [
    '/assets/characters/axolotl/axo_nomal.png',
    '/assets/characters/axolotl/axo_albino.png',
    '/assets/characters/axolotl/axo_gold.png',
    '/assets/characters/axolotl/axo_marble.png',
    '/assets/characters/axolotl/axo_copper.png',
    '/assets/characters/axolotl/axo_black.png',
    '/assets/characters/axolotl/axo_superblack.png',
    '/assets/characters/axolotl/axo_yellow.png',
    '/assets/characters/axolotl/axo_dalmatian.png',
    '/assets/characters/axolotl/axo_chimera.png'
  ];
  var DUMMY_FEED = {
    items: [
      { id: 'baba-nuki', type: 'game', title: 'ババ抜き', url: './games/baba-nuki/', image: null, category: 'games', publishedAt: '2026-01-31T10:00:00+09:00', commentCount: 0, isNew: true, recommended: true, trendingScore: 90 },
      { id: 'post-roadmap', type: 'post', title: '開発ロードマップ公開', url: '/roadmap.html', image: null, category: 'devlog', publishedAt: '2026-01-30T14:00:00+09:00', commentCount: 2, isNew: false, recommended: true, trendingScore: 70 },
      { id: 'post-site-open', type: 'post', title: 'サイトオープンのお知らせ', url: './blog/2026-01-29-site-open.html', image: null, category: 'devlog', publishedAt: '2026-01-29T09:00:00+09:00', commentCount: 0, isNew: false, recommended: true, trendingScore: 60 },
    ],
  };

  var feedData = { items: [] };

  var PAGE_PARAM = 'page';

  function getTabFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var tab = params.get(TAB_PARAM) || 'top';
    return TAB_IDS.indexOf(tab) >= 0 ? tab : 'top';
  }

  function getPageFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var p = parseInt(params.get(PAGE_PARAM), 10);
    return (p > 0 && !isNaN(p)) ? p : 1;
  }

  function setUrlTab(tabId, replace, page) {
    var url = new URL(window.location.href);
    url.searchParams.set(TAB_PARAM, tabId);
    if (page != null && page > 1) {
      url.searchParams.set(PAGE_PARAM, String(page));
    } else {
      url.searchParams.delete(PAGE_PARAM);
    }
    var target = url.pathname + '?' + url.searchParams.toString();
    if (replace) {
      window.history.replaceState({ tab: tabId, page: page }, '', target);
    } else {
      window.history.pushState({ tab: tabId, page: page }, '', target);
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

  function getRandomAxolotlThumb(id) {
    var h = 0;
    var s = (id || '') + '';
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    var idx = Math.abs(h) % AXOLOTL_THUMBS.length;
    return AXOLOTL_THUMBS[idx];
  }

  function imageSrc(itemImage, itemId) {
    if (itemImage && typeof itemImage === 'string' && itemImage.trim() !== '') return itemImage.trim();
    return getRandomAxolotlThumb(itemId) || imagePlaceholderSvg(400, 225);
  }

  function imageSrcRow(itemImage, itemId) {
    if (itemImage && typeof itemImage === 'string' && itemImage.trim() !== '') return itemImage.trim();
    return getRandomAxolotlThumb(itemId) || imagePlaceholderSvg(100, 70);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderHero(item) {
    var url = item.url || '#';
    var src = imageSrc(item.image, item.id);
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
    var src = imageSrcRow(item.image, item.id);
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

  function renderPagination(totalItems, currentPage, tabId) {
    var paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;
    var totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      paginationEl.style.display = 'none';
      return;
    }
    paginationEl.style.display = 'flex';
    var html = '';
    if (currentPage > 1) {
      html += '<button type="button" class="pagination-btn" data-page="' + (currentPage - 1) + '" aria-label="前のページ">‹ 前へ</button>';
    }
    html += '<span class="pagination-info">' + currentPage + ' / ' + totalPages + '</span>';
    if (currentPage < totalPages) {
      html += '<button type="button" class="pagination-btn" data-page="' + (currentPage + 1) + '" aria-label="次のページ">次へ ›</button>';
    }
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll('.pagination-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(p) && p >= 1) {
          setUrlTab(tabId, false, p);
          setActiveTab(tabId);
          renderPage(tabId);
          window.scrollTo(0, 0);
        }
      });
    });
  }

  function renderPage(tabId) {
    var items = getItemsForTab(tabId);
    var currentPage = getPageFromUrl();
    var totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    var startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    var pageItems = items.slice(startIdx, startIdx + ITEMS_PER_PAGE);

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
      heroCard.style.display = 'none';
      articleList.innerHTML = '<p class="empty-message">表示するコンテンツがありません</p>';
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    if (currentPage === 1 && pageItems.length > 0) {
      var hero = pageItems[0];
      var list = pageItems.slice(1);
      heroCard.innerHTML = renderHero(hero);
      heroCard.style.display = '';
      articleList.innerHTML = list.length > 0 ? list.map(renderRow).join('') : '';
    } else {
      heroCard.innerHTML = '';
      heroCard.style.display = 'none';
      articleList.innerHTML = pageItems.map(renderRow).join('');
    }
    renderPagination(items.length, currentPage, tabId);
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
    setUrlTab(id, !!replace, 1);
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
      var page = getPageFromUrl();
      setActiveTab(tabId);
      setUrlTab(tabId, true, page);
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
