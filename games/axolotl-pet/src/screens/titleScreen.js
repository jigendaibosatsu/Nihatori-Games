/**
 * Title screen - New Game, Continue, language selector
 */

(function (global) {
  'use strict';

  var container = null;

  var mascotWrapper = null;

  function render() {
    if (!container) return;
    if (mascotWrapper && mascotWrapper._stopAnimation) {
      mascotWrapper._stopAnimation();
    }
    container.innerHTML = '';
    container.className = 'screen screen-title';

    var title = document.createElement('h1');
    title.className = 'title-heading';
    title.textContent = global.i18n.t('ui.title');
    container.appendChild(title);

    mascotWrapper = global.mascot && global.mascot.create ? global.mascot.create() : null;
    if (mascotWrapper) {
      container.appendChild(mascotWrapper);
    }

    var btnNew = document.createElement('button');
    btnNew.type = 'button';
    btnNew.className = 'btn btn-primary';
    btnNew.textContent = global.i18n.t('ui.newGame');
    btnNew.addEventListener('click', function () {
      var save = global.state.createNewSave();
      global.state.saveGame(save);
      global.state.setScreen('game');
    });
    container.appendChild(btnNew);

    var btnContinue = document.createElement('button');
    btnContinue.type = 'button';
    btnContinue.className = 'btn btn-secondary';
    btnContinue.textContent = global.i18n.t('ui.continue');
    btnContinue.disabled = !global.state.hasSave();
    btnContinue.addEventListener('click', function () {
      if (global.state.hasSave()) {
        global.state.setScreen('game');
      }
    });
    container.appendChild(btnContinue);

    var langEl = global.langSelector && global.langSelector.create
      ? global.langSelector.create({ onLocaleChange: function () { global.state.refreshScreen(); } })
      : null;
    if (langEl) container.appendChild(langEl);

    var menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'btn btn-text';
    menuBtn.textContent = global.i18n.t('ui.menu');
    menuBtn.addEventListener('click', function () {
      global.state.setScreen('menu');
    });
    container.appendChild(menuBtn);
  }

  function show() {
    if (!container) {
      container = document.getElementById('app');
      if (!container) return;
    }
    render();
  }

  function hide() {
    if (mascotWrapper && mascotWrapper._stopAnimation) {
      mascotWrapper._stopAnimation();
    }
  }

  global.state.registerScreen('title', { show: show, hide: hide });
})(typeof window !== 'undefined' ? window : this);
