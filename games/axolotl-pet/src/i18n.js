/**
 * Minimal i18n system for Upa Lupa Pet Game
 * Fallback chain: current locale -> en -> ja
 */

(function (global) {
  'use strict';

  var LOCALE_KEY = 'locale';
  var DEFAULT_LOCALE = 'ja';
  var SUPPORTED_LOCALES = ['ja', 'en'];
  var messages = {};
  var currentLocale = DEFAULT_LOCALE;

  function loadLocale(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) return null;
    if (messages[locale]) return messages[locale];
    // Locales are loaded via fetch in init()
    return null;
  }

  function getNested(obj, key) {
    var parts = key.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length && cur != null; i++) {
      cur = cur[parts[i]];
    }
    return cur;
  }

  /**
   * Translate a key. Supports dotted keys (e.g. "ui.title").
   * @param {string} key - Translation key
   * @param {Object} [params] - Optional parameters for interpolation (e.g. { name: "World" })
   * @returns {string} Translated string or key if not found
   */
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

  function init() {
    try {
      var stored = localStorage.getItem(LOCALE_KEY);
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        currentLocale = stored;
      }
    } catch (e) {}
  }

  // Export
  global.i18n = {
    t: t,
    setLocale: setLocale,
    getLocale: getLocale,
    init: init,
    loadLocale: loadLocale,
    registerMessages: function (locale, data) {
      messages[locale] = data;
    },
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
})(typeof window !== 'undefined' ? window : this);
