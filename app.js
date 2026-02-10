/**
 * Nihatori Games – トップページ
 * タブ切替（URL ?tab= と pushState）、ヒーロー＋記事リスト、data/feed.json
 */

(function () {
  'use strict';

  var TAB_IDS = ['top', 'games', 'favorites', 'hobby', 'posts', 'trending', 'recommended', 'updates', 'random', 'sns'];
  var TAB_PARAM = 'tab';
  var SEARCH_PARAM = 'q';
  var currentSearchQuery = '';
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

  var FAVORITES_KEY = 'nihatori-favorites-v1';

  function loadFavorites() {
    try {
      var raw = window.localStorage.getItem(FAVORITES_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveFavorites(map) {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(map || {}));
    } catch (e) {
      // ignore
    }
  }

  function recordClick(id) {
    if (!id) return;
    var fav = loadFavorites();
    var entry = fav[id] || { favorite: false, clicks: 0, lastPlayedAt: 0 };
    entry.clicks = (entry.clicks || 0) + 1;
    entry.lastPlayedAt = Date.now();
    fav[id] = entry;
    saveFavorites(fav);
  }

  function toggleFavorite(id) {
    if (!id) return;
    var fav = loadFavorites();
    var entry = fav[id] || { favorite: false, clicks: 0, lastPlayedAt: 0 };
    entry.favorite = !entry.favorite;
    if (!entry.favorite && !entry.clicks && !entry.lastPlayedAt) {
      delete fav[id];
    } else {
      fav[id] = entry;
    }
    saveFavorites(fav);
  }

  var PAGE_PARAM = 'page';

  function getSearchFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get(SEARCH_PARAM) || '';
  }

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
    if (currentSearchQuery && currentSearchQuery.trim() !== '') {
      url.searchParams.set(SEARCH_PARAM, currentSearchQuery.trim());
    } else {
      url.searchParams.delete(SEARCH_PARAM);
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
  var TAG_ORDER = { 'アップデート': 3, '更新': 2, '新作': 1 };
  function tagRank(item) {
    if (item.tag && TAG_ORDER[item.tag]) return TAG_ORDER[item.tag];
    return item.updating ? 2 : item.isNew ? 1 : 0;
  }
  function byNewsOrder(a, b) {
    var ra = tagRank(a);
    var rb = tagRank(b);
    if (rb !== ra) return rb - ra;
    return byPublishedAt(a, b);
  }
  function byTrendingScore(a, b) {
    return (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
  }

  function matchesSearch(item, q) {
    if (!q) return true;
    q = q.toLowerCase();
    if (item.title && item.title.toLowerCase().indexOf(q) >= 0) return true;
    if (item.category && item.category.toLowerCase().indexOf(q) >= 0) return true;
    if (item.tag && String(item.tag).toLowerCase().indexOf(q) >= 0) return true;
    return false;
  }

  function applySearchFilter(list) {
    if (!currentSearchQuery) return list;
    var q = currentSearchQuery;
    return list.filter(function (i) { return matchesSearch(i, q); });
  }

  function getItemsForTab(tabId) {
    var items = feedData.items || [];
    var sortFn = byNewsOrder;
    switch (tabId) {
      case 'games':
        return applySearchFilter(items.filter(function (i) { return i.type === 'game'; }).sort(sortFn));
      case 'hobby':
        return applySearchFilter(items.filter(function (i) { return i.category === 'hobby'; }).sort(sortFn));
      case 'posts':
        return applySearchFilter(items.filter(function (i) { return i.type === 'post'; }).sort(sortFn));
      case 'trending':
        return applySearchFilter(items.slice().sort(byTrendingScore));
      case 'recommended':
        return applySearchFilter(items.filter(function (i) { return i.recommended === true; }).sort(sortFn));
      case 'updates':
        return applySearchFilter(
          items
            .filter(function (i) { return i.tag === '更新' || i.updating === true; })
            .sort(byPublishedAt)
        );
      case 'random': {
        var pool = items.filter(function (i) { return !hasImage(i); });
        var shuffled = pool.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
        }
        return applySearchFilter(shuffled.slice(0, 20));
      }
      case 'favorites': {
        var fav = loadFavorites();
        var ids = Object.keys(fav).filter(function (id) { return fav[id] && fav[id].favorite; });
        return applySearchFilter(items
          .filter(function (i) { return ids.indexOf(i.id) >= 0; })
          .sort(byNewsOrder));
      }
      case 'top':
      default:
        return applySearchFilter(items.slice().sort(sortFn));
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

  function hasImage(item) {
    return item && item.image && typeof item.image === 'string' && item.image.trim() !== '';
  }

  function imageSrc(itemImage, itemId) {
    if (itemImage && typeof itemImage === 'string' && itemImage.trim() !== '') return itemImage.trim();
    return getRandomAxolotlThumb(itemId) || imagePlaceholderSvg(400, 225);
  }

  function imageSrcRow(itemImage, itemId) {
    if (itemImage && typeof itemImage === 'string' && itemImage.trim() !== '') return itemImage.trim();
    return getRandomAxolotlThumb(itemId) || imagePlaceholderSvg(100, 70);
  }

  function formatHeadline(item) {
    if (item.type !== 'game') return item.title || '';
    var tag = item.tag || (item.updating ? '更新' : item.isNew ? '新作' : null);
    if (tag) return '[' + tag + '] ' + (item.title || '');
    return item.title || '';
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
    var noImg = !hasImage(item);
    var thumbClass = noImg ? ' hero-thumb-placeholder' : '';
    var prepOverlay = noImg ? '<span class="thumb-prep-text">画像準備中</span>' : '';
    var timeStr = formatTime(item);
    var updatingBadge = item.updating === true ? '<span class="badge-updating">更新中</span>' : '';
    var newBadge = showNewBadge(item) ? '<span class="badge-new">NEW</span>' : '';
    var commentStr = (item.commentCount != null && item.commentCount > 0) ? 'コメント' + item.commentCount : '';
    var metaParts = [timeStr, updatingBadge, newBadge, commentStr].filter(Boolean);
    var fav = loadFavorites();
    var favEntry = item.id ? fav[item.id] : null;
    var isFav = !!(favEntry && favEntry.favorite);
    var favMark = item.id
      ? '<span class="fav-toggle' + (isFav ? ' is-fav' : '') + '" data-id="' + escapeHtml(item.id) + '" aria-label="お気に入り"> ' + (isFav ? '★' : '☆') + '</span>'
      : '';
    return (
      '<a href="' + escapeHtml(url) + '" class="hero-link" data-id="' + escapeHtml(item.id || '') + '">' +
        '<div class="hero-image-wrap' + thumbClass + '">' +
          '<img src="' + escapeHtml(src) + '" alt="" loading="eager" />' +
          prepOverlay +
        '</div>' +
        '<div class="hero-body">' +
          '<h2 class="hero-title hero-title-news">' + favMark + escapeHtml(formatHeadline(item)) + '</h2>' +
          '<div class="hero-meta">' + metaParts.join(' ') + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function renderRow(item) {
    var url = item.url || '#';
    var src = imageSrcRow(item.image, item.id);
    var noImg = !hasImage(item);
    var thumbClass = noImg ? ' row-thumb-placeholder' : '';
    var prepOverlay = noImg ? '<span class="thumb-prep-text">画像準備中</span>' : '';
    var timeStr = formatTime(item);
    var updatingBadge = item.updating === true ? '<span class="badge-updating">更新中</span> ' : '';
    var metaStr = updatingBadge + (item.category || '') + (item.category && timeStr ? ' · ' : '') + timeStr;
    var fav = loadFavorites();
    var favEntry = item.id ? fav[item.id] : null;
    var isFav = !!(favEntry && favEntry.favorite);
    var favMark = item.id
      ? '<span class="fav-toggle' + (isFav ? ' is-fav' : '') + '" data-id="' + escapeHtml(item.id) + '" aria-label="お気に入り"> ' + (isFav ? '★' : '☆') + '</span>'
      : '';
    return (
      '<a class="article-row" href="' + escapeHtml(url) + '" data-id="' + escapeHtml(item.id || '') + '">' +
        '<div class="row-thumb' + thumbClass + '">' +
          '<img src="' + escapeHtml(src) + '" alt="" loading="lazy" />' +
          prepOverlay +
        '</div>' +
        '<div class="row-body">' +
          '<h3 class="row-title row-title-news">' + favMark + escapeHtml(formatHeadline(item)) + '</h3>' +
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

  function renderSnsPage() {
    var skeleton = document.getElementById('page-skeleton');
    var tabPage = document.getElementById('tab-page');
    var heroCard = document.getElementById('hero-card');
    var articleList = document.getElementById('article-list');
    var paginationEl = document.getElementById('pagination');
    if (!tabPage || !heroCard || !articleList) return;

    if (skeleton) {
      skeleton.setAttribute('aria-hidden', 'true');
      skeleton.classList.add('hidden');
    }
    tabPage.removeAttribute('hidden');

    heroCard.innerHTML =
      '<article class="hero-card">' +
        '<div class="hero-body">' +
          '<h2 class="hero-title">SNS</h2>' +
          '<div class="hero-meta">最新情報や日々の制作ログはSNSでも発信中です。</div>' +
          '<div class="sns-links">' +
            '<a href="https://x.com/Nihatori_Zeroh" target="_blank" rel="noopener" class="sns-link">X (Twitter)</a>' +
            '<a href="https://www.instagram.com/nihatori_zeroh/" target="_blank" rel="noopener" class="sns-link">Instagram</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    heroCard.style.display = '';
    articleList.innerHTML = '';
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.style.display = 'none';
    }
  }

  function attachFeedInteractions() {
    // 記事クリックで「よく遊ぶ」情報を記録
    document.querySelectorAll('.hero-link[data-id], .article-row[data-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-id');
        if (id) recordClick(id);
      });
    });

    // お気に入りトグル
    document.querySelectorAll('.fav-toggle[data-id]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var id = el.getAttribute('data-id');
        if (!id) return;
        toggleFavorite(id);
        var currentTab = getTabFromUrl();
        setActiveTab(currentTab);
        renderPage(currentTab);
      });
    });
  }

  function renderPage(tabId) {
    if (tabId === 'sns') {
      renderSnsPage();
      return;
    }

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
    attachFeedInteractions();
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
      currentSearchQuery = getSearchFromUrl();
      var searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = currentSearchQuery;
      }
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

    var searchInput = document.getElementById('search-input');
    var searchButton = document.getElementById('search-button');
    var searchClear = document.getElementById('search-clear');

    function applySearch(replace) {
      currentSearchQuery = searchInput ? searchInput.value.trim() : '';
      var tabId = getTabFromUrl();
      setUrlTab(tabId, !!replace, 1);
      setActiveTab(tabId);
      renderPage(tabId);
    }

    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          applySearch(false);
        }
      });
    }
    if (searchButton) {
      searchButton.addEventListener('click', function () {
        applySearch(false);
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        currentSearchQuery = '';
        var tabId = getTabFromUrl();
        setUrlTab(tabId, false, 1);
        setActiveTab(tabId);
        renderPage(tabId);
      });
    }

    window.addEventListener('popstate', function () {
      var tabId = getTabFromUrl();
      currentSearchQuery = getSearchFromUrl();
      var searchInputEl = document.getElementById('search-input');
      if (searchInputEl) {
        searchInputEl.value = currentSearchQuery;
      }
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
