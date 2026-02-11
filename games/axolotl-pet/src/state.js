/**
 * State management for Upa Lupa Pet Game
 * Screen router and save persistence
 */

(function (global) {
  'use strict';

  var SAVE_KEY = 'save_v1';
  var currentScreen = 'title';
  var screenHandlers = {};

  function setScreen(screenId) {
    if (!['title', 'menu', 'game'].includes(screenId)) return;
    var prev = currentScreen;
    currentScreen = screenId;
    var prevHandler = screenHandlers[prev];
    if (prevHandler && typeof prevHandler.hide === 'function') {
      prevHandler.hide();
    }
    var handler = screenHandlers[screenId];
    if (handler && typeof handler.show === 'function') {
      handler.show(prev);
    }
  }

  function getScreen() {
    return currentScreen;
  }

  function refreshScreen() {
    var screenId = currentScreen;
    var handler = screenHandlers[screenId];
    if (handler && typeof handler.show === 'function') {
      handler.show(currentScreen);
    }
  }

  function registerScreen(id, handler) {
    screenHandlers[id] = handler;
  }

  function hasSave() {
    try {
      var data = localStorage.getItem(SAVE_KEY);
      return data != null && data.length > 0;
    } catch (e) {
      return false;
    }
  }

  function loadSave() {
    try {
      var data = localStorage.getItem(SAVE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function createNewSave() {
    return {
      version: 'v1',
      createdAt: new Date().toISOString(),
      progress: { stage: 1 }
    };
  }

  function saveGame(data) {
    try {
      var payload = data || createNewSave();
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Initialize dummy save for testing (optional)
  function ensureDummySave() {
    if (!hasSave()) {
      saveGame({ dummy: true, timestamp: Date.now() });
    }
  }

  global.state = {
    setScreen: setScreen,
    getScreen: getScreen,
    refreshScreen: refreshScreen,
    registerScreen: registerScreen,
    hasSave: hasSave,
    loadSave: loadSave,
    createNewSave: createNewSave,
    saveGame: saveGame,
    clearSave: clearSave,
    ensureDummySave: ensureDummySave
  };
})(typeof window !== 'undefined' ? window : this);
