/**
 * Main entry point for Upa Lupa Pet Game
 */

(function () {
  'use strict';

  function loadLocale(locale) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'locales/' + locale + '.json', true);
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error('Failed to load locale: ' + locale));
        }
      };
      xhr.onerror = reject;
      xhr.send();
    });
  }

  function init() {
    window.i18n.init();
    Promise.all([loadLocale('ja'), loadLocale('en')])
      .then(function (results) {
        window.i18n.registerMessages('ja', results[0]);
        window.i18n.registerMessages('en', results[1]);
      })
      .catch(function (err) {
        console.error('Failed to load locales:', err);
      })
      .then(function () {
        if (window.i18n && window.i18n.t) {
          document.title = window.i18n.t('ui.pageTitle');
        }
        window.state.setScreen('title');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
