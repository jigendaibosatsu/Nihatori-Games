/**
 * Pixel-art axolotl mascot (uupa) for title screen
 * Drawn with canvas, crisp nearest-neighbor scaling
 */

(function (global) {
  'use strict';

  // 16x16 pixel art axolotl (front view, cute uupa)
  // 0=transparent, 1=body, 2=outline, 3=eye, 4=gill
  var PIXEL_GRID = [
    [0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 4, 2, 1, 1, 2, 4, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 4, 2, 1, 1, 1, 1, 2, 4, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0],
    [0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 3, 1, 1, 3, 1, 1, 1, 0, 0, 0],
    [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0],
    [0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  var COLORS = {
    0: null,
    1: '#ffb6c1',
    2: '#e88a9a',
    3: '#2d1b1b',
    4: '#ffd6dc'
  };

  var GRID_SIZE = 16;
  var PIXEL_SCALE = 4;
  var CANVAS_SIZE = GRID_SIZE * PIXEL_SCALE;

  var animId = null;
  var baseY = 0;
  var currentOffset = 0;
  var startTime = 0;
  var amplitude = 6;
  var periodMs = 450;
  var nextChangeAt = 0;

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function scheduleNextVariation() {
    nextChangeAt = performance.now() + randomInRange(800, 1600);
  }

  function drawMascot(ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    for (var y = 0; y < GRID_SIZE; y++) {
      for (var x = 0; x < GRID_SIZE; x++) {
        var cell = PIXEL_GRID[y][x];
        if (cell && COLORS[cell]) {
          ctx.fillStyle = COLORS[cell];
          ctx.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
        }
      }
    }
  }

  function tick(now) {
    if (now >= nextChangeAt) {
      amplitude = randomInRange(4, 10);
      periodMs = randomInRange(300, 600);
      scheduleNextVariation();
    }
    var cycle = (now % periodMs) / periodMs;
    currentOffset = Math.sin(cycle * Math.PI * 2) * amplitude;
    baseY = currentOffset;
  }

  function createMascotElement() {
    var wrapper = document.createElement('div');
    wrapper.className = 'mascot-wrapper';
    wrapper.style.setProperty('--bob-offset', '0px');

    var canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    canvas.className = 'mascot-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    var ctx = canvas.getContext('2d');
    if (!ctx) return wrapper;

    drawMascot(ctx);

    wrapper.appendChild(canvas);

    function animate(now) {
      now = now || performance.now();
      tick(now);
      wrapper.style.setProperty('--bob-offset', baseY + 'px');
      animId = requestAnimationFrame(animate);
    }

    scheduleNextVariation();
    animId = requestAnimationFrame(animate);

    wrapper._stopAnimation = function () {
      if (animId != null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    return wrapper;
  }

  global.mascot = {
    create: createMascotElement
  };
})(typeof window !== 'undefined' ? window : this);
