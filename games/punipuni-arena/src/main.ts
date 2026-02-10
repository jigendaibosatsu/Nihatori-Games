/**
 * PuniPuni Arena - Entry point
 * Tap/click-based real-time action with gesture recognition
 */

import { createGame, setupInput, gameLoop } from './game';

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  const gs = createGame(canvas);
  setupInput(gs);
  requestAnimationFrame((t) => gameLoop(gs, t));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
