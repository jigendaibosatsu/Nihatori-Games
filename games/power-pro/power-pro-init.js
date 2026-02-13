/**
 * Bootstrap: load locales, apply i18n, show title screen, start game on Start
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

  window.i18n.init();
  Promise.all([window.i18n.loadLocale('ja'), window.i18n.loadLocale('en')])
    .then(function () {
      document.title = window.i18n.t('ui.pageTitle');
      updateI18nElements();
      var script = document.createElement('script');
      script.src = 'power-pro.js';
      script.onload = function () {
        updateI18nElements();
        setupTitleScreen();
      };
      document.body.appendChild(script);
    })
    .catch(function (err) {
      console.error('Failed to load locales:', err);
      var script = document.createElement('script');
      script.src = 'power-pro.js';
      document.body.appendChild(script);
    });

  function setupTitleScreen() {
    var titleScreen = document.getElementById('bbTitleScreen');
    var gameScreen = document.getElementById('bbGameScreen');
    var btnStart = document.getElementById('bbBtnStart');
    var langSelect = document.getElementById('bbTitleLangSelect');

    if (!titleScreen || !gameScreen) return;

    if (langSelect && window.i18n) {
      langSelect.value = window.i18n.getLocale();
      langSelect.addEventListener('change', function () {
        window.i18n.setLocale(langSelect.value);
        updateI18nElements();
      });
    }

    if (btnStart) {
      btnStart.addEventListener('click', function () {
        titleScreen.style.display = 'none';
        gameScreen.classList.add('visible');
        if (window.bbInitGame) {
          window.bbInitGame();
        }
      });
    }
  }

  window.bbUpdateI18n = updateI18nElements;
})();
