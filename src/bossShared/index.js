// ===========================
//  bossShared/index.js
//  Convenience barrel — import everything from '@bossShared' or './bossShared'.
//  Consumers may also import directly from individual sub-files for tighter
//  dependencies.
// ===========================

export {
  targetTeam,
  isHostileTo,
  isTargetable,
  collectHostiles,
  nearestHostile,
  countHostilesNear,
  forEachOtherBoss,
  findOtherBoss,
} from './targeting.js';

export { applyAoEDamage } from './aoe.js';

export { phaseSelect, phaseCount, phaseCD } from './phase.js';

export { tickBossStatus } from './status.js';
