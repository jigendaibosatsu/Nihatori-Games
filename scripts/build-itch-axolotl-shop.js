#!/usr/bin/env node
/**
 * itch.io 配布用ビルド: games/axolotl-shop → dist/itch/axolotl-shop
 * 絶対パスを相対に書き換え、必要ファイルのみコピーする。
 * 実行: node scripts/build-itch-axolotl-shop.js (プロジェクトルートから)
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var GAME = path.join(ROOT, 'games', 'axolotl-shop');
var DIST = path.join(ROOT, 'dist', 'itch', 'axolotl-shop');

function mkdirp(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

function copyFile(src, dest) {
  mkdirp(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  mkdirp(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
}

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var full = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) rmrf(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

// 1. dist 削除して再作成
if (fs.existsSync(DIST)) rmrf(DIST);
mkdirp(DIST);
mkdirp(path.join(DIST, 'src'));
mkdirp(path.join(DIST, 'locales'));
mkdirp(path.join(DIST, 'assets', 'axolotl'));
mkdirp(path.join(DIST, 'assets', 'items'));

// 2. 静的コピー（変更なし）
copyFile(path.join(GAME, 'axolotl-shop.css'), path.join(DIST, 'axolotl-shop.css'));
copyFile(path.join(GAME, 'axolotl-shop-init.js'), path.join(DIST, 'axolotl-shop-init.js'));
copyFile(path.join(GAME, 'src', 'i18n.js'), path.join(DIST, 'src', 'i18n.js'));
copyFile(path.join(GAME, 'locales', 'ja.json'), path.join(DIST, 'locales', 'ja.json'));
copyFile(path.join(GAME, 'locales', 'en.json'), path.join(DIST, 'locales', 'en.json'));
copyFile(path.join(GAME, 'icon.png'), path.join(DIST, 'icon.png'));

// 3. ルートから styles.css
copyFile(path.join(ROOT, 'styles.css'), path.join(DIST, 'styles.css'));

// 4. アセット: ルート assets/characters/axolotl/*.png → assets/axolotl/
var axoDir = path.join(ROOT, 'assets', 'characters', 'axolotl');
if (fs.existsSync(axoDir)) {
  fs.readdirSync(axoDir).forEach(function (name) {
    if (path.extname(name).toLowerCase() === '.png') {
      copyFile(path.join(axoDir, name), path.join(DIST, 'assets', 'axolotl', name));
    }
  });
}

// 5. アセット: ルート assets/items/unko_32.png
var unkoSrc = path.join(ROOT, 'assets', 'items', 'unko_32.png');
if (fs.existsSync(unkoSrc)) {
  copyFile(unkoSrc, path.join(DIST, 'assets', 'items', 'unko_32.png'));
}

// 6. index.html コピー＋パス書き換え
var indexHtml = readFile(path.join(GAME, 'index.html'));
indexHtml = indexHtml.replace(/href="\/styles\.css"/g, 'href="./styles.css"');
indexHtml = indexHtml.replace(/src="\/assets\/header\.js"/g, 'src="./header-itch.js"');
indexHtml = indexHtml.replace(/href="\/index\.html"/g, 'href="#"');
writeFile(path.join(DIST, 'index.html'), indexHtml);

// 7. axolotl-shop.js コピー＋パス書き換え
var shopJs = readFile(path.join(GAME, 'axolotl-shop.js'));
shopJs = shopJs.replace(/'\/assets\/characters\/axolotl\/'/g, "'./assets/axolotl/'");
shopJs = shopJs.replace(/\/assets\/items\/unko_32\.png/g, './assets/items/unko_32.png');
writeFile(path.join(DIST, 'axolotl-shop.js'), shopJs);

// 8. mascot.js コピー＋パス書き換え
var mascotJs = readFile(path.join(GAME, 'mascot.js'));
mascotJs = mascotJs.replace(/'\/assets\/characters\/axolotl\/'/g, "'./assets/axolotl/'");
writeFile(path.join(DIST, 'mascot.js'), mascotJs);

// 9. header-itch.js stub
var headerStub = "(function(){var p=document.getElementById('site-header');if(p)p.innerHTML='';})();\n";
writeFile(path.join(DIST, 'header-itch.js'), headerStub);

console.log('[build:itch:axolotl-shop] done: ' + DIST);
