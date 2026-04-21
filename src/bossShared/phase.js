// ===========================
//  bossShared/phase.js
//  Pick a value from 3 alternatives based on boss phase (1/2/3).
// ===========================

/**
 * Select p1 / p2 / p3 based on boss.phase. Defaults to p1 for phase < 1.
 * Both `phaseCount` (# of skill instances) and `phaseCD` (cooldown) share
 * this same implementation — they're historically named differently but
 * behave identically.
 */
export function phaseSelect(b, p1, p2, p3) {
  return b.phase === 1 ? p1 : (b.phase === 2 ? p2 : p3);
}

// Legacy aliases (some call sites use these specific names — kept as thin
// re-exports so migration is a drop-in). Prefer `phaseSelect` in new code.
export const phaseCount = phaseSelect;
export const phaseCD    = phaseSelect;
