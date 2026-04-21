// ===========================
//  bossShared/targeting.js
//  Faction / team / hostility / target-collection helpers.
//  Previously duplicated / ad-hoc across each Boss file; centralized here
//  so Boss1-6 can share a single implementation.
// ===========================

/**
 * Map a unit's faction to its "team":
 *   'player' / 'ally'  → 'good'
 *   anything else ('enemy', undefined) → 'bad'
 * Used to unify player-vs-enemy logic for AoE skills and target selection.
 *
 * Convention: the player has no `.faction` field → defaults to 'player'/'good'.
 */
export function targetTeam(u) {
  const f = u.faction || 'player';
  return (f === 'player' || f === 'ally') ? 'good' : 'bad';
}

/** True iff `src` and `tgt` belong to opposite teams. */
export function isHostileTo(src, tgt) {
  return targetTeam(src) !== targetTeam(tgt);
}

/**
 * A unit is "targetable" if it's alive, not hidden, and not mid-launch. Launched
 * targets cannot be selected, cannot be threat targets, and cannot take AoE
 * damage during flight (they take the dedicated fall damage on landing).
 */
export function isTargetable(t) {
  return t && t.hp > 0 && !t.hidden && !t.launched;
}

/**
 * Collect every unit currently hostile to `src` AND targetable. Used by shadow
 * traps, tentacle launch pick, etc. to pick a valid target.
 *
 * @param src        — the source boss (or any unit with a faction)
 * @param P          — the player (may be null)
 * @param enemies    — array of enemy units (may be null/undefined)
 * @param otherBoss  — another boss entity, or an array of them, or null
 */
export function collectHostiles(src, P, enemies, otherBoss) {
  const list = [];
  if (P && isTargetable(P) && isHostileTo(src, P)) list.push(P);
  if (enemies) {
    for (const e of enemies) {
      if (isTargetable(e) && isHostileTo(src, e)) list.push(e);
    }
  }
  if (otherBoss) {
    if (Array.isArray(otherBoss)) {
      for (const ob of otherBoss) {
        if (ob && isTargetable(ob) && isHostileTo(src, ob)) list.push(ob);
      }
    } else if (isTargetable(otherBoss) && isHostileTo(src, otherBoss)) {
      list.push(otherBoss);
    }
  }
  return list;
}

/**
 * Find the closest hostile within `maxDist` of (x, y). Returns null if none.
 * Distance check accounts for target radius so "reach" feels consistent across
 * small grunts and big bosses.
 */
export function nearestHostile(src, x, y, maxDist, P, enemies, otherBoss) {
  let best = null, bestD = maxDist;
  for (const h of collectHostiles(src, P, enemies, otherBoss)) {
    const hR = h === P ? P.radius : (h.radius || 12);
    const d = Math.hypot(h.x - x, h.y - y) - hR;
    if (d < bestD) { best = h; bestD = d; }
  }
  return best;
}

/**
 * Count hostiles within `radius` of (x, y). Used by Boss6 tentacle group-aware
 * targeting (picks densest landing spot).
 */
export function countHostilesNear(src, x, y, radius, P, enemies, otherBoss) {
  let n = 0;
  for (const h of collectHostiles(src, P, enemies, otherBoss)) {
    if (Math.hypot(h.x - x, h.y - y) < radius + (h.radius || 12)) n++;
  }
  return n;
}

/**
 * Historically GameScene passed a SINGLE otherBoss to each boss's update(), or
 * the full array only to Boss5 (via `boss.isBoss5` flag). Now GameScene
 * uniformly passes an array; bosses that still do per-field access on
 * otherBoss can call `pickFirstBoss(otherBoss)` at the top of their update
 * to get back the single-boss value they expect.
 *
 * Returns the first element of an array, or the value itself if not an array,
 * or null if empty/undefined.
 */
export function pickFirstBoss(otherBoss) {
  if (Array.isArray(otherBoss)) return otherBoss[0] || null;
  return otherBoss || null;
}
