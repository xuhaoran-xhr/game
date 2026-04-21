// ===========================
//  bossShared/aoe.js
//  Generic AoE damage helper used by boss skills.
// ===========================

import { isHostileTo } from './targeting.js';

/**
 * Apply AoE damage centered on (x, y) with `radius` to every unit hostile to
 * the source boss `src`:
 *   - player (if boss is hostile to the player's team)
 *   - enemies (matching hostility)
 *   - otherBoss (single or array; if opposite team)
 *
 * Targets are skipped when:
 *   - hidden / invincible / launched (for player, also checked)
 *   - dead (hp <= 0)
 *
 * `onHit(target)` is called per successful hit for custom particle/FX work.
 */
export function applyAoEDamage(src, x, y, radius, damage, P, enemies, otherBoss, gameState, onHit) {
  // --- Player ---
  if (P && !P.hidden && !P.invincible && !P.launched && isHostileTo(src, P)) {
    if (Math.hypot(P.x - x, P.y - y) < P.radius + radius) {
      gameState.dmgPlayer(damage);
      if (onHit) onHit(P);
    }
  }
  // --- Enemies (grunts) ---
  if (enemies) {
    for (const e of enemies) {
      if (!e || e.hp <= 0 || e.launched) continue;
      if (!isHostileTo(src, e)) continue;
      if (Math.hypot(e.x - x, e.y - y) < (e.radius || 12) + radius) {
        e.hp -= damage;
        e.hitFlash = 6;
        if (onHit) onHit(e);
      }
    }
  }
  // --- Other boss(es) ---
  if (otherBoss) {
    const list = Array.isArray(otherBoss) ? otherBoss : [otherBoss];
    for (const ob of list) {
      if (!ob || ob.hp <= 0 || ob.launched) continue;
      if (!isHostileTo(src, ob)) continue;
      if (Math.hypot(ob.x - x, ob.y - y) < (ob.radius || 30) + radius) {
        ob.hp -= damage;
        ob.hitFlash = 6;
        if (onHit) onHit(ob);
      }
    }
  }
}
