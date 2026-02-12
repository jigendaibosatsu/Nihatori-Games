/**
 * タイトル画面用マスコット：ランダムなウーパー画像 + 跳ねアニメーション
 */
(function () {
  'use strict';

  var AXOLOTL_IMAGE_BASE = './assets/axolotl/';
  var AXOLOTL_ASSETS = [
    'axo_nomal.png',
    'axo_albino.png',
    'axo_gold.png',
    'axo_marble.png',
    'axo_copper.png',
    'axo_black.png',
    'axo_superblack.png',
    'axo_chimera.png',
    'axo_yellow.png',
    'axo_dalmatian.png'
  ];

  function getRandomAxolotlPath() {
    var idx = Math.floor(Math.random() * AXOLOTL_ASSETS.length);
    return AXOLOTL_IMAGE_BASE + AXOLOTL_ASSETS[idx];
  }

  function createMascot(container) {
    if (!container) return null;

    var img = document.createElement('img');
    img.src = getRandomAxolotlPath();
    img.alt = '';
    img.style.width = '96px';
    img.style.height = '96px';
    img.style.imageRendering = 'pixelated';
    img.style.imageRendering = '-moz-crisp-edges';
    img.style.imageRendering = 'crisp-edges';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.className = 'ax-title-mascot-img';

    container.innerHTML = '';
    container.appendChild(img);

    // 跳ねアニメーション（requestAnimationFrame）
    var startTime = null;
    var amplitude = 8;
    var periodMs = 800;

    function bob(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var phase = (elapsed % periodMs) / periodMs;
      var offset = Math.sin(phase * Math.PI * 2) * amplitude;
      img.style.transform = 'translateY(' + offset + 'px)';
      requestAnimationFrame(bob);
    }
    requestAnimationFrame(bob);

    return img;
  }

  window.axTitleMascot = { create: createMascot };
})();
