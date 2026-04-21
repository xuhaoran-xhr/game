// ===========================
//  bossRegistry.js
//  Central registry of all bosses — maps numeric ID → factory + metadata.
//
//  Before: GameScene had 6 copy-pasted spawnBoss1..6() methods,
//          customSpawnUnit had a 6-way if/else chain,
//          spawnBossRushRound had another 6-way chain,
//          WaveManager had a 6-case switch.
//  After:  every call site uses `createBoss(id, W, H, wave)` and/or
//          `BOSS_META[id].spawnText` for labeling.
// ===========================

import { createBoss1, updateBoss1, drawBoss1 } from './Boss1.js';
import { createBoss2, updateBoss2, drawBoss2 } from './Boss2.js';
import { createBoss3, updateBoss3, drawBoss3 } from './Boss3.js';
import { createBoss4, updateBoss4, drawBoss4 } from './Boss4.js';
import { createBoss5, updateBoss5, drawBoss5 } from './Boss5.js';
import { createBoss6, updateBoss6, drawBoss6 } from './Boss6.js';

/**
 * Per-boss metadata:
 *   id           — numeric id (1-6), also the key
 *   name         — short Chinese name for HUD / logs
 *   spawnText    — full ⚠..⚠ label shown on spawn
 *   particleColor — color for custom-mode spawn particles
 *   create       — factory (W, H, wave) → boss state
 *   update       — per-frame update (kept as reference; `boss.updateFn` is
 *                  still the canonical runtime dispatch so this is informational)
 *   draw         — ditto for drawFn
 */
export const BOSS_META = Object.freeze({
  1: {
    id: 1,
    name: '毁灭者-K',
    spawnText: '⚠ BOSS 降临 ⚠',
    particleColor: '#ff2244',
    create: createBoss1,
    update: updateBoss1,
    draw:   drawBoss1,
  },
  2: {
    id: 2,
    name: '幻影织网者',
    spawnText: '⚠ 幻影织网者 ⚠',
    particleColor: '#00ffcc',
    create: createBoss2,
    update: updateBoss2,
    draw:   drawBoss2,
  },
  3: {
    id: 3,
    name: '星核守卫',
    spawnText: '⚠ 星核守卫 ⚠',
    particleColor: '#FFD700',
    create: createBoss3,
    update: updateBoss3,
    draw:   drawBoss3,
  },
  4: {
    id: 4,
    name: 'PROTOCOL OMEGA',
    spawnText: '⚠ PROTOCOL OMEGA ⚠',
    particleColor: '#00ffff',
    create: createBoss4,
    update: updateBoss4,
    draw:   drawBoss4,
  },
  5: {
    id: 5,
    name: '堕落幽影',
    spawnText: '⚠ 堕落幽影 ⚠',
    particleColor: '#8800ff',
    create: createBoss5,
    update: updateBoss5,
    draw:   drawBoss5,
  },
  6: {
    id: 6,
    name: '深渊术士',
    spawnText: '⚠ 深渊术士 降临 ⚠',
    particleColor: '#a040ff',
    create: createBoss6,
    update: updateBoss6,
    draw:   drawBoss6,
  },
});

/** Total number of distinct bosses — used by wave rotation math. */
export const BOSS_COUNT = Object.keys(BOSS_META).length;

/**
 * Create a boss by numeric id. Throws for unknown ids so rotation math bugs
 * surface immediately rather than silently fall through.
 */
export function createBoss(id, W, H, wave) {
  const meta = BOSS_META[id];
  if (!meta) throw new Error(`Unknown boss id: ${id}`);
  return meta.create(W, H, wave);
}

/**
 * Map a custom-mode unit type string like 'boss3' → numeric id 3.
 * Returns null if the type is not a boss string.
 */
export function bossIdFromType(type) {
  if (typeof type !== 'string' || !type.startsWith('boss')) return null;
  const n = parseInt(type.slice(4), 10);
  return (n >= 1 && n <= BOSS_COUNT) ? n : null;
}
