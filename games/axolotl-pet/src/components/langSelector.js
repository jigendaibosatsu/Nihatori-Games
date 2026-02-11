/**
 * Shared language selector component
 * Used in titleScreen and menuScreen.
 * Keyboard accessible, persists to localStorage, triggers re-render on change.
 */

(function (global) {
  'use strict';

  /**
   * Creates a language selector element.
   * @param {Object} opts
   * @param {function} opts.onLocaleChange - Called after setLocale; use to re-render the current screen
   * @returns {HTMLElement} Wrapper element containing label + select
   */
  function createLangSelector(opts) {
    var onLocaleChange = (opts && opts.onLocaleChange) || function () {};

    var wrapper = document.createElement('div');
    wrapper.className = 'lang-selector';

    var label = document.createElement('label');
    label.className = 'lang-label';
    label.textContent = global.i18n.t('ui.languageLabel');

    var select = document.createElement('select');
    select.className = 'lang-select';
    select.id = 'lang-select-' + Math.random().toString(36).slice(2, 9);
    select.setAttribute('aria-label', global.i18n.t('ui.language'));

    label.setAttribute('for', select.id);

    var optJa = document.createElement('option');
    optJa.value = 'ja';
    optJa.textContent = global.i18n.t('ui.langJa');
    var optEn = document.createElement('option');
    optEn.value = 'en';
    optEn.textContent = global.i18n.t('ui.langEn');
    select.appendChild(optJa);
    select.appendChild(optEn);
    select.value = global.i18n.getLocale();

    select.addEventListener('change', function () {
      var locale = select.value;
      global.i18n.setLocale(locale);
      onLocaleChange();
    });

    label.appendChild(select);
    wrapper.appendChild(label);

    return wrapper;
  }

  global.langSelector = {
    create: createLangSelector
  };
})(typeof window !== 'undefined' ? window : this);
