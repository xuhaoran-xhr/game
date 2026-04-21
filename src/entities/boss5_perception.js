// ===========================
//  Boss 5 AI — Perception & Target Memory
//  Builds a snapshot of the tactical situation each frame:
//  target state, movement history, aggression/mobility scores,
//  position prediction, and corner detection.
// ===========================
import { ang, clamp, dist } from '../utils.js';
import {
  B5, normalize, getEntityCornerState,
  isTargetRolling, isTargetCharging, isTargetAttacking, isTargetLowHp,
} from './boss5_shared.js';

/**
 * Build the per-frame perception snapshot used by the decision engine.
 * Also maintains target history, aggression/mobility scores, and the
 * predicted future position used by ranged attacks / positioning.
 */
export function updateBoss5Perception(b, target, arena) {
  if (!target) {
    b.trackedTargetRef = null;
    b.targetHistory = [];
    b.predictedTargetPos = null;
    return {
      hasTarget: false,
      target: null,
      distance: Infinity,
      predictedDistance: Infinity,
      directAngle: b.angle || 0,
      aimAngle: b.angle || 0,
      predictedTargetPos: null,
      targetCornered: false,
      selfCornered: false,
      targetRolling: false,
      targetCharging: false,
      targetAttacking: false,
      justRolled: false,
      recentlyRolled: false,
      recentlyAttacked: false,
      recentlyCharged: false,
      targetAggressionScore: 0,
      targetMobilityScore: 0,
      targetLowHp: false,
      stableMovement: false,
      earlyRoller: false,
      bulletThreats: null,
    };
  }

  // Reset history when the target identity changes (e.g. charm toggles)
  if (b.trackedTargetRef && b.trackedTargetRef !== target) {
    b.targetHistory = [];
    b.lastTargetRolling = false;
    b.lastTargetAttacking = false;
    b.lastTargetCharging = false;
  }
  b.trackedTargetRef = target;

  const rolling = isTargetRolling(target);
  const charging = isTargetCharging(target);
  const attacking = isTargetAttacking(target);
  const lastSample = b.targetHistory[b.targetHistory.length - 1];
  const vx = lastSample ? target.x - lastSample.x : 0;
  const vy = lastSample ? target.y - lastSample.y : 0;

  // Record state-transition timestamps so we can detect "just X" windows
  if (rolling && !b.lastTargetRolling) b.lastSeenRollTime = b.aiClock;
  if (charging && !b.lastTargetCharging) b.lastSeenChargeTime = b.aiClock;
  if (attacking && !b.lastTargetAttacking) b.lastSeenAttackTime = b.aiClock;
  if (b.lastTargetRolling && !rolling) b.lastSeenRollEndTime = b.aiClock;
  if (b.lastTargetCharging && !charging) b.lastSeenChargeEndTime = b.aiClock;
  if (b.lastTargetAttacking && !attacking) b.lastSeenAttackEndTime = b.aiClock;
  b.lastTargetRolling = rolling;
  b.lastTargetCharging = charging;
  b.lastTargetAttacking = attacking;

  b.targetHistory.push({
    x: target.x,
    y: target.y,
    vx,
    vy,
    rolling,
    charging,
    attacking,
    distance: dist(b, target),
  });

  const historyOverflow = b.targetHistory.length - (B5.TARGET_MEMORY_FRAMES || 90);
  if (historyOverflow > 0) b.targetHistory.splice(0, historyOverflow);

  // Iterate last N samples via index loop to avoid per-frame Array.slice() allocation
  const histLen = b.targetHistory.length;
  const sampleCount = Math.min(24, histLen);
  const sliceStart = histLen - sampleCount;
  let avgVx = 0;
  let avgVy = 0;
  let avgSpeed = 0;
  let aggressionSum = 0;
  let lateralSum = 0;
  let rollFrames = 0;
  let attackFrames = 0;
  let chargeFrames = 0;
  let farRollFrames = 0;

  for (let i = sliceStart; i < histLen; i++) {
    const sample = b.targetHistory[i];
    const speed = Math.hypot(sample.vx, sample.vy);
    avgVx += sample.vx;
    avgVy += sample.vy;
    avgSpeed += speed;

    if (sample.rolling) {
      rollFrames++;
      if (sample.distance > B5.MELEE_RANGE * 1.1) farRollFrames++;
    }
    if (sample.attacking) attackFrames++;
    if (sample.charging) chargeFrames++;

    if (speed > 0.05) {
      const vel = normalize(sample.vx, sample.vy);
      const toBoss = normalize(b.x - sample.x, b.y - sample.y);
      aggressionSum += Math.max(0, vel.x * toBoss.x + vel.y * toBoss.y);
      lateralSum += Math.abs(vel.x * toBoss.y - vel.y * toBoss.x);
    }
  }

  const denom = sampleCount || 1;
  avgVx /= denom;
  avgVy /= denom;
  avgSpeed /= denom;

  const aggression = clamp(
    aggressionSum / denom * 0.65 +
    attackFrames / denom * 0.55 +
    chargeFrames / denom * 0.45,
    0, 1,
  );
  const mobility = clamp(
    avgSpeed / 6 * 0.65 +
    rollFrames / denom * 1.35 +
    lateralSum / denom * 0.4,
    0, 1,
  );

  b.targetAggressionScore = aggression;
  b.targetMobilityScore = mobility;

  // Predict where the target will be in N frames, scaled by their mobility.
  // Used by charge slash and movement vector for lead-aim.
  const predictFrames = clamp(
    Math.round((B5.CHARGE_PREDICT_TIME || 18) * (0.7 + mobility * 0.55)),
    8,
    B5.PREDICTION_CLAMP || 22,
  );
  const radius = target.radius || 0;
  const predictedTargetPos = {
    x: clamp(target.x + avgVx * predictFrames, radius, arena.W - radius),
    y: clamp(target.y + avgVy * predictFrames, radius, arena.H - radius),
  };
  b.predictedTargetPos = predictedTargetPos;

  const targetCornerState = getEntityCornerState(target, arena.W, arena.H);
  const selfCornerState = getEntityCornerState(b, arena.W, arena.H);

  return {
    hasTarget: true,
    target,
    distance: dist(b, target),
    predictedDistance: dist(b, predictedTargetPos),
    directAngle: ang(b, target),
    aimAngle: ang(b, predictedTargetPos),
    predictedTargetPos,
    targetCornered: targetCornerState.cornered,
    selfCornered: selfCornerState.cornered,
    targetRolling: rolling,
    targetCharging: charging,
    targetAttacking: attacking,
    justRolled: b.aiClock - b.lastSeenRollEndTime <= (B5.ROLL_PUNISH_WINDOW || 24),
    recentlyRolled: b.aiClock - b.lastSeenRollTime <= (B5.ROLL_PUNISH_WINDOW || 24),
    recentlyAttacked: attacking || b.aiClock - b.lastSeenAttackEndTime <= (B5.EXEC_PUNISH_WINDOW || 18),
    recentlyCharged: charging || b.aiClock - b.lastSeenChargeEndTime <= (B5.EXEC_PUNISH_WINDOW || 18),
    targetAggressionScore: aggression,
    targetMobilityScore: mobility,
    targetLowHp: isTargetLowHp(target),
    stableMovement: Math.hypot(avgVx, avgVy) > 0.7,
    earlyRoller: farRollFrames >= Math.max(2, Math.floor(denom * 0.12)),
    bulletThreats: null, // Filled in by caller after scanning bullets
  };
}
