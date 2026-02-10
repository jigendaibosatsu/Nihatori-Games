(function () {
  'use strict';

  // ===== 定数 =====
  var CANVAS_WIDTH = 400;
  var CANVAS_HEIGHT = 600;
  var BLOCK_SIZE = 40;
  var BASE_WIDTH = 200;
  var GRAVITY = 0.5;
  var BLOCK_SPEED = 3;
  
  // スマホ対応: 画面サイズに応じて調整
  var isMobile = window.innerWidth <= 600;
  if (isMobile) {
    CANVAS_WIDTH = Math.min(400, window.innerWidth - 32);
    CANVAS_HEIGHT = Math.min(600, window.innerHeight * 0.6);
  }

  // カメラ: 先端（積み上がりの一番上）が常に良い位置で見えるように
  var CAMERA_TOP_MARGIN = 80;

  // ===== ゲーム状態 =====
  var state = {
    gameStarted: false,
    gameOver: false,
    blocks: [],
    currentBlock: null,
    nextBlock: null,
    score: 0,
    blockCount: 0,
    bestHeight: 0,
    currentX: CANVAS_WIDTH / 2,
    movingLeft: false,
    movingRight: false,
    cameraY: 0,
    effectiveBaseWidth: 200,  // ミスごとに短くなる
    missCount: 0
  };

  // ===== Canvas設定 =====
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var nextCanvas = document.getElementById('nextCanvas');
  var nextCtx = nextCanvas.getContext('2d');
  
  // Canvasサイズを設定
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  
  // スマホ対応: レスポンシブサイズ調整
  function resizeCanvas() {
    if (isMobile) {
      var container = canvas.parentElement;
      var maxWidth = container.clientWidth - 32;
      var scale = Math.min(1, maxWidth / CANVAS_WIDTH);
      canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
      canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
    }
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ベストスコア読み込み
  function loadBestScore() {
    var saved = localStorage.getItem('stack-blocks-best');
    if (saved) {
      state.bestHeight = parseInt(saved, 10) || 0;
      updateBestScore();
    }
  }

  function saveBestScore() {
    if (state.score > state.bestHeight) {
      state.bestHeight = state.score;
      localStorage.setItem('stack-blocks-best', state.bestHeight.toString());
      updateBestScore();
    }
  }

  function updateBestScore() {
    document.getElementById('bestHeight').textContent = state.bestHeight;
  }

  // ===== ブロック生成 =====
  function createBlock(x, y, width) {
    return {
      x: x,
      y: y,
      width: width,
      height: BLOCK_SIZE,
      vx: 0,
      vy: 0,
      color: getRandomColor(),
      landed: false
    };
  }

  function getRandomColor() {
    var colors = [
      '#3b82f6', // 青
      '#10b981', // 緑
      '#f59e0b', // オレンジ
      '#ef4444', // 赤
      '#8b5cf6', // 紫
      '#ec4899'  // ピンク
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function generateNextBlock() {
    // 長さもランダム（細いもの含む）。ミスで短くなったベース幅を反映
    var base = state.effectiveBaseWidth || 200;
    var width = base + (Math.random() * 80 - 40); // ベース±40
    width = Math.max(50, Math.min(CANVAS_WIDTH - 40, width));
    return width;
  }

  function spawnBlock() {
    if (!state.nextBlock) {
      state.nextBlock = generateNextBlock();
    }

    var width = state.nextBlock;
    state.nextBlock = generateNextBlock();
    
    // ブロックは常に画面の良い位置（先端付近）に出現
    state.currentBlock = createBlock(
      state.currentX - width / 2,
      state.cameraY,
      width
    );
    
    drawNextBlock();
  }

  // 積みの先端（一番上のY）を取得
  function getTopOfStack() {
    var top = CANVAS_HEIGHT - 20 - BLOCK_SIZE;
    state.blocks.forEach(function(b) {
      if (b.y < top) top = b.y;
    });
    if (state.currentBlock && state.currentBlock.y < top) {
      top = state.currentBlock.y;
    }
    return top;
  }

  // カメラを先端に合わせて、いいスペースが常に見えるように
  function updateCamera() {
    var topY = getTopOfStack();
    var targetCameraY = topY - CAMERA_TOP_MARGIN;
    state.cameraY = state.cameraY + (targetCameraY - state.cameraY) * 0.2;
  }

  // 画面下にはみ出したブロックを削除（はみ出した分は減っていく）
  function removeBlocksBelowView() {
    var cutLine = state.cameraY + CANVAS_HEIGHT;
    var before = state.blocks.length;
    state.blocks = state.blocks.filter(function(b) {
      return b.y + b.height <= cutLine;
    });
    if (state.blocks.length !== before && state.blocks.length > 0) {
      var topY = getTopOfStack();
      var height = (state.cameraY + CANVAS_HEIGHT) - topY;
      state.score = Math.max(state.score, height);
      updateScore();
    }
  }

  // ===== 描画 =====
  function drawBlock(block, context) {
    context.fillStyle = block.color;
    context.fillRect(block.x, block.y, block.width, block.height);
    
    // ハイライト
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.fillRect(block.x, block.y, block.width, 8);
    
    // シャドウ
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(block.x, block.y + block.height - 8, block.width, 8);
  }

  function drawNextBlock() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (state.nextBlock) {
      var scale = 60 / state.nextBlock;
      var drawWidth = state.nextBlock * scale;
      var drawHeight = BLOCK_SIZE * scale;
      var x = (nextCanvas.width - drawWidth) / 2;
      var y = (nextCanvas.height - drawHeight) / 2;
      
      nextCtx.fillStyle = '#3b82f6';
      nextCtx.fillRect(x, y, drawWidth, drawHeight);
      
      nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      nextCtx.fillRect(x, y, drawWidth, 4);
    }
  }

  function draw() {
    // 背景クリア
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(0, -state.cameraY);

    // 地面
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);

    // 積み上げられたブロック
    state.blocks.forEach(function(block) {
      drawBlock(block, ctx);
    });

    // 現在のブロック
    if (state.currentBlock) {
      drawBlock(state.currentBlock, ctx);
    }

    ctx.restore();

    // 高さライン表示（画面座標で、先端の高さを表示）
    var topY = getTopOfStack();
    var screenTopY = topY - state.cameraY;
    if (state.blocks.length > 0 || state.currentBlock) {
      var height = (state.cameraY + CANVAS_HEIGHT) - topY;
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, screenTopY);
      ctx.lineTo(CANVAS_WIDTH, screenTopY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#60a5fa';
      ctx.font = '16px sans-serif';
      ctx.fillText('高さ: ' + Math.floor(height) + 'px', 10, screenTopY - 10);
    }
  }

  // ===== 物理演算 =====
  function updateCurrentBlock() {
    if (!state.currentBlock) return;

    var block = state.currentBlock;

    // ドラッグ中は自動移動を無効化
    if (!dragState.isDragging) {
      // 左右移動
      if (state.movingLeft) {
        block.x = Math.max(0, block.x - BLOCK_SPEED);
      }
      if (state.movingRight) {
        block.x = Math.min(CANVAS_WIDTH - block.width, block.x + BLOCK_SPEED);
      }
    }

    // 落下
    block.y += GRAVITY * 2;
    block.vy += GRAVITY;

    // 地面との衝突
    if (block.y + block.height >= CANVAS_HEIGHT - 20) {
      block.y = CANVAS_HEIGHT - 20 - block.height;
      landBlock();
      return;
    }

    // 他のブロックとの衝突
    for (var i = state.blocks.length - 1; i >= 0; i--) {
      var landedBlock = state.blocks[i];
      if (checkCollision(block, landedBlock)) {
        block.y = landedBlock.y - block.height;
        landBlock();
        return;
      }
    }
  }

  function checkCollision(block1, block2) {
    return block1.x < block2.x + block2.width &&
           block1.x + block1.width > block2.x &&
           block1.y < block2.y + block2.height &&
           block1.y + block1.height > block2.y;
  }

  function landBlock() {
    if (!state.currentBlock) return;

    var block = state.currentBlock;
    block.landed = true;
    state.blocks.push(block);
    state.blockCount++;
    
    // スコア計算（高さ＝表示範囲内の先端からの高さ）
    var topY = getTopOfStack();
    var height = (state.cameraY + CANVAS_HEIGHT) - topY;
    state.score = Math.max(state.score, height);
    updateScore();

    // はみ出しチェック
    checkOverhang();

    // 次のブロック生成
    state.currentBlock = null;
    state.currentX = CANVAS_WIDTH / 2;
    
    setTimeout(function() {
      spawnBlock();
    }, 300);
  }

  function checkOverhang() {
    if (state.blocks.length < 2) return;

    var topBlock = state.blocks[state.blocks.length - 1];
    var secondBlock = state.blocks[state.blocks.length - 2];

    var overhangLeft = Math.max(0, secondBlock.x - topBlock.x);
    var overhangRight = Math.max(0, (topBlock.x + topBlock.width) - (secondBlock.x + secondBlock.width));
    var maxOverhang = topBlock.width * 0.3;

    if (overhangLeft > maxOverhang || overhangRight > maxOverhang) {
      // ミス: 次のブロックが短くなる
      state.missCount++;
      state.effectiveBaseWidth = Math.max(50, (state.effectiveBaseWidth || 200) - 25);
      if (state.effectiveBaseWidth <= 50) {
        gameOver();
      }
    }
  }

  function updateScore() {
    document.getElementById('heightValue').textContent = Math.floor(state.score);
    document.getElementById('blockCount').textContent = state.blockCount;
  }

  // ===== ゲームループ =====
  function gameLoop() {
    if (!state.gameStarted || state.gameOver) return;

    updateCurrentBlock();
    updateCamera();
    removeBlocksBelowView();
    draw();

    requestAnimationFrame(gameLoop);
  }

  // ===== ゲーム制御 =====
  function startGame() {
    state.gameStarted = true;
    state.gameOver = false;
    state.blocks = [];
    state.currentBlock = null;
    state.nextBlock = null;
    state.score = 0;
    state.blockCount = 0;
    state.currentX = CANVAS_WIDTH / 2;
    state.cameraY = 0;
    state.effectiveBaseWidth = 200;
    state.missCount = 0;

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');

    updateScore();
    spawnBlock();
    gameLoop();
  }

  function gameOver() {
    state.gameOver = true;
    state.gameStarted = false;

    saveBestScore();

    document.getElementById('finalHeight').textContent = Math.floor(state.score);
    document.getElementById('finalBlocks').textContent = state.blockCount;
    document.getElementById('gameOverScreen').classList.remove('hidden');
  }

  function restartGame() {
    startGame();
  }

  function dropBlock() {
    if (!state.currentBlock || state.gameOver) return;

    // 即座に落下させる
    var block = state.currentBlock;
    var minY = CANVAS_HEIGHT - 20 - block.height;

    // 他のブロックとの衝突をチェック
    for (var i = state.blocks.length - 1; i >= 0; i--) {
      var landedBlock = state.blocks[i];
      var testY = landedBlock.y - block.height;
      if (testY >= 0 && 
          block.x < landedBlock.x + landedBlock.width &&
          block.x + block.width > landedBlock.x) {
        minY = Math.min(minY, testY);
      }
    }

    block.y = minY;
    landBlock();
  }

  // ===== ドラッグ操作 =====
  var dragState = {
    isDragging: false,
    startX: 0,
    currentX: 0
  };

  function handleDragStart(e) {
    if (!state.gameStarted || state.gameOver) return;
    dragState.isDragging = true;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragState.startX = clientX;
    dragState.currentX = clientX;
    e.preventDefault();
  }

  function handleDragMove(e) {
    if (!dragState.isDragging || !state.currentBlock) return;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var rect = canvas.getBoundingClientRect();
    var canvasX = clientX - rect.left;
    var scale = canvas.width / rect.width;
    var gameX = canvasX * scale;
    
    // ブロックの中心をマウス位置に合わせる
    state.currentBlock.x = Math.max(0, Math.min(CANVAS_WIDTH - state.currentBlock.width, gameX - state.currentBlock.width / 2));
    dragState.currentX = clientX;
    e.preventDefault();
  }

  function handleDragEnd(e) {
    if (!dragState.isDragging) return;
    dragState.isDragging = false;
    e.preventDefault();
  }

  // ===== イベントリスナー =====
  function initEventListeners() {
    // スタート
    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnRestart').addEventListener('click', restartGame);

    // コントロール
    var btnLeft = document.getElementById('btnLeft');
    var btnRight = document.getElementById('btnRight');
    var btnDrop = document.getElementById('btnDrop');
    
    // Canvasドラッグ操作
    canvas.addEventListener('mousedown', handleDragStart);
    canvas.addEventListener('mousemove', handleDragMove);
    canvas.addEventListener('mouseup', handleDragEnd);
    canvas.addEventListener('mouseleave', handleDragEnd);
    canvas.addEventListener('touchstart', handleDragStart, { passive: false });
    canvas.addEventListener('touchmove', handleDragMove, { passive: false });
    canvas.addEventListener('touchend', handleDragEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleDragEnd, { passive: false });

    btnLeft.addEventListener('mousedown', function() {
      state.movingLeft = true;
    });
    btnLeft.addEventListener('mouseup', function() {
      state.movingLeft = false;
    });
    btnLeft.addEventListener('mouseleave', function() {
      state.movingLeft = false;
    });
    btnLeft.addEventListener('touchstart', function(e) {
      e.preventDefault();
      state.movingLeft = true;
    });
    btnLeft.addEventListener('touchend', function(e) {
      e.preventDefault();
      state.movingLeft = false;
    });

    btnRight.addEventListener('mousedown', function() {
      state.movingRight = true;
    });
    btnRight.addEventListener('mouseup', function() {
      state.movingRight = false;
    });
    btnRight.addEventListener('mouseleave', function() {
      state.movingRight = false;
    });
    btnRight.addEventListener('touchstart', function(e) {
      e.preventDefault();
      state.movingRight = true;
    });
    btnRight.addEventListener('touchend', function(e) {
      e.preventDefault();
      state.movingRight = false;
    });

    btnDrop.addEventListener('click', dropBlock);
    btnDrop.addEventListener('touchend', function(e) {
      e.preventDefault();
      dropBlock();
    });

    // キーボード操作
    document.addEventListener('keydown', function(e) {
      if (!state.gameStarted || state.gameOver) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        state.movingLeft = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        state.movingRight = true;
      }
      if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        dropBlock();
      }
    });

    document.addEventListener('keyup', function(e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        state.movingLeft = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        state.movingRight = false;
      }
    });
  }

  // ===== 初期化 =====
  function init() {
    loadBestScore();
    initEventListeners();
    draw();
    drawNextBlock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
