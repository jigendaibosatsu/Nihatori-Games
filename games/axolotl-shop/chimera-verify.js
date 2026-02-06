// キメラ画像検証ツール
// CanvasをPNGとして書き出し、元画像とピクセル単位で比較

function verifyChimeraImage(canvas, leftImagePath, rightImagePath, outputPath) {
  return new Promise(function(resolve, reject) {
    // CanvasをPNGとして書き出し
    var canvasDataURL = canvas.toDataURL('image/png');
    
    // 元画像を読み込む
    var img1 = new Image();
    var img2 = new Image();
    var loadedCount = 0;
    
    var leftCanvas = document.createElement('canvas');
    leftCanvas.width = 40;
    leftCanvas.height = 40;
    var leftCtx = leftCanvas.getContext('2d');
    leftCtx.imageSmoothingEnabled = false;
    
    var rightCanvas = document.createElement('canvas');
    rightCanvas.width = 40;
    rightCanvas.height = 40;
    var rightCtx = rightCanvas.getContext('2d');
    rightCtx.imageSmoothingEnabled = false;
    
    var checkLoaded = function() {
      if (loadedCount < 2) return;
      
      // 元画像を40x40にスケール
      leftCtx.clearRect(0, 0, 40, 40);
      leftCtx.drawImage(img1, 0, 0, img1.naturalWidth, img1.naturalHeight, 0, 0, 40, 40);
      
      rightCtx.clearRect(0, 0, 40, 40);
      rightCtx.drawImage(img2, 0, 0, img2.naturalWidth, img2.naturalHeight, 0, 0, 40, 40);
      
      // 期待されるキメラ画像を作成（左半分: img1, 右半分: img2）
      var expectedCanvas = document.createElement('canvas');
      expectedCanvas.width = 40;
      expectedCanvas.height = 40;
      var expectedCtx = expectedCanvas.getContext('2d');
      expectedCtx.imageSmoothingEnabled = false;
      
      // 左半分（0-19ピクセル）を描画
      expectedCtx.drawImage(leftCanvas, 0, 0, 20, 40, 0, 0, 20, 40);
      // 右半分（20-39ピクセル）を描画
      expectedCtx.drawImage(rightCanvas, 20, 0, 20, 40, 20, 0, 20, 40);
      
      // ピクセル単位で比較
      var actualImageData = canvas.getContext('2d').getImageData(0, 0, 40, 40);
      var expectedImageData = expectedCtx.getImageData(0, 0, 40, 40);
      
      var totalPixels = 40 * 40;
      var matchingPixels = 0;
      var diffPixels = [];
      
      for (var y = 0; y < 40; y++) {
        for (var x = 0; x < 40; x++) {
          var idx = (y * 40 + x) * 4;
          
          var actualR = actualImageData.data[idx];
          var actualG = actualImageData.data[idx + 1];
          var actualB = actualImageData.data[idx + 2];
          var actualA = actualImageData.data[idx + 3];
          
          var expectedR = expectedImageData.data[idx];
          var expectedG = expectedImageData.data[idx + 1];
          var expectedB = expectedImageData.data[idx + 2];
          var expectedA = expectedImageData.data[idx + 3];
          
          // 完全一致チェック（RGBAすべて一致）
          if (actualR === expectedR && 
              actualG === expectedG && 
              actualB === expectedB && 
              actualA === expectedA) {
            matchingPixels++;
          } else {
            diffPixels.push({
              x: x,
              y: y,
              actual: [actualR, actualG, actualB, actualA],
              expected: [expectedR, expectedG, expectedB, expectedA]
            });
          }
        }
      }
      
      var matchRate = (matchingPixels / totalPixels) * 100;
      
      // 結果を出力
      console.log('=== キメラ画像検証結果 ===');
      console.log('一致率: ' + matchRate.toFixed(2) + '%');
      console.log('一致ピクセル数: ' + matchingPixels + ' / ' + totalPixels);
      console.log('不一致ピクセル数: ' + diffPixels.length);
      
      if (diffPixels.length > 0) {
        console.log('\n=== 不一致ピクセル（最初の50個） ===');
        var displayCount = Math.min(50, diffPixels.length);
        for (var i = 0; i < displayCount; i++) {
          var diff = diffPixels[i];
          console.log('座標(' + diff.x + ', ' + diff.y + '): 実際[' + 
            diff.actual.join(', ') + '] 期待[' + diff.expected.join(', ') + ']');
        }
        if (diffPixels.length > 50) {
          console.log('... 他 ' + (diffPixels.length - 50) + ' 個の不一致ピクセル');
        }
        
        // 差分画像を作成（不一致部分を赤で表示）
        var diffCanvas = document.createElement('canvas');
        diffCanvas.width = 40;
        diffCanvas.height = 40;
        var diffCtx = diffCanvas.getContext('2d');
        diffCtx.drawImage(canvas, 0, 0);
        
        diffPixels.forEach(function(diff) {
          diffCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
          diffCtx.fillRect(diff.x, diff.y, 1, 1);
        });
        
        // 期待される画像と実際の画像、差分画像を並べて表示
        var resultDiv = document.createElement('div');
        resultDiv.style.position = 'fixed';
        resultDiv.style.top = '10px';
        resultDiv.style.right = '10px';
        resultDiv.style.background = 'white';
        resultDiv.style.padding = '10px';
        resultDiv.style.border = '2px solid black';
        resultDiv.style.zIndex = '10000';
        
        var title = document.createElement('h3');
        title.textContent = '検証結果: 一致率 ' + matchRate.toFixed(2) + '%';
        resultDiv.appendChild(title);
        
        var imgContainer = document.createElement('div');
        imgContainer.style.display = 'flex';
        imgContainer.style.gap = '10px';
        
        var actualImg = document.createElement('img');
        actualImg.src = canvas.toDataURL('image/png');
        actualImg.style.width = '160px';
        actualImg.style.height = '160px';
        actualImg.style.imageRendering = 'pixelated';
        actualImg.title = '実際の画像';
        imgContainer.appendChild(actualImg);
        
        var expectedImg = document.createElement('img');
        expectedImg.src = expectedCanvas.toDataURL('image/png');
        expectedImg.style.width = '160px';
        expectedImg.style.height = '160px';
        expectedImg.style.imageRendering = 'pixelated';
        expectedImg.title = '期待される画像';
        imgContainer.appendChild(expectedImg);
        
        var diffImg = document.createElement('img');
        diffImg.src = diffCanvas.toDataURL('image/png');
        diffImg.style.width = '160px';
        diffImg.style.height = '160px';
        diffImg.style.imageRendering = 'pixelated';
        diffImg.title = '差分（赤=不一致）';
        imgContainer.appendChild(diffImg);
        
        resultDiv.appendChild(imgContainer);
        
        var closeBtn = document.createElement('button');
        closeBtn.textContent = '閉じる';
        closeBtn.onclick = function() {
          resultDiv.remove();
        };
        resultDiv.appendChild(closeBtn);
        
        document.body.appendChild(resultDiv);
      } else {
        console.log('\n✓ 完全一致！すべてのピクセルが一致しています。');
      }
      
      // PNGファイルとしてダウンロード
      if (outputPath) {
        var link = document.createElement('a');
        link.download = outputPath || 'chimera-verify.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      
      resolve({
        matchRate: matchRate,
        matchingPixels: matchingPixels,
        totalPixels: totalPixels,
        diffPixels: diffPixels,
        expectedCanvas: expectedCanvas,
        actualCanvas: canvas
      });
    };
    
    img1.onload = function() {
      loadedCount++;
      checkLoaded();
    };
    img2.onload = function() {
      loadedCount++;
      checkLoaded();
    };
    img1.onerror = function() {
      reject(new Error('左側画像の読み込みに失敗: ' + leftImagePath));
    };
    img2.onerror = function() {
      reject(new Error('右側画像の読み込みに失敗: ' + rightImagePath));
    };
    
    img1.crossOrigin = 'anonymous';
    img2.crossOrigin = 'anonymous';
    img1.src = leftImagePath;
    img2.src = rightImagePath;
  });
}

// 使用例:
// verifyChimeraImage(
//   canvas,  // 検証するCanvas要素
//   '/assets/axolotl/axo_nomal.png',  // 左側の元画像パス
//   '/assets/axolotl/axo_marble.png', // 右側の元画像パス
//   'chimera-result.png'  // 出力ファイル名（オプション）
// ).then(function(result) {
//   console.log('検証完了:', result);
// }).catch(function(error) {
//   console.error('エラー:', error);
// });
