// ===========================
//  NEON OPS — Utility Functions
// ===========================

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => Math.random() * (b - a) + a;
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Find the nearest enemy-faction target for an ally boss to attack.
 * Also considers another boss (otherBoss) as a valid target if enemy-faction.
 * Returns { target, dist } or { target: null, dist: Infinity } if none.
 */
export function getCharmedTarget(boss, enemies, otherBoss) {
  let best = null;
  let bestDist = Infinity;
  if (enemies) {
    for (const e of enemies) {
      if (e.faction !== 'enemy') continue;
      const d = dist(boss, e);
      if (d < bestDist) { bestDist = d; best = e; }
    }
  }
  // Also consider other boss(es) as targets (supports both single boss and array)
  const bossList = Array.isArray(otherBoss) ? otherBoss : (otherBoss ? [otherBoss] : []);
  for (const ob of bossList) {
    if (ob.hp > 0 && ob.entered !== false && ob.faction === 'enemy') {
      const d = dist(boss, ob);
      if (d < bestDist) { bestDist = d; best = ob; }
    }
  }
  return { target: best, dist: bestDist };
}
