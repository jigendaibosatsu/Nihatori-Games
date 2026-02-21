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

  function loadNameData() {
    var base = 'data/names/';
    var assetsBase = '/assets/data/names/';
    var files = [
      { key: 'albino', file: 'albino.json' },
      { key: 'black', file: 'black.json' },
      { key: 'nomal', file: 'nomal.json' },
      { key: 'gold', file: 'gold.json' },
      { key: 'marble', file: 'marble.json' },
      { key: 'copper', file: 'copper.json' },
      { key: 'rare', file: 'rare.json' }
    ];
    window.axolotlNameData = { morphs: {}, adultElementsJa: null };
    var loadAdultElements = function () {
      var elemA = fetch(assetsBase + 'element-a-ja.json').then(function (r) { return r.ok ? r.json() : Promise.reject(); });
      var elemB = fetch(base + 'adult-elements-ja.json').then(function (r) { return r.ok ? r.json() : Promise.reject(); });
      return Promise.all([elemA, elemB]).then(function (arr) {
        var a = arr[0], b = arr[1];
        window.axolotlNameData.adultElementsJa = {
          elementA: (a && a.elementA) ? a.elementA : (b && b.elementA) ? b.elementA : null,
          elementBMale: (b && b.elementBMale) ? b.elementBMale : null,
          elementBFemale: (b && b.elementBFemale) ? b.elementBFemale : null
        };
      }).catch(function () {
        return fetch(base + 'adult-elements-ja.json').then(function (r) { return r.json(); }).then(function (data) {
          window.axolotlNameData.adultElementsJa = data;
        });
      });
    };
    return Promise.all([loadAdultElements()].concat(files.map(function (f) {
      return fetch(base + f.file).then(function (r) {
        if (!r.ok) throw new Error('fetch ' + base + f.file);
        return r.json();
      }).then(function (data) {
        window.axolotlNameData.morphs[f.key] = data;
      });
    }))).catch(function (err) {
      console.warn('[names] Failed to load name data, using fallback:', err);
      window.axolotlNameData = window.axolotlNameData || { morphs: {}, adultElementsJa: null };
    });
  }

  window.i18n.init();
  Promise.all([window.i18n.loadLocale('ja'), window.i18n.loadLocale('en'), loadNameData()])
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

  var MUSIC_STORAGE_KEY = 'axolotlShop_musicMuted';
  var VOLUME_STORAGE_KEY = 'axolotlShop_musicVolume';

  function getMusicMuted() {
    try {
      var v = localStorage.getItem(MUSIC_STORAGE_KEY);
      return v === 'true';
    } catch (e) { return false; }
  }

  function getMusicVolume() {
    try {
      var v = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
      return (v >= 0 && v <= 1) ? v : 0.7;
    } catch (e) { return 0.7; }
  }

  function setMusicMuted(muted) {
    try { localStorage.setItem(MUSIC_STORAGE_KEY, String(muted)); } catch (e) {}
  }

  function setMusicVolume(vol) {
    try { localStorage.setItem(VOLUME_STORAGE_KEY, String(vol)); } catch (e) {}
  }

  function applyBgmSettings() {
    var bgm = document.getElementById('axBgm');
    if (!bgm) return;
    var muted = getMusicMuted();
    var vol = getMusicVolume();
    bgm.muted = muted;
    bgm.volume = vol;
  }

  window.axolotlShopApplyBgmSettings = applyBgmSettings;
  window.axolotlShopGetMusicMuted = getMusicMuted;
  window.axolotlShopGetMusicVolume = getMusicVolume;
  window.axolotlShopSetMusicMuted = setMusicMuted;
  window.axolotlShopSetMusicVolume = setMusicVolume;

  function setupTitleScreen() {
    var titleScreen = document.getElementById('axTitleScreen');
    var gameRoot = document.getElementById('axGameRoot');
    var btnNew = document.getElementById('axBtnNewGame');
    var btnContinue = document.getElementById('axBtnContinue');
    var mascotContainer = document.getElementById('axTitleMascot');
    var langSelect = document.getElementById('axTitleLangSelect');
    var musicMutedCheck = document.getElementById('axTitleMusicMuted');
    var musicVolumeSlider = document.getElementById('axTitleMusicVolume');
    var musicVolumeValue = document.getElementById('axTitleMusicVolumeValue');

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

    // タイトル画面の音楽設定
    if (musicMutedCheck) {
      musicMutedCheck.checked = getMusicMuted();
      musicMutedCheck.addEventListener('change', function () {
        setMusicMuted(this.checked);
        applyBgmSettings();
      });
    }
    if (musicVolumeSlider && musicVolumeValue) {
      var volPct = Math.round(getMusicVolume() * 100);
      musicVolumeSlider.value = volPct;
      musicVolumeValue.textContent = volPct;
      musicVolumeSlider.addEventListener('input', function () {
        var v = parseInt(this.value, 10) / 100;
        setMusicVolume(v);
        musicVolumeValue.textContent = this.value;
        applyBgmSettings();
      });
    }

    function startAndHide(isNew) {
      if (!window.axolotlShopStartGame(isNew)) return;
      titleScreen.style.display = 'none';
      gameRoot.style.display = '';
      var bgm = document.getElementById('axBgm');
      if (bgm) {
        applyBgmSettings();
        bgm.loop = true;
        bgm.play().catch(function () { /* autoplay may be blocked */ });
      }
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
