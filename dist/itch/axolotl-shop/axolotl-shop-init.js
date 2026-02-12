/**
 * Bootstrap: load locales, then run axolotl-shop
 */
(function () {
  'use strict';

  function updateI18nElements() {
    if (!window.i18n || !window.i18n.t) return;
    var list = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var key = el.getAttribute('data-i18n');
      if (key) {
        var place = el.getAttribute('data-i18n-place');
        if (place === 'placeholder') {
          el.placeholder = window.i18n.t(key);
        } else if (place === 'title') {
          el.title = window.i18n.t(key);
        } else if (place === 'aria-label') {
          el.setAttribute('aria-label', window.i18n.t(key));
        } else {
          // #region agent log
          if (el.id === 'axShopTitle') {
            fetch('http://127.0.0.1:7242/ingest/f97df107-e146-4319-9c02-91a03f8f0073',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'axolotl-shop-init.js:updateI18nElements',message:'i18n overwriting axShopTitle',data:{key:key,newText:window.i18n.t(key)},hypothesisId:'A',timestamp:Date.now()})}).catch(function(){});
          }
          // #endregion
          el.textContent = window.i18n.t(key);
        }
      }
      var titleKey = el.getAttribute('data-i18n-title');
      if (titleKey) {
        el.title = window.i18n.t(titleKey);
      }
    }
    if (document.title !== undefined) {
      document.title = window.i18n.t('ui.pageTitle');
    }
  }

  function runI18nDevCheck() {
    var isDev = /^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(location.hostname) || /[?&]i18ncheck=1/.test(location.search);
    if (!isDev || !window.i18n || !window.i18n.t) return;
    var sampleKeys = ['ui.newGame', 'ui.continue', 'ui.pageTitle', 'ui.shopTitle', 'game.defaultShopName', 'type.nomal', 'sizeBand.0', 'feed.artificial'];
    var missing = [];
    for (var i = 0; i < sampleKeys.length; i++) {
      var v = window.i18n.t(sampleKeys[i]);
      if (!v || v === sampleKeys[i]) missing.push(sampleKeys[i]);
    }
    if (missing.length > 0) {
      console.warn('[i18n DEV] Possibly missing keys (use ?i18ncheck=1 to enable):', missing);
    }
  }

  window.i18n.init();
  Promise.all([window.i18n.loadLocale('ja'), window.i18n.loadLocale('en')])
    .then(function () {
      document.title = window.i18n.t('ui.pageTitle');
      runI18nDevCheck();
      var script = document.createElement('script');
      script.src = 'axolotl-shop.js?v=' + (window.axolotlShopScriptVersion || Date.now());
      script.onload = function () {
        if (window.axolotlShopReady) {
          window.axolotlShopReady();
        }
        updateI18nElements();
        setupTitleScreen();
      };
      document.body.appendChild(script);
    })
    .catch(function (err) {
      console.error('Failed to load locales:', err);
      var script = document.createElement('script');
      script.src = 'axolotl-shop.js?v=' + (window.axolotlShopScriptVersion || Date.now());
      document.body.appendChild(script);
    });

  function setupTitleScreen() {
    var titleScreen = document.getElementById('axTitleScreen');
    var gameRoot = document.getElementById('axGameRoot');
    var btnNew = document.getElementById('axBtnNewGame');
    var btnContinue = document.getElementById('axBtnContinue');
    var mascotContainer = document.getElementById('axTitleMascot');
    var langSelect = document.getElementById('axTitleLangSelect');

    if (!titleScreen || !gameRoot) return;

    // マスコット作成（ランダムなウーパー画像 + 跳ねアニメ）
    if (window.axTitleMascot && mascotContainer) {
      window.axTitleMascot.create(mascotContainer);
    }

    // つづきから：セーブが無いときは無効化
    if (btnContinue) {
      btnContinue.disabled = !window.axolotlShopHasSave();
    }

    // 言語選択をi18nと同期
    if (langSelect && window.i18n) {
      langSelect.value = window.i18n.getLocale();
      langSelect.addEventListener('change', function () {
        window.i18n.setLocale(langSelect.value);
        updateI18nElements();
      });
    }

    function startAndHide(isNew) {
      if (!window.axolotlShopStartGame(isNew)) return;
      titleScreen.style.display = 'none';
      gameRoot.style.display = '';
    }

    if (btnNew) {
      btnNew.addEventListener('click', function () { startAndHide(true); });
    }
    if (btnContinue) {
      btnContinue.addEventListener('click', function () {
        if (btnContinue.disabled) return;
        startAndHide(false);
      });
    }
  }

  window.axolotlShopI18n = {
    update: updateI18nElements
  };
})();
