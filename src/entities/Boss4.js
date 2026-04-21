// ===========================
//  Boss 4: 零号协议·霓虹神明 (Protocol OMEGA)
//  The ultimate cyberpunk boss with epic visual effects
// ===========================
import CONFIG from '../config.js';
import { ang, dist, lerp, clamp, rand, randInt, getCharmedTarget } from '../utils.js';
import { startMatrixRain, updateMatrixPhase, stopMatrixRain } from '../systems/MatrixRain.js';
import { tickBossStatus, forEachOtherBoss, findOtherBoss } from '../bossShared/index.js';

// ===== Ghost CSS & DOM helpers =====
let ghostCSSInjected = false;
function injectGhostCSS() {
  if (ghostCSSInjected) return;
  ghostCSSInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .boss4-ghost {
      position: absolute;
      pointer-events: none;
      z-index: 50;
      transform: translate(-50%, -50%);
      filter: drop-shadow(0 0 12px #00ffff) drop-shadow(0 0 6px #ff00ff);
      opacity: 0.85;
      transition: opacity 0.3s;
    }
    .boss4-ghost.dying { opacity: 0; transform: translate(-50%, -50%) scale(1.5); transition: all 0.4s; }
    .boss4-ghost .ghost-body {
      animation: ghostFloat infinite 0.6s ease-in-out;
      position: relative;
      width: 70px; height: 70px;
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
    @keyframes ghostFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    .boss4-ghost [class^="gt"],[class*=" gt"] { border-radius: 1px; }
    .boss4-ghost .gt0,.boss4-ghost .gt1,.boss4-ghost .gt2,.boss4-ghost .gt3,.boss4-ghost .gt4,
    .boss4-ghost .gs0,.boss4-ghost .gs1,.boss4-ghost .gs2,.boss4-ghost .gs3,.boss4-ghost .gs4,.boss4-ghost .gs5 {
      background: linear-gradient(135deg, #00ccff, #8844ff);
    }
    .boss4-ghost .gt0{grid-area:t0}.boss4-ghost .gt1{grid-area:t1}.boss4-ghost .gt2{grid-area:t2}
    .boss4-ghost .gt3{grid-area:t3}.boss4-ghost .gt4{grid-area:t4}
    .boss4-ghost .gs0{grid-area:s0}.boss4-ghost .gs1{grid-area:s1}.boss4-ghost .gs2{grid-area:s2}
    .boss4-ghost .gs3{grid-area:s3}.boss4-ghost .gs4{grid-area:s4}.boss4-ghost .gs5{grid-area:s5}
    .boss4-ghost .ga1{grid-area:a1}.boss4-ghost .ga2{grid-area:a2}.boss4-ghost .ga3{grid-area:a3}
    .boss4-ghost .ga4{grid-area:a4}.boss4-ghost .ga5{grid-area:a5}.boss4-ghost .ga6{grid-area:a6}
    .boss4-ghost .ga7{grid-area:a7}.boss4-ghost .ga8{grid-area:a8}.boss4-ghost .ga9{grid-area:a9}
    .boss4-ghost .ga10{grid-area:a10}.boss4-ghost .ga11{grid-area:a11}.boss4-ghost .ga12{grid-area:a12}
    .boss4-ghost .ga13{grid-area:a13}.boss4-ghost .ga14{grid-area:a14}.boss4-ghost .ga15{grid-area:a15}
    .boss4-ghost .ga16{grid-area:a16}.boss4-ghost .ga17{grid-area:a17}.boss4-ghost .ga18{grid-area:a18}
    .boss4-ghost .gf0 { animation: gFlick0 0.5s infinite; }
    .boss4-ghost .gf1 { animation: gFlick1 0.5s infinite; }
    @keyframes gFlick0 {
      0%,49% { background: linear-gradient(135deg, #00ccff, #8844ff); }
      50%,100% { background: transparent; }
    }
    @keyframes gFlick1 {
      0%,49% { background: transparent; }
      50%,100% { background: linear-gradient(135deg, #00ccff, #8844ff); }
    }
    .boss4-ghost .ghost-eye {
      width: 18px; height: 22px; position: absolute; top: 14px;
      background: radial-gradient(circle, #00ffff 40%, #0066ff 100%);
      border-radius: 4px;
    }
    .boss4-ghost .ghost-eye-l { left: 12px; }
    .boss4-ghost .ghost-eye-r { right: 12px; }
    .boss4-ghost .ghost-pupil {
      width: 8px; height: 8px; background: #fff;
      border-radius: 50%; position: absolute; top: 10px; z-index: 1;
      box-shadow: 0 0 4px #fff;
    }
    .boss4-ghost .ghost-pupil-l { left: 17px; }
    .boss4-ghost .ghost-pupil-r { right: 17px; }
    .boss4-ghost .ghost-shadow {
      width: 50px; height: 12px; background: rgba(0,255,255,0.2);
      border-radius: 50%; position: absolute; bottom: -8px; left: 50%;
      transform: translateX(-50%); filter: blur(4px);
      animation: gShadow 0.6s infinite;
    }
    @keyframes gShadow {
      0%,100% { opacity: 0.4; width: 50px; }
      50% { opacity: 0.15; width: 40px; }
    }
    .boss4-ghost .ghost-hp-bar {
      position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
      width: 50px; height: 4px; background: rgba(0,0,0,0.5); border-radius: 2px;
    }
    .boss4-ghost .ghost-hp-fill {
      height: 100%; background: #00ffcc; border-radius: 2px; transition: width 0.15s;
    }
  `;
  document.head.appendChild(style);
}

function createGhostDOM() {
  injectGhostCSS();
  const el = document.createElement('div');
  el.className = 'boss4-ghost';
  const body = document.createElement('div');
  body.className = 'ghost-body';
  // Grid cells
  ['gt0','gt1','gt2','gt3','gt4','gs0','gs1','gs2','gs3','gs4','gs5'].forEach(c => {
    const d = document.createElement('div'); d.className = c; body.appendChild(d);
  });
  // Flickering bottom cells
  const f0 = ['ga1','ga6','ga7','ga8','ga11','ga12','ga13','ga18'];
  const f1 = ['ga2','ga3','ga4','ga5','ga9','ga10','ga14','ga15','ga16','ga17'];
  f0.forEach(c => { const d = document.createElement('div'); d.className = c + ' gf0'; body.appendChild(d); });
  f1.forEach(c => { const d = document.createElement('div'); d.className = c + ' gf1'; body.appendChild(d); });
  // Eyes & pupils
  ['ghost-pupil ghost-pupil-l','ghost-pupil ghost-pupil-r','ghost-eye ghost-eye-l','ghost-eye ghost-eye-r'].forEach(c => {
    const d = document.createElement('div'); d.className = c; body.appendChild(d);
  });
  el.appendChild(body);
  // Shadow
  const shadow = document.createElement('div'); shadow.className = 'ghost-shadow'; el.appendChild(shadow);
  // HP bar
  const hpBar = document.createElement('div'); hpBar.className = 'ghost-hp-bar';
  const hpFill = document.createElement('div'); hpFill.className = 'ghost-hp-fill'; hpFill.style.width = '100%';
  hpBar.appendChild(hpFill); el.appendChild(hpBar);
  return el;
}

// ===== Phase-1 Fire Blob CSS & DOM =====
// The P1 "organic fire" body. Port of a pure-CSS/SVG loader using
// blur+contrast metaball trick: multiple blurred rotating polygons inside
// an SVG mask, combined via `filter: contrast()` to create a pulsating
// lava-blob look. Attached as DOM overlay on top of the canvas, mirrored
// to boss.x/boss.y every frame (same pattern as P3 ghosts).
let fireBlobCSSInjected = false;
function injectFireBlobCSS() {
  if (fireBlobCSSInjected) return;
  fireBlobCSSInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .boss4-p1-fire-wrap {
      position: absolute;
      pointer-events: none;
      z-index: 50;
      transform: translate(-50%, -50%);
      transition: filter 0.1s;
    }
    .boss4-p1-fire-wrap.b4fire-hit { filter: brightness(2.6) saturate(1.3); }
    .boss4-p1-fire {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      box-shadow: 0 0 25px 0 rgba(255, 191, 72, 0.5), 0 20px 50px 0 rgba(191, 74, 29, 0.5);
      animation: b4FireColorize 6s ease-in-out infinite;
    }
    .boss4-p1-fire::before {
      content: "";
      position: absolute;
      top: 0; left: 0;
      width: 100px; height: 100px;
      border-radius: 50%;
      border-top: solid 1px #ffbf48;
      border-bottom: solid 1px #be4a1d;
      background: linear-gradient(180deg, rgba(255,191,71,0.25), rgba(191,74,29,0.5));
      box-shadow:
        inset 0 10px 10px 0 rgba(255,191,71,0.5),
        inset 0 -10px 10px 0 rgba(191,74,29,0.5);
    }
    .boss4-p1-fire .b4fire-box {
      width: 100px; height: 100px;
      background: linear-gradient(180deg, #ffbf48 30%, #be4a1d 70%);
      mask: url(#b4FireClipping);
      -webkit-mask: url(#b4FireClipping);
    }
    .boss4-p1-fire svg { position: absolute; top: 0; left: 0; }
    .boss4-p1-fire svg #b4FireClipping {
      filter: contrast(15);
      animation: b4FireRoundness 1s linear infinite;
    }
    .boss4-p1-fire svg #b4FireClipping polygon { filter: blur(7px); }
    .boss4-p1-fire svg #b4FireClipping polygon:nth-child(1) { transform-origin: 75% 25%; transform: rotate(90deg); }
    .boss4-p1-fire svg #b4FireClipping polygon:nth-child(2) { transform-origin: 50% 50%; animation: b4FireRot 2s linear infinite reverse; }
    .boss4-p1-fire svg #b4FireClipping polygon:nth-child(3) { transform-origin: 50% 60%; animation: b4FireRot 2s linear infinite; animation-delay: -0.66s; }
    .boss4-p1-fire svg #b4FireClipping polygon:nth-child(4) { transform-origin: 40% 40%; animation: b4FireRot 2s linear infinite reverse; }
    .boss4-p1-fire svg #b4FireClipping polygon:nth-child(5) { transform-origin: 40% 40%; animation: b4FireRot 2s linear infinite reverse; animation-delay: -1s; }
    .boss4-p1-fire svg #b4FireClipping polygon:nth-child(6) { transform-origin: 60% 40%; animation: b4FireRot 2s linear infinite; }
    .boss4-p1-fire svg #b4FireClipping polygon:nth-child(7) { transform-origin: 60% 40%; animation: b4FireRot 2s linear infinite; animation-delay: -1.33s; }
    @keyframes b4FireRot { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes b4FireRoundness { 0% { filter: contrast(15); } 20% { filter: contrast(3); } 40% { filter: contrast(3); } 60% { filter: contrast(15); } 100% { filter: contrast(15); } }
    @keyframes b4FireColorize { 0% { filter: hue-rotate(0deg); } 20% { filter: hue-rotate(-30deg); } 40% { filter: hue-rotate(-60deg); } 60% { filter: hue-rotate(-90deg); } 80% { filter: hue-rotate(-45deg); } 100% { filter: hue-rotate(0deg); } }
  `;
  document.head.appendChild(style);
}

function createFireBlobDOM() {
  injectFireBlobCSS();
  // Outer wrapper — handles translate-centering and hit-flash filter
  const wrap = document.createElement('div');
  wrap.className = 'boss4-p1-fire-wrap';
  // Inner element — animations happen here
  const el = document.createElement('div');
  el.className = 'boss4-p1-fire';
  // SVG mask definition
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '100');
  svg.setAttribute('height', '100');
  svg.setAttribute('viewBox', '0 0 100 100');
  const defs = document.createElementNS(NS, 'defs');
  const mask = document.createElementNS(NS, 'mask');
  mask.setAttribute('id', 'b4FireClipping');
  const POLYS = [
    { points: '0,0 100,0 100,100 0,100', fill: 'black' },
    { points: '25,25 75,25 50,75', fill: 'white' },
    { points: '50,25 75,75 25,75', fill: 'white' },
    { points: '35,35 65,35 50,65', fill: 'white' },
    { points: '35,35 65,35 50,65', fill: 'white' },
    { points: '35,35 65,35 50,65', fill: 'white' },
    { points: '35,35 65,35 50,65', fill: 'white' },
  ];
  POLYS.forEach(p => {
    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', p.points);
    poly.setAttribute('fill', p.fill);
    mask.appendChild(poly);
  });
  defs.appendChild(mask);
  svg.appendChild(defs);
  el.appendChild(svg);
  // Main gradient box (masked by the above)
  const box = document.createElement('div');
  box.className = 'b4fire-box';
  el.appendChild(box);
  wrap.appendChild(el);
  return wrap;
}

// ===========================
//  Overheat mechanic
//  Accumulates "heat" as the boss launches big moves; on overflow the boss
//  is forced into a 3-second venting state where attacks are suspended and
//  incoming damage is multiplied — a deliberate punish window for the player.
// ===========================

// Bump heat by `amount`. No-op before the unlock phase / during vent/stun.
function addHeat(b, amount) {
  const OH = CONFIG.BOSS4.OVERHEAT;
  if (!OH) return;
  if (b.phase < OH.ENABLED_FROM_PHASE) return;
  if (b.overheatState !== 'normal') return;
  if (b.coreStunned > 0 || b.coreChanneling) return; // paused while core event runs
  b.heat = Math.min(OH.MAX_HEAT, (b.heat || 0) + amount);
}

function tickOverheat(b, gameState, particles) {
  const OH = CONFIG.BOSS4.OVERHEAT;
  if (!OH) return;
  // Mechanic disabled until configured phase
  if (b.phase < OH.ENABLED_FROM_PHASE) {
    b.heat = 0;
    b.overheatState = 'normal';
    b.overheatTimer = 0;
    return;
  }

  // Natural decay while in normal state
  if (b.overheatState === 'normal') {
    const decayPerFrame = OH.DECAY_PER_SEC / 60;
    b.heat = Math.max(0, (b.heat || 0) - decayPerFrame);
    // Threshold breach — enter overheating pre-vent window
    if (b.heat >= OH.MAX_HEAT) {
      b.overheatState = 'overheating';
      b.overheatTimer = OH.OVERHEATING_DURATION;
      b.heat = OH.MAX_HEAT;
      gameState.screenShake = Math.max(gameState.screenShake || 0, 6);
      gameState.showWaveText('⚠ SYSTEM OVERHEATING ⚠');
    }
    return;
  }

  // Overheating — short tell, screen-shake rumble, spawning crack sparks
  if (b.overheatState === 'overheating') {
    b.overheatTimer--;
    // Rumble every 10 frames
    if (b.overheatTimer % 10 === 0) gameState.screenShake = Math.max(gameState.screenShake || 0, 4);
    // Occasional crack spark
    if (b.overheatTimer % 4 === 0) {
      const ca = Math.random() * Math.PI * 2;
      const cd = b.radius * (0.9 + Math.random() * 0.4);
      particles.spawn(b.x + Math.cos(ca) * cd, b.y + Math.sin(ca) * cd,
        Math.random() < 0.5 ? '#ff4400' : '#ffcc00', 3, 3, 14, 2);
    }
    if (b.overheatTimer <= 0) {
      // Transition → venting (the punish window)
      b.overheatState = 'venting';
      b.overheatTimer = OH.VENTING_DURATION;
      // Cancel all active attacks — boss is overloaded
      b.sliceActive = false;
      b.dashing = false;
      b.beaming = false;
      b.threadActive = false;
      b.glitchThreads = [];
      gameState.screenShake = Math.max(gameState.screenShake || 0, 15);
      gameState.showWaveText('💥 OVERHEAT — PUNISH!');
      particles.spawn(b.x, b.y, '#ffffff', 40, 8, 35, 5);
      particles.spawn(b.x, b.y, '#ffcc00', 30, 6, 30, 4);
    }
    return;
  }

  // Venting — boss is exposed, steam particles, no attacks
  if (b.overheatState === 'venting') {
    b.overheatTimer--;
    // Steam plume every 3 frames
    if (b.overheatTimer % 3 === 0) {
      const sx = b.x + (Math.random() - 0.5) * b.radius * 1.4;
      const sy = b.y + (Math.random() - 0.5) * b.radius * 0.6;
      particles.spawn(sx, sy, '#ffffff', 2, 1, 28, 2);
    }
    if (b.overheatTimer <= 0) {
      b.overheatState = 'normal';
      b.heat = 0;
      particles.spawn(b.x, b.y, '#00ffff', 20, 5, 20, 3);
    }
  }
}

export function createBoss4(W, H, wave) {
  const B4 = CONFIG.BOSS4;
  return {
    faction: 'enemy',
    x: W / 2, y: -100,
    vx: 0, vy: 0,
    radius: B4.RADIUS,
    hp: B4.BASE_HP + wave * B4.HP_PER_WAVE,
    maxHp: B4.BASE_HP + wave * B4.HP_PER_WAVE,
    speed: B4.PHASE1.SPEED,
    color: B4.COLOR,
    phase: 0, // 0=entrance, 1, 2, 3
    atkTimer: 0,
    hitFlash: 0,
    entered: false,
    charmed: 0,
    // Entrance state
    entranceTimer: 0,
    entranceSlash: false,
    // Visual state
    rotAngle: 0,          // rotating geometry layers
    innerRotAngle: 0,
    outerRotAngle: 0,     // third layer
    glitchTimer: 0,
    pulseAlpha: 0,
    afterImages: [],      // constant ghosting trail [{x,y,alpha,rot}]
    // Phase 1
    sliceActive: false,
    sliceWarn: 0,
    sliceDuration: 0,
    sliceTimer: randInt(240, 480), // random 4-8s first fire
    sliceAngle: 0, sliceCX: 0, sliceCY: 0, // angle-based cross through center point
    // Phase 2
    dashing: false,
    dashCount: 0,
    dashWarn: 0,
    dashTarget: null,
    dashTrail: [],
    dashIsCharmed: false,
    strikes: [],      // orbital strike markers
    fires: [],         // ground fire zones
    shockwaveRadius: 0,
    shockwaveActive: false,
    phase2Entered: false,
    // Phase 3
    phase3Entered: false,
    beaming: false,
    beamAngle: 0,
    beamSweep: 0,
    beamDuration: 0,
    beamIsCharmed: false,
    bombs: [],         // glitch bombs
    ghosts: [],        // summoned ghost entities
    // Glitch Threads (错乱神经束)
    glitchThreads: [],      // active threads [{angle, warnTime, burstTime, hit}]
    threadTimer: 0,         // cooldown timer
    threadBurstIndex: 0,    // how many threads spawned so far in current burst
    threadActive: false,    // currently firing threads
    // Glitch Cores (故障核心击破机制)
    glitchCores: [],        // active cores [{x, y, hp, maxHp, radius, hitFlash}]
    coreChanneling: false,  // currently channeling destruction
    coreChannelTimer: 0,    // countdown frames
    coreSpawnTimer: 0,      // spawn interval countdown
    coreStunned: 0,         // stun timer after backlash (free damage window)
    // Overheat 过热机制 (P2+)
    heat: 0,                // 0..MAX_HEAT
    overheatState: 'normal', // 'normal' | 'overheating' | 'venting'
    overheatTimer: 0,       // countdown frames in current non-normal state
    // Gravity singularity decorative particles (purely visual, ticked in draw)
    gravityFlecks: [],      // [{ angle, radius, speed, age, maxAge }]
    // P1 fire-blob DOM overlay (only exists while boss is in Phase 1)
    fireBlobEl: null,
    deathAnim: 0,      // death animation timer
    dying: false,
    // Common
    bossName: '零号协议',
    hpColor: 0x00ffff,
    lastTargetPos: null,
    threatTable: null,
    updateFn: updateBoss4,
    drawFn: drawBoss4,
  };
}

export function updateBoss4(boss, P, bullets, eBullets, mines, particles, gameState, weapons, enemies, otherBoss) {
  const b = boss;
  const B4 = CONFIG.BOSS4;
  const W = gameState.W;
  const H = gameState.H;

  // ===== ENTRANCE SEQUENCE =====
  if (!b.entered) {
    b.entranceTimer++;
    // Phase 0: slide into position
    if (b.entranceTimer < 60) {
      b.y = lerp(b.y, H * 0.28, 0.04);
    }
    // Flash at frame 60
    if (b.entranceTimer === 60) {
      gameState.screenShake = 15;
      particles.spawn(b.x, b.y, '#00ffff', 40, 8, 40, 6);
      particles.spawn(b.x, b.y, '#ff00ff', 30, 6, 35, 5);
    }
    // Glitch slash effect 60-90
    if (b.entranceTimer > 60 && b.entranceTimer < 90) {
      gameState.screenShake = 3;
      // Spawn particles along a vertical slash
      if (b.entranceTimer % 3 === 0) {
        const sy = rand(0, H);
        particles.spawn(W / 2, sy, '#ff0066', 5, 3, 20, 2);
      }
    }
    // Grid flash 90-120
    if (b.entranceTimer > 90 && b.entranceTimer < 120) {
      if (b.entranceTimer % 5 === 0) {
        particles.spawn(rand(0, W), rand(0, H), '#00ffff', 3, 2, 15, 1);
      }
    }
    if (b.entranceTimer >= B4.ENTRANCE_DURATION) {
      b.entered = true;
      b.phase = 1;
      gameState.screenShake = 20;
      particles.spawn(b.x, b.y, '#00ffff', 50, 10, 50, 8);
      gameState.showWaveText('⚠ PROTOCOL OMEGA ⚠');
      startMatrixRain(W, H, 1);
    }
    return false; // not dead yet
  }

  // Death animation
  if (b.dying) {
    b.deathAnim++;
    if (b.deathAnim % 3 === 0) {
      const da = rand(0, Math.PI * 2);
      const dd = rand(0, b.radius);
      particles.spawn(
        b.x + Math.cos(da) * dd,
        b.y + Math.sin(da) * dd,
        b.deathAnim % 6 < 3 ? '#00ffff' : '#ff00ff', 8, 5, 25, 4
      );
    }
    gameState.screenShake = Math.min(b.deathAnim * 0.1, 15);
    if (b.deathAnim >= 90) {
      // Final explosion
      particles.spawn(b.x, b.y, '#ffffff', 80, 15, 60, 10);
      particles.spawn(b.x, b.y, '#00ffff', 60, 12, 50, 8);
      particles.spawn(b.x, b.y, '#ff00ff', 60, 12, 50, 8);
      gameState.screenShake = 30;
      gameState.hitStop = CONFIG.COMBAT.HITSTOP_ON_BOSS_KILL;
      gameState.kills += B4.KILL_SCORE;
      gameState.showWaveText('PROTOCOL OMEGA TERMINATED');
      stopMatrixRain();
      // Clean up all ghosts
      b.ghosts.forEach(g => g.el.remove());
      b.ghosts = [];
      // Clean up P1 fire blob DOM if still present (shouldn't be past P1, but safe)
      if (b.fireBlobEl) { b.fireBlobEl.remove(); b.fireBlobEl = null; }
      return true; // dead — remove from array
    }
    return false; // still dying
  }

  b.atkTimer++;
  b.rotAngle += 0.008 + (b.phase >= 3 ? 0.004 : 0);
  b.innerRotAngle -= 0.012 - (b.phase >= 2 ? 0.003 : 0);
  b.outerRotAngle += 0.005;
  b.glitchTimer++;
  // Unified hit-flash + charmed decay + snared/launched early-return
  if (tickBossStatus(b)) return;

  // Afterimage trail — smooth tracking ribbon
  b.afterImages.unshift({ x: b.x, y: b.y, alpha: 1.0, phase: b.phase });
  if (b.afterImages.length > 25) b.afterImages.pop();
  b.afterImages.forEach(ai => ai.alpha *= 0.85); // fast fade

  // ==================== P1 FIRE BLOB DOM LIFECYCLE ====================
  // Create during P1, sync position every frame, destroy on phase transition.
  const shouldShowFireBlob = b.phase === 1 && b.entered && !b.dying;
  if (shouldShowFireBlob) {
    if (!b.fireBlobEl) {
      b.fireBlobEl = createFireBlobDOM();
      const container = document.querySelector('canvas')?.parentElement;
      if (container) {
        container.style.position = 'relative';
        container.appendChild(b.fireBlobEl);
      }
    }
    // Sync screen position + size every frame (game coords → CSS pixels)
    const canvas = document.querySelector('canvas');
    if (canvas && b.fireBlobEl.parentElement) {
      const scaleX = canvas.clientWidth / W;
      const scaleY = canvas.clientHeight / H;
      const avgScale = (scaleX + scaleY) * 0.5;
      b.fireBlobEl.style.left = (b.x * scaleX) + 'px';
      b.fireBlobEl.style.top = (b.y * scaleY) + 'px';
      // Fire blob native size is 100px; scale to ~2.6× boss radius so the
      // organic edges extend beyond the collision circle for visual heft.
      const cssSize = b.radius * 2.6 * avgScale;
      const scaleFactor = cssSize / 100;
      b.fireBlobEl.style.transform = `translate(-50%, -50%) scale(${scaleFactor.toFixed(3)})`;
      // Hit flash: toggle the brightness-boost class
      if (b.hitFlash > 0) {
        b.fireBlobEl.classList.add('b4fire-hit');
      } else {
        b.fireBlobEl.classList.remove('b4fire-hit');
      }
    }
  } else if (b.fireBlobEl) {
    // Leaving P1 (phase transition / death) — drop the DOM
    b.fireBlobEl.remove();
    b.fireBlobEl = null;
  }

  // ---- Determine target ----
  const isCharmed = b.faction === 'ally';
  let T = P.hidden ? null : P;
  if (isCharmed) {
    const ct = getCharmedTarget(b, enemies, otherBoss);
    T = ct.target || (P.hidden ? null : P);
  } else if (P.hidden) {
    const allyBoss = findOtherBoss(otherBoss, (ob) => ob.faction === 'ally');
    if (allyBoss) T = allyBoss;
    else if (enemies) {
      for (const e of enemies) { if (e.faction === 'ally') { T = e; break; } }
    }
  }
  const hasRealTarget = !!T;
  if (T) b.lastTargetPos = { x: T.x, y: T.y };
  if (!T) T = b.lastTargetPos || { x: b.x, y: b.y };

  // High-speed glitch particles
  if (!b.dashing && hasRealTarget && b.atkTimer % 2 === 0) {
    const spd = Math.hypot(b.vx || 0, b.vy || 0) + b.speed;
    if (spd > 0.8) {
       particles.spawn(b.x + rand(-20,20), b.y + rand(-20,20), isCharmed ? '#cc44ff' : '#00ffff', 4, 3, 15, 2);
    }
  }

  // ---- Threat table ----
  if (!isCharmed) {
    if (!b.threatTable) b.threatTable = { player: 0, timer: 0, target: null, otherBoss: 0 };
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
      const allyBoss = findOtherBoss(otherBoss, (ob) => ob.faction === 'ally');
      if (allyBoss) {
        const threat = b.threatTable.otherBoss || 0;
        if (threat > maxThreat) { maxThreat = threat; maxTarget = allyBoss; }
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

  // ---- Phase transitions ----
  if (b.hp < b.maxHp * 0.6 && b.phase === 1) {
    b.phase = 2;
    b.speed = B4.PHASE2.SPEED;
    b.phaseStagger = 150; // 2.5s stagger
    b.sliceActive = false; b.dashing = false; b.beaming = false;
    // Phase 2 transition: shockwave
    b.shockwaveActive = true;
    b.shockwaveRadius = 0;
    addHeat(b, B4.OVERHEAT.HEAT_SHOCKWAVE);
    gameState.screenShake = 25;
    particles.spawn(b.x, b.y, '#ff00ff', 50, 10, 50, 8);
    particles.spawn(b.x, b.y, '#00ffff', 50, 10, 50, 8);
    particles.spawn(b.x, b.y, '#ffffff', 30, 6, 30, 5);
    gameState.showWaveText('⚠ HARDWARE MELTDOWN ⚠');
    updateMatrixPhase(2);
  }
  if (b.hp < b.maxHp * 0.25 && b.phase === 2) {
    b.phase = 3;
    b.speed = B4.PHASE3.SPEED;
    b.phaseStagger = 150; // 2.5s stagger
    b.sliceActive = false; b.dashing = false; b.beaming = false;
    gameState.screenShake = 30;
    particles.spawn(b.x, b.y, '#ff0066', 60, 12, 60, 10);
    particles.spawn(b.x, b.y, '#00ffff', 60, 12, 60, 10);
    particles.spawn(b.x, b.y, '#ffffff', 30, 8, 35, 6);
    gameState.showWaveText('⚠ TERMINAL FURY ⚠');
    updateMatrixPhase(3);
  }

  // Phase transition stagger — boss is stunned, free damage window
  if (b.phaseStagger > 0) {
    b.phaseStagger--;
    if (b.phaseStagger % 6 < 3) b.hitFlash = 2;
    if (b.phaseStagger % 8 === 0) {
      const sa = rand(0, Math.PI * 2);
      const sd = rand(0, b.radius * 1.5);
      particles.spawn(b.x + Math.cos(sa)*sd, b.y + Math.sin(sa)*sd,
        ['#00ffff', '#ff00ff', '#ff0066', '#ffffff'][Math.floor(Math.random()*4)],
        5, 4, 18, 3);
    }
    // Still process shockwave during stagger
    if (b.shockwaveActive) {
      b.shockwaveRadius += 8;
      const swMax = B4.PHASE2.SHOCKWAVE_RADIUS;
      if (!P.hidden && !P.invincible) {
        const pd = dist(b, P);
        if (Math.abs(pd - b.shockwaveRadius) < 30) {
          const pa = ang(b, P);
          P.x += Math.cos(pa) * B4.PHASE2.SHOCKWAVE_KNOCKBACK;
          P.y += Math.sin(pa) * B4.PHASE2.SHOCKWAVE_KNOCKBACK;
        }
      }
      if (b.shockwaveRadius >= swMax) b.shockwaveActive = false;
    }
    return false; // skip all combat logic during stagger
  }

  // ---- Shockwave (phase 2 transition) ----
  if (b.shockwaveActive) {
    b.shockwaveRadius += 8;
    const swMax = B4.PHASE2.SHOCKWAVE_RADIUS;
    // Push player away
    if (!P.hidden && !P.invincible) {
      const pd = dist(b, P);
      if (Math.abs(pd - b.shockwaveRadius) < 30) {
        const pa = ang(b, P);
        P.x += Math.cos(pa) * B4.PHASE2.SHOCKWAVE_KNOCKBACK;
        P.y += Math.sin(pa) * B4.PHASE2.SHOCKWAVE_KNOCKBACK;
      }
    }
    // Shockwave damages enemies and otherBoss
    if (enemies) {
      for (const e of enemies) {
        const ed = dist(b, e);
        if (Math.abs(ed - b.shockwaveRadius) < 30) {
          const shouldDmg = isCharmed ? (e.faction === 'enemy') : (e.faction === 'ally');
          if (shouldDmg) {
            e.hp -= B4.PHASE2.STRIKE_DAMAGE * 0.5;
            e.hitFlash = 6;
          }
        }
      }
    }
    forEachOtherBoss(otherBoss, (ob) => {
      const od = dist(b, ob);
      if (Math.abs(od - b.shockwaveRadius) >= 30) return;
      const shouldDmg = isCharmed ? (ob.faction === 'enemy') : (ob.faction === 'ally');
      if (!shouldDmg) return;
      ob.hp -= B4.PHASE2.STRIKE_DAMAGE;
      ob.hitFlash = 6;
      const ka = ang(b, ob);
      ob.vx = (ob.vx||0) + Math.cos(ka) * B4.PHASE2.SHOCKWAVE_KNOCKBACK;
      ob.vy = (ob.vy||0) + Math.sin(ka) * B4.PHASE2.SHOCKWAVE_KNOCKBACK;
    });
    if (b.shockwaveRadius >= swMax) b.shockwaveActive = false;
  }

  // ==================== GLITCH CORES MECHANIC ====================
  const GC = B4.GLITCH_CORE;

  // Core stun state — boss is paralyzed, free damage window
  if (b.coreStunned > 0) {
    b.coreStunned--;
    if (b.coreStunned % 6 < 3) b.hitFlash = 2;
    // Spawn flashy particles during stun
    if (b.coreStunned % 4 === 0) {
      const sa = rand(0, Math.PI * 2);
      const sd = rand(0, b.radius * 2);
      particles.spawn(b.x + Math.cos(sa)*sd, b.y + Math.sin(sa)*sd,
        ['#ff0066', '#ffcc00', '#00ffff'][Math.floor(Math.random()*3)],
        5, 4, 18, 3);
    }
    // Skip all combat during stun — boss just takes damage
    // (Don't return false; let movement, hitFlash, drawing etc still happen)
    // But skip core spawning logic
  }

  // Glitch Core channeling update
  if (b.coreChanneling) {
    b.coreChannelTimer--;

    // Update core hitFlash
    b.glitchCores.forEach(c => { if (c.hitFlash > 0) c.hitFlash--; });

    // Remove dead cores
    b.glitchCores = b.glitchCores.filter(c => c.hp > 0);

    // Check: all cores destroyed? → BACKLASH!
    if (b.glitchCores.length === 0) {
      b.coreChanneling = false;
      // DATA BACKLASH — Boss takes massive damage + stun
      b.hp -= GC.BACKLASH_DAMAGE;
      b.coreStunned = GC.STUN_DURATION;
      b.hitFlash = 30;
      // Cancel all active attacks
      b.sliceActive = false; b.dashing = false; b.beaming = false;
      gameState.screenShake = 30;
      gameState.hitStop = 8;
      gameState.showWaveText('⚡ 数据反噬！BOSS 瘫痪！');
      // Epic particles
      particles.spawn(b.x, b.y, '#ff0066', 60, 12, 50, 8);
      particles.spawn(b.x, b.y, '#ffcc00', 50, 10, 45, 7);
      particles.spawn(b.x, b.y, '#00ffff', 40, 8, 40, 6);
    }

    // Timeout: player failed → TRIGGER TIME STOP CUTSCENE
    if (b.coreChannelTimer <= 0 && b.coreChanneling) {
      b.coreChanneling = false;
      b.glitchCores = [];
      
      gameState.showWaveText('💀 正在格式化...');
      // Trigger the game-pausing cutscene in GameScene
      // GameScene will handle the 200 damage when the cutscene ends
      gameState.fatalErrorCutscene = {
        timer: 0,
        duration: 300 // 5 seconds at 60fps
      };
    }
  }

  // Glitch Core spawn timer (only in phase 2+ and when not already channeling / stunned)
  if ((b.phase === 2 || b.phase === 3) && !b.coreChanneling && b.coreStunned <= 0 && !isCharmed) {
    b.coreSpawnTimer++;
    const interval = b.phase === 3 ? GC.SPAWN_INTERVAL_P3 : GC.SPAWN_INTERVAL_P2;
    if (b.coreSpawnTimer >= interval) {
      b.coreSpawnTimer = 0;
      b.coreChanneling = true;
      b.coreChannelTimer = GC.CHANNEL_DURATION;
      const count = b.phase === 3 ? GC.CORE_COUNT_P3 : GC.CORE_COUNT_P2;
      // Spawn cores at spread positions around arena
      const margin = 80;
      const positions = [
        { x: margin + rand(0, 60), y: margin + rand(0, 60) },
        { x: W - margin - rand(0, 60), y: margin + rand(0, 60) },
        { x: margin + rand(0, 60), y: H - margin - rand(0, 60) },
        { x: W - margin - rand(0, 60), y: H - margin - rand(0, 60) },
        { x: W / 2 + rand(-80, 80), y: margin + rand(0, 40) },
        { x: W / 2 + rand(-80, 80), y: H - margin - rand(0, 40) },
      ];
      // Shuffle and pick `count`
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      for (let i = 0; i < count && i < positions.length; i++) {
        b.glitchCores.push({
          x: positions[i].x,
          y: positions[i].y,
          hp: GC.CORE_HP,
          maxHp: GC.CORE_HP,
          radius: GC.CORE_RADIUS,
          hitFlash: 0,
        });
      }
      gameState.screenShake = 15;
      gameState.showWaveText('⚠ 故障核心出现！击破它们！');
      // Spawn warning particles at core positions
      b.glitchCores.forEach(c => {
        particles.spawn(c.x, c.y, '#ff0066', 20, 6, 30, 5);
        particles.spawn(c.x, c.y, '#00ffff', 15, 4, 25, 4);
      });
    }
  }

  // ---- Movement ----
  if (!b.dashing && !b.beaming && hasRealTarget) {
    // Overheating: near-frozen tremble. Venting: fully stationary (slumped).
    const moveScale = b.overheatState === 'venting' ? 0
                    : b.overheatState === 'overheating' ? 0.15
                    : 1;
    const a = ang(b, T);
    b.x += Math.cos(a) * b.speed * moveScale + (b.vx || 0);
    b.y += Math.sin(a) * b.speed * (isCharmed ? 1 : 0.3) * moveScale + (b.vy || 0);
    b.vx = (b.vx || 0) * 0.92;
    b.vy = (b.vy || 0) * 0.92;
    b.x = lerp(b.x, clamp(b.x, 80, W - 80), 0.08);
    b.y = lerp(b.y, clamp(b.y, 60, isCharmed ? H - 60 : H * 0.65), 0.08);
  }

  // ====== Overheat state machine tick — accumulates heat, manages vent ======
  tickOverheat(b, gameState, particles);

  // ====== Skip all attacks when stunned by backlash OR venting heat ======
  if (b.coreStunned <= 0 && b.overheatState !== 'venting' && b.overheatState !== 'overheating') {

  // ==================== PHASE 1: Firewall ====================
  if (b.phase === 1) {
    const p1 = B4.PHASE1;

    // Matrix bullet pattern
    if (b.atkTimer % p1.MATRIX_INTERVAL === 0) {
      const gapCol1 = randInt(0, p1.MATRIX_COLS - p1.MATRIX_GAP_SIZE);
      for (let row = 0; row < p1.MATRIX_ROWS; row++) {
        for (let col = 0; col < p1.MATRIX_COLS; col++) {
          if (col >= gapCol1 && col < gapCol1 + p1.MATRIX_GAP_SIZE) continue; // gap
          const bx = (W / (p1.MATRIX_COLS + 1)) * (col + 1);
          const rowDelay = row * 8;
          const bul = {
            x: bx, y: b.y - 20 - row * 25,
            vx: 0, vy: p1.MATRIX_BULLET_SPEED + row * 0.1,
            life: p1.MATRIX_BULLET_LIFETIME + rowDelay,
            dmg: p1.MATRIX_BULLET_DAMAGE,
            r: 3,
            color: (row + col) % 2 === 0 ? '#00ffff' : '#ff00ff',
          };
          if (isCharmed) bul.friendly = true;
          eBullets.push(bul);
        }
      }
      gameState.screenShake = 3;
    }

    // Data Slice laser — random angle cross, random 4-8s interval
    b.sliceTimer--;
    if (hasRealTarget && !b.sliceActive && b.sliceTimer <= 0) {
      b.sliceTimer = randInt(240, 480); // next fire in 4-8s
      b.sliceActive = true;
      b.sliceWarn = p1.SLICE_WARN_DURATION;
      b.sliceDuration = p1.SLICE_DURATION;
      b.sliceCX = T.x; // center X
      b.sliceCY = T.y; // center Y
      b.sliceAngle = Math.random() * Math.PI; // random angle [0, PI)
      b.sliceIsCharmed = isCharmed;
      addHeat(b, B4.OVERHEAT.HEAT_SLICE);
    }
    if (b.sliceActive) {
      if (b.sliceWarn > 0) {
        b.sliceWarn--;
      } else {
        b.sliceDuration--;
        // Damage check — two beams at sliceAngle and sliceAngle+PI/2
        const thick = p1.SLICE_THICKNESS / 2;
        const _hitBeam = (ex, ey, er) => {
          // Check distance from point (ex,ey) to each of the two beams
          for (let bi = 0; bi < 2; bi++) {
            const a = b.sliceAngle + bi * Math.PI / 2;
            const dx = Math.cos(a), dy = Math.sin(a);
            // Distance from point to infinite line through (sliceCX,sliceCY) with direction (dx,dy)
            const rel_x = ex - b.sliceCX, rel_y = ey - b.sliceCY;
            const d = Math.abs(rel_x * dy - rel_y * dx);
            if (d < thick + er) return true;
          }
          return false;
        };
        if (b.sliceIsCharmed) {
          if (enemies) {
            for (const e of enemies) {
              if (e.faction !== 'enemy') continue;
              if (_hitBeam(e.x, e.y, e.radius)) {
                e.hp -= p1.SLICE_DAMAGE_PER_FRAME;
                e.hitFlash = 4;
              }
            }
          }
          forEachOtherBoss(otherBoss, (ob) => {
            if (ob.faction === 'ally') return;
            if (_hitBeam(ob.x, ob.y, ob.radius||30)) {
              ob.hp -= p1.SLICE_DAMAGE_PER_FRAME;
              ob.hitFlash = 4;
            }
          });
        } else {
          if (!P.hidden && !P.invincible) {
            if (_hitBeam(P.x, P.y, P.radius)) {
              gameState.dmgPlayer(p1.SLICE_DAMAGE_PER_FRAME);
            }
          }
          if (enemies) {
            for (const e of enemies) {
              if (e.faction === 'enemy') continue;
              if (_hitBeam(e.x, e.y, e.radius)) {
                e.hp -= p1.SLICE_DAMAGE_PER_FRAME;
                e.hitFlash = 4;
              }
            }
          }
          forEachOtherBoss(otherBoss, (ob) => {
            if (ob.faction !== 'ally') return;
            if (_hitBeam(ob.x, ob.y, ob.radius||30)) {
              ob.hp -= p1.SLICE_DAMAGE_PER_FRAME;
              ob.hitFlash = 4;
            }
          });
        }
        if (b.sliceDuration <= 0) b.sliceActive = false;
      }
    }

    // Ambient particles
    if (b.atkTimer % 15 === 0) {
      const pa = rand(0, Math.PI * 2);
      particles.spawn(
        b.x + Math.cos(pa) * b.radius * 1.5,
        b.y + Math.sin(pa) * b.radius * 1.5,
        '#00ffff', 2, 2, 20, 1
      );
    }
  }

  // ==================== PHASE 2: Meltdown ====================
  if (b.phase === 2) {
    const p2 = B4.PHASE2;

    // Enhanced matrix bullets
    if (b.atkTimer % p2.MATRIX_INTERVAL === 0) {
      const gapCol1 = randInt(0, p2.MATRIX_COLS - p2.MATRIX_GAP_SIZE);
      for (let row = 0; row < p2.MATRIX_ROWS; row++) {
        for (let col = 0; col < p2.MATRIX_COLS; col++) {
          if (col >= gapCol1 && col < gapCol1 + p2.MATRIX_GAP_SIZE) continue;
          const bx = (W / (p2.MATRIX_COLS + 1)) * (col + 1);
          const bul = {
            x: bx, y: b.y - 20 - row * 20,
            vx: 0, vy: p2.MATRIX_BULLET_SPEED + row * 0.15,
            life: p2.MATRIX_BULLET_LIFETIME,
            dmg: p2.MATRIX_BULLET_DAMAGE,
            r: 3,
            color: (row + col) % 2 === 0 ? '#ff00ff' : '#ff4400',
          };
          if (isCharmed) bul.friendly = true;
          eBullets.push(bul);
        }
      }
      gameState.screenShake = 4;
    }

    // Orbital Strikes
    if (hasRealTarget && b.atkTimer % p2.STRIKE_INTERVAL === 0) {
      for (let i = 0; i < p2.STRIKE_COUNT; i++) {
        b.strikes.push({
          x: T.x + rand(-150, 150),
          y: T.y + rand(-150, 150),
          warn: p2.STRIKE_WARN_DURATION,
          isCharmed,
        });
      }
      addHeat(b, B4.OVERHEAT.HEAT_STRIKE * p2.STRIKE_COUNT);
    }
    b.strikes = b.strikes.filter(s => {
      s.warn--;
      if (s.warn <= 0) {
        // BOOM
        gameState.screenShake = 8;
        particles.spawn(s.x, s.y, s.isCharmed ? '#cc44ff' : '#ff00ff', 20, 6, 30, 5);
        // Damage
        if (s.isCharmed) {
          if (enemies) {
            for (const e of enemies) {
              if (e.faction !== 'enemy') continue;
              if (dist(s, e) < p2.STRIKE_RADIUS + e.radius) {
                e.hp -= p2.STRIKE_DAMAGE;
                e.hitFlash = 8;
              }
            }
          }
          forEachOtherBoss(otherBoss, (ob) => {
            if (ob.faction === 'ally') return;
            if (dist(s, ob) < p2.STRIKE_RADIUS + (ob.radius||30)) {
              ob.hp -= p2.STRIKE_DAMAGE;
              ob.hitFlash = 8;
            }
          });
        } else {
          if (!P.hidden && !P.invincible && dist(s, P) < p2.STRIKE_RADIUS + P.radius) {
            gameState.dmgPlayer(p2.STRIKE_DAMAGE);
            gameState.screenShake = 12;
          }
          // Also damage charmed enemies
          if (enemies) {
            for (const e of enemies) {
              if (e.faction === 'enemy') continue;
              if (dist(s, e) < p2.STRIKE_RADIUS + e.radius) {
                e.hp -= p2.STRIKE_DAMAGE;
                e.hitFlash = 8;
              }
            }
          }
          forEachOtherBoss(otherBoss, (ob) => {
            if (ob.faction !== 'ally') return;
            if (dist(s, ob) < p2.STRIKE_RADIUS + (ob.radius||30)) {
              ob.hp -= p2.STRIKE_DAMAGE;
              ob.hitFlash = 8;
            }
          });
        }
        // Leave fire zone
        b.fires.push({
          x: s.x, y: s.y, life: p2.STRIKE_FIRE_LIFETIME,
          isCharmed: s.isCharmed,
        });
        return false;
      }
      return true;
    });

    // Fire zones damage
    b.fires = b.fires.filter(f => {
      f.life--;
      if (f.isCharmed) {
        if (enemies) {
          for (const e of enemies) {
            if (e.faction !== 'enemy') continue;
            if (dist(f, e) < B4.PHASE2.STRIKE_RADIUS + e.radius) {
              e.hp -= p2.STRIKE_FIRE_DAMAGE;
            }
          }
        }
        forEachOtherBoss(otherBoss, (ob) => {
          if (ob.faction === 'ally') return;
          if (dist(f, ob) < B4.PHASE2.STRIKE_RADIUS + (ob.radius||30)) {
            ob.hp -= p2.STRIKE_FIRE_DAMAGE;
          }
        });
      } else {
        if (!P.hidden && !P.invincible && dist(f, P) < B4.PHASE2.STRIKE_RADIUS + P.radius) {
          gameState.dmgPlayer(p2.STRIKE_FIRE_DAMAGE);
        }
        // Also damage charmed enemies
        if (enemies) {
          for (const e of enemies) {
            if (e.faction === 'enemy') continue;
            if (dist(f, e) < B4.PHASE2.STRIKE_RADIUS + e.radius) {
              e.hp -= p2.STRIKE_FIRE_DAMAGE;
            }
          }
        }
        forEachOtherBoss(otherBoss, (ob) => {
          if (ob.faction !== 'ally') return;
          if (dist(f, ob) < B4.PHASE2.STRIKE_RADIUS + (ob.radius||30)) {
            ob.hp -= p2.STRIKE_FIRE_DAMAGE;
          }
        });
      }
      if (f.life <= 0) {
        if (!b.burnMarks) b.burnMarks = [];
        b.burnMarks.push({ x: f.x, y: f.y, r: B4.PHASE2.STRIKE_RADIUS, alpha: 0.8 });
      }
      return f.life > 0;
    });

    // Holographic Dash
    if (hasRealTarget && !b.dashing && b.atkTimer % p2.DASH_INTERVAL === 0) {
      b.dashing = true;
      b.dashCount = p2.DASH_COUNT;
      b.dashWarn = p2.DASH_WARN_DURATION;
      b.dashTarget = { x: T.x, y: T.y };
      b.dashIsCharmed = isCharmed;
      addHeat(b, B4.OVERHEAT.HEAT_DASH);
    }

    // Ambient particles (more intense)
    if (b.atkTimer % 8 === 0) {
      const pa = rand(0, Math.PI * 2);
      particles.spawn(
        b.x + Math.cos(pa) * b.radius * 2,
        b.y + Math.sin(pa) * b.radius * 2,
        b.atkTimer % 16 < 8 ? '#ff00ff' : '#ff4400', 3, 3, 20, 2
      );
    }
  }

  // ==================== PHASE 3: Terminal Fury ====================
  if (b.phase === 3) {
    const p3 = B4.PHASE3;

    // Death beam — dual rotating
    if (!b.beaming && hasRealTarget && b.atkTimer % p3.BEAM_INTERVAL === 0) {
      b.beaming = true;
      b.beamAngle = ang(b, T);
      b.beamSweep = 0;
      b.beamDuration = p3.BEAM_DURATION;
      b.beamIsCharmed = isCharmed;
      addHeat(b, B4.OVERHEAT.HEAT_BEAM);
    }
    if (b.beaming) {
      b.beamSweep += p3.BEAM_SWEEP_SPEED;
      b.beamDuration--;
      // Two beams: opposite directions
      for (let beam = 0; beam < 2; beam++) {
        const ba = b.beamAngle + b.beamSweep + beam * Math.PI;
        if (b.beamIsCharmed) {
          if (enemies) {
            for (const e of enemies) {
              if (e.faction !== 'enemy') continue;
              const eAngle = ang(b, e);
              const diff = Math.abs(((eAngle - ba) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
              if (diff < p3.BEAM_HIT_ANGLE && dist(b, e) < p3.BEAM_HIT_RANGE) {
                e.hp -= p3.BEAM_DAMAGE_PER_FRAME * 2;
                e.hitFlash = 4;
              }
            }
          }
          forEachOtherBoss(otherBoss, (ob) => {
            if (ob.faction === 'ally') return;
            const dx = Math.cos(ba), dy = Math.sin(ba);
            const rx = ob.x - b.x, ry = ob.y - b.y;
            const cross = Math.abs(rx * dy - ry * dx);
            const dot = rx * dx + ry * dy;
            if (cross < 20 + (ob.radius || 30) && dot > 0 && dot < p3.BEAM_HIT_RANGE) {
              ob.hp -= p3.BEAM_DAMAGE_PER_FRAME * 2;
              ob.hitFlash = 4;
            }
          });
        } else {
          if (!P.hidden && !P.invincible) {
            const pAngle = ang(b, P);
            const diff = Math.abs(((pAngle - ba) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            if (diff < p3.BEAM_HIT_ANGLE && dist(b, P) < p3.BEAM_HIT_RANGE) {
              gameState.dmgPlayer(p3.BEAM_DAMAGE_PER_FRAME);
            }
          }
          // Also damage charmed enemies
          if (enemies) {
            for (const e of enemies) {
              if (e.faction === 'enemy') continue;
              const eAngle = ang(b, e);
              const diff = Math.abs(((eAngle - ba) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
              if (diff < p3.BEAM_HIT_ANGLE && dist(b, e) < p3.BEAM_HIT_RANGE) {
                e.hp -= p3.BEAM_DAMAGE_PER_FRAME * 2;
                e.hitFlash = 4;
              }
            }
          }
          forEachOtherBoss(otherBoss, (ob) => {
            if (ob.faction !== 'ally') return;
            const dx = Math.cos(ba), dy = Math.sin(ba);
            const rx = ob.x - b.x, ry = ob.y - b.y;
            const cross = Math.abs(rx * dy - ry * dx);
            const dot = rx * dx + ry * dy;
            if (cross < 20 + (ob.radius || 30) && dot > 0 && dot < p3.BEAM_HIT_RANGE) {
              ob.hp -= p3.BEAM_DAMAGE_PER_FRAME * 2;
              ob.hitFlash = 4;
            }
          });
        }
      }
      if (b.beamDuration <= 0) b.beaming = false;
    }

    // Glitch bombs
    if (b.atkTimer % p3.BOMB_INTERVAL === 0) {
      const ba = rand(0, Math.PI * 2);
      b.bombs.push({
        x: b.x, y: b.y,
        vx: Math.cos(ba) * p3.BOMB_SPEED,
        vy: Math.sin(ba) * p3.BOMB_SPEED,
        life: p3.BOMB_LIFETIME,
        isCharmed,
      });
    }
    b.bombs = b.bombs.filter(bomb => {
      bomb.x += bomb.vx;
      bomb.y += bomb.vy;
      bomb.life--;
      if (bomb.life <= 0) {
        addHeat(b, B4.OVERHEAT.HEAT_BOMB_EXPLODE);
        // Explode into ring
        for (let i = 0; i < p3.BOMB_RING_COUNT; i++) {
          const a = (Math.PI * 2 / p3.BOMB_RING_COUNT) * i;
          const bul = {
            x: bomb.x, y: bomb.y,
            vx: Math.cos(a) * p3.BOMB_RING_SPEED,
            vy: Math.sin(a) * p3.BOMB_RING_SPEED,
            life: p3.BOMB_RING_LIFETIME,
            dmg: p3.BOMB_RING_DAMAGE,
            r: 4,
            color: '#ff0066',
          };
          if (bomb.isCharmed) bul.friendly = true;
          eBullets.push(bul);
        }
        particles.spawn(bomb.x, bomb.y, '#ff0066', 12, 5, 20, 3);
        gameState.screenShake = 5;
        return false;
      }
      return true;
    });

    // Ghost summon
    if (b.atkTimer % p3.GHOST_INTERVAL === 0 && b.ghosts.length < p3.GHOST_MAX) {
      const gAngle = rand(0, Math.PI * 2);
      const gDist = b.radius + 60;
      const ghost = {
        x: b.x + Math.cos(gAngle) * gDist,
        y: b.y + Math.sin(gAngle) * gDist,
        hp: p3.GHOST_HP,
        maxHp: p3.GHOST_HP,
        radius: p3.GHOST_RADIUS,
        speed: p3.GHOST_SPEED,
        damage: p3.GHOST_DAMAGE,
        isCharmed: isCharmed,
        wobble: rand(0, Math.PI * 2),
        el: createGhostDOM(),
        hitFlash: 0,
        dying: false,
      };
      // Append to game container
      const container = document.querySelector('canvas')?.parentElement;
      if (container) {
        container.style.position = 'relative';
        container.appendChild(ghost.el);
      }
      b.ghosts.push(ghost);
      particles.spawn(ghost.x, ghost.y, '#00ffff', 15, 5, 20, 3);
      gameState.screenShake = 4;
    }

    // Update ghosts
    b.ghosts = b.ghosts.filter(ghost => {
      if (ghost.dying) {
        ghost.dyingTimer--;
        if (ghost.dyingTimer <= 0) {
          ghost.el.remove();
          return false;
        }
        return true;
      }

      ghost.wobble += 0.05;
      // Chase target
      const gTarget = ghost.isCharmed ? T : (P.hidden ? null : P);
      if (gTarget) {
        const ga = ang(ghost, gTarget);
        ghost.x += Math.cos(ga) * ghost.speed + Math.sin(ghost.wobble) * 0.5;
        ghost.y += Math.sin(ga) * ghost.speed + Math.cos(ghost.wobble) * 0.5;
      }

      // Contact damage
      if (ghost.isCharmed) {
        if (enemies) {
          for (const e of enemies) {
            if (e.faction !== 'enemy') continue;
            if (dist(ghost, e) < ghost.radius + e.radius) {
              e.hp -= ghost.damage;
              e.hitFlash = 4;
            }
          }
        }
        forEachOtherBoss(otherBoss, (ob) => {
          if (ob.faction === 'ally') return;
          if (dist(ghost, ob) < ghost.radius + (ob.radius||30)) {
            ob.hp -= ghost.damage;
            ob.hitFlash = 4;
          }
        });
      } else {
        if (!P.hidden && !P.invincible && dist(ghost, P) < ghost.radius + P.radius) {
          gameState.dmgPlayer(ghost.damage);
        }
      }

      // Update DOM position (game coords → screen coords via canvas scale)
      const canvas = document.querySelector('canvas');
      if (canvas && ghost.el.parentElement) {
        const scaleX = canvas.clientWidth / W;
        const scaleY = canvas.clientHeight / H;
        ghost.el.style.left = (ghost.x * scaleX) + 'px';
        ghost.el.style.top = (ghost.y * scaleY) + 'px';
      }

      // Update HP bar
      const hpFill = ghost.el.querySelector('.ghost-hp-fill');
      if (hpFill) hpFill.style.width = Math.max(0, (ghost.hp / ghost.maxHp) * 100) + '%';

      // Hit flash
      if (ghost.hitFlash > 0) {
        ghost.hitFlash--;
        ghost.el.style.filter = 'drop-shadow(0 0 12px #00ffff) drop-shadow(0 0 6px #ff00ff) brightness(3)';
      } else {
        ghost.el.style.filter = 'drop-shadow(0 0 12px #00ffff) drop-shadow(0 0 6px #ff00ff)';
      }

      // Death check
      if (ghost.hp <= 0) {
        ghost.dying = true;
        ghost.dyingTimer = 25;
        ghost.el.classList.add('dying');
        particles.spawn(ghost.x, ghost.y, '#00ffff', 20, 6, 25, 4);
        particles.spawn(ghost.x, ghost.y, '#ff00ff', 15, 5, 20, 3);
        return true; // keep until dying animation finishes
      }

      return true;
    });

    // Player bullets damage ghosts
    for (const ghost of b.ghosts) {
      if (ghost.dying) continue;
      for (const bul of bullets) {
        if (bul.life <= 0) continue;
        if (dist(bul, ghost) < ghost.radius + (bul.r || 4)) {
          ghost.hp -= bul.dmg || 10;
          ghost.hitFlash = 4;
          bul.life = 0;
          particles.spawn(bul.x, bul.y, '#00ffff', 4, 2, 10, 2);
        }
      }
    }

    // Intense ambient particles
    if (b.atkTimer % 4 === 0) {
      const pa = rand(0, Math.PI * 2);
      const pd = rand(0, b.radius * 2.5);
      particles.spawn(
        b.x + Math.cos(pa) * pd, b.y + Math.sin(pa) * pd,
        ['#00ffff', '#ff00ff', '#ff0066', '#ffffff'][b.atkTimer % 4],
        4, 3, 15, 2
      );
    }

    // ===== GLITCH THREADS (错乱神经束) =====
    const TH = p3;
    b.threadTimer--;

    // Start a new burst
    if (!b.threadActive && b.threadTimer <= 0 && hasRealTarget) {
      b.threadActive = true;
      b.threadBurstIndex = 0;
      b.glitchThreads = [];
      gameState.screenShake = 8;
      addHeat(b, B4.OVERHEAT.HEAT_THREAD);
    }

    // Spawn individual threads during a burst
    if (b.threadActive) {
      if (b.threadBurstIndex < TH.THREAD_BURST_COUNT && b.atkTimer % TH.THREAD_SPAWN_RATE === 0) {
        const angle = rand(0, Math.PI * 2);
        b.glitchThreads.push({
          angle: angle,
          warnTime: TH.THREAD_WARN_TIME,
          burstTime: TH.THREAD_BURST_TIME,
          hit: false,
          isCharmed: isCharmed,
        });
        b.threadBurstIndex++;
        // Spawn sound-like particle at origin
        particles.spawn(b.x, b.y, '#ff0044', 6, 3, 8, 2);
        gameState.screenShake = 3;
      }

      // Check if burst is complete (all threads spawned and finished)
      if (b.threadBurstIndex >= TH.THREAD_BURST_COUNT && b.glitchThreads.length === 0) {
        b.threadActive = false;
        b.threadTimer = TH.THREAD_INTERVAL;
      }
    }

    // Update each thread
    b.glitchThreads = b.glitchThreads.filter(t => {
      if (t.warnTime > 0) {
        t.warnTime--;
        return true;
      }
      // Burst phase — deal damage
      t.burstTime--;
      if (!t.hit) {
        t.hit = true;
        gameState.screenShake = 5;
        // Collision check along the beam
        const thick = TH.THREAD_THICKNESS / 2;
        const dx = Math.cos(t.angle), dy = Math.sin(t.angle);
        const hitBeam = (ex, ey, er) => {
          const rx = ex - b.x, ry = ey - b.y;
          const cross = Math.abs(rx * dy - ry * dx);
          const dot = rx * dx + ry * dy;
          return cross < thick + er && dot > 0 && dot < TH.THREAD_LENGTH;
        };

        if (t.isCharmed) {
          // Charmed: damage enemies
          if (enemies) {
            for (const e of enemies) {
              if (e.faction !== 'enemy') continue;
              if (hitBeam(e.x, e.y, e.radius || 12)) {
                e.hp -= TH.THREAD_DAMAGE;
                e.hitFlash = 4;
              }
            }
          }
        } else {
          // Normal: damage player
          if (!P.hidden && !P.invincible && hitBeam(P.x, P.y, P.radius)) {
            gameState.dmgPlayer(TH.THREAD_DAMAGE);
          }
          // Damage allied units
          if (enemies) {
            for (const e of enemies) {
              if (e.faction === 'enemy') continue;
              if (hitBeam(e.x, e.y, e.radius || 12)) {
                e.hp -= TH.THREAD_DAMAGE;
                e.hitFlash = 4;
              }
            }
          }
        }
      }
      return t.burstTime > 0;
    });
  }

  // ==================== CROSS-PHASE: Data Slice persists from P1 ====================
  if (b.phase >= 3) b.sliceTimer--; // Must decrement outside Phase 1 block!
  if (b.phase >= 3 && !b.sliceActive && hasRealTarget && b.sliceTimer <= 0) {
    b.sliceTimer = randInt(240, 480);
    const p1 = B4.PHASE1;
    b.sliceActive = true;
    b.sliceWarn = 35;
    b.sliceDuration = p1.SLICE_DURATION + (b.phase === 3 ? 40 : 0);
    b.sliceCX = T.x;
    b.sliceCY = T.y;
    b.sliceAngle = Math.random() * Math.PI;
    b.sliceIsCharmed = isCharmed;
  }
  // Data slice update for phase 2+
  if (b.phase >= 2 && b.sliceActive) {
    if (b.sliceWarn > 0) {
      b.sliceWarn--;
    } else {
      b.sliceDuration--;
      const thick = B4.PHASE1.SLICE_THICKNESS / 2;
      const _hitBeam2 = (ex, ey, er) => {
        for (let bi = 0; bi < 2; bi++) {
          const a = b.sliceAngle + bi * Math.PI / 2;
          const dx = Math.cos(a), dy = Math.sin(a);
          const rel_x = ex - b.sliceCX, rel_y = ey - b.sliceCY;
          const d = Math.abs(rel_x * dy - rel_y * dx);
          if (d < thick + er) return true;
        }
        return false;
      };
      if (b.sliceIsCharmed) {
        if (enemies) {
          for (const e of enemies) {
            if (e.faction !== 'enemy') continue;
            if (_hitBeam2(e.x, e.y, e.radius)) {
              e.hp -= B4.PHASE1.SLICE_DAMAGE_PER_FRAME;
              e.hitFlash = 4;
            }
          }
        }
        forEachOtherBoss(otherBoss, (ob) => {
          if (ob.faction === 'ally') return;
          if (_hitBeam2(ob.x, ob.y, ob.radius||30)) {
            ob.hp -= B4.PHASE1.SLICE_DAMAGE_PER_FRAME;
            ob.hitFlash = 4;
          }
        });
      } else {
        if (!P.hidden && !P.invincible) {
          if (_hitBeam2(P.x, P.y, P.radius)) {
            gameState.dmgPlayer(B4.PHASE1.SLICE_DAMAGE_PER_FRAME);
          }
        }
        if (enemies) {
          for (const e of enemies) {
            if (e.faction === 'enemy') continue;
            if (_hitBeam2(e.x, e.y, e.radius)) {
              e.hp -= B4.PHASE1.SLICE_DAMAGE_PER_FRAME;
              e.hitFlash = 4;
            }
          }
        }
        forEachOtherBoss(otherBoss, (ob) => {
          if (ob.faction !== 'ally') return;
          if (_hitBeam2(ob.x, ob.y, ob.radius||30)) {
            ob.hp -= B4.PHASE1.SLICE_DAMAGE_PER_FRAME;
            ob.hitFlash = 4;
          }
        });
      }
      if (b.sliceDuration <= 0) b.sliceActive = false;
    }
  }

  // ==================== CROSS-PHASE: Orbital strikes in P3 ====================
  if (b.phase === 3 && hasRealTarget && b.atkTimer % 160 === 0) {
    const p2 = B4.PHASE2;
    for (let i = 0; i < 3; i++) {
      b.strikes.push({
        x: T.x + rand(-120, 120),
        y: T.y + rand(-120, 120),
        warn: 40,
        isCharmed,
      });
    }
  }

  // ==================== TRACKING BURST (all phases) ====================
  if (hasRealTarget && b.atkTimer % 75 === 0) {
    const burstCount = b.phase === 1 ? 3 : (b.phase === 2 ? 4 : 5);
    const baseAngle = ang(b, T);
    const spread = 0.15;
    for (let i = 0; i < burstCount; i++) {
      const a = baseAngle + (i - (burstCount - 1) / 2) * spread;
      const speed = 3 + b.phase * 0.5;
      const bul = {
        x: b.x, y: b.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 120,
        dmg: 5 + b.phase * 2,
        r: 4,
        color: b.phase === 3 ? '#ff0066' : (b.phase === 2 ? '#ff00ff' : '#00ffff'),
      };
      if (isCharmed) bul.friendly = true;
      eBullets.push(bul);
    }
  }

  // ==================== DASH LOGIC (shared) ====================
  if (b.dashing) {
    if (b.dashWarn > 0) {
      b.dashWarn--;
      b.dashTarget = { x: T.x, y: T.y };
    } else {
      const p2 = B4.PHASE2;
      const a = ang(b, b.dashTarget);
      b.x += Math.cos(a) * p2.DASH_SPEED;
      b.y += Math.sin(a) * p2.DASH_SPEED;
      // Trail
      b.dashTrail.push({ x: b.x, y: b.y, life: 20, alpha: 1 });
      // Damage
      if (b.dashIsCharmed) {
        if (enemies) {
          for (const e of enemies) {
            if (e.faction !== 'enemy') continue;
            if (dist(b, e) < b.radius + e.radius + 8) {
              e.hp -= p2.DASH_DAMAGE;
              e.hitFlash = 8;
              particles.spawn(e.x, e.y, '#ff00ff', 5, 3, 12, 3);
            }
          }
        }
        forEachOtherBoss(otherBoss, (ob) => {
          if (ob.faction === 'ally') return;
          if (dist(b, ob) < b.radius + (ob.radius||30) + 8) {
            ob.hp -= p2.DASH_DAMAGE;
            ob.hitFlash = 8;
            particles.spawn(ob.x, ob.y, '#ff00ff', 5, 3, 12, 3);
          }
        });
      } else {
        if (!P.hidden && !P.invincible && dist(b, P) < b.radius + P.radius + 10) {
          gameState.dmgPlayer(p2.DASH_DAMAGE);
          gameState.screenShake = 8;
        }
        // Also damage charmed enemies
        if (enemies) {
          for (const e of enemies) {
            if (e.faction === 'enemy') continue;
            if (dist(b, e) < b.radius + e.radius + 8) {
              e.hp -= p2.DASH_DAMAGE;
              e.hitFlash = 8;
              particles.spawn(e.x, e.y, '#ff00ff', 5, 3, 12, 3);
            }
          }
        }
        forEachOtherBoss(otherBoss, (ob) => {
          if (ob.faction !== 'ally') return;
          if (dist(b, ob) < b.radius + (ob.radius||30) + 8) {
            ob.hp -= p2.DASH_DAMAGE;
            ob.hitFlash = 8;
            particles.spawn(ob.x, ob.y, '#ff00ff', 5, 3, 12, 3);
          }
        });
      }
      if (dist(b, b.dashTarget) < 30) {
        b.dashCount--;
        if (b.dashCount > 0) {
          b.dashWarn = B4.PHASE2.DASH_GAP;
          b.dashTarget = { x: T.x, y: T.y };
        } else {
          b.dashing = false;
          particles.spawn(b.x, b.y, '#ff00ff', 15, 5, 20, 4);
          gameState.screenShake = 6;
        }
      }
    }
  }
  b.dashTrail = b.dashTrail.filter(t => { t.life--; t.alpha *= 0.9; return t.life > 0; });

  } // END of if (b.coreStunned <= 0) — attacks skipped during stun

  // ==================== BULLET VS GLITCH CORES ====================
  if (b.glitchCores.length > 0) {
    bullets.forEach(bul => {
      if (bul.life <= 0) return;
      for (const core of b.glitchCores) {
        if (core.hp <= 0) continue;
        if (dist(bul, core) < core.radius + (bul.r || 3)) {
          core.hp -= bul.dmg;
          core.hitFlash = 6;
          bul.life = 0;
          particles.spawn(bul.x, bul.y, '#ff0066', 6, 3, 12, 3);
          particles.spawn(bul.x, bul.y, '#00ffff', 4, 2, 10, 2);
          if (core.hp <= 0) {
            // Core destroyed — big explosion
            particles.spawn(core.x, core.y, '#ff0066', 25, 8, 35, 6);
            particles.spawn(core.x, core.y, '#ffcc00', 20, 6, 30, 5);
            particles.spawn(core.x, core.y, '#00ffff', 15, 5, 25, 4);
            gameState.screenShake = 10;
          }
          return;
        }
      }
    });
  }

  // ==================== BULLET VS BOSS ====================
  // Stack core backlash stun multiplier with vent multiplier — both are
  // player-earned punish windows and should synergize rather than override.
  const OH = B4.OVERHEAT;
  const stunMul = b.coreStunned > 0 ? GC.DAMAGE_MULTIPLIER : 1;
  const ventMul = (OH && b.overheatState === 'venting') ? OH.VENT_DMG_MULTIPLIER : 1;
  const dmgMultiplier = stunMul * ventMul;
  const hitColor = b.overheatState === 'venting' ? '#ffcc00'
                 : b.coreStunned > 0 ? '#ffcc00' : '#00ffff';
  bullets.forEach(bul => {
    if (bul.life <= 0) return;
    if (dist(bul, b) < b.radius) {
      b.hp -= bul.dmg * dmgMultiplier;
      b.hitFlash = 6;
      bul.life = 0;
      particles.spawn(bul.x, bul.y, hitColor, 3, 2, 10, 2);
      if (b.threatTable) b.threatTable.player += bul.dmg;
      // Knockback
      const ka = ang(bul, b);
      b.vx = (b.vx || 0) + Math.cos(ka) * 0.5;
      b.vy = (b.vy || 0) + Math.sin(ka) * 0.5;
    }
  });

  // Contact damage
  if (!isCharmed && !P.hidden && !P.invincible && dist(b, P) < b.radius + P.radius) {
    gameState.dmgPlayer(B4.CONTACT_DAMAGE);
    const pa = ang(b, P);
    P.x += Math.cos(pa) * B4.CONTACT_KNOCKBACK;
    P.y += Math.sin(pa) * B4.CONTACT_KNOCKBACK;
    gameState.screenShake = 8;
  }
  // Contact damage to otherBoss(es)
  forEachOtherBoss(otherBoss, (ob) => {
    if (dist(b, ob) >= b.radius + (ob.radius||30)) return;
    const shouldHit = (isCharmed && ob.faction === 'enemy')
                   || (!isCharmed && ob.faction === 'ally');
    if (!shouldHit) return;
    ob.hp -= B4.CONTACT_DAMAGE;
    ob.hitFlash = 6;
    const ka = ang(b, ob);
    ob.vx = (ob.vx||0) + Math.cos(ka) * 3;
    ob.vy = (ob.vy||0) + Math.sin(ka) * 3;
  });

  // Death check
  if (b.hp <= 0 && !b.dying) {
    b.dying = true;
    b.deathAnim = 0;
    gameState.screenShake = 15;
  }
}

// ===========================
//  DRAW BOSS 4 — Full Cyberpunk Overhaul
// ===========================
export function drawBoss4(g, boss, P, time) {
  const b = boss;

  // ===== OVERHEAT METER (Tier-B yellow/orange language) =====
  // Horizontal bar beneath boss showing heat buildup. Three color bands
  // signal the player how close boss is to a punish window:
  //   0-60%   cool cyan
  //   60-85%  warning yellow (slow pulse)
  //   85-100% hot red (fast pulse)
  //   100%    red/white strobe
  if (b.entered && !b.dying && CONFIG.BOSS4.OVERHEAT && b.phase >= CONFIG.BOSS4.OVERHEAT.ENABLED_FROM_PHASE) {
    const OH = CONFIG.BOSS4.OVERHEAT;
    const pct = Math.max(0, Math.min(1, (b.heat || 0) / OH.MAX_HEAT));
    const barW = 120, barH = 10;
    const barX = b.x - barW / 2;
    const barY = b.y + b.radius + 40;

    // Background panel
    g.fillStyle(0x000000, 0.65);
    g.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);

    // Fill color by band
    let fillColor = 0x00ffcc;         // cool
    let pulse = 1;
    if (b.overheatState === 'venting') {
      fillColor = 0x444444;           // exhausted grey
      pulse = 0.3;
    } else if (b.overheatState === 'overheating') {
      // Red/white strobe
      fillColor = (b.overheatTimer % 6 < 3) ? 0xffffff : 0xff2200;
      pulse = 1;
    } else if (pct >= 0.85) {
      fillColor = 0xff2200;
      pulse = 0.6 + Math.sin(time * 0.03) * 0.4;
    } else if (pct >= 0.60) {
      fillColor = 0xffcc00;
      pulse = 0.7 + Math.sin(time * 0.015) * 0.3;
    }
    g.fillStyle(fillColor, pulse);
    g.fillRect(barX, barY, barW * pct, barH);

    // Border
    g.lineStyle(1, 0xffffff, 0.5);
    g.strokeRect(barX, barY, barW, barH);

    // Tick marks at 60% and 85% thresholds
    g.lineStyle(1, 0xffffff, 0.35);
    g.beginPath();
    g.moveTo(barX + barW * 0.60, barY - 2); g.lineTo(barX + barW * 0.60, barY + barH + 2);
    g.moveTo(barX + barW * 0.85, barY - 2); g.lineTo(barX + barW * 0.85, barY + barH + 2);
    g.strokePath();
  }

  // ===== OVERHEATING PRE-VENT EFFECTS (1-second tell) =====
  // Red cracks radiating outward from boss + inner pulse ring
  if (b.overheatState === 'overheating') {
    const pulse = 0.5 + Math.sin(time * 0.04) * 0.5;
    // Outer crack ring
    g.lineStyle(4, 0xff2200, 0.8 * pulse);
    g.strokeCircle(b.x, b.y, b.radius * 1.4 + pulse * 8);
    g.lineStyle(2, 0xffffff, 0.6 * pulse);
    g.strokeCircle(b.x, b.y, b.radius * 1.4 + pulse * 8);
    // Radial fracture lines
    const numCracks = 8;
    g.lineStyle(2, 0xff4400, 0.7 * pulse);
    for (let i = 0; i < numCracks; i++) {
      const a = (Math.PI * 2 / numCracks) * i + time * 0.002;
      const r1 = b.radius * 0.9;
      const r2 = b.radius * 1.6 + Math.random() * 20;
      g.beginPath();
      g.moveTo(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1);
      g.lineTo(b.x + Math.cos(a) * r2, b.y + Math.sin(a) * r2);
      g.strokePath();
    }
  }

  // ===== VENTING PUNISH-WINDOW EFFECTS (3-second vulnerability) =====
  // Heat-dissipation panels (yellow grid shell) + pulsing golden ring signal
  // the player this is a golden DPS window. Steam particles are spawned
  // from tickOverheat() in the update loop.
  if (b.overheatState === 'venting') {
    const vp = 0.5 + Math.sin(time * 0.015) * 0.5;
    // Golden vulnerability ring (similar language to core-stun ring)
    g.lineStyle(4, 0xffcc00, vp);
    g.strokeCircle(b.x, b.y, b.radius + 30 + Math.sin(time * 0.008) * 6);
    g.lineStyle(2, 0xffffff, vp * 0.6);
    g.strokeCircle(b.x, b.y, b.radius + 40 + Math.sin(time * 0.010) * 5);
    // Heat-dissipation grid panels on each side (like radiator fins)
    g.lineStyle(2, 0xff8800, 0.6 * vp);
    const finCount = 6;
    for (let f = 0; f < finCount; f++) {
      const a = (Math.PI * 2 / finCount) * f + time * 0.0005;
      const fx1 = b.x + Math.cos(a) * (b.radius + 12);
      const fy1 = b.y + Math.sin(a) * (b.radius + 12);
      const fx2 = b.x + Math.cos(a) * (b.radius + 28);
      const fy2 = b.y + Math.sin(a) * (b.radius + 28);
      g.beginPath(); g.moveTo(fx1, fy1); g.lineTo(fx2, fy2); g.strokePath();
    }
  }

  // ===== BURN MARKS (PERMANENT SCARS) =====
  if (b.burnMarks) {
    b.burnMarks.forEach(bm => {
      g.fillStyle(0x000000, bm.alpha);
      g.fillCircle(bm.x, bm.y, bm.r);
      // Glitchy red corrupted edges
      g.lineStyle(2, 0xff0000, bm.alpha * 0.6);
      g.strokeCircle(bm.x + (Math.random()-0.5)*6, bm.y + (Math.random()-0.5)*6, bm.r);
      bm.alpha = Math.max(0.1, bm.alpha - 0.0005); // fade very slowly to a permanent scar
    });
  }

  // ===== GLITCH CORES RENDERING =====
  if (b.glitchCores && b.glitchCores.length > 0) {
    const t = time * 0.001;
    b.glitchCores.forEach((core, idx) => {
      if (core.hp <= 0) return;
      const hpPct = core.hp / core.maxHp;
      const pulse = Math.sin(t * 6 + idx * 2) * 0.3 + 0.7;

      // Outer glow ring (pulsing)
      g.lineStyle(3, 0xff0066, 0.3 * pulse);
      g.strokeCircle(core.x, core.y, core.radius + 10 + Math.sin(t * 4 + idx) * 4);

      // Core body — rotating hexagon shape
      const rot = t * 2 + idx;
      g.fillStyle(core.hitFlash > 0 ? 0xffffff : 0xff0066, 0.8);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = rot + (Math.PI * 2 / 6) * i;
        const px = core.x + Math.cos(a) * core.radius;
        const py = core.y + Math.sin(a) * core.radius;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();

      // Inner ring (cyan)
      g.lineStyle(2, 0x00ffff, 0.6 * pulse);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -rot * 1.5 + (Math.PI * 2 / 6) * i;
        const px = core.x + Math.cos(a) * (core.radius * 0.6);
        const py = core.y + Math.sin(a) * (core.radius * 0.6);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();

      // HP bar above core
      const barW = 40, barH = 5;
      g.fillStyle(0x000000, 0.6);
      g.fillRect(core.x - barW/2, core.y - core.radius - 16, barW, barH);
      g.fillStyle(hpPct > 0.5 ? 0x00ffff : (hpPct > 0.25 ? 0xffcc00 : 0xff0044), 0.9);
      g.fillRect(core.x - barW/2, core.y - core.radius - 16, barW * hpPct, barH);
    });

    // Electric arcs between cores
    if (b.glitchCores.length > 1) {
      for (let i = 0; i < b.glitchCores.length; i++) {
        const c1 = b.glitchCores[i];
        const c2 = b.glitchCores[(i + 1) % b.glitchCores.length];
        if (c1.hp <= 0 || c2.hp <= 0) continue;
        g.lineStyle(1.5, 0xff0066, 0.3 + Math.random() * 0.3);
        g.beginPath();
        g.moveTo(c1.x, c1.y);
        // Jagged arc
        const steps = 5;
        for (let s = 1; s <= steps; s++) {
          const frac = s / (steps + 1);
          const mx = c1.x + (c2.x - c1.x) * frac + (Math.random() - 0.5) * 30;
          const my = c1.y + (c2.y - c1.y) * frac + (Math.random() - 0.5) * 30;
          g.lineTo(mx, my);
        }
        g.lineTo(c2.x, c2.y);
        g.strokePath();
      }
    }
  }

  // ===== CHANNELING PROGRESS BAR (on boss) =====
  if (b.coreChanneling) {
    const GC = CONFIG.BOSS4.GLITCH_CORE;
    const pct = b.coreChannelTimer / GC.CHANNEL_DURATION;
    const barW = 80, barH = 8;
    // Background
    g.fillStyle(0x000000, 0.7);
    g.fillRect(b.x - barW/2, b.y - b.radius - 28, barW, barH);
    // Fill (red → danger)
    const fillColor = pct > 0.5 ? 0xff0066 : (pct > 0.25 ? 0xff4400 : 0xff0000);
    g.fillStyle(fillColor, 0.9);
    g.fillRect(b.x - barW/2, b.y - b.radius - 28, barW * pct, barH);
    // Border
    g.lineStyle(1, 0xffffff, 0.5);
    g.strokeRect(b.x - barW/2, b.y - b.radius - 28, barW, barH);
    // Pulsing danger ring around boss
    const dangerPulse = Math.sin(time * 0.01) * 0.3 + 0.5;
    g.lineStyle(2, 0xff0044, dangerPulse);
    g.strokeCircle(b.x, b.y, b.radius + 25 + Math.sin(time * 0.008) * 8);
  }

  // ===== STUN VULNERABLE INDICATOR =====
  if (b.coreStunned > 0) {
    const vulnPulse = Math.sin(time * 0.012) * 0.3 + 0.6;
    // Golden vulnerability ring
    g.lineStyle(3, 0xffcc00, vulnPulse);
    g.strokeCircle(b.x, b.y, b.radius + 20 + Math.sin(time * 0.006) * 5);
    g.lineStyle(1.5, 0xffffff, vulnPulse * 0.5);
    g.strokeCircle(b.x, b.y, b.radius + 28 + Math.sin(time * 0.009) * 4);
  }

  // ===== GLITCH THREADS RENDERING =====
  // Visually upgraded to feel like malevolent data transmission lines:
  //  - Warning: scrolling garbled character stream (not straight red line)
  //  - Burst: wobbly main beam + random perpendicular branch arcs + tip sparks
  if (b.glitchThreads && b.glitchThreads.length > 0) {
    const B4 = CONFIG.BOSS4;
    const threadLen = B4.PHASE3.THREAD_LENGTH;
    // Global brightness pulse so all threads pulse in sync (sonic feel)
    const threadSync = 0.75 + Math.sin(time * 0.06) * 0.25;

    for (const t of b.glitchThreads) {
      const angDx = Math.cos(t.angle), angDy = Math.sin(t.angle);
      const perpX = -angDy, perpY = angDx;
      const ex = b.x + angDx * threadLen;
      const ey = b.y + angDy * threadLen;

      if (t.warnTime > 0) {
        // === Warning: scrolling garbled character stream ===
        // Thin ghost guideline (very faint)
        g.lineStyle(1, 0xff0044, 0.25);
        g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(ex, ey); g.strokePath();

        // Scrolling glyph ticks along the thread. Use per-thread seed so
        // multiple simultaneous threads don't look synchronized.
        const seedA = Math.floor(t.angle * 17) & 0xff;
        const scrollOff = (time * 0.003 + seedA * 0.013) % 1;
        const glyphCount = 18;
        for (let gi = 0; gi < glyphCount; gi++) {
          const gt = ((gi + scrollOff) / glyphCount);
          if (gt < 0 || gt > 1) continue;
          const gx = b.x + angDx * threadLen * gt;
          const gy = b.y + angDy * threadLen * gt;
          // Slight perpendicular jitter for "unstable" feel
          const jit = Math.sin(time * 0.04 + gi * 2.1 + seedA) * 3;
          const jx = gx + perpX * jit;
          const jy = gy + perpY * jit;
          // Mini-rect glyph (2-5px wide, 1-2px tall — evokes tiny text)
          const glyphW = 2 + ((seedA + gi * 7) % 4);
          const glyphH = 1 + ((seedA + gi * 3) % 2);
          g.fillStyle(0xff0044, 0.75);
          g.fillRect(jx - glyphW / 2, jy - glyphH / 2, glyphW, glyphH);
          // Occasional brighter "byte" marker
          if ((gi + seedA) % 5 === 0) {
            g.fillStyle(0xffaaaa, 0.9);
            g.fillRect(jx - 1, jy - 1, 2, 2);
          }
        }
        // Direction-indicator at tip (small arrowhead)
        const tipAlpha = Math.min(1, (B4.PHASE3.THREAD_WARN_TIME - t.warnTime) / 8);
        g.fillStyle(0xff0044, 0.8 * tipAlpha);
        g.fillCircle(ex, ey, 3);
      } else {
        // === Burst: wobbly lethal beam with branching lightning ===
        const burstAlpha = (t.burstTime / B4.PHASE3.THREAD_BURST_TIME) * threadSync;

        // Wobbly beam path — sin-modulated perpendicular offset for "neural" feel
        const segs = 14;
        const wobbleAmp = 3.5;
        const wobblePhase = time * 0.06 + t.angle * 5;
        const pathPoints = [];
        for (let si = 0; si <= segs; si++) {
          const st = si / segs;
          const wobble = Math.sin(st * Math.PI * 5 + wobblePhase) * wobbleAmp * (st > 0.05 ? 1 : 0);
          const lx = b.x + angDx * threadLen * st + perpX * wobble;
          const ly = b.y + angDy * threadLen * st + perpY * wobble;
          pathPoints.push({ x: lx, y: ly });
        }
        const drawPath = (width, color, alpha) => {
          g.lineStyle(width, color, alpha);
          g.beginPath();
          g.moveTo(pathPoints[0].x, pathPoints[0].y);
          for (let pi = 1; pi < pathPoints.length; pi++) g.lineTo(pathPoints[pi].x, pathPoints[pi].y);
          g.strokePath();
        };
        // Outer glow
        drawPath(B4.PHASE3.THREAD_THICKNESS * 2.8, 0xff0022, 0.18 * burstAlpha);
        // Main body
        drawPath(B4.PHASE3.THREAD_THICKNESS, 0xff0044, 0.75 * burstAlpha);
        // White-hot core
        drawPath(B4.PHASE3.THREAD_THICKNESS * 0.4, 0xffffff, 0.95 * burstAlpha);

        // Branching lightning — 2-3 short side-arcs at random points along path.
        // Pure decoration, no damage — visual weight only.
        const branchCount = 2 + Math.floor(Math.random() * 2);
        for (let bi = 0; bi < branchCount; bi++) {
          const bPoint = pathPoints[3 + Math.floor(Math.random() * (pathPoints.length - 4))];
          const branchAng = t.angle + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6);
          const branchLen = 40 + Math.random() * 80;
          const bex = bPoint.x + Math.cos(branchAng) * branchLen;
          const bey = bPoint.y + Math.sin(branchAng) * branchLen;
          // Jagged 2-segment arc
          const midX = bPoint.x + (bex - bPoint.x) * 0.6 + (Math.random() - 0.5) * 15;
          const midY = bPoint.y + (bey - bPoint.y) * 0.6 + (Math.random() - 0.5) * 15;
          g.lineStyle(2, 0xff2266, 0.6 * burstAlpha);
          g.beginPath();
          g.moveTo(bPoint.x, bPoint.y);
          g.lineTo(midX, midY);
          g.lineTo(bex, bey);
          g.strokePath();
          // Dim white core on branch
          g.lineStyle(0.8, 0xffffff, 0.7 * burstAlpha);
          g.beginPath();
          g.moveTo(bPoint.x, bPoint.y);
          g.lineTo(midX, midY);
          g.lineTo(bex, bey);
          g.strokePath();
        }

        // Beam-tip impact sparks — red shrapnel at the end
        if (t.burstTime > 3) {
          g.fillStyle(0xff0044, 0.85 * burstAlpha);
          g.fillCircle(ex, ey, 5);
          g.fillStyle(0xffffff, 0.9 * burstAlpha);
          g.fillCircle(ex, ey, 2.5);
          // Scattered micro-sparks
          for (let sp = 0; sp < 4; sp++) {
            const spa = t.angle + (Math.random() - 0.5) * 2.2;
            const spd = 6 + Math.random() * 18;
            g.fillStyle(0xff2266, 0.8 * burstAlpha);
            g.fillCircle(ex + Math.cos(spa) * spd, ey + Math.sin(spa) * spd, 1.2);
          }
        }
      }
    }
  }

  // ===== PUNISHMENT SHOCKWAVE =====
  if (b.punishmentWave) {
    const pw = b.punishmentWave;
    pw.radius += 12;
    pw.alpha = 1 - (pw.radius / pw.maxRadius);
    if (pw.alpha > 0) {
      // Multiple expanding rings
      for (let i = 0; i < 3; i++) {
        const r = pw.radius - i * 30;
        if (r > 0) {
          g.lineStyle(4 - i, 0xff0044, pw.alpha * (1 - i * 0.3));
          g.strokeCircle(b.x, b.y, r);
        }
      }
      // Inner fill flash
      if (pw.radius < 200) {
        g.fillStyle(0xff0022, pw.alpha * 0.3);
        g.fillCircle(b.x, b.y, pw.radius);
      }
    } else {
      b.punishmentWave = null;
    }
  }

  // ===== CYBER GRID FLOOR (Chromatic Aberration) =====
  if (b.entered && !b.dying) {
    const gridAlpha = b.phase === 3 ? 0.25 : (b.phase === 2 ? 0.15 : 0.08);
    if (b.faction !== 'ally') {
      const gridSpacing = 60;
      const gridOffset = (time * 0.3) % gridSpacing;
      // Draw grid twice for chromatic aberration: Cyan and Magenta slightly offset
      const offsets = [
        { c: 0x00ffff, ox: -2, oy: 0 },
        { c: 0xff00ff, ox: 2, oy: 0 }
      ];
      offsets.forEach(off => {
        g.lineStyle(2, off.c, gridAlpha);
        for (let y = gridOffset; y < 1200; y += gridSpacing) {
          g.beginPath(); g.moveTo(off.ox, y + off.oy); g.lineTo(2000 + off.ox, y + off.oy); g.strokePath();
        }
        for (let x = gridOffset; x < 2000; x += gridSpacing) {
          g.beginPath(); g.moveTo(x + off.ox, off.oy); g.lineTo(x + off.ox, 1200 + off.oy); g.strokePath();
        }
      });
    }
  }

  // ===== ORGANIC GLITCH RIBBON TRAIL =====
  if (b.entered && b.afterImages && b.afterImages.length > 1) {
    const isC = b.faction === 'ally';
    const baseC = b.phase === 3 ? 0xff0066 : (b.phase === 2 ? 0xff00ff : (isC ? 0xcc44ff : 0x00ffff));
    
    // Draw thick continuous energy ribbon
    g.beginPath();
    g.moveTo(b.afterImages[0].x, b.afterImages[0].y);
    b.afterImages.forEach((ai, i) => {
      if (i > 0) g.lineTo(ai.x, ai.y);
    });
    g.lineStyle(16, baseC, 0.15); g.strokePath();
    g.lineStyle(6, baseC, 0.4); g.strokePath();
    g.lineStyle(2, 0xffffff, 0.6); g.strokePath();

    // Glitch data sparks along the trail
    b.afterImages.forEach((ai, i) => {
      if (i % 4 === 0 && Math.random() > 0.3) {
        g.fillStyle(Math.random() > 0.5 ? 0x00ffff : 0xff00ff, ai.alpha * 0.8);
        g.fillRect(ai.x + (Math.random()-0.5)*50, ai.y + (Math.random()-0.5)*50, Math.random()*20 + 5, 2 + Math.random()*3);
      }
    });
  }

  if (b.dying) { drawDeathSequence(g, b, time); return; }

  g.save();
  g.translateCanvas(b.x, b.y);

  // ===== ENTRANCE DRAW (EXTREME) =====
  if (!b.entered) {
    const ep = b.entranceTimer / CONFIG.BOSS4.ENTRANCE_DURATION;
    const dp = Math.pow(ep, 2); // easing
    const pulseR = b.radius * (0.3 + dp * 0.7);

    // Matrix glitch descent (frames 10 to 90)
    if (b.entranceTimer > 10 && b.entranceTimer < 90) {
       for (let i = 0; i < 15; i++) {
         const bx = b.x + (Math.random() - 0.5) * 400;
         const by = -100 + Math.random() * b.y * 1.5;
         g.fillStyle(Math.random() > 0.5 ? 0x00ffff : 0xff00ff, 0.4);
         g.fillRect(bx, by, 6 + Math.random() * 10, 40 + Math.random() * 100);
       }
    }

    // Vertical tear (frames 55-110)
    if (b.entranceTimer > 55 && b.entranceTimer < 110) {
      g.restore();
      const sp = Math.min(1, (b.entranceTimer - 55) / 25);
      const spOut = Math.max(0, 1 - (b.entranceTimer - 85) / 25);
      const tearAlpha = b.entranceTimer < 85 ? sp : spOut;
      g.lineStyle(10 + sp * 30, 0xffffff, tearAlpha * 0.9);
      g.beginPath(); g.moveTo(b.x, -600); g.lineTo(b.x, -600 + sp * 1800); g.strokePath();
      g.lineStyle(40 + sp * 50, 0xff00ff, tearAlpha * 0.4);
      g.beginPath(); g.moveTo(b.x, -600); g.lineTo(b.x, -600 + sp * 1800); g.strokePath();
      g.save(); g.translateCanvas(b.x, b.y);
    }
    
    // Expanding shockwave rings as it forms
    if (ep > 0.4) {
      const wa = (ep - 0.4) / 0.6;
      g.lineStyle(3, 0x00ffff, 1 - wa);
      g.strokeCircle(0, 0, b.radius * 5 * wa);
      g.lineStyle(8, 0xff00ff, (1 - wa) * 0.5);
      g.strokeCircle(0, 0, b.radius * 3 * wa);
    }

    // Emerging wireframe core
    if (ep > 0.2) {
      const wa = (ep - 0.2) / 0.8;
      g.lineStyle(2, 0xffffff, wa);
      g.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = b.rotAngle * 5 + (Math.PI * 2 / 8) * i;
        g.lineTo(Math.cos(a) * pulseR * 1.5, Math.sin(a) * pulseR * 1.5);
      }
      g.strokePath();
    }
    g.fillStyle(0x00ffff, 0.1 * dp);
    g.fillCircle(0, 0, pulseR * 4);
    g.fillStyle(0xff00ff, 0.5 * dp);
    g.fillCircle(0, 0, pulseR * 0.8);
    g.fillStyle(0xffffff, 0.8 * dp);
    g.fillCircle(0, 0, pulseR * 0.3);
    g.restore();
    return;
  }

  const isCharmed = b.faction === 'ally';
  const cyanHex = isCharmed ? 0xcc44ff : 0x00ffff;
  const magentaHex = isCharmed ? 0xff44cc : 0xff00ff;
  const dangerHex = 0xff0066;

  // ===== PHASE 1: FIRE BLOB TAKEOVER =====
  // Body is rendered entirely by the DOM fire-blob overlay (created in update).
  // When in P1 we only draw a subtle ember glow + charmed aura and skip the
  // procedural body (tesseract/iris/tendrils/rings/etc). When in P2+ we run
  // the full body rendering pipeline as before.
  if (b.phase === 1) {
    // Subtle ember-orange ambient glow under the DOM blob
    const emberPulse = 1 + Math.sin(time * 0.003) * 0.25;
    g.fillStyle(0xff8844, 0.05 * emberPulse);
    g.fillCircle(0, 0, b.radius * 3.2 * emberPulse);
    g.fillStyle(0xbe4a1d, 0.035 * emberPulse);
    g.fillCircle(0, 0, b.radius * 4.6 * emberPulse);

    // Charmed aura (orange-tinted to match P1 palette)
    if (isCharmed) {
      const p = 1 + Math.sin(time * 0.006) * 0.3;
      g.lineStyle(3, 0xff8844, 0.6);
      g.strokeCircle(0, 0, b.radius + 12 * p);
      g.lineStyle(1.5, 0xff8844, 0.3);
      g.strokeCircle(0, 0, b.radius + 22 * p);
    }
  } else {

  // ===== NEGATIVE SPACE SINGULARITY (P3) =====
  if (b.phase === 3) {
    // Pure black core sucking in light
    g.fillStyle(0x000000, 1);
    g.fillCircle(0, 0, b.radius * 3.5);
    // Event horizon (harsh white outer glow that glitches)
    g.lineStyle(6, 0xffffff, Math.random() > 0.1 ? 0.9 : 0.2);
    g.strokeCircle(0, 0, b.radius * 3.5);
    g.lineStyle(3, dangerHex, 0.8);
    g.strokeCircle(0, 0, b.radius * 3.55 + Math.random()*15);

    // Inward sucking glitch stars
    for(let i=0; i<12; i++) {
       const a = Math.random() * Math.PI * 2;
       const d = b.radius * (0.8 + Math.random() * 2.5);
       g.fillStyle(Math.random()>0.5 ? 0x00ffff : dangerHex, 0.8);
       g.fillRect(Math.cos(a)*d, Math.sin(a)*d, 3+Math.random()*15, 2);
    }
  }

  // ===== AMBIENT GLOW =====
  const glowPulse = 1 + Math.sin(time * 0.003) * 0.3;
  g.fillStyle(cyanHex, 0.04 * glowPulse);
  g.fillCircle(0, 0, b.radius * 3.5 * glowPulse);
  g.fillStyle(magentaHex, 0.025 * glowPulse);
  g.fillCircle(0, 0, b.radius * 5 * glowPulse);

  // ===== GRAVITY SINGULARITY FLECKS =====
  // Decorative data particles swirling inward to reinforce the "energy
  // singularity" feel. Ticked in draw since state is purely visual.
  if (b.entered && !b.dying) {
    // Spawn rate scales with phase — more frantic as fight progresses
    const spawnRate = b.phase === 3 ? 3 : (b.phase === 2 ? 2 : 1);
    for (let s = 0; s < spawnRate; s++) {
      if (b.gravityFlecks.length < 60 && Math.random() < 0.6) {
        b.gravityFlecks.push({
          angle: Math.random() * Math.PI * 2,
          radius: b.radius * (2.8 + Math.random() * 1.5),
          speed: 0.6 + Math.random() * 0.8,
          age: 0,
          maxAge: 80 + Math.random() * 30,
          color: Math.random() < 0.5 ? cyanHex : magentaHex,
        });
      }
    }
    // Tick + render each fleck (we're inside translated context, boss at 0,0)
    g.lineStyle(1.5, 0xffffff, 0);
    for (let fi = b.gravityFlecks.length - 1; fi >= 0; fi--) {
      const f = b.gravityFlecks[fi];
      f.age++;
      // Accelerating inward pull — closer = faster (like gravity)
      const pullFactor = 1 + (1 - f.radius / (b.radius * 4)) * 1.8;
      f.radius -= f.speed * pullFactor;
      // Slight tangential drift for spiral motion
      f.angle += 0.04 * (b.phase >= 3 ? 1.8 : 1);

      const fx = Math.cos(f.angle) * f.radius;
      const fy = Math.sin(f.angle) * f.radius;
      // Trail: smear radially outward from fleck
      const trailLen = 8 + (1 - f.radius / (b.radius * 4)) * 18;
      const tx = Math.cos(f.angle) * (f.radius + trailLen);
      const ty = Math.sin(f.angle) * (f.radius + trailLen);
      const alpha = Math.max(0, 1 - f.age / f.maxAge) * 0.7;
      g.lineStyle(1.5, f.color, alpha);
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(tx, ty); g.strokePath();
      // Bright head
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(fx, fy, 1.5);

      // Retire when consumed by singularity or aged out
      if (f.radius < b.radius * 0.3 || f.age > f.maxAge) {
        b.gravityFlecks.splice(fi, 1);
      }
    }
  }

  // ===== 4D TESSERACT CORE & NEURAL TENTACLES =====
  const timeSec = time * 0.001;
  const rotXY = timeSec * 0.5 + b.rotAngle;
  const rotZW = timeSec * 0.3 - b.innerRotAngle;
  const rotXZ = timeSec * 0.7;
  
  // 1. Calculate 16 vertices of the 4D hypercube
  const v4d = [];
  for (let i = 0; i < 16; i++) {
    let x = (i & 1) ? 1 : -1;
    let y = (i & 2) ? 1 : -1;
    let z = (i & 4) ? 1 : -1;
    let w = (i & 8) ? 1 : -1;
    
    // Rotate XY
    let px = x*Math.cos(rotXY) - y*Math.sin(rotXY);
    let py = x*Math.sin(rotXY) + y*Math.cos(rotXY);
    x = px; y = py;
    
    // Rotate ZW
    let pz = z*Math.cos(rotZW) - w*Math.sin(rotZW);
    let pw = z*Math.sin(rotZW) + w*Math.cos(rotZW);
    z = pz; w = pw;
    
    // Rotate XZ
    px = x*Math.cos(rotXZ) - z*Math.sin(rotXZ);
    pz = x*Math.sin(rotXZ) + z*Math.cos(rotXZ);
    x = px; z = pz;

    // Project 4D to 3D
    const wDist = 3.0;
    const wFactor = 1.3 / (wDist - w);
    let x3 = x * wFactor;
    let y3 = y * wFactor;
    let z3 = z * wFactor;
    
    // Project 3D to 2D
    const zDist = 4.0;
    const zFactor = 1.5 / (zDist - z3);
    let x2 = x3 * zFactor * b.radius * 0.9;
    let y2 = y3 * zFactor * b.radius * 0.9;
    
    v4d.push({x: x2, y: y2});
  }

  // 2. Draw 4D Edges — with phase-based damage (random missing edges)
  //    P1: clean wireframe
  //    P2: ~15% edges fail-render in stable flicker buckets
  //    P3: ~35% edges fail-render + red tint on surviving ones
  const tHex = b.phase === 3 ? dangerHex : (b.phase === 2 ? magentaHex : cyanHex);
  const damageRate = b.phase === 3 ? 0.35 : (b.phase === 2 ? 0.15 : 0);
  // Bucket time so edges flicker in stable-ish groups, not per-frame noise
  const flickerBucket = Math.floor(timeSec * 4);

  // Edge-pair shouldRender lookup — deterministic pseudo-random per (bucket, i, j)
  const shouldRenderEdge = (i, j) => {
    if (damageRate <= 0) return true;
    const seed = (flickerBucket * 73 + i * 17 + j * 31) & 0xff;
    return (seed / 0xff) > damageRate;
  };

  g.lineStyle(6, tHex, 0.25); // Glow pass
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      if (((i ^ j) & ((i ^ j) - 1)) === 0 && shouldRenderEdge(i, j)) {
        g.moveTo(v4d[i].x, v4d[i].y);
        g.lineTo(v4d[j].x, v4d[j].y);
      }
    }
  }
  g.strokePath();

  g.lineStyle(2, tHex, 0.85); // Core pass
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      if (((i ^ j) & ((i ^ j) - 1)) === 0 && shouldRenderEdge(i, j)) {
        g.moveTo(v4d[i].x, v4d[i].y);
        g.lineTo(v4d[j].x, v4d[j].y);
      }
    }
  }
  g.strokePath();

  // 3. Living Iris Eye — the boss is watching you
  //    Outer sclera → striated iris → pupil tracking player → white highlight
  const eyeHit = b.hitFlash > 0;
  const corePulse = 1 + Math.sin(timeSec * 15) * 0.1;

  // Pupil tracks player direction. Note: we're inside a translated canvas,
  // so (0,0) is boss center; compute relative angle + clamp offset.
  let pupilAngle = b.rotAngle * 0.3;
  let pupilOffset = b.radius * 0.08;
  if (P && !P.hidden) {
    pupilAngle = Math.atan2(P.y - b.y, P.x - b.x);
  }
  // Dilation: shrink during overheat/venting, expand during beam/slice charge
  let dilate = 1;
  if (b.overheatState === 'venting') dilate = 0.45;
  else if (b.overheatState === 'overheating') dilate = 1.6;
  else if (b.beaming || b.sliceActive) dilate = 1.4;

  // Sclera (outer dark ring)
  g.fillStyle(0x000000, 0.85);
  g.fillCircle(0, 0, b.radius * 0.48 * corePulse);

  // Iris disc — phase-tinted with striations
  const irisColor = eyeHit ? 0xffffff : tHex;
  g.fillStyle(irisColor, 0.75);
  g.fillCircle(0, 0, b.radius * 0.38 * corePulse);

  // Iris radial striations (reverse-rotating for subtle life)
  g.lineStyle(1.5, 0xffffff, 0.35);
  const striaRot = -timeSec * 0.4;
  const striaInner = b.radius * 0.18;
  const striaOuter = b.radius * 0.36 * corePulse;
  g.beginPath();
  for (let s = 0; s < 18; s++) {
    const sa = striaRot + (Math.PI * 2 / 18) * s;
    g.moveTo(Math.cos(sa) * striaInner, Math.sin(sa) * striaInner);
    g.lineTo(Math.cos(sa) * striaOuter, Math.sin(sa) * striaOuter);
  }
  g.strokePath();

  // Iris rim (bright edge)
  g.lineStyle(2, irisColor, 0.9);
  g.strokeCircle(0, 0, b.radius * 0.38 * corePulse);

  // Pupil (black, tracks player, dilates per state)
  const pupilR = b.radius * 0.16 * dilate;
  const px = Math.cos(pupilAngle) * pupilOffset;
  const py = Math.sin(pupilAngle) * pupilOffset;
  g.fillStyle(0x000000, 1);
  g.fillCircle(px, py, pupilR);

  // White highlight on pupil (off-center for life)
  const hlAngle = pupilAngle - 0.6;
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(
    px + Math.cos(hlAngle) * pupilR * 0.4,
    py + Math.sin(hlAngle) * pupilR * 0.4,
    pupilR * 0.28
  );

  // Phase damage cracks across the iris (P2+)
  if (b.phase >= 2) {
    const crackCount = b.phase === 3 ? 5 : 2;
    const crackColor = b.overheatState === 'overheating' ? 0xff2200 : 0xffffff;
    const crackAlpha = b.overheatState === 'overheating' ? 0.9 : (b.phase === 3 ? 0.7 : 0.5);
    g.lineStyle(1.5, crackColor, crackAlpha);
    g.beginPath();
    // Deterministic crack pattern per-phase so they don't strobe every frame
    for (let c = 0; c < crackCount; c++) {
      const ca = (Math.PI * 2 / crackCount) * c + b.phase * 0.7;
      const startR = b.radius * 0.05;
      const endR = b.radius * 0.42;
      // Jagged 3-segment crack
      const mid1R = startR + (endR - startR) * 0.4;
      const mid2R = startR + (endR - startR) * 0.75;
      const jitter1 = Math.sin(flickerBucket * 0.5 + c * 2.1) * 0.25;
      const jitter2 = Math.sin(flickerBucket * 0.7 + c * 1.3) * 0.25;
      g.moveTo(Math.cos(ca) * startR, Math.sin(ca) * startR);
      g.lineTo(Math.cos(ca + jitter1) * mid1R, Math.sin(ca + jitter1) * mid1R);
      g.lineTo(Math.cos(ca + jitter2) * mid2R, Math.sin(ca + jitter2) * mid2R);
      g.lineTo(Math.cos(ca) * endR, Math.sin(ca) * endR);
    }
    g.strokePath();
  }

  // P3 void center — pure white opening in pupil when severely damaged
  if (b.phase === 3) {
    const voidPulse = 0.7 + Math.sin(timeSec * 8) * 0.3;
    g.fillStyle(0xffffff, voidPulse);
    g.fillCircle(px, py, pupilR * 0.25);
  }

  // 4. Neural Fractals / Glitch Tendrils extending outward
  const cPulse = b.phase === 3 ? magentaHex : cyanHex;
  g.lineStyle(2, cPulse, 0.6);
  g.beginPath();
  const numTendrils = b.phase >= 2 ? 10 : 5;
  for (let t = 0; t < numTendrils; t++) {
    // Random chaotic jitter based on time
    const angleBase = b.rotAngle * 2 + (Math.PI * 2 / numTendrils) * t + Math.sin(timeSec*10 + t) * 0.5;
    let tx = 0, ty = 0;
    g.moveTo(tx, ty);
    let len = b.radius * (1.2 + Math.random() * 0.8);
    for(let seg = 0; seg < 5; seg++) {
      const segLen = len / 5;
      const angSplit = angleBase + (Math.random() - 0.5) * 1.8; // sharp twitching
      tx += Math.cos(angSplit) * segLen;
      ty += Math.sin(angSplit) * segLen;
      g.lineTo(tx, ty);
    }
  }
  g.strokePath();


  // ===== DYNAMIC ORBITING TRIANGLES & BARCODES =====
  for (let i = 0; i < 8; i++) {
    const da = b.rotAngle * 2.5 + (Math.PI * 2 / 8) * i;
    const dr = b.radius * (1.2 + Math.sin(time * 0.005 + i * 1.2) * 0.3);
    const dx = Math.cos(da) * dr, dy = Math.sin(da) * dr;
    const oHex = i % 2 === 0 ? cyanHex : magentaHex;
    g.fillStyle(oHex, 0.9);
    g.beginPath();
    g.moveTo(dx + Math.cos(da)*8, dy + Math.sin(da)*8);
    g.lineTo(dx + Math.cos(da+2)*6, dy + Math.sin(da+2)*6);
    g.lineTo(dx + Math.cos(da-2)*6, dy + Math.sin(da-2)*6);
    g.fillPath();
    // Tiny trailing line
    g.lineStyle(1.5, oHex, 0.4);
    g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx - Math.cos(da)*15, dy - Math.sin(da)*15); g.strokePath();
  }

  // Segmented Data Rings (HUD Element)
  const ringA = time * 0.002;
  g.lineStyle(4, cyanHex, 0.3);
  g.beginPath(); g.arc(0, 0, b.radius * 1.8, ringA, ringA + Math.PI * 0.4); g.strokePath();
  g.beginPath(); g.arc(0, 0, b.radius * 1.8, ringA + Math.PI, ringA + Math.PI * 1.4); g.strokePath();
  
  const ringB = -time * 0.003;
  g.lineStyle(2, magentaHex, 0.5);
  g.beginPath(); g.arc(0, 0, b.radius * 2.1, ringB, ringB + Math.PI * 0.2); g.strokePath();
  g.beginPath(); g.arc(0, 0, b.radius * 2.1, ringB + Math.PI * 0.6, ringB + Math.PI * 0.9); g.strokePath();
  g.beginPath(); g.arc(0, 0, b.radius * 2.1, ringB + Math.PI * 1.2, ringB + Math.PI * 1.5); g.strokePath();

  // Floating Barcode Scanner (Right Side)
  const barX = b.radius * 2.4;
  g.fillStyle(0xffffff, 0.6);
  for(let i=0; i<8; i++) {
     const bH = 2 + Math.random() * 8;
     g.fillRect(barX, -20 + i * 5, 8 + Math.random() * 10, bH);
  }

  // ===== MASSIVE GLITCH BLOCKS =====
  if (b.glitchTimer % 40 < 10) {
    const slices = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < slices; i++) {
      const gH = Math.random() * b.radius * 1.5;
      const gY = (Math.random() - 0.5) * b.radius * 2.5;
      const gXOff = (Math.random() - 0.5) * b.radius * 1.2;
      const gHex = Math.random() > 0.5 ? cyanHex : magentaHex;
      g.fillStyle(gHex, 0.4);
      g.fillRect(-b.radius * 2 + gXOff, gY, b.radius * 4, gH);
      // Pure white static lines
      g.fillStyle(0xffffff, 0.7);
      g.fillRect(-b.radius * 2.2 + gXOff, gY + gH/2, b.radius * 4.4, 3);
    }
  }

  // ===== PHASE 2+: DANGER RINGS =====
  if (b.phase >= 2) {
    const dp = 0.5 + Math.sin(time * 0.008) * 0.5;
    g.lineStyle(1.5, dangerHex, dp * 0.4);
    g.strokeCircle(0, 0, b.radius * 2.0 + dp * 15);
    g.lineStyle(1, magentaHex, dp * 0.2);
    g.strokeCircle(0, 0, b.radius * 2.3 + dp * 10);
  }
  // ===== PHASE 3: CHAOTIC RINGS =====
  if (b.phase === 3) {
    for (let ring = 0; ring < 3; ring++) {
      const rr = b.radius * (1.8 + ring * 0.5);
      const ra = [b.rotAngle, b.innerRotAngle, b.outerRotAngle][ring] * (3 + ring);
      g.lineStyle(1, ring === 2 ? 0xffffff : dangerHex, 0.3 - ring * 0.05);
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = ra + (Math.PI * 2 / 12) * i;
        const w = 1 + Math.sin(time * 0.012 + i * 0.5 + ring) * 0.12;
        g.lineTo(Math.cos(a) * rr * w, Math.sin(a) * rr * w);
      }
      g.strokePath();
    }
  }

  // ===== CHARMED AURA =====
  if (isCharmed) {
    const p = 1 + Math.sin(time * 0.006) * 0.3;
    g.lineStyle(3, 0xcc44ff, 0.6);
    g.strokeCircle(0, 0, b.radius + 12 * p);
    g.lineStyle(1.5, 0xcc44ff, 0.3);
    g.strokeCircle(0, 0, b.radius + 22 * p);
  }

  } // close `else` block (end of P2+ procedural body rendering)

  g.restore();

  // ===== DATA SLICE LASER =====
  if (b.sliceActive) {
    const realThick = CONFIG.BOSS4.PHASE1.SLICE_THICKNESS / 2;
    const lh = b.sliceIsCharmed ? 0xcc44ff : 0xff0066;
    const cx = b.sliceCX, cy = b.sliceCY;
    const beamLen = 2000; // long enough to cross entire screen
    const WARN_TOTAL = CONFIG.BOSS4.PHASE1.SLICE_WARN_DURATION;

    if (b.sliceWarn > 0) {
      // --- Scanning warning: beam grows outward from center as warn ticks down ---
      // Progress 0 → 1 as warn 150 → 0. The beam "reaches out" from the center.
      const warnProgress = 1 - (b.sliceWarn / WARN_TOTAL);
      const reachLen = beamLen * Math.min(1, warnProgress * 1.3); // slightly faster than linear
      const wa = 0.4 + Math.sin(b.sliceWarn * 0.4) * 0.3;

      // Two scanning half-beams from center outward in both directions
      for (let bi = 0; bi < 2; bi++) {
        const a = b.sliceAngle + bi * Math.PI / 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        const ex1 = cx + dx * reachLen, ey1 = cy + dy * reachLen;
        const ex2 = cx - dx * reachLen, ey2 = cy - dy * reachLen;
        // Thin leading edge — outer halo + bright core line + white center
        g.lineStyle(8, lh, wa * 0.25);
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex1, ey1); g.strokePath();
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex2, ey2); g.strokePath();
        g.lineStyle(3, lh, wa);
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex1, ey1); g.strokePath();
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex2, ey2); g.strokePath();
        g.lineStyle(1.2, 0xffffff, wa * 0.95);
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex1, ey1); g.strokePath();
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex2, ey2); g.strokePath();
        // Very visible scan-head ORB at the growing edge
        if (warnProgress < 0.95) {
          const headPulse = 1 + Math.sin(time * 0.2) * 0.25;
          // Outer glow
          g.fillStyle(lh, 0.45);
          g.fillCircle(ex1, ey1, 16 * headPulse);
          g.fillCircle(ex2, ey2, 16 * headPulse);
          // Core
          g.fillStyle(lh, 0.9);
          g.fillCircle(ex1, ey1, 8 * headPulse);
          g.fillCircle(ex2, ey2, 8 * headPulse);
          // White center
          g.fillStyle(0xffffff, 1);
          g.fillCircle(ex1, ey1, 4);
          g.fillCircle(ex2, ey2, 4);
          // Pulsing ring
          g.lineStyle(2, 0xffffff, 0.8);
          g.strokeCircle(ex1, ey1, 20 + Math.sin(time * 0.15) * 5);
          g.strokeCircle(ex2, ey2, 20 + Math.sin(time * 0.15) * 5);
        }
      }

      // Spinning crosshair at center
      const spinAngle = b.sliceWarn > 10 ? time * 0.05 : b.sliceAngle;
      g.lineStyle(2, 0xffffff, wa * 0.8);
      g.strokeCircle(cx, cy, 30 * (1 - wa));
      const arm = 40;
      g.beginPath();
      g.moveTo(cx - Math.cos(spinAngle)*arm, cy - Math.sin(spinAngle)*arm);
      g.lineTo(cx + Math.cos(spinAngle)*arm, cy + Math.sin(spinAngle)*arm);
      g.strokePath();
      g.beginPath();
      g.moveTo(cx - Math.cos(spinAngle+Math.PI/2)*arm, cy - Math.sin(spinAngle+Math.PI/2)*arm);
      g.lineTo(cx + Math.cos(spinAngle+Math.PI/2)*arm, cy + Math.sin(spinAngle+Math.PI/2)*arm);
      g.strokePath();
    } else {
      const la = 0.8 + Math.sin(time * 0.1) * 0.2;
      const tk = realThick;
      // Draw two thick beams at the random angle
      for (let bi = 0; bi < 2; bi++) {
        const a = b.sliceAngle + bi * Math.PI / 2;
        const dx = Math.cos(a) * beamLen, dy = Math.sin(a) * beamLen;
        const px = -Math.sin(a), py = Math.cos(a); // perpendicular direction

        // --- Wavy heat shimmer — polygon with N segments, each edge
        //     sin-modulated perpendicular offset. Beam edges LITERALLY ripple. ---
        const SHIM_SEGS = 18;
        const shimPhase = time * 0.008 + bi * 1.7;
        const drawWavyBeam = (halfW, color, alpha, rippleAmp = 0) => {
          g.fillStyle(color, alpha);
          g.beginPath();
          // Top edge: from -end to +end, with sin ripple
          for (let si = 0; si <= SHIM_SEGS; si++) {
            const t = (si / SHIM_SEGS) * 2 - 1; // -1..1
            const ripple = rippleAmp > 0 ? Math.sin(t * 6 + shimPhase) * rippleAmp : 0;
            const bx0 = cx + dx * t + px * (halfW + ripple);
            const by0 = cy + dy * t + py * (halfW + ripple);
            if (si === 0) g.moveTo(bx0, by0); else g.lineTo(bx0, by0);
          }
          // Bottom edge: reverse, with anti-phase ripple
          for (let si = SHIM_SEGS; si >= 0; si--) {
            const t = (si / SHIM_SEGS) * 2 - 1;
            const ripple = rippleAmp > 0 ? -Math.sin(t * 6 + shimPhase) * rippleAmp : 0;
            const bx0 = cx + dx * t - px * (halfW + ripple);
            const by0 = cy + dy * t - py * (halfW + ripple);
            g.lineTo(bx0, by0);
          }
          g.closePath();
          g.fillPath();
        };

        // Layers — outer ones get bigger ripple for visible heat wave
        drawWavyBeam(tk * 6, lh, la * 0.07, tk * 1.8);     // Outer haze — strong ripple
        drawWavyBeam(tk * 4.2, lh, la * 0.14, tk * 1.2);   // Mid haze — mod ripple
        drawWavyBeam(tk * 2.5, lh, la * 0.35, tk * 0.5);   // Inner glow — subtle ripple
        drawWavyBeam(tk * 1.5, lh, la * 0.75, 0);          // Secondary core — no ripple
        drawWavyBeam(tk * 0.5, 0xffffff, la * 0.95, 0);    // White plasma core
      }

      // --- Data stream beads flowing outward from center ---
      // Big, visible beads (not tiny 1x1 ticks). Each bead has cyan/magenta
      // halo + white center, rendered as proper circles so they work at any angle.
      const beadSpeed = 0.008; // how fast beads flow outward
      const beadFlow = (time * beadSpeed) % 1;
      const beadCount = 10;
      for (let bi = 0; bi < 2; bi++) {
        const a = b.sliceAngle + bi * Math.PI / 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        // Beads flow in BOTH directions from center (so from t=0 outward to ±1)
        for (let sp = 0; sp < beadCount; sp++) {
          // Start near center, flow outward (0..1 range for each direction)
          const baseT = ((sp / beadCount) + beadFlow) % 1;
          for (const dir of [1, -1]) {
            const t = baseT * dir;
            const sx = cx + dx * beamLen * 0.5 * t; // only 50% of full length (visible)
            const sy = cy + dy * beamLen * 0.5 * t;
            // Fade older beads (large t values)
            const fadeAlpha = 1 - Math.min(1, Math.abs(t) * 1.1);
            if (fadeAlpha <= 0) continue;
            const col = sp % 2 === 0 ? 0x00ffff : 0xff00ff;
            // Outer halo
            g.fillStyle(col, 0.35 * fadeAlpha);
            g.fillCircle(sx, sy, 8);
            // Mid body
            g.fillStyle(col, 0.8 * fadeAlpha);
            g.fillCircle(sx, sy, 4);
            // White hot center
            g.fillStyle(0xffffff, 0.95 * fadeAlpha);
            g.fillCircle(sx, sy, 2);
          }
        }
      }

      // --- Central crossfire: bright star + long radial streaks ---
      // This is the "intersection explosion" — very bright so player sees
      // where the laser is centered even through all the beam glow.
      const starPulse = 1 + Math.sin(time * 0.15) * 0.3;
      // Outer star glow
      g.fillStyle(lh, 0.6);
      g.fillCircle(cx, cy, 28 * starPulse);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(cx, cy, 14 * starPulse);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx, cy, 6);
      // Four radial streaks (plus-shape) along the beam axes
      const streakLen = 60 * starPulse;
      for (let si = 0; si < 4; si++) {
        const sa = b.sliceAngle + (Math.PI / 2) * si;
        const sex = cx + Math.cos(sa) * streakLen;
        const sey = cy + Math.sin(sa) * streakLen;
        g.lineStyle(3, 0xffffff, 0.8);
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(sex, sey); g.strokePath();
      }
      // Random scattered micro-sparks
      for (let sk = 0; sk < 6; sk++) {
        const ska = Math.random() * Math.PI * 2;
        const skd = 15 + Math.random() * 40;
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(cx + Math.cos(ska) * skd, cy + Math.sin(ska) * skd, 2);
      }

      // --- Glitch static (brighter, more frequent) ---
      if (b.atkTimer % 2 === 0) {
        for (let bi = 0; bi < 2; bi++) {
          const a = b.sliceAngle + bi * Math.PI / 2;
          const dx = Math.cos(a) * beamLen, dy = Math.sin(a) * beamLen;
          const px = -Math.sin(a), py = Math.cos(a);
          const off = (Math.random() - 0.5) * realThick;
          g.lineStyle(2.5, bi === 0 ? 0x00ffff : 0xff00ff, 0.65);
          g.beginPath();
          g.moveTo(cx - dx + px * off, cy - dy + py * off);
          g.lineTo(cx + dx + px * off, cy + dy + py * off);
          g.strokePath();
        }
      }
    }
  }

  // ===== ORBITAL STRIKE WARNINGS =====
  b.strikes.forEach(s => {
    const wp = 1 - s.warn / CONFIG.BOSS4.PHASE2.STRIKE_WARN_DURATION;
    const wa = 0.2 + wp * 0.6;
    const sr = CONFIG.BOSS4.PHASE2.STRIKE_RADIUS;
    g.lineStyle(2, s.isCharmed ? 0xcc44ff : 0xff0066, wa);
    g.strokeCircle(s.x, s.y, sr * (1 + (1 - wp) * 2));
    g.fillStyle(0xff0066, wa * 0.15);
    g.fillCircle(s.x, s.y, sr);
    g.lineStyle(1, 0xff0066, wa * 0.5);
    g.beginPath();
    g.moveTo(s.x - sr, s.y); g.lineTo(s.x + sr, s.y);
    g.moveTo(s.x, s.y - sr); g.lineTo(s.x, s.y + sr);
    g.strokePath();
  });

  // ===== FIRE ZONES =====
  b.fires.forEach(f => {
    const fa = Math.min(1, f.life / 60) * 0.35;
    const fr = CONFIG.BOSS4.PHASE2.STRIKE_RADIUS;
    g.fillStyle(f.isCharmed ? 0xcc44ff : 0xff4400, fa);
    g.fillCircle(f.x, f.y, fr);
    const fl = 1 + Math.sin(time * 0.02 + f.x) * 0.3;
    g.lineStyle(1, f.isCharmed ? 0xcc44ff : 0xff4400, fa * fl);
    g.strokeCircle(f.x, f.y, fr * fl);
    g.fillStyle(0xffffff, fa * 0.3 * fl);
    g.fillCircle(f.x, f.y, fr * 0.3);
  });

  // ===== EXTREME DASH TRAIL =====
  b.dashTrail.forEach((t, i) => {
    // Hexagon wireframe smear instead of plain circles
    g.lineStyle(1.5, 0xff00ff, t.alpha * 0.5);
    g.beginPath();
    for (let j = 0; j <= 6; j++) {
      const a = (Math.PI * 2 / 6) * j + t.alpha; // Rotate as it fades
      const r = b.radius * 0.8 * t.alpha;
      const px = t.x + Math.cos(a) * r;
      const py = t.y + Math.sin(a) * r;
      if (j === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    
    // Horizontal speed distortion glitch on fast frames
    if (i % 2 === 0) {
      g.fillStyle(0x00ffff, t.alpha * 0.3);
      const gw = b.radius * 2 * Math.random() * t.alpha;
      g.fillRect(t.x - gw/2, t.y + (Math.random()-0.5)*b.radius, gw, 2 + Math.random()*2);
    }
  });

  // ===== SHOCKWAVE (DIGITAL EXPLOSION) =====
  if (b.shockwaveActive) {
    const swR = b.shockwaveRadius;
    const swMax = CONFIG.BOSS4.PHASE2.SHOCKWAVE_RADIUS;
    const sa = 1 - swR / swMax;
    // Massive inner fill
    g.fillStyle(0xff00ff, sa * 0.15);
    g.fillCircle(b.x, b.y, swR);
    // Chromatic glitch rings
    g.lineStyle(8, 0x00ffff, sa * 0.6); g.strokeCircle(b.x, b.y, swR + 5);
    g.lineStyle(8, 0xff00ff, sa * 0.6); g.strokeCircle(b.x, b.y, swR - 5);
    g.lineStyle(3, 0xffffff, sa * 0.9); g.strokeCircle(b.x, b.y, swR);
    // Digital noise blocks along the edge
    for (let i = 0; i < 12; i++) {
       const na = (Math.PI * 2 / 12) * i + swR * 0.01;
       const nx = b.x + Math.cos(na) * swR;
       const ny = b.y + Math.sin(na) * swR;
       g.fillStyle(i % 2 === 0 ? 0x00ffff : 0xff00ff, sa * 0.8);
       g.fillRect(nx - 10, ny - 10, 20, 20);
    }
  }

  // ===== DEATH BEAM (PLASMA) =====
  if (b.beaming && b.beamDuration > 0) {
    const bh = b.beamIsCharmed ? 0xcc44ff : 0xff0066;
    const bp = 1 + Math.sin(time * 0.1) * 0.2;
    const bl = CONFIG.BOSS4.PHASE3.BEAM_HIT_RANGE;

    for (let beam = 0; beam < 2; beam++) {
      const ba = b.beamAngle + b.beamSweep + beam * Math.PI;
      const bx = b.x + Math.cos(ba) * bl;
      const by = b.y + Math.sin(ba) * bl;
      // Perpendicular unit vector (for chromatic splits + spirals)
      const pxv = -Math.sin(ba), pyv = Math.cos(ba);

      // --- 1. Chromatic aberration split: three near-parallel beams (R/G/B offset) ---
      // Each offset very slightly so at the center they look like one, but edges tear apart.
      const chromaOff = 6;
      // Red-shifted outer layer
      g.lineStyle(70 * bp, 0xff0066, 0.10);
      g.beginPath();
      g.moveTo(b.x + pxv * chromaOff, b.y + pyv * chromaOff);
      g.lineTo(bx + pxv * chromaOff, by + pyv * chromaOff);
      g.strokePath();
      // Cyan-shifted outer layer
      g.lineStyle(70 * bp, 0x00ffff, 0.10);
      g.beginPath();
      g.moveTo(b.x - pxv * chromaOff, b.y - pyv * chromaOff);
      g.lineTo(bx - pxv * chromaOff, by - pyv * chromaOff);
      g.strokePath();

      // --- 2. Massive translucent aura (main body) ---
      g.lineStyle(60 * bp, bh, 0.14);
      g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(bx, by); g.strokePath();

      // --- 3. Outer bright core ---
      g.lineStyle(25, bh, 0.55);
      g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(bx, by); g.strokePath();

      // --- 4. Spiral energy wraps — two counter-rotating helixes along beam ---
      // Sampled along beam length; perpendicular offset oscillates with position+time.
      const spiralSegs = 22;
      const spiralAmp = 18;
      for (let helix = 0; helix < 2; helix++) {
        const phase = helix * Math.PI + time * 0.012 * (helix === 0 ? 1 : -1);
        const helixColor = helix === 0 ? 0x00ffff : 0xff00ff;
        g.lineStyle(2.5, helixColor, 0.65);
        g.beginPath();
        for (let si = 0; si <= spiralSegs; si++) {
          const st = si / spiralSegs;
          const freq = 4.5; // wraps across full length
          const off = Math.sin(st * Math.PI * 2 * freq + phase) * spiralAmp;
          const lx = b.x + Math.cos(ba) * bl * st + pxv * off;
          const ly = b.y + Math.sin(ba) * bl * st + pyv * off;
          if (si === 0) g.moveTo(lx, ly); else g.lineTo(lx, ly);
        }
        g.strokePath();
      }

      // --- 5. Inner blinding plasma (main white core) ---
      g.lineStyle(8, 0xffffff, 0.95);
      g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(bx, by); g.strokePath();

      // --- 6. Energy nodes along beam (bright pulsing rings) ---
      const nodeCount = 5;
      for (let n = 1; n <= nodeCount; n++) {
        const nt = n / (nodeCount + 1);
        const nx = b.x + Math.cos(ba) * bl * nt;
        const ny = b.y + Math.sin(ba) * bl * nt;
        const nPulse = 1 + Math.sin(time * 0.08 + n * 1.3) * 0.4;
        g.lineStyle(2, 0xffffff, 0.7);
        g.strokeCircle(nx, ny, 6 * nPulse);
        g.fillStyle(bh, 0.5);
        g.fillCircle(nx, ny, 4 * nPulse);
      }

      // --- 7. Perpendicular glitch arcs (existing) ---
      if (Math.random() > 0.4) {
        const d = Math.random() * 400 + 100;
        const gx = b.x + Math.cos(ba) * d;
        const gy = b.y + Math.sin(ba) * d;
        g.lineStyle(4, 0x00ffff, 0.8);
        g.beginPath();
        g.moveTo(gx - pxv * 30, gy - pyv * 30);
        g.lineTo(gx + pxv * 30, gy + pyv * 30);
        g.strokePath();
      }

      // --- 8. Beam-tip impact halo — beam crashing into distance ---
      g.fillStyle(bh, 0.5);
      g.fillCircle(bx, by, 18 * bp);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(bx, by, 8 * bp);
      // Scattered impact sparks at tip
      for (let sp = 0; sp < 3; sp++) {
        const sa = ba + (Math.random() - 0.5) * 2.5;
        const sd = 10 + Math.random() * 30;
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(bx + Math.cos(sa) * sd, by + Math.sin(sa) * sd, 1.5);
      }

      // --- 9. Boss-side emission aperture — bright ring at origin ---
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(b.x, b.y, 14 * bp);
      g.lineStyle(3, bh, 0.8);
      g.strokeCircle(b.x, b.y, 22 * bp);
    }
  }

  // ===== GLITCH BOMBS =====
  b.bombs.forEach(bomb => {
    const bp = 1 + Math.sin(time * 0.02 + bomb.x) * 0.3;
    g.fillStyle(0xff0066, 0.2);
    g.fillCircle(bomb.x, bomb.y, 14 * bp);
    g.fillStyle(0xff0066, 1);
    g.fillCircle(bomb.x, bomb.y, 5);
    g.lineStyle(1, 0xff00ff, 0.7);
    g.strokeCircle(bomb.x, bomb.y, 9 * bp);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(bomb.x - 6, bomb.y, 12, 1);
  });
}

function drawDeathSequence(g, b, time) {
  const p = Math.min(1, b.deathAnim / 90);
  const shake = Math.sin(b.deathAnim * 0.8) * 15 * p;

  // Massive Glitch Grid (Shattering Reality)
  if (p > 0.1) {
    const ga = (1 - p) * 0.5;
    const offsets = [{c: 0x00ffff, x: -5 * p}, {c: 0xff00ff, x: 5 * p}, {c: 0xffffff, x: 0}];
    offsets.forEach(off => {
      g.lineStyle(2 + p * 4, off.c, ga);
      for (let y = 0; y < 1200; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(2000, y); g.strokePath(); }
      for (let x = 0; x < 2000; x += 80) { g.beginPath(); g.moveTo(x + off.x, 0); g.lineTo(x + off.x, 1200); g.strokePath(); }
    });
  }

  // Giant Chromatic Rings
  const br = b.radius * (1 + p * 15);
  g.lineStyle(10, 0x00ffff, (1 - p) * 0.8); g.strokeCircle(b.x + shake, b.y, br);
  g.lineStyle(10, 0xff00ff, (1 - p) * 0.8); g.strokeCircle(b.x - shake, b.y, br);
  g.lineStyle(5, 0xffffff, (1 - p)); g.strokeCircle(b.x, b.y, br * 0.9);

  g.save();
  g.translateCanvas(b.x + shake, b.y + shake * 0.7);

  // Reality Deletion Blocks
  for (let i = 0; i < Math.floor(p * 25); i++) {
    const gX = (Math.random() - 0.5) * 800 * p;
    const gY = (Math.random() - 0.5) * 800 * p;
    const gW = Math.random() * 400 * p;
    const gH = Math.random() * 100 * p;
    g.fillStyle(Math.random() > 0.5 ? 0x00ffff : 0xff00ff, 0.4 * (1 - p));
    g.fillRect(gX, gY, gW, gH);
  }

  // Fragmenting core polygon
  if (p < 0.8) {
    const fr = b.radius * (1 + p * 3);
    g.lineStyle(4, 0xffffff, (1 - p));
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = b.rotAngle * 8 + (Math.PI * 2 / 6) * i + (Math.random() - 0.5) * p;
      const lx = Math.cos(a) * fr; const ly = Math.sin(a) * fr;
      if (i === 0) g.moveTo(lx, ly); else g.lineTo(lx, ly);
      // Shoot rays out
      g.moveTo(0, 0); g.lineTo(lx * 4, ly * 4);
    }
    g.strokePath();
  }

  // Final Whiteout
  if (p > 0.7) {
    const wp = (p - 0.7) / 0.3;
    g.fillStyle(0xffffff, wp);
    g.fillRect(-1000, -600, 2000, 1200);
  }

  g.restore();
}

