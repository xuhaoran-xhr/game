// ===========================
//  Boss 5 AI — Shared Utilities
//  Pure helper functions and predicates used across
//  the perception / dodge / strategy modules.
// ===========================
import CONFIG from '../config.js';

export const B5 = CONFIG.BOSS5;

// Action set classifications — used for repeat-penalty grouping
// and for tactical state machine transitions.
export const COMBO_ACTIONS = new Set(['normalCombo', 'frenzyCombo', 'punish']);
export const MOVEMENT_ACTIONS = new Set([
  'observe', 'stalk', 'strafePressure', 'approach', 'baitRoll',
  'punish', 'reset', 'dodgeBullets',
]);
export const ATTACK_ACTIONS = new Set([
  'punish', 'normalCombo', 'frenzyCombo', 'chargeSlash', 'execution',
]);

// ========== Vector helpers ==========

export function normalize(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, len };
}

// ========== Spatial queries ==========

export function getEntityCornerState(entity, W, H) {
  const radius = entity?.radius || 0;
  const left = entity.x - radius;
  const right = W - entity.x - radius;
  const top = entity.y - radius;
  const bottom = H - entity.y - radius;
  const minEdge = Math.min(left, right, top, bottom);
  return {
    cornered: minEdge < B5.CORNER_MARGIN,
    minEdge,
  };
}

// ========== Target-state predicates ==========

export function isTargetRolling(target) {
  return !!(target && (
    target.rolling ||
    (target.invincible && (target.rollT > 0 || target.rollTimer > 0))
  ));
}

export function isTargetCharging(target) {
  return !!(target && (
    target.charging ||
    target.ultCharging ||
    target.plasmaCharge > (B5.PLASMA_CHARGE_THRESHOLD || 18) ||
    target.plasmaFiring
  ));
}

export function isTargetAttacking(target) {
  return !!(target && (
    target.swinging ||
    target.autoSwing ||
    target.executing ||
    target.plasmaFiring ||
    target.chargeDashing ||
    target.shootCd > 0
  ));
}

export function isTargetLowHp(target) {
  if (!target || typeof target.hp !== 'number' || typeof target.maxHp !== 'number' || target.maxHp <= 0) {
    return false;
  }
  return target.hp / target.maxHp <= 0.35;
}
