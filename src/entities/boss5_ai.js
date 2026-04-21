// ===========================
//  Boss 5 AI — Decision & Strategy (entry point)
//
//  Thin orchestration layer: consumes perception + dodge snapshots,
//  scores 11 candidate actions, commits the winning decision, and
//  translates the resulting intent into a movement vector.
//
//  Split into sibling modules for maintainability:
//    ./boss5_shared.js      — shared utilities + action set constants
//    ./boss5_dodge.js       — CPA bullet threat scanning
//    ./boss5_perception.js  — target memory, prediction, snapshot
// ===========================
import { clamp } from '../utils.js';
import {
  B5, COMBO_ACTIONS, MOVEMENT_ACTIONS, ATTACK_ACTIONS,
  normalize,
} from './boss5_shared.js';

// Re-export public API so existing imports (`from './boss5_ai.js'`) keep working
export { scanBulletThreats } from './boss5_dodge.js';
export { updateBoss5Perception } from './boss5_perception.js';

// ========== SCORES table ==========
// Fallback used if config.BOSS5.SCORES is missing / corrupted, so the AI
// still runs on older configs. Config wins when both are present.
const DEFAULT_SCORES = {
  observe:     { base: 8,  phase1: 12, lateGame: 3,  inPressure: 6,  outPressure: -8,  aggroMult: 10,  cornered: -6, tooFar: -8 },
  stalk:       { base: 3,  inBand: 22, outBand: -18, afterAttack: 14, recoverBoost: 16, phase1: 6, phase2Plus: 10, aggroMult: -6, lowHp: -14, enraged: -10, selfCorner: -12, targetCorner: -6, bulletThreat: -14 },
  strafe:      { base: 4,  inPressure: 12, outPressure: -10, mobMult: 10, aggroMult: 0.45, selfCorner: -10, tooFar: -14 },
  approach:    { base: 6,  outRange: 22, inRange: 4,  beyondChase: 14, aggroMult: 0.55, charging: -6, veryFar: 10, bulletThreat: -12 },
  baitRoll:    { phase2: 10, phase1: -4, earlyRoller: 18, inPressure: 8, outPressure: -14, feintMult: 10, inMelee: -4, tooFar: -12 },
  punish:      { justRolled: 24, recentAttack: 14, recentCharge: 16, inRange: 14, outRange: -10, aggroMult: 0.65 },
  reset:       { selfCorner: 18, missed: 22, highPressure: 10, targetCorner: -8, enraged: 6 },
  dodge:       { high: 28, low: -20, countMult: 4, threatMult: 20, meleeCrit: -12, meleeNormal: -30, phase2Plus: 6, justRolled: -10, charging: 24 },
  shadowStep:  { hitFlash: 26, charging: 18, selfCorner: 12, punishCombo: 8, critBullet: 30, multiBullet: 12 },
  normalCombo: { inMelee: 24, outMelee: -16, justRolled: 18, notRolling: 8, rolling: -18, phase1: 8, tooFar: -12 },
  frenzyCombo: { inMelee: 22, outMelee: -18, cornered: 12, justRolled: 10, phase2Plus: 8, enraged: 8 },
  chargeSlash: { predictFar: 16, predictNear: -14, charging: 18, stable: 10, cornered: 8, aggroMult: 0.55, enraged: 6 },
  execution:   { sweetSpot: 18, badRange: -20, justRolled: 24, recentCharge: 22, recentAttack: 14, cornered: 12, lowHp: 10, rolling: -16, aggroMult: 0.85 },
};
const SCORES = B5.SCORES || DEFAULT_SCORES;

// ========== Helpers ==========

function getRepeatPenalty(b, action) {
  const penaltyBase = B5.REPEAT_ACTION_PENALTY || 0;
  const recent = b.actionHistory || [];
  const start = Math.max(0, recent.length - 2);
  let penalty = 0;
  for (let i = start; i < recent.length; i++) {
    const entry = recent[i];
    if (entry.action === action) penalty += penaltyBase;
    if (COMBO_ACTIONS.has(entry.action) && COMBO_ACTIONS.has(action)) penalty += penaltyBase * 0.35;
    if (MOVEMENT_ACTIONS.has(entry.action) && MOVEMENT_ACTIONS.has(action)) penalty += penaltyBase * 0.35;
  }
  return penalty;
}

function getActionTiming(action) {
  switch (action) {
    case 'observe':
      return { duration: B5.OBSERVE_TIME, cooldown: Math.max(8, Math.floor(B5.DECISION_INTERVAL * 0.8)) };
    case 'stalk':
      return { duration: B5.STALK_TIME || 54, cooldown: Math.max(10, Math.floor(B5.DECISION_INTERVAL * 0.9)) };
    case 'strafePressure':
      return { duration: B5.PRESSURE_TIME, cooldown: B5.DECISION_INTERVAL };
    case 'approach':
      return { duration: B5.DECISION_INTERVAL, cooldown: Math.max(8, Math.floor(B5.DECISION_INTERVAL * 0.7)) };
    case 'baitRoll':
      return { duration: Math.max(16, Math.floor(B5.OBSERVE_TIME * 0.8)), cooldown: B5.DECISION_INTERVAL };
    case 'punish':
      return { duration: Math.max(12, Math.floor(B5.DECISION_INTERVAL * 0.9)), cooldown: Math.max(6, Math.floor(B5.DECISION_INTERVAL * 0.5)) };
    case 'reset':
      return { duration: B5.RESET_TIME, cooldown: B5.DECISION_INTERVAL };
    case 'dodgeBullets':
      return { duration: Math.max(12, Math.floor(B5.DECISION_INTERVAL * 0.6)), cooldown: Math.max(6, Math.floor(B5.DECISION_INTERVAL * 0.4)) };
    default:
      return { duration: B5.INTENT_LOCK_FRAMES, cooldown: B5.DECISION_INTERVAL + 4 };
  }
}

function getShadowStepAngle(b, snapshot) {
  const side = b.strafeDir || 1;
  // If bullet threat exists, trust the 16-direction best dodge scan directly
  // (keeps shadowStep consistent with movement-vector dodge).
  if (snapshot.bulletThreats && snapshot.bulletThreats.bestDodgeAngle !== null) {
    return snapshot.bulletThreats.bestDodgeAngle;
  }
  if (snapshot.selfCornered) return snapshot.directAngle + Math.PI + side * 0.5;
  if (snapshot.targetCornered || snapshot.justRolled) return snapshot.directAngle + side * 0.9;
  if (snapshot.targetCharging) return snapshot.directAngle + Math.PI + side * 0.8;
  return snapshot.directAngle + Math.PI + side * 0.45;
}

// ========== Tactical State Machine ==========
//
// Adds a meta-layer above the per-frame intent scoring. Keeps boss behavior
// coherent across multi-frame sequences (commit attack → recover → pressure)
// and prevents "flip-flop" decisions under close scoring ties.
//
//   pressure   — default; scoring applied as-is
//   commit     — boss is mid-attack; only defensive actions can interrupt
//   recover    — post-attack vulnerability window; attack scores dampened
//   reposition — moving to a better position (after `reset`); attack scores dampened

function tickTacticalState(b) {
  // Rolling mid-commit (emergency shadow-step) breaks us out early
  if (b.tacticalState === 'commit' && b.rolling) {
    b.tacticalState = 'pressure';
    b.tacticalTimer = 0;
    return;
  }
  if (b.tacticalTimer > 0) {
    b.tacticalTimer--;
    return;
  }

  if (b.tacticalState === 'commit') {
    // Stay in commit while attack animations are still running
    if (b.swinging || b.charging || b.executing || b.chargeDashing) return;
    b.tacticalState = 'recover';
    b.tacticalTimer = B5.RECOVER_DURATION || 24;
    return;
  }

  if (b.tacticalState === 'recover' || b.tacticalState === 'reposition') {
    b.tacticalState = 'pressure';
  }
}

function applyTacticalModifiers(b, scores) {
  const state = b.tacticalState || 'pressure';
  if (state === 'commit') {
    // Lock into committed sequence: only defensive actions can override.
    // Subtracting 60 keeps NEGATIVE_INFINITY untouched (it stays unreachable).
    for (const key in scores) {
      if (key === 'shadowStep' || key === 'dodgeBullets') continue;
      if (Number.isFinite(scores[key])) scores[key] -= 60;
    }
  } else if (state === 'recover') {
    // Post-attack: avoid committing to another heavy attack; favour spacing
    // and the stalk standoff — the signature Soulslike read-tell moment.
    const damp = ['punish', 'normalCombo', 'frenzyCombo', 'chargeSlash', 'execution'];
    const boost = ['observe', 'strafePressure', 'shadowStep'];
    for (const k of damp) if (Number.isFinite(scores[k])) scores[k] *= 0.6;
    for (const k of boost) if (Number.isFinite(scores[k])) scores[k] *= 1.2;
    if (Number.isFinite(scores.stalk)) scores.stalk *= 1.55;
  } else if (state === 'reposition') {
    // Moving to a safer spot — delay commitment to attack until repositioned.
    const boost = ['observe', 'stalk', 'strafePressure', 'approach'];
    const damp = ['normalCombo', 'frenzyCombo', 'chargeSlash', 'execution'];
    for (const k of boost) if (Number.isFinite(scores[k])) scores[k] *= 1.3;
    for (const k of damp) if (Number.isFinite(scores[k])) scores[k] *= 0.7;
  }
}

// ========== AI State ==========

export function createBoss5AIState() {
  return {
    aiClock: 0,
    trackedTargetRef: null,
    targetHistory: [],
    predictedTargetPos: null,
    lastSeenRollTime: -9999,
    lastSeenRollEndTime: -9999,
    lastSeenAttackTime: -9999,
    lastSeenAttackEndTime: -9999,
    lastSeenChargeTime: -9999,
    lastSeenChargeEndTime: -9999,
    targetAggressionScore: 0,
    targetMobilityScore: 0,
    bossIntent: 'observe',
    bossIntentTimer: 0,
    actionHistory: [],
    decisionCooldown: 0,
    missedAttackCount: 0,
    lastAction: null,
    lastTargetRolling: false,
    lastTargetAttacking: false,
    lastTargetCharging: false,
    reactedToHitFlash: false,
    lastConsumedRollEndTime: -9999,
    lastConsumedAttackTime: -9999,
    lastConsumedChargeTime: -9999,
    strafeDir: Math.random() < 0.5 ? -1 : 1,
    lastBulletThreat: 0,  // Track last frame's bullet threat for reactivity
    // Tactical state machine (commit / recover / reposition / pressure)
    tacticalState: 'pressure',
    tacticalTimer: 0,
  };
}

export function tickBoss5AIState(b) {
  b.aiClock = (b.aiClock || 0) + 1;
  if (b.decisionCooldown > 0) b.decisionCooldown--;
  if (b.bossIntentTimer > 0) b.bossIntentTimer--;
  if (b.hitFlash <= 0) b.reactedToHitFlash = false;
  if (b.bossIntentTimer <= 0 && !b.swinging && !b.charging && !b.executing) {
    b.bossIntent = 'observe';
  }
  tickTacticalState(b);
}

export function shouldBoss5Reevaluate(b, snapshot) {
  if (!snapshot.hasTarget) return false;
  const interruptGrace = Math.max(3, Math.floor((B5.DECISION_INTERVAL || 18) * 0.35));

  if (b.hitFlash > 0 && !b.reactedToHitFlash) {
    b.reactedToHitFlash = true;
    return true;
  }
  if (snapshot.justRolled && b.lastConsumedRollEndTime !== b.lastSeenRollEndTime) {
    b.lastConsumedRollEndTime = b.lastSeenRollEndTime;
    return true;
  }
  if (snapshot.targetCharging && b.lastConsumedChargeTime !== b.lastSeenChargeTime) {
    b.lastConsumedChargeTime = b.lastSeenChargeTime;
    return true;
  }
  if (snapshot.targetAttacking && snapshot.distance < B5.MELEE_RANGE * 1.6 && b.lastConsumedAttackTime !== b.lastSeenAttackTime) {
    b.lastConsumedAttackTime = b.lastSeenAttackTime;
    return true;
  }
  // React to sudden bullet threat spike
  if (snapshot.bulletThreats) {
    const threatNow = snapshot.bulletThreats.threatLevel;
    const threatBefore = b.lastBulletThreat || 0;
    if (threatNow > (B5.DODGE_THREAT_THRESHOLD || 0.20) && threatNow - threatBefore > 0.15) {
      return true;
    }
  }

  if (b.decisionCooldown <= 0) return true;
  if (b.bossIntentTimer <= 0) return true;
  if (b.bossIntent === 'punish' && snapshot.distance < B5.MELEE_RANGE * 1.05 && b.decisionCooldown <= interruptGrace) return true;
  return false;
}

export function decideBoss5Action(b, snapshot) {
  if (!snapshot.hasTarget) return null;

  const phaseIndex = Math.max(0, Math.min((B5.AGGRESSION_PHASE_BONUS || []).length - 1, b.phase - 1));
  const phaseAggro = (B5.AGGRESSION_PHASE_BONUS || [0, 0, 0])[phaseIndex] || 0;
  const canRoll = b.rollCd <= 0;
  const canCombo = !b.swinging && b.swingCooldown <= 0;
  const canCharge = b.phase === 3 && b.chargeCd <= 0 && !b.swinging;
  const canExec = b.phase === 3 && b.execCd <= 0 && !b.swinging;
  const inMelee = snapshot.distance <= B5.MELEE_RANGE * 1.08;
  const inPressureBand = snapshot.distance > B5.MELEE_RANGE * 0.9 && snapshot.distance < B5.MELEE_RANGE * 2.5;
  const outOfRange = snapshot.distance > B5.MELEE_RANGE * 1.45;

  const bt = snapshot.bulletThreats || { threatLevel: 0, bulletCount: 0 };
  const highBulletThreat = bt.threatLevel > (B5.DODGE_THREAT_THRESHOLD || 0.20);
  const criticalBulletThreat = bt.threatLevel > (B5.SHADOW_STEP_THREAT || 0.58);

  // Stalk band — the sweet spot for reading player tells
  const stalkLow = B5.MELEE_RANGE * (B5.STALK_BAND_LOW || 1.15);
  const stalkHigh = B5.MELEE_RANGE * (B5.STALK_BAND_HIGH || 2.1);
  const inStalkBand = snapshot.distance >= stalkLow && snapshot.distance <= stalkHigh;

  // Shortcuts into SCORES table (each is a per-action weights object)
  const obs = SCORES.observe, stk = SCORES.stalk || {}, str = SCORES.strafe, app = SCORES.approach, br = SCORES.baitRoll;
  const pn = SCORES.punish, rs = SCORES.reset, dg = SCORES.dodge, ss = SCORES.shadowStep;
  const nc = SCORES.normalCombo, fc = SCORES.frenzyCombo, cs = SCORES.chargeSlash, ex = SCORES.execution;

  const scores = {
    observe: obs.base,
    stalk: stk.base || 0,
    strafePressure: str.base,
    approach: app.base,
    baitRoll: 0,
    punish: 0,
    reset: 0,
    dodgeBullets: 0,
    shadowStep: canRoll ? 0 : Number.NEGATIVE_INFINITY,
    normalCombo: canCombo && !b.frenzy ? 0 : Number.NEGATIVE_INFINITY,
    frenzyCombo: canCombo && b.frenzy ? 0 : Number.NEGATIVE_INFINITY,
    chargeSlash: canCharge ? 0 : Number.NEGATIVE_INFINITY,
    execution: canExec ? 0 : Number.NEGATIVE_INFINITY,
  };

  // === Observe ===
  scores.observe += b.phase === 1 ? obs.phase1 : obs.lateGame;
  scores.observe += inPressureBand ? obs.inPressure : obs.outPressure;
  scores.observe += snapshot.targetAggressionScore * obs.aggroMult;
  scores.observe += snapshot.targetCornered ? obs.cornered : 0;
  scores.observe += snapshot.distance > B5.MELEE_RANGE * 1.8 ? obs.tooFar : 0;

  // === Stalk (中距离对峙巡游, Soulslike 读招窗口) ===
  scores.stalk += inStalkBand ? (stk.inBand || 0) : (stk.outBand || 0);
  scores.stalk += snapshot.recentlyAttacked ? (stk.afterAttack || 0) : 0;
  scores.stalk += b.tacticalState === 'recover' ? (stk.recoverBoost || 0) : 0;
  scores.stalk += b.phase === 1 ? (stk.phase1 || 0) : (stk.phase2Plus || 0);
  scores.stalk += snapshot.targetAggressionScore * (stk.aggroMult || 0);
  scores.stalk += snapshot.targetLowHp ? (stk.lowHp || 0) : 0;
  scores.stalk += b.enraged ? (stk.enraged || 0) : 0;
  scores.stalk += snapshot.selfCornered ? (stk.selfCorner || 0) : 0;
  scores.stalk += snapshot.targetCornered ? (stk.targetCorner || 0) : 0;
  scores.stalk += highBulletThreat ? (stk.bulletThreat || 0) : 0;

  // === Strafe Pressure ===
  scores.strafePressure += inPressureBand ? str.inPressure : str.outPressure;
  scores.strafePressure += snapshot.targetCornered ? (B5.CORNER_PRESSURE_BONUS || 0) : 0;
  scores.strafePressure += snapshot.targetMobilityScore * str.mobMult;
  scores.strafePressure += phaseAggro * str.aggroMult;
  scores.strafePressure += snapshot.selfCornered ? str.selfCorner : 0;
  scores.strafePressure += snapshot.distance > B5.MELEE_RANGE * 1.75 ? str.tooFar : 0;

  // === Approach ===
  scores.approach += outOfRange ? app.outRange : app.inRange;
  scores.approach += snapshot.distance > B5.CHASE_RANGE ? app.beyondChase : 0;
  scores.approach += phaseAggro * app.aggroMult;
  scores.approach += snapshot.targetCharging ? app.charging : 0;
  scores.approach += snapshot.distance > B5.MELEE_RANGE * 2 ? app.veryFar : 0;
  scores.approach += highBulletThreat ? app.bulletThreat : 0;

  // === Bait Roll ===
  scores.baitRoll += b.phase >= 2 ? br.phase2 : br.phase1;
  scores.baitRoll += snapshot.earlyRoller ? br.earlyRoller : 0;
  scores.baitRoll += inPressureBand ? br.inPressure : br.outPressure;
  scores.baitRoll += (B5.FEINT_CHANCE || 0) * br.feintMult;
  scores.baitRoll += inMelee ? br.inMelee : 0;
  scores.baitRoll += snapshot.distance > B5.MELEE_RANGE * 1.7 ? br.tooFar : 0;

  // === Punish ===
  scores.punish += snapshot.justRolled ? pn.justRolled : 0;
  scores.punish += snapshot.recentlyAttacked ? pn.recentAttack : 0;
  scores.punish += snapshot.recentlyCharged ? pn.recentCharge : 0;
  scores.punish += snapshot.distance < B5.MELEE_RANGE * 1.35 ? pn.inRange : pn.outRange;
  scores.punish += phaseAggro * pn.aggroMult;

  // === Reset ===
  scores.reset += snapshot.selfCornered ? rs.selfCorner : 0;
  scores.reset += b.missedAttackCount >= (B5.MISSED_ATTACK_RESET_THRESHOLD || 2) ? rs.missed : 0;
  scores.reset += snapshot.targetAggressionScore > 0.65 && snapshot.distance < B5.MELEE_RANGE * 1.05 ? rs.highPressure : 0;
  scores.reset += snapshot.targetCornered ? rs.targetCorner : 0;
  scores.reset += b.enraged ? rs.enraged : 0;

  // === Dodge Bullets ===
  scores.dodgeBullets += highBulletThreat ? dg.high : dg.low;
  scores.dodgeBullets += bt.bulletCount * dg.countMult;
  scores.dodgeBullets += bt.threatLevel * dg.threatMult;
  // Softer penalty in melee when bullet threat is critical — still escape
  // if about to eat multiple high-damage bullets, even if it means aborting.
  scores.dodgeBullets += inMelee ? (criticalBulletThreat ? dg.meleeCrit : dg.meleeNormal) : 0;
  scores.dodgeBullets += b.phase >= 2 ? dg.phase2Plus : 0;
  scores.dodgeBullets += snapshot.justRolled ? dg.justRolled : 0;
  // Plasma charge: beam is a raycast, invisible to bullet scan — treat as direct threat
  scores.dodgeBullets += snapshot.targetCharging ? dg.charging : 0;

  // === Shadow Step ===
  scores.shadowStep += b.hitFlash > 0 ? ss.hitFlash : 0;
  scores.shadowStep += snapshot.targetCharging ? ss.charging : 0;
  scores.shadowStep += snapshot.selfCornered ? ss.selfCorner : 0;
  scores.shadowStep += snapshot.justRolled && snapshot.distance < B5.MELEE_RANGE ? ss.punishCombo : 0;
  scores.shadowStep += criticalBulletThreat ? ss.critBullet : 0;
  scores.shadowStep += bt.bulletCount >= 3 ? ss.multiBullet : 0;

  // === Normal Combo ===
  scores.normalCombo += inMelee ? nc.inMelee : nc.outMelee;
  scores.normalCombo += snapshot.justRolled ? nc.justRolled : 0;
  scores.normalCombo += !snapshot.targetRolling ? nc.notRolling : nc.rolling;
  scores.normalCombo += b.phase === 1 ? nc.phase1 : 0;
  scores.normalCombo += snapshot.distance > B5.MELEE_RANGE * 1.2 ? nc.tooFar : 0;

  // === Frenzy Combo ===
  scores.frenzyCombo += snapshot.distance < B5.MELEE_RANGE * 1.2 ? fc.inMelee : fc.outMelee;
  scores.frenzyCombo += snapshot.targetCornered ? fc.cornered : 0;
  scores.frenzyCombo += snapshot.justRolled ? fc.justRolled : 0;
  scores.frenzyCombo += b.phase >= 2 ? fc.phase2Plus : 0;
  scores.frenzyCombo += b.enraged ? fc.enraged : 0;

  // === Charge Slash ===
  scores.chargeSlash += snapshot.predictedDistance > B5.MELEE_RANGE * 1.45 ? cs.predictFar : cs.predictNear;
  scores.chargeSlash += snapshot.targetCharging ? cs.charging : 0;
  scores.chargeSlash += snapshot.stableMovement ? cs.stable : 0;
  scores.chargeSlash += snapshot.targetCornered ? cs.cornered : 0;
  scores.chargeSlash += phaseAggro * cs.aggroMult;
  scores.chargeSlash += b.enraged ? cs.enraged : 0;

  // === Execution ===
  scores.execution += snapshot.distance > 100 && snapshot.distance < B5.EXEC_LOCK_RANGE ? ex.sweetSpot : ex.badRange;
  scores.execution += snapshot.justRolled ? ex.justRolled : 0;
  scores.execution += snapshot.recentlyCharged ? ex.recentCharge : 0;
  scores.execution += snapshot.recentlyAttacked ? ex.recentAttack : 0;
  scores.execution += snapshot.targetCornered ? ex.cornered : 0;
  scores.execution += snapshot.targetLowHp ? ex.lowHp : 0;
  scores.execution += snapshot.targetRolling ? ex.rolling : 0;
  scores.execution += phaseAggro * ex.aggroMult;

  // === Tactical-state modifiers (commit / recover / reposition) ===
  applyTacticalModifiers(b, scores);

  // === Global modifiers: repeat penalty + intent stickiness + light noise ===
  for (const action in scores) {
    scores[action] -= getRepeatPenalty(b, action);
    if (b.bossIntent === action && b.bossIntentTimer > 8) scores[action] += 4;
    scores[action] += Math.random() * 0.3;
  }

  // === Pick best action via single linear scan (no allocation) ===
  let bestAction = 'approach';
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const key in scores) {
    const s = scores[key];
    if (Number.isFinite(s) && s > bestScore) {
      bestScore = s;
      bestAction = key;
    }
  }
  const timing = getActionTiming(bestAction);

  return {
    action: bestAction,
    score: bestScore,
    ...timing,
    flipStrafe: bestAction === 'reset' || bestAction === 'dodgeBullets'
      || (bestAction === 'baitRoll' && snapshot.earlyRoller && Math.random() < 0.18)
      // Stalk repeated back-to-back → occasionally flip orbit direction so the
      // player can't memorize the pace (魂 boss 经典反向绕圈读招).
      || (bestAction === 'stalk' && b.lastAction === 'stalk' && Math.random() < (B5.STALK_FLIP_CHANCE || 0.32)),
    rollAngle: bestAction === 'shadowStep' ? getShadowStepAngle(b, snapshot) : null,
  };
}

export function commitBoss5Decision(b, decision) {
  if (!decision) return;
  if (decision.flipStrafe) b.strafeDir *= -1;

  // === Tactical state transitions driven by the committed action ===
  if (ATTACK_ACTIONS.has(decision.action)) {
    b.tacticalState = 'commit';
    b.tacticalTimer = decision.duration + (B5.COMMIT_TAIL_FRAMES || 8);
  } else if (decision.action === 'reset') {
    b.tacticalState = 'reposition';
    b.tacticalTimer = B5.RESET_TIME;
  } else if (decision.action === 'shadowStep' || decision.action === 'dodgeBullets') {
    // Defensive interrupt — exit commit immediately into pressure posture
    if (b.tacticalState === 'commit') {
      b.tacticalState = 'pressure';
      b.tacticalTimer = 0;
    }
  }

  b.bossIntent = decision.action;
  b.bossIntentTimer = decision.duration;
  b.decisionCooldown = Math.max(b.decisionCooldown || 0, decision.cooldown);
  b.lastAction = decision.action;

  b.actionHistory.push({ action: decision.action, time: b.aiClock });
  if (b.actionHistory.length > 6) b.actionHistory.splice(0, b.actionHistory.length - 6);
}

export function getBoss5MovementVector(b, snapshot) {
  if (!snapshot.hasTarget || !snapshot.predictedTargetPos) {
    return { x: 0, y: 0, speedScale: 0, wantsAttack: false };
  }

  const toTarget = normalize(snapshot.predictedTargetPos.x - b.x, snapshot.predictedTargetPos.y - b.y);
  const strafe = { x: -toTarget.y * (b.strafeDir || 1), y: toTarget.x * (b.strafeDir || 1) };
  const closePressure = clamp((B5.MELEE_RANGE * 1.75 - snapshot.distance) / (B5.MELEE_RANGE * 0.85), 0, 1);
  const farPressure = clamp((snapshot.distance - B5.MELEE_RANGE * 1.15) / (B5.CHASE_RANGE - B5.MELEE_RANGE * 1.15), 0, 1);
  let moveX = 0;
  let moveY = 0;
  let speedScale = 0;
  let wantsAttack = false;

  switch (b.bossIntent) {
    case 'observe':
      moveX = toTarget.x * (0.7 + farPressure * 0.18) + strafe.x * (0.18 + closePressure * 0.12);
      moveY = toTarget.y * (0.7 + farPressure * 0.18) + strafe.y * (0.18 + closePressure * 0.12);
      speedScale = snapshot.distance > B5.MELEE_RANGE * 1.35 ? 0.68 : 0.42;
      break;
    case 'stalk': {
      // Soulslike standoff: orbit at ideal range, face the player, micro-adjust
      // distance. Forward/back component is a gentle corrective pull toward the
      // center of the stalk band; sideways component dominates so the boss
      // circles rather than closes.
      const bandMid = B5.MELEE_RANGE * ((B5.STALK_BAND_LOW || 1.15) + (B5.STALK_BAND_HIGH || 2.1)) * 0.5;
      const distErr = snapshot.distance - bandMid;
      const bandWidth = B5.MELEE_RANGE * ((B5.STALK_BAND_HIGH || 2.1) - (B5.STALK_BAND_LOW || 1.15)) * 0.5;
      // correctiveBias > 0 → too far, nudge forward; < 0 → too close, back off.
      const correctiveBias = clamp(distErr / (bandWidth || 1), -1, 1) * 0.35;
      moveX = toTarget.x * correctiveBias + strafe.x * 0.9;
      moveY = toTarget.y * correctiveBias + strafe.y * 0.9;
      speedScale = 0.6 + Math.abs(correctiveBias) * 0.25;
      break;
    }
    case 'strafePressure':
      moveX = toTarget.x * (0.95 + farPressure * 0.18) + strafe.x * ((B5.STRAFE_BIAS || 0.38) * (0.45 + closePressure * 0.55));
      moveY = toTarget.y * (0.95 + farPressure * 0.18) + strafe.y * ((B5.STRAFE_BIAS || 0.38) * (0.45 + closePressure * 0.55));
      speedScale = snapshot.distance > B5.MELEE_RANGE * 1.7 ? 1.02 : 0.86;
      break;
    case 'approach':
      moveX = toTarget.x;
      moveY = toTarget.y;
      speedScale = snapshot.distance > B5.CHASE_RANGE ? 1.16 : 1.02;
      break;
    case 'baitRoll':
      moveX = toTarget.x * 0.82 + strafe.x * ((B5.STRAFE_BIAS || 0.38) * (0.4 + closePressure * 0.35));
      moveY = toTarget.y * 0.82 + strafe.y * ((B5.STRAFE_BIAS || 0.38) * (0.4 + closePressure * 0.35));
      speedScale = snapshot.distance > B5.MELEE_RANGE * 1.8 ? 0.88 : 0.74;
      break;
    case 'punish':
      moveX = toTarget.x * 1.02 + strafe.x * 0.08;
      moveY = toTarget.y * 1.02 + strafe.y * 0.08;
      speedScale = 1.08;
      wantsAttack = snapshot.distance <= B5.MELEE_RANGE * 1.04;
      break;
    case 'reset':
      moveX = -toTarget.x * 0.9 + strafe.x * 0.28;
      moveY = -toTarget.y * 0.9 + strafe.y * 0.28;
      speedScale = 0.9;
      break;
    case 'dodgeBullets': {
      // Primary: dodge direction from bullet scan
      const bt = snapshot.bulletThreats;
      if (bt && (bt.dodgeX || bt.dodgeY)) {
        // Decompose dodge into lateral (perpendicular to toTarget) and forward parts.
        // Discard the forward/backward component of the scan result and replace it
        // with a constant push toward the target, so the boss dodges sideways
        // instead of retreating under dense frontal barrages.
        const fwdDot = bt.dodgeX * toTarget.x + bt.dodgeY * toTarget.y;
        const latX = bt.dodgeX - fwdDot * toTarget.x;
        const latY = bt.dodgeY - fwdDot * toTarget.y;
        const combX = latX * 0.82 + toTarget.x * 0.35;
        const combY = latY * 0.82 + toTarget.y * 0.35;
        const cn = normalize(combX, combY);
        moveX = cn.x;
        moveY = cn.y;
        speedScale = (B5.DODGE_STRAFE_SPEED || 1.5) * 1.1;
      } else {
        // Fallback: strafe
        moveX = strafe.x * 0.8 + toTarget.x * 0.2;
        moveY = strafe.y * 0.8 + toTarget.y * 0.2;
        speedScale = 0.9;
      }
      break;
    }
    default:
      moveX = toTarget.x * 0.2;
      moveY = toTarget.y * 0.2;
      speedScale = 0.4;
      break;
  }

  if (snapshot.targetCornered && (b.bossIntent === 'strafePressure' || b.bossIntent === 'punish')) {
    moveX += toTarget.x * 0.35;
    moveY += toTarget.y * 0.35;
    speedScale += 0.08;
  }
  if (snapshot.selfCornered && b.bossIntent !== 'reset') {
    moveX += strafe.x * 0.25 - toTarget.x * 0.18;
    moveY += strafe.y * 0.25 - toTarget.y * 0.18;
  }

  // === CONTINUOUS BULLET DODGE BLENDING ===
  // Even when not in 'dodgeBullets' action, subtly blend dodge vector
  // to make Boss weave through bullets while pursuing other goals
  if (b.bossIntent !== 'dodgeBullets' && snapshot.bulletThreats) {
    const bt = snapshot.bulletThreats;
    if (bt.threatLevel > 0.08 && (bt.dodgeX || bt.dodgeY)) {
      const dodgeWeight = clamp(bt.threatLevel * (B5.DODGE_WEIGHT || 0.75), 0, 0.65);
      moveX = moveX * (1 - dodgeWeight) + bt.dodgeX * dodgeWeight;
      moveY = moveY * (1 - dodgeWeight) + bt.dodgeY * dodgeWeight;
      // Increase speed when dodging
      speedScale *= 1 + dodgeWeight * 0.45;
    }
  }

  // === PLASMA CHARGE EVASION ===
  // Beam is a raycast — invisible to bullet scan. When player is charging,
  // blend in lateral strafe to step off the aim line.
  if (b.bossIntent !== 'dodgeBullets' && snapshot.targetCharging) {
    const plasmaWeight = clamp((B5.PLASMA_EVADE_WEIGHT || 0.45), 0, 0.6);
    moveX = moveX * (1 - plasmaWeight) + strafe.x * plasmaWeight;
    moveY = moveY * (1 - plasmaWeight) + strafe.y * plasmaWeight;
    speedScale *= 1.15;
  }

  // === CURSOR REPULSION ===
  // Boss subtly drifts away from the mouse cursor — makes it feel "aware".
  // Disabled when the intent is to engage (punish/approach), otherwise the
  // boss would be pushed out of melee range whenever the player aims at it.
  const intentSeeksContact = b.bossIntent === 'punish' || b.bossIntent === 'approach';
  if (!intentSeeksContact && b.cursorX !== undefined && b.cursorY !== undefined) {
    const cdx = b.x - b.cursorX;
    const cdy = b.y - b.cursorY;
    const cursorDist = Math.hypot(cdx, cdy);
    const repelRadius = B5.CURSOR_REPEL_RADIUS || 220;
    if (cursorDist < repelRadius && cursorDist > 1) {
      const repelStrength = (B5.CURSOR_REPEL_STRENGTH || 0.55) * (1 - cursorDist / repelRadius);
      moveX += (cdx / cursorDist) * repelStrength;
      moveY += (cdy / cursorDist) * repelStrength;
    }
  }

  const move = normalize(moveX, moveY);
  return { x: move.x, y: move.y, speedScale, wantsAttack };
}
