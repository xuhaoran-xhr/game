// ===========================
//  Boss 5: 堕落幽影 (Dark Berserker)
//  Black-mirrored Crimson Phantom.
//  AI-driven melee boss using the same pixel ghost model.
// ===========================
import CONFIG from '../config.js';
import { ang, dist, lerp, clamp, getCharmedTarget } from '../utils.js';
import {
  createBoss5AIState, tickBoss5AIState, updateBoss5Perception,
  shouldBoss5Reevaluate, decideBoss5Action, commitBoss5Decision,
  getBoss5MovementVector, scanBulletThreats
} from './boss5_ai.js';

const B5 = CONFIG.BOSS5;
const rand = (a, b) => a + Math.random() * (b - a);

// ========== CSS Injection ==========
let cssInjected = false;
function injectBoss5CSS() {
  if (cssInjected) return;
  cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    .dark-ghost {
      position: absolute; pointer-events: none; z-index: 42;
      transform: translate(-50%, -50%) scale(0.5);
      filter: drop-shadow(0 0 12px #8800ff) drop-shadow(0 0 6px #4400aa);
      opacity: 0.95; transition: opacity 0.3s;
    }
    .dark-ghost .ghost-body {
      animation: dGhostFloat 0.6s ease-in-out infinite;
      position: relative; width: 70px; height: 70px;
      display: grid;
      grid-template-columns: repeat(14, 1fr);
      grid-template-rows: repeat(14, 1fr);
      grid-template-areas:
        ".  .  .  .  .  t0 t0 t0 t0 .  .  .  .  ."
        ".  .  .  t1 t1 t1 t1 t1 t1 t1 t1 .  .  ."
        ".  .  t2 t2 t2 t2 t2 t2 t2 t2 t2 t2 .  ."
        ".  t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 ."
        ".  t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 ."
        ".  t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 ."
        "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
        "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
        "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
        "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
        "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
        "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
        "s0 s0 a4 s1 a7 s2 a10 a10 s3 a13 s4 a16 s5 s5"
        "a1 a2 a3 a5 a6 a8 a9  a9  a11 a12 a14 a15 a17 a18";
    }
    @keyframes dGhostFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    .dark-ghost [class^="gt"],.dark-ghost [class*=" gt"]{border-radius:1px}
    .dark-ghost .gt0,.dark-ghost .gt1,.dark-ghost .gt2,.dark-ghost .gt3,.dark-ghost .gt4,
    .dark-ghost .gs0,.dark-ghost .gs1,.dark-ghost .gs2,.dark-ghost .gs3,.dark-ghost .gs4,.dark-ghost .gs5{
      background:linear-gradient(135deg,#6600cc,#220055);
    }
    .dark-ghost .gt0{grid-area:t0}.dark-ghost .gt1{grid-area:t1}.dark-ghost .gt2{grid-area:t2}
    .dark-ghost .gt3{grid-area:t3}.dark-ghost .gt4{grid-area:t4}
    .dark-ghost .gs0{grid-area:s0}.dark-ghost .gs1{grid-area:s1}.dark-ghost .gs2{grid-area:s2}
    .dark-ghost .gs3{grid-area:s3}.dark-ghost .gs4{grid-area:s4}.dark-ghost .gs5{grid-area:s5}
    .dark-ghost .ga1{grid-area:a1}.dark-ghost .ga2{grid-area:a2}.dark-ghost .ga3{grid-area:a3}
    .dark-ghost .ga4{grid-area:a4}.dark-ghost .ga5{grid-area:a5}.dark-ghost .ga6{grid-area:a6}
    .dark-ghost .ga7{grid-area:a7}.dark-ghost .ga8{grid-area:a8}.dark-ghost .ga9{grid-area:a9}
    .dark-ghost .ga10{grid-area:a10}.dark-ghost .ga11{grid-area:a11}.dark-ghost .ga12{grid-area:a12}
    .dark-ghost .ga13{grid-area:a13}.dark-ghost .ga14{grid-area:a14}.dark-ghost .ga15{grid-area:a15}
    .dark-ghost .ga16{grid-area:a16}.dark-ghost .ga17{grid-area:a17}.dark-ghost .ga18{grid-area:a18}
    .dark-ghost .df0{animation:dFlick0 .5s infinite}
    .dark-ghost .df1{animation:dFlick1 .5s infinite}
    @keyframes dFlick0{0%,49%{background:linear-gradient(135deg,#6600cc,#220055)}50%,100%{background:transparent}}
    @keyframes dFlick1{0%,49%{background:transparent}50%,100%{background:linear-gradient(135deg,#6600cc,#220055)}}
    .dark-ghost .ghost-eye{width:18px;height:22px;position:absolute;top:14px;background:radial-gradient(circle,#ff00ff 40%,#6600cc 100%);border-radius:4px}
    .dark-ghost .ghost-eye-l{left:12px}.dark-ghost .ghost-eye-r{right:12px}
    .dark-ghost .ghost-pupil{width:8px;height:8px;background:#fff;border-radius:50%;position:absolute;top:10px;z-index:1;box-shadow:0 0 6px #ff00ff}
    .dark-ghost .ghost-pupil-l{left:17px}.dark-ghost .ghost-pupil-r{right:17px}
    .dark-ghost .ghost-shadow{width:50px;height:12px;background:rgba(136,0,255,.2);border-radius:50%;position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);filter:blur(4px);animation:dGShadow .6s infinite}
    @keyframes dGShadow{0%,100%{opacity:.4;width:50px}50%{opacity:.15;width:40px}}
    .dark-ghost.frenzy{filter:drop-shadow(0 0 18px #ff00ff) drop-shadow(0 0 8px #8800ff)}
    .dark-ghost.frenzy .gt0,.dark-ghost.frenzy .gt1,.dark-ghost.frenzy .gt2,.dark-ghost.frenzy .gt3,.dark-ghost.frenzy .gt4,
    .dark-ghost.frenzy .gs0,.dark-ghost.frenzy .gs1,.dark-ghost.frenzy .gs2,.dark-ghost.frenzy .gs3,.dark-ghost.frenzy .gs4,.dark-ghost.frenzy .gs5{
      background:linear-gradient(135deg,#aa00ff,#440088);
    }
    .dark-sword-container{position:absolute;pointer-events:none;z-index:41;transform:translate(-50%,-50%)}
    .dark-sword-container .greatsword-wrapper{transform-origin:0% 50%}
  `;
  document.head.appendChild(s);
}

// ========== DOM Creation ==========
function createDarkGhostDOM() {
  const el = document.createElement('div');
  el.className = 'dark-ghost';
  const body = document.createElement('div');
  body.className = 'ghost-body';
  ['gt0', 'gt1', 'gt2', 'gt3', 'gt4', 'gs0', 'gs1', 'gs2', 'gs3', 'gs4', 'gs5'].forEach(c => {
    const d = document.createElement('div'); d.className = c; body.appendChild(d);
  });
  ['ga1', 'ga6', 'ga7', 'ga8', 'ga11', 'ga12', 'ga13', 'ga18'].forEach(c => {
    const d = document.createElement('div'); d.className = c + ' df0'; body.appendChild(d);
  });
  ['ga2', 'ga3', 'ga4', 'ga5', 'ga9', 'ga10', 'ga14', 'ga15', 'ga16', 'ga17'].forEach(c => {
    const d = document.createElement('div'); d.className = c + ' df1'; body.appendChild(d);
  });
  ['ghost-pupil ghost-pupil-l', 'ghost-pupil ghost-pupil-r', 'ghost-eye ghost-eye-l', 'ghost-eye ghost-eye-r'].forEach(c => {
    const d = document.createElement('div'); d.className = c; body.appendChild(d);
  });
  el.appendChild(body);
  const shadow = document.createElement('div'); shadow.className = 'ghost-shadow';
  el.appendChild(shadow);
  return el;
}

function createDarkSwordDOM() {
  const el = document.createElement('div');
  el.className = 'dark-sword-container';
  const wrap = document.createElement('div'); wrap.className = 'greatsword-wrapper';
  const blade = document.createElement('div'); blade.className = 'greatsword-blade';
  blade.innerHTML = `<svg width="140" height="40" viewBox="0 0 140 40">
    <defs><linearGradient id="dSGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#111"/><stop offset="40%" stop-color="#220044"/>
      <stop offset="80%" stop-color="#6600cc"/><stop offset="100%" stop-color="#aa00ff"/>
    </linearGradient></defs>
    <rect x="0" y="15" width="25" height="10" fill="#222" stroke="#444"/>
    <circle cx="2" cy="20" r="5" fill="#8800ff"/>
    <path d="M20,2 L26,6 L26,34 L20,38 Z" fill="#111" stroke="#8800ff" stroke-width="1"/>
    <path d="M26,6 L105,6 L135,20 L105,34 L26,34 Z" fill="url(#dSGrad)" stroke="#aa00ff" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M30,17 L100,17 L110,20 L100,23 L30,23 Z" fill="#000"/>
    <line x1="30" y1="20" x2="105" y2="20" stroke="#8800ff" stroke-width="2" filter="blur(1px)"/>
    <line x1="30" y1="20" x2="105" y2="20" stroke="#fff" stroke-width="0.5"/>
  </svg>`;
  wrap.appendChild(blade);
  el.appendChild(wrap);
  return el;
}

function cleanupDOM(b) {
  if (b._ghostEl) { b._ghostEl.remove(); b._ghostEl = null; }
  if (b._swordEl) { b._swordEl.remove(); b._swordEl = null; }
  if (b._canvasEl) { b._canvasEl.remove(); b._canvasEl = null; }
  if (b._resizeHandler) { window.removeEventListener('resize', b._resizeHandler); b._resizeHandler = null; }
}

// ========== CREATE ==========
export function createBoss5(W, H, wave) {
  injectBoss5CSS();
  const ghost = createDarkGhostDOM();
  const sword = createDarkSwordDOM();
  const container = document.getElementById('game-container');
  if (container) { container.appendChild(ghost); container.appendChild(sword); }

  // Overlay canvas for 2D effects (same pattern as Berserker)
  const cvs = document.createElement('canvas');
  cvs.id = 'boss5-canvas';
  cvs.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:35';
  // Sync to Phaser canvas dimensions
  const phaserCvs = document.querySelector('canvas:not(#boss5-canvas):not(#berserker-canvas)');
  cvs.width = phaserCvs ? phaserCvs.width : window.innerWidth;
  cvs.height = phaserCvs ? phaserCvs.height : window.innerHeight;
  if (container) container.appendChild(cvs);
  const resizeHandler = () => {
    const pc = document.querySelector('canvas:not(#boss5-canvas):not(#berserker-canvas)');
    if (document.getElementById('boss5-canvas') && pc) {
      cvs.width = pc.width;
      cvs.height = pc.height;
    }
  };
  window.addEventListener('resize', resizeHandler);

  const hp = B5.BASE_HP;
  return {
    faction: 'enemy',
    x: W / 2, y: -80, vx: 0, vy: 0,
    radius: B5.RADIUS, hp, maxHp: hp,
    speed: B5.BASE_SPEED, phase: 1,
    atkTimer: 0, hitFlash: 0,
    entered: false, dying: false, dyingTimer: 0,
    bossName: '堕落幽影', hpColor: 0xaa44ff,
    charmed: 0,
    _ghostEl: ghost, _swordEl: sword, _canvasEl: cvs, _resizeHandler: resizeHandler,
    slashTrail: [],

    // Facing
    angle: 0,

    // Shadow Step
    rolling: false, rollTimer: 0, rollDx: 0, rollDy: 0, rollCd: 0, invincible: false,

    // Combo
    swinging: false, swingCombo: 0, swingTimer: 0, swingCooldown: 0,
    swingAngle: 0, swingId: 0,

    // Projectiles (same structure as Berserker)
    crossSlashes: [], moonSevers: [], smashes: [],

    // Frenzy
    frenzy: false, frenzyTimer: 0, frenzyCd: 0, frenzyWaves: [],

    // Frenzy combo
    fWhirlwinds: [], fThousandCuts: [], fInfernoSlams: [],

    // Charge Slash (P3)
    charging: false, chargeTimer: 0, chargeCd: 0, chargeSlashes: [],

    // Execution (P3)
    executing: false, execTimer: 0, execPhase: 0,
    execTarget: null, execCd: 0, execSweep: null,

    // Targeting
    lastTargetPos: null,

    isBoss5: true,
    updateFn: updateBoss5,
    drawFn: drawBoss5,
    ...createBoss5AIState(),
  };
}

// ========== UPDATE ==========
export function updateBoss5(boss, P, bullets, eBullets, mines, particles, gameState, weapons, enemies, otherBoss) {
  const b = boss;
  const W = gameState.W;
  const H = gameState.H;

  // ---- Entry animation ----
  if (!b.entered) {
    b.y = lerp(b.y, H * 0.35, 0.02);
    if (b.y > H * 0.3) b.entered = true;
    // Position ghost during entry
    positionGhost(b);
    return;
  }

  // ---- Death ----
  if (b.hp <= 0 && !b.dying) {
    b.dying = true;
    b.dyingTimer = 120;
    particles.spawn(b.x, b.y, '#8800ff', 60, 15, 60, 10);
    gameState.screenShake = 30;
  }
  if (b.dying) {
    b.dyingTimer--;
    if (b.dyingTimer % 5 === 0) particles.spawn(b.x + rand(-30, 30), b.y + rand(-30, 30), '#8800ff', 8, 4, 15, 3);
    positionGhost(b); // hide during dying
    if (b.dyingTimer <= 0) { cleanupDOM(b); return true; }
    return false;
  }

  b.hitFlash = Math.max(0, b.hitFlash - 1);
  b.atkTimer++;

  // ---- Charmed handling ----
  if (b.charmed > 0) {
    b.charmed--;
    if (b.charmed <= 0 && b.faction === 'ally') b.faction = 'enemy';
  }

  // ---- Snare (Boss6 shadow trap / other CC): freeze AI/move/attack ----
  if (b.snared && b.snared > 0) {
    b.snared--;
    b.vx = 0; b.vy = 0;
    return;
  }

  // ---- Launched (Boss6 tentacle): frozen — position/scale driven externally ----
  if (b.launched) {
    b.vx = 0; b.vy = 0;
    return;
  }

  const isCharmed = b.faction === 'ally';

  // ---- TARGET SELECTION (supports otherBoss as array for Boss5) ----
  const otherBossList = Array.isArray(otherBoss) ? otherBoss : (otherBoss ? [otherBoss] : []);
  let T = P.hidden ? null : P;
  if (isCharmed) {
    const ct = getCharmedTarget(b, enemies, otherBoss);
    T = ct.target || (P.hidden ? null : P);
  } else if (P.hidden) {
    for (const ob of otherBossList) {
      if (ob.faction === 'ally' && ob.hp > 0) { T = ob; break; }
    }
    if (!T && enemies) { for (const e of enemies) { if (e.faction === 'ally') { T = e; break; } } }
  }

  // ---- Always lock nearest attackable target ----
  if (!isCharmed) {
    let nearestD = Infinity, nearestT = null;
    for (const ob of otherBossList) {
      if (ob.hp > 0 && ob.faction !== 'enemy') { const d = dist(b, ob); if (d < nearestD) { nearestD = d; nearestT = ob; } }
    }
    if (enemies) for (const e of enemies) {
      if (e.faction !== 'enemy' && e.hp > 0) { const d = dist(b, e); if (d < nearestD) { nearestD = d; nearestT = e; } }
    }
    if (!P.hidden) {
      const dP = dist(b, P);
      if (dP < nearestD) { nearestD = dP; nearestT = P; }
    }
    if (nearestT) T = nearestT;
  }

  const hasRealTarget = !!T;
  if (T) b.lastTargetPos = { x: T.x, y: T.y };
  if (!T) T = b.lastTargetPos || { x: b.x, y: b.y };

  // ---- Phase transitions ----
  const hpPct = b.hp / b.maxHp;
  if (hpPct <= B5.PHASE2_THRESHOLD && b.phase === 1) {
    b.phase = 2;
    gameState.screenShake = 20;
    particles.spawn(b.x, b.y, '#8800ff', 40, 10, 40, 6);
  }
  if (hpPct <= B5.PHASE3_THRESHOLD && b.phase === 2) {
    b.phase = 3;
    b.frenzy = true; b.frenzyTimer = 999999;
    gameState.screenShake = 30;
    particles.spawn(b.x, b.y, '#ff00ff', 60, 15, 50, 8);
  }
  // Enrage at 10% HP — 250% attack speed
  if (hpPct <= 0.10 && !b.enraged) {
    b.enraged = true;
    gameState.screenShake = 40;
    particles.spawn(b.x, b.y, '#ff0000', 60, 15, 60, 8);
    particles.spawn(b.x, b.y, '#8800ff', 40, 10, 50, 6);
    gameState.showWaveText && gameState.showWaveText('💀 堕落幽影·狂化！');
  }

  // ---- Cooldowns (enraged: tick 3x faster) ----
  const cdTick = b.enraged ? 3 : 1;
  if (b.rollCd > 0) b.rollCd -= cdTick;
  if (b.swingCooldown > 0) b.swingCooldown -= cdTick;
  if (b.frenzyCd > 0) b.frenzyCd -= cdTick;
  if (b.chargeCd > 0) b.chargeCd -= cdTick;
  if (b.execCd > 0) b.execCd -= cdTick;

  // ====================
  //  SHADOW STEP
  // ====================
  if (b.rolling) {
    b.rollTimer--;
    b.x += b.rollDx * B5.ROLL_SPEED;
    b.y += b.rollDy * B5.ROLL_SPEED;
    b.invincible = true;
    particles.spawn(b.x, b.y, '#4400aa', 8, 4, 12, 2);
    if (b.rollTimer <= 0) {
      b.rolling = false;
      b.invincible = false;
      b.rollCd = B5.ROLL_COOLDOWN;
    }
    b.x = clamp(b.x, b.radius, W - b.radius);
    b.y = clamp(b.y, b.radius, H - b.radius);
    positionGhost(b);
    return;
  }

  // ====================
  //  EXECUTION (P3)
  // ====================
  if (b.executing) {
    updateExecution(b, P, enemies, otherBoss, isCharmed, particles, gameState);
    b.x = clamp(b.x, b.radius, W - b.radius);
    b.y = clamp(b.y, b.radius, H - b.radius);
    positionGhost(b);
    return;
  }

  // ====================
  //  CHARGING (P3 Iai Slash)
  // ====================
  if (b.charging) {
    b.chargeTimer++;
    if (hasRealTarget) b.angle = ang(b, T);
    particles.spawn(b.x + rand(-15, 15), b.y + rand(-15, 15), '#8800ff', 4, 2, 10, 2);
    const hpMult = getHpSpeedMult(b);
    const chargeTime = Math.floor((b.enraged ? B5.CHARGE_TIME * 0.52 : B5.CHARGE_TIME) * hpMult);
    if (b.chargeTimer >= chargeTime) {
      b.charging = false;
      b.chargeCd = Math.floor((b.enraged ? B5.CHARGE_INTERVAL * 0.52 : B5.CHARGE_INTERVAL) * hpMult);
      // Enter dash windup phase (NOT instant slash)
      b.chargeDashing = true;
      b.chargeDashTimer = b.enraged ? 18 : 30; // 0.3s or 0.5s dash windup
      b.chargeDashAngle = b.angle;
      gameState.screenShake = 10;
      particles.spawn(b.x, b.y, '#ff00ff', 15, 6, 20, 4);
    }
    b.x = clamp(b.x, b.radius, W - b.radius);
    b.y = clamp(b.y, b.radius, H - b.radius);
    positionGhost(b);
    return;
  }
  // Charge dash windup → slash spawns at end
  if (b.chargeDashing) {
    b.chargeDashTimer--;
    // Boss lunges forward during dash
    b.x += Math.cos(b.chargeDashAngle) * B5.EXEC_DASH_SPEED * 0.5;
    b.y += Math.sin(b.chargeDashAngle) * B5.EXEC_DASH_SPEED * 0.5;
    // Warning trail particles
    particles.spawn(b.x, b.y, '#ff00ff', 6, 3, 12, 3);
    if (b.chargeDashTimer <= 0) {
      b.chargeDashing = false;
      // NOW spawn the actual slash
      gameState.screenShake = 20;
      b.chargeSlashes.push({
        x: b.x, y: b.y, angle: b.chargeDashAngle, life: 15, maxLife: 15, isCharmed
      });
      particles.spawn(b.x, b.y, '#ff00ff', 30, 10, 30, 6);
    }
    b.x = clamp(b.x, b.radius, W - b.radius);
    b.y = clamp(b.y, b.radius, H - b.radius);
    positionGhost(b);
    return;
  }

  // ====================
  //  FRENZY MANAGEMENT
  // ====================
  if (b.phase >= 2 && !b.frenzy && b.frenzyCd <= 0) {
    b.frenzy = true;
    b.frenzyTimer = B5.FRENZY_DURATION;
    gameState.screenShake = 12;
    particles.spawn(b.x, b.y, '#8800ff', 30, 8, 30, 5);
  }
  if (b.frenzy && b.phase < 3) {
    b.frenzyTimer--;
    if (b.frenzyTimer <= 0) { b.frenzy = false; b.frenzyCd = B5.FRENZY_COOLDOWN; }
  }
  // Frenzy waves (passive)
  if (b.frenzy && b.atkTimer % 20 === 0) {
    const wa = rand(0, Math.PI * 2);
    b.frenzyWaves.push({
      x: b.x, y: b.y,
      vx: Math.cos(wa) * B5.FRENZY_WAVE_SPEED,
      vy: Math.sin(wa) * B5.FRENZY_WAVE_SPEED,
      life: Math.floor(B5.FRENZY_WAVE_RANGE / B5.FRENZY_WAVE_SPEED),
      radius: 15, maxRadius: 15, isCharmed
    });
  }

  // ====================
  //  AI DECISION (Full Pipeline)
  // ====================
  // Step 1: Tick AI timers
  tickBoss5AIState(b);

  // Step 2: Scan bullet threats. Reuse a per-boss scratch buffer instead of
  // allocating `[...bullets, ...eBullets.filter(...)]` every frame — keeps the
  // hot path GC-free when the arena is full of projectiles.
  const arena = { W, H };
  if (!b._bulletScratch) b._bulletScratch = [];
  const bulletScratch = b._bulletScratch;
  bulletScratch.length = 0;
  for (let i = 0; i < bullets.length; i++) bulletScratch.push(bullets[i]);
  for (let i = 0; i < eBullets.length; i++) {
    if (eBullets[i].friendly) bulletScratch.push(eBullets[i]);
  }
  const bulletThreats = scanBulletThreats(b, bulletScratch, arena);
  b.lastBulletThreat = bulletThreats.threatLevel;
  b.cursorX = gameState.cursorX;
  b.cursorY = gameState.cursorY;

  if (hasRealTarget) {
    b.angle = ang(b, T);
    const d = dist(b, T);

    // Step 3: Build perception snapshot
    const snapshot = updateBoss5Perception(b, T, arena);
    snapshot.bulletThreats = bulletThreats;

    // Step 4: Evaluate whether to re-decide (skip during swing — no interrupting attacks)
    if (!b.swinging && shouldBoss5Reevaluate(b, snapshot)) {
      const decision = decideBoss5Action(b, snapshot);
      if (decision) {
        commitBoss5Decision(b, decision);

        // Handle immediate actions from decision
        if (decision.action === 'shadowStep' && b.rollCd <= 0) {
          const rollAng = decision.rollAngle ?? (b.angle + Math.PI + rand(-0.8, 0.8));
          b.rolling = true; b.rollTimer = B5.ROLL_DURATION;
          b.rollDx = Math.cos(rollAng); b.rollDy = Math.sin(rollAng);
          positionGhost(b);
          return;
        }
        if (decision.action === 'chargeSlash' && b.phase === 3 && b.chargeCd <= 0 && !b.swinging) {
          b.charging = true; b.chargeTimer = 0;
          positionGhost(b);
          return;
        }
        if (decision.action === 'execution' && b.phase === 3 && b.execCd <= 0 && !b.swinging && d < B5.EXEC_LOCK_RANGE && d > 100) {
          b.executing = true; b.execTimer = B5.EXEC_DURATION; b.execPhase = 1;
          b.execTarget = { x: T.x, y: T.y };
          positionGhost(b);
          return;
        }
      }
    }

    // Step 5: Get movement vector from AI
    const mv = getBoss5MovementVector(b, snapshot);

    // Step 6: Execute movement
    if (!b.swinging && d > B5.MELEE_RANGE * 0.5) {
      if (b.webSlowed > 0) b.webSlowed--;
      const webMult = (b.webSlowed > 0) ? (1 - (CONFIG.BOSS5?.WEB_ZONE_SLOW || CONFIG.BOSS2?.WEB_ZONE_SLOW || 0.62)) : 1;
      const spd = b.speed * (b.frenzy ? B5.FRENZY_SPEED_MULT : 1) * mv.speedScale * webMult;
      b.x += mv.x * spd;
      b.y += mv.y * spd;
    }

    // Step 7: Attack when AI says or when in melee range with intent
    if (!b.swinging && b.swingCooldown <= 0) {
      if (mv.wantsAttack || (d <= B5.MELEE_RANGE && (b.bossIntent === 'punish' || b.bossIntent === 'normalCombo' || b.bossIntent === 'frenzyCombo'))) {
        startBossSwing(b, isCharmed, particles);
      } else if (d <= B5.MELEE_RANGE * 0.8 && b.bossIntent !== 'reset') {
        // Fallback: attack if very close regardless of intent (including dodgeBullets)
        startBossSwing(b, isCharmed, particles);
      }
    }
  }

  // Apply & decay knockback velocity
  if (b.vx || b.vy) {
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= 0.78;
    b.vy *= 0.78;
    if (Math.abs(b.vx) < 0.05) b.vx = 0;
    if (Math.abs(b.vy) < 0.05) b.vy = 0;
  }

  // Clamp & position
  b.x = clamp(b.x, b.radius, W - b.radius);
  b.y = clamp(b.y, b.radius, H - b.radius);

  // ====================
  //  UPDATE SWING
  // ====================
  if (b.swinging) {
    // Emergency interrupt: if damage has already spawned (swingHit=true) and
    // a critical bullet threat appears, abort the remainder of the animation
    // and shadow-step away. The hit payload is already in the world, so this
    // only shortens the recovery tail — no DPS is lost.
    if (b.swingHit && b.rollCd <= 0 &&
        bulletThreats.threatLevel > (B5.SHADOW_STEP_THREAT || 0.58)) {
      const rollAng = bulletThreats.bestDodgeAngle !== null
        ? bulletThreats.bestDodgeAngle
        : b.angle + Math.PI;
      b.swinging = false;
      b.swingHit = false;
      b.swingCooldown = getSwingCd(b);
      b.rolling = true;
      b.rollTimer = B5.ROLL_DURATION;
      b.rollDx = Math.cos(rollAng);
      b.rollDy = Math.sin(rollAng);
      positionGhost(b);
      return;
    }
    b.swingTimer--;
    const combo = b.swingCombo;
    const dur = getSwingDur(b);
    const hitFrame = Math.floor(dur * 0.5); // damage spawns at 50% of animation

    // Spawn projectile at midpoint of swing animation (not at start!)
    if (!b.swingHit && b.swingTimer <= hitFrame) {
      b.swingHit = true;
      if (b.frenzy) {
        if (combo === 0) {
          b.fWhirlwinds.push({
            x: b.x, y: b.y, angle: b.swingAngle, life: B5.F_WHIRLWIND_LIFE, maxLife: B5.F_WHIRLWIND_LIFE,
            id: b.swingId, radius: B5.F_WHIRLWIND_RADIUS, dmg: B5.F_WHIRLWIND_DAMAGE, spin: 0, isCharmed
          });
        } else if (combo === 1) {
          const halfArc = B5.F_THOUSAND_ARC / 2;
          for (let i = 0; i < B5.F_THOUSAND_COUNT; i++) {
            const slashAngle = b.swingAngle - halfArc + (B5.F_THOUSAND_ARC / (B5.F_THOUSAND_COUNT - 1)) * i;
            b.fThousandCuts.push({
              x: b.x, y: b.y, angle: slashAngle, life: B5.F_THOUSAND_LIFE, maxLife: B5.F_THOUSAND_LIFE,
              id: b.swingId + i, range: B5.F_THOUSAND_RANGE, dmg: B5.F_THOUSAND_DAMAGE, delay: i * B5.F_THOUSAND_DELAY, isCharmed
            });
          }
          b.x += Math.cos(b.swingAngle) * B5.F_THOUSAND_LUNGE;
          b.y += Math.sin(b.swingAngle) * B5.F_THOUSAND_LUNGE;
        } else {
          b.fInfernoSlams.push({
            x: b.x, y: b.y, angle: b.swingAngle, life: B5.F_INFERNO_LIFE, maxLife: B5.F_INFERNO_LIFE,
            id: b.swingId, radius: B5.F_INFERNO_RADIUS, dmg: B5.F_INFERNO_DAMAGE, phase: 'rise', isCharmed
          });
          b.x += Math.cos(b.swingAngle) * B5.F_INFERNO_LUNGE;
          b.y += Math.sin(b.swingAngle) * B5.F_INFERNO_LUNGE;
        }
      } else {
        if (combo === 0) {
          const crossLife = Math.floor(B5.CROSS_DURATION * 0.6);
          b.crossSlashes.push({
            x: b.x, y: b.y, angle: b.swingAngle, life: crossLife, maxLife: crossLife,
            id: b.swingId, range: B5.CROSS_RANGE, dmg: B5.CROSS_DAMAGE, isCharmed
          });
          b.x += Math.cos(b.swingAngle) * B5.CROSS_LUNGE;
          b.y += Math.sin(b.swingAngle) * B5.CROSS_LUNGE;
        } else if (combo === 1) {
          const speed = B5.MOON_SPEED;
          const life = Math.ceil(B5.MOON_RANGE / speed);
          b.moonSevers.push({
            x: b.x, y: b.y, angle: b.swingAngle, life, maxLife: life,
            vx: Math.cos(b.swingAngle) * speed, vy: Math.sin(b.swingAngle) * speed,
            id: b.swingId, radius: B5.MOON_RADIUS, dmg: B5.MOON_DAMAGE, isCharmed
          });
          b.x += Math.cos(b.swingAngle) * B5.MOON_LUNGE;
          b.y += Math.sin(b.swingAngle) * B5.MOON_LUNGE;
        } else {
          // Smash: DIRECT damage at full radius, centered on boss (not offset)
          applyAOE(b.x, b.y, B5.SMASH_RADIUS, B5.SMASH_DAMAGE, isCharmed, P, enemies, otherBoss, gameState, null);
          gameState.screenShake = 12;
          // Visual-only smash ring (expanding ring effect)
          b.smashes.push({
            x: b.x + Math.cos(b.swingAngle) * B5.SMASH_OFFSET,
            y: b.y + Math.sin(b.swingAngle) * B5.SMASH_OFFSET,
            radius: B5.SMASH_RADIUS, life: 15, maxLife: 15,
            id: b.swingId, dmg: 0, isCharmed  // dmg: 0 since damage already applied
          });
          b.x += Math.cos(b.swingAngle) * B5.SMASH_OFFSET;
          b.y += Math.sin(b.swingAngle) * B5.SMASH_OFFSET;
        }
      }
      particles.spawn(b.x, b.y, '#aa44ff', 8, 4, 15, 3);
    }

    if (b.swingTimer <= 0) {
      const cd = getSwingCd(b);
      b.swingCooldown = cd;
      b.swinging = false;
      b.swingHit = false;
      b.swingCombo = (b.swingCombo + 1) % 3;
      // Quick follow-up if target close
      if (hasRealTarget && dist(b, T) < B5.MELEE_RANGE * 2 && b.swingCombo !== 0) {
        b.swingCooldown = Math.floor(cd * 0.3);
      }
    }
  }

  // ====================
  //  UPDATE PROJECTILES
  // ====================
  b.crossSlashes = b.crossSlashes.filter(c => { c.x = b.x; c.y = b.y; return --c.life > 0; });
  b.moonSevers = b.moonSevers.filter(m => { m.x += m.vx; m.y += m.vy; return --m.life > 0; });
  b.smashes = b.smashes.filter(s => { s.x = b.x + Math.cos(s.angle) * B5.SMASH_OFFSET; s.y = b.y + Math.sin(s.angle) * B5.SMASH_OFFSET; return --s.life > 0; });
  b.fWhirlwinds = b.fWhirlwinds.filter(w => { w.x = b.x; w.y = b.y; w.spin = (w.spin || 0) + 0.5; return --w.life > 0; });
  b.fThousandCuts = b.fThousandCuts.filter(tc => { if (tc.delay > 0) { tc.delay--; return true; } return --tc.life > 0; });
  b.fInfernoSlams = b.fInfernoSlams.filter(s => {
    const t = 1 - (s.life / s.maxLife);
    s.phase = t < 0.35 ? 'rise' : t < 0.55 ? 'slam' : 'crack';
    return --s.life > 0;
  });
  b.frenzyWaves = b.frenzyWaves.filter(w => { w.x += Math.cos(w.angle) * w.speed; w.y += Math.sin(w.angle) * w.speed; w.radius += (w.maxRadius - w.radius) * 0.2; return --w.life > 0; });
  b.chargeSlashes = b.chargeSlashes.filter(s => --s.life > 0);

  // ====================
  //  APPLY DAMAGE (all projectiles)
  // ====================
  applyAllDamage(b, P, enemies, otherBoss, gameState);

  positionGhost(b);
}

// ========== SWING ==========
function startBossSwing(b, isCharmed, particles) {
  if (b.executing || b.charging) return;
  b.swinging = true;
  b.swingAngle = b.angle;
  b.swingId = (b.swingId || 0) + 1;
  b.swingTimer = getSwingDur(b);
  const combo = b.swingCombo;

  // Projectiles are now spawned during swing update (at 50% of animation)
  // startBossSwing only handles swing initialization + wind-up particles
  if (b.frenzy) {
    particles.spawn(b.x, b.y, combo === 0 ? '#ff00ff' : (combo === 1 ? '#aa44ff' : '#8800ff'),
      combo === 2 ? 20 : 8, combo === 2 ? 8 : 4, combo === 2 ? 30 : 15, combo === 2 ? 6 : 4);
  } else {
    particles.spawn(b.x, b.y, '#8800ff', 6, 3, 10, 3);
  }
}

// HP-based attack speed multiplier: slower at high HP, current speed at 40% HP, capped below 40%
function getHpSpeedMult(b) {
  const hpPct = b.hp / b.maxHp;
  // Above 40% HP: linearly interpolate from 1.8x (full HP) to 1.0x (40% HP)
  // Below 40% HP: stay at 1.0x (no further speed increase)
  if (hpPct > 0.4) {
    // hpPct 1.0 → mult 1.8, hpPct 0.4 → mult 1.0
    return 1.0 + (hpPct - 0.4) / 0.6 * 0.8;
  }
  return 1.0;
}

function getSwingDur(b) {
  let dur;
  if (b.frenzy) dur = [B5.F_WHIRLWIND_DURATION, B5.F_THOUSAND_DURATION, B5.F_INFERNO_DURATION][b.swingCombo];
  else dur = [B5.CROSS_DURATION, B5.MOON_DURATION, B5.SMASH_DURATION][b.swingCombo];
  dur = Math.floor(dur * getHpSpeedMult(b));
  return b.enraged ? Math.max(4, Math.floor(dur * 0.52)) : dur;
}
function getSwingCd(b) {
  let cd;
  if (b.frenzy) cd = [15, 15, 20][b.swingCombo];
  else cd = [B5.CROSS_COOLDOWN, B5.MOON_COOLDOWN, B5.SMASH_COOLDOWN][b.swingCombo];
  cd = Math.floor(cd * getHpSpeedMult(b));
  return b.enraged ? Math.max(3, Math.floor(cd * 0.52)) : cd;
}

// ========== EXECUTION ==========
function updateExecution(b, P, enemies, otherBoss, isCharmed, particles, gameState) {
  b.execTimer--;
  if (b.execPhase === 1 && b.execTarget) {
    const dx = b.execTarget.x - b.x, dy = b.execTarget.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > 30) {
      b.x += (dx / d) * B5.EXEC_DASH_SPEED;
      b.y += (dy / d) * B5.EXEC_DASH_SPEED;
      particles.spawn(b.x, b.y, '#ff00ff', 6, 3, 8, 2);
    } else {
      b.execPhase = 2;
      b.execSweep = { x: b.x, y: b.y, angle: b.angle, timer: 20, triggered: false };
      gameState.screenShake = 15;
    }
  }
  if (b.execPhase === 2 && b.execSweep) {
    b.execSweep.timer--;
    if (!b.execSweep.triggered) {
      b.execSweep.triggered = true;
      applyAOE(b.x, b.y, B5.EXEC_RANGE, B5.EXEC_DAMAGE, isCharmed, P, enemies, otherBoss, gameState, particles);
    }
    if (b.execSweep.timer <= 0) { endExec(b); return; }
  }
  if (b.execTimer <= 0) endExec(b);
}
function endExec(b) {
  b.executing = false; b.execPhase = 0; b.execSweep = null; b.execCd = B5.EXEC_INTERVAL;
}

// ========== DAMAGE ==========
function applyAOE(ox, oy, radius, dmg, isCharmed, P, enemies, otherBosses, gameState, particles) {
  const hit = (tx, ty, tr) => dist({ x: ox, y: oy }, { x: tx, y: ty }) < radius + tr;
  const bossList = Array.isArray(otherBosses) ? otherBosses : (otherBosses ? [otherBosses] : []);
  if (isCharmed) {
    if (enemies) for (const e of enemies) {
      if (e.faction !== 'enemy') continue;
      if (hit(e.x, e.y, e.radius || 12)) { e.hp -= dmg; e.hitFlash = 8; }
    }
    for (const ob of bossList) {
      if (ob.hp > 0 && ob.faction !== 'ally') {
        if (hit(ob.x, ob.y, ob.radius || 30)) { ob.hp -= dmg; ob.hitFlash = 8; }
      }
    }
  } else {
    if (!P.hidden && !P.invincible && hit(P.x, P.y, P.radius)) gameState.dmgPlayer(dmg);
    if (enemies) for (const e of enemies) {
      if (e.faction === 'enemy') continue;
      if (hit(e.x, e.y, e.radius || 12)) { e.hp -= dmg; e.hitFlash = 8; }
    }
    for (const ob of bossList) {
      if (ob.hp > 0 && ob.faction === 'ally') {
        if (hit(ob.x, ob.y, ob.radius || 30)) { ob.hp -= dmg; ob.hitFlash = 8; }
      }
    }
  }
}

function applyLineDamage(ox, oy, angle, width, length, dmg, isCharmed, P, enemies, otherBosses, gameState) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const lineHit = (tx, ty, tr) => {
    const rx = tx - ox, ry = ty - oy;
    const cross = Math.abs(rx * dy - ry * dx);
    const dot = rx * dx + ry * dy;
    return cross < width / 2 + tr && dot > -length && dot < length;
  };
  const bossList = Array.isArray(otherBosses) ? otherBosses : (otherBosses ? [otherBosses] : []);
  if (isCharmed) {
    if (enemies) for (const e of enemies) {
      if (e.faction !== 'enemy') continue;
      if (lineHit(e.x, e.y, e.radius || 12)) { e.hp -= dmg; e.hitFlash = 8; }
    }
    for (const ob of bossList) {
      if (ob.hp > 0 && ob.faction !== 'ally') {
        if (lineHit(ob.x, ob.y, ob.radius || 30)) { ob.hp -= dmg; ob.hitFlash = 8; }
      }
    }
  } else {
    if (!P.hidden && !P.invincible && lineHit(P.x, P.y, P.radius)) gameState.dmgPlayer(dmg);
    if (enemies) for (const e of enemies) {
      if (e.faction === 'enemy') continue;
      if (lineHit(e.x, e.y, e.radius || 12)) { e.hp -= dmg; e.hitFlash = 8; }
    }
    for (const ob of bossList) {
      if (ob.hp > 0 && ob.faction === 'ally') {
        if (lineHit(ob.x, ob.y, ob.radius || 30)) { ob.hp -= dmg; ob.hitFlash = 8; }
      }
    }
  }
}

function applyAllDamage(b, P, enemies, otherBoss, gameState) {
  // Cross slashes — continuous damage every 4 frames, offset forward to match visual
  for (const c of b.crossSlashes) {
    if (c.life % 4 === 0) {
      const hitX = c.x + Math.cos(c.angle) * (c.range * 0.5);
      const hitY = c.y + Math.sin(c.angle) * (c.range * 0.5);
      applyAOE(hitX, hitY, c.range, c.dmg, c.isCharmed, P, enemies, otherBoss, gameState, null);
    }
  }
  // Moon severs — continuous (radius matches visual arc)
  for (const m of b.moonSevers) {
    applyAOE(m.x, m.y, m.radius, m.dmg, m.isCharmed, P, enemies, otherBoss, gameState, null);
  }
  // Smashes — continuous damage every 4 frames during active life
  for (const s of b.smashes) {
    if (s.life % 4 === 0) {
      const lifeT = s.life / s.maxLife;
      const visualR = s.radius * (1 - lifeT);
      applyAOE(s.x, s.y, Math.max(visualR, B5.SMASH_RADIUS * 0.3), s.dmg, s.isCharmed, P, enemies, otherBoss, gameState, null);
      gameState.screenShake = 8;
    }
  }
  // Whirlwinds — every 4 frames, radius scales with visual
  for (const w of b.fWhirlwinds) {
    if (w.life % 4 === 0) {
      const lifeT = w.life / w.maxLife;
      const visualR = w.radius * (0.5 + lifeT * 0.5);
      applyAOE(w.x, w.y, visualR, w.dmg, w.isCharmed, P, enemies, otherBoss, gameState, null);
    }
  }
  // Thousand cuts — per-frame damage along each slash line (DPS style)
  for (const tc of b.fThousandCuts) {
    if (tc.delay <= 0) {
      const hitX = tc.x + Math.cos(tc.angle) * (tc.range * 0.5);
      const hitY = tc.y + Math.sin(tc.angle) * (tc.range * 0.5);
      applyAOE(hitX, hitY, tc.range * 0.5, tc.dmg, tc.isCharmed, P, enemies, otherBoss, gameState, null);
    }
  }
  // Inferno slams — on slam phase, radius matches expanding visual
  for (const s of b.fInfernoSlams) {
    if (s.phase === 'slam' && s.life === Math.floor(s.maxLife * 0.45)) {
      const t = 1 - (s.life / s.maxLife);
      const visualR = s.radius * Math.min(1, (t - 0.35) / 0.2);
      applyAOE(s.x, s.y, Math.max(visualR, s.radius * 0.3), s.dmg, s.isCharmed, P, enemies, otherBoss, gameState, null);
      gameState.screenShake = 12;
    }
  }
  // Charge slashes — second frame
  for (const s of b.chargeSlashes) {
    if (s.life === s.maxLife - 2) {
      applyLineDamage(s.x, s.y, s.angle, B5.CHARGE_SLASH_WIDTH, B5.CHARGE_SLASH_LENGTH, B5.CHARGE_DAMAGE, s.isCharmed, P, enemies, otherBoss, gameState);
    }
  }
  // Frenzy waves
  for (const w of b.frenzyWaves) {
    applyAOE(w.x, w.y, w.radius, B5.FRENZY_WAVE_DAMAGE, w.isCharmed, P, enemies, otherBoss, gameState, null);
  }
}

// ========== POSITION GHOST DOM ==========
function positionGhost(b) {
  const ghost = b._ghostEl;
  const swordEl = b._swordEl;
  const canvas = document.querySelector('canvas:not(#boss5-canvas):not(#berserker-canvas)');
  if (!ghost || !canvas) return;

  const scaleX = canvas.clientWidth / canvas.width;
  const scaleY = canvas.clientHeight / canvas.height;

  ghost.style.left = (b.x * scaleX) + 'px';
  ghost.style.top = (b.y * scaleY) + 'px';
  ghost.style.display = b.dying ? 'none' : '';
  ghost.classList.toggle('frenzy', b.frenzy);

  if (b.hitFlash > 0) ghost.style.filter = 'brightness(3) drop-shadow(0 0 15px #fff)';
  else ghost.style.filter = '';

  ghost.style.opacity = b.rolling ? '0.3' : '0.95';

  // Sword positioning + animation
  if (!swordEl) return;
  swordEl.style.left = (b.x * scaleX) + 'px';
  swordEl.style.top = (b.y * scaleY) + 'px';
  const swordWrap = swordEl.querySelector('.greatsword-wrapper');
  if (!swordWrap) return;

  if (b.swinging) {
    swordEl.style.opacity = '1';
    swordEl.style.transform = `translate(-50%, -50%) rotate(${b.swingAngle}rad)`;
    // Sword animation
    const dur = getSwingDur(b);
    const t = Math.max(0, Math.min(1, 1 - (b.swingTimer / dur)));
    const easeOutBack = x => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
    const easeInQuart = x => x * x * x * x;
    const easeOutQuart = x => 1 - Math.pow(1 - x, 4);
    const easeOutElastic = x => { if (x === 0 || x === 1) return x; return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1; };

    let angleOff = 0, scale = 1, gsx = 1, gsy = 1;

    if (b.frenzy) {
      if (b.swingCombo === 0) {
        const spin = t * Math.PI * 2;
        if (t < 0.15) { const p = easeOutQuart(t / 0.15); scale = 1 + p * 0.8; angleOff = -0.3 * p; gsx = 1 + p * 0.1; gsy = 1 - p * 0.1; }
        else if (t < 0.85) { const p = (t - 0.15) / 0.7; angleOff = -0.3 + spin; scale = 1.8; gsx = 1 - Math.sin(p * Math.PI) * 0.15; gsy = 1 + Math.sin(p * Math.PI) * 0.15; }
        else { const p = (t - 0.85) / 0.15; angleOff = Math.PI * 2 - 0.3; scale = 1.8 - p * 0.8; gsx = 1; gsy = 1; }
      } else if (b.swingCombo === 1) {
        const slashPhase = Math.floor(t * 5), slashT = (t * 5) % 1, dir = slashPhase % 2 === 0 ? 1 : -1;
        if (slashT < 0.25) { const p = easeInQuart(slashT / 0.25); angleOff = -dir * Math.PI * 0.6 * p; scale = 1.3 + p * 0.3; }
        else { const p = easeOutQuart((slashT - 0.25) / 0.75); angleOff = -dir * Math.PI * 0.6 + dir * Math.PI * 1.2 * p; scale = 1.6 - p * 0.3; }
        gsx = 1 - Math.abs(Math.sin(t * Math.PI * 5)) * 0.15; gsy = 1 + Math.abs(Math.sin(t * Math.PI * 5)) * 0.15;
      } else {
        if (t < 0.3) { const p = easeOutQuart(t / 0.3); angleOff = -Math.PI * p; scale = 1 + p * 1.2; gsy = 1 + p * 0.2; gsx = 1 - p * 0.1; }
        else if (t < 0.5) { const p = easeInQuart((t - 0.3) / 0.2); angleOff = -Math.PI + p * Math.PI * 1.5; scale = 2.2 - p * 0.6; gsy = 1.2 - p * 0.4; gsx = 0.9 + p * 0.3; }
        else { const p = (t - 0.5) / 0.5; const ep = easeOutElastic(Math.min(p * 2, 1)); angleOff = Math.PI * 0.5 - ep * 0.15; scale = 1.6 - p * 0.6; gsy = 0.8 + ep * 0.2; gsx = 1.2 - ep * 0.2; }
      }
    } else {
      if (b.swingCombo === 0) {
        if (t < 0.2) { const p = t / 0.2; scale = 0.7 + p * 0.1; angleOff = -0.15 * easeOutQuart(p); gsx = 1 + p * 0.05; gsy = 1 - p * 0.05; }
        else if (t < 0.6) { const p = (t - 0.2) / 0.4; scale = 0.8 + easeOutBack(p) * 0.8; angleOff = -0.15 + 0.15 * easeOutBack(p); gsx = 1 - p * 0.1; gsy = 1 + p * 0.1; }
        else { const p = (t - 0.6) / 0.4; const ep = easeOutQuart(p); scale = 1.6 - ep * 0.6; angleOff = 0; gsx = 0.9 + ep * 0.1; gsy = 1.1 - ep * 0.1; }
      } else if (b.swingCombo === 1) {
        if (t < 0.25) { const p = easeInQuart(t / 0.25); angleOff = -Math.PI * 0.7 * p; scale = 1 + p * 0.3; gsx = 1 + p * 0.08; gsy = 1 - p * 0.08; }
        else if (t < 0.65) { const p = (t - 0.25) / 0.4; angleOff = -Math.PI * 0.7 + easeOutQuart(p) * Math.PI * 1.3; scale = 1.3; gsx = 1 - p * 0.12; gsy = 1 + p * 0.12; }
        else { const p = (t - 0.65) / 0.35; const ep = easeOutElastic(Math.min(p * 1.5, 1)); angleOff = Math.PI * 0.6 + ep * 0.1; scale = 1.3 - p * 0.3; gsx = 0.88 + p * 0.12; gsy = 1.12 - p * 0.12; }
      } else {
        if (t < 0.35) { const p = easeOutQuart(t / 0.35); angleOff = -Math.PI * 0.85 * p; scale = 1 + p * 0.7; gsy = 1 + p * 0.15; gsx = 1 - p * 0.08; }
        else if (t < 0.55) { const p = easeInQuart((t - 0.35) / 0.2); angleOff = -Math.PI * 0.85 + p * Math.PI * 1.1; scale = 1.7 - p * 0.5; gsy = 1.15 - p * 0.3; gsx = 0.92 + p * 0.2; }
        else { const p = (t - 0.55) / 0.45; const ep = easeOutElastic(Math.min(p * 2, 1)); angleOff = Math.PI * 0.25 - ep * 0.05; scale = 1.2 - p * 0.2; gsy = 0.85 + ep * 0.15; gsx = 1.12 - ep * 0.12; }
      }
    }
    swordWrap.style.transform = `rotate(${angleOff}rad) scale(${scale})`;
    // Ghost body deformation
    ghost.style.transform = `translate(-50%, -50%) scale(${0.5 * gsx}, ${0.5 * gsy})`;
    // Sword glow filter
    const glowIntensity = Math.sin(t * Math.PI);
    swordWrap.style.filter = b.frenzy
      ? `drop-shadow(0 0 ${12 + glowIntensity * 15}px #aa00ff) brightness(${1 + glowIntensity * 0.8})`
      : `drop-shadow(0 0 ${6 + glowIntensity * 10}px #8800ff) brightness(${1 + glowIntensity * 0.4})`;
  } else if (b.charging) {
    swordEl.style.opacity = '1';
    swordEl.style.transform = `translate(-50%, -50%) rotate(${b.angle}rad)`;
    const pct = b.chargeTimer / B5.CHARGE_TIME;
    swordWrap.style.transform = `scale(${1 + pct * 0.5})`;
    ghost.style.transform = `translate(-50%, -50%) scale(0.5)`;
  } else {
    swordEl.style.opacity = '0';
    ghost.style.transform = `translate(-50%, -50%) scale(0.5)`;
  }
}

// ========== drawCross helper ==========
function drawCross(ctx, x, y, angle, size, width, lifeT) {
  const dx1 = Math.cos(angle - Math.PI / 4) * size;
  const dy1 = Math.sin(angle - Math.PI / 4) * size;
  const dx2 = Math.cos(angle + Math.PI / 4) * size;
  const dy2 = Math.sin(angle + Math.PI / 4) * size;
  ctx.save();
  ctx.lineCap = 'round';
  // Outer purple glow
  ctx.shadowColor = '#8800ff';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = `rgba(136, 0, 255, ${lifeT * 0.6})`;
  ctx.lineWidth = width * 1.5;
  ctx.beginPath();
  ctx.moveTo(x - dx1, y - dy1); ctx.lineTo(x + dx1, y + dy1);
  ctx.moveTo(x - dx2, y - dy2); ctx.lineTo(x + dx2, y + dy2);
  ctx.stroke();
  // White spatial crack
  ctx.shadowBlur = 10;
  ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT * 0.9})`;
  ctx.lineWidth = width * 0.6;
  ctx.stroke();
  // Black void core
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(0, 0, 0, ${lifeT})`;
  ctx.lineWidth = width * 0.2;
  ctx.stroke();
  ctx.restore();
}

// ========== DRAW (Canvas 2D overlay — full Berserker-quality) ==========
export function drawBoss5(g, b, P, time) {
  if (!b.entered) return;

  const cvs = b._canvasEl;
  if (!cvs) return;
  // Sync overlay canvas to Phaser canvas size every frame
  const phaserCvs = document.querySelector('canvas:not(#boss5-canvas):not(#berserker-canvas)');
  if (phaserCvs && (cvs.width !== phaserCvs.width || cvs.height !== phaserCvs.height)) {
    cvs.width = phaserCvs.width;
    cvs.height = phaserCvs.height;
  }
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  // ---- Slash trail (matches Berserker: SWING_RANGE * currentScale * sRange) ----
  if (b.swinging && b._swordEl) {
    const dur = getSwingDur(b);
    const t = Math.max(0, Math.min(1, 1 - (b.swingTimer / dur)));
    const sRange = (b.swingCombo === 2 ? 1.3 : 1) * (b.frenzy ? 1.3 : 1);
    // Compute currentScale to match positionGhost sword animation
    let currentScale = 1;
    let angleOff = 0;
    const easeOutBack = x => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
    const easeOutQuart = x => 1 - Math.pow(1 - x, 4);
    const easeInQuart = x => x * x * x * x;
    const easeOutElastic = x => { if (x === 0 || x === 1) return x; return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1; };
    if (b.frenzy) {
      if (b.swingCombo === 0) {
        if (t < 0.15) { currentScale = 1 + easeOutQuart(t / 0.15) * 0.8; angleOff = -0.3 * easeOutQuart(t / 0.15); }
        else if (t < 0.85) { currentScale = 1.8; angleOff = -0.3 + t * Math.PI * 2; }
        else { currentScale = 1.8 - ((t - 0.85) / 0.15) * 0.8; angleOff = Math.PI * 2 - 0.3; }
      } else if (b.swingCombo === 1) {
        const sp = Math.floor(t * 5), st = (t * 5) % 1, dir = sp % 2 === 0 ? 1 : -1;
        if (st < 0.25) { currentScale = 1.3 + easeInQuart(st / 0.25) * 0.3; angleOff = -dir * Math.PI * 0.6 * easeInQuart(st / 0.25); }
        else { currentScale = 1.6 - easeOutQuart((st - 0.25) / 0.75) * 0.3; angleOff = -dir * Math.PI * 0.6 + dir * Math.PI * 1.2 * easeOutQuart((st - 0.25) / 0.75); }
      } else {
        if (t < 0.3) { currentScale = 1 + easeOutQuart(t / 0.3) * 1.2; angleOff = -Math.PI * easeOutQuart(t / 0.3); }
        else if (t < 0.5) { currentScale = 2.2 - easeInQuart((t - 0.3) / 0.2) * 0.6; angleOff = -Math.PI + easeInQuart((t - 0.3) / 0.2) * Math.PI * 1.5; }
        else { currentScale = 1.6 - ((t - 0.5) / 0.5) * 0.6; angleOff = Math.PI * 0.5; }
      }
    } else {
      if (b.swingCombo === 0) {
        if (t < 0.2) { currentScale = 0.7 + (t / 0.2) * 0.1; angleOff = -0.15 * easeOutQuart(t / 0.2); }
        else if (t < 0.6) { currentScale = 0.8 + easeOutBack((t - 0.2) / 0.4) * 0.8; angleOff = -0.15 + 0.15 * easeOutBack((t - 0.2) / 0.4); }
        else { currentScale = 1.6 - easeOutQuart((t - 0.6) / 0.4) * 0.6; angleOff = 0; }
      } else if (b.swingCombo === 1) {
        if (t < 0.25) { currentScale = 1 + easeInQuart(t / 0.25) * 0.3; angleOff = -Math.PI * 0.7 * easeInQuart(t / 0.25); }
        else if (t < 0.65) { currentScale = 1.3; angleOff = -Math.PI * 0.7 + easeOutQuart((t - 0.25) / 0.4) * Math.PI * 1.3; }
        else { currentScale = 1.3 - ((t - 0.65) / 0.35) * 0.3; angleOff = Math.PI * 0.6 + easeOutElastic(Math.min(((t - 0.65) / 0.35) * 1.5, 1)) * 0.1; }
      } else {
        if (t < 0.35) { currentScale = 1 + easeOutQuart(t / 0.35) * 0.7; angleOff = -Math.PI * 0.85 * easeOutQuart(t / 0.35); }
        else if (t < 0.55) { currentScale = 1.7 - easeInQuart((t - 0.35) / 0.2) * 0.5; angleOff = -Math.PI * 0.85 + easeInQuart((t - 0.35) / 0.2) * Math.PI * 1.1; }
        else { currentScale = 1.2 - ((t - 0.55) / 0.45) * 0.2; angleOff = Math.PI * 0.25; }
      }
    }
    const swordLen = 100 * currentScale * sRange; // Berserker: BK.SWING_RANGE(100) * currentScale * sRange
    const tipAngle = b.swingAngle + angleOff;
    const tipX = b.x + Math.cos(tipAngle) * swordLen;
    const tipY = b.y + Math.sin(tipAngle) * swordLen;
    b.slashTrail.push({ tipX, tipY, age: 0 });
    if (b.slashTrail.length > 30) b.slashTrail.shift();
  }

  const trailMaxAge = b.frenzy ? 12 : 8;
  b.slashTrail = b.slashTrail.filter(pt => { pt.age++; return pt.age < trailMaxAge; });
  if (b.slashTrail.length >= 2) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < b.slashTrail.length; i++) {
      const prev = b.slashTrail[i - 1], curr = b.slashTrail[i];
      const life = 1 - (curr.age / trailMaxAge);
      if (life <= 0) continue;
      const baseWidth = b.frenzy ? 30 : 20;
      const width = baseWidth * life;
      // Frenzy ultra-wide haze
      if (b.frenzy) {
        ctx.strokeStyle = `rgba(136, 0, 255, ${life * 0.25})`;
        ctx.lineWidth = width * 5; ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 40 * life;
        ctx.beginPath(); ctx.moveTo(prev.tipX, prev.tipY); ctx.lineTo(curr.tipX, curr.tipY); ctx.stroke();
      }
      // Layer 1: Outer purple glow
      ctx.strokeStyle = `rgba(136, 0, 255, ${life * (b.frenzy ? 0.6 : 0.4)})`;
      ctx.lineWidth = width * (b.frenzy ? 4 : 3);
      ctx.shadowColor = b.frenzy ? '#aa00ff' : '#8800ff';
      ctx.shadowBlur = (b.frenzy ? 35 : 20) * life;
      ctx.beginPath(); ctx.moveTo(prev.tipX, prev.tipY); ctx.lineTo(curr.tipX, curr.tipY); ctx.stroke();
      // Layer 2: White-hot
      ctx.strokeStyle = `rgba(255, ${b.frenzy ? '180, 255' : '255, 255'}, ${life * 0.8})`;
      ctx.lineWidth = width * (b.frenzy ? 1.4 : 1.0);
      ctx.shadowBlur = (b.frenzy ? 10 : 5) * life;
      ctx.beginPath(); ctx.moveTo(prev.tipX, prev.tipY); ctx.lineTo(curr.tipX, curr.tipY); ctx.stroke();
      // Layer 3: Black void core
      ctx.strokeStyle = `rgba(0, 0, 0, ${life})`;
      ctx.lineWidth = width * (b.frenzy ? 0.5 : 0.4); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(prev.tipX, prev.tipY); ctx.lineTo(curr.tipX, curr.tipY); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();

  // ---- Frenzy waves ----
  b.frenzyWaves.forEach(w => {
    const alpha = Math.min(1, w.life / 20);
    ctx.strokeStyle = `rgba(136, 0, 255, ${alpha})`;
    ctx.lineWidth = 3; ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 10;
    const len = 25;
    const perpX = Math.cos(w.angle + Math.PI / 2) * len;
    const perpY = Math.sin(w.angle + Math.PI / 2) * len;
    ctx.beginPath();
    ctx.moveTo(w.x - perpX, w.y - perpY);
    ctx.quadraticCurveTo(w.x + Math.cos(w.angle) * 10, w.y + Math.sin(w.angle) * 10, w.x + perpX, w.y + perpY);
    ctx.stroke();
  });

  // ---- 1. Cross Slashes (drawCross 3-layer) ----
  b.crossSlashes.forEach(c => {
    const lifeT = c.life / c.maxLife;
    const len = c.range * 0.8 * Math.sin(lifeT * Math.PI / 2);
    const w = 8 * lifeT;
    const cx = c.x + Math.cos(c.angle) * (c.range * 0.5);
    const cy = c.y + Math.sin(c.angle) * (c.range * 0.5);
    drawCross(ctx, cx, cy, c.angle, len, w * 1.5, lifeT);
  });

  // ---- 2. Moon Severs (arc + white core) ----
  b.moonSevers.forEach(m => {
    const lifeT = m.life / m.maxLife;
    const a = m.angle;
    const rad = m.radius;
    const w = 40 * lifeT;
    ctx.lineCap = 'round'; ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(m.x, m.y, rad, a - Math.PI / 2.5, a + Math.PI / 2.5);
    ctx.strokeStyle = `rgba(136, 0, 255, ${lifeT * 0.8})`; ctx.lineWidth = w; ctx.stroke();
    ctx.beginPath(); ctx.arc(m.x, m.y, rad * 0.95, a - Math.PI / 3, a + Math.PI / 3);
    ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT})`; ctx.lineWidth = w * 0.3; ctx.stroke();
  });

  // ---- 3. Smashes (expanding ring + core flash) ----
  b.smashes.forEach(s => {
    const lifeT = s.life / s.maxLife;
    const r = s.radius * (1 - lifeT);
    const w = 60 * lifeT;
    ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(136, 0, 255, ${lifeT * 0.8})`; ctx.lineWidth = w; ctx.stroke();
    if (lifeT > 0.6) {
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${(lifeT - 0.6) * 2.5})`; ctx.fill();
    }
  });

  // ---- 4. Blood Whirlwind (spinning arcs + inner white) ----
  b.fWhirlwinds.forEach(w => {
    const lifeT = w.life / w.maxLife;
    const r = w.radius * (0.5 + lifeT * 0.5);
    ctx.save(); ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 25;
    for (let i = 0; i < 4; i++) {
      const arcStart = w.spin + (Math.PI * 2 / 4) * i;
      ctx.beginPath(); ctx.arc(w.x, w.y, r, arcStart, arcStart + Math.PI / 3);
      ctx.strokeStyle = `rgba(170, 0, 255, ${lifeT * 0.7})`; ctx.lineWidth = 20 * lifeT; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(w.x, w.y, r * 0.9, arcStart + 0.1, arcStart + Math.PI / 4);
      ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT * 0.5})`; ctx.lineWidth = 6 * lifeT; ctx.stroke();
    }
    ctx.restore();
  });

  // ---- 5. Thousand Cuts (staggered fan lines) ----
  b.fThousandCuts.forEach(tc => {
    if (tc.delay > 0) return;
    const lifeT = tc.life / tc.maxLife;
    const entryT = Math.min(1, (tc.maxLife - tc.life) / 3); // fast entry flash
    const len = tc.range * Math.sin(lifeT * Math.PI * 0.85) * (0.3 + entryT * 0.7);
    const ex = tc.x + Math.cos(tc.angle) * len;
    const ey = tc.y + Math.sin(tc.angle) * len;
    ctx.save(); ctx.lineCap = 'round';
    // Layer 1: wide deep glow
    ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.moveTo(tc.x, tc.y); ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(100, 0, 200, ${lifeT * 0.55})`; ctx.lineWidth = 22 * lifeT; ctx.stroke();
    // Layer 2: mid purple
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(tc.x, tc.y); ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(180, 0, 255, ${lifeT * 0.85})`; ctx.lineWidth = 10 * lifeT; ctx.stroke();
    // Layer 3: bright core
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(tc.x, tc.y); ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(255, 200, 255, ${lifeT * 0.95})`; ctx.lineWidth = 3 * lifeT; ctx.stroke();
    // Tip impact: cross spark at blade end
    if (entryT > 0.5 && lifeT > 0.4) {
      const sparkA = lifeT * 0.8;
      const sparkLen = 18 * lifeT;
      ctx.shadowColor = '#ff88ff'; ctx.shadowBlur = 14;
      for (let si = 0; si < 4; si++) {
        const sa = tc.angle + (si - 1.5) * 0.55;
        ctx.beginPath();
        ctx.moveTo(ex - Math.cos(sa) * sparkLen * 0.3, ey - Math.sin(sa) * sparkLen * 0.3);
        ctx.lineTo(ex + Math.cos(sa) * sparkLen, ey + Math.sin(sa) * sparkLen);
        ctx.strokeStyle = `rgba(255, 150, 255, ${sparkA})`; ctx.lineWidth = 2.5; ctx.stroke();
      }
      // tip flash dot
      ctx.beginPath(); ctx.arc(ex, ey, 5 * lifeT, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${sparkA})`; ctx.shadowBlur = 20; ctx.fill();
    }
    ctx.restore();
  });

  // ---- 6. Inferno Slam (rise/slam/crack phases) ----
  b.fInfernoSlams.forEach(s => {
    const lifeT = s.life / s.maxLife;
    const t = 1 - lifeT;
    ctx.save();
    if (s.phase === 'rise') {
      const riseP = t / 0.35;
      const warningR = s.radius * riseP;
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, warningR);
      grd.addColorStop(0, `rgba(255, 0, 200, ${0.38 * riseP})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, warningR), 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();
      for (let ri = 0; ri < 3; ri++) {
        const rr = warningR * (0.3 + ri * 0.35);
        const pulse = 0.5 + 0.5 * Math.sin(riseP * Math.PI * 5 + ri * 1.3);
        ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, rr), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(220, 0, 255, ${(0.4 + pulse * 0.5) * riseP})`;
        ctx.lineWidth = 2 + ri * 1.5; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 20; ctx.stroke();
      }
      const numCracks = B5.F_INFERNO_CRACKS || 10;
      for (let i = 0; i < numCracks; i++) {
        const a = (Math.PI * 2 / numCracks) * i + s.angle * 0.3;
        ctx.beginPath(); ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(a) * s.radius * 0.5 * riseP, s.y + Math.sin(a) * s.radius * 0.5 * riseP);
        ctx.strokeStyle = `rgba(255, 80, 255, ${0.35 * riseP})`; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 6; ctx.stroke();
      }
    } else if (s.phase === 'slam') {
      const slamP = (t - 0.35) / 0.2;
      const r = s.radius * slamP;
      const flashA = Math.max(0, 1 - slamP * 1.6);
      const flashGrd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, Math.max(1, r * 0.75));
      flashGrd.addColorStop(0, `rgba(255,255,255,${flashA})`);
      flashGrd.addColorStop(0.45, `rgba(255,80,255,${flashA * 0.8})`);
      flashGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, r * 0.75), 0, Math.PI * 2);
      ctx.fillStyle = flashGrd; ctx.fill();
      const rWidths = [44, 22, 9]; const rAlphas = [0.9, 0.7, 0.5];
      const rColors = ['rgba(136,0,255,', 'rgba(200,0,255,', 'rgba(255,0,180,'];
      for (let ri = 0; ri < 3; ri++) {
        const rr = Math.max(1, r * (1 - ri * 0.1));
        ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `${rColors[ri]}${rAlphas[ri] * (1 - slamP * 0.5)})`;
        ctx.lineWidth = rWidths[ri] * (1 - slamP * 0.55);
        ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 55; ctx.stroke();
      }
      const numBeams = B5.F_INFERNO_CRACKS || 10;
      for (let i = 0; i < numBeams; i++) {
        const a = (Math.PI * 2 / numBeams) * i + s.angle * 0.3;
        ctx.beginPath(); ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(a) * r * 1.2, s.y + Math.sin(a) * r * 1.2);
        ctx.strokeStyle = `rgba(255,160,255,${0.75 * (1 - slamP)})`;
        ctx.lineWidth = 5 * (1 - slamP); ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 22; ctx.stroke();
      }
    } else {
      const numCracks = B5.F_INFERNO_CRACKS || 10;
      ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 18;
      for (let i = 0; i < numCracks; i++) {
        const a = (Math.PI * 2 / numCracks) * i + s.angle * 0.3;
        const crackLen = s.radius * 1.05 * lifeT;
        const mid1X = s.x + Math.cos(a + 0.15) * crackLen * 0.45;
        const mid1Y = s.y + Math.sin(a + 0.15) * crackLen * 0.45;
        const mid2X = s.x + Math.cos(a - 0.1) * crackLen * 0.75;
        const mid2Y = s.y + Math.sin(a - 0.1) * crackLen * 0.75;
        ctx.beginPath(); ctx.moveTo(s.x, s.y);
        ctx.lineTo(mid1X, mid1Y); ctx.lineTo(mid2X, mid2Y);
        ctx.lineTo(s.x + Math.cos(a) * crackLen, s.y + Math.sin(a) * crackLen);
        ctx.strokeStyle = `rgba(200, 0, 255, ${lifeT * 0.9})`;
        ctx.lineWidth = 5 * lifeT; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mid1X, mid1Y);
        ctx.lineTo(mid1X + Math.cos(a + 0.9) * crackLen * 0.18, mid1Y + Math.sin(a + 0.9) * crackLen * 0.18);
        ctx.strokeStyle = `rgba(255, 100, 255, ${lifeT * 0.55})`;
        ctx.lineWidth = 2.5 * lifeT; ctx.stroke();
      }
      const decayR = s.radius * (0.55 + lifeT * 0.45);
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, decayR * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 0, 255, ${lifeT * 0.4})`;
      ctx.shadowBlur = 30; ctx.fill();
    }
    ctx.restore();
  });

  // ---- 7. Charge slash (3-layer beam + fracture) ----
  b.chargeSlashes.forEach(s => {
    ctx.save();
    const lifeT = s.life / s.maxLife;
    const cos = Math.cos(s.angle), sin = Math.sin(s.angle);
    const drawLen = B5.CHARGE_SLASH_LENGTH || 600;
    // Layer 1: Wide deep-purple outer glow
    ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 40 * lifeT;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + cos * drawLen, s.y + sin * drawLen);
    ctx.strokeStyle = `rgba(68, 0, 170, ${lifeT * 0.6})`;
    ctx.lineWidth = (B5.CHARGE_SLASH_WIDTH || 40) * lifeT; ctx.lineCap = 'round'; ctx.stroke();
    // Layer 2: Medium purple core
    ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + cos * drawLen, s.y + sin * drawLen);
    ctx.strokeStyle = `rgba(170, 0, 255, ${lifeT * 0.8})`;
    ctx.lineWidth = (B5.CHARGE_SLASH_WIDTH || 40) * 0.4 * lifeT; ctx.stroke();
    // Layer 3: white-hot center
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + cos * drawLen, s.y + sin * drawLen);
    ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT})`; ctx.lineWidth = 4 * lifeT; ctx.stroke();
    // Fracture particles
    if (lifeT < 0.5) {
      const shardCount = Math.floor((1 - lifeT * 2) * 8);
      for (let i = 0; i < shardCount; i++) {
        const frac = Math.random();
        const px = s.x + cos * drawLen * frac + (Math.random() - 0.5) * 20;
        const py = s.y + sin * drawLen * frac + (Math.random() - 0.5) * 20;
        ctx.fillStyle = `rgba(170, ${Math.floor(Math.random() * 100)}, 255, ${lifeT * 1.5})`;
        const sz = 2 + Math.random() * 4;
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
    }
    ctx.restore();
  });

  // ---- 8. Charging indicator ----
  if (b.charging && b.chargeTimer > 5) {
    ctx.save();
    const t = Math.min(1, b.chargeTimer / B5.CHARGE_TIME);
    const ringR = 60 * (1 - t * 0.7);
    // Screen darken
    ctx.fillStyle = `rgba(0, 0, 0, ${t * 0.25})`;
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 20 + t * 30;
    const ringColor = `rgba(255, 0, 255, ${0.4 + t * 0.4})`;
    ctx.beginPath(); ctx.arc(b.x, b.y, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor; ctx.lineWidth = 2 + t * 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x, b.y, ringR * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor; ctx.lineWidth = 1; ctx.stroke();
    // Energy convergence lines
    const nLines = 8;
    for (let i = 0; i < nLines; i++) {
      const a = (Math.PI * 2 / nLines) * i + b.chargeTimer * 0.08;
      const outerR = ringR * 1.5 + Math.sin(b.chargeTimer * 0.2 + i) * 10;
      ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * outerR, b.y + Math.sin(a) * outerR);
      ctx.lineTo(b.x + Math.cos(a) * ringR * 0.3, b.y + Math.sin(a) * ringR * 0.3);
      ctx.strokeStyle = `rgba(170, 0, 255, ${t * 0.5})`; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  // ---- 9. Execution phases ----
  if (b.executing && b.execTarget) {
    ctx.save();
    const tgt = b.execTarget;
    if (b.execPhase === 1) {
      // Shrinking sigil on target
      const lt = Math.min(1, b.execTimer / B5.EXEC_DURATION);
      const sigilR = 60 * (1 - lt * 0.7);
      ctx.beginPath(); ctx.arc(tgt.x, tgt.y, sigilR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(170, 0, 255, ${0.3 + lt * 0.5})`; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 20; ctx.stroke();
      ctx.beginPath(); ctx.arc(tgt.x, tgt.y, sigilR * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${lt * 0.6})`; ctx.lineWidth = 1; ctx.stroke();
      // Kill intent beam
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = `rgba(136, 0, 255, ${lt * 0.4})`; ctx.lineWidth = 1; ctx.shadowBlur = 8; ctx.stroke();
      ctx.fillStyle = `rgba(0, 0, 0, ${lt * 0.2})`;
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    }
    if (b.execSweep) {
      const sw = b.execSweep;
      const sweepLife = sw.timer / 20;
      const sweepR = B5.EXEC_RANGE;
      // Wide haze
      ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 40 * sweepLife;
      ctx.beginPath(); ctx.arc(b.x, b.y, sweepR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(68, 0, 170, ${sweepLife * 0.4})`;
      ctx.lineWidth = 50 * sweepLife; ctx.stroke();
      // Inner white flash
      ctx.beginPath(); ctx.arc(b.x, b.y, sweepR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${sweepLife * 0.3})`; ctx.fill();
    }
    ctx.restore();
  }

  // ---- Frenzy aura ring ----
  if (b.frenzy) {
    const fg = Math.sin(time * 0.015) * 0.3 + 0.7;
    ctx.save(); ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 30 + Math.sin(time * 0.01) * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 0, 255, ${fg * 0.3})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
