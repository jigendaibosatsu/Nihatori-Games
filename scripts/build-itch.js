#!/usr/bin/env node
/**
 * itch.io 配布用ビルド（汎用）
 * 使用: node scripts/build-itch.js <game-name>
 * 例: node scripts/build-itch.js axolotl-shop
 * 例: node scripts/build-itch.js mine-tap
 *
 * 設定: scripts/itch-build-config.json
 * 新規ゲーム追加: 設定にエントリを追加し、package.json に build:itch:<game> を追加
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'itch-build-config.json');

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

function copyDirRecursive(src, dest, filter) {
  if (!fs.existsSync(src)) return;
  mkdirp(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      copyDirRecursive(srcPath, destPath, filter);
    } else if (!filter || filter(e.name, srcPath)) {
      copyFile(srcPath, destPath);
    }
  }
}

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) rmrf(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  mkdirp(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
}

function applyRewrites(content, rewrites) {
  let out = content;
  for (const r of rewrites) {
    const from = r[0];
    const to = r[1];
    const useRegex = r[2] === 'regex';
    if (useRegex && from === '/assets/' && to === './assets/') {
      out = out.replace(/(?<!\.)\/assets\//g, './assets/');
    } else {
      out = out.split(from).join(to);
    }
  }
  return out;
}

function buildPlain(gameName, cfg) {
  const GAME = path.join(ROOT, 'games', gameName);
  const DIST = path.join(ROOT, 'dist', 'itch', gameName);

  if (!fs.existsSync(GAME)) {
    console.error('[build:itch] Game not found: ' + GAME);
    process.exit(1);
  }

  if (fs.existsSync(DIST)) rmrf(DIST);
  mkdirp(DIST);

  // 1. index.html
  const indexSrc = path.join(GAME, 'index.html');
  if (!fs.existsSync(indexSrc)) {
    console.error('[build:itch] index.html not found: ' + indexSrc);
    process.exit(1);
  }
  let indexHtml = readFile(indexSrc);
  indexHtml = applyRewrites(indexHtml, cfg.pathRewrites || []);
  writeFile(path.join(DIST, 'index.html'), indexHtml);

  // 2. gameFiles
  for (const f of cfg.gameFiles || []) {
    const src = path.join(GAME, f);
    if (fs.existsSync(src)) {
      copyFile(src, path.join(DIST, f));
    }
  }

  // 3. rewriteFiles（gameFiles のうちパス書き換えが必要なもの）
  const rewriteSet = new Set(cfg.rewriteFiles || []);
  for (const f of rewriteSet) {
    const destPath = path.join(DIST, f);
    if (fs.existsSync(destPath) && (cfg.pathRewrites || []).length > 0) {
      let content = readFile(destPath);
      content = applyRewrites(content, cfg.pathRewrites);
      writeFile(destPath, content);
    }
  }

  // 4. copyFromRoot
  for (const f of cfg.copyFromRoot || []) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) {
      copyFile(src, path.join(DIST, path.basename(f)));
    }
  }

  // 5. copyDirs（ゲーム内のディレクトリ）
  for (const d of cfg.copyDirs || []) {
    const src = path.join(GAME, d);
    if (fs.existsSync(src)) {
      copyDirRecursive(src, path.join(DIST, d));
    }
  }

  // 6. assets（ルートの assets を DIST へ）
  for (const a of cfg.assets || []) {
    const src = path.join(ROOT, a.from);
    const dest = path.join(DIST, a.to);
    if (fs.existsSync(src)) {
      const stat = fs.statSync(src);
      if (stat.isDirectory()) {
        copyDirRecursive(src, dest);
      } else {
        copyFile(src, dest);
      }
    }
  }

  // 7. header-itch.js
  if (cfg.useHeaderStub) {
    const stub = "(function(){var p=document.getElementById('site-header');if(p)p.innerHTML='';})();\n";
    writeFile(path.join(DIST, 'header-itch.js'), stub);
  }

  console.log('[build:itch:' + gameName + '] done: ' + DIST);
}

function buildVite(gameName, cfg) {
  const GAME = path.join(ROOT, 'games', gameName);
  const GAME_DIST = path.join(GAME, 'dist');
  const DIST = path.join(ROOT, 'dist', 'itch', gameName);

  if (!fs.existsSync(GAME_DIST)) {
    console.error('[build:itch] Run "npm run build" in games/' + gameName + ' first.');
    process.exit(1);
  }

  if (fs.existsSync(DIST)) rmrf(DIST);
  mkdirp(DIST);

  copyDirRecursive(GAME_DIST, DIST);

  if (cfg.useHeaderStub !== false) {
    const indexPath = path.join(DIST, 'index.html');
    if (fs.existsSync(indexPath)) {
      let html = readFile(indexPath);
      html = html.replace(/src="\/assets\/header\.js"/g, 'src="./header-itch.js"');
      writeFile(indexPath, html);
    }
    const stub = "(function(){var p=document.getElementById('site-header');if(p)p.innerHTML='';})();\n";
    writeFile(path.join(DIST, 'header-itch.js'), stub);
  }

  console.log('[build:itch:' + gameName + '] done: ' + DIST);
}

// --- main ---
const gameName = process.argv[2];
if (!gameName) {
  console.error('Usage: node scripts/build-itch.js <game-name>');
  console.error('Example: node scripts/build-itch.js axolotl-shop');
  process.exit(1);
}

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('[build:itch] Config not found: ' + CONFIG_PATH);
  process.exit(1);
}

const config = JSON.parse(readFile(CONFIG_PATH));
const cfg = config[gameName];
if (!cfg) {
  console.error('[build:itch] Unknown game: ' + gameName);
  console.error('Available: ' + Object.keys(config).join(', '));
  process.exit(1);
}

if (cfg.type === 'vite') {
  buildVite(gameName, cfg);
} else {
  buildPlain(gameName, cfg);
}
