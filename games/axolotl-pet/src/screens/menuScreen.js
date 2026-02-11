/**
 * Menu screen - language selector, back button
 */

(function (global) {
  'use strict';

  var container = null;

  function render() {
    if (!container) return;
    container.innerHTML = '';
    container.className = 'screen screen-menu';

    var heading = document.createElement('h2');
    heading.className = 'menu-heading';
    heading.textContent = global.i18n.t('ui.menu');
    container.appendChild(heading);

    var langEl = global.langSelector && global.langSelector.create
      ? global.langSelector.create({ onLocaleChange: function () { global.state.refreshScreen(); } })
      : null;
    if (langEl) container.appendChild(langEl);

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = global.i18n.t('ui.deleteSave');
    deleteBtn.addEventListener('click', function () {
      if (confirm(global.i18n.t('ui.deleteSaveConfirm'))) {
        global.state.clearSave();
        global.state.setScreen('title');
      }
    });
    container.appendChild(deleteBtn);

    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-primary';
    backBtn.textContent = global.i18n.t('ui.back');
    backBtn.addEventListener('click', function () {
      global.state.setScreen('title');
    });
    container.appendChild(backBtn);
  }

  function show() {
    if (!container) {
      container = document.getElementById('app');
      if (!container) return;
    }
    render();
  }

  global.state.registerScreen('menu', { show: show });
})(typeof window !== 'undefined' ? window : this);
