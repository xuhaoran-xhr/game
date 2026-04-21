// ===========================
//  Berserker — 腥红幽影 (Crimson Phantom)
//  Melee character with greatsword slashing, bullet deflection,
//  shadow step and Blood Frenzy ultimate.
// ===========================
import CONFIG from '../config.js';
import { ang, clamp, dist } from '../utils.js';

const BK = CONFIG.BERSERKER;

// ========== CSS Injection ==========
let cssInjected = false;
function injectBerserkerCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    /* ---- Crimson Ghost Body ---- */
    .crimson-ghost {
      position: absolute; pointer-events: none; z-index: 42;
      transform: translate(-50%, -50%);
      filter: drop-shadow(0 0 12px #ff0000) drop-shadow(0 0 6px #880000);
      opacity: 0.9;
      transition: opacity 0.3s;
    }
    .crimson-ghost .ghost-body {
      animation: cGhostFloat 0.6s ease-in-out infinite;
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
    @keyframes cGhostFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    .crimson-ghost [class^="gt"], .crimson-ghost [class*=" gt"] { border-radius: 1px; }
    .crimson-ghost .gt0,.crimson-ghost .gt1,.crimson-ghost .gt2,.crimson-ghost .gt3,.crimson-ghost .gt4,
    .crimson-ghost .gs0,.crimson-ghost .gs1,.crimson-ghost .gs2,.crimson-ghost .gs3,.crimson-ghost .gs4,.crimson-ghost .gs5 {
      background: linear-gradient(135deg, #cc0000, #440000);
    }
    .crimson-ghost .gt0{grid-area:t0}.crimson-ghost .gt1{grid-area:t1}.crimson-ghost .gt2{grid-area:t2}
    .crimson-ghost .gt3{grid-area:t3}.crimson-ghost .gt4{grid-area:t4}
    .crimson-ghost .gs0{grid-area:s0}.crimson-ghost .gs1{grid-area:s1}.crimson-ghost .gs2{grid-area:s2}
    .crimson-ghost .gs3{grid-area:s3}.crimson-ghost .gs4{grid-area:s4}.crimson-ghost .gs5{grid-area:s5}
    .crimson-ghost .ga1{grid-area:a1}.crimson-ghost .ga2{grid-area:a2}.crimson-ghost .ga3{grid-area:a3}
    .crimson-ghost .ga4{grid-area:a4}.crimson-ghost .ga5{grid-area:a5}.crimson-ghost .ga6{grid-area:a6}
    .crimson-ghost .ga7{grid-area:a7}.crimson-ghost .ga8{grid-area:a8}.crimson-ghost .ga9{grid-area:a9}
    .crimson-ghost .ga10{grid-area:a10}.crimson-ghost .ga11{grid-area:a11}.crimson-ghost .ga12{grid-area:a12}
    .crimson-ghost .ga13{grid-area:a13}.crimson-ghost .ga14{grid-area:a14}.crimson-ghost .ga15{grid-area:a15}
    .crimson-ghost .ga16{grid-area:a16}.crimson-ghost .ga17{grid-area:a17}.crimson-ghost .ga18{grid-area:a18}
    .crimson-ghost .cf0 { animation: cFlick0 0.5s infinite; }
    .crimson-ghost .cf1 { animation: cFlick1 0.5s infinite; }
    @keyframes cFlick0 {
      0%,49% { background: linear-gradient(135deg, #cc0000, #440000); }
      50%,100% { background: transparent; }
    }
    @keyframes cFlick1 {
      0%,49% { background: transparent; }
      50%,100% { background: linear-gradient(135deg, #cc0000, #440000); }
    }
    .crimson-ghost .ghost-eye {
      width: 18px; height: 22px; position: absolute; top: 14px;
      background: radial-gradient(circle, #ff0000 40%, #880000 100%);
      border-radius: 4px;
    }
    .crimson-ghost .ghost-eye-l { left: 12px; }
    .crimson-ghost .ghost-eye-r { right: 12px; }
    .crimson-ghost .ghost-pupil {
      width: 8px; height: 8px; background: #fff;
      border-radius: 50%; position: absolute; top: 10px; z-index: 1;
      box-shadow: 0 0 6px #ff0000;
    }
    .crimson-ghost .ghost-pupil-l { left: 17px; }
    .crimson-ghost .ghost-pupil-r { right: 17px; }
    .crimson-ghost .ghost-shadow {
      width: 50px; height: 12px; background: rgba(255,0,0,0.2);
      border-radius: 50%; position: absolute; bottom: -8px; left: 50%;
      transform: translateX(-50%); filter: blur(4px);
      animation: cGShadow 0.6s infinite;
    }
    @keyframes cGShadow {
      0%,100% { opacity: 0.4; width: 50px; }
      50% { opacity: 0.15; width: 40px; }
    }

    /* ---- Frenzy Mode red aura ---- */
    .crimson-ghost.frenzy {
      filter: drop-shadow(0 0 20px #ff0000) drop-shadow(0 0 10px #ff4400) drop-shadow(0 0 30px #cc0000);
    }
    .crimson-ghost.frenzy .gt0,.crimson-ghost.frenzy .gt1,.crimson-ghost.frenzy .gt2,
    .crimson-ghost.frenzy .gt3,.crimson-ghost.frenzy .gt4,
    .crimson-ghost.frenzy .gs0,.crimson-ghost.frenzy .gs1,.crimson-ghost.frenzy .gs2,
    .crimson-ghost.frenzy .gs3,.crimson-ghost.frenzy .gs4,.crimson-ghost.frenzy .gs5 {
      background: linear-gradient(135deg, #ff2200, #880000);
    }

    /* ---- Greatsword ---- */
    .sword-container {
      position: absolute; pointer-events: none; z-index: 41;
      top: 50%; left: 50%; width: 0; height: 0;
    }
    .greatsword-wrapper {
      position: absolute; left: 0px; top: -20px;
      width: 140px; height: 40px;
      filter: drop-shadow(0 0 12px #ff0000) drop-shadow(0 0 5px #ff4400);
      transform-origin: 10px 20px;
      transform: rotate(45deg);
      display: flex; align-items: center; justify-content: center;
    }
    .greatsword-blade {
      width: 100%; height: 100%;
    }

    /* ---- Sword Slash Arc ---- */
    .sword-slash {
      position: absolute; pointer-events: none; z-index: 40;
      transform: translate(-50%, -50%);
      width: 0; height: 0;
    }
    .slash-swoosh {
      position: absolute; width: 340px; height: 340px;
      top: 50%; left: 50%; transform: translate(-50%, -50%);
      border-radius: 50%;
      background: conic-gradient(from 75deg at 50% 50%, transparent 0%, rgba(255, 0, 0, 0.4) 10deg, rgba(255, 68, 0, 0.9) 25deg, #fff 30deg, transparent 35deg);
      mask-image: radial-gradient(circle, transparent 15%, black 20%, black 45%, transparent 50%);
      -webkit-mask-image: radial-gradient(circle, transparent 15%, black 20%, black 45%, transparent 50%);
      opacity: 0;
      filter: drop-shadow(0 0 15px #ff2200);
    }

    /* Frenzy vignette */
    .frenzy-vignette {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      pointer-events: none; z-index: 100;
      box-shadow: inset 0 0 150px rgba(255,0,0,0.3);
      opacity: 0; transition: opacity 0.3s;
    }
    .frenzy-vignette.active { opacity: 1; animation: vigPulse 1s ease-in-out infinite; }
    @keyframes vigPulse {
      0%,100% { box-shadow: inset 0 0 150px rgba(255,0,0,0.2); }
      50% { box-shadow: inset 0 0 200px rgba(255,0,0,0.4); }
    }
  `;
  document.head.appendChild(s);
}

// ========== DOM Creation ==========
function createCrimsonGhostDOM() {
  injectBerserkerCSS();
  const el = document.createElement('div');
  el.className = 'crimson-ghost';

  const body = document.createElement('div');
  body.className = 'ghost-body';

  // Grid cells (solid body)
  ['gt0', 'gt1', 'gt2', 'gt3', 'gt4', 'gs0', 'gs1', 'gs2', 'gs3', 'gs4', 'gs5'].forEach(c => {
    const d = document.createElement('div'); d.className = c; body.appendChild(d);
  });
  // Flickering bottom cells
  ['ga1', 'ga6', 'ga7', 'ga8', 'ga11', 'ga12', 'ga13', 'ga18'].forEach(c => {
    const d = document.createElement('div'); d.className = c + ' cf0'; body.appendChild(d);
  });
  ['ga2', 'ga3', 'ga4', 'ga5', 'ga9', 'ga10', 'ga14', 'ga15', 'ga16', 'ga17'].forEach(c => {
    const d = document.createElement('div'); d.className = c + ' cf1'; body.appendChild(d);
  });
  // Eyes & pupils
  ['ghost-pupil ghost-pupil-l', 'ghost-pupil ghost-pupil-r', 'ghost-eye ghost-eye-l', 'ghost-eye ghost-eye-r'].forEach(c => {
    const d = document.createElement('div'); d.className = c; body.appendChild(d);
  });
  el.appendChild(body);

  // Shadow
  const shadow = document.createElement('div'); shadow.className = 'ghost-shadow';
  el.appendChild(shadow);
  return el;
}

function createSwordDOM() {
  const el = document.createElement('div');
  el.className = 'sword-container';
  const wrap = document.createElement('div'); wrap.className = 'greatsword-wrapper';
  const blade = document.createElement('div'); blade.className = 'greatsword-blade';
  blade.innerHTML = `
<svg width="140" height="40" viewBox="0 0 140 40">
  <defs>
    <linearGradient id="sGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#111" />
      <stop offset="40%" stop-color="#400" />
      <stop offset="80%" stop-color="#900" />
      <stop offset="100%" stop-color="#ff2200" />
    </linearGradient>
  </defs>
  <!-- Handle -->
  <rect x="0" y="15" width="25" height="10" fill="#222" stroke="#444"/>
  <circle cx="2" cy="20" r="5" fill="#f00"/>

  <!-- Crossguard -->
  <path d="M20,2 L26,6 L26,34 L20,38 Z" fill="#111" stroke="#f00" stroke-width="1"/>

  <!-- Massive Brutalist Symmetrical Blade -->
  <path d="M26,6 L105,6 L135,20 L105,34 L26,34 Z" fill="url(#sGrad)" stroke="#ff2200" stroke-width="1.5" stroke-linejoin="round"/>
  
  <!-- Central Blood Groove -->
  <path d="M30,17 L100,17 L110,20 L100,23 L30,23 Z" fill="#000"/>
  
  <!-- Glowing red line in groove -->
  <line x1="30" y1="20" x2="105" y2="20" stroke="#ff0000" stroke-width="2" filter="blur(1px)"/>
  <line x1="30" y1="20" x2="105" y2="20" stroke="#fff" stroke-width="0.5"/>
</svg>`;
  wrap.appendChild(blade);
  el.appendChild(wrap);
  return el;
}

function createSlashDOM() {
  const el = document.createElement('div');
  el.className = 'sword-slash';
  const swoosh = document.createElement('div'); swoosh.className = 'slash-swoosh';
  el.appendChild(swoosh);
  return el;
}

function createVignetteDOM() {
  const el = document.createElement('div');
  el.className = 'frenzy-vignette';
  return el;
}

// ========== Public API ==========

export function createBerserker(W, H) {
  injectBerserkerCSS();

  const ghost = createCrimsonGhostDOM();
  document.getElementById('game-container').appendChild(ghost);
  const vignette = createVignetteDOM();
  document.getElementById('game-container').appendChild(vignette);
  const sword = createSwordDOM();
  document.getElementById('game-container').appendChild(sword);
  const slash = createSlashDOM();
  document.getElementById('game-container').appendChild(slash);

  // Overlay Canvas for advanced 2D effects
  const canvas = document.createElement('canvas');
  canvas.id = 'berserker-canvas';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '35'; // Draw above entities, below UI
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.getElementById('game-container').appendChild(canvas);

  // Handle resize for the overlay canvas
  window.addEventListener('resize', () => {
    if (document.getElementById('berserker-canvas')) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });

  return {
    faction: 'player',
    type: 'melee',
    x: W / 2, y: H / 2, angle: 0, radius: BK.RADIUS,
    speed: BK.SPEED, hp: BK.MAX_HP, maxHp: BK.MAX_HP,
    _ghostEl: ghost, _swordEl: sword, _slashEl: slash, _canvasEl: canvas, _vignetteEl: vignette,

    // Rolling (Shadow Step)
    rolling: false, rollT: 0, rollDur: BK.ROLL_DURATION, rollCd: 0, rollCdMax: BK.ROLL_COOLDOWN,
    rollDx: 0, rollDy: 0, invincible: false,
    shadowStepBoost: false, shadowStepTimer: 0,

    // Melee combo
    swinging: false,
    swingCombo: 0,        // 0, 1, 2 (three hit combo)
    swingTimer: 0,        // frames left in current swing
    swingCooldown: 0,     // frames until next swing allowed
    swingAngle: 0,        // direction of current swing
    swingActive: false,   // true during damage frames
    autoSwing: false,     // mouse held = auto combo

    // Rage & Frenzy
    rage: 0,
    frenzy: false,
    frenzyTimer: 0,
    frenzyWaves: [],

    // V2 New Projectiles
    crossSlashes: [],
    moonSevers: [],
    smashes: [],

    // Frenzy-exclusive projectiles
    fWhirlwinds: [],      // Blood Whirlwind AOE
    fThousandCuts: [],    // Thousand Cuts slash lines
    fInfernoSlams: [],    // Inferno Slam ground cracks

    // Kill Intent & Execution
    killIntent: 0,           // 0~8, charged by hits during frenzy
    executing: false,        // true during Crimson Execution
    execTimer: 0,
    execPhase: 0,            // 0=idle, 1=lock, 2=dash, 3=sweep, 4=freeze, 5=return
    execTarget: null,        // {x, y} of locked target
    execOrigin: null,        // {x, y} player start position
    execSweep: null,         // sweep hitbox data

    // Skills (placeholder for Q/E)
    skill1Cd: 0, skill1Max: BK.CHARGE_COOLDOWN,
    skill2Cd: 0, skill2Max: BK.FRENZY_COOLDOWN,

    // Compatibility fields for HUD and other systems
    weapon: -1,           // -1 = melee
    shootCd: 0,
    plasmaCharge: 0, plasmaFiring: false, plasmaFireTimer: 0, plasmaFireAngle: 0, plasmaFireCharge: 0,
    plasmaOn: false, plasmaHist: [],
    comboSpeed: 0,
    rollDmgBoost: false, rollDmgTimer: 0,

    // 居合斩 (Charge Draw Slash)
    charging: false,          // 是否正在蓄力
    chargeTimer: 0,           // 蓄力帧数计数器
    chargeTier: 0,            // 当前蓄力阶段 (0/1/2/3)
    chargeReady: false,       // 满蓄闪光是否已触发
    chargeSlashes: [],        // 活跃的斩击投射物
    chargeAftermaths: [],     // 待触发的延迟伤害事件

    // 叠伤 buff
    atkStacks: [],            // 每个元素是该层剩余帧数

    // 终极处决 (Ultimate Execution)
    ultCharging: false,       // 是否正在长按蓄力
    ultChargeTimer: 0,        // 蓄力计时器
    ultActive: false,         // 是否正在执行终极处决
    ultTargets: [],           // 锁定的目标列表 [{x,y,ref}]
    ultCurrentIdx: 0,         // 当前追击目标索引
    ultPhase: 'idle',         // 'dash'|'slash'|'pause'|'done'
    ultSlashTimer: 0,
    ultPauseTimer: 0,
    ultTrail: [],             // 残影轨迹
  };
}

export function resetBerserker(P, W, H) {
  P.x = W / 2; P.y = H / 2; P.hp = BK.MAX_HP; P.maxHp = BK.MAX_HP;
  P.radius = BK.RADIUS; P.speed = BK.SPEED;
  P.rolling = false; P.rollCd = 0; P.invincible = false;
  P.shadowStepBoost = false; P.shadowStepTimer = 0;
  P.swinging = false; P.swingCombo = 0; P.swingTimer = 0; P.swingCooldown = 0;
  P.swingActive = false; P.autoSwing = false;
  P.rage = 0; P.frenzy = false; P.frenzyTimer = 0; P.frenzyWaves = [];
  P.crossSlashes = []; P.moonSevers = []; P.smashes = [];
  P.fWhirlwinds = []; P.fThousandCuts = []; P.fInfernoSlams = [];
  P.killIntent = 0; P.executing = false; P.execTimer = 0; P.execPhase = 0;
  P.execTarget = null; P.execOrigin = null; P.execSweep = null;
  P.skill1Cd = 0; P.skill2Cd = 0;
  P.charging = false; P.chargeTimer = 0; P.chargeTier = 0; P.chargeReady = false;
  P.chargeSlashes = []; P.chargeAftermaths = [];
  P.atkStacks = [];
  P.ultCharging = false; P.ultChargeTimer = 0; P.ultActive = false;
  P.ultTargets = []; P.ultCurrentIdx = 0; P.ultPhase = 'idle';
  P.ultSlashTimer = 0; P.ultPauseTimer = 0; P.ultTrail = [];
  // Remove DOM elements
  if (P._ghostEl) { P._ghostEl.remove(); P._ghostEl = null; }
  if (P._swordEl) { P._swordEl.remove(); P._swordEl = null; }
  if (P._slashEl) { P._slashEl.remove(); P._slashEl = null; }
  if (P._vignetteEl) { P._vignetteEl.remove(); P._vignetteEl = null; }
  if (P._canvasEl) { P._canvasEl.remove(); P._canvasEl = null; }
}

export function updateBerserker(P, keys, mouse, W, H, particles) {
  // Ultimate execution takes over all control
  if (P.ultActive) {
    P.invincible = true;
    return; // updateUltimateExecution is called from GameScene
  }

  const isActionLocked = P.chargeAftermaths.some(a => !a.triggered);
  // Block inputs during the 'sheathing' pose of drawing slash
  const effKeys = isActionLocked ? {} : keys;
  const effMouse = isActionLocked ? { ...mouse, down: false } : mouse;

  if (isActionLocked) {
    P.invincible = true;
  } else if (!P.rolling && !P.ultActive) {
    P.invincible = false;
  }

  if (!isActionLocked && !P.executing) {
    P.angle = ang(P, effMouse);
  }

  // Movement
  let mx = 0, my = 0;
  if (effKeys['w'] || effKeys['arrowup']) my = -1;
  if (effKeys['s'] || effKeys['arrowdown']) my = 1;
  if (effKeys['a'] || effKeys['arrowleft']) mx = -1;
  if (effKeys['d'] || effKeys['arrowright']) mx = 1;
  const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;

  // Snare (web spray) — hard position lock, no escape
  if (P.snared > 0) {
    P.snared--;
    if (P.snareX !== undefined) { P.x = P.snareX; P.y = P.snareY; }
    else { P.snareX = P.x; P.snareY = P.y; }
  } else {
    P.snareTier = 0; P.snareX = undefined; P.snareY = undefined;
  }
  if (P.webSlowed > 0) P.webSlowed--;
  const webSlowMult = (P.webSlowed > 0 && !P.rolling) ? 0.5 : 1;
  const effSpeed = (P.snared > 0 ? 0 : P.speed * (P.frenzy ? BK.FRENZY_MOVE_SPEED_MULT : 1) * (P.charging ? BK.CHARGE_MOVE_MULT : 1)) * webSlowMult;

  // Shadow Step (roll)
  if (P.rolling) {
    P.rollT--;
    P.x += P.rollDx * BK.ROLL_SPEED;
    P.y += P.rollDy * BK.ROLL_SPEED;
    P.invincible = true;
    // Shadow trail particles
    particles.spawn(P.x, P.y, '#880000', 8, 4, 15, 2);
    particles.spawn(P.x - P.rollDx * 10, P.y - P.rollDy * 10, '#ff0000', 10, 3, 20, 3);
    if (P.rollT <= 0) {
      P.rolling = false; P.invincible = false;
      P.rollCd = P.rollCdMax;
    }
  } else {
    P.x += mx * effSpeed; P.y += my * effSpeed;
    // Moving particles (dark exhaust)
    if ((mx !== 0 || my !== 0) && Math.random() > 0.5) {
      const ex = P.x + Math.cos(P.angle + Math.PI) * 10;
      const ey = P.y + Math.sin(P.angle + Math.PI) * 10;
      particles.spawn(ex, ey, '#880000', 3, 2, 8, 1);
    }
  }

  // Clamp to bounds
  P.x = clamp(P.x, P.radius, W - P.radius);
  P.y = clamp(P.y, P.radius, H - P.radius);

  // Roll cooldown
  if (P.rollCd > 0) P.rollCd--;

  // Initiate Shadow Step
  if ((effKeys[' '] || effKeys['shift']) && !P.rolling && P.rollCd <= 0) {
    P.rolling = true;
    P.rollT = P.rollDur;
    const hasDir = mx !== 0 || my !== 0;
    P.rollDx = hasDir ? mx : Math.cos(P.angle);
    P.rollDy = hasDir ? my : Math.sin(P.angle);
  }

  // Shadow Step damage boost timer
  if (P.shadowStepTimer > 0) P.shadowStepTimer--;
  if (P.shadowStepTimer <= 0) P.shadowStepBoost = false;

  // === Melee Swing ===
  if (P.swingCooldown > 0) P.swingCooldown--;

  // Auto-swing while mouse held
  if (P.autoSwing && !P.swinging && P.swingCooldown <= 0 && !P.rolling) {
    startSwing(P, particles);
  }

  // === 叠伤衰减：逐层倒计时 ===
  if (P.atkStacks) {
    P.atkStacks = P.atkStacks.filter(t => t > 0);
    for (let i = 0; i < P.atkStacks.length; i++) P.atkStacks[i]--;
  }

  // Update current swing
  if (P.swinging) {
    let dur = BK.CROSS_DURATION;
    if (P.swingCombo === 1) dur = BK.MOON_DURATION;
    if (P.swingCombo === 2) dur = BK.SMASH_DURATION;
    if (P.frenzy) dur = Math.floor(dur / BK.FRENZY_SPEED_MULT);

    P.swingTimer--;

    // Trigger smash midway through animation
    if (P.swingCombo === 2 && P.swingTimer === Math.floor(dur * BK.SMASH_TRIGGER)) {
      P.smashes.push({
        x: P.x + Math.cos(P.swingAngle) * BK.SMASH_OFFSET,
        y: P.y + Math.sin(P.swingAngle) * BK.SMASH_OFFSET,
        radius: BK.SMASH_RADIUS * (P.frenzy ? BK.FRENZY_RANGE_MULT : 1),
        life: BK.SMASH_LIFE, maxLife: BK.SMASH_LIFE,
        id: P.swingId,
        dmg: BK.SMASH_DAMAGE * (P.shadowStepBoost ? BK.SHADOW_STEP_DMG_BOOST : 1)
      });
      P.shadowStepBoost = false; P.shadowStepTimer = 0;
    }

    if (P.swingTimer <= 0) {
      let cd = (P.swingCombo === 0) ? BK.CROSS_COOLDOWN : (P.swingCombo === 1 ? BK.MOON_COOLDOWN : BK.SMASH_COOLDOWN);
      P.swingCooldown = P.frenzy ? Math.floor(cd / BK.FRENZY_SPEED_MULT) : cd;
      P.swinging = false;
      P.swingCombo = (P.swingCombo + 1) % 3;
    }
  }

  // Update Projectiles / AoEs
  P.crossSlashes = P.crossSlashes.filter(c => --c.life > 0);
  P.moonSevers = P.moonSevers.filter(m => {
    m.x += m.vx; m.y += m.vy;
    return --m.life > 0;
  });
  P.smashes = P.smashes.filter(s => --s.life > 0);

  // Update Frenzy-exclusive projectiles
  P.fWhirlwinds = P.fWhirlwinds.filter(w => {
    w.spin += 0.5; // spin rendering angle
    return --w.life > 0;
  });
  P.fThousandCuts = P.fThousandCuts.filter(tc => {
    if (tc.delay > 0) { tc.delay--; return true; }
    return --tc.life > 0;
  });
  P.fInfernoSlams = P.fInfernoSlams.filter(s => {
    const t = 1 - (s.life / s.maxLife);
    if (t < 0.35) s.phase = 'rise';
    else if (t < 0.55) s.phase = 'slam';
    else s.phase = 'crack';
    return --s.life > 0;
  });

  // Update Frenzy Waves (AoE burst)
  P.frenzyWaves = P.frenzyWaves.filter(w => {
    w.radius += (w.maxRadius - w.radius) * 0.2;
    return --w.life > 0;
  });

  // Frenzy timer
  if (P.frenzy) {
    P.frenzyTimer--;
    if (P.frenzyTimer <= 0) {
      P.frenzy = false;
      P.killIntent = 0; // 狂暴结束清空杀意
    }
  }

  // === 居合斩 (Charge Attack) Update ===
  if (P.charging && !P.rolling && !P.executing) {
    P.chargeTimer++;
    // Determine tier
    const prevTier = P.chargeTier;
    if (P.chargeTimer >= BK.CHARGE_TIER3_FRAMES) P.chargeTier = 3;
    else if (P.chargeTimer >= BK.CHARGE_TIER2_FRAMES) P.chargeTier = 2;
    else if (P.chargeTimer >= BK.CHARGE_TIER1_FRAMES) P.chargeTier = 1;
    else P.chargeTier = 0;
    // Tier-up particle burst
    if (P.chargeTier > prevTier) {
      const colors = ['', '#ff8800', '#ff2200', '#ffffff'];
      particles.spawn(P.x, P.y, colors[P.chargeTier], 15, 4, 20, 4);
      if (P.chargeTier === 3) P.chargeReady = true;
    }
    // Cancel normal swing during charge
    P.autoSwing = false;
  }

  // Update active charge slashes (the visual line traveling across screen)
  P.chargeSlashes = P.chargeSlashes.filter(s => {
    s.life--;
    s.travel += s.speed;
    return s.life > 0;
  });

  // Update aftermath delayed damage events
  P.chargeAftermaths = P.chargeAftermaths.filter(a => {
    a.delay--;
    return a.delay > 0 || !a.triggered; // keep until triggered
  });

  // Skill cooldowns
  if (P.skill1Cd > 0) P.skill1Cd--;
  if (P.skill2Cd > 0) P.skill2Cd--;
}

function startSwing(P, particles) {
  if (P.executing) return; // can't swing during execution

  P.swinging = true;
  P.swingAngle = P.angle;
  const combo = P.swingCombo;

  // 叠伤：每次平A加一层，最多8层
  if (!P.atkStacks) P.atkStacks = [];
  if (P.atkStacks.length < BK.ATK_STACK_MAX) {
    P.atkStacks.push(BK.ATK_STACK_DURATION);
  } else {
    // 刷新最早那层的时间
    P.atkStacks[0] = BK.ATK_STACK_DURATION;
  }

  // Use frenzy-exclusive combos during frenzy mode
  if (P.frenzy) {
    let dur;
    if (combo === 0) dur = BK.F_WHIRLWIND_DURATION;
    else if (combo === 1) dur = BK.F_THOUSAND_DURATION;
    else dur = BK.F_INFERNO_DURATION;
    // Still apply frenzy speed and rage bonus
    const rageSpeedBonus = 1 - (P.rage / BK.RAGE_MAX) * BK.RAGE_ATTACK_SPEED_BONUS;
    dur = Math.max(4, Math.floor(dur * rageSpeedBonus));
    P.swingTimer = dur;
    P.swingId = (P.swingId || 0) + 1;

    if (combo === 0) {
      // === Blood Whirlwind: 360° spin AOE ===
      P.fWhirlwinds.push({
        x: P.x, y: P.y, angle: P.angle, life: BK.F_WHIRLWIND_LIFE, maxLife: BK.F_WHIRLWIND_LIFE,
        id: P.swingId, radius: BK.F_WHIRLWIND_RADIUS, dmg: BK.F_WHIRLWIND_DAMAGE,
        spin: 0 // current spin angle for rendering
      });
      // Particle burst: ring explosion
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 / 12) * i;
        const d = 40 + Math.random() * 30;
        particles.spawnSquares(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, '#ff2200', 4, 3, 12, 3);
      }
      particles.spawn(P.x, P.y, '#ff6600', 8, 4, 15, 4);

    } else if (combo === 1) {
      // === Thousand Cuts: 5 rapid fan slashes ===
      const halfArc = BK.F_THOUSAND_ARC / 2;
      for (let i = 0; i < BK.F_THOUSAND_COUNT; i++) {
        const slashAngle = P.angle - halfArc + (BK.F_THOUSAND_ARC / (BK.F_THOUSAND_COUNT - 1)) * i;
        const delay = i * BK.F_THOUSAND_DELAY;
        P.fThousandCuts.push({
          x: P.x, y: P.y, angle: slashAngle, life: BK.F_THOUSAND_LIFE, maxLife: BK.F_THOUSAND_LIFE,
          id: P.swingId + i, range: BK.F_THOUSAND_RANGE, dmg: BK.F_THOUSAND_DAMAGE,
          delay
        });
      }
      // Ghost afterimage particles
      particles.spawnSquares(P.x, P.y, '#ff4400', 15, 6, 25, 5);
      P.x += Math.cos(P.angle) * BK.F_THOUSAND_LUNGE; P.y += Math.sin(P.angle) * BK.F_THOUSAND_LUNGE;

    } else {
      // === Inferno Slam: jump + ground slam ===
      P.fInfernoSlams.push({
        x: P.x, y: P.y, angle: P.angle, life: BK.F_INFERNO_LIFE, maxLife: BK.F_INFERNO_LIFE,
        id: P.swingId, radius: BK.F_INFERNO_RADIUS, dmg: BK.F_INFERNO_DAMAGE,
        phase: 'rise'
      });
      P.x += Math.cos(P.angle) * BK.F_INFERNO_LUNGE; P.y += Math.sin(P.angle) * BK.F_INFERNO_LUNGE;
      // Huge particle kickup
      particles.spawn(P.x, P.y, '#ff0000', 30, 10, 40, 8);
      particles.spawnSquares(P.x, P.y, '#ff4400', 20, 7, 35, 6);
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i;
        particles.spawn(P.x + Math.cos(a) * 50, P.y + Math.sin(a) * 50, '#880000', 6, 3, 20, 4);
      }
    }
    return; // frenzy attacks don't use normal combo code below
  }

  // === Normal (non-frenzy) combo ===
  let dur = BK.CROSS_DURATION;
  if (combo === 1) dur = BK.MOON_DURATION;
  if (combo === 2) dur = BK.SMASH_DURATION;
  // Subtle rage-based attack speed bonus: 0-15% faster at max rage
  const rageSpeedBonus = 1 - (P.rage / BK.RAGE_MAX) * BK.RAGE_ATTACK_SPEED_BONUS;
  dur = Math.max(4, Math.floor(dur * rageSpeedBonus));

  P.swingTimer = dur;
  P.swingId = (P.swingId || 0) + 1;

  // Lunge and spawn entities based on combo
  if (combo === 0) {
    // Cross Slash
    const dmg = BK.CROSS_DAMAGE * (P.shadowStepBoost ? BK.SHADOW_STEP_DMG_BOOST : 1);
    P.crossSlashes.push({
      x: P.x, y: P.y, angle: P.angle, life: 10, maxLife: 10,
      id: P.swingId, range: BK.CROSS_RANGE, dmg
    });
    P.shadowStepBoost = false; P.shadowStepTimer = 0;
    P.x += Math.cos(P.angle) * BK.CROSS_LUNGE; P.y += Math.sin(P.angle) * BK.CROSS_LUNGE;
    particles.spawnSquares(P.x, P.y, '#ffffff', 8, 3, 10, 3);
  } else if (combo === 1) {
    // Moon Sever
    const dmg = BK.MOON_DAMAGE * (P.shadowStepBoost ? BK.SHADOW_STEP_DMG_BOOST : 1);
    const speed = BK.MOON_SPEED;
    const life = Math.ceil(BK.MOON_RANGE / speed);
    P.moonSevers.push({
      x: P.x, y: P.y, angle: P.angle, life, maxLife: life,
      vx: Math.cos(P.angle) * speed, vy: Math.sin(P.angle) * speed,
      id: P.swingId, radius: BK.MOON_RADIUS, dmg
    });
    P.shadowStepBoost = false; P.shadowStepTimer = 0;
    P.x += Math.cos(P.angle) * BK.MOON_LUNGE; P.y += Math.sin(P.angle) * BK.MOON_LUNGE;
    particles.spawnSquares(P.x, P.y, '#ff0000', 10, 4, 15, 3);
  }
  if (combo === 2) {
    P.x += Math.cos(P.angle) * BK.SMASH_OFFSET; P.y += Math.sin(P.angle) * BK.SMASH_OFFSET;
    particles.spawn(P.x, P.y, '#660000', 15, 6, 20, 5);
  }
}

// ========== CRIMSON EXECUTION (right-click) ==========

/** Start the execution if enough kill intent (frenzy only) */
export function startExecution(P, enemies, bosses, particles) {
  if (!P.frenzy || P.executing || P.killIntent < (BK.EXEC_KILL_INTENT_COST || 2)) return false;

  // Find closest enemy or boss (within 500px)
  let target = null, minDist = BK.EXEC_LOCK_RANGE;
  enemies.forEach(e => {
    if (e.hp <= 0 || e.faction === 'ally' || e.faction === 'player') return;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (d < minDist) { minDist = d; target = e; }
  });
  bosses.forEach(b => {
    if (b.hp <= 0 || b.entered === false) return;
    const d = Math.hypot(b.x - P.x, b.y - P.y);
    if (d < minDist) { minDist = d; target = b; }
  });
  if (!target) return false;

  P.executing = true;
  P.execTimer = BK.EXEC_DURATION;
  P.execPhase = 1;
  P.execTarget = { x: target.x, y: target.y, ref: target };
  P.execOrigin = { x: P.x, y: P.y };
  P.execSweep = null;
  P.execTrail = null;
  P.execDashed = false;
  P.execBloodBurst = false;
  P.execSlashT = 0;
  P.execLockT = 0;
  P.execFlashT = 0;
  P.execFadeT = 0;
  P.killIntent -= (BK.EXEC_KILL_INTENT_COST || 2); // 消耗2层杀意
  P.swinging = false;

  // Darken vignette overlay
  if (P._vignetteEl) P._vignetteEl.style.opacity = '0.8';

  particles.spawn(P.x, P.y, '#ff0000', 15, 5, 20, 4);
  return true;
}

/** Update execution phases each frame */
export function updateExecution(P, particles) {
  if (!P.executing) return;
  P.execTimer--;

  const totalFrames = BK.EXEC_DURATION;
  const t = 1 - (P.execTimer / totalFrames); // 0→1

  if (t < 0.10) {
    // ── Phase 1: DEATH GAZE (lock-on) ──
    P.execPhase = 1;
    const tgt = P.execTarget;
    if (tgt && tgt.ref) { tgt.x = tgt.ref.x; tgt.y = tgt.ref.y; }
    // Store lock sigil shrink progress
    P.execLockT = t / 0.10; // 0→1

  } else if (t < 0.30) {
    // ── Phase 2: SHADOW DASH (instant teleport + afterimage) ──
    P.execPhase = 2;
    const tgt = P.execTarget;
    if (tgt && tgt.ref) { tgt.x = tgt.ref.x; tgt.y = tgt.ref.y; }

    // On first frame of dash: instant teleport behind target
    if (!P.execDashed) {
      P.execDashed = true;
      // Store afterimage trail points from origin to dest
      const behindAngle = Math.atan2(P.execOrigin.y - tgt.y, P.execOrigin.x - tgt.x);
      const destX = tgt.x - Math.cos(behindAngle) * BK.EXEC_DASH_OFFSET;
      const destY = tgt.y - Math.sin(behindAngle) * BK.EXEC_DASH_OFFSET;
      // Store afterimage trail for rendering
      P.execTrail = [];
      const steps = BK.EXEC_AFTERIMAGE_STEPS;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        P.execTrail.push({
          x: P.execOrigin.x + (destX - P.execOrigin.x) * frac,
          y: P.execOrigin.y + (destY - P.execOrigin.y) * frac,
          alpha: 1 - frac * 0.5
        });
      }
      P.x = destX; P.y = destY;
      // Arrival burst: sharp ring
      particles.spawn(P.x, P.y, '#ff0000', 6, 3, 12, 3);
      particles.spawnSquares(P.x, P.y, '#ffffff', 4, 2, 8, 2);
    }
    // Fade afterimage trail
    if (P.execTrail) {
      P.execTrail.forEach(pt => { pt.alpha *= BK.EXEC_AFTERIMAGE_DECAY; });
    }

  } else if (t < 0.60) {
    // ── Phase 3: IAI SLASH (blade draw + bezier crescent) ──
    P.execPhase = 3;
    const slashT = (t - 0.30) / 0.30; // 0→1 within this phase
    // Non-linear: burst at the end (the blade flashes out explosively)
    P.execSlashT = Math.pow(slashT, 0.25); // aggressive ease-out

    if (!P.execSweep) {
      const sweepAngle = Math.atan2(P.execTarget.y - P.y, P.execTarget.x - P.x);
      P.execSweep = {
        x: P.x, y: P.y, angle: sweepAngle,
        radius: BK.EXEC_RANGE, dmg: BK.EXEC_DAMAGE,
        life: 18, maxLife: 18, id: (P.swingId || 0) + 999,
        arc: BK.EXEC_ARC
      };
      P.swingAngle = sweepAngle;
      // Directional debris particles (thin, fast, along slash tangent)
      for (let i = 0; i < 30; i++) {
        const a = sweepAngle - BK.EXEC_ARC / 2 + Math.random() * BK.EXEC_ARC;
        const d = 80 + Math.random() * 180;
        const c = Math.random() > 0.3 ? '#ff2200' : '#ffffff';
        particles.spawn(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, c, 3, 2, 18, 2);
      }
    }

  } else if (t < 0.80) {
    // ── Phase 4: FREEZE (hitstop + flash) ──
    P.execPhase = 4;
    P.execFlashT = (t - 0.60) / 0.20; // 0→1

  } else {
    // ── Phase 5: ZANSHIN (fade + delayed hit reaction) ──
    P.execPhase = 5;
    P.execFadeT = (t - 0.80) / 0.20; // 0→1
    // Delayed blood burst on target (the "cut appears after sheathing")
    if (!P.execBloodBurst && P.execTarget && P.execTarget.ref) {
      P.execBloodBurst = true;
      const ref = P.execTarget.ref;
      // Send target flying away from player
      const ka = Math.atan2(ref.y - P.y, ref.x - P.x);
      ref.vx = (ref.vx || 0) + Math.cos(ka) * BK.EXEC_KNOCKBACK;
      ref.vy = (ref.vy || 0) + Math.sin(ka) * BK.EXEC_KNOCKBACK;
      // Massive blood explosion on target
      particles.spawn(ref.x, ref.y, '#ff0000', 25, 8, 35, 6);
      particles.spawnSquares(ref.x, ref.y, '#ff2200', 15, 6, 30, 5);
      particles.spawn(ref.x, ref.y, '#ffffff', 8, 3, 15, 4);
    }
  }

  if (P.execTimer <= 0) {
    P.executing = false;
    P.execPhase = 0;
    P.execTarget = null;
    P.execSweep = null;
    P.execTrail = null;
    P.execDashed = false;
    P.execBloodBurst = false;
    P.execSlashT = 0;
    P.execLockT = 0;
    P.execFlashT = 0;
    P.execFadeT = 0;
    if (P._vignetteEl) P._vignetteEl.style.opacity = '';
  }
}

// ========== ULTIMATE EXECUTION (hold right-click 3s at max kill intent) ==========

/** Start ultimate: lock all enemies on screen, auto-chase slash each */
export function startUltimateExecution(P, enemies, bosses, particles) {
  if (!P.frenzy || P.executing || P.ultActive) return false;
  if (P.killIntent < (BK.EXEC_KILL_INTENT_MAX || 10)) return false;

  // Collect ALL visible enemy targets
  const targets = [];
  enemies.forEach(e => {
    if (e.hp > 0 && e.faction !== 'ally' && e.faction !== 'player') {
      targets.push({ x: e.x, y: e.y, ref: e });
    }
  });
  bosses.forEach(b => {
    if (b === P) return; // skip self (shouldn't happen but safety)
    if (b.hp > 0 && b.entered !== false && b.faction !== 'ally' && b.faction !== 'player') {
      targets.push({ x: b.x, y: b.y, ref: b });
    }
  });

  if (targets.length === 0) return false;

  // Sort by distance (closest first)
  targets.sort((a, b) => {
    const da = Math.hypot(a.x - P.x, a.y - P.y);
    const db = Math.hypot(b.x - P.x, b.y - P.y);
    return da - db;
  });

  P.ultActive = true;
  P.ultTargets = targets;
  P.ultCurrentIdx = 0;
  P.ultPhase = 'vanish'; // Start with vanish phase
  P.ultSlashTimer = 0;
  P.ultPauseTimer = 0;
  P.ultTrail = [];
  P.ultOrigin = { x: P.x, y: P.y };
  P.killIntent = 0;
  P.swinging = false;
  P.invincible = true;

  // Darken screen
  if (P._vignetteEl) P._vignetteEl.style.opacity = '0.9';

  particles.spawn(P.x, P.y, '#ff0000', 30, 8, 30, 6);
  return true;
}

/** Update ultimate execution each frame */
export function updateUltimateExecution(P, particles, gameState) {
  if (!P.ultActive) return;

  // Phase 0: Vanish (audio boom, character disappears)
  if (P.ultPhase === 'vanish') {
    P.ultSlashTimer++;
    if (P.ultSlashTimer === 1) {
      particles.spawn(P.x, P.y, '#000000', 40, 10, 50, 8);
      particles.spawn(P.x, P.y, '#ff0000', 30, 8, 40, 6);
      P.ultTrail.push({ x: P.x, y: P.y, age: 0, isWhiteVanish: true });
    }
    const vanishTime = BK.ULTIMATE_VANISH_FRAMES || 15;
    if (P.ultSlashTimer >= vanishTime) {
      P.ultSlashTimer = 0;
      P.ultPhase = 'teleport'; // Go to teleport instead of dash
    }
    return;
  }

  // Phase 1: Teleport to target (instant, like normal execution Phase 2)
  if (P.ultPhase === 'teleport') {
    // Skip dead/invalid targets
    while (P.ultCurrentIdx < P.ultTargets.length) {
      const tgt = P.ultTargets[P.ultCurrentIdx];
      if (tgt && tgt.ref && tgt.ref.hp > 0) break;
      P.ultCurrentIdx++;
    }
    // All targets processed → go to zanshin
    if (P.ultCurrentIdx >= P.ultTargets.length) {
      P.ultPhase = 'zanshin';
      P.ultSlashTimer = 0;
      return;
    }

    const tgt = P.ultTargets[P.ultCurrentIdx];
    if (tgt.ref) { tgt.x = tgt.ref.x; tgt.y = tgt.ref.y; }

    // Store origin for afterimage trail
    const originX = P.x, originY = P.y;

    // Teleport behind target (like normal exec Phase 2)
    const behindAngle = Math.atan2(originY - tgt.y, originX - tgt.x);
    const destX = tgt.x - Math.cos(behindAngle) * (BK.EXEC_DASH_OFFSET || 40);
    const destY = tgt.y - Math.sin(behindAngle) * (BK.EXEC_DASH_OFFSET || 40);

    // Generate afterimage trail from origin to destination
    const steps = BK.EXEC_AFTERIMAGE_STEPS || 6;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      P.ultTrail.push({
        x: originX + (destX - originX) * frac,
        y: originY + (destY - originY) * frac,
        age: 0, isAfterimage: true, alpha: 1 - frac * 0.5
      });
    }

    // Instant teleport
    P.x = destX;
    P.y = destY;
    P.angle = Math.atan2(tgt.y - P.y, tgt.x - P.x);
    P.swingAngle = P.angle;

    // Arrival burst particles
    particles.spawn(P.x, P.y, '#ff0000', 6, 3, 12, 3);
    particles.spawnSquares(P.x, P.y, '#ffffff', 4, 2, 8, 2);

    // Create execSweep (270° arc slash, same as normal exec Phase 3)
    const sweepAngle = Math.atan2(tgt.y - P.y, tgt.x - P.x);
    P.ultSweep = {
      x: P.x, y: P.y, angle: sweepAngle,
      radius: BK.EXEC_RANGE || 180, dmg: 0, // No damage now, delayed to zanshin
      life: 12, maxLife: 12,
      arc: BK.EXEC_ARC || (Math.PI * 1.5)
    };

    // Slash debris particles (along sweep arc)
    for (let i = 0; i < 20; i++) {
      const a = sweepAngle - (BK.EXEC_ARC || Math.PI * 1.5) / 2 + Math.random() * (BK.EXEC_ARC || Math.PI * 1.5);
      const d = 60 + Math.random() * 120;
      const c = Math.random() > 0.3 ? '#ff2200' : '#ffffff';
      particles.spawn(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, c, 3, 2, 14, 2);
    }

    gameState.screenShake = 12;
    P.ultSlashTimer = BK.ULTIMATE_HITSTOP_FRAMES || 5;
    P.ultPhase = 'slash';
  }

  // Phase 2: Slash animation + brief hitstop (like normal exec Phase 3+4)
  if (P.ultPhase === 'slash') {
    P.ultSlashTimer--;

    // Tick down the sweep visual
    if (P.ultSweep && P.ultSweep.life > 0) {
      P.ultSweep.life--;
    }

    if (P.ultSlashTimer <= 0) {
      P.ultCurrentIdx++;
      P.ultSweep = null;
      P.ultPhase = 'teleport'; // Next target
    }
  }

  // Phase 3: Zanshin (sheathe sword & explode all damage)
  if (P.ultPhase === 'zanshin') {
    P.ultSlashTimer++;
    const zanshinTime = BK.ULTIMATE_ZANSHIN_FRAMES || 30;

    if (P.ultSlashTimer === zanshinTime) {
      gameState.screenShake = 30;
      const dmg = BK.ULTIMATE_DAMAGE || 450;

      for (const t of P.ultTargets) {
        if (t.ref && t.ref.hp > 0) {
          t.ref.hp -= dmg;
          t.ref.hitFlash = 15;
          // Massive blood explosion (like normal exec Phase 5)
          particles.spawn(t.ref.x, t.ref.y, '#ff0000', 25, 8, 35, 6);
          particles.spawnSquares(t.ref.x, t.ref.y, '#ff2200', 15, 6, 30, 5);
          particles.spawn(t.ref.x, t.ref.y, '#ffffff', 8, 3, 15, 4);
          // Knockback
          const ka = Math.atan2(t.ref.y - P.y, t.ref.x - P.x);
          t.ref.vx = (t.ref.vx || 0) + Math.cos(ka) * (BK.EXEC_KNOCKBACK || 25);
          t.ref.vy = (t.ref.vy || 0) + Math.sin(ka) * (BK.EXEC_KNOCKBACK || 25);

          if (t.ref.damagePopups) {
            t.ref.damagePopups.push({ value: dmg, x: t.ref.x, y: t.ref.y - 30, life: 80, startLife: 80, isCrit: true });
          }
        }
      }
    }

    if (P.ultSlashTimer >= zanshinTime + 10) {
      P.ultPhase = 'done';
    }
  }

  // Phase 4: Cleanup
  if (P.ultPhase === 'done') {
    P.ultActive = false;
    P.ultTargets = [];
    P.ultCurrentIdx = 0;
    P.ultPhase = 'idle';
    P.ultSweep = null;
    P.invincible = false;
    if (P._vignetteEl) P._vignetteEl.style.opacity = '';
  }

  // Age trail
  P.ultTrail = P.ultTrail.filter(t => {
    t.age++;
    return t.age < (t.isWhiteVanish ? 20 : (t.isAfterimage ? 10 : 15));
  });
}
export function getActiveHitboxes(P) {
  const hitboxes = [];
  P.crossSlashes.forEach(c => hitboxes.push({ type: 'cross', ...c }));
  P.moonSevers.forEach(m => hitboxes.push({ type: 'moon', ...m }));
  P.smashes.forEach(s => hitboxes.push({ type: 'smash', ...s }));
  // Frenzy-exclusive hitboxes
  P.fWhirlwinds.forEach(w => hitboxes.push({ type: 'whirlwind', ...w }));
  P.fThousandCuts.forEach(tc => {
    if (tc.delay <= 0) hitboxes.push({ type: 'thousand', ...tc });
  });
  P.fInfernoSlams.forEach(s => {
    if (s.phase === 'slam' || s.phase === 'crack') hitboxes.push({ type: 'inferno', ...s });
  });
  // Execution sweep
  if (P.execSweep && P.execSweep.life > 0) {
    hitboxes.push({ type: 'execution', ...P.execSweep });
  }
  // 叠伤加成
  const stackMult = 1 + (P.atkStacks ? P.atkStacks.length : 0) * BK.ATK_STACK_PER_HIT;
  hitboxes.forEach(h => { h.dmg = Math.round(h.dmg * stackMult); });
  return hitboxes;
}

/** Check if a point is colliding with a specific hitbox */
export function isHitboxColliding(hitbox, tx, ty, tr = 0) {
  const dx = tx - hitbox.x;
  const dy = ty - hitbox.y;
  const d = Math.hypot(dx, dy);

  if (hitbox.type === 'cross') {
    if (d > hitbox.range + tr) return false;
    const a = Math.atan2(dy, dx);
    let diff = a - hitbox.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= BK.CROSS_CONE; // 90 degree front cone
  } else if (hitbox.type === 'moon') {
    if (d > hitbox.radius + tr) return false;
    const a = Math.atan2(dy, dx);
    let diff = a - hitbox.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= BK.MOON_CONE; // Front arc wave
  } else if (hitbox.type === 'smash' || hitbox.type === 'whirlwind' || hitbox.type === 'inferno') {
    // Full circle AOE
    return d <= hitbox.radius + tr;
  } else if (hitbox.type === 'thousand') {
    // Wide forward cone — each slash covers a generous area
    if (d > hitbox.range + tr) return false;
    const a = Math.atan2(dy, dx);
    let diff = a - hitbox.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= BK.F_THOUSAND_CONE; // ~46° cone per slash (covers fan area)
  } else if (hitbox.type === 'execution') {
    // 270° arc sweep
    if (d > hitbox.radius + tr) return false;
    const a = Math.atan2(dy, dx);
    let diff = a - hitbox.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= (hitbox.arc || BK.EXEC_ARC) / 2;
  }
  return false;
}

// ========== Drawing ==========

export function drawBerserker(P, ctx, canvas) {
  const ghost = P._ghostEl;
  const swordContainer = P._swordEl;
  const slash = P._slashEl;
  const vig = P._vignetteEl;

  // Handle visibility for ultimate phases
  if (P.ultActive && P.ultPhase === 'vanish') {
    ghost.style.display = 'none';
    swordContainer.style.display = 'none';
  } else {
    ghost.style.display = '';
    swordContainer.style.display = '';
  }

  // Show ghost but smaller
  if (ghost && ghost.style.display !== 'none') {
    ghost.style.transform = 'translate(-50%, -50%) scale(0.5)';
  }

  if (canvas) {
    const scaleX = canvas.clientWidth / canvas.width;
    const scaleY = canvas.clientHeight / canvas.height;

    // Position ghost
    ghost.style.left = (P.x * scaleX) + 'px';
    ghost.style.top = (P.y * scaleY) + 'px';

    // Frenzy visual toggle
    ghost.classList.toggle('frenzy', P.frenzy);
    vig.classList.toggle('active', P.frenzy);

    // Position sword and slash container
    swordContainer.style.left = (P.x * scaleX) + 'px';
    swordContainer.style.top = (P.y * scaleY) + 'px';
    slash.style.left = (P.x * scaleX) + 'px';
    slash.style.top = (P.y * scaleY) + 'px';

    const swordWrap = swordContainer.querySelector('.greatsword-wrapper');
    const slashSwoosh = slash.querySelector('.slash-swoosh');

    // Hide old CSS slash swoosh permanently
    slashSwoosh.style.opacity = 0;

    // Handle sword visibility (manifesting only during attack)
    if (P.swinging) {
      swordContainer.style.transition = 'opacity 0.08s';
      swordContainer.style.opacity = 1;

      // Calculate correct duration based on mode
      let dur;
      if (P.frenzy) {
        if (P.swingCombo === 0) dur = BK.F_WHIRLWIND_DURATION;
        else if (P.swingCombo === 1) dur = BK.F_THOUSAND_DURATION;
        else dur = BK.F_INFERNO_DURATION;
      } else {
        dur = BK.CROSS_DURATION;
        if (P.swingCombo === 1) dur = BK.MOON_DURATION;
        if (P.swingCombo === 2) dur = BK.SMASH_DURATION;
      }

      const t = Math.max(0, Math.min(1, 1 - (P.swingTimer / dur))); // 0 to 1

      // Easing helpers
      const easeOutBack = (x) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
      const easeInQuart = (x) => x * x * x * x;
      const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);
      const easeOutElastic = (x) => {
        if (x === 0 || x === 1) return x;
        return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
      };

      swordContainer.style.transform = `translate(-50%, -50%) rotate(${P.swingAngle}rad)`;

      let currentAngleOff = 0;
      let currentScale = 1;
      let ghostScaleX = 1, ghostScaleY = 1;

      if (P.frenzy) {
        // =========================================
        //  FRENZY MODE — Big, dramatic sword work
        // =========================================
        if (P.swingCombo === 0) {
          // === BLOOD WHIRLWIND: Full 360° spin ===
          const spinAngle = t * Math.PI * 2; // Full rotation
          if (t < 0.15) {
            const p = easeOutQuart(t / 0.15);
            currentScale = 1.0 + p * 0.8; // Grow large
            currentAngleOff = -0.3 * p; // Brief wind-back
            ghostScaleX = 1 + p * 0.1; ghostScaleY = 1 - p * 0.1;
          } else if (t < 0.85) {
            const p = (t - 0.15) / 0.7;
            currentAngleOff = -0.3 + spinAngle; // Continuous spin
            currentScale = 1.8; // Large throughout spin
            ghostScaleX = 1 - Math.sin(p * Math.PI) * 0.15;
            ghostScaleY = 1 + Math.sin(p * Math.PI) * 0.15;
          } else {
            const p = (t - 0.85) / 0.15;
            currentAngleOff = Math.PI * 2 - 0.3;
            currentScale = 1.8 - p * 0.8; // Shrink back
            ghostScaleX = 1; ghostScaleY = 1;
          }
          swordWrap.style.transform = `rotate(${currentAngleOff}rad) scale(${currentScale})`;

        } else if (P.swingCombo === 1) {
          // === THOUSAND CUTS: Rapid cross-body zigzag sweeps ===
          const slashCount = 5;
          const slashPhase = Math.floor(t * slashCount);
          const slashT = (t * slashCount) % 1;
          const direction = slashPhase % 2 === 0 ? 1 : -1;
          
          // Each slash: wind back to ONE side, then sweep THROUGH facing angle to OTHER side
          if (slashT < 0.25) {
            // Wind-back: pull to -direction side
            const p = easeInQuart(slashT / 0.25);
            currentAngleOff = -direction * Math.PI * 0.6 * p;
            currentScale = 1.3 + p * 0.3;
          } else {
            // Slash through: sweep from -direction side to +direction side
            const p = easeOutQuart((slashT - 0.25) / 0.75);
            currentAngleOff = -direction * Math.PI * 0.6 + direction * Math.PI * 1.2 * p;
            currentScale = 1.6 - p * 0.3;
          }
          ghostScaleX = 1 - Math.abs(Math.sin(t * Math.PI * slashCount)) * 0.15;
          ghostScaleY = 1 + Math.abs(Math.sin(t * Math.PI * slashCount)) * 0.15;
          swordWrap.style.transform = `rotate(${currentAngleOff}rad) scale(${currentScale})`;

        } else {
          // === INFERNO SLAM: Huge raise + devastating slam ===
          if (t < 0.3) {
            // Slow dramatic raise — sword grows huge
            const p = easeOutQuart(t / 0.3);
            currentAngleOff = -Math.PI * 1.0 * p; // Raise high behind
            currentScale = 1 + p * 1.2; // Grow to 2.2x!
            ghostScaleY = 1 + p * 0.2; ghostScaleX = 1 - p * 0.1;
          } else if (t < 0.5) {
            // Explosive slam down
            const p = easeInQuart((t - 0.3) / 0.2);
            currentAngleOff = -Math.PI * 1.0 + p * Math.PI * 1.5; // Huge arc forward
            currentScale = 2.2 - p * 0.6;
            ghostScaleY = 1.2 - p * 0.4; ghostScaleX = 0.9 + p * 0.3; // Heavy squash
          } else {
            // Ground impact — elastic recoil
            const p = (t - 0.5) / 0.5;
            const ep = easeOutElastic(Math.min(p * 2, 1));
            currentAngleOff = Math.PI * 0.5 - ep * 0.15; // Recoil wobble
            currentScale = 1.6 - p * 0.6;
            ghostScaleY = 0.8 + ep * 0.2; ghostScaleX = 1.2 - ep * 0.2;
          }
          swordWrap.style.transform = `rotate(${currentAngleOff}rad) scale(${currentScale})`;
        }

      } else {
        // =========================================
        //  NORMAL MODE — Precise sword technique
        // =========================================
        if (P.swingCombo === 0) {
          // === CROSS SLASH: Quick thrust with anticipation ===
          if (t < 0.2) {
            const p = t / 0.2;
            currentScale = 0.7 + p * 0.1;
            currentAngleOff = -0.15 * easeOutQuart(p);
            ghostScaleX = 1 + p * 0.05; ghostScaleY = 1 - p * 0.05;
          } else if (t < 0.6) {
            const p = (t - 0.2) / 0.4;
            const ep = easeOutBack(p);
            currentScale = 0.8 + ep * 0.8;
            currentAngleOff = -0.15 + 0.15 * ep;
            ghostScaleX = 1 - p * 0.1; ghostScaleY = 1 + p * 0.1;
          } else {
            const p = (t - 0.6) / 0.4;
            const ep = easeOutQuart(p);
            currentScale = 1.6 - ep * 0.6;
            currentAngleOff = 0;
            ghostScaleX = 0.9 + ep * 0.1; ghostScaleY = 1.1 - ep * 0.1;
          }
          swordWrap.style.transform = `rotate(${currentAngleOff}rad) scale(${currentScale})`;

        } else if (P.swingCombo === 1) {
          // === MOON SEVER: Wide horizontal sweep ===
          if (t < 0.25) {
            const p = easeInQuart(t / 0.25);
            currentAngleOff = -Math.PI * 0.7 * p;
            currentScale = 1.0 + p * 0.3;
            ghostScaleX = 1 + p * 0.08; ghostScaleY = 1 - p * 0.08;
          } else if (t < 0.65) {
            const p = (t - 0.25) / 0.4;
            const ep = easeOutQuart(p);
            currentAngleOff = -Math.PI * 0.7 + ep * Math.PI * 1.3;
            currentScale = 1.3;
            ghostScaleX = 1 - p * 0.12; ghostScaleY = 1 + p * 0.12;
          } else {
            const p = (t - 0.65) / 0.35;
            const ep = easeOutElastic(Math.min(p * 1.5, 1));
            currentAngleOff = Math.PI * 0.6 + ep * 0.1;
            currentScale = 1.3 - p * 0.3;
            ghostScaleX = 0.88 + p * 0.12; ghostScaleY = 1.12 - p * 0.12;
          }
          swordWrap.style.transform = `rotate(${currentAngleOff}rad) scale(${currentScale})`;

        } else {
          // === HELLBLOOD SMASH: Raise high then slam ===
          if (t < 0.35) {
            const p = easeOutQuart(t / 0.35);
            currentAngleOff = -Math.PI * 0.85 * p;
            currentScale = 1 + p * 0.7;
            ghostScaleY = 1 + p * 0.15; ghostScaleX = 1 - p * 0.08;
          } else if (t < 0.55) {
            const p = easeInQuart((t - 0.35) / 0.2);
            currentAngleOff = -Math.PI * 0.85 + p * Math.PI * 1.1;
            currentScale = 1.7 - p * 0.5;
            ghostScaleY = 1.15 - p * 0.3; ghostScaleX = 0.92 + p * 0.2;
          } else {
            const p = (t - 0.55) / 0.45;
            const ep = easeOutElastic(Math.min(p * 2, 1));
            currentAngleOff = Math.PI * 0.25 - ep * 0.05;
            currentScale = 1.2 - p * 0.2;
            ghostScaleY = 0.85 + ep * 0.15; ghostScaleX = 1.12 - ep * 0.12;
          }
          swordWrap.style.transform = `rotate(${currentAngleOff}rad) scale(${currentScale})`;
        }
      }

      // Apply ghost body deformation
      ghost.style.transform = `translate(-50%, -50%) scale(${0.5 * ghostScaleX}, ${0.5 * ghostScaleY})`;

      // Sword glow intensity follows attack phase
      const glowIntensity = Math.sin(t * Math.PI);
      swordWrap.style.filter = P.frenzy
        ? `drop-shadow(0 0 ${12 + glowIntensity * 15}px #ff2200) brightness(${1 + glowIntensity * 0.8})`
        : `drop-shadow(0 0 ${6 + glowIntensity * 10}px #ff0000) brightness(${1 + glowIntensity * 0.4})`;

      // === FRUIT NINJA SLASH TRAIL ===
      const sRange = (P.swingCombo === 2 ? 1.3 : 1) * (P.frenzy ? BK.FRENZY_RANGE_MULT : 1);
      const swordLen = BK.SWING_RANGE * currentScale * sRange;
      const tipAngle = P.swingAngle + currentAngleOff;
      const tipX = P.x + Math.cos(tipAngle) * swordLen;
      const tipY = P.y + Math.sin(tipAngle) * swordLen;

      if (!P.slashTrail) P.slashTrail = [];
      // Add trail for all combos now (all have visible sword motion)
      P.slashTrail.push({ tipX, tipY, age: 0 });
      if (P.slashTrail.length > BK.TRAIL_MAX_LENGTH) P.slashTrail.shift();

    } else if (P.ultPhase === 'slash' || P.ultPhase === 'teleport') {
      // Show sword during ultimate slash/teleport (reuse normal exec pose)
      swordContainer.style.transition = 'none';
      swordContainer.style.opacity = 1;
      const slashAngle = P.ultSweep ? P.ultSweep.angle : P.angle;
      swordContainer.style.transform = `translate(-50%, -50%) rotate(${slashAngle}rad)`;
      swordWrap.style.transform = `rotate(${Math.PI * 0.3}rad) scale(1.4)`;
      swordWrap.style.filter = `drop-shadow(0 0 20px #ff0000) brightness(1.8)`;
      ghost.style.transform = `translate(-50%, -50%) scale(0.5, 0.45)`;
      
      // Trail point
      const swordLen = BK.SWING_RANGE * 1.4 * BK.FRENZY_RANGE_MULT;
      const tipAngle = slashAngle + Math.PI * 0.3;
      const tipX = P.x + Math.cos(tipAngle) * swordLen;
      const tipY = P.y + Math.sin(tipAngle) * swordLen;
      if (!P.slashTrail) P.slashTrail = [];
      P.slashTrail.push({ tipX, tipY, age: 0 });
      if (P.slashTrail.length > BK.TRAIL_MAX_LENGTH) P.slashTrail.shift();

    } else if (P.ultPhase === 'zanshin') {
      // Pose for Zanshin (sword sheathed / at rest)
      swordContainer.style.transition = 'opacity 0.2s, transform 0.2s';
      swordContainer.style.opacity = 1;
      swordWrap.style.transform = `rotate(${Math.PI * 0.2}rad) scale(1.0)`; // sword down and away
      swordWrap.style.filter = `drop-shadow(0 0 10px #ff0000) brightness(0.8)`;
      ghost.style.transform = `translate(-50%, -50%) scale(0.5, 0.5)`; // standing tall
      // Give the sword a very slow glowing pulse
      const zanshinPulse = Math.sin(Date.now() / 150);
      swordWrap.style.filter = `drop-shadow(0 0 ${15 + zanshinPulse * 5}px #ff0000) brightness(${1 + zanshinPulse * 0.3})`;
    } else {
      swordContainer.style.transition = 'opacity 0.15s';
      swordContainer.style.opacity = 0; // Fade out when idle
      // Reset ghost deformation
      ghost.style.transform = 'translate(-50%, -50%) scale(0.5)';
    }
  }

  // === CANVAS RENDERING FOR PROJECTILES & TRAILS ===
  const customCanvas = P._canvasEl;
  if (customCanvas) {
    const ctx = customCanvas.getContext('2d');
    ctx.clearRect(0, 0, customCanvas.width, customCanvas.height);

    // Frenzy Waves rendering
    P.frenzyWaves.forEach(w => {
      const lifeT = Math.max(0, w.life / w.maxLife);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.lineWidth = 15 * lifeT;
      ctx.strokeStyle = `rgba(255, 0, 0, ${lifeT})`;
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 30;
      ctx.stroke();
      ctx.restore();
    });

    if (!P.slashTrail) P.slashTrail = [];

    // Age and cull trail points
    const trailMaxAge = P.frenzy ? BK.TRAIL_MAX_AGE_FRENZY : BK.TRAIL_MAX_AGE;
    P.slashTrail = P.slashTrail.filter(pt => {
      pt.age++;
      return pt.age < trailMaxAge;
    });

    const trail = P.slashTrail;
    if (trail.length >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw from oldest to newest for proper layering
      for (let i = 1; i < trail.length; i++) {
        const prev = trail[i - 1];
        const curr = trail[i];
        const life = 1 - (curr.age / trailMaxAge);

        if (life <= 0) continue;

        const baseWidth = P.frenzy ? BK.TRAIL_BASE_WIDTH_FRENZY : BK.TRAIL_BASE_WIDTH;
        const width = baseWidth * life;

        // Layer 0 (Frenzy only): Ultra-wide blood haze
        if (P.frenzy) {
          ctx.strokeStyle = `rgba(255, 34, 0, ${life * 0.25})`;
          ctx.lineWidth = width * 5;
          ctx.shadowColor = '#ff4400';
          ctx.shadowBlur = 40 * life;
          ctx.beginPath();
          ctx.moveTo(prev.tipX, prev.tipY);
          ctx.lineTo(curr.tipX, curr.tipY);
          ctx.stroke();
        }

        // Layer 1: Outer glow (wide, faint red)
        ctx.strokeStyle = `rgba(255, 0, 0, ${life * (P.frenzy ? 0.6 : 0.4)})`;
        ctx.lineWidth = width * (P.frenzy ? 4 : 3);
        ctx.shadowColor = P.frenzy ? '#ff4400' : '#ff0000';
        ctx.shadowBlur = (P.frenzy ? 35 : 20) * life;
        ctx.beginPath();
        ctx.moveTo(prev.tipX, prev.tipY);
        ctx.lineTo(curr.tipX, curr.tipY);
        ctx.stroke();

        // Layer 2: Mid glow (white-hot)
        ctx.strokeStyle = `rgba(255, ${P.frenzy ? '180, 50' : '255, 255'}, ${life * 0.8})`;
        ctx.lineWidth = width * (P.frenzy ? 1.4 : 1.0);
        ctx.shadowBlur = (P.frenzy ? 10 : 5) * life;
        ctx.beginPath();
        ctx.moveTo(prev.tipX, prev.tipY);
        ctx.lineTo(curr.tipX, curr.tipY);
        ctx.stroke();

        // Layer 3: Spatial Tear Core (pure black)
        ctx.strokeStyle = `rgba(0, 0, 0, ${life})`;
        ctx.lineWidth = width * (P.frenzy ? 0.5 : 0.4);
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(prev.tipX, prev.tipY);
        ctx.lineTo(curr.tipX, curr.tipY);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();

    // 1. Cross Slashes
    P.crossSlashes.forEach(c => {
      const lifeT = c.life / c.maxLife; // 1 -> 0
      const len = c.range * 0.8 * Math.sin(lifeT * Math.PI / 2);
      const w = BK.CROSS_WIDTH * lifeT;
      const cx = c.x + Math.cos(c.angle) * (c.range * 0.5); // Center point of the X
      const cy = c.y + Math.sin(c.angle) * (c.range * 0.5);

      // The cross is drawn with a space-tear effect directly inside `drawCross`
      drawCross(ctx, cx, cy, c.angle, len, w * 1.5, lifeT);
    });

    // 2. Moon Severs
    P.moonSevers.forEach(m => {
      const lifeT = m.life / m.maxLife;
      const a = m.angle;
      const rad = m.radius;
      const w = 40 * lifeT;

      ctx.lineCap = 'round';
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 20;

      // Outer wide wave
      ctx.beginPath();
      ctx.arc(m.x, m.y, rad, a - Math.PI / 2.5, a + Math.PI / 2.5);
      ctx.strokeStyle = `rgba(255, 0, 0, ${lifeT * 0.8})`;
      ctx.lineWidth = w;
      ctx.stroke();

      // Inner white core wave
      ctx.beginPath();
      ctx.arc(m.x, m.y, rad * 0.95, a - Math.PI / 3, a + Math.PI / 3);
      ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT})`;
      ctx.lineWidth = w * 0.3;
      ctx.stroke();
    });

    // 3. Hellblood Smashes
    P.smashes.forEach(s => {
      const lifeT = s.life / s.maxLife;
      const r = s.radius * (1 - lifeT); // Expands outwards
      const w = 60 * lifeT;

      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 40;

      // Expanding blood ring
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 0, ${lifeT * 0.8})`;
      ctx.lineWidth = w;
      ctx.stroke();

      // Core flash
      if (lifeT > 0.6) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(lifeT - 0.6) * 2.5})`;
        ctx.fill();
      }
    });

    // Draw frenzy sword waves on canvas
    if (P.frenzyWaves.length > 0) {
      for (const w of P.frenzyWaves) {
        const alpha = Math.min(1, w.life / 20);
        ctx.strokeStyle = `rgba(255,34,0,${alpha})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        const len = 25;
        const perpX = Math.cos(w.angle + Math.PI / 2) * len;
        const perpY = Math.sin(w.angle + Math.PI / 2) * len;
        ctx.beginPath();
        ctx.moveTo(w.x - perpX, w.y - perpY);
        ctx.quadraticCurveTo(
          w.x + Math.cos(w.angle) * 10, w.y + Math.sin(w.angle) * 10,
          w.x + perpX, w.y + perpY
        );
        ctx.stroke();
      }
    }

    // === FRENZY-EXCLUSIVE ATTACK RENDERING ===

    // 4. Blood Whirlwind — spinning red arcs
    P.fWhirlwinds.forEach(w => {
      const lifeT = w.life / w.maxLife;
      const r = w.radius * (0.5 + lifeT * 0.5);
      ctx.save();
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 25;
      // Draw 4 spinning arc segments
      for (let i = 0; i < 4; i++) {
        const arcStart = w.spin + (Math.PI * 2 / 4) * i;
        ctx.beginPath();
        ctx.arc(w.x, w.y, r, arcStart, arcStart + Math.PI / 3);
        ctx.strokeStyle = `rgba(255, 34, 0, ${lifeT * 0.7})`;
        ctx.lineWidth = 20 * lifeT;
        ctx.lineCap = 'round';
        ctx.stroke();
        // Inner white arc
        ctx.beginPath();
        ctx.arc(w.x, w.y, r * 0.9, arcStart + 0.1, arcStart + Math.PI / 4);
        ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT * 0.5})`;
        ctx.lineWidth = 6 * lifeT;
        ctx.stroke();
      }
      ctx.restore();
    });

    // 5. Thousand Cuts — staggered fan slash lines
    P.fThousandCuts.forEach(tc => {
      if (tc.delay > 0) return;
      const lifeT = tc.life / tc.maxLife;
      const len = tc.range * Math.sin(lifeT * Math.PI * 0.8);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 15;
      // Outer red line
      ctx.beginPath();
      ctx.moveTo(tc.x, tc.y);
      ctx.lineTo(tc.x + Math.cos(tc.angle) * len, tc.y + Math.sin(tc.angle) * len);
      ctx.strokeStyle = `rgba(255, 68, 0, ${lifeT * 0.8})`;
      ctx.lineWidth = 12 * lifeT;
      ctx.stroke();
      // Inner white core
      ctx.beginPath();
      ctx.moveTo(tc.x, tc.y);
      ctx.lineTo(tc.x + Math.cos(tc.angle) * len, tc.y + Math.sin(tc.angle) * len);
      ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT * 0.9})`;
      ctx.lineWidth = 4 * lifeT;
      ctx.stroke();
      ctx.restore();
    });

    // 6. Inferno Slam — rising ring + ground cracks
    P.fInfernoSlams.forEach(s => {
      const lifeT = s.life / s.maxLife;
      const t = 1 - lifeT;
      ctx.save();
      if (s.phase === 'rise') {
        // Rising energy ring
        const r = s.radius * 0.3 * (t / 0.35);
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 100, 0, ${lifeT})`;
        ctx.lineWidth = 8;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 20;
        ctx.stroke();
      } else if (s.phase === 'slam') {
        // Expanding shockwave
        const r = s.radius * ((t - 0.35) / 0.2);
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 0, 0, ${lifeT})`;
        ctx.lineWidth = 30 * lifeT;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 40;
        ctx.stroke();
        // White flash
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${lifeT * 0.6})`;
        ctx.fill();
      } else {
        // Ground cracks
        const numCracks = BK.F_INFERNO_CRACKS;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 10;
        for (let i = 0; i < numCracks; i++) {
          const a = (Math.PI * 2 / numCracks) * i + s.angle * 0.3;
          const crackLen = s.radius * 0.8 * lifeT;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          // Jagged line
          const mid1X = s.x + Math.cos(a + 0.1) * crackLen * 0.4;
          const mid1Y = s.y + Math.sin(a + 0.1) * crackLen * 0.4;
          const endX = s.x + Math.cos(a) * crackLen;
          const endY = s.y + Math.sin(a) * crackLen;
          ctx.lineTo(mid1X, mid1Y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `rgba(255, 50, 0, ${lifeT * 0.8})`;
          ctx.lineWidth = 4 * lifeT;
          ctx.stroke();
        }
      }
      ctx.restore();
    });

    // 6.5. Ultimate Execution Full Screen Effects
    if (P.ultActive) {
      if (P.ultPhase === 'vanish') {
        const vt = P.ultSlashTimer / (BK.ULTIMATE_VANISH_FRAMES || 15);
        if (vt < 0.2) {
          // Instant flash to black
          ctx.fillStyle = `rgba(0, 0, 0, ${(1 - vt/0.2) * 0.8})`;
          ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
        } else {
          // Deep red vignette building up
          ctx.fillStyle = `rgba(20, 0, 0, ${vt * 0.85})`;
          ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
        }
      } else if (P.ultPhase === 'teleport' || P.ultPhase === 'slash') {
        // Deep almost-black background during omni-slash
        ctx.fillStyle = 'rgba(10, 0, 0, 0.75)';
        ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
        
        // Render the 270° arc sweep (like normal exec Phase 3)
        if (P.ultSweep && P.ultSweep.life > 0) {
          const sw = P.ultSweep;
          const lifeT = sw.life / sw.maxLife;
          const halfArc = sw.arc / 2;
          ctx.save();
          // Outer glow ring
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * lifeT, sw.angle - halfArc, sw.angle + halfArc);
          ctx.strokeStyle = `rgba(255, 0, 0, ${lifeT * 0.8})`;
          ctx.lineWidth = 20 * lifeT;
          ctx.shadowColor = '#ff2200';
          ctx.shadowBlur = 30;
          ctx.lineCap = 'round';
          ctx.stroke();
          // Inner white core
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * lifeT * 0.9, sw.angle - halfArc * 0.8, sw.angle + halfArc * 0.8);
          ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT * 0.6})`;
          ctx.lineWidth = 6 * lifeT;
          ctx.shadowBlur = 0;
          ctx.stroke();
          // Black tear core
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * lifeT * 0.95, sw.angle - halfArc * 0.6, sw.angle + halfArc * 0.6);
          ctx.strokeStyle = `rgba(0, 0, 0, ${lifeT})`;
          ctx.lineWidth = 3 * lifeT;
          ctx.stroke();
          ctx.restore();
        }
        
        if (P.ultPhase === 'slash') {
          // Brief white flash
          const ht = Math.max(0, P.ultSlashTimer / (BK.ULTIMATE_HITSTOP_FRAMES || 5));
          ctx.fillStyle = `rgba(255, 255, 255, ${ht * 0.3})`;
          ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
        }
      } else if (P.ultPhase === 'zanshin') {
        const zt = P.ultSlashTimer / (BK.ULTIMATE_ZANSHIN_FRAMES || 30);
        if (zt < 1) {
          // Total black during the silence before explosion
          ctx.fillStyle = `rgba(0, 0, 0, ${0.85 + zt * 0.15})`;
          ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
        } else {
          // The massive explosion! White flash fading out
          const expt = (P.ultSlashTimer - (BK.ULTIMATE_ZANSHIN_FRAMES||30)) / 10;
          if (expt <= 1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(1 - expt)})`;
            ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
          }
        }
      }
    }

    // 7. 居合斩 (Charge Draw Slash) VFX

    // 7a. Charging ring at player's feet
    if (P.charging && P.chargeTimer > 5) {
      ctx.save();
      const t = Math.min(1, P.chargeTimer / BK.CHARGE_TIER3_FRAMES);
      const ringR = BK.CHARGE_RING_RADIUS * (1 - t * 0.7); // shrinks from 60 to 18

      // Screen darken (vignette)
      ctx.fillStyle = `rgba(0, 0, 0, ${t * 0.35})`;
      ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);

      // Tier-based colors
      let ringColor, glowColor;
      if (P.chargeTier >= 3) {
        ringColor = `rgba(255, 255, 255, ${0.8 + Math.sin(P.chargeTimer * 0.5) * 0.2})`;
        glowColor = '#ffffff';
      } else if (P.chargeTier >= 2) {
        ringColor = `rgba(255, 34, 0, ${0.6 + Math.sin(P.chargeTimer * 0.3) * 0.2})`;
        glowColor = '#ff2200';
      } else {
        ringColor = `rgba(255, 136, 0, ${0.4 + t * 0.3})`;
        glowColor = '#ff8800';
      }

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20 + t * 30;

      // Outer ring
      ctx.beginPath();
      ctx.arc(P.x, P.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2 + t * 2;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(P.x, P.y, ringR * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Energy convergence lines (inward)
      const nLines = 6 + P.chargeTier * 2;
      for (let i = 0; i < nLines; i++) {
        const a = (Math.PI * 2 / nLines) * i + P.chargeTimer * 0.08;
        const outerR = ringR * 1.5 + Math.sin(P.chargeTimer * 0.2 + i) * 10;
        const innerR = ringR * 0.3;
        ctx.beginPath();
        ctx.moveTo(P.x + Math.cos(a) * outerR, P.y + Math.sin(a) * outerR);
        ctx.lineTo(P.x + Math.cos(a) * innerR, P.y + Math.sin(a) * innerR);
        ctx.strokeStyle = `rgba(255, ${136 - P.chargeTier * 40}, 0, ${t * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Tier 3 flash
      if (P.chargeReady && P.chargeTimer - BK.CHARGE_TIER3_FRAMES < 8) {
        const flashT = (P.chargeTimer - BK.CHARGE_TIER3_FRAMES) / 8;
        ctx.fillStyle = `rgba(255, 255, 255, ${(1 - flashT) * 0.6})`;
        ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
        // Cross flash at player
        ctx.beginPath();
        const flashLen = 100 * (1 - flashT);
        ctx.moveTo(P.x - flashLen, P.y);
        ctx.lineTo(P.x + flashLen, P.y);
        ctx.moveTo(P.x, P.y - flashLen);
        ctx.lineTo(P.x, P.y + flashLen);
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - flashT})`;
        ctx.lineWidth = 4 * (1 - flashT);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7b. Active charge slash lines
    P.chargeSlashes.forEach(s => {
      ctx.save();
      const lifeT = s.life / s.maxLife;
      const cos = Math.cos(s.angle), sin = Math.sin(s.angle);

      // Slash line from origin to end
      const drawLen = Math.min(s.travel, s.length);

      // Layer 1: Wide deep-red outer glow
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 40 * lifeT;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + cos * drawLen, s.y + sin * drawLen);
      ctx.strokeStyle = `rgba(180, 0, 0, ${lifeT * 0.6})`;
      ctx.lineWidth = s.width * lifeT;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Layer 2: Medium red core
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + cos * drawLen, s.y + sin * drawLen);
      ctx.strokeStyle = `rgba(255, 50, 0, ${lifeT * 0.8})`;
      ctx.lineWidth = s.width * 0.4 * lifeT;
      ctx.stroke();

      // Layer 3: Thin white-hot center
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + cos * drawLen, s.y + sin * drawLen);
      ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT})`;
      ctx.lineWidth = 4 * lifeT;
      ctx.stroke();

      // Fracture particles along the line (shatter effect as it fades)
      if (lifeT < 0.5) {
        const shardCount = Math.floor((1 - lifeT * 2) * 8);
        for (let i = 0; i < shardCount; i++) {
          const frac = Math.random();
          const px = s.x + cos * drawLen * frac + (Math.random() - 0.5) * s.width * 0.5;
          const py = s.y + sin * drawLen * frac + (Math.random() - 0.5) * s.width * 0.5;
          ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 100)}, 0, ${lifeT * 1.5})`;
          const sz = 2 + Math.random() * 4;
          ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
      }
      ctx.restore();
    });

    // 8. Crimson Execution rendering — 極 · 血影刺殺
    if (P.executing && P.execTarget) {
      ctx.save();
      const tgt = P.execTarget;

      // ── Phase 1: DEATH GAZE — shrinking lock sigil + kill-intent line ──
      if (P.execPhase === 1) {
        const lt = P.execLockT || 0; // 0→1
        // Shrinking sigil ring on target
        const sigilR = BK.EXEC_SIGIL_SIZE * (1 - lt * 0.7); // shrinks to 30%
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, sigilR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + lt * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
        ctx.stroke();
        // Inner tighter ring
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, sigilR * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${lt * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Kill-intent beam: thin line player→target
        ctx.beginPath();
        ctx.moveTo(P.x, P.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = `rgba(255, 0, 0, ${lt * 0.4})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 8;
        ctx.stroke();
        // Screen darken
        ctx.fillStyle = `rgba(0, 0, 0, ${lt * 0.3})`;
        ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
      }

      // ── Phase 2: SHADOW DASH — afterimage ghosts + lightning lines ──
      if (P.execPhase === 2 || (P.execPhase >= 3 && P.execTrail)) {
        // Afterimage ghost trail
        if (P.execTrail) {
          P.execTrail.forEach((pt, i) => {
            if (pt.alpha < 0.05) return;
            // Ghost silhouette (small red circle)
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 0, ${pt.alpha * 0.4})`;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15 * pt.alpha;
            ctx.fill();
          });
        }
        // Jagged lightning lines (origin → current pos)
        if (P.execPhase === 2 && P.execOrigin) {
          ctx.shadowBlur = 0;
          for (let line = 0; line < 3; line++) {
            ctx.beginPath();
            ctx.moveTo(P.execOrigin.x, P.execOrigin.y);
            const seg = 5;
            const dx = P.x - P.execOrigin.x, dy = P.y - P.execOrigin.y;
            for (let s = 1; s <= seg; s++) {
              const frac = s / seg;
              const jx = (Math.random() - 0.5) * 30 * (1 - frac);
              const jy = (Math.random() - 0.5) * 30 * (1 - frac);
              ctx.lineTo(P.execOrigin.x + dx * frac + jx, P.execOrigin.y + dy * frac + jy);
            }
            ctx.strokeStyle = `rgba(255, ${50 + line * 30}, 0, ${0.5 - line * 0.15})`;
            ctx.lineWidth = 2 - line * 0.5;
            ctx.stroke();
          }
          // White core beam
          ctx.beginPath();
          ctx.moveTo(P.execOrigin.x, P.execOrigin.y);
          ctx.lineTo(P.x, P.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // ── Phase 3: IAI SLASH — multi-layer bezier crescent ──
      if (P.execPhase >= 3 && P.execSweep) {
        const sw = P.execSweep;
        const sweepLife = sw.life / sw.maxLife;
        const slashProgress = P.execSlashT || 0; // non-linear 0→1
        const halfArc = sw.arc / 2;
        const drawnArc = halfArc * slashProgress; // how much of the arc is revealed

        if (drawnArc > 0.05) {
          const startAngle = sw.angle - drawnArc;
          const endAngle = sw.angle + drawnArc;

          // Calculate bezier crescent points (tapered blade shape)
          const bladePts = 24;
          const bladeOuter = [];
          const bladeInner = [];
          for (let i = 0; i <= bladePts; i++) {
            const frac = i / bladePts;
            const a = startAngle + (endAngle - startAngle) * frac;
            // Taper: thin at edges, fat in middle
            const taper = Math.sin(frac * Math.PI);
            const outerR = sw.radius * (0.95 + taper * 0.15);
            const innerR = sw.radius * (0.95 - taper * 0.25);
            bladeOuter.push({ x: sw.x + Math.cos(a) * outerR, y: sw.y + Math.sin(a) * outerR });
            bladeInner.push({ x: sw.x + Math.cos(a) * innerR, y: sw.y + Math.sin(a) * innerR });
          }

          // Layer 1: Wide blood-red haze (background glow)
          ctx.save();
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 40 * sweepLife;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * 1.1, startAngle, endAngle);
          ctx.strokeStyle = `rgba(180, 20, 0, ${sweepLife * 0.3})`;
          ctx.lineWidth = 50 * sweepLife * Math.sin(slashProgress * Math.PI);
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();

          // Layer 2: Crescent blade shape (filled path)
          ctx.save();
          ctx.beginPath();
          // Draw outer edge forward
          ctx.moveTo(bladeOuter[0].x, bladeOuter[0].y);
          for (let i = 1; i < bladeOuter.length; i++) {
            ctx.lineTo(bladeOuter[i].x, bladeOuter[i].y);
          }
          // Draw inner edge backward (closes the crescent)
          for (let i = bladeInner.length - 1; i >= 0; i--) {
            ctx.lineTo(bladeInner[i].x, bladeInner[i].y);
          }
          ctx.closePath();
          // Gradient fill: dark red → black → dark red
          ctx.fillStyle = `rgba(60, 0, 0, ${sweepLife * 0.8})`;
          ctx.fill();
          ctx.restore();

          // Layer 3: Black void crack (center line)
          ctx.save();
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * 0.93, startAngle + 0.05, endAngle - 0.05);
          ctx.strokeStyle = `rgba(0, 0, 0, ${sweepLife})`;
          ctx.lineWidth = 4 * sweepLife;
          ctx.stroke();
          ctx.restore();

          // Layer 4: White-hot blade edge (searing line)
          ctx.save();
          ctx.beginPath();
          const edgePts = bladeOuter;
          ctx.moveTo(edgePts[0].x, edgePts[0].y);
          for (let i = 1; i < edgePts.length; i++) {
            ctx.lineTo(edgePts[i].x, edgePts[i].y);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${sweepLife * 0.9})`;
          ctx.lineWidth = 2.5 * sweepLife;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.restore();

          // Layer 5: Red brushstroke trails (inked feel)
          ctx.save();
          for (let b = 0; b < 5; b++) {
            const bFrac = (b + 0.5) / 5;
            const bAngle = startAngle + (endAngle - startAngle) * bFrac;
            const bR = sw.radius * (0.7 + Math.random() * 0.5);
            const bEndR = bR + 40 + Math.random() * 60;
            const tangent = bAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            ctx.beginPath();
            const bx = sw.x + Math.cos(bAngle) * bR;
            const by = sw.y + Math.sin(bAngle) * bR;
            const ex = sw.x + Math.cos(bAngle) * bEndR;
            const ey = sw.y + Math.sin(bAngle) * bEndR;
            ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(
              (bx + ex) / 2 + Math.cos(tangent) * 20,
              (by + ey) / 2 + Math.sin(tangent) * 20,
              ex, ey
            );
            ctx.strokeStyle = `rgba(255, 30, 0, ${sweepLife * 0.4})`;
            ctx.lineWidth = (3 - b * 0.4) * sweepLife;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          ctx.restore();
        }

        // Tick down sweep life
        sw.life--;
      }

      // ── Phase 4: FREEZE — high-contrast flash ──
      if (P.execPhase === 4) {
        const ft = P.execFlashT || 0;
        if (ft < 0.15) {
          // Brief white flash (1 frame)
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * (1 - ft / 0.15)})`;
          ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
        } else {
          // Subtle dark vignette
          ctx.fillStyle = `rgba(0, 0, 0, ${0.15 * (1 - ft)})`;
          ctx.fillRect(0, 0, customCanvas.width, customCanvas.height);
        }
      }

      // ── Phase 5: ZANSHIN — slash residue fades like ink in wind ──
      if (P.execPhase === 5 && P.execSweep) {
        const fade = P.execFadeT || 0;
        const sw = P.execSweep;
        const halfArc = sw.arc / 2;
        const residueAlpha = (1 - fade) * 0.6;
        if (residueAlpha > 0.02) {
          // Distorting, fading slash residue
          ctx.save();
          ctx.globalAlpha = residueAlpha;
          const drift = fade * 15; // drift outward
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius + drift, sw.angle - halfArc, sw.angle + halfArc);
          ctx.strokeStyle = '#440000';
          ctx.lineWidth = 8 * (1 - fade);
          ctx.lineCap = 'round';
          ctx.stroke();
          // Wispy black crack remnant
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * 0.93 + drift * 0.5, sw.angle - halfArc * 0.7, sw.angle + halfArc * 0.7);
          ctx.strokeStyle = `rgba(0, 0, 0, ${(1 - fade) * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      ctx.restore();
    }

    // 8. Kill Intent UI (frenzy only, max 10 dots)
    if (P.frenzy) {
      const maxIntent = BK.EXEC_KILL_INTENT_MAX || 10;
      ctx.save();
      const uiX = customCanvas.width - 200;
      const uiY = customCanvas.height - 50;
      const dotR = 6;
      const dotGap = 22;
      const cost = BK.EXEC_KILL_INTENT_COST || 2;

      for (let i = 0; i < maxIntent; i++) {
        const dx = uiX + i * dotGap;
        ctx.beginPath();
        ctx.arc(dx, uiY, dotR, 0, Math.PI * 2);
        if (i < P.killIntent) {
          // Filled red dot
          ctx.fillStyle = '#ff2200';
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 8;
          ctx.fill();
        } else {
          // Empty outline
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }

      // "Ready" label when enough kill intent
      if (P.killIntent >= cost) {
        const pulse = 0.5 + Math.sin(Date.now() * 0.008) * 0.5;
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = `rgba(255, 34, 0, ${pulse})`;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        if (P.killIntent >= maxIntent) {
          ctx.fillText('长按右键 · 终极处决', uiX + (maxIntent * dotGap) / 2 - dotGap / 2, uiY + 25);
        } else {
          ctx.fillText('右键 · 血影刺杀', uiX + (maxIntent * dotGap) / 2 - dotGap / 2, uiY + 25);
        }
      }

      // Ultimate charge progress ring
      if (P.ultCharging) {
        const chargeTime = BK.ULTIMATE_CHARGE_TIME || 180;
        const progress = P.ultChargeTimer / chargeTime;
        const cx = P.x, cy = P.y - 50;
        const ringR = 30;
        // Background ring
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();
        // Progress ring
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.strokeStyle = `rgba(255, ${Math.floor(50 * (1 - progress))}, 0, ${0.6 + progress * 0.4})`;
        ctx.lineWidth = 5;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15 * progress;
        ctx.stroke();
        // Percentage text
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#ff4444';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(`${Math.floor(progress * 100)}%`, cx, cy + 4);
      }

      ctx.restore();
    }

    // 9. Ultimate trail & target markers
    if (P.ultActive) {
      ctx.save();
      // Afterimage trail
      for (const t of P.ultTrail) {
        const maxAge = t.isWhiteVanish ? 20 : (t.isAfterimage ? 10 : 15);
        const alpha = Math.max(0, 1 - t.age / maxAge);
        if (alpha <= 0) continue;
        const r = Math.max(0.5, (t.isWhiteVanish ? 14 : (t.isAfterimage ? 10 : 8)) * alpha);
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        if (t.isWhiteVanish) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.shadowColor = '#ffffff';
        } else if (t.isAfterimage) {
          // Red silhouette afterimage (like normal exec trail)
          ctx.fillStyle = `rgba(200, 0, 0, ${(t.alpha || 1) * alpha * 0.7})`;
          ctx.shadowColor = '#ff0000';
        } else {
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.6})`;
          ctx.shadowColor = '#ff0000';
        }
        ctx.shadowBlur = 10;
        ctx.fill();
      }
      // Target lock markers
      for (let i = 0; i < P.ultTargets.length; i++) {
        const tgt = P.ultTargets[i];
        if (!tgt.ref || tgt.ref.hp <= 0) continue;
        const tx = tgt.ref.x, ty = tgt.ref.y;
        const isCurrentTarget = (i === P.ultCurrentIdx);
        const markerR = isCurrentTarget ? 25 : 18;
        const rot = Date.now() * 0.005;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(rot);
        // X marker
        ctx.strokeStyle = isCurrentTarget ? '#ff0000' : 'rgba(255, 0, 0, 0.4)';
        ctx.lineWidth = isCurrentTarget ? 3 : 2;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = isCurrentTarget ? 12 : 0;
        ctx.beginPath();
        ctx.moveTo(-markerR, -markerR); ctx.lineTo(markerR, markerR);
        ctx.moveTo(markerR, -markerR); ctx.lineTo(-markerR, markerR);
        ctx.stroke();
        // Circle
        ctx.beginPath();
        ctx.arc(0, 0, markerR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}

// Helper to draw an X shape with a spatial-tear styling
function drawCross(ctx, x, y, angle, size, width, lifeT) {
  const dx1 = Math.cos(angle - Math.PI / 4) * size;
  const dy1 = Math.sin(angle - Math.PI / 4) * size;
  const dx2 = Math.cos(angle + Math.PI / 4) * size;
  const dy2 = Math.sin(angle + Math.PI / 4) * size;

  ctx.save();
  ctx.lineCap = 'round';

  // Outer red blood-glow
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = `rgba(255, 0, 0, ${lifeT * 0.6})`;
  ctx.lineWidth = width * 1.5;

  ctx.beginPath();
  ctx.moveTo(x - dx1, y - dy1);
  ctx.lineTo(x + dx1, y + dy1);
  ctx.moveTo(x - dx2, y - dy2);
  ctx.lineTo(x + dx2, y + dy2);
  ctx.stroke();

  // White spatial crack
  ctx.shadowBlur = 10;
  ctx.strokeStyle = `rgba(255, 255, 255, ${lifeT * 0.9})`;
  ctx.lineWidth = width * 0.6;
  ctx.stroke();

  // Pure black void core
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(0, 0, 0, ${lifeT})`;
  ctx.lineWidth = width * 0.2;
  ctx.stroke();

  ctx.restore();
}

export function addRage(P, amount) {
  if (P.frenzy) return;
  P.rage = Math.min(BK.RAGE_MAX, P.rage + amount);
}

export function activateFrenzy(P) {
  if (P.rage >= BK.RAGE_MIN_ACTIVATE && !P.frenzy && P.skill2Cd <= 0) {
    P.frenzy = true;
    // Frenzy duration scales with rage: 100 rage = base, 1000 rage = 3x duration
    const rageRatio = P.rage / BK.RAGE_MAX; // 0.1 ~ 1.0
    const durationMult = 1 + rageRatio * 2; // 1x ~ 3x
    P.frenzyTimer = Math.floor(BK.FRENZY_DURATION * durationMult);
    P.rage = 0;
    P.skill2Cd = BK.FRENZY_COOLDOWN;
    
    // Initial red AoE blast — bigger with more rage
    const blastRadius = 200 + rageRatio * 200;
    P.frenzyWaves.push({
      x: P.x, y: P.y,
      radius: 0, maxRadius: blastRadius, life: 30, maxLife: 30,
      dmg: BK.CROSS_DAMAGE * (2 + rageRatio * 3)
    });
    
    // Activate vignette DOM
    if (P._vignetteEl) P._vignetteEl.classList.add('active');
    return true;
  }
  return false;
}

export function startCharging(P) {
  if (P.skill1Cd > 0 || P.executing || P.rolling || P.charging) return false;
  P.charging = true;
  P.chargeTimer = 0;
  P.chargeTier = 0;
  P.chargeReady = false;
  P.swinging = false; // cancel current swing
  P.autoSwing = false;
  return true;
}

export function releaseChargeSlash(P, particles) {
  if (!P.charging) return null;

  const tier = P.chargeTier;
  P.charging = false;
  P.chargeTimer = 0;
  P.chargeTier = 0;
  P.chargeReady = false;

  // Need at least tier 1 to fire
  if (tier < 1) return null;

  // Calculate damage based on tier
  const dmgTable = [0, BK.CHARGE_TIER1_DAMAGE, BK.CHARGE_TIER2_DAMAGE, BK.CHARGE_TIER3_DAMAGE];
  const dmg = dmgTable[tier];
  const slashLen = BK.CHARGE_SLASH_LENGTH * (0.5 + tier * 0.25); // tier1=75%, tier2=100%, tier3=125%

  // Create the slash line projectile
  const angle = P.angle;
  const startX = P.x;
  const startY = P.y;
  const endX = startX + Math.cos(angle) * slashLen;
  const endY = startY + Math.sin(angle) * slashLen;

  const slash = {
    x: startX, y: startY,
    endX, endY,
    angle,
    length: slashLen,
    width: BK.CHARGE_SLASH_WIDTH * (0.6 + tier * 0.2),
    tier,
    life: 40 + tier * 10, // visual lifetime
    maxLife: 40 + tier * 10,
    travel: 0,
    speed: 60 + tier * 15, // travel speed
    dmg,
  };
  P.chargeSlashes.push(slash);

  // Create aftermath delayed damage event
  P.chargeAftermaths.push({
    x: startX, y: startY,
    endX, endY,
    angle,
    length: slashLen,
    width: slash.width * 1.2,
    dmg,
    tier,
    delay: BK.CHARGE_AFTERMATH_DELAY,
    triggered: false,
  });

  // Teleport player to slash endpoint (背身收剑)
  P.x = startX + Math.cos(angle) * Math.min(slashLen * 0.8, 600);
  P.y = startY + Math.sin(angle) * Math.min(slashLen * 0.8, 600);

  // Cooldown
  P.skill1Cd = BK.CHARGE_COOLDOWN;

  // Massive particle explosion at origin
  const colors = ['#ff8800', '#ff2200', '#ffffff'];
  particles.spawn(startX, startY, colors[tier - 1], 20, 6, 30, 5);
  particles.spawnSquares(startX, startY, '#ff0000', 15, 5, 25, 4);

  return { hitstop: BK.CHARGE_HITSTOP, tier, impactFrame: tier === 3 ? 3 : 0 };
}
