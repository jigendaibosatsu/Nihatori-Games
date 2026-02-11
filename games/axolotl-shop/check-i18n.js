#!/usr/bin/env node
/**
 * i18n check for axolotl-shop
 * Reports: missing i18n keys, non-localized user-visible strings
 * Run: node check-i18n.js
 * Exit: 0 if OK, 1 if issues found (for CI/dev)
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname);
var LOCALES = ['ja', 'en'];
var FILES = {
  js: path.join(ROOT, 'axolotl-shop.js'),
  html: path.join(ROOT, 'index.html')
};

function flattenKeys(obj, prefix) {
  var out = {};
  prefix = prefix || '';
  Object.keys(obj || {}).forEach(function (k) {
    var key = prefix ? prefix + '.' + k : k;
    var v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v !== 'string') {
      Object.assign(out, flattenKeys(v, key));
    } else {
      out[key] = true;
    }
  });
  return out;
}

function loadLocaleKeys() {
  var all = {};
  LOCALES.forEach(function (loc) {
    var p = path.join(ROOT, 'locales', loc + '.json');
    try {
      var data = JSON.parse(fs.readFileSync(p, 'utf8'));
      Object.assign(all, flattenKeys(data));
    } catch (e) {
      console.error('[check-i18n] ERROR loading ' + p + ': ' + e.message);
      process.exit(1);
    }
  });
  return all;
}

function extractUsedKeys(content, filePath) {
  var keys = [];
  var lines = content.split('\n');
  // t('key') or t("key") - avoid matching createElement, getContext
  var reLiteral = /[^a-zA-Z0-9_]t\s*\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
  lines.forEach(function (line, i) {
    var m;
    reLiteral.lastIndex = 0;
    while ((m = reLiteral.exec(line)) !== null) {
      keys.push({ key: m[1], file: filePath, line: i + 1 });
    }
  });
  return keys;
}

var DYNAMIC_PREFIX_LIST = [
  'game.achievement.', 'game.typeDesc.', 'game.equipment.', 'game.feedDisplay.', 'sizeBand.', 'type.'
];

function fixExpandDynamicKey(key) {
  var prefix = key.endsWith('*') ? key.slice(0, -1) : (key.endsWith('.') && DYNAMIC_PREFIX_LIST.indexOf(key) >= 0 ? key : null);
  if (!prefix) return [key];
  if (prefix === 'game.achievement.') {
    var ids = ['first_sale', 'breed_success', 'basic_five', 'money_1m', 'adult_raised', 'rare_obtained', 'rep_80', 'reputation_max', 'marble_fixed', 'rare_fixed', 'all_types', 'money_100k', 'money_500k', 'tanks_max', 'long_life'];
    var out = [];
    ids.forEach(function (id) {
      out.push('game.achievement.' + id);
      out.push('game.achievement.' + id + '_desc');
    });
    return out;
  }
  if (prefix === 'game.typeDesc.') return ['game.typeDesc.nomal', 'game.typeDesc.albino', 'game.typeDesc.gold', 'game.typeDesc.marble', 'game.typeDesc.copper', 'game.typeDesc.black', 'game.typeDesc.superblack', 'game.typeDesc.goldblackeye', 'game.typeDesc.chimera', 'game.typeDesc.yellow', 'game.typeDesc.dalmatian'];
  if (prefix === 'game.equipment.') return ['game.equipment.autoFeeder', 'game.equipment.filter', 'game.equipment.bottomCleaner', 'game.equipment.medicine'];
  if (prefix === 'game.feedDisplay.') return ['game.feedDisplay.artificial', 'game.feedDisplay.bloodworm', 'game.feedDisplay.earthworm'];
  if (prefix === 'sizeBand.') return ['sizeBand.0', 'sizeBand.1', 'sizeBand.2', 'sizeBand.3', 'sizeBand.4', 'sizeBand.5', 'sizeBand.6', 'sizeBand.7'];
  if (prefix === 'type.') return ['type.nomal', 'type.albino', 'type.gold', 'type.marble', 'type.copper', 'type.black', 'type.superblack', 'type.goldblackeye', 'type.chimera', 'type.yellow', 'type.dalmatian'];
  return [key];
}

function extractDataI18nKeys(content, filePath) {
  var keys = [];
  var lines = content.split('\n');
  var re = /data-i18n=["']([^"']+)["']/g;
  var reTitle = /data-i18n-title=["']([^"']+)["']/g;
  lines.forEach(function (line, i) {
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      keys.push({ key: m[1], file: filePath, line: i + 1 });
    }
    reTitle.lastIndex = 0;
    while ((m = reTitle.exec(line)) !== null) {
      keys.push({ key: m[1], file: filePath, line: i + 1 });
    }
  });
  return keys;
}

function findHardcodedStrings(content, filePath) {
  var hits = [];
  var lines = content.split('\n');
  // Japanese chars
  var jpRe = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
  // Patterns: textContent = '...', innerHTML = '...', alert('...'), prompt('...'), confirm('...')
  // Exclude when RHS is t(...) or variable
  var patterns = [
    { re: /\.(textContent|innerHTML)\s*=\s*['"]([^'"]+)['"]/g, name: 'textContent/innerHTML' },
    { re: /\.(textContent|innerHTML)\s*=\s*`([^`]+)`/g, name: 'textContent/innerHTML' },
    { re: /alert\s*\(\s*['"]([^'"]+)['"]\s*\)/g, name: 'alert' },
    { re: /prompt\s*\(\s*['"]([^'"]+)['"]\s*[,\)]/g, name: 'prompt' },
    { re: /confirm\s*\(\s*['"]([^'"]+)['"]\s*\)/g, name: 'confirm' }
  ];
  lines.forEach(function (line, i) {
    if (/^\s*\/\//.test(line) || /^\s*\/\*/.test(line)) return;
    if (line.indexOf('t(') >= 0 && line.indexOf("='") < 0 && line.indexOf('="') < 0) return;
    patterns.forEach(function (p) {
      p.re.lastIndex = 0;
      var m;
      while ((m = p.re.exec(line)) !== null) {
        var str = m[2] || m[1];
        if (str && str.length > 2 && (jpRe.test(str) || /^[A-Za-z]/.test(str))) {
          if (line.indexOf('t(') >= 0 && line.indexOf(str) >= 0) return;
          hits.push({ file: filePath, line: i + 1, pattern: p.name, snippet: str });
        }
      }
    });
  });
  return hits;
}

function main() {
  var localeKeys = loadLocaleKeys();
  var missing = [];
  var used = [];

  [FILES.js].forEach(function (f) {
    var content = fs.readFileSync(f, 'utf8');
    extractUsedKeys(content, path.basename(f)).forEach(function (u) {
      used.push(u);
      var toCheck = fixExpandDynamicKey(u.key);
      toCheck.forEach(function (k) {
        if (!localeKeys[k]) {
          missing.push({ key: k, file: u.file, line: u.line });
        }
      });
    });
  });

  [FILES.html].forEach(function (f) {
    var content = fs.readFileSync(f, 'utf8');
    extractDataI18nKeys(content, path.basename(f)).forEach(function (u) {
      used.push(u);
      if (!localeKeys[u.key]) {
        missing.push({ key: u.key, file: u.file, line: u.line });
      }
    });
  });

  var hardcoded = [];
  [FILES.js].forEach(function (f) {
    var content = fs.readFileSync(f, 'utf8');
    findHardcodedStrings(content, path.basename(f)).forEach(function (h) {
      hardcoded.push(h);
    });
  });

  var hadError = false;
  if (missing.length > 0) {
    hadError = true;
    console.error('\n[i18n] MISSING KEYS (used in code but not in locales):');
    missing.forEach(function (m) {
      console.error('  ' + m.file + ':' + m.line + '  key: ' + m.key);
    });
  }
  if (hardcoded.length > 0) {
    hadError = true;
    console.error('\n[i18n] POSSIBLE NON-LOCALIZED STRINGS (use t("key") instead):');
    hardcoded.forEach(function (h) {
      console.error('  ' + h.file + ':' + h.line + '  ' + h.pattern + ': "' + (h.snippet.length > 50 ? h.snippet.slice(0, 47) + '...' : h.snippet) + '"');
    });
  }
  if (hadError) {
    console.error('\n[i18n] Check failed. Fix the above issues.\n');
    process.exit(1);
  }
  console.log('[i18n] OK: all keys localized, no hardcoded strings detected.');
}

main();
