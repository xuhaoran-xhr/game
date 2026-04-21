// ===========================
//  Player — movement, rolling, skills, rendering
// ===========================
import CONFIG from '../config.js';
import { ang, clamp, dist } from '../utils.js';

const PC = CONFIG.PLAYER;

export function createPlayer(W, H) {
  return {
    faction: 'player',
    type: 'ranged',
    x: W / 2, y: H / 2, angle: 0, radius: PC.RADIUS,
    speed: PC.SPEED, hp: PC.MAX_HP, maxHp: PC.MAX_HP,
    rolling: false, rollT: 0, rollDur: PC.ROLL_DURATION, rollCd: 0, rollCdMax: PC.ROLL_COOLDOWN,
    rollDx: 0, rollDy: 0, invincible: false,
    rollDmgBoost: false, rollDmgTimer: 0,
    weapon: 0, shootCd: 0, plasmaOn: false,
    plasmaCharge: 0, plasmaFiring: false, plasmaFireTimer: 0, plasmaFireAngle: 0, plasmaFireCharge: 0,
    plasmaOverdrive: false,
    pistolHeat: 0, pistolCurrentRate: CONFIG.WEAPONS.PISTOL.RAMP_START_RATE,
    skill1Cd: 0, skill1Max: PC.SKILL_Q_COOLDOWN,
    skill2Cd: 0, skill2Max: PC.SKILL_E_COOLDOWN,
    comboSpeed: 0, plasmaHist: [],
  };
}

export function resetPlayer(P, W, H) {
  P.x = W / 2; P.y = H / 2; P.hp = PC.MAX_HP; P.maxHp = PC.MAX_HP;
  P.radius = PC.RADIUS; P.speed = PC.SPEED;
  P.rolling = false; P.rollCd = 0; P.invincible = false;
  P.rollDmgBoost = false; P.rollDmgTimer = 0;
  P.weapon = 0; P.shootCd = 0; P.plasmaOn = false;
  P.plasmaCharge = 0; P.plasmaFiring = false; P.plasmaFireTimer = 0; P.plasmaFireAngle = 0; P.plasmaFireCharge = 0;
  P.plasmaOverdrive = false;
  P.pistolHeat = 0; P.pistolCurrentRate = CONFIG.WEAPONS.PISTOL.RAMP_START_RATE;
  P.skill1Cd = 0; P.skill2Cd = 0;
  P.skill1Max = PC.SKILL_Q_COOLDOWN; P.skill2Max = PC.SKILL_E_COOLDOWN;
  P.rollDur = PC.ROLL_DURATION; P.rollCdMax = PC.ROLL_COOLDOWN;
  P.comboSpeed = 0; P.plasmaHist = [];
  // Remove ship DOM element so it gets recreated fresh
  if (P._shipEl) { P._shipEl.remove(); P._shipEl = null; }
  if (P._xhairEl) { P._xhairEl.remove(); P._xhairEl = null; }
}

export function updatePlayer(P, keys, mouse, W, H, particles) {
  P.angle = ang(P, mouse);

  // --- Launched (Boss6 tentacle): freeze input, position is driven externally. ---
  // The Boss6 launched-target ticker updates P.x/P.y + P.launchScale each frame,
  // so we skip all movement, rolling, and skill inputs here.
  if (P.launched) {
    // Still decrement skill cooldowns so they finish while airborne (QoL)
    if (P.shootCd > 0) P.shootCd--;
    if (P.skill1Cd > 0) P.skill1Cd--;
    if (P.skill2Cd > 0) P.skill2Cd--;
    if (P.rollCd > 0) P.rollCd--;
    return;
  }

  let mx = 0, my = 0;
  if (keys['w'] || keys['arrowup']) my = -1;
  if (keys['s'] || keys['arrowdown']) my = 1;
  if (keys['a'] || keys['arrowleft']) mx = -1;
  if (keys['d'] || keys['arrowright']) mx = 1;
  const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;

  const isCharging = P.weapon === 2 && P.plasmaCharge > 0;
  if (P.webSlowed > 0) P.webSlowed--;
  // Snare (web spray): hard position lock, no escape
  if (P.snared > 0) {
    P.snared--;
    if (P.snareX !== undefined) { P.x = P.snareX; P.y = P.snareY; }
    else { P.snareX = P.x; P.snareY = P.y; }
  } else {
    P.snareTier = 0; P.snareX = undefined; P.snareY = undefined;
  }
  const webSlowMult = (P.webSlowed > 0 && !P.rolling) ? (1 - (CONFIG.BOSS2?.WEB_ZONE_SLOW || 0.50)) : 1;
  const effSpeed = (P.snared > 0) ? 0
    : (P.speed + P.comboSpeed - (isCharging ? P.speed * PC.PLASMA_SLOW_FACTOR : 0)) * webSlowMult;

  if (P.rolling) {
    P.rollT--;
    P.x += P.rollDx * PC.ROLL_SPEED;
    P.y += P.rollDy * PC.ROLL_SPEED;
    P.invincible = true;

    // Intense roll particles
    const rp = P.angle + Math.PI;
    particles.spawn(P.x, P.y, '#ffffff', 8, 4, 15, 2);
    particles.spawn(P.x - P.rollDx * 10, P.y - P.rollDy * 10, '#88ccff', 10, 3, 20, 3);

    if (P.rollT <= 0) {
      P.rolling = false; P.invincible = false;
      P.rollCd = P.rollCdMax;
      P.rollDmgBoost = true; P.rollDmgTimer = PC.ROLL_DMG_BOOST_WINDOW;
    }
  } else {
    P.x += mx * effSpeed; P.y += my * effSpeed;

    // Moving particles (engine exhaust)
    if ((mx !== 0 || my !== 0) && Math.random() > 0.3) {
      const eAngle = P.angle + Math.PI + (Math.random() - 0.5) * 0.5;
      const ex = P.x + Math.cos(P.angle + Math.PI) * 10;
      const ey = P.y + Math.sin(P.angle + Math.PI) * 10;
      particles.spawn(ex, ey, '#00ffff', 4, 2, 8 + Math.random() * 5, 2);
      if (Math.random() > 0.5) {
        particles.spawn(ex, ey, '#aa22ff', 3, 1, 12, 1);
      }
    }
  }
  P.x = clamp(P.x, P.radius, W - P.radius);
  P.y = clamp(P.y, P.radius, H - P.radius);

  // Roll trigger
  if (keys[' '] && !P.rolling && P.rollCd <= 0) {
    P.rolling = true; P.rollT = P.rollDur;
    P.rollDx = mx || Math.cos(P.angle);
    P.rollDy = my || Math.sin(P.angle);
    // Initial burst
    particles.spawn(P.x, P.y, '#ffffff', 20, 8, 25, 5);
    particles.spawn(P.x, P.y, '#0088ff', 30, 6, 30, 4);
    keys[' '] = false;
  }
  if (P.rollCd > 0) P.rollCd--;
  if (P.rollDmgTimer > 0) {
    P.rollDmgTimer--;
    if (P.rollDmgTimer <= 0) P.rollDmgBoost = false;
  }

  if (P.shootCd > 0) P.shootCd--;
  if (P.skill1Cd > 0) P.skill1Cd--;
  if (P.skill2Cd > 0) P.skill2Cd--;

  return { mx, my };
}

export function dmgPlayer(P, dmg, enemies, particles) {
  if (P.invincible) return false;
  P.hp -= dmg;
  particles.spawn(P.x, P.y, '#ff4444', 8, 4, 18, 3);
  return P.hp <= 0; // true = dead
}

export function castBlackHole(P, gravWells, particles) {
  if (P.skill1Cd > 0) return;
  P.skill1Cd = P.skill1Max;
  const BH = CONFIG.BLACK_HOLE;
  const tx = P.x + Math.cos(P.angle) * BH.THROW_DISTANCE;
  const ty = P.y + Math.sin(P.angle) * BH.THROW_DISTANCE;
  gravWells.push({
    x: tx, y: ty, life: BH.DURATION, ml: BH.DURATION,
    radius: BH.PULL_RADIUS, dmg: BH.DAMAGE_PER_FRAME, pullForce: BH.PULL_FORCE,
  });
  particles.spawn(tx, ty, '#aa44ff', 12, 2, 30, 3);
}

export function castCharmEgg(P, charmBullets, particles) {
  if (P.skill2Cd > 0) return;
  P.skill2Cd = P.skill2Max;
  const CE = CONFIG.CHARM_EGG;
  charmBullets.push({
    x: P.x, y: P.y,
    vx: Math.cos(P.angle) * CE.SPEED,
    vy: Math.sin(P.angle) * CE.SPEED,
    life: CE.LIFETIME,
    r: CE.RADIUS,
    color: CE.COLOR,
  });
  particles.spawn(P.x, P.y, CE.COLOR, 10, 3, 20, 3);
}

// ===== Player Ship CSS & DOM helpers (like Boss4 ghost) =====
let playerCSSInjected = false;
function injectPlayerCSS() {
  if (playerCSSInjected) return;
  playerCSSInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    .player-ship { position:absolute; width:80px; height:80px; pointer-events:none; z-index:45;
      filter: drop-shadow(0 0 12px rgba(0,200,255,0.8)); transition: filter 0.15s; }
    .player-ship.rolling {
      filter: drop-shadow(0 0 25px rgba(255,255,255,0.95)) drop-shadow(0 0 15px rgba(100,200,255,0.9));
    }
    .player-ship.rolling .ring-outer, .player-ship.rolling .ring-inner {
      border-color: #ffffff !important; border-top-color: #ffffff !important;
      animation-duration: 0.5s !important;
    }
    .player-ship.rolling .crystal { background: #ffffff !important; box-shadow: 0 0 30px #ffffff !important; }
    .player-ship.boosted {
      filter: drop-shadow(0 0 15px rgba(255,234,0,0.9)) drop-shadow(0 0 8px rgba(255,100,0,0.7));
    }
    .player-ship.boosted .ring-outer { border-color: rgba(255,234,0,0.8) !important; }
    .player-ship.boosted .ring-inner { border-top-color: #ffea00 !important; border-color: rgba(255,100,0,0.5) !important; }
    .player-ship.boosted .crystal { background: radial-gradient(circle, #ffffff, #ffaa00) !important; }

    /* Overdrive Glitch Effect */
    .player-ship.overdrive-glitch {
      filter: drop-shadow(0 0 20px rgba(255,50,0,0.9)) drop-shadow(0 0 10px rgba(255,180,0,0.7)) !important;
      animation: glitchShake 0.08s infinite alternate !important;
    }
    .player-ship.overdrive-glitch .ring-outer {
      border-color: rgba(255,60,0,0.8) !important;
      animation-duration: 0.3s !important;
    }
    .player-ship.overdrive-glitch .ring-inner {
      border-color: rgba(255,100,0,0.6) !important;
      border-top-color: #ff2200 !important;
      animation-duration: 0.2s !important;
    }
    .player-ship.overdrive-glitch .crystal {
      background: radial-gradient(circle, #ffffff, #ff2200) !important;
      box-shadow: 0 0 25px #ff4400 !important;
    }
    .player-ship.overdrive-glitch .wtip {
      background: #ff4400 !important;
      box-shadow: 0 0 12px #ff2200 !important;
    }
    @keyframes glitchShake {
      0% { transform: translate(-50%,-50%) translate(-2px, 1px); }
      20% { transform: translate(-50%,-50%) translate(2px, -1px); }
      40% { transform: translate(-50%,-50%) translate(-1px, -2px); }
      60% { transform: translate(-50%,-50%) translate(1px, 2px); }
      80% { transform: translate(-50%,-50%) translate(-2px, -1px); }
      100% { transform: translate(-50%,-50%) translate(2px, 1px); }
    }

    /* Pistol Overheat Effect */
    .player-ship.pistol-overheat {
      filter: drop-shadow(0 0 14px rgba(200,80,255,0.7)) drop-shadow(0 0 6px rgba(255,100,80,0.5)) !important;
    }
    .player-ship.pistol-overheat .ring-outer {
      border-color: rgba(200,80,255,0.7) !important;
    }
    .player-ship.pistol-overheat .crystal {
      background: radial-gradient(circle, #ffffff, #cc55ff) !important;
    }
    .player-ship.pistol-overheat .wtip {
      background: #cc55ff !important;
      box-shadow: 0 0 10px #aa44ff !important;
    }

    .player-ship .ring-outer { position:absolute; top:5px; left:5px; width:70px; height:70px;
      border: 3px dashed #00ccff; border-radius: 50%; animation: pSpin 4s linear infinite; }
    .player-ship .ring-inner { position:absolute; top:15px; left:15px; width:50px; height:50px;
      border: 2px solid rgba(0,150,255,0.4); border-radius: 50%; border-top-color: #ffffff;
      animation: pSpinRev 2s linear infinite; }
    .player-ship .crystal { position:absolute; top:25px; left:25px; width:30px; height:30px;
      clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      background: radial-gradient(circle, #ffffff, #0088ff);
      animation: pFloat 1.5s ease-in-out infinite alternate; }
    .player-ship .wtip { position:absolute; top:36px; left:78px; width:8px; height:8px; border-radius: 50%;
      background: #00ffff; box-shadow: 0 0 8px #00ffff; }

    @keyframes pSpin { 100% { transform: rotate(360deg); } }
    @keyframes pSpinRev { 100% { transform: rotate(-360deg); } }
    @keyframes pFloat { to { transform: scale(1.15) translateY(-2px); box-shadow: 0 0 20px #fff; } }

    /* === Plasma Charge Crosshair (3D Holographic) === */
    .plasma-xhair { position:absolute; pointer-events:none; z-index:44;
      transform-style: preserve-3d; display:flex; justify-content:center; align-items:center;
      opacity:0; scale:0; transition: opacity 0.2s ease-in, scale 0.2s ease-in; }
    .plasma-xhair.active { opacity:1; scale:1;
      transition: opacity 0.8s ease-out, scale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .plasma-xhair svg { position:absolute; fill:none; width:100%; height:100%;
      z-index: calc(1 - (0.2 * var(--j)));
      transform-origin: center;
      transform: rotate(-80deg) skew(30deg)
        translateX(calc(var(--spread, 45px) * var(--i)))
        translateY(calc(var(--spread-y, -35px) * var(--i))); }

    #xh-out2 { animation: xhR 7s ease-in-out infinite alternate; transform-origin: center; }
    #xh-out3 { stroke: #FFD700; animation: xhR 3s ease-in-out infinite alternate; transform-origin: center; }
    #xh-inner3, #xh-inner1 { animation: xhR 4s ease-in-out infinite alternate; transform-origin: center; }
    #xh-center1 { fill: #FFD700; animation: xhR 2s ease-in-out infinite alternate; transform-origin: center; }
    #xh-center { fill: #00FFFF; }
    @keyframes xhR { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

function createCrosshairDOM() {
  const el = document.createElement('div');
  el.className = 'plasma-xhair';
  el.innerHTML = `
    <svg style="--i:0;--j:0;" viewBox="0 0 344 344">
      <g id="xh-out1">
        <path d="M72 172C72 116.772 116.772 72 172 72C227.228 72 272 116.772 272 172C272 227.228 227.228 272 172 272C116.772 272 72 227.228 72 172ZM197.322 172C197.322 158.015 185.985 146.678 172 146.678C158.015 146.678 146.678 158.015 146.678 172C146.678 185.985 158.015 197.322 172 197.322C185.985 197.322 197.322 185.985 197.322 172Z" stroke="#00FFFF" stroke-width="2" stroke-miterlimit="16"/>
      </g>
    </svg>
    <svg style="--i:1;--j:1;" viewBox="0 0 344 344">
      <g id="xh-out2">
        <path fill="#00FFFF" d="M102.892 127.966C93.373 142.905 88.952 160.527 90.29 178.19L94.375 177.88C93.104 161.1 97.305 144.36 106.347 130.168L102.892 127.966Z"/>
        <path fill="#00FFFF" d="M93.34 194.968C98.305 211.971 108.646 226.908 122.814 237.541L125.273 234.264C111.814 224.163 101.99 209.973 97.273 193.819L93.34 194.968Z"/>
        <path fill="#00FFFF" d="M152.707 92.359C140.33 95.358 128.822 101.199 119.097 109.421L121.742 112.55C130.981 104.739 141.914 99.19 153.672 96.341L152.707 92.359Z"/>
        <path fill="#00FFFF" d="M253.294 161.699C255.099 175.937 253.132 190.4 247.59 203.639L243.811 202.057C249.075 189.48 250.944 175.74 249.23 162.214L253.294 161.699Z"/>
        <path fill="#00FFFF" d="M172 90.056C184.677 90.056 197.18 92.997 208.528 98.647C219.875 104.298 229.757 112.505 237.396 122.621L234.126 125.09C226.869 115.479 217.481 107.683 206.701 102.315C195.921 96.947 184.043 94.153 172 94.153V90.056Z"/>
        <path fill="#00FFFF" d="M244.195 133.235C246.991 138.442 249.216 143.937 250.83 149.623L246.888 150.742C245.355 145.34 243.242 140.12 240.586 135.174L244.195 133.235Z"/>
        <path fill="#00FFFF" d="M234.238 225.304C223.932 237.338 210.358 246.126 195.159 250.604C179.961 255.082 163.79 255.058 148.606 250.534L149.775 246.607C164.201 250.905 179.563 250.928 194.001 246.674C208.44 242.42 221.335 234.071 231.126 222.639L234.238 225.304Z"/>
      </g>
    </svg>
    <svg style="--i:0;--j:2;" viewBox="0 0 344 344">
      <path stroke="#FFD700" d="M240.944 172C240.944 187.951 235.414 203.408 225.295 215.738C215.176 228.068 201.095 236.508 185.45 239.62C169.806 242.732 153.567 240.323 139.5 232.804C125.433 225.285 114.408 213.12 108.304 198.384C102.2 183.648 101.394 167.25 106.024 151.987C110.654 136.723 120.434 123.537 133.696 114.675C146.959 105.813 162.884 101.824 178.758 103.388C194.632 104.951 209.472 111.97 220.751 123.249" id="xh-out3"/>
      <g id="xh-inner3">
        <path fill="#00FFFF" d="M195.136 135.689C188.115 131.215 179.948 128.873 171.624 128.946C163.299 129.019 155.174 131.503 148.232 136.099L148.42 136.382C155.307 131.823 163.368 129.358 171.627 129.286C179.886 129.213 187.988 131.537 194.954 135.975L195.136 135.689Z"/>
        <path fill="#00FFFF" d="M195.136 208.311C188.115 212.784 179.948 215.127 171.624 215.054C163.299 214.981 155.174 212.496 148.232 207.901L148.42 207.618C155.307 212.177 163.368 214.642 171.627 214.714C179.886 214.786 187.988 212.463 194.954 208.025L195.136 208.311Z"/>
      </g>
    </svg>
    <svg style="--i:1;--j:3;" viewBox="0 0 344 344">
      <g id="xh-inner1">
        <path fill="#00FFFF" fill-rule="evenodd" clip-rule="evenodd" d="M145.949 124.51L148.554 129.259C156.575 124.859 165.672 122.804 174.806 123.331C183.94 123.858 192.741 126.944 200.203 132.236C207.665 137.529 213.488 144.815 217.004 153.261C220.521 161.707 221.59 170.972 220.09 179.997L225.628 164.381C224.987 159.867 223.775 155.429 222.005 151.179C218.097 141.795 211.628 133.699 203.337 127.818C195.045 121.937 185.266 118.508 175.118 117.923C165.302 117.357 155.525 119.474 146.83 124.037C146.535 124.192 146.241 124.349 145.949 124.51Z"/>
        <path fill="#00FFFF" fill-rule="evenodd" clip-rule="evenodd" d="M139.91 220.713C134.922 217.428 130.469 213.395 126.705 208.758L130.983 205.286L134.148 202.721C141.342 211.584 151.417 217.642 162.619 219.839C173.821 222.036 185.438 220.232 195.446 214.742L198.051 219.491C197.759 219.651 197.465 219.809 197.17 219.963C186.252 225.693 173.696 227.531 161.577 225.154C154.613 223.789 148.041 221.08 142.202 217.234L139.91 220.713Z"/>
      </g>
    </svg>
    <svg style="--i:2;--j:4;" viewBox="0 0 344 344">
      <path fill="#FFD700" d="M180.956 186.056C183.849 184.212 186.103 181.521 187.41 178.349C188.717 175.177 189.013 171.679 188.258 168.332C187.503 164.986 185.734 161.954 183.192 159.65C180.649 157.346 177.458 155.883 174.054 155.46C170.649 155.038 167.197 155.676 164.169 157.288C161.14 158.9 158.683 161.407 157.133 164.468C155.582 167.528 155.014 170.992 155.505 174.388C155.997 177.783 157.524 180.944 159.879 183.439L161.129 182.259C159.018 180.021 157.648 177.186 157.207 174.141C156.766 171.096 157.276 167.989 158.667 165.245C160.057 162.5 162.261 160.252 164.977 158.806C167.693 157.36 170.788 156.788 173.842 157.167C176.895 157.546 179.757 158.858 182.037 160.924C184.317 162.99 185.904 165.709 186.581 168.711C187.258 171.712 186.992 174.849 185.82 177.694C184.648 180.539 182.627 182.952 180.032 184.606L180.956 186.056Z" id="xh-center1"/>
      <path fill="#00FFFF" d="M172 166.445C175.068 166.445 177.556 168.932 177.556 172C177.556 175.068 175.068 177.556 172 177.556C168.932 177.556 166.444 175.068 166.444 172C166.444 168.932 168.932 166.445 172 166.445ZM172 177.021C174.773 177.021 177.021 174.773 177.021 172C177.021 169.227 174.773 166.979 172 166.979C169.227 166.979 166.979 169.227 166.979 172C166.979 174.773 169.227 177.021 172 177.021Z" id="xh-center"/>
    </svg>
  `;
  return el;
}

function createPlayerDOM() {
  injectPlayerCSS();
  const el = document.createElement('div');
  el.className = 'player-ship';

  const rotator = document.createElement('div');
  rotator.className = 'rotator';
  rotator.style.cssText = 'position:absolute;width:100%;height:100%;top:0;left:0;';

  ['ring-outer', 'ring-inner', 'wtip'].forEach(c => {
    const d = document.createElement('div');
    d.className = c;
    rotator.appendChild(d);
  });
  el.appendChild(rotator);

  const crystal = document.createElement('div');
  crystal.className = 'crystal';
  el.appendChild(crystal);

  return el;
}

export function drawPlayer(g, P, keys, weapons, time) {
  // Create DOM ship once
  if (!P._shipEl) {
    P._shipEl = createPlayerDOM();
    P._xhairEl = createCrosshairDOM();
    const container = document.querySelector('canvas')?.parentElement;
    if (container) {
      container.style.position = 'relative';
      container.appendChild(P._shipEl);
      container.appendChild(P._xhairEl);
    }
  }
  const el = P._shipEl;
  const xh = P._xhairEl;
  if (!el || !el.parentElement) return;

  // Hide when player hidden
  if (P.hidden) { el.style.display = 'none'; if (xh) xh.style.display = 'none'; return; }
  el.style.display = '';

  // Position (game coords → screen coords, same method as ghost)
  const canvas = document.querySelector('canvas');
  if (canvas) {
    const scaleX = canvas.clientWidth / canvas.width;
    const scaleY = canvas.clientHeight / canvas.height;
    el.style.left = (P.x * scaleX) + 'px';
    el.style.top = (P.y * scaleY) + 'px';

    // Position crosshair centered on player - 3D holographic hover effect
    if (xh) {
      const isCharging = P.weapon === 2 && P.plasmaCharge > 120 && !P.plasmaFiring;
      xh.classList.toggle('active', isCharging);
      if (isCharging) {
        const maxFrames = CONFIG.WEAPONS.PLASMA.OVERDRIVE_MAX_FRAMES || 960;
        const normalMax = CONFIG.WEAPONS.PLASMA.MAX_CHARGE_FRAMES || 480;
        const chrgPct = Math.min(1, P.plasmaCharge / normalMax);
        const isOD = P.plasmaOverdrive;
        const odPct = isOD ? Math.min(1, (P.plasmaCharge - normalMax) / (maxFrames - normalMax)) : 0;
        // After 5s (300 frames), crosshair grows bigger; in overdrive grows even more
        const overchargeStart = 300 / normalMax;
        const isOvercharge = chrgPct > overchargeStart;
        const overPct = isOvercharge ? (chrgPct - overchargeStart) / (1 - overchargeStart) : 0;
        let size = isOvercharge ? 140 + overPct * 120 : 140;
        if (isOD) size = 260 + odPct * 120; // grows up to 380px in overdrive
        xh.style.width = size + 'px';
        xh.style.height = size + 'px';
        xh.style.left = (P.x * scaleX - size / 2) + 'px';
        xh.style.top = (P.y * scaleY - size / 2) + 'px';
        xh.style.opacity = isOD ? 0.7 + odPct * 0.3 : 0.5 + chrgPct * 0.5;
        // Increase 3D spread with charge level
        const spread = isOD ? 50 + odPct * 30 : 10 + chrgPct * 40;
        xh.style.setProperty('--spread', spread + 'px');
        xh.style.setProperty('--spread-y', (-0.78 * spread) + 'px');
        // Filter: cyan in normal, red/orange in overdrive
        if (isOD) {
          const r = 255, g = Math.floor(50 + (1 - odPct) * 150), b = 0;
          xh.style.filter = `drop-shadow(0 0 ${18 + odPct * 20}px rgba(${r},${g},${b},${0.7 + odPct * 0.3})) hue-rotate(${-120 + odPct * 30}deg)`;
        } else {
          xh.style.filter = `drop-shadow(0 0 ${6 + chrgPct * 18}px rgba(0,255,255,${0.4 + chrgPct * 0.6}))`;
        }
        // Rotate the whole crosshair to follow the mouse
        const aimDeg = P.angle * (180 / Math.PI) + 140;
        xh.style.transform = `rotate(${aimDeg}deg)`;
        
        // Speed up SVG ring rotations with charge (normal: gradual, overdrive: noticeable)
        const svgs = xh.querySelectorAll('g, path[id]');
        if (isOD) {
          // Overdrive: noticeably faster (1.5s → 0.8s)
          const speed = 1.5 - odPct * 0.7;
          svgs.forEach(el => { if (el.style) el.style.animationDuration = speed + 's'; });
        } else {
          // Normal: slightly speed up (3s → 1.5s at full charge)  
          const speed = 3 - chrgPct * 1.5;
          svgs.forEach(el => { if (el.style) el.style.animationDuration = speed + 's'; });
        }
      } else {
        // Reset animation speed when not charging
        const svgs = xh.querySelectorAll('g, path[id]');
        svgs.forEach(el => { if (el.style) el.style.animationDuration = ''; });
      }
    }
  }

  // Position container center — include launch-scale pulse if being yanked by Boss6 tentacle
  const ls = (P.launched && P.launchScale) ? P.launchScale : 1;
  el.style.transform = ls !== 1
    ? `translate(-50%,-50%) scale(${ls})`
    : `translate(-50%,-50%)`;

  // Rotate ONLY the rotator to face mouse
  const deg = P.angle * (180 / Math.PI);
  const rotator = el.querySelector('.rotator');
  if (rotator) rotator.style.transform = `rotate(${deg}deg)`;

  // State classes
  el.classList.toggle('rolling', !!P.rolling);
  el.classList.toggle('boosted', !!(!P.rolling && P.rollDmgBoost));
  el.classList.toggle('overdrive-glitch', !!P.plasmaOverdrive && P.plasmaCharge > 0);
  el.classList.toggle('pistol-overheat', P.weapon === 0 && P.pistolHeat > (CONFIG.WEAPONS.PISTOL.OVERHEAT_THRESHOLD || 0.6));

  // Weapon color on tip
  const wpnColor = weapons[P.weapon]?.color || '#00ffff';
  const tip = el.querySelector('.wtip');
  if (tip) { tip.style.background = wpnColor; tip.style.boxShadow = `0 0 5px ${wpnColor}`; }

  // Canvas aura (subtle glow behind the DOM ship)
  g.save();
  g.translateCanvas(P.x, P.y);
  const pulse = Math.sin(time * 0.008) * 2;
  const glowColor = P.rolling ? 0x88ccff : P.rollDmgBoost ? 0xff4400 : 0xaa22ff;
  g.fillStyle(glowColor, 0.08);
  g.fillCircle(0, 0, P.radius + 10 + pulse);
  g.restore();
}

