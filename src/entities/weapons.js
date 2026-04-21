// ===========================
//  Weapons — definitions + shooting logic
// ===========================
import CONFIG from '../config.js';
import { rand } from '../utils.js';

const WC = CONFIG.WEAPONS;

export const WEAPONS = [
  {
    name: WC.PISTOL.NAME, rate: WC.PISTOL.FIRE_RATE,
    bulletSpd: WC.PISTOL.BULLET_SPEED, dmg: WC.PISTOL.DAMAGE,
    color: WC.PISTOL.COLOR, count: WC.PISTOL.BULLET_COUNT,
    spread: WC.PISTOL.SPREAD, range: WC.PISTOL.RANGE,
    r: WC.PISTOL.BULLET_RADIUS,
  },
  {
    name: WC.SHOTGUN.NAME, rate: WC.SHOTGUN.FIRE_RATE,
    bulletSpd: WC.SHOTGUN.BULLET_SPEED, dmg: WC.SHOTGUN.DAMAGE,
    color: WC.SHOTGUN.COLOR, count: WC.SHOTGUN.BULLET_COUNT,
    spread: WC.SHOTGUN.SPREAD, range: WC.SHOTGUN.RANGE,
    r: WC.SHOTGUN.BULLET_RADIUS,
  },
  {
    name: WC.PLASMA.NAME, rate: WC.PLASMA.FIRE_RATE,
    bulletSpd: 0, dmg: WC.PLASMA.DAMAGE_MIN,
    color: WC.PLASMA.COLOR, count: 0, spread: 0,
    range: WC.PLASMA.RANGE,
  },
];

export function shoot(player, bullets, particles) {
  if (player.shootCd > 0 || player.rolling) return;
  const w = WEAPONS[player.weapon];

  // Pistol uses dynamic ramping fire rate
  if (player.weapon === 0) {
    const PC_W = WC.PISTOL;
    player.shootCd = Math.max(PC_W.RAMP_MIN_RATE, Math.round(player.pistolCurrentRate));
    // Ramp up: decrease fire rate (faster shooting) each shot
    player.pistolCurrentRate = Math.max(PC_W.RAMP_MIN_RATE, player.pistolCurrentRate - PC_W.RAMP_SPEED);
    // Calculate heat (0 = cold, 1 = max heat)
    player.pistolHeat = 1 - (player.pistolCurrentRate - PC_W.RAMP_MIN_RATE) / (PC_W.RAMP_START_RATE - PC_W.RAMP_MIN_RATE);
    player.pistolHeat = Math.max(0, Math.min(1, player.pistolHeat));
  } else {
    player.shootCd = w.rate;
  }

  if (player.weapon === 2) { player.plasmaOn = true; return; }

  const PC = CONFIG.PLAYER;
  const dmg = w.dmg * (player.rollDmgBoost ? PC.ROLL_DMG_MULTIPLIER : 1);
  const heat = player.weapon === 0 ? player.pistolHeat : 0;

  // Pistol fires more bullets at higher heat (1 → 2 → 3)
  const bulletCount = player.weapon === 0 ? 1 + Math.floor(heat * 2) : w.count;

  for (let i = 0; i < bulletCount; i++) {
    // Pistol: add spread based on heat level
    const heatSpread = player.weapon === 0 ? heat * WC.PISTOL.RAMP_MAX_SPREAD : 0;
    const a = player.angle + (w.count > 1 ? (i - Math.floor(w.count / 2)) * w.spread : 0) + rand(-0.03 - heatSpread, 0.03 + heatSpread);
    const bx = player.x + Math.cos(player.angle) * 22;
    const by = player.y + Math.sin(player.angle) * 22;
    // Color shift: cyan → purple → red based on heat (very dramatic)
    let bulletColor = w.color;
    let bulletR = w.r || 3;
    if (player.weapon === 0 && heat > 0) {
      // Staged color: cyan(0) → blue-purple(0.3) → magenta(0.6) → red-orange(1.0)
      let r, g, b;
      if (heat < 0.3) {
        const t = heat / 0.3;
        r = Math.floor(68 + t * 100);    // 68 → 168
        g = Math.floor(221 - t * 121);   // 221 → 100
        b = 255;                          // stays bright
      } else if (heat < 0.6) {
        const t = (heat - 0.3) / 0.3;
        r = Math.floor(168 + t * 87);    // 168 → 255
        g = Math.floor(100 - t * 60);    // 100 → 40
        b = Math.floor(255 - t * 55);    // 255 → 200
      } else {
        const t = (heat - 0.6) / 0.4;
        r = 255;                          // stays max
        g = Math.floor(40 - t * 20);     // 40 → 20
        b = Math.floor(200 - t * 140);   // 200 → 60
      }
      bulletColor = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
      // Bullet grows bigger at high heat
      bulletR = 3 + heat * 2; // 3 → 5
    }
    const kb = (player.weapon === 1 && WC.SHOTGUN.KNOCKBACK) ? WC.SHOTGUN.KNOCKBACK : undefined;
    bullets.push({
      x: bx, y: by,
      vx: Math.cos(a) * w.bulletSpd,
      vy: Math.sin(a) * w.bulletSpd,
      life: w.range, dmg, color: bulletColor, r: bulletR,
      ...(kb !== undefined ? { knockback: kb } : {}),
    });
  }
  if (player.rollDmgBoost) {
    player.rollDmgBoost = false;
    player.rollDmgTimer = 0;
    particles.spawn(player.x, player.y, '#FFD700', 8, 5, 18, 4);
    particles.spawn(player.x, player.y, '#FFAA00', 12, 3, 25, 3);
  }
  
  // Muzzle flash — scales with heat
  const mx = player.x + Math.cos(player.angle) * 22;
  const my = player.y + Math.sin(player.angle) * 22;
  if (player.weapon === 0 && heat > 0.3) {
    // Heat-tinted muzzle flash
    const flashColor = heat > 0.7 ? '#ff4444' : '#aa66ff';
    particles.spawn(mx, my, flashColor, 6 + Math.floor(heat * 8), 3 + heat * 3, 12, 3);
    particles.spawn(mx, my, '#ffffff', 4 + Math.floor(heat * 6), 2, 15, 2);
  } else {
    particles.spawn(mx, my, w.color, 8, 4, 15, 3);
    particles.spawn(mx, my, '#ffffff', 5, 2, 20, 2);
  }

  return w.name === WC.SHOTGUN.NAME ? 3 : (player.weapon === 0 ? Math.max(1, Math.ceil(heat * 2)) : 1); 
}
