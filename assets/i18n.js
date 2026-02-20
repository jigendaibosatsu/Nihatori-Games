/**
 * Nihatori Games – i18n for main site
 * Supports: en, ja, es, da, zh-classical
 * Usage: data-i18n="key.path", data-i18n-placeholder="key", data-i18n-aria="key"
 * Programmatic: window.t('key.path') or window.t('key.path', { n: 5 })
 */
(function () {
  'use strict';

  var SUPPORTED = ['en', 'ja', 'es', 'da', 'zh-classical'];
  var DEFAULT_LANG = 'ja';
  var STORAGE_KEY = 'nihatori-lang';
  var LANG_PARAM = 'lang';

  var currentLang = DEFAULT_LANG;
  var messages = {};

  function getStoredLang() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s && SUPPORTED.indexOf(s) >= 0) return s;
    } catch (e) { /* ignore */ }
    return null;
  }

  function getUrlLang() {
    var params = new URLSearchParams(window.location.search);
    var lang = params.get(LANG_PARAM);
    return lang && SUPPORTED.indexOf(lang) >= 0 ? lang : null;
  }

  function getBrowserLang() {
    var nav = navigator;
    var lang = (nav.language || nav.userLanguage || '').toLowerCase();
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('da')) return 'da';
    if (lang.startsWith('zh')) return 'zh-classical';
    return 'en';
  }

  function resolveLang() {
    return getUrlLang() || getStoredLang() || getBrowserLang();
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) < 0) lang = DEFAULT_LANG;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { /* ignore */ }
    document.documentElement.lang = lang === 'zh-classical' ? 'zh-Hant' : lang;
  }

  function getNested(obj, path) {
    var parts = path.split('.');
    for (var i = 0; i < parts.length && obj != null; i++) {
      obj = obj[parts[i]];
    }
    return obj;
  }

  function interpolate(str, vars) {
    if (!str || !vars) return str;
    return str.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return vars[key] != null ? String(vars[key]) : '{{' + key + '}}';
    });
  }

  function t(key, vars) {
    var val = getNested(messages, key);
    if (val == null) return key;
    return interpolate(val, vars || {});
  }

  // ロケールJSONのベースパスを、スクリプト位置から推測する
  var LOCALE_BASE = (function () {
    try {
      if (document.currentScript && document.currentScript.src) {
        var url = new URL(document.currentScript.src);
        // /assets/i18n.js → /locales/
        url.pathname = url.pathname.replace(/\/assets\/[^/]*$/, '/locales/');
        return url.origin + url.pathname.replace(/\/$/, '') + '/';
      }
    } catch (e) {
      // ignore and fall back
    }
    // フォールバック: ドメイン直下
    return window.location.origin + '/locales/';
  })();

  function loadLocale(lang) {
    return fetch(LOCALE_BASE + lang + '.json')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error(res.status)); });
  }

  function applyToDom() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key) {
        var val = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = val;
        } else if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (key) el.title = t(key);
    });
    document.querySelectorAll('[data-i18n-content]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-content');
      if (key) el.setAttribute('content', t(key));
    });
  }

  function updateMeta(lang) {
    var articleSlug = document.documentElement.getAttribute('data-i18n-article');
    var pageTitleKey = document.documentElement.getAttribute('data-i18n-page-title');
    var title, desc;
    if (articleSlug) {
      title = t('articles.' + articleSlug + '.title');
      var artDesc = t('articles.' + articleSlug + '.description');
      desc = (artDesc && artDesc.indexOf('articles.') !== 0) ? artDesc : t('site.description');
    } else {
      title = pageTitleKey ? t(pageTitleKey) : t('site.title');
      var descKey = document.documentElement.getAttribute('data-i18n-desc');
      desc = descKey ? t(descKey) : t('site.description');
    }
    var ogDesc = t('site.ogDescription');
    if (document.title !== title) document.title = title;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    var metaOgDesc = document.querySelector('meta[property="og:description"]');
    if (metaOgDesc) metaOgDesc.setAttribute('content', ogDesc);
    var metaTwDesc = document.querySelector('meta[name="twitter:description"]');
    if (metaTwDesc) metaTwDesc.setAttribute('content', ogDesc);
    var metaOgTitle = document.querySelector('meta[property="og:title"]');
    if (metaOgTitle) metaOgTitle.setAttribute('content', title);
    var metaTwTitle = document.querySelector('meta[name="twitter:title"]');
    if (metaTwTitle) metaTwTitle.setAttribute('content', title);
    var schema = document.querySelector('script[type="application/ld+json"]');
    if (schema) {
      try {
        var data = JSON.parse(schema.textContent);
        data.description = t('site.schemaDescription');
        data.inLanguage = lang === 'zh-classical' ? 'zh-Hant' : lang;
        schema.textContent = JSON.stringify(data);
      } catch (e) { /* ignore */ }
    }
  }

  var LANG_SHORT = { en: 'EN', ja: 'JA', es: 'ES', da: 'DA', 'zh-classical': 'ZH' };

  function renderLangSwitcher(container) {
    if (!container) return;
    var currentLabel = t('lang.' + currentLang);
    var shortLabel = LANG_SHORT[currentLang] || currentLang.toUpperCase().slice(0, 2);
    var ariaLabel = interpolate(t('header.ariaLang') || 'Language', { lang: currentLabel });
    var html =
      '<div class="lang-switcher">' +
        '<button type="button" class="btn-icon lang-btn" aria-label="' + ariaLabel.replace(/"/g, '&quot;') + '" aria-expanded="false" aria-haspopup="true" title="' + currentLabel.replace(/"/g, '&quot;') + '">' +
          '<span class="lang-btn-text">🌐 ' + shortLabel + '</span>' +
        '</button>' +
        '<div class="lang-dropdown" role="menu" aria-label="Language">';
    SUPPORTED.forEach(function (code) {
      var label = t('lang.' + code);
      var active = code === currentLang ? ' lang-active' : '';
      html += '<button type="button" class="lang-option' + active + '" data-lang="' + code + '" role="menuitem">' + label + '</button>';
    });
    html += '</div></div>';
    container.innerHTML = html;

    var btn = container.querySelector('.lang-btn');
    var dropdown = container.querySelector('.lang-dropdown');

    function closeDropdown() {
      dropdown.classList.remove('lang-dropdown-open');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', outsideClick);
    }

    function outsideClick(e) {
      if (!container.contains(e.target)) closeDropdown();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.toggle('lang-dropdown-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        setTimeout(function () { document.addEventListener('click', outsideClick); }, 0);
      } else {
        document.removeEventListener('click', outsideClick);
      }
    });

    container.querySelectorAll('.lang-option').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        var code = opt.getAttribute('data-lang');
        if (code === currentLang) { closeDropdown(); return; }
        setLang(code);
        loadLocale(currentLang).then(function (m) {
          messages = m;
          applyToDom();
          updateMeta(currentLang);
          renderLangSwitcher(container);
          if (typeof window.onLangChange === 'function') {
            window.onLangChange(currentLang);
          }
          if (typeof window.refreshMobileDrawer === 'function') {
            window.refreshMobileDrawer();
          }
        });
        closeDropdown();
      });
    });
  }

  function init() {
    currentLang = resolveLang();
    setLang(currentLang);
    return loadLocale(currentLang)
      .then(function (m) {
        messages = m;
        applyToDom();
        updateMeta(currentLang);
        var switcher = document.getElementById('lang-switcher') || document.querySelector('[data-lang-switcher]');
        if (switcher) renderLangSwitcher(switcher);
        return currentLang;
      })
      .catch(function () {
        messages = {};
        return currentLang;
      });
  }

  window.t = t;
  window.nihatoriI18n = {
    lang: function () { return currentLang; },
    setLang: setLang,
    apply: applyToDom,
    renderSwitcher: renderLangSwitcher,
    init: init
  };
  window.nihatoriI18nReady = null;

  function runInit() {
    window.nihatoriI18nReady = init().then(function () {
      if (typeof window.onLangChange === 'function') {
        window.onLangChange(currentLang);
      }
      if (typeof window.refreshMobileDrawer === 'function') {
        window.refreshMobileDrawer();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    runInit();
  }
})();
