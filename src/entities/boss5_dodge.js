// ===========================
//  Boss 5 AI — Bullet Dodge Scanning
//  Closest-Point-of-Approach (CPA) algorithm for detecting
//  bullet threats and finding the safest 16-direction escape.
// ===========================
import { clamp } from '../utils.js';
import { B5, normalize } from './boss5_shared.js';

/**
 * Simulate boss moving (dx*steps, dy*steps) and recompute total CPA threat
 * at that new position. Used to evaluate 16 candidate escape directions.
 */
function evalThreatIfMoved(bx, by, dx, dy, steps, bullets, dodgeRadius, lookahead) {
  const nx = bx + dx * steps;
  const ny = by + dy * steps;
  let totalThreat = 0;
  for (let i = 0; i < bullets.length; i++) {
    const bul = bullets[i];
    // Skip bullets that can't hurt boss5: enemy-faction non-friendly bullets are harmless
    if (bul.faction === 'enemy' && !bul.friendly) continue;
    if (!bul.vx && !bul.vy) continue;
    // Project bullet forward by the same number of steps
    const bx2 = bul.x + bul.vx * steps;
    const by2 = bul.y + bul.vy * steps;
    const rx = nx - bx2;
    const ry = ny - by2;
    const rvx = -bul.vx;
    const rvy = -bul.vy;
    const vDotV = rvx * rvx + rvy * rvy;
    if (vDotV < 0.01) continue;
    const ttc = -(rx * rvx + ry * rvy) / vDotV;
    if (ttc < 0 || ttc > lookahead) continue;
    const cpX = rx + rvx * ttc;
    const cpY = ry + rvy * ttc;
    const cpaDist = Math.hypot(cpX, cpY);
    if (cpaDist > dodgeRadius) continue;
    const dmg = bul.damage || bul.dmg || 10;
    const distFactor = 1 - (cpaDist / dodgeRadius);
    const timeFactor = 1 - (ttc / lookahead);
    totalThreat += distFactor * timeFactor * (dmg / 10);
  }
  return totalThreat;
}

/**
 * Scan all incoming bullets and compute a threat assessment for Boss.
 * Uses Closest Point of Approach (CPA) to determine which bullets will
 * pass near the Boss and when. If threats are detected, evaluates 16
 * candidate directions (with wall penalties) and picks the safest one.
 */
export function scanBulletThreats(b, bullets, arena) {
  const dodgeRadius = B5.DODGE_RADIUS || 80;
  const lookahead = B5.DODGE_LOOKAHEAD || 40;
  const result = {
    threatLevel: 0,
    bestDodgeAngle: null,
    bulletCount: 0,
    dodgeX: 0,
    dodgeY: 0,
  };

  if (!bullets || bullets.length === 0) return result;

  let maxThreat = 0;
  let threatCount = 0;

  for (let i = 0; i < bullets.length; i++) {
    const bul = bullets[i];
    if (bul.faction === 'enemy' && !bul.friendly) continue;
    if (!bul.vx && !bul.vy) continue;

    const rx = b.x - bul.x;
    const ry = b.y - bul.y;
    const rvx = -bul.vx;
    const rvy = -bul.vy;

    const vDotV = rvx * rvx + rvy * rvy;
    if (vDotV < 0.01) continue;
    const ttc = -(rx * rvx + ry * rvy) / vDotV;
    if (ttc < 0 || ttc > lookahead) continue;

    const cpX = rx + rvx * ttc;
    const cpY = ry + rvy * ttc;
    const cpaDist = Math.hypot(cpX, cpY);
    if (cpaDist > dodgeRadius) continue;

    const dmg = bul.damage || bul.dmg || 10;
    const distFactor = 1 - (cpaDist / dodgeRadius);
    const timeFactor = 1 - (ttc / lookahead);
    const threat = distFactor * timeFactor * (dmg / 10);

    if (threat > 0.01) {
      threatCount++;
      if (threat > maxThreat) maxThreat = threat;
    }
  }

  if (threatCount > 0) {
    // === 16-direction safety scan ===
    // Evaluate each candidate direction by simulating movement and recomputing
    // total CPA threat at that new position. Pick the direction with lowest
    // combined score (threat + wall penalty).
    const scanSteps = 16;
    const margin = B5.CORNER_MARGIN || 60;
    const dirCount = 16;
    let bestScore = Infinity;
    let bestDx = 0, bestDy = 0;

    for (let i = 0; i < dirCount; i++) {
      const angle = (i / dirCount) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      // Wall avoidance: add penalty if simulated position clips out of bounds,
      // but keep direction magnitude unit-length so threat scores stay comparable.
      const nx = b.x + dx * scanSteps;
      const ny = b.y + dy * scanSteps;
      let wallPenalty = 0;
      if (nx < margin) wallPenalty += (margin - nx) * 0.03;
      else if (nx > arena.W - margin) wallPenalty += (nx - (arena.W - margin)) * 0.03;
      if (ny < margin) wallPenalty += (margin - ny) * 0.03;
      else if (ny > arena.H - margin) wallPenalty += (ny - (arena.H - margin)) * 0.03;

      const score = evalThreatIfMoved(b.x, b.y, dx, dy, scanSteps, bullets, dodgeRadius * 1.3, lookahead) + wallPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestDx = dx;
        bestDy = dy;
      }
    }

    const n = normalize(bestDx, bestDy);
    result.dodgeX = n.x;
    result.dodgeY = n.y;
    result.bestDodgeAngle = Math.atan2(n.y, n.x);
  }

  result.threatLevel = clamp(maxThreat + threatCount * 0.1, 0, 1.5);
  result.bulletCount = threatCount;
  return result;
}
