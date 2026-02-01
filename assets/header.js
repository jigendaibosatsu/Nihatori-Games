/**
 * 共通ヘッダーを1か所で管理するため、components/header.html を取得して挿入する。
 * プレースホルダー: <div id="site-header"></div> または data-header を持つ要素。
 * 挿入後にロゴの .svg → .png フォールバックを実行。
 */
(function () {
  'use strict';

  var placeholder = document.getElementById('site-header') || document.querySelector('[data-header]');
  if (!placeholder) return;

  var url = placeholder.getAttribute('data-src') || '/components/header.html';

  function initLogo(container) {
    var img = container ? container.querySelector('.site-logo .logo-img') : document.querySelector('.site-logo .logo-img');
    var fallback = container ? container.querySelector('.site-logo .logo-fallback') : document.querySelector('.site-logo .logo-fallback');
    if (!img || !fallback) return;
    function showFallback() {
      img.setAttribute('hidden', '');
      fallback.removeAttribute('hidden');
    }
    img.onerror = function () {
      if (img.src && img.src.indexOf('.svg') !== -1) {
        img.src = '/assets/logo.png';
        img.onerror = showFallback;
      } else {
        showFallback();
      }
    };
    img.onload = function () {
      img.removeAttribute('hidden');
      fallback.setAttribute('hidden', '');
    };
    if (img.complete && img.naturalWidth > 0) {
      fallback.setAttribute('hidden', '');
    } else if (img.complete) {
      img.onerror();
    }
  }

  fetch(url)
    .then(function (res) { return res.ok ? res.text() : Promise.reject(new Error(res.status)); })
    .then(function (html) {
      placeholder.innerHTML = html;
      initLogo(placeholder);
    })
    .catch(function () {
      placeholder.innerHTML = '<header class="site-header"><div class="header-inner"><a href="/" class="site-logo">NIHATORI</a></div></header>';
    });
})();
