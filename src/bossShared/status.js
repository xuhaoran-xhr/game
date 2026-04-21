// ===========================
//  bossShared/status.js
//  Status-effect early-return boilerplate for boss update() loops.
//
//  Before:  each boss duplicated 15 lines of charmed/snared/launched
//  handling at the top of its update().
//  After:   bosses call `if (tickBossStatus(b)) return;` — 1 line.
// ===========================

/**
 * Handle per-frame status ticks that may short-circuit a boss's normal AI:
 *
 *   - `b.charmed` (>0): decrement; flip faction back to 'enemy' when expires.
 *                       Charmed bosses still act, just against their "friends".
 *   - `b.snared`  (>0): decrement; FREEZE vx/vy and return true → caller
 *                       short-circuits and skips the rest of update().
 *   - `b.launched`    : a tentacle launch is active. Position/scale are
 *                       driven externally; FREEZE vx/vy and return true.
 *   - `b.hitFlash`(>0): decrement hit-flash timer (visual only).
 *
 * Returns true if the caller should early-return immediately
 * (i.e. boss is snared or launched).
 */
export function tickBossStatus(b) {
  // Hit-flash always ticks down, regardless of CC.
  b.hitFlash = Math.max(0, (b.hitFlash || 0) - 1);

  // Charmed counter: independent of snare/launch, always progresses
  // (so CC doesn't extend charm time artificially).
  if (b.charmed > 0) {
    b.charmed--;
    if (b.charmed <= 0 && b.faction === 'ally') b.faction = 'enemy';
  }

  // Snare: freeze position, skip AI.
  if (b.snared && b.snared > 0) {
    b.snared--;
    b.vx = 0; b.vy = 0;
    return true;
  }

  // Launched: position + scale are driven by the launcher's tickLaunched.
  // Freeze velocity so any residual impulse doesn't fight the parabolic arc.
  if (b.launched) {
    b.vx = 0; b.vy = 0;
    return true;
  }

  return false;
}
