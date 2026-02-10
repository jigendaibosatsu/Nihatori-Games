/**
 * UI - HP bar, Energy gauge, state debug, cooldown indicators, restart
 */

import { CONFIG } from './config';
import { GameState } from './game';

const STATE_NAMES: Record<number, string> = {
  [CONFIG.STATES.IDLE]: 'IDLE',
  [CONFIG.STATES.MOVE]: 'MOVE',
  [CONFIG.STATES.ATTACK]: 'ATTACK',
  [CONFIG.STATES.HYPER]: 'HYPER',
  [CONFIG.STATES.SPIN]: 'SPIN',
  [CONFIG.STATES.GIANT_CHARGE]: 'GIANT_CHARGE',
  [CONFIG.STATES.GIANT_SLAM]: 'GIANT_SLAM',
  [CONFIG.STATES.STONE]: 'STONE',
  [CONFIG.STATES.DOWN]: 'DOWN',
  [CONFIG.STATES.HITSTUN]: 'HITSTUN',
};

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function formatMs(ms: number): string {
  if (ms <= 0) return 'OK';
  return (ms / 1000).toFixed(1) + 's';
}

export function updateUI(gs: GameState): void {
  const p = gs.player;

  const hpBar = $('hpBar');
  const hpVal = $('hpValue');
  const energyBar = $('energyBar');
  const energyVal = $('energyVal');
  const stateText = $('stateText');
  const cdMultiply = $('cdMultiply');
  const cdStone = $('cdStone');
  const cdHyper = $('cdHyper');
  const cdGiant = $('cdGiant');
  const cdSpin = $('cdSpin');
  const gameTimeEl = $('gameTime');
  const enemiesEl = $('enemiesCount');
  const winOverlay = $('winOverlay');
  const loseOverlay = $('loseOverlay');
  const btnRestart = $('btnRestart');

  if (hpBar && hpVal) {
    const pct = (p.hp / p.maxHp) * 100;
    hpBar.style.width = pct + '%';
    hpVal.textContent = Math.floor(p.hp) + ' / ' + Math.floor(p.maxHp);
  }

  if (energyBar && energyVal) {
    const pct = (p.energy / CONFIG.ENERGY_MAX) * 100;
    energyBar.style.width = pct + '%';
    energyVal.textContent = Math.floor(p.energy) + ' / ' + CONFIG.ENERGY_MAX;
  }

  if (stateText) {
    stateText.textContent = STATE_NAMES[p.state] || '?';
  }

  if (cdMultiply) cdMultiply.textContent = formatMs(p.cooldownMultiply);
  if (cdStone) cdStone.textContent = formatMs(p.cooldownStone);
  if (cdHyper) cdHyper.textContent = formatMs(p.cooldownHyper);
  if (cdGiant) cdGiant.textContent = formatMs(p.cooldownGiant);
  if (cdSpin) cdSpin.textContent = formatMs(p.cooldownSpin);

  if (gameTimeEl) {
    const sec = Math.floor(gs.gameTime / 1000);
    gameTimeEl.textContent = sec + 's';
  }

  if (enemiesEl) {
    enemiesEl.textContent = gs.enemiesDefeated + ' / ' + CONFIG.ENEMIES_TO_DEFEAT;
  }

  if (winOverlay) {
    winOverlay.style.display = gs.phase === 'won' ? 'flex' : 'none';
  }

  if (loseOverlay) {
    loseOverlay.style.display = gs.phase === 'lost' ? 'flex' : 'none';
  }

  if (btnRestart && (gs.phase === 'won' || gs.phase === 'lost')) {
    btnRestart.onclick = () => window.location.reload();
  }
}
