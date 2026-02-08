/**
 * 共通アセット管理ヘルパー
 * 
 * 使用方法:
 *   <script src="/assets/asset-helper.js"></script>
 *   var path = getAssetPath('axolotl/axo_nomal.png');
 */

(function() {
  'use strict';

  /**
   * 共通アセットのパスを取得
   * @param {string} assetPath - アセットの相対パス（例: 'axolotl/axo_nomal.png'）
   * @returns {string} 完全なアセットパス
   */
  window.getAssetPath = function(assetPath) {
    // ルートからの絶対パスを返す
    return '/assets/' + assetPath.replace(/^\/+/, '');
  };

  /**
   * ウーパー画像のパスを取得
   * @param {string} type - ウーパータイプ（例: 'nomal', 'albino'）
   * @returns {string} 画像パス
   */
  window.getAxolotlImagePath = function(type) {
    // タイプ名のマッピング
    var typeMap = {
      'goldblackeye': 'gold',
      'yellow': 'yellow',
      'superblack': 'superblack',
      'dalmatian': 'dalmatian'
    };
    
    var imageType = typeMap[type] || type;
    return getAssetPath('axolotl/axo_' + imageType + '.png');
  };

  /**
   * うんこ画像のパスを取得
   * @returns {string} 画像パス
   */
  window.getUnkoImagePath = function() {
    return getAssetPath('unko.png');
  };

  /**
   * ゲーム固有アセットのパスを取得（相対パス）
   * @param {string} assetPath - アセットの相対パス
   * @param {string} gamePath - ゲームのパス（例: 'games/axolotl-shop'）
   * @returns {string} ゲーム固有アセットパス
   */
  window.getGameAssetPath = function(assetPath, gamePath) {
    return '/' + gamePath + '/assets/' + assetPath.replace(/^\/+/, '');
  };
})();
