/**
 * Game screen stub - displays save data and menu button
 */

(function (global) {
  'use strict';

  var container = null;

  function render() {
    if (!container) return;
    container.innerHTML = '';
    container.className = 'screen screen-game';

    var save = global.state.loadSave();

    var saveSection = document.createElement('div');
    saveSection.className = 'game-save-info';
    if (save) {
      var versionP = document.createElement('p');
      var unknown = global.i18n.t('ui.unknown');
      versionP.textContent = global.i18n.t('ui.saveVersion') + ': ' + (save.version || unknown);
      saveSection.appendChild(versionP);
      var createdAtP = document.createElement('p');
      createdAtP.textContent = global.i18n.t('ui.saveCreatedAt') + ': ' + (save.createdAt || unknown);
      saveSection.appendChild(createdAtP);
      var stageP = document.createElement('p');
      var stage = save.progress && save.progress.stage != null ? save.progress.stage : unknown;
      stageP.textContent = global.i18n.t('ui.saveStage') + ': ' + stage;
      saveSection.appendChild(stageP);
    } else {
      var noSaveP = document.createElement('p');
      noSaveP.className = 'game-stub';
      noSaveP.textContent = global.i18n.t('ui.gameComingSoon');
      saveSection.appendChild(noSaveP);
    }
    container.appendChild(saveSection);

    var menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'btn btn-primary';
    menuBtn.textContent = global.i18n.t('ui.openMenu');
    menuBtn.addEventListener('click', function () {
      global.state.setScreen('menu');
    });
    container.appendChild(menuBtn);

    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-text';
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

  global.state.registerScreen('game', { show: show });
})(typeof window !== 'undefined' ? window : this);
