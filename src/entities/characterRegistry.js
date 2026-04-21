// ===========================
//  characterRegistry.js
//  Central registry of player-controllable characters. Mirrors
//  bossRegistry.js — gives a single place to add future characters
//  (e.g. a wizard) without touching GameScene's dispatch.
//
//  NOTE: update/draw are NOT dispatched through the registry because
//  the two characters take different argument shapes (Player uses a
//  Phaser Graphics object, Berserker renders to a 2D canvas + DOM).
//  Unifying those would either require lossy wrappers or a larger
//  refactor; the minimal win here is centralizing create + reset and
//  replacing the `P.isBerserker` boolean with a semantic `P.type`.
// ===========================

import { createPlayer, resetPlayer } from './Player.js';
import { createBerserker, resetBerserker } from './Berserker.js';

export const CHARACTER_META = Object.freeze({
  ranged: {
    type: 'ranged',
    create: createPlayer,
    reset:  resetPlayer,
  },
  melee: {
    type: 'melee',
    create: createBerserker,
    reset:  resetBerserker,
  },
});

/** Create a character by type string. Throws on unknown.
 *  The concrete create* function sets `.type` itself so external callers
 *  that bypass this registry (e.g. direct createPlayer()) still get it. */
export function createCharacter(type, W, H) {
  const meta = CHARACTER_META[type];
  if (!meta) throw new Error(`Unknown character type: ${type}`);
  return meta.create(W, H);
}

/** Reset a character in place. Dispatches by `P.type`. */
export function resetCharacter(P, W, H) {
  const meta = CHARACTER_META[P.type];
  if (!meta) throw new Error(`Unknown character type: ${P.type}`);
  meta.reset(P, W, H);
}
