// ===========================
//  Boss 6: 深渊术士 (Abyss Warlock)
//  Sprite-sheet driven boss. First boss in this project to use image
//  assets rather than procedural Phaser Graphics drawing.
//
//  Body:  mage-3-87x110.png   (8 frames, idle loop)
//  Skill 1 (Shadow Rise):     shadow-80x70.png   (20 frames, emerge-once)
//  Skill 2 (Tentacle Field):  tentacles-25x90.png (8 grow + 16 sway loop)
//  Skill 3 (Acid Spout):      acid2-14x67.png     (8 grow + 16 loop)
//
//  Integration contract with GameScene:
//    - preloadBoss6Assets(scene)    → call from scene.preload()
//    - registerBoss6Animations(scene) → call once from scene.create()
//    - createBoss6(W, H, wave)      → returns boss state (identical shape to
//                                     other bosses so the main loop is happy)
//    - updateBoss6 / drawBoss6      → run every frame
//
//  The boss needs scene access to create sprites — it receives `gameState`
//  which exposes `scene` via the gameStateProxy getter. Sprites are lazily
//  attached on first update (before that only state exists).
// ===========================
import CONFIG from '../config.js';
import { dist, ang } from '../utils.js';

// Vite handles PNG imports natively — returns a URL/path suitable for Phaser.
import mage3Url     from '../assets/boss6/mage-3-87x110.png';
import shadowUrl    from '../assets/boss6/shadow-80x70.png';
import tentaclesUrl from '../assets/boss6/tentacles-25x90.png';
import acid2Url     from '../assets/boss6/acid2-14x67.png';

// ---- Texture keys (global across the scene) ----
const KEY_BODY      = 'boss6_body';
const KEY_SHADOW    = 'boss6_shadow';
const KEY_TENTACLES = 'boss6_tentacles';
const KEY_ACID      = 'boss6_acid';

// ---- Animation keys ----
const ANIM_BODY_IDLE       = 'boss6_body_idle';
const ANIM_SHADOW_EMERGE   = 'boss6_shadow_emerge'; // full 0-19 (used for strike)
const ANIM_SHADOW_ARM      = 'boss6_shadow_arm';    // 0-8 (trap arming, pause on frame 8)
const ANIM_SHADOW_SINK     = 'boss6_shadow_sink';   // 8-0 reversed (arming interrupted → sink)
const ANIM_SHADOW_RETRACT  = 'boss6_shadow_retract';// 13-0 reversed (imprison end → sink back down)
const ANIM_TENTACLE_SPROUT = 'boss6_tentacle_sprout'; // frames 0-15 (rows 1+2) once
const ANIM_TENTACLE_SWAY   = 'boss6_tentacle_sway';   // frames 16-23 (row 3) loop
const ANIM_ACID_PRECAST    = 'boss6_acid_precast'; // frames 0-1 infinite loop (warning)
const ANIM_ACID_LOOP       = 'boss6_acid_loop';    // frames 8-15(middle row: full spray)
const ANIM_ACID_RETRACT    = 'boss6_acid_retract'; // frames 7→0 REVERSED(retract/collapse)

/**
 * Call from GameScene.preload()
 */
export function preloadBoss6Assets(scene) {
  scene.load.spritesheet(KEY_BODY,      mage3Url,     { frameWidth: 87, frameHeight: 110 });
  scene.load.spritesheet(KEY_SHADOW,    shadowUrl,    { frameWidth: 80, frameHeight: 70 });
  scene.load.spritesheet(KEY_TENTACLES, tentaclesUrl, { frameWidth: 25, frameHeight: 90 });
  scene.load.spritesheet(KEY_ACID,      acid2Url,     { frameWidth: 14, frameHeight: 67 });
}

/**
 * Call once from GameScene.create(). Safe to call multiple times — guarded.
 */
export function registerBoss6Animations(scene) {
  if (scene.anims.exists(ANIM_BODY_IDLE)) return;
  const B6 = CONFIG.BOSS6;

  // Body: all 8 frames, slow idle loop
  scene.anims.create({
    key: ANIM_BODY_IDLE,
    frames: scene.anims.generateFrameNumbers(KEY_BODY, { start: 0, end: 7 }),
    frameRate: 6,
    repeat: -1,
  });

  // Shadow Rise (strike): full 0..19, play once — used when shadow lunges at player
  scene.anims.create({
    key: ANIM_SHADOW_EMERGE,
    frames: scene.anims.generateFrameNumbers(KEY_SHADOW, { start: 0, end: 19 }),
    frameRate: B6.SHADOW_STRIKE_EMERGE_FPS,
    repeat: 0,
  });
  // Shadow Arm: frames 0 → ARM_END_FRAME (= 8), once. Sprite will pause on last frame.
  scene.anims.create({
    key: ANIM_SHADOW_ARM,
    frames: scene.anims.generateFrameNumbers(KEY_SHADOW, { start: 0, end: B6.SHADOW_ARM_END_FRAME }),
    frameRate: B6.SHADOW_ARM_FPS,
    repeat: 0,
  });
  // Shadow Sink: frames ARM_END_FRAME → 0 (reversed), once — trap sinking back into ground.
  scene.anims.create({
    key: ANIM_SHADOW_SINK,
    frames: scene.anims.generateFrameNumbers(KEY_SHADOW, { start: 0, end: B6.SHADOW_ARM_END_FRAME }).reverse(),
    frameRate: B6.SHADOW_SINK_FPS,
    repeat: 0,
  });
  // Shadow Retract: first RETRACT_FRAMES frames REVERSED (e.g. 13 → 0),
  // played after imprison ends — shadow collapses back into the ground.
  scene.anims.create({
    key: ANIM_SHADOW_RETRACT,
    frames: scene.anims.generateFrameNumbers(KEY_SHADOW, { start: 0, end: B6.SHADOW_RETRACT_FRAMES - 1 }).reverse(),
    frameRate: B6.SHADOW_RETRACT_FPS,
    repeat: 0,
  });

  // Tentacle Sprout: rows 1+2 (frames 0-15) play once — the "warning/grow" phase
  // that ends right as the animation enters row 3 first frame (= STRIKE moment).
  scene.anims.create({
    key: ANIM_TENTACLE_SPROUT,
    frames: scene.anims.generateFrameNumbers(KEY_TENTACLES, { start: 0, end: B6.TENTACLE_SPROUT_FRAMES - 1 }),
    frameRate: B6.TENTACLE_SPROUT_FPS,
    repeat: 0,
  });

  // Tentacle Sway: row 3 only (frames 16-23, loop) — after launch, swaying as the
  // tentacle gradually sinks back into the ground.
  scene.anims.create({
    key: ANIM_TENTACLE_SWAY,
    frames: scene.anims.generateFrameNumbers(KEY_TENTACLES, { start: B6.TENTACLE_SPROUT_FRAMES, end: B6.TENTACLE_SPROUT_FRAMES + B6.TENTACLE_SWAY_FRAMES - 1 }),
    frameRate: B6.TENTACLE_SWAY_FPS,
    repeat: -1,
  });

  // Acid Pre-cast warning — first 2 frames of row 0, INFINITE loop.
  // Duration is controlled by game-logic timer (ACID_PRECAST_DURATION_MIN/MAX).
  scene.anims.create({
    key: ANIM_ACID_PRECAST,
    frames: scene.anims.generateFrameNumbers(KEY_ACID, { start: 0, end: B6.ACID_PRECAST_FRAMES - 1 }),
    frameRate: B6.ACID_PRECAST_FPS,
    repeat: -1,
  });
  // Acid Full-Spray Loop — middle row only (frames 8-15 in 24-frame sheet), infinite loop.
  // Duration is controlled by game-logic timer (random ACID_FULLSPRAY_DURATION_MIN~MAX ticks, i.e. 2~8s).
  scene.anims.create({
    key: ANIM_ACID_LOOP,
    frames: scene.anims.generateFrameNumbers(KEY_ACID, {
      start: B6.ACID_GROW_FRAMES,                            // 8
      end:   B6.ACID_GROW_FRAMES + B6.ACID_FULLSPRAY_FRAMES - 1, // 15
    }),
    frameRate: B6.ACID_FULLSPRAY_FPS,
    repeat: -1,
  });
  // Acid Retract — grow frames played in REVERSE (7 → 0) = column sinking back down.
  // Phaser's generateFrameNumbers returns an array; reversing it inverts the playback order.
  scene.anims.create({
    key: ANIM_ACID_RETRACT,
    frames: scene.anims.generateFrameNumbers(KEY_ACID, { start: 0, end: B6.ACID_RETRACT_FRAMES - 1 }).reverse(),
    frameRate: B6.ACID_RETRACT_FPS,
    repeat: 0,
  });
}

// =================================================================
//  Factory
// =================================================================
export function createBoss6(W, H, wave = 0) {
  const B6 = CONFIG.BOSS6;
  // Scale HP mildly with wave so late-game still feels threatening
  const hp = Math.floor(B6.BASE_HP * (1 + Math.max(0, wave - 1) * 0.08));
  return {
    isBoss6: true,
    bossName: '深渊术士',
    // ---- Position ----
    x: W / 2,
    y: -80, // enters from above
    vx: 0,
    vy: 0,
    radius: B6.RADIUS,
    // ---- Stats ----
    hp,
    maxHp: hp,
    speed: B6.BASE_SPEED,
    damage: 0, // no contact damage; all damage via skills
    faction: 'enemy',
    charmed: 0,
    color: B6.COLOR_ACCENT,
    hpColor: 0xff2255,
    // ---- Phase / flow ----
    phase: 1,
    entered: false,
    entranceTimer: 0,
    atkTimer: 0,
    hitFlash: 0,
    dying: false,
    deathAnim: 0,
    threatTable: { player: 0, timer: 0, target: null, otherBoss: 0 },
    // ---- Skill state machine ----
    aiState: 'idle',       // 'idle' | 'casting' | 'recover'
    castSkill: null,       // 'shadow' | 'tentacle' | 'acid' while casting
    castTimer: 0,          // countdown inside cast/recover state
    castTotal: 0,          // full cast duration (for progress 0..1)
    castTarget: null,      // { x, y } locked at cast start
    castAngle: 0,          // cast direction (boss → target) cached for tethers
    globalCD: 120,         // first cast after 2s
    // Per-skill recharge (ticks to 0; skill only eligible when its own value <= 0)
    rechargeShadow: 60,
    rechargeTentacle: 180,
    rechargeAcid: 30,
    // ---- Active skill instances ----
    shadows: [],         // [{ sprite, x, y, phase: 'emerge'|'chase'|'dead', life, hp }]
    tentacles: [],       // [{ sprite, x, y, state: 'warn'|'grow'|'active'|'fade', timer, dealtHit: Set }]
    acidShots: [],       // [{ sprite, x, y, tx, ty, state, timer, lastTick, scaleMul }]
    acidPools: [],       // [{ x, y, radius, timer, maxTimer, tickTimer }] — ⑤ 酸池残留
    // ---- Ocean ultimate (fires once per HP threshold crossed) ----
    oceanTriggerStage: 0, // index into OCEAN_TRIGGER_HP_FRACS; advances after each trigger
    oceanQueue: [],       // [{ x, y, scaleMul, delay }] — staggered ocean spawns
    // ---- Transient visual FX (cast waves, impact rings, etc) ----
    castFx: [],          // [{ kind, x, y, timer, maxTimer, color, data? }]
    // ---- Enhancement state (9 方案) ----
    painPool: [],        // ① 痛感反击: [{ dmg, frame }] 滑动窗口
    painCD: 0,           // ① 痛感反击冷却(避免连续触发)
    ritualInvulTimer: 0, // ② 阶段仪式无敌剩余帧
    ritualTriggered: { p2: false, p3: false }, // ② 每阶段仪式只触发一次
    comboActive: false,  // ③ 连锁打击模式
    comboRemaining: 0,   // ③ 剩余连发次数
    frenzyActive: false, // ⑨ 狂化标志(HP ≤ 10%)
    // ---- Sprite refs ----
    bodySprite: null,    // Phaser.GameObjects.Sprite
    spritesInitialized: false,
    // ---- Common ----
    updateFn: updateBoss6,
    drawFn: drawBoss6,
  };
}

// =================================================================
//  Helpers
// =================================================================
function ensureSprites(b, scene) {
  if (b.spritesInitialized || !scene) return;
  const B6 = CONFIG.BOSS6;
  b.bodySprite = scene.add.sprite(b.x, b.y, KEY_BODY);
  b.bodySprite.setDepth(40);
  b.bodySprite.setScale(B6.SPRITE_SCALE);
  b.bodySprite.play(ANIM_BODY_IDLE);
  b.spritesInitialized = true;
}

function destroyAllSprites(b) {
  if (b.bodySprite) { b.bodySprite.destroy(); b.bodySprite = null; }
  b.shadows.forEach(s => { if (s.sprite) s.sprite.destroy(); });
  b.tentacles.forEach(t => { if (t.sprite) t.sprite.destroy(); });
  b.acidShots.forEach(a => { if (a.sprite) a.sprite.destroy(); });
  b.shadows = [];
  b.tentacles = [];
  b.acidShots = [];
  if (b.acidPools) b.acidPools = [];
}

function clearActiveSkillSprites(b) {
  b.shadows.forEach(s => { if (s && s.sprite) s.sprite.destroy(); });
  b.tentacles.forEach(t => { if (t && t.sprite) t.sprite.destroy(); });
  b.acidShots.forEach(a => { if (a && a.sprite) a.sprite.destroy(); });
  b.shadows = [];
  b.tentacles = [];
  b.acidShots = [];
  if (b.acidPools) b.acidPools = [];
  b.castFx = [];
  b.oceanQueue = [];
}

function phaseCount(b, p1, p2, p3) {
  return b.phase === 1 ? p1 : (b.phase === 2 ? p2 : p3);
}

// =================================================================
//  Faction / targeting helpers
// =================================================================
/**
 * Map a unit's faction to its "team":
 *   'player' / 'ally'  → 'good'
 *   anything else ('enemy', undefined) → 'bad'
 * Used to unify player-vs-enemy logic for AoE skills.
 */
function targetTeam(u) {
  const f = u.faction || 'player';
  return (f === 'player' || f === 'ally') ? 'good' : 'bad';
}
function isHostileTo(src, tgt) {
  return targetTeam(src) !== targetTeam(tgt);
}

/**
 * A unit is "targetable" if it's alive, not hidden, and not mid-launch. Launched
 * targets cannot be selected, cannot be threat targets, and cannot take AoE
 * damage during flight (they take the dedicated fall damage on landing).
 */
function isTargetable(t) {
  return t && t.hp > 0 && !t.hidden && !t.launched;
}

/**
 * Collect every unit currently hostile to boss `b` AND targetable. Used by
 * shadow traps, tentacle launch pick, etc. to pick a valid target.
 */
function collectHostiles(b, P, enemies, otherBoss) {
  const list = [];
  if (P && isTargetable(P) && isHostileTo(b, P)) list.push(P);
  if (enemies) {
    for (const e of enemies) {
      if (isTargetable(e) && isHostileTo(b, e)) list.push(e);
    }
  }
  if (otherBoss && isTargetable(otherBoss) && isHostileTo(b, otherBoss)) list.push(otherBoss);
  return list;
}

/**
 * Find the closest hostile within `maxDist` of (x, y). Returns null if none.
 * Distance check accounts for target radius so "reach" feels consistent across
 * small grunts and big bosses.
 */
function nearestHostile(b, x, y, maxDist, P, enemies, otherBoss) {
  let best = null, bestD = maxDist;
  for (const h of collectHostiles(b, P, enemies, otherBoss)) {
    const hR = h === P ? P.radius : (h.radius || 12);
    const d = Math.hypot(h.x - x, h.y - y) - hR;
    if (d < bestD) { best = h; bestD = d; }
  }
  return best;
}

/**
 * Apply AoE damage centered on (x, y) with `radius` to every unit hostile to
 * the boss `b`: player (when boss is hostile to player's team), enemies
 * (matching hostility), and otherBoss (if opposite team). `onHit(target)`
 * is called per successful hit for custom particle/FX work.
 */
function applyAoEDamage(b, x, y, radius, damage, P, enemies, otherBoss, gameState, onHit) {
  // --- Player ---
  if (P && !P.hidden && !P.invincible && !P.launched && isHostileTo(b, P)) {
    if (Math.hypot(P.x - x, P.y - y) < P.radius + radius) {
      gameState.dmgPlayer(damage);
      if (onHit) onHit(P);
    }
  }
  // --- Enemies (grunts) ---
  if (enemies) {
    for (const e of enemies) {
      if (!e || e.hp <= 0 || e.launched) continue;
      if (!isHostileTo(b, e)) continue;
      if (Math.hypot(e.x - x, e.y - y) < (e.radius || 12) + radius) {
        e.hp -= damage;
        e.hitFlash = 6;
        if (onHit) onHit(e);
      }
    }
  }
  // --- Other boss ---
  if (otherBoss && otherBoss.hp > 0 && isHostileTo(b, otherBoss)) {
    if (Math.hypot(otherBoss.x - x, otherBoss.y - y) < (otherBoss.radius || 30) + radius) {
      otherBoss.hp -= damage;
      otherBoss.hitFlash = 6;
      if (onHit) onHit(otherBoss);
    }
  }
}

function phaseCD(b, p1, p2, p3) {
  return b.phase === 1 ? p1 : (b.phase === 2 ? p2 : p3);
}

// =================================================================
//  LAUNCH helpers — tentacle "knock up" mechanic
// =================================================================
/**
 * Find nearest shadow trap still in `armed_idle` (the "ready to snare" state).
 * Returns null if no armed trap exists. Used to redirect launch landing.
 */
function findArmedTrap(b, x, y) {
  let best = null, bestD = Infinity;
  for (const s of b.shadows) {
    if (s.phase !== 'armed_idle') continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}

/**
 * Begin a parabolic launch on `target`. Attaches `target.launched = { ... }`
 * which the central launch-tick consumes each frame. Redirects landing to
 * nearest armed shadow trap if one exists.
 */
function beginLaunch(target, b, W, H, scaleMul) {
  const B6 = CONFIG.BOSS6;
  const sMul = scaleMul || 1;
  const fromX = target.x, fromY = target.y;
  // Pick landing spot
  let toX, toY;
  const trap = findArmedTrap(b, fromX, fromY);
  if (trap) {
    toX = trap.x;
    toY = trap.y;
  } else {
    // Random offset within configured range; avoid too-small displacement
    const ang = Math.random() * Math.PI * 2;
    const rng = B6.TENTACLE_LAUNCH_RANGE_MIN
      + Math.random() * (B6.TENTACLE_LAUNCH_RANGE - B6.TENTACLE_LAUNCH_RANGE_MIN);
    toX = fromX + Math.cos(ang) * rng;
    toY = fromY + Math.sin(ang) * rng;
  }
  // Clamp to screen so we don't fly off-map
  const margin = 40;
  toX = Math.max(margin, Math.min(W - margin, toX));
  toY = Math.max(margin, Math.min(H - margin, toY));

  const maxTimer = B6.TENTACLE_LAUNCH_DURATION;
  // 落地伤害 = maxHp × FRAC × 触手尺寸倍率(大触手更痛)
  const fallDamage = Math.max(1, Math.floor((target.maxHp || target.hp || 50) * B6.TENTACLE_FALL_DMG_FRAC * sMul));

  target.launched = {
    fromX, fromY, toX, toY,
    timer: maxTimer,
    maxTimer,
    fallDamage,
    trapRef: trap || null, // so we can tell the trap "wake up" on landing
    scalePulse: 1,
  };
  // Preserve original hidden state so we can restore it
  target.launched._prevHidden = target.hidden || false;
  target.launched._prevInvincible = target.invincible || false;
}

/**
 * Tick a single launched target. Returns true if the launch completed this tick
 * (caller should apply fall damage + particles).
 */
function tickLaunched(target, gameState) {
  const L = target.launched;
  if (!L) return false;
  L.timer--;
  const prog = 1 - (L.timer / L.maxTimer); // 0 → 1
  // Parabolic arc: linear x/y + sin-based vertical hop
  const B6 = CONFIG.BOSS6;
  const hop = Math.sin(prog * Math.PI) * B6.TENTACLE_LAUNCH_MAX_HEIGHT;
  target.x = L.fromX + (L.toX - L.fromX) * prog;
  target.y = L.fromY + (L.toY - L.fromY) * prog - hop;
  // Scale: grows to 1.5× at apex, then SNAPS to 0.85 as we hit the ground,
  // then pops back to 1.0 by end — the "ger yanked up, then slammed down" feel.
  let s;
  if (prog < 0.55)       s = 1 + prog * 0.9;              // 1 → ~1.5
  else if (prog < 0.95)  s = 1.5 - (prog - 0.55) * 1.6;   // 1.5 → 0.86
  else                   s = 0.86 + (prog - 0.95) * 2.8;  // bounce back to ~1.0
  L.scalePulse = s;
  target.launchScale = s;
  // Freeze input / AI state
  target.invincible = true; // block AoE / other damage sources during flight
  // Landed?
  if (L.timer <= 0) {
    // Snap to final position
    target.x = L.toX;
    target.y = L.toY;
    target.launchScale = 1;
    // Restore original flags
    target.invincible = L._prevInvincible;
    target.launched = null;
    return true;
  }
  return false;
}

// =================================================================
//  Skill spawners
// =================================================================
/**
 * Place a SHADOW TRAP at a random location on the battlefield.
 * The trap plays ANIM_SHADOW_ARM (frames 0→ARM_END_FRAME) then pauses,
 * waiting for the player to approach. See updateShadows() for the full
 * state machine (arm → armed_idle → sink → underground → strike → imprison → fade).
 */
function spawnShadowTrap(b, scene, gameState, W, H, target) {
  const B6 = CONFIG.BOSS6;
  const mX = B6.SHADOW_TRAP_MARGIN_X;
  const topY = H * B6.SHADOW_TRAP_TOP_FRAC;
  const botY = H * B6.SHADOW_TRAP_BOTTOM_FRAC;
  const minDist = B6.SHADOW_MIN_DIST_FROM_PLAYER;

  // Sample up to ~8 times to find a position that isn't right on the target
  let sx, sy;
  for (let tries = 0; tries < 8; tries++) {
    sx = W * mX + Math.random() * W * (1 - mX * 2);
    sy = topY + Math.random() * (botY - topY);
    if (!target || Math.hypot(sx - target.x, sy - target.y) >= minDist) break;
  }
  const armDuration = Math.ceil((B6.SHADOW_ARM_END_FRAME + 1) * 60 / B6.SHADOW_ARM_FPS);

  const sprite = scene ? scene.add.sprite(sx, sy, KEY_SHADOW) : null;
  if (sprite) {
    sprite.setDepth(38);
    sprite.setScale(1.2);
    sprite.play(ANIM_SHADOW_ARM);
  }
  b.shadows.push({
    sprite, x: sx, y: sy,
    phase: 'arm',
    timer: armDuration,
    armDuration,
    trackedX: sx,       // updated during 'underground' to track player
    trackedY: sy,
    snareApplied: false,
  });
}

/**
 * ⑥ 群体密集度扫描: 统计 (x,y) 周围 radius 半径内的 hostile 数量
 * (player + enemies + otherBoss,已排除 launched/hidden)
 */
function countHostilesNear(b, x, y, radius, P, enemies, otherBoss) {
  let n = 0;
  for (const h of collectHostiles(b, P, enemies, otherBoss)) {
    if (Math.hypot(h.x - x, h.y - y) < radius + (h.radius || 12)) n++;
  }
  return n;
}

/**
 * 随机触手尺寸 — 返回 [SIZE_MIN, SIZE_MAX] 区间的 scaleMul,
 * 同时控制 sprite 缩放、抓取半径、坠落伤害系数。
 */
function rollTentacleScale() {
  const B6 = CONFIG.BOSS6;
  return B6.TENTACLE_SIZE_MIN + Math.random() * (B6.TENTACLE_SIZE_MAX - B6.TENTACLE_SIZE_MIN);
}

/**
 * ⑥ 触手群体智能选点: 采样 6 个候选点(围绕 target 的圆圈 + 随机偏移),
 * 对每个候选点计算密集度加权。每次 for-loop 选最高分的一个。
 * P1 单根触手只选一个最高分点;P2/P3 多根则均匀分布但仍保留密集度微调。
 * 每根触手同时获得一个随机 scaleMul(尺寸)。
 */
function spawnTentacleField(b, scene, target, P, enemies, otherBoss) {
  const B6 = CONFIG.BOSS6;
  const count = phaseCount(b, B6.TENTACLE_COUNT_P1, B6.TENTACLE_COUNT_P2, B6.TENTACLE_COUNT_P3);

  // 单根触手:优先选密集区
  if (count === 1) {
    // 候选点: target 本身 + 周围 5 个随机点
    const candidates = [{ x: target.x, y: target.y }];
    for (let k = 0; k < 5; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * B6.TENTACLE_SPREAD * 2;
      candidates.push({ x: target.x + Math.cos(a) * r, y: target.y + Math.sin(a) * r });
    }
    // 评分
    let best = candidates[0], bestScore = -Infinity;
    for (const c of candidates) {
      const nHostile = countHostilesNear(b, c.x, c.y, B6.TENTACLE_GROUP_RADIUS, P, enemies, otherBoss);
      // 基础分 = 1(能命中 target),额外每个 hostile 加 GROUP_BONUS
      const score = 1 + nHostile * B6.TENTACLE_GROUP_BONUS;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    b.tentacles.push({
      sprite: null, x: best.x, y: best.y,
      state: 'warn', timer: B6.TENTACLE_WARN_FRAMES,
      launched: false,
      scaleMul: rollTentacleScale(),
    });
    return;
  }

  // 多根触手:均匀分布,但每个点做微调(在局部采样 3 个点选最密集的)
  for (let i = 0; i < count; i++) {
    const a0 = (Math.PI * 2 / count) * i + Math.random() * 0.3;
    const r0 = B6.TENTACLE_SPREAD * (0.4 + Math.random() * 0.5);
    const baseX = target.x + Math.cos(a0) * r0;
    const baseY = target.y + Math.sin(a0) * r0;
    // 在 baseX/Y 附近采样 3 点,选密集度最高
    let best = { x: baseX, y: baseY }, bestScore = -Infinity;
    for (let k = 0; k < 3; k++) {
      const ox = (Math.random() - 0.5) * 60;
      const oy = (Math.random() - 0.5) * 60;
      const cx = baseX + ox, cy = baseY + oy;
      const nHostile = countHostilesNear(b, cx, cy, B6.TENTACLE_GROUP_RADIUS, P, enemies, otherBoss);
      const score = 1 + nHostile * B6.TENTACLE_GROUP_BONUS;
      if (score > bestScore) { bestScore = score; best = { x: cx, y: cy }; }
    }
    b.tentacles.push({
      sprite: null, x: best.x, y: best.y,
      state: 'warn', timer: B6.TENTACLE_WARN_FRAMES,
      launched: false,
      scaleMul: rollTentacleScale(),
    });
  }
}

function spawnAcid(b, scene, target) {
  const B6 = CONFIG.BOSS6;
  const count = phaseCount(b, B6.ACID_COUNT_P1, B6.ACID_COUNT_P2, B6.ACID_COUNT_P3);
  for (let i = 0; i < count; i++) {
    // Predict target position (basic: lead by velocity if available)
    const leadF = B6.ACID_PREDICT_LEAD + i * 10;
    const tx = (target.x || 0) + (target.vx || 0) * leadF + (Math.random() - 0.5) * 40;
    const ty = (target.y || 0) + (target.vy || 0) * leadF + (Math.random() - 0.5) * 40;
    b.acidShots.push({
      sprite: null,
      fromX: b.x, fromY: b.y,   // launch point (boss)
      x: b.x, y: b.y,           // current projectile pos
      tx, ty,                   // target landing
      state: 'travel',
      timer: B6.ACID_TRAVEL_TIME,
      travelTotal: B6.ACID_TRAVEL_TIME,
      lastTick: 0,
      scaleMul: 1,              // 标准尺寸
    });
  }
}

/**
 * Spawn an acid pillar directly at (x, y) — skipping the travel phase.
 * Used by the Acid Ocean ultimate. `scaleMul` scales sprite size, hit radius,
 * AND damage (larger column = harder hit).
 */
function spawnAcidAt(b, scene, x, y, scaleMul) {
  const B6 = CONFIG.BOSS6;
  const pMin = B6.ACID_PRECAST_DURATION_MIN;
  const pMax = Math.max(pMin, B6.ACID_PRECAST_DURATION_MAX);
  const preTimer = pMin + Math.floor(Math.random() * (pMax - pMin + 1));
  const BASE_SPRITE_SCALE = 2.5; // matches spawn-on-landing scale in tick loop

  const a = {
    sprite: null,
    fromX: x, fromY: y,       // no travel — spawn at final location
    x, y,
    tx: x, ty: y,
    state: 'precast',
    timer: preTimer,
    precastTotal: preTimer,
    travelTotal: 1,
    lastTick: 0,
    scaleMul,                 // damage & radius multiplier
  };
  if (scene) {
    a.sprite = scene.add.sprite(x, y + 10, KEY_ACID);
    a.sprite.setDepth(37);
    a.sprite.setScale(BASE_SPRITE_SCALE * scaleMul);
    a.sprite.setOrigin(0.5, 1);
    a.sprite.play(ANIM_ACID_PRECAST);
  }
  b.acidShots.push(a);
}

/**
 * Trigger Acid Ocean ultimate — spawn 15-25 staggered acid columns across the
 * battlefield with random sizes. Fires ONCE when HP crosses the threshold.
 */
function triggerAcidOcean(b, scene, gameState, particles, W, H) {
  const B6 = CONFIG.BOSS6;
  const count = B6.OCEAN_COUNT_MIN + Math.floor(Math.random() * (B6.OCEAN_COUNT_MAX - B6.OCEAN_COUNT_MIN + 1));
  const mX   = B6.OCEAN_SPAWN_MARGIN_X;
  const topY = H * B6.OCEAN_SPAWN_TOP_FRAC;
  const botY = H * B6.OCEAN_SPAWN_BOTTOM_FRAC;
  for (let i = 0; i < count; i++) {
    const x = W * mX + Math.random() * W * (1 - mX * 2);
    const y = topY + Math.random() * (botY - topY);
    const scaleMul = B6.OCEAN_SIZE_MIN + Math.random() * (B6.OCEAN_SIZE_MAX - B6.OCEAN_SIZE_MIN);
    const delay = B6.OCEAN_SPAWN_DELAY_MIN
                + Math.floor(Math.random() * (B6.OCEAN_SPAWN_DELAY_MAX - B6.OCEAN_SPAWN_DELAY_MIN + 1));
    b.oceanQueue.push({ x, y, scaleMul, delay });
  }
  // Big dramatic ritual burst
  gameState.screenShake = Math.max(gameState.screenShake, 20);
  gameState.hitStop = Math.max(gameState.hitStop, 6);
  particles.spawn(b.x, b.y, '#a040ff', 80, 14, 46, 6);
  particles.spawn(b.x, b.y, '#ff2255', 50, 10, 40, 5);
  particles.spawn(b.x, b.y, '#ffffff', 30, 8, 32, 4);
  gameState.showWaveText && gameState.showWaveText('☠ 酸液之海 ☠');
  // Two cosmetic shockwave rings emanating from boss
  b.castFx.push({ kind: 'releaseRing',  x: b.x, y: b.y, timer: 50, maxTimer: 50, color: 0xa040ff, data: { maxR: 420 } });
  b.castFx.push({ kind: 'releaseRing2', x: b.x, y: b.y, timer: 70, maxTimer: 70, color: 0xff2255, data: { maxR: 600, delay: 12 } });
}

/**
 * ① 痛感反击 Pain-Reaction Burst — 玩家连续打出大伤害时,boss 立即反击:
 *   - 身周瞬发爆发环(近身伤害,推开贴脸 DPS)
 *   - 打断/跳过当前吟唱,插入一次随机技能(不等 CD,不走 GLOBAL_CD)
 *   - 进入短冷却 PAIN_COOLDOWN,避免刷屏
 */
function triggerPainReaction(b, P, enemies, otherBoss, gameState, particles) {
  const B6 = CONFIG.BOSS6;
  b.painCD = B6.PAIN_COOLDOWN;
  b.painPool = []; // 清空累积,避免立刻再触发
  // 1) 近身爆发环 — 对 boss 周围所有敌对目标造成伤害
  applyAoEDamage(b, b.x, b.y, B6.PAIN_BURST_RADIUS, B6.PAIN_BURST_DAMAGE,
                 P, enemies, otherBoss, gameState,
                 (tgt) => particles.spawn(tgt.x, tgt.y, '#ff2255', 10, 5, 20, 3));
  // 2) 视觉反馈 — 爆发环 + 屏幕震动
  b.castFx.push({ kind: 'releaseRing',  x: b.x, y: b.y, timer: 24, maxTimer: 24,
                  color: 0xff2255, data: { maxR: B6.PAIN_BURST_RADIUS } });
  b.castFx.push({ kind: 'releaseRing2', x: b.x, y: b.y, timer: 32, maxTimer: 32,
                  color: 0xff6688, data: { maxR: B6.PAIN_BURST_RADIUS * 1.4, delay: 6 } });
  particles.spawn(b.x, b.y, '#ff2255', 28, 8, 30, 5);
  particles.spawn(b.x, b.y, '#ffffff', 14, 6, 22, 3);
  gameState.screenShake = Math.max(gameState.screenShake, 10);
  gameState.hitStop = Math.max(gameState.hitStop, 3);
  gameState.showWaveText && gameState.showWaveText('⚠ 痛感反击 ⚠');
  // 3) 中断当前吟唱,进入一次 PAIN_STAGGER — boss 短暂硬直后立刻选技能
  //    (通过把 globalCD 置为 PAIN_STAGGER_FRAMES 实现,让其尽快自由选招)
  if (b.aiState === 'casting') {
    b.aiState = 'idle';
    b.castSkill = null;
    b.castTarget = null;
  }
  b.globalCD = B6.PAIN_STAGGER_FRAMES;
}

/**
 * ② 阶段仪式 Phase Ritual — boss 进入 P2/P3 时的爆发演出:
 *   - 短暂无敌(阻挡所有伤害)
 *   - P2: 6 根触手圆阵(瞬发 strike,无 warn) + 3 个影陷阱
 *   - P3: 4 根触手圆阵 + (已由 Acid Ocean 自动触发额外海浪)
 */
function triggerPhaseRitual(b, scene, P, enemies, otherBoss, gameState, particles, W, H, phase) {
  const B6 = CONFIG.BOSS6;
  b.ritualInvulTimer = B6.RITUAL_INVUL_FRAMES;
  // 打断当前吟唱
  if (b.aiState === 'casting') {
    b.aiState = 'idle';
    b.castSkill = null;
    b.castTarget = null;
    b.castTimer = 0;
  }
  const tCount = phase === 2 ? B6.RITUAL_P2_TENTACLES : B6.RITUAL_P3_TENTACLES;
  const sCount = phase === 2 ? B6.RITUAL_P2_SHADOWS : 0;
  // 1) 环形触手 — 直接进入 sprout 阶段(跳过 warn 以强调仪式感)
  for (let i = 0; i < tCount; i++) {
    const a = (Math.PI * 2 / tCount) * i + Math.random() * 0.1;
    const r = B6.RITUAL_CIRCLE_RADIUS;
    const tx = b.x + Math.cos(a) * r;
    const ty = b.y + Math.sin(a) * r;
    b.tentacles.push({
      sprite: null, x: tx, y: ty,
      state: 'warn',
      timer: 6, // 极短 warn (0.1s),让仪式一触即发
      launched: false,
      scaleMul: rollTentacleScale(),
    });
  }
  // 2) P2 附加影陷阱(直接用常规 spawner,随机位置)
  for (let i = 0; i < sCount; i++) {
    spawnShadowTrap(b, scene, gameState, W, H, P);
  }
  // 3) 超级仪式演出 — 大型圆阵、多重爆发环、屏幕震动
  const msg = phase === 2 ? '☠ 深渊觉醒 · 仪式 ☠' : '☠ 血月吞噬 · 仪式 ☠';
  gameState.showWaveText && gameState.showWaveText(msg);
  gameState.screenShake = Math.max(gameState.screenShake, 18);
  gameState.hitStop = Math.max(gameState.hitStop, 5);
  particles.spawn(b.x, b.y, '#a040ff', 60, 12, 44, 6);
  particles.spawn(b.x, b.y, '#ff2255', 40, 10, 36, 5);
  particles.spawn(b.x, b.y, '#ffffff', 30, 8, 32, 4);
  b.castFx.push({ kind: 'releaseRing',  x: b.x, y: b.y, timer: 60, maxTimer: 60,
                  color: 0xa040ff, data: { maxR: B6.RITUAL_CIRCLE_RADIUS + 60 } });
  b.castFx.push({ kind: 'releaseRing2', x: b.x, y: b.y, timer: 80, maxTimer: 80,
                  color: 0xff2255, data: { maxR: B6.RITUAL_CIRCLE_RADIUS + 200, delay: 14 } });
}

// =================================================================
//  Skill SELECTION + state machine helpers
//
//  The boss no longer fires skills on independent cooldowns. Instead it
//  picks ONE skill at a time, enters a `casting` state (locked in place,
//  showing a big visible telegraph), then on cast completion the actual
//  skill spawner fires and we transition to `recover`.
// =================================================================

const SKILL_COLORS = {
  shadow:   { hex: 0x6600ff, light: 0xaa66ff, css: '#6600ff' },
  tentacle: { hex: 0xff2255, light: 0xff6688, css: '#ff2255' },
  acid:     { hex: 0xa040ff, light: 0xd080ff, css: '#a040ff' },
};

/**
 * ⑧ 陷阱上限策略: 当场上陷阱数达到 SHADOW_MAX_ACTIVE 时,找到最老的未触发
 * (arm/armed_idle 相位)陷阱,切换到 fade 阶段自然塌回,为新陷阱腾出位置。
 * 若没有可销毁的老陷阱(所有都在追击/禁锢阶段),依然阻止技能释放。
 */
function cullOldestShadow(b) {
  const B6 = CONFIG.BOSS6;
  if (!B6.SHADOW_OLDEST_DESTROY) return false;
  // 找到最早的未触发陷阱(phase === 'arm' || 'armed_idle')
  let oldestIdx = -1;
  for (let i = 0; i < b.shadows.length; i++) {
    const s = b.shadows[i];
    if (s.phase === 'arm' || s.phase === 'armed_idle') {
      oldestIdx = i;
      break; // 第一个(数组头)就是最老的
    }
  }
  if (oldestIdx < 0) return false;
  const s = b.shadows[oldestIdx];
  // 切换到 fade,播放反向收回动画
  if (s.sprite) {
    try { s.sprite.play(ANIM_SHADOW_RETRACT); } catch (e) {}
  }
  s.phase = 'fade';
  s.timer = 18;
  return true;
}

function chooseSkill(b, T) {
  const B6 = CONFIG.BOSS6;
  // Candidate skills that are off their own-recharge
  const options = [];
  // Shadow: 若已达上限,先尝试销毁最老的未触发陷阱;仍满则跳过此技能
  let shadowBlocked = false;
  if (b.shadows && b.shadows.length >= B6.SHADOW_MAX_ACTIVE) {
    // 尝试销毁最老的未触发陷阱;若成功则继续释放,失败则跳过
    shadowBlocked = !cullOldestShadow(b);
  }
  if (b.rechargeShadow   <= 0 && !shadowBlocked) options.push({ name: 'shadow',   w: b.phase >= 2 ? 1.2 : 1.0 });
  if (b.rechargeTentacle <= 0) options.push({ name: 'tentacle', w: 1.4 }); // heavy crowd-control
  if (b.rechargeAcid     <= 0) options.push({ name: 'acid',     w: 1.6 }); // cheap ranged poke

  // Contextual re-weighting: if player is far, lean acid; close, lean tentacle/shadow
  const d = Math.hypot(T.x - b.x, T.y - b.y);
  options.forEach(o => {
    if (o.name === 'acid'     && d > 250) o.w *= 1.6;
    if (o.name === 'tentacle' && d < 320) o.w *= 1.5;
    if (o.name === 'shadow'   && d > 180 && d < 480) o.w *= 1.3;
  });

  if (options.length === 0) return null; // everything on CD — skip cycle
  const total = options.reduce((s, o) => s + o.w, 0);
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.w;
    if (r <= 0) return o.name;
  }
  return options[0].name;
}

/**
 * ③ 连锁打击检测: 当 3 个技能的 recharge 全部 ≤ 0 时,boss 进入 combo-lock,
 * 连续 3 次 cast 不走 recover(每次 cast 结束后直接 idle → 下一个 cast),
 * 且每次 cast 时长 × COMBO_CAST_SPEED。combo 结束后进入超长 recover。
 */
function tryActivateCombo(b) {
  const B6 = CONFIG.BOSS6;
  if (b.comboActive) return;
  if (b.rechargeShadow <= 0 && b.rechargeTentacle <= 0 && b.rechargeAcid <= 0) {
    b.comboActive = true;
    b.comboRemaining = 3;
  }
}

function beginCast(b, skill, T) {
  const B6 = CONFIG.BOSS6;
  b.aiState = 'casting';
  b.castSkill = skill;
  b.castTarget = { x: T.x, y: T.y };
  b.castAngle = Math.atan2(T.y - b.y, T.x - b.x);
  let dur = skill === 'shadow'   ? B6.CAST_SHADOW_DURATION
           : skill === 'tentacle' ? B6.CAST_TENTACLE_DURATION
           : B6.CAST_ACID_DURATION;
  // ③ combo 模式加速 cast
  if (b.comboActive) dur = Math.ceil(dur * B6.COMBO_CAST_SPEED);
  // ⑨ 狂化加速 cast
  if (b.frenzyActive) dur = Math.ceil(dur * B6.FRENZY_CAST_MULT);
  b.castTimer = dur;
  b.castTotal = dur;
  // Mark skill on its own-recharge so it won't repeat immediately
  if (skill === 'shadow')   b.rechargeShadow   = B6.RECHARGE_SHADOW;
  if (skill === 'tentacle') b.rechargeTentacle = B6.RECHARGE_TENTACLE;
  if (skill === 'acid')     b.rechargeAcid     = B6.RECHARGE_ACID;
}

function endCast(b) {
  const B6 = CONFIG.BOSS6;
  // ③ combo 模式: 跳过 recover,直接 idle,同时强制 globalCD 极短
  if (b.comboActive && b.comboRemaining > 1) {
    b.comboRemaining--;
    b.aiState = 'idle';
    b.castSkill = null;
    b.castTarget = null;
    b.castTimer = 0;
    b.castTotal = 0;
    b.globalCD = 8; // ~0.13s 的最小衔接
    return;
  }
  // combo 结束 → 超长 recover
  const comboEnd = b.comboActive && b.comboRemaining <= 1;
  b.comboActive = false;
  b.comboRemaining = 0;
  b.aiState = 'recover';
  const recoverMult = comboEnd ? B6.COMBO_LONG_RECOVER : 1;
  b.castTimer = Math.ceil(B6.RECOVER_DURATION * recoverMult);
  b.castTotal = b.castTimer;
  // globalCD scales with phase — later phases cast faster
  b.globalCD = phaseVal(b, B6.GLOBAL_CD_P1, B6.GLOBAL_CD_P2, B6.GLOBAL_CD_P3);
}

function phaseVal(b, p1, p2, p3) {
  return b.phase === 1 ? p1 : (b.phase === 2 ? p2 : p3);
}

/**
 * Execute the buffered skill after cast finishes.
 * Handles release burst: radial ring, particles, screen shake, hitstop,
 * tether-line FX from boss to each spawned effect (so it feels connected,
 * not random).
 */
function executeCast(b, scene, gameState, particles, T, P, enemies, otherBoss) {
  const B6 = CONFIG.BOSS6;
  const skill = b.castSkill;
  const c = SKILL_COLORS[skill];

  // Universal release burst
  gameState.screenShake = Math.max(gameState.screenShake, 8);
  gameState.hitStop = Math.max(gameState.hitStop, 2);
  particles.spawn(b.x, b.y, c.css, 40, 8, 30, 4);
  addFx(b, 'releaseRing',  b.x, b.y, 30, c.hex, { maxR: b.radius * 3.0 });
  addFx(b, 'releaseRing2', b.x, b.y, 45, c.hex, { maxR: b.radius * 4.5, delay: 8 });
  addFx(b, 'releaseFlash', b.x, b.y, 10, c.light, { maxR: b.radius * 2.5 });

  if (skill === 'shadow') {
    // Place N traps at random map locations (phase-scaled count)
    const n = phaseCount(b, B6.SHADOW_COUNT_P1, B6.SHADOW_COUNT_P2, B6.SHADOW_COUNT_P3);
    const W = gameState.W, H = gameState.H;
    for (let i = 0; i < n; i++) {
      spawnShadowTrap(b, scene, gameState, W, H, T);
      const s = b.shadows[b.shadows.length - 1];
      if (s) {
        // Tether: show ephemeral link from boss to each trap placement point
        addFx(b, 'tether', b.x, b.y, 40, c.hex, { tx: s.x, ty: s.y, curl: (Math.random() - 0.5) * 80 });
        particles.spawn(s.x, s.y, c.css, 18, 5, 24, 3);
      }
    }
  } else if (skill === 'tentacle') {
    spawnTentacleField(b, scene, T, P, enemies, otherBoss);
    // Tether to each spawned tentacle
    b.tentacles.slice(-phaseCount(b, B6.TENTACLE_COUNT_P1, B6.TENTACLE_COUNT_P2, B6.TENTACLE_COUNT_P3)).forEach(t => {
      addFx(b, 'tether', b.x, b.y, 50, c.hex, { tx: t.x, ty: t.y, curl: (Math.random() - 0.5) * 40 });
      particles.spawn(t.x, t.y, c.css, 10, 4, 20, 3);
    });
    // Extra ground wave at player
    addFx(b, 'groundWave', T.x, T.y, 40, c.hex, { maxR: B6.TENTACLE_SPREAD + 60 });
  } else if (skill === 'acid') {
    spawnAcid(b, scene, T);
    // Muzzle flash + a little kick
    const lastN = phaseCount(b, B6.ACID_COUNT_P1, B6.ACID_COUNT_P2, B6.ACID_COUNT_P3);
    b.acidShots.slice(-lastN).forEach(a => {
      particles.spawn(b.x + Math.cos(b.castAngle) * b.radius,
                      b.y + Math.sin(b.castAngle) * b.radius,
                      c.css, 12, 6, 18, 3);
      // Nudge boss slightly back (recoil)
      b.vx -= Math.cos(b.castAngle) * 0.6;
      b.vy -= Math.sin(b.castAngle) * 0.6;
    });
  }
}

/** Push a transient FX into b.castFx. kind determines how drawBoss6 renders it. */
function addFx(b, kind, x, y, maxTimer, color, data) {
  b.castFx.push({ kind, x, y, timer: maxTimer, maxTimer, color, data: data || null });
}

function tickCastFx(b) {
  for (let i = b.castFx.length - 1; i >= 0; i--) {
    b.castFx[i].timer--;
    if (b.castFx[i].timer <= 0) b.castFx.splice(i, 1);
  }
}

// =================================================================
//  Main update
// =================================================================
export function updateBoss6(b, P, bullets, eBullets, mines, particles, gameState, WEAPONS, enemies, otherBoss) {
  const B6 = CONFIG.BOSS6;
  const W = gameState.W, H = gameState.H;
  const scene = gameState.scene;

  // ========= Death sequence =========
  if (b.dying) {
    b.deathAnim++;
    if (b.bodySprite) {
      b.bodySprite.setAlpha(Math.max(0, 1 - b.deathAnim / 90));
      b.bodySprite.y -= 0.3;
      b.bodySprite.setTint(0xff2255);
    }
    if (b.deathAnim >= 90) {
      particles.spawn(b.x, b.y, '#ff2255', 60, 12, 50, 8);
      particles.spawn(b.x, b.y, '#8b2a4e', 60, 12, 50, 8);
      gameState.screenShake = 24;
      gameState.hitStop = 12;
      gameState.kills += B6.KILL_SCORE;
      gameState.showWaveText('ABYSS WARLOCK TERMINATED');
      destroyAllSprites(b);
      return true;
    }
    return false;
  }

  if (b.hp <= 0 && !b.dying) {
    b.dying = true;
    b.deathAnim = 0;
    b.aiState = 'idle';
    b.castSkill = null;
    b.castTarget = null;
    clearActiveSkillSprites(b);
    gameState.screenShake = Math.max(gameState.screenShake, 15);
    gameState.hitStop = Math.max(gameState.hitStop, 4);
    return false;
  }

  ensureSprites(b, scene);

  // ══════════════════════════════════════════════════════════════
  //  帧起始: 帧差检测(处理 ① 痛感反击 + ② 阶段仪式无敌)
  // ══════════════════════════════════════════════════════════════
  // 1) 计算本帧受到的伤害(含所有外部源)
  if (b._prevHp === undefined) b._prevHp = b.hp;
  const damageThisFrame = Math.max(0, b._prevHp - b.hp);

  // 2) ② 阶段仪式无敌: 把刚被扣的血补回来
  if (b.ritualInvulTimer > 0) {
    b.ritualInvulTimer--;
    if (damageThisFrame > 0) {
      b.hp = b._prevHp; // 抵消所有伤害
      // 视觉反馈:紫色盾环
      b.castFx.push({ kind: 'releaseRing', x: b.x, y: b.y, timer: 14, maxTimer: 14,
                      color: 0xa040ff, data: { maxR: b.radius + 30 } });
    }
  } else if (damageThisFrame > 0) {
    // 3) ① 痛感反击: 记录到滑动窗口
    b.painPool.push({ dmg: damageThisFrame, frame: b.atkTimer });
  }

  // 4) 清理过期痛感记录
  b.painPool = b.painPool.filter(e => (b.atkTimer - e.frame) < B6.PAIN_WINDOW);
  // 5) 触发检测
  if (b.painCD > 0) b.painCD--;
  if (b.painCD <= 0 && !b.dying) {
    const totalPain = b.painPool.reduce((s, e) => s + e.dmg, 0);
    if (totalPain >= b.maxHp * B6.PAIN_THRESHOLD_FRAC) {
      triggerPainReaction(b, P, enemies, otherBoss, gameState, particles);
    }
  }

  b.atkTimer++;
  b.hitFlash = Math.max(0, b.hitFlash - 1);
  if (b.charmed > 0) {
    b.charmed--;
    if (b.charmed <= 0 && b.faction === 'ally') b.faction = 'enemy';
  }

  // ---- Snare (Boss6 shadow trap / other CC): freeze AI/move/attack ----
  // Boss6 is normally the snarer, but support self-snare for consistency.
  if (b.snared && b.snared > 0) {
    b.snared--;
    b.vx = 0; b.vy = 0;
    // Sprite 位置仍同步 hitFlash,但跳过 AI / skill / movement
    if (b.bodySprite) { b.bodySprite.x = b.x; b.bodySprite.y = b.y; }
    b._prevHp = b.hp;
    return false;
  }

  // ══════════════════════════════════════════════════════════════
  //  ⑨ Sub-10% 狂化检测(进入/退出)— 只修改 speed/cast 乘数,不动 CD
  // ══════════════════════════════════════════════════════════════
  const shouldFrenzy = b.hp > 0 && b.hp / b.maxHp <= B6.FRENZY_HP_FRAC;
  if (shouldFrenzy && !b.frenzyActive) {
    b.frenzyActive = true;
    gameState.showWaveText && gameState.showWaveText('⚠ 深渊术士 · 狂化 ⚠');
    particles.spawn(b.x, b.y, '#ff0044', 60, 12, 40, 6);
    gameState.screenShake = Math.max(gameState.screenShake, 12);
  }
  if (b.frenzyActive) {
    // 持续粒子
    if (b.atkTimer % 6 === 0) {
      const a = Math.random() * Math.PI * 2;
      particles.spawn(b.x + Math.cos(a) * b.radius, b.y + Math.sin(a) * b.radius,
                      '#ff0044', 3, 2, 14, 2);
    }
  }

  // ========= Entrance =========
  if (!b.entered) {
    b.entranceTimer++;
    const targetY = H * 0.25;
    b.y += (targetY - b.y) * 0.05;
    if (b.bodySprite) {
      b.bodySprite.x = b.x;
      b.bodySprite.y = b.y;
      b.bodySprite.setAlpha(Math.min(1, b.entranceTimer / 40));
    }
    if (b.entranceTimer >= 60) {
      b.entered = true;
      gameState.showWaveText('⚠ 深渊术士 苏醒 ⚠');
    }
    return false;
  }

  // ========= Phase transitions =========
  const prevPhase = b.phase;
  if (b.hp < b.maxHp * B6.PHASE3_THRESHOLD) b.phase = 3;
  else if (b.hp < b.maxHp * B6.PHASE2_THRESHOLD) b.phase = 2;
  if (prevPhase !== b.phase) {
    particles.spawn(b.x, b.y, '#ff2255', 30, 6, 28, 4);
    gameState.screenShake = 8;
    // ② 阶段仪式 — 每阶段只触发一次
    if (b.phase === 2 && !b.ritualTriggered.p2) {
      b.ritualTriggered.p2 = true;
      triggerPhaseRitual(b, scene, P, enemies, otherBoss, gameState, particles, W, H, 2);
    } else if (b.phase === 3 && !b.ritualTriggered.p3) {
      b.ritualTriggered.p3 = true;
      triggerPhaseRitual(b, scene, P, enemies, otherBoss, gameState, particles, W, H, 3);
    }
  }

  // ========= Acid Ocean ultimate (fires each time HP crosses a threshold) =========
  // OCEAN_TRIGGER_HP_FRACS is an ordered list of HP fractions (e.g. [0.80, 0.50]).
  // Each is fired once, in order, the moment boss HP drops below it.
  {
    const fracs = B6.OCEAN_TRIGGER_HP_FRACS;
    while (b.oceanTriggerStage < fracs.length
           && b.hp < b.maxHp * fracs[b.oceanTriggerStage]) {
      b.oceanTriggerStage++;
      // Interrupt any in-progress cast — ocean takes priority
      if (b.aiState === 'casting') {
        b.aiState = 'recover';
        b.castTimer = B6.RECOVER_DURATION;
        b.castTotal = B6.RECOVER_DURATION;
      }
      triggerAcidOcean(b, scene, gameState, particles, W, H);
    }
  }

  // ========= Tick ocean spawn queue (stagger spawns) =========
  if (b.oceanQueue.length > 0) {
    for (let i = b.oceanQueue.length - 1; i >= 0; i--) {
      const o = b.oceanQueue[i];
      o.delay--;
      if (o.delay <= 0) {
        spawnAcidAt(b, scene, o.x, o.y, o.scaleMul);
        b.oceanQueue.splice(i, 1);
      }
    }
  }

  // ========= Determine target =========
  const isCharmed = b.faction === 'ally';
  let T = P.hidden ? null : P;
  if (isCharmed) {
    if (otherBoss && otherBoss.faction !== 'ally' && otherBoss.hp > 0) T = otherBoss;
    else if (enemies) {
      for (const e of enemies) { if (e.faction !== 'ally' && e.hp > 0) { T = e; break; } }
    }
  } else if (P.hidden) {
    if (otherBoss && otherBoss.faction === 'ally' && otherBoss.hp > 0) T = otherBoss;
    else if (enemies) {
      for (const e of enemies) { if (e.faction === 'ally') { T = e; break; } }
    }
  }

  if (!isCharmed && b.threatTable) {
    b.threatTable.timer++;
    if (b.threatTable.timer >= 600) {
      b.threatTable.timer = 0;
      let maxThreat = P.hidden ? -1 : b.threatTable.player;
      let maxTarget = P.hidden ? null : P;
      if (enemies) {
        for (const e of enemies) {
          if (e.faction !== 'ally') continue;
          const key = enemies.indexOf(e);
          const threat = b.threatTable[key] || 0;
          if (threat > maxThreat) { maxThreat = threat; maxTarget = e; }
        }
      }
      if (otherBoss && otherBoss.faction === 'ally' && otherBoss.hp > 0) {
        const threat = b.threatTable.otherBoss || 0;
        if (threat > maxThreat) { maxThreat = threat; maxTarget = otherBoss; }
      }
      b.threatTable.target = maxTarget;
      b.threatTable.player = 0;
      b.threatTable.otherBoss = 0;
      if (enemies) enemies.forEach((_, i) => { b.threatTable[i] = 0; });
    }
    if (b.threatTable.target && b.threatTable.target !== P) {
      const tt = b.threatTable.target;
      if (tt.hp > 0 && (tt.faction === 'ally' || (enemies && enemies.includes(tt)))) T = tt;
    }
  }

  // ========= Movement (frozen during casting for clear telegraph) =========
  const frozen = (b.aiState === 'casting');
  // ⑨ 狂化速度倍增
  const speedMul = b.frenzyActive ? B6.FRENZY_SPEED_MULT : 1;
  if (T && !frozen) {
    const dx = T.x - b.x;
    const dy = T.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    // Approach/retreat to maintain hover distance
    const diff = d - B6.HOVER_DIST;
    const pull = Math.sign(diff) * Math.min(Math.abs(diff) * 0.01, b.speed * speedMul);
    b.vx = (dx / d) * pull;
    b.vy = (dy / d) * pull;
    // Perpendicular drift (sin-based sideways float for visual organic feel)
    const t = b.atkTimer / B6.DRIFT_PERIOD;
    const perp = { x: -dy / d, y: dx / d };
    const driftAmt = Math.cos(t * Math.PI * 2) * 0.6 * speedMul;
    b.vx += perp.x * driftAmt;
    b.vy += perp.y * driftAmt;
  } else {
    // During cast: gentle ease-to-stop (gives nice "brakes" feel)
    b.vx *= 0.85; b.vy *= 0.85;
    // Subtle levitation bob
    b.vy += Math.sin(b.atkTimer * 0.08) * 0.05;
  }
  b.x += b.vx;
  b.y += b.vy;
  // Keep on screen
  b.x = Math.max(b.radius + 20, Math.min(W - b.radius - 20, b.x));
  b.y = Math.max(b.radius + 20, Math.min(H * 0.6, b.y));

  // Sync body sprite
  if (b.bodySprite) {
    b.bodySprite.x = b.x;
    b.bodySprite.y = b.y;
    // Face player horizontally
    if (T) b.bodySprite.flipX = T.x < b.x;
    // Hit flash tint has highest priority
    if (b.hitFlash > 0) {
      b.bodySprite.setTint(0xffffff);
    } else if (b.aiState === 'casting') {
      // Cast-state tint: pulses with skill color as cast progresses toward release
      const prog = 1 - (b.castTimer / b.castTotal);   // 0 → 1
      const pulse = 0.5 + Math.sin(b.atkTimer * 0.6) * 0.5;
      const c = SKILL_COLORS[b.castSkill];
      if (c) {
        // Stronger tint late in cast
        const tintLight = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xffffff),
          Phaser.Display.Color.ValueToColor(c.light),
          100, Math.floor(40 + prog * 60 + pulse * 15)
        );
        const hex = (tintLight.r << 16) | (tintLight.g << 8) | tintLight.b;
        b.bodySprite.setTint(hex);
      }
    } else if (b.phase === 3) {
      b.bodySprite.setTint(0xffaaaa);
    } else {
      b.bodySprite.clearTint();
    }
  }

  // ========= Skill state machine =========
  if (T && !isCharmed) {
    // Tick per-skill recharges (count down regardless of state)
    b.rechargeShadow   = Math.max(0, b.rechargeShadow   - 1);
    b.rechargeTentacle = Math.max(0, b.rechargeTentacle - 1);
    b.rechargeAcid     = Math.max(0, b.rechargeAcid     - 1);

    if (b.aiState === 'idle') {
      if (b.globalCD > 0) b.globalCD--;
      else {
        // ③ 进入 idle 前检查: 若三技能全就绪,开启连锁打击
        tryActivateCombo(b);
        const skill = chooseSkill(b, T);
        if (skill) {
          beginCast(b, skill, T);
          // Cast-start feedback: screen shake, body burst, ground sigil pop
          gameState.screenShake = Math.max(gameState.screenShake, 4);
          particles.spawn(b.x, b.y, SKILL_COLORS[skill].css, 20, 4, 22, 3);
          addFx(b, 'castRing', b.x, b.y, 30, SKILL_COLORS[skill].hex, { maxR: b.radius * 2.2 });
        }
      }
    } else if (b.aiState === 'casting') {
      b.castTimer--;
      // Continuous buildup particles flowing INTO boss center (gathering energy)
      if (b.atkTimer % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = b.radius * 2.5 + Math.random() * 60;
        const sx = b.x + Math.cos(a) * r;
        const sy = b.y + Math.sin(a) * r;
        particles.spawn(sx, sy, SKILL_COLORS[b.castSkill].css, 1, 2, 20, 2);
      }
      // Tip-of-cast flashes: brief bright pulses every so often
      if (b.castTimer > 0 && b.castTimer < b.castTotal * 0.5 && b.atkTimer % 8 === 0) {
        addFx(b, 'castPulse', b.x, b.y, 14, SKILL_COLORS[b.castSkill].hex, { maxR: b.radius * 1.6 });
      }
      // Release!
      if (b.castTimer <= 0) {
        executeCast(b, scene, gameState, particles, T, P, enemies, otherBoss);
        endCast(b);
      }
    } else if (b.aiState === 'recover') {
      b.castTimer--;
      if (b.castTimer <= 0) {
        b.aiState = 'idle';
        b.castSkill = null;
        b.castTarget = null;
      }
    }
  }

  // Tick transient FX
  tickCastFx(b);

  // ========= Tick shadow TRAPS =========
  // Phases: arm → armed_idle → sink → underground → strike → imprison → fade
  //   arm         : plays ANIM_SHADOW_ARM (0→8), pauses on frame 8
  //   armed_idle  : dormant trap; triggers when ANY hostile enters DETECT_RADIUS
  //   sink        : plays ANIM_SHADOW_SINK (8→0 reversed), then underground
  //   underground : invisible, stalks its trigger target's position
  //   strike      : reappears at stalkTarget.x + OFFSET, plays full ANIM_SHADOW_EMERGE
  //   imprison    : player → snared, enemy/otherBoss → burst damaged
  //   fade        : plays ANIM_SHADOW_RETRACT (first RETRACT_FRAMES reversed)
  //
  // "Hostile" is any unit on a different faction team than the boss — so a
  // charmed boss's traps will catch enemies; a hostile boss's traps will catch
  // player + charmed allies.
  const strikeEmergeDur = Math.ceil(B6.SHADOW_EMERGE_FRAMES * 60 / B6.SHADOW_STRIKE_EMERGE_FPS);
  const sinkDur         = Math.ceil((B6.SHADOW_ARM_END_FRAME + 1) * 60 / B6.SHADOW_SINK_FPS);
  const retractDur      = Math.ceil(B6.SHADOW_RETRACT_FRAMES * 60 / B6.SHADOW_RETRACT_FPS);
  for (let i = b.shadows.length - 1; i >= 0; i--) {
    const s = b.shadows[i];
    if (!s) { b.shadows.splice(i, 1); continue; }
    s.timer--;

    if (s.phase === 'arm') {
      // Arming — sprite plays ANIM_SHADOW_ARM and naturally pauses on frame 8.
      if (s.timer <= 0) {
        s.phase = 'armed_idle';
        s.timer = 0;                // indefinite
        if (s.sprite) s.sprite.setFrame(B6.SHADOW_ARM_END_FRAME); // safety
        particles.spawn(s.x, s.y, '#6600ff', 8, 3, 16, 2);
      }
    } else if (s.phase === 'armed_idle') {
      // Trigger if ANY hostile unit enters detection radius. The first one
      // caught becomes the "stalkTarget" that the trap hunts underground.
      const trigger = nearestHostile(b, s.x, s.y, B6.SHADOW_DETECT_RADIUS, P, enemies, otherBoss);
      if (trigger) {
        s.stalkTarget = trigger;
        s.phase = 'sink';
        s.timer = sinkDur;
        if (s.sprite) s.sprite.play(ANIM_SHADOW_SINK);
        particles.spawn(s.x, s.y, '#2a1a3a', 14, 4, 20, 3);
      }
    } else if (s.phase === 'sink') {
      if (s.timer <= 0) {
        s.phase = 'underground';
        s.timer = B6.SHADOW_UNDERGROUND_DELAY;
        if (s.sprite) { s.sprite.destroy(); s.sprite = null; }
        particles.spawn(s.x, s.y, '#1a1028', 10, 3, 18, 2);
      }
    } else if (s.phase === 'underground') {
      // Stalk target during underground phase. If original target dies or hides,
      // fall back to the nearest other hostile. Only bail out if NO hostiles exist.
      let stalk = s.stalkTarget;
      const stalkValid = stalk && stalk.hp > 0 && !(stalk === P && P.hidden) && isHostileTo(b, stalk);
      if (!stalkValid) {
        stalk = nearestHostile(b, s.trackedX, s.trackedY, Infinity, P, enemies, otherBoss);
        s.stalkTarget = stalk;
      }
      if (stalk) {
        s.trackedX = stalk.x;
        s.trackedY = stalk.y;
      }
      if (s.timer <= 0) {
        if (stalk) {
          // Emerge at stalkTarget's right side
          const tx = stalk.x + B6.SHADOW_STRIKE_OFFSET_X;
          const ty = stalk.y;
          s.x = tx; s.y = ty;
          s.phase = 'strike';
          s.timer = strikeEmergeDur;
          if (scene) {
            s.sprite = scene.add.sprite(tx, ty, KEY_SHADOW);
            s.sprite.setDepth(38);
            s.sprite.setScale(1.2);
            s.sprite.play(ANIM_SHADOW_EMERGE);
          }
          particles.spawn(tx, ty, '#6600ff', 24, 6, 26, 4);
          particles.spawn(tx, ty, '#ff2255', 10, 4, 20, 3);
          gameState.screenShake = Math.max(gameState.screenShake, 5);
        } else {
          // No hostile in sight — bail out directly to fade (no sprite)
          s.phase = 'fade';
          s.timer = retractDur;
          s.retractTotal = retractDur;
        }
      }
    } else if (s.phase === 'strike') {
      // Full emerge animation plays; at end, catch the closest hostile in grab range.
      if (s.timer <= 0) {
        s.phase = 'imprison';
        s.timer = B6.SHADOW_IMPRISON_DURATION;
        // ④ 如果是由精准陷落触发的,使用扩大半径
        const grabR = s.grabRadius || B6.SHADOW_STRIKE_GRAB_RADIUS;
        const caught = nearestHostile(b, s.x, s.y, grabR, P, enemies, otherBoss);
        if (caught) {
          if (caught === P && !P.invincible) {
            // Player — apply snare (movement lock for IMPRISON_DURATION)
            P.snared = Math.max(P.snared || 0, B6.SHADOW_IMPRISON_DURATION);
            s.snareApplied = true;
            s.snareTarget = P;
          } else if (caught !== P) {
            // Enemy / charmed boss: apply UNIFIED snare (movement lock) + burst damage.
            // All hostile targetable units support the `.snared` counter now.
            if (!caught.invincible) {
              caught.snared = Math.max(caught.snared || 0, B6.SHADOW_IMPRISON_DURATION);
              // Pin its position so it stays on top of the trap (Boss5 etc.)
              caught.vx = 0; caught.vy = 0;
            }
            // Burst damage on contact (same as before — the snare alone isn't enough
            // reward for high-HP enemies, and this ensures lethal on mooks).
            const burst = Math.max(40, Math.floor(B6.SHADOW_IMPRISON_DURATION * 0.5));
            caught.hp -= burst;
            caught.hitFlash = 10;
            s.snareApplied = true;
            s.snareTarget = caught; // track for visuals + periodic re-snare
          }
          particles.spawn(caught.x, caught.y, '#6600ff', 20, 5, 24, 3);
          gameState.screenShake = Math.max(gameState.screenShake, 6);
          gameState.hitStop = Math.max(gameState.hitStop, 2);
        }
      }
    } else if (s.phase === 'imprison') {
      // Re-apply snare each tick to keep the caught target locked
      // (robust vs. other sources clearing it). Uniform for player + enemy + boss.
      const tgt = s.snareTarget;
      if (s.snareApplied && tgt && tgt.hp > 0 && !tgt.hidden && !tgt.invincible && isHostileTo(b, tgt)) {
        tgt.snared = Math.max(tgt.snared || 0, 2);
        // Pin velocity (defense in depth — each target's own update also does this)
        tgt.vx = 0; tgt.vy = 0;
      }
      // Emit binding-tendril particles between shadow and whichever target was caught
      const vizTarget = s.snareTarget;
      if (b.atkTimer % 4 === 0 && vizTarget && vizTarget.hp > 0) {
        const mx = (s.x + vizTarget.x) * 0.5 + (Math.random() - 0.5) * 20;
        const my = (s.y + vizTarget.y) * 0.5 + (Math.random() - 0.5) * 20;
        particles.spawn(mx, my, '#6600ff', 1, 2, 14, 2);
      }
      if (s.timer <= 0) {
        // Imprison done — retract animation: play first RETRACT_FRAMES frames in reverse.
        s.phase = 'fade';
        s.timer = retractDur;
        s.retractTotal = retractDur;
        if (s.sprite) s.sprite.play(ANIM_SHADOW_RETRACT);
        // Release snare immediately so target can move again during retract.
        if (s.snareApplied && s.snareTarget) {
          s.snareTarget.snared = 0;
          s.snareApplied = false;
        }
        particles.spawn(s.x, s.y, '#1a1028', 12, 4, 20, 3);
      }
    } else if (s.phase === 'fade') {
      // Sprite plays retract animation autonomously. Only apply alpha fade in
      // the last ~4 ticks so the sprite doesn't pop out abruptly when destroyed.
      if (s.sprite && s.timer < 4) {
        s.sprite.setAlpha(Math.max(0, s.timer / 4));
      }
    }

    // Keep sprite position in sync (only matters for strike+imprison+fade which have a sprite)
    if (s.sprite) { s.sprite.x = s.x; s.sprite.y = s.y; }

    // Cleanup at end of fade
    if (s.phase === 'fade' && s.timer <= 0) {
      if (s.sprite) s.sprite.destroy();
      b.shadows.splice(i, 1);
    }
  }

  // ========= Tick tentacles =========
  // Phases:
  //   warn   — pulsing ground circle, no sprite yet (TENTACLE_WARN_FRAMES)
  //   sprout — sprite plays frames 0-15 (rows 1+2, TENTACLE_SPROUT_FRAMES / FPS)
  //   strike — INSTANT moment when sprite enters row 3 frame 1: find nearest
  //            hostile within HIT_RADIUS, launch them. Sprite transitions to SWAY.
  //   sway   — sprite loops row 3 (TENTACLE_SWAY_DURATION). No damage.
  //   fade   — alpha fade out over 20 ticks; destroy.
  const sproutDur = Math.ceil(B6.TENTACLE_SPROUT_FRAMES * 60 / B6.TENTACLE_SPROUT_FPS);
  for (let i = b.tentacles.length - 1; i >= 0; i--) {
    const t = b.tentacles[i];
    if (!t) { b.tentacles.splice(i, 1); continue; }
    t.timer--;
    // 随机尺寸:旧数据兼容默认 1.0
    const tSMul = t.scaleMul || 1;
    const tHitR = B6.TENTACLE_HIT_RADIUS * tSMul;
    if (t.state === 'warn') {
      if (t.timer <= 0) {
        // End of warn — spawn sprite and start sprouting
        if (scene) {
          t.sprite = scene.add.sprite(t.x, t.y + 20, KEY_TENTACLES);
          t.sprite.setDepth(36);
          t.sprite.setScale((B6.TENTACLE_BASE_SPRITE_SCALE || 2.0) * tSMul);
          t.sprite.setOrigin(0.5, 1); // anchor at bottom so it rises from ground
          t.sprite.play(ANIM_TENTACLE_SPROUT);
        }
        t.state = 'sprout';
        t.timer = sproutDur;
        particles.spawn(t.x, t.y, '#8b2a4e', 14, 4, 22, 3);
      }
    } else if (t.state === 'sprout') {
      // No damage during sprout — it's the warning/grow phase. Just wait for
      // the animation to reach row 3 frame 1 (= end of sprout).
      if (t.timer <= 0) {
        // STRIKE — instant moment when tentacle is fully up.
        // Pick nearest hostile within HIT_RADIUS × scaleMul.
        const caught = nearestHostile(b, t.x, t.y, tHitR, P, enemies, otherBoss);
        if (caught) {
          // All hostiles (player / enemies / charmed bosses) get launched; boss
          // launch is safe because Boss1-5 update() early-returns on .launched.
          // 落地伤害系数随触手尺寸缩放。
          beginLaunch(caught, b, W, H, tSMul);
          particles.spawn(caught.x, caught.y, '#ff2255', 20, 6, 26, 4);
          particles.spawn(caught.x, caught.y, '#8b2a4e', 14, 5, 22, 3);
          gameState.screenShake = Math.max(gameState.screenShake, 7);
          gameState.hitStop = Math.max(gameState.hitStop, 3);
          t.struckTarget = caught;
        }
        // Transition to sway — sprite loops row 3.
        if (t.sprite) t.sprite.play(ANIM_TENTACLE_SWAY);
        t.state = 'sway';
        t.timer = B6.TENTACLE_SWAY_DURATION;
      }
    } else if (t.state === 'sway') {
      // Sprite just loops row 3 animation. No damage, purely visual.
      if (t.timer <= 0) { t.state = 'fade'; t.timer = 20; }
    } else if (t.state === 'fade') {
      if (t.sprite) t.sprite.setAlpha(t.timer / 20);
    }
    if (t.timer <= 0 && t.state === 'fade') {
      if (t.sprite) t.sprite.destroy();
      b.tentacles.splice(i, 1);
    }
  }

  // ========= Tick launched targets (parabolic flight + fall damage) =========
  // Handles player + any enemy + charmed boss currently in a `.launched`
  // state. Drives their position, scale, and applies fall damage on landing.
  const launchedVictims = [];
  if (P && P.launched) launchedVictims.push(P);
  if (enemies) for (const e of enemies) { if (e.launched) launchedVictims.push(e); }
  // otherBoss is now launchable (bosses' update early-returns on `.launched`).
  if (otherBoss) {
    if (Array.isArray(otherBoss)) {
      for (const ob of otherBoss) { if (ob && ob.launched) launchedVictims.push(ob); }
    } else if (otherBoss.launched) {
      launchedVictims.push(otherBoss);
    }
  }
  for (const v of launchedVictims) {
    const L = v.launched;
    // Cache fallDamage/trap before tickLaunched clears L
    const fallDmg = L.fallDamage;
    const trap    = L.trapRef;
    const landed  = tickLaunched(v, gameState);
    if (landed) {
      // Apply fall damage (ignores invincibility — this is unconditional)
      if (v === P) {
        // dmgPlayer respects invincible internally; we've already restored flags.
        gameState.dmgPlayer(fallDmg);
        if (!gameState.gameRunning) return false;
      } else {
        v.hp -= fallDmg;
        v.hitFlash = 10;
      }
      particles.spawn(v.x, v.y, '#ff2255', 18, 6, 24, 3);
      particles.spawn(v.x, v.y, '#ffffff', 8, 4, 16, 2);
      gameState.screenShake = Math.max(gameState.screenShake, 6);
      gameState.hitStop = Math.max(gameState.hitStop, 2);
      // ④ 精准陷落 Precision Launch-to-Trap — 若落点是 armed 陷阱,
      // 跳过 sink/underground 延迟,直接进入 strike,并扩大抓取半径。
      if (trap && trap.phase === 'armed_idle' && B6.LAUNCH_TRAP_INSTANT) {
        // 直接进入 strike 阶段
        trap.phase = 'strike';
        trap.timer = Math.ceil(B6.SHADOW_EMERGE_FRAMES * 60 / B6.SHADOW_STRIKE_EMERGE_FPS);
        trap.strikeX = trap.x; // 在陷阱位置直接突出(不偏移)
        trap.strikeY = trap.y;
        trap.grabRadius = B6.LAUNCH_TRAP_GRAB_RADIUS; // 扩大抓取
        if (trap.sprite) {
          try { trap.sprite.play(ANIM_SHADOW_EMERGE); } catch (e) {}
          trap.sprite.x = trap.x;
          trap.sprite.y = trap.y;
        }
        particles.spawn(trap.x, trap.y, '#6600ff', 24, 6, 26, 4);
        particles.spawn(trap.x, trap.y, '#ffffff', 12, 5, 20, 3);
        gameState.screenShake = Math.max(gameState.screenShake, 8);
      }
    }
  }

  // ========= Tick acid shots =========
  // State flow: travel → precast (small 2-frame warning loop) → active
  //             (middle full-spray loop random 2~10 cycles, deals damage) → fade
  for (let i = b.acidShots.length - 1; i >= 0; i--) {
    const a = b.acidShots[i];
    if (!a) { b.acidShots.splice(i, 1); continue; }
    a.timer--;
    if (a.state === 'travel') {
      // Parabolic arc from fromX,fromY to tx,ty
      const prog = 1 - (a.timer / a.travelTotal);
      a.x = a.fromX + (a.tx - a.fromX) * prog;
      a.y = a.fromY + (a.ty - a.fromY) * prog - Math.sin(prog * Math.PI) * 120; // arc height
      // Emit trail particles
      if (b.atkTimer % 3 === 0) particles.spawn(a.x, a.y, '#a040ff', 2, 3, 10, 2);
      if (a.timer <= 0) {
        // Landed — spawn acid column sprite playing the PRECAST warning animation (infinite loop)
        if (scene) {
          a.sprite = scene.add.sprite(a.tx, a.ty + 10, KEY_ACID);
          a.sprite.setDepth(37);
          a.sprite.setScale(2.5);
          a.sprite.setOrigin(0.5, 1);
          a.sprite.play(ANIM_ACID_PRECAST);
        }
        a.state = 'precast';
        // Time-based precast duration: random in [MIN, MAX] ticks (at least 0.5s)
        const pMin = B6.ACID_PRECAST_DURATION_MIN;
        const pMax = Math.max(pMin, B6.ACID_PRECAST_DURATION_MAX);
        a.timer = pMin + Math.floor(Math.random() * (pMax - pMin + 1));
        a.precastTotal = a.timer; // stored for draw progress bar
        a.x = a.tx; a.y = a.ty;
        particles.spawn(a.tx, a.ty, '#a040ff', 16, 5, 20, 3);
        gameState.screenShake = Math.max(gameState.screenShake, 3);
      }
    } else if (a.state === 'precast') {
      // Warning phase — no damage, just telegraph
      // Rising warning sparks from ground
      if (b.atkTimer % 3 === 0) {
        const sx = a.x + (Math.random() - 0.5) * 16;
        const sy = a.y - Math.random() * 20;
        particles.spawn(sx, sy, '#d080ff', 1, 3, 14, 2);
      }
      if (a.timer <= 0) {
        // Time-based full-spray duration: random in [MIN, MAX] ticks (2s ~ 8s @ 60fps)
        const fMin = B6.ACID_FULLSPRAY_DURATION_MIN;
        const fMax = Math.max(fMin, B6.ACID_FULLSPRAY_DURATION_MAX);
        a.state = 'active';
        a.timer = fMin + Math.floor(Math.random() * (fMax - fMin + 1));
        a.fullsprayTotal = a.timer; // stored for draw if needed
        a.lastTick = 0;
        if (a.sprite) a.sprite.play(ANIM_ACID_LOOP);
        // Big eruption feedback
        particles.spawn(a.x, a.y, '#a040ff', 30, 8, 28, 4);
        particles.spawn(a.x, a.y, '#ffffff', 10, 6, 18, 3);
        gameState.screenShake = Math.max(gameState.screenShake, 6);
        gameState.hitStop = Math.max(gameState.hitStop, 1);
      }
    } else if (a.state === 'active') {
      // Full-spray AoE — damage & radius scale with the column's size. Hits all
      // units hostile to the boss (player / enemies / other boss).
      const sMul = a.scaleMul || 1;
      a.lastTick++;
      if (a.lastTick >= B6.ACID_TICK_RATE) {
        const hitR = B6.ACID_HIT_RADIUS * sMul;
        const dmg = B6.ACID_DAMAGE * sMul;
        applyAoEDamage(b, a.x, a.y, hitR, dmg,
          P, enemies, otherBoss, gameState,
          (tgt) => particles.spawn(tgt.x, tgt.y, '#a040ff', Math.round(10 * sMul), 4, 16, 2));
        if (!gameState.gameRunning) return false;
        a.lastTick = 0;
      }
      // Continuous edge particles + drip — bigger column = wider/more drip
      if (b.atkTimer % 5 === 0) {
        const sx = a.x + (Math.random() - 0.5) * 24 * sMul;
        particles.spawn(sx, a.y - Math.random() * 40 * sMul, '#a040ff', 1, 3, 16, 2);
      }
      if (a.timer <= 0) {
        // Transition to fade: play the RETRACT animation (grow frames reversed).
        // Timer is sized so sprite destruction happens right after retract completes.
        a.state = 'fade';
        a.timer = Math.ceil(B6.ACID_RETRACT_FRAMES * 60 / B6.ACID_RETRACT_FPS);
        a.retractTotal = a.timer;
        if (a.sprite) a.sprite.play(ANIM_ACID_RETRACT);
        // Small downward particle puff — column sinking back into ground
        particles.spawn(a.x, a.y, '#a040ff', 14, 4, 18, 3);
        // ⑤ 酸池残留 Acid Residue — 留下一块持续 4s 的低伤池
        const poolR = (a.scaleMul || 1) * B6.ACID_HIT_RADIUS * B6.ACID_POOL_RADIUS_MULT;
        b.acidPools.push({
          x: a.x, y: a.y,
          radius: poolR,
          timer: B6.ACID_POOL_DURATION,
          maxTimer: B6.ACID_POOL_DURATION,
          tickTimer: B6.ACID_POOL_TICK,
          scaleMul: a.scaleMul || 1,
        });
      }
    } else if (a.state === 'fade') {
      // Sprite plays retract anim autonomously. Only fade alpha in the last ~20%
      // of retract so it doesn't just pop out when destroyed.
      if (a.sprite) {
        const fadeHead = Math.min(a.retractTotal || 30, 8);
        if (a.timer < fadeHead) a.sprite.setAlpha(a.timer / fadeHead);
      }
    }
    if (a.timer <= 0 && a.state === 'fade') {
      if (a.sprite) a.sprite.destroy();
      b.acidShots.splice(i, 1);
    }
  }

  // ========= Tick acid pools (⑤ 残留酸池) =========
  // 每 ACID_POOL_TICK 帧对范围内所有敌对目标造成小量伤害;
  // timer 到期后自然消失。
  for (let i = b.acidPools.length - 1; i >= 0; i--) {
    const pool = b.acidPools[i];
    pool.timer--;
    pool.tickTimer--;
    if (pool.tickTimer <= 0) {
      pool.tickTimer = B6.ACID_POOL_TICK;
      applyAoEDamage(b, pool.x, pool.y, pool.radius, B6.ACID_POOL_DAMAGE,
                     P, enemies, otherBoss, gameState,
                     (tgt) => particles.spawn(tgt.x, tgt.y, '#a040ff', 4, 3, 12, 2));
    }
    if (pool.timer <= 0) {
      b.acidPools.splice(i, 1);
    }
  }

  // ========= Bullet collision on BODY =========
  // (handled externally by GameScene? let's do local pass for consistency with other bosses)
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const bu = bullets[bi];
    if (!bu || bu.life <= 0) continue;
    if (Math.hypot(bu.x - b.x, bu.y - b.y) < b.radius) {
      // ② 阶段仪式无敌:不吃伤害,但仍消耗子弹(视觉上"打到盾")
      if (b.ritualInvulTimer > 0) {
        particles.spawn(bu.x, bu.y, '#a040ff', 8, 4, 16, 2);
        bullets.splice(bi, 1);
        continue;
      }
      b.hp -= bu.damage || 15;
      b.hitFlash = 6;
      particles.spawn(bu.x, bu.y, '#ff2255', 6, 4, 14, 2);
      bullets.splice(bi, 1);
      if (b.hp <= 0) {
        b.dying = true;
        b.deathAnim = 0;
        b.aiState = 'idle';
        b.castSkill = null;
        b.castTarget = null;
        clearActiveSkillSprites(b);
        break;
      }
    }
  }

  // 更新 _prevHp 供下一帧帧差检测
  b._prevHp = b.hp;
  return false;
}

// =================================================================
//  Draw — only environmental effects. The body is a Phaser Sprite
//  rendered by the scene display list, not via Graphics.
//
//  Layering (back → front):
//    1. Under-boss ritual circle (always on, pulses skill color)
//    2. Cast telegraph: energy tether + target-side sigil + buildup halo
//    3. Transient castFx (rings, pulses, flashes, tethers, groundWaves)
//    4. Tentacle warnings + active damage rings
//    5. Acid projectile multi-layer + ground pool
//    6. Shadow minion FX (emerge / chase)
// =================================================================
export function drawBoss6(g, b, P, time) {
  if (!b.entered || b.dying) return;
  const B6 = CONFIG.BOSS6;

  // Pick active color theme — uses casting skill's palette during cast,
  // defaults to phase-red otherwise.
  const stateColor = (b.aiState === 'casting' && b.castSkill)
    ? SKILL_COLORS[b.castSkill]
    : { hex: 0xff2255, light: 0xff6688 };

  // ---- 1. Under-boss ritual circle ----
  drawRitualCircle(g, b, stateColor, time);

  // ---- 1b. ⑦ 施法期旋转符文圈 (casting 时脚下多一层旋转法阵) ----
  if (b.aiState === 'casting' && b.castSkill) {
    drawCastRunes(g, b, stateColor, time, b.castTimer / Math.max(1, b.castTotal));
  }

  // ---- 1c. ② 阶段仪式无敌: 紫色护盾光环 ----
  if (b.ritualInvulTimer > 0) {
    drawRitualInvulAura(g, b, time);
  }

  // ---- 2. Casting telegraph (only while casting) ----
  if (b.aiState === 'casting' && b.castTarget) {
    drawCastTelegraph(g, b, stateColor, time);
  }

  // ---- 3. Transient cast FX ----
  for (const fx of b.castFx) drawFx(g, fx, time);

  // ---- 4. Tentacle warnings + active ----
  for (const t of b.tentacles) drawTentacleFx(g, t, time, B6);

  // ---- 5. Acid projectile + active ----
  for (const a of b.acidShots) drawAcidFx(g, a, time, B6);
  // ---- 5b. Acid residue pools (⑤) ----
  for (const pool of b.acidPools) drawAcidPool(g, pool, time);

  // ---- 6. Shadow traps ----
  for (const s of b.shadows) drawShadowFx(g, s, time, P, B6);
}

// -------------------------------------------------------------
//  Sub-draw helpers
// -------------------------------------------------------------

/**
 * ⑦ 施法期旋转符文圈 — 在 boss 脚下多一层旋转法阵,施法进度越深,
 * 法阵越大越亮。反方向旋转的两层 + 4~8 个符号节点。
 * @param castProg boss.castTimer / castTotal (1 → 0)
 */
function drawCastRunes(g, b, c, time, castProg) {
  const castAdv = 1 - castProg; // 0 → 1
  const runeY = b.y + b.radius * 0.45;
  const baseR = b.radius * (1.7 + castAdv * 0.6); // 施法深入时圈逐渐变大
  const rot1 = time * 0.004; // 外环顺时针
  const rot2 = -time * 0.005 + Math.PI / 6; // 内环逆时针
  const alphaMul = 0.5 + castAdv * 0.5;

  // 外环: 8 个菱形节点
  const nodesOut = 8;
  for (let i = 0; i < nodesOut; i++) {
    const a = rot1 + (Math.PI * 2 / nodesOut) * i;
    const rx = b.x + Math.cos(a) * baseR;
    const ry = runeY + Math.sin(a) * baseR * 0.55; // 压扁成椭圆
    g.fillStyle(c.hex, 0.6 * alphaMul);
    g.beginPath();
    g.moveTo(rx, ry - 5);
    g.lineTo(rx + 4, ry);
    g.lineTo(rx, ry + 5);
    g.lineTo(rx - 4, ry);
    g.closePath();
    g.fillPath();
  }
  // 外环圆
  g.lineStyle(1.2, c.hex, 0.45 * alphaMul);
  g.strokeEllipse ? g.strokeEllipse(b.x, runeY, baseR * 2, baseR * 1.1) : g.strokeCircle(b.x, runeY, baseR);

  // 内环: 5 个三角节点,反向旋转
  const innerR = baseR * 0.68;
  const nodesIn = 5;
  for (let i = 0; i < nodesIn; i++) {
    const a = rot2 + (Math.PI * 2 / nodesIn) * i;
    const rx = b.x + Math.cos(a) * innerR;
    const ry = runeY + Math.sin(a) * innerR * 0.55;
    g.fillStyle(c.light || c.hex, 0.7 * alphaMul);
    g.beginPath();
    g.moveTo(rx, ry - 6);
    g.lineTo(rx + 5, ry + 4);
    g.lineTo(rx - 5, ry + 4);
    g.closePath();
    g.fillPath();
  }
  g.lineStyle(1, c.light || c.hex, 0.35 * alphaMul);
  g.strokeEllipse ? g.strokeEllipse(b.x, runeY, innerR * 2, innerR * 1.1) : g.strokeCircle(b.x, runeY, innerR);

  // 中心亮点 — 施法进度指示器
  const coreR = 6 + castAdv * 8;
  g.fillStyle(0xffffff, 0.35 + castAdv * 0.5);
  g.fillCircle(b.x, runeY, coreR);
  g.fillStyle(c.hex, 0.8);
  g.fillCircle(b.x, runeY, coreR * 0.6);
}

/**
 * ② 阶段仪式无敌护盾 — 紫色多层脉动光环
 */
function drawRitualInvulAura(g, b, time) {
  const pulse = 0.6 + Math.sin(time * 0.02) * 0.4;
  // 外圈能量环
  g.lineStyle(4, 0xa040ff, 0.6 * pulse);
  g.strokeCircle(b.x, b.y, b.radius + 10);
  g.lineStyle(2, 0xd080ff, 0.45 * pulse);
  g.strokeCircle(b.x, b.y, b.radius + 26 + pulse * 4);
  // 内圈光晕
  g.fillStyle(0xa040ff, 0.08 * pulse);
  g.fillCircle(b.x, b.y, b.radius + 30);
  // 8 颗绕行光点
  const dots = 8;
  for (let i = 0; i < dots; i++) {
    const a = (Math.PI * 2 / dots) * i + time * 0.003;
    g.fillStyle(0xe8b0ff, 0.9);
    g.fillCircle(b.x + Math.cos(a) * (b.radius + 20), b.y + Math.sin(a) * (b.radius + 20), 3);
  }
}

function drawRitualCircle(g, b, c, time) {
  const circleY = b.y + b.radius * 0.55;
  const baseR = b.radius * 1.35;
  const pulse = 1 + Math.sin(time * 0.003) * 0.12;
  // Outer glow pool
  g.fillStyle(c.hex, 0.12 * pulse);
  g.fillCircle(b.x, circleY, baseR * 1.45 * pulse);
  // Main ring
  g.lineStyle(3, c.hex, 0.55);
  g.strokeCircle(b.x, circleY, baseR);
  // Inner counter-rotating ring
  g.lineStyle(1.5, c.light, 0.4);
  g.strokeCircle(b.x, circleY, baseR * 0.72);

  // Rune nodes — phase-scaled count, rotating
  const runeCount = b.phase >= 3 ? 7 : (b.phase >= 2 ? 6 : 5);
  const runeRot = time * 0.0009;
  for (let i = 0; i < runeCount; i++) {
    const a = runeRot + (Math.PI * 2 / runeCount) * i;
    const rx = b.x + Math.cos(a) * baseR;
    const ry = circleY + Math.sin(a) * baseR * 0.55;
    g.fillStyle(c.light, 0.5);
    g.fillCircle(rx, ry, 6);
    g.fillStyle(c.hex, 1);
    g.fillCircle(rx, ry, 3);
  }
  // Inner star lines
  g.lineStyle(1, c.light, 0.25);
  for (let i = 0; i < runeCount; i++) {
    const a = -runeRot + (Math.PI * 2 / runeCount) * i;
    g.beginPath();
    g.moveTo(b.x, circleY);
    g.lineTo(b.x + Math.cos(a) * baseR * 0.72, circleY + Math.sin(a) * baseR * 0.4);
    g.strokePath();
  }
}

function drawCastTelegraph(g, b, c, time) {
  const prog = 1 - (b.castTimer / b.castTotal); // 0 → 1

  // Buildup halo — grows with prog, pulses brightly near release
  const haloR = b.radius * (1.1 + prog * 1.3);
  const urgency = prog > 0.7 ? (Math.sin(time * 0.15) * 0.5 + 0.5) : 0;
  g.lineStyle(3 + prog * 3, c.light, 0.4 + prog * 0.5);
  g.strokeCircle(b.x, b.y, haloR);
  g.lineStyle(1.5, c.hex, 0.3 + prog * 0.5 + urgency * 0.3);
  g.strokeCircle(b.x, b.y, haloR * 1.15);

  // Dotted charging circle counter-rotating around boss
  const dotN = 12;
  for (let i = 0; i < dotN; i++) {
    const a = (Math.PI * 2 / dotN) * i - time * 0.004;
    const rr = haloR + 12;
    const dx = b.x + Math.cos(a) * rr;
    const dy = b.y + Math.sin(a) * rr;
    g.fillStyle(c.light, 0.6);
    g.fillCircle(dx, dy, 2 + prog * 2);
  }

  // Energy tether from boss → target (curvy)
  drawEnergyTether(g, b.x, b.y, b.castTarget.x, b.castTarget.y, c, prog, time);

  // Target-side growing rune
  const tgtR = 28 + prog * 90;
  g.lineStyle(2, c.hex, 0.35 + prog * 0.5);
  g.strokeCircle(b.castTarget.x, b.castTarget.y, tgtR);
  g.lineStyle(1, c.light, 0.3 + prog * 0.4);
  g.strokeCircle(b.castTarget.x, b.castTarget.y, tgtR * 0.68);
  // 6-spoke rune rotating
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 / 6) * i + time * 0.003;
    const inR = tgtR * 0.35;
    const outR = tgtR * 0.92;
    g.lineStyle(1.5, c.light, 0.5);
    g.beginPath();
    g.moveTo(b.castTarget.x + Math.cos(a) * inR, b.castTarget.y + Math.sin(a) * inR);
    g.lineTo(b.castTarget.x + Math.cos(a) * outR, b.castTarget.y + Math.sin(a) * outR);
    g.strokePath();
  }
  // Urgency flash at target near release
  if (prog > 0.75) {
    const f = Math.sin(time * 0.1) * 0.5 + 0.5;
    g.fillStyle(c.light, 0.25 * f);
    g.fillCircle(b.castTarget.x, b.castTarget.y, tgtR * 0.45);
  }
}

function drawEnergyTether(g, x1, y1, x2, y2, c, prog, time) {
  // Curvy beam with mid-point wobble, segmented along N steps
  const N = 16;
  const dx = x2 - x1, dy = y2 - y1;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d; // normal
  // Mid-arc amplitude wobbles with time
  const amp = d * 0.12 * (0.6 + Math.sin(time * 0.01) * 0.2);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // Sinusoidal bulge peaking mid-beam
    const wobble = Math.sin(t * Math.PI) * amp + Math.sin(t * Math.PI * 6 + time * 0.02) * 5;
    const px = x1 + dx * t + nx * wobble;
    const py = y1 + dy * t + ny * wobble;
    pts.push([px, py]);
  }
  // Outer glow stroke
  g.lineStyle(5 + prog * 5, c.hex, 0.25 + prog * 0.25);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokePath();
  // Inner bright core
  g.lineStyle(2, c.light, 0.6 + prog * 0.35);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokePath();
  // Energy beads flowing from boss → target
  const beadCount = 6;
  for (let i = 0; i < beadCount; i++) {
    const t = ((time * 0.001 * 2 + i / beadCount) % 1);
    const idx = Math.floor(t * N);
    if (idx >= 0 && idx < pts.length) {
      const [px, py] = pts[idx];
      g.fillStyle(c.light, 0.9);
      g.fillCircle(px, py, 3 + prog * 2);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(px, py, 1.5);
    }
  }
}

/** Render a single transient cast effect */
function drawFx(g, fx, time) {
  const prog = 1 - (fx.timer / fx.maxTimer);           // 0 → 1
  const alpha = Math.max(0, fx.timer / fx.maxTimer);   // 1 → 0

  if (fx.kind === 'castRing' || fx.kind === 'releaseRing') {
    const r = (fx.data?.maxR || 80) * prog;
    g.lineStyle(4 - prog * 2, fx.color, alpha * 0.9);
    g.strokeCircle(fx.x, fx.y, r);
  } else if (fx.kind === 'releaseRing2') {
    const delay = fx.data?.delay || 0;
    const effP = Math.max(0, (prog - delay / fx.maxTimer)) * (1 / (1 - delay / fx.maxTimer));
    if (effP > 0) {
      const r = (fx.data?.maxR || 120) * effP;
      g.lineStyle(3, fx.color, (1 - effP) * 0.8);
      g.strokeCircle(fx.x, fx.y, r);
    }
  } else if (fx.kind === 'releaseFlash') {
    const r = (fx.data?.maxR || 60) * (1 - prog);
    g.fillStyle(fx.color, alpha * 0.6);
    g.fillCircle(fx.x, fx.y, r);
    g.fillStyle(0xffffff, alpha * 0.5);
    g.fillCircle(fx.x, fx.y, r * 0.4);
  } else if (fx.kind === 'castPulse') {
    const r = (fx.data?.maxR || 60) * prog;
    g.lineStyle(2, fx.color, alpha * 0.7);
    g.strokeCircle(fx.x, fx.y, r);
  } else if (fx.kind === 'tether') {
    // Fade-out dark energy link that persists briefly after spawn
    const tx = fx.data?.tx ?? fx.x;
    const ty = fx.data?.ty ?? fx.y;
    const curl = fx.data?.curl || 0;
    const dx = tx - fx.x, dy = ty - fx.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const N = 10;
    g.lineStyle(3, fx.color, alpha * 0.6);
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const px = fx.x + dx * t + nx * curl * Math.sin(t * Math.PI);
      const py = fx.y + dy * t + ny * curl * Math.sin(t * Math.PI);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
  } else if (fx.kind === 'groundWave') {
    const r = (fx.data?.maxR || 200) * prog;
    g.lineStyle(3, fx.color, alpha * 0.7);
    g.strokeCircle(fx.x, fx.y, r);
    g.lineStyle(1.5, fx.color, alpha * 0.4);
    g.strokeCircle(fx.x, fx.y, r * 1.15);
  }
}

function drawTentacleFx(g, t, time, B6) {
  // 所有绘制均随触手尺寸缩放
  const sMul = t.scaleMul || 1;
  const HIT_R = B6.TENTACLE_HIT_RADIUS * sMul;
  if (t.state === 'warn') {
    // Ground telegraph — cracks + dark pool + warning ring before the tentacle bursts out.
    const prog = 1 - (t.timer / B6.TENTACLE_WARN_FRAMES);
    const pulse = 0.5 + Math.sin(time * 0.025) * 0.5;
    // Inner dark pool
    g.fillStyle(0x4a0a1a, 0.18 + prog * 0.35);
    g.fillCircle(t.x, t.y, HIT_R);
    // Cracking ground veins — radiating out
    const vN = 6;
    g.lineStyle(1.5, 0xff2255, 0.4 + prog * 0.5);
    for (let i = 0; i < vN; i++) {
      const a = (Math.PI * 2 / vN) * i + t.x * 0.01;
      const r1 = 5;
      const r2 = HIT_R * (0.7 + prog * 0.5) + pulse * 3;
      g.beginPath();
      g.moveTo(t.x + Math.cos(a) * r1, t.y + Math.sin(a) * r1);
      // A mid-jog kink for organic crack look
      const mid = (r1 + r2) * 0.5;
      g.lineTo(t.x + Math.cos(a + 0.15) * mid, t.y + Math.sin(a + 0.15) * mid);
      g.lineTo(t.x + Math.cos(a) * r2, t.y + Math.sin(a) * r2);
      g.strokePath();
    }
    // Outer warning ring — grows and pulses more aggressively as warning ends
    g.lineStyle(2 + prog * 2, 0xff2255, 0.5 + prog * 0.4);
    g.strokeCircle(t.x, t.y, HIT_R * (1 + pulse * 0.15));
  } else if (t.state === 'sprout') {
    // Sprite is visible rising; overlay a tightening "grab zone" ring so players
    // can tell this is still dangerous — if they stand inside when sprout ends,
    // they get launched.
    const sproutDur = Math.ceil(B6.TENTACLE_SPROUT_FRAMES * 60 / B6.TENTACLE_SPROUT_FPS);
    const prog = 1 - (t.timer / Math.max(1, sproutDur));
    const r = HIT_R * (1.15 - prog * 0.15); // shrinks to exact radius
    g.lineStyle(2, 0xff2255, 0.4 + prog * 0.5);
    g.strokeCircle(t.x, t.y, r);
    // Faint inner disc darkens as the tentacle breaches
    g.fillStyle(0x4a0a1a, 0.35 + prog * 0.2);
    g.fillCircle(t.x, t.y, HIT_R * 0.9);
    // 4 bright tick marks on the ring to emphasize "cage closing"
    const tN = 4;
    for (let i = 0; i < tN; i++) {
      const a = (Math.PI * 2 / tN) * i + prog * Math.PI;
      const ix = t.x + Math.cos(a) * r, iy = t.y + Math.sin(a) * r;
      g.fillStyle(0xff6688, 0.9);
      g.fillCircle(ix, iy, 3);
    }
  } else if (t.state === 'sway') {
    // After the strike, draw a fading scorch halo + (if we have a launched
    // struck target) an energy tether from tentacle tip to flying victim.
    const a = 0.22 + Math.sin(time * 0.02) * 0.08;
    g.fillStyle(0x4a0a1a, a * 0.6);
    g.fillCircle(t.x, t.y, HIT_R * 0.85);
    g.lineStyle(1.5, 0x8b2a4e, a);
    g.strokeCircle(t.x, t.y, HIT_R * 0.9);
    // Energy tether to struck target while they are airborne
    const tgt = t.struckTarget;
    if (tgt && tgt.launched) {
      // 触手尖端 Y 偏移也随尺寸缩放(sprite bottom-anchored × base_scale × sMul)
      const tipY = t.y - 80 * sMul;
      const dx = tgt.x - t.x, dy = tgt.y - tipY;
      const steps = 8;
      const wobble = Math.sin(time * 0.04) * 8;
      g.lineStyle(2, 0xff2255, 0.75);
      g.beginPath();
      g.moveTo(t.x, tipY);
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        const wx = t.x + dx * f + Math.sin(f * Math.PI) * wobble;
        const wy = tipY + dy * f + Math.cos(f * Math.PI * 2 + time * 0.03) * 4;
        g.lineTo(wx, wy);
      }
      g.strokePath();
      // Sparks at victim end
      g.fillStyle(0xff6688, 0.9);
      g.fillCircle(tgt.x, tgt.y, 4);
    }
  } else if (t.state === 'fade') {
    // Leftover faint halo
    g.fillStyle(0x4a0a1a, 0.18 * (t.timer / 20));
    g.fillCircle(t.x, t.y, HIT_R * 0.8);
  }
}

/**
 * ⑤ 酸池残留 — 酸液柱消失后留在地上的低伤池:
 *   - 紫色斑驳地贴,边缘冒小泡
 *   - 中心处 3-5 个随机偏移的小圆,模拟液面凹凸
 *   - 尾声(timer < 25%)整体淡出
 */
function drawAcidPool(g, pool, time) {
  const lifeFrac = pool.timer / pool.maxTimer; // 1 → 0
  const alpha = lifeFrac < 0.25 ? lifeFrac * 4 : 1; // 尾声淡出
  // 主液面
  g.fillStyle(0x6a20c0, 0.35 * alpha);
  g.fillCircle(pool.x, pool.y, pool.radius);
  g.fillStyle(0xa040ff, 0.45 * alpha);
  g.fillCircle(pool.x, pool.y, pool.radius * 0.75);
  g.fillStyle(0xd080ff, 0.35 * alpha);
  g.fillCircle(pool.x, pool.y, pool.radius * 0.4);
  // 斑驳小圆(模拟液面凹凸)
  const blobs = 5;
  for (let i = 0; i < blobs; i++) {
    const a = (Math.PI * 2 / blobs) * i + time * 0.001 + pool.x * 0.01;
    const rr = pool.radius * (0.4 + 0.3 * Math.sin(time * 0.003 + i));
    const bx = pool.x + Math.cos(a) * rr;
    const by = pool.y + Math.sin(a) * rr;
    g.fillStyle(0x8b40d0, 0.45 * alpha);
    g.fillCircle(bx, by, 4 + Math.sin(time * 0.01 + i) * 2);
  }
  // 边缘冒泡(每 ~30 帧升起一个小泡)
  if (Math.floor(time / 300) % 2 === 0) {
    const a = (time * 0.003) % (Math.PI * 2);
    const bx = pool.x + Math.cos(a) * pool.radius * 0.8;
    const by = pool.y + Math.sin(a) * pool.radius * 0.8 - (time % 120) * 0.15;
    g.fillStyle(0xd080ff, 0.6 * alpha);
    g.fillCircle(bx, by, 3);
  }
}

function drawAcidFx(g, a, time, B6) {
  if (a.state === 'travel') {
    // Landing reticle — pulsing double ring
    const pulse = Math.sin(time * 0.02) * 0.5 + 0.5;
    g.lineStyle(2, 0xa040ff, 0.55 + pulse * 0.2);
    g.strokeCircle(a.tx, a.ty, B6.ACID_HIT_RADIUS);
    g.lineStyle(1, 0xa040ff, 0.3);
    g.strokeCircle(a.tx, a.ty, B6.ACID_HIT_RADIUS + 8 + pulse * 4);
    // X-marker
    g.lineStyle(1.5, 0xd080ff, 0.5);
    g.beginPath();
    g.moveTo(a.tx - 10, a.ty - 10); g.lineTo(a.tx + 10, a.ty + 10);
    g.moveTo(a.tx + 10, a.ty - 10); g.lineTo(a.tx - 10, a.ty + 10);
    g.strokePath();

    // Multi-layer projectile orb
    // Outer aura
    g.fillStyle(0xa040ff, 0.35);
    g.fillCircle(a.x, a.y, 16);
    // Mid body
    g.fillStyle(0xa040ff, 0.85);
    g.fillCircle(a.x, a.y, 10);
    // Inner hot core
    g.fillStyle(0xe8b0ff, 0.95);
    g.fillCircle(a.x, a.y, 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(a.x, a.y, 2);
    // Rotating halo — 4 small dots
    const haloRot = time * 0.01;
    for (let i = 0; i < 4; i++) {
      const ang = haloRot + (Math.PI / 2) * i;
      g.fillStyle(0xd080ff, 0.7);
      g.fillCircle(a.x + Math.cos(ang) * 14, a.y + Math.sin(ang) * 14, 2);
    }
    // Drip trail — faded droplets along recent path
    const tnorm = 1 - a.timer / a.travelTotal;
    for (let i = 1; i <= 4; i++) {
      const pt = tnorm - i * 0.06;
      if (pt > 0) {
        const px = a.fromX + (a.tx - a.fromX) * pt;
        const py = a.fromY + (a.ty - a.fromY) * pt - Math.sin(pt * Math.PI) * 120;
        g.fillStyle(0xa040ff, 0.35 - i * 0.07);
        g.fillCircle(px, py, 4 - i * 0.5);
      }
    }
  } else if (a.state === 'precast') {
    // Landing-point warning scales with the column's actual size.
    const sMul = a.scaleMul || 1;
    const precastTotal = a.precastTotal || B6.ACID_PRECAST_DURATION_MIN;
    const prog = 1 - (a.timer / precastTotal);                // 0 → 1
    const urgency = Math.sin(time * 0.05 + prog * 8) * 0.5 + 0.5;
    const hitR = B6.ACID_HIT_RADIUS * sMul;
    // Outer danger ring — shrinks from hitR*1.8 down to hitR
    const outR = hitR * (1.8 - prog * 0.8);
    g.lineStyle(3, 0xff4488, 0.5 + urgency * 0.4);
    g.strokeCircle(a.x, a.y, outR);
    // Inner fill
    g.fillStyle(0xa040ff, 0.12 + prog * 0.2 + urgency * 0.08);
    g.fillCircle(a.x, a.y, hitR);
    // Radial warning spokes — rotating
    const spokes = 6;
    for (let i = 0; i < spokes; i++) {
      const ang = (Math.PI * 2 / spokes) * i + time * 0.006;
      g.lineStyle(1.5, 0xff88aa, 0.5);
      g.beginPath();
      g.moveTo(a.x + Math.cos(ang) * 4, a.y + Math.sin(ang) * 4);
      g.lineTo(a.x + Math.cos(ang) * hitR * 0.9, a.y + Math.sin(ang) * hitR * 0.9);
      g.strokePath();
    }
    // ! exclamation mark above column (urgent signal) — scaled with column height
    if (urgency > 0.3) {
      g.fillStyle(0xff2255, 0.7 + urgency * 0.3);
      const exY = a.y - 90 * sMul;
      g.fillRect(a.x - 2, exY, 4, 12);
      g.fillCircle(a.x, exY + 18, 2.5);
    }
  } else if (a.state === 'active') {
    // Ground pool + bubbling ripples — scales with column size
    const sMul = a.scaleMul || 1;
    const hitR = B6.ACID_HIT_RADIUS * sMul;
    const pulse = Math.sin(time * 0.025) * 0.5 + 0.5;
    g.fillStyle(0xa040ff, 0.28);
    g.fillCircle(a.x, a.y, hitR * 0.9);
    // Ripple rings — expanding outward
    for (let i = 0; i < 2; i++) {
      const rr = ((time * 0.002 + i * 0.5) % 1);
      g.lineStyle(1.5, 0xd080ff, (1 - rr) * 0.55);
      g.strokeCircle(a.x, a.y, hitR * rr);
    }
    // Active hit-ring border — shows damage zone clearly
    g.lineStyle(2, 0xff4488, 0.35 + pulse * 0.2);
    g.strokeCircle(a.x, a.y, hitR);
    // Center glow
    g.fillStyle(0xe8b0ff, 0.35 + pulse * 0.25);
    g.fillCircle(a.x, a.y, 7 * Math.max(1, sMul * 0.7));
  }
}

function drawShadowFx(g, s, time, P, B6) {
  if (s.phase === 'arm') {
    // Rising smoke ring + forming eye — mirrors old 'emerge' look.
    g.fillStyle(0x2a1a3a, 0.55);
    g.fillCircle(s.x, s.y + 22, 30);
    const rr = Math.sin(time * 0.01 + s.x) * 4;
    g.lineStyle(2, 0x6a2a7a, 0.65);
    g.strokeCircle(s.x, s.y + 22, 26 + rr);
    const formProg = s.armDuration ? Math.min(1, 1 - (s.timer / s.armDuration)) : 0.5;
    if (formProg > 0.4) {
      g.fillStyle(0xff2255, 0.3 * formProg);
      g.fillCircle(s.x, s.y - 6, 5 + formProg * 4);
    }
  } else if (s.phase === 'armed_idle') {
    // Dormant trap: subtle pulsing ground shadow + slow eye-flicker (telegraphing
    // that this thing is alive and dangerous if you step close).
    const pulse = 0.5 + Math.sin(time * 0.004) * 0.5; // 0..1
    // Ground shadow
    g.fillStyle(0x2a1a3a, 0.55);
    g.fillCircle(s.x, s.y + 22, 28);
    // Slow-rotating detection ring — helps player see the "zone"
    const ringAlpha = 0.12 + pulse * 0.18;
    g.lineStyle(1, 0x6600ff, ringAlpha);
    g.strokeCircle(s.x, s.y + 12, B6.SHADOW_DETECT_RADIUS);
    // Faint inner ring (tighter "doom" boundary)
    g.lineStyle(1, 0xff2255, 0.15 + pulse * 0.15);
    g.strokeCircle(s.x, s.y + 12, B6.SHADOW_DETECT_RADIUS * 0.6);
    // Glowing eye — dim & patient
    const eyeR = 3 + pulse * 2;
    g.fillStyle(0xff2255, 0.55 + pulse * 0.35);
    g.fillCircle(s.x, s.y - 4, eyeR);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(s.x, s.y - 4, eyeR * 0.35);
  } else if (s.phase === 'sink') {
    // Sinking: shadow collapsing down, dust streaks upward
    const sinkProg = s.timer / Math.max(1, Math.ceil((B6.SHADOW_ARM_END_FRAME + 1) * 60 / B6.SHADOW_SINK_FPS));
    g.fillStyle(0x1a1028, 0.5 * sinkProg);
    g.fillCircle(s.x, s.y + 22, 30 * sinkProg);
    g.lineStyle(1.5, 0x4a1a5a, 0.5 * sinkProg);
    g.strokeCircle(s.x, s.y + 22, 20 * sinkProg);
  } else if (s.phase === 'underground') {
    // Underground: NO sprite — draw a moving dark patch at tracked position (follows player)
    // to telegraph "danger is coming".
    const tx = (P && !P.hidden) ? P.x : s.trackedX;
    const ty = (P && !P.hidden) ? P.y : s.trackedY;
    const dartY = ty + 24 + Math.sin(time * 0.015) * 3;
    // Dark rippling puddle
    g.fillStyle(0x1a0828, 0.55);
    g.fillCircle(tx, dartY, 18);
    g.fillCircle(tx + 6, dartY - 2, 10);
    g.fillCircle(tx - 8, dartY + 3, 8);
    // Outward ripple expanding as time passes (urgency indicator)
    const prog = s.timer / Math.max(1, B6.SHADOW_UNDERGROUND_DELAY);
    const rippleR = 12 + (1 - prog) * 30;
    g.lineStyle(1.5, 0x6600ff, 0.3 + (1 - prog) * 0.4);
    g.strokeCircle(tx, dartY, rippleR);
    // Small arrow hint pointing to strike location (player right side)
    if (prog < 0.5) {
      const strikeX = tx + B6.SHADOW_STRIKE_OFFSET_X;
      g.lineStyle(1, 0xff2255, 0.25);
      g.beginPath();
      g.moveTo(tx, dartY);
      g.lineTo(strikeX, dartY);
      g.strokePath();
    }
  } else if (s.phase === 'strike') {
    // Aggressive emergence flash — bright red eye + ground crack radials
    const totalF = Math.max(1, Math.ceil(B6.SHADOW_EMERGE_FRAMES * 60 / B6.SHADOW_STRIKE_EMERGE_FPS));
    const prog = 1 - (s.timer / totalF); // 0..1 through strike
    const flicker = 0.8 + Math.sin(time * 0.06 + s.x) * 0.2;
    // Ground shadow growing
    g.fillStyle(0x2a1a3a, 0.55);
    g.fillCircle(s.x, s.y + 22, 26 + prog * 8);
    // Radial cracks from ground
    const cracks = 5;
    for (let i = 0; i < cracks; i++) {
      const ang = (Math.PI * 2 / cracks) * i + time * 0.003;
      const r1 = 8;
      const r2 = 18 + prog * 28;
      g.lineStyle(1.5, 0x6600ff, 0.45);
      g.beginPath();
      g.moveTo(s.x + Math.cos(ang) * r1, s.y + 18 + Math.sin(ang) * r1);
      g.lineTo(s.x + Math.cos(ang) * r2, s.y + 18 + Math.sin(ang) * r2);
      g.strokePath();
    }
    // Eye glow growing
    const eyeR = 4 + prog * 6;
    g.fillStyle(0xff2255, 0.6 * flicker);
    g.fillCircle(s.x, s.y - 8, eyeR + 4);
    g.fillStyle(0xff2255, 0.95);
    g.fillCircle(s.x, s.y - 8, eyeR);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(s.x, s.y - 8, eyeR * 0.4);
  } else if (s.phase === 'imprison') {
    // Bright eye + ground shadow + chain tendrils to player (if snared)
    const flicker = 0.8 + Math.sin(time * 0.05 + s.x) * 0.2;
    g.fillStyle(0x2a1a3a, 0.55);
    g.fillCircle(s.x, s.y + 22, 30);
    // Intense eye
    g.fillStyle(0xff2255, 0.45 * flicker);
    g.fillCircle(s.x, s.y - 8, 16);
    g.fillStyle(0xff2255, 0.95);
    g.fillCircle(s.x, s.y - 8, 8);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(s.x, s.y - 8, 3);
    // Binding tendrils — draw to whichever target was caught
    const tgt = s.snareTarget;
    const tgtValid = tgt && tgt.hp > 0 && !(tgt === P && P.hidden);
    if (tgtValid) {
      const tgtR = tgt === P ? P.radius : (tgt.radius || 12);
      const seg = 10;
      const strands = 3;
      for (let k = 0; k < strands; k++) {
        const phaseOff = k * (Math.PI * 2 / strands) + time * 0.01;
        g.lineStyle(2, 0x6600ff, 0.55 + Math.sin(time * 0.02 + k) * 0.2);
        g.beginPath();
        for (let i = 0; i <= seg; i++) {
          const t01 = i / seg;
          const mx = s.x + (tgt.x - s.x) * t01;
          const my = s.y + (tgt.y - s.y) * t01;
          // Perpendicular sway
          const dx = tgt.x - s.x, dy = tgt.y - s.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const sway = Math.sin(t01 * Math.PI * 2 + phaseOff) * 10 * (1 - Math.abs(t01 - 0.5) * 2);
          const px = mx + nx * sway;
          const py = my + ny * sway;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.strokePath();
      }
      // Binding ring around target
      const ringPulse = 0.7 + Math.sin(time * 0.04) * 0.3;
      g.lineStyle(2, 0x6600ff, 0.6 * ringPulse);
      g.strokeCircle(tgt.x, tgt.y, tgtR + 8);
      g.lineStyle(1, 0xff2255, 0.4);
      g.strokeCircle(tgt.x, tgt.y, tgtR + 14 + Math.sin(time * 0.03) * 2);
    }
  } else if (s.phase === 'fade') {
    // Sprite is playing the RETRACT animation (frames 13→0 reversed) so it
    // visibly collapses back into the ground. Draw only a shrinking ground
    // shadow underneath to sell the "sinking" effect.
    const retractTotal = s.retractTotal || Math.max(1, Math.ceil(B6.SHADOW_RETRACT_FRAMES * 60 / B6.SHADOW_RETRACT_FPS));
    const prog = 1 - (s.timer / retractTotal); // 0 → 1 as retract progresses
    const remaining = 1 - prog;                // ground shadow shrinks over time
    g.fillStyle(0x2a1a3a, 0.55 * remaining);
    g.fillCircle(s.x, s.y + 22, 28 * remaining);
    g.lineStyle(1.5, 0x4a1a5a, 0.5 * remaining);
    g.strokeCircle(s.x, s.y + 22, 22 * remaining);
  }
}
