/**
 * Minimal i18n for axolotl-shop
 * Fallback: current locale -> en -> ja -> return key string
 */
(function (global) {
  'use strict';

  var LOCALE_KEY = 'locale';
  var DEFAULT_LOCALE = 'ja';
  var SUPPORTED_LOCALES = ['ja', 'en'];
  var messages = {};
  var currentLocale = DEFAULT_LOCALE;

  function getNested(obj, key) {
    var parts = key.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length && cur != null; i++) {
      cur = cur[parts[i]];
    }
    return cur;
  }

  function t(key, params) {
    var fallbackOrder = [currentLocale, 'en', 'ja'];
    var str = null;
    for (var i = 0; i < fallbackOrder.length; i++) {
      var locale = fallbackOrder[i];
      var localeMessages = messages[locale];
      if (localeMessages) {
        str = getNested(localeMessages, key);
        if (str != null) break;
      }
    }
    if (str == null) return key;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (k) {
        str = String(str).replace(new RegExp('\\{\\{\\s*' + k + '\\s*\\}\\}', 'g'), params[k]);
      });
    }
    return str;
  }

  function setLocale(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) return;
    currentLocale = locale;
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch (e) {}
  }

  function getLocale() {
    return currentLocale;
  }

  function loadLocale(locale) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'locales/' + locale + '.json', true);
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            var data = JSON.parse(xhr.responseText);
            messages[locale] = data;
            resolve(data);
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
    try {
      var stored = localStorage.getItem(LOCALE_KEY);
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        currentLocale = stored;
      }
    } catch (e) {}
  }

  global.i18n = {
    t: t,
    setLocale: setLocale,
    getLocale: getLocale,
    loadLocale: loadLocale,
    init: init,
    registerMessages: function (locale, data) {
      messages[locale] = data;
    },
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
})(typeof window !== 'undefined' ? window : this);
