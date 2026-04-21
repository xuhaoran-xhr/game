// ===========================
//  Boss 3: Star Core Guardian (星核守卫)
// ===========================
import CONFIG from '../config.js';
import { ang, dist, lerp, clamp, rand, getCharmedTarget } from '../utils.js';

export function createBoss3(W, H, wave) {
  const B3 = CONFIG.BOSS3;
  const p1 = B3.PHASE1;
  // Create orbital shields
  const shields = [];
  for (let i = 0; i < p1.SHIELD_COUNT; i++) {
    shields.push({
      angle: (Math.PI * 2 / p1.SHIELD_COUNT) * i,
      hp: p1.SHIELD_HP,
      maxHp: p1.SHIELD_HP,
      radius: p1.SHIELD_RADIUS,
    });
  }
  return {
    faction: 'enemy',
    x: W / 2, y: -70,
    vx: 0, vy: 0,
    radius: B3.RADIUS,
    hp: B3.BASE_HP + wave * B3.HP_PER_WAVE,
    maxHp: B3.BASE_HP + wave * B3.HP_PER_WAVE,
    speed: p1.SPEED,
    color: B3.COLOR,
    phase: 1,
    atkTimer: 0,
    shields,
    shieldAngle: 0,
    bolts: [], // homing energy bolts
    gravityActive: false, gravityTimer: 0, gravityDuration: 0,
    hitFlash: 0, entered: false,
    bossName: '星核守卫',
    hpColor: 0xFFD700,
    updateFn: updateBoss3,
    drawFn: drawBoss3,
  };
}

export function updateBoss3(boss3, P, bullets, eBullets, mines, particles, gameState, weapons, enemies, otherBoss) {
  const b = boss3;
  const B3 = CONFIG.BOSS3;
  const W = gameState.W;
  const H = gameState.H;

  // Entry
  if (!b.entered) {
    b.y = lerp(b.y, H * 0.25, 0.025);
    if (b.y > H * 0.2) b.entered = true;
    return;
  }

  b.hitFlash = Math.max(0, b.hitFlash - 1);
  b.atkTimer++;
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

  // ---- Determine target ----
  const isCharmed = b.faction === 'ally';
  let T = P.hidden ? null : P;
  if (isCharmed) {
    const ct = getCharmedTarget(b, enemies, otherBoss);
    T = ct.target || (P.hidden ? null : P);
  } else if (P.hidden) {
    if (otherBoss && otherBoss.faction === 'ally' && otherBoss.hp > 0) T = otherBoss;
    else if (enemies) {
      for (const e of enemies) { if (e.faction === 'ally') { T = e; break; } }
    }
  }
  // Store last known target so ongoing attacks finish
  const hasRealTarget = !!T;
  if (T) {
    b.lastTargetPos = { x: T.x, y: T.y };
  }
  if (!T) {
    T = b.lastTargetPos || { x: b.x, y: b.y };
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
      if (tt.hp > 0 && (tt.faction === 'ally' || (enemies && enemies.includes(tt)))) {
        T = tt;
      }
    }
  }

  // Phase check
  if (b.hp < b.maxHp * 0.5 && b.phase === 1) {
    b.phase = 2;
    b.speed = B3.PHASE2.SPEED;
    // Rebuild shields with more count
    b.shields = [];
    const p2 = B3.PHASE2;
    for (let i = 0; i < p2.SHIELD_COUNT; i++) {
      b.shields.push({
        angle: (Math.PI * 2 / p2.SHIELD_COUNT) * i,
        hp: p2.SHIELD_HP, maxHp: p2.SHIELD_HP,
        radius: CONFIG.BOSS3.PHASE1.SHIELD_RADIUS,
      });
    }
    particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : B3.COLOR, 30, 6, 30, 5);
    gameState.screenShake = 10;
    gameState.showWaveText('PHASE 2');
  }

  const ph = b.phase === 1 ? B3.PHASE1 : B3.PHASE2;

  // Movement — orbit around target slowly (only with real target)
  if (!b.gravityActive && hasRealTarget) {
    const a = ang(b, T);
    const targetDist = 180;
    const d = dist(b, T);
    if (d > targetDist + 40) {
      b.x += Math.cos(a) * b.speed;
      b.y += Math.sin(a) * b.speed;
    } else if (d < targetDist - 40) {
      b.x -= Math.cos(a) * b.speed * 0.5;
      b.y -= Math.sin(a) * b.speed * 0.5;
    } else {
      const circleA = a + Math.PI / 2 + Math.sin(b.atkTimer * 0.008) * 0.5;
      b.x += Math.cos(circleA) * b.speed * 0.7;
      b.y += Math.sin(circleA) * b.speed * 0.7;
    }
  }
  b.vx = (b.vx || 0) * 0.92; b.vy = (b.vy || 0) * 0.92;
  b.x += (b.vx || 0); b.y += (b.vy || 0);
  b.x = clamp(b.x, b.radius + 20, W - b.radius - 20);
  b.y = clamp(b.y, b.radius + 20, H - b.radius - 20);

  // ===== Orbital shields =====
  b.shieldAngle += (B3.PHASE1.SHIELD_ROTATION_SPEED || 0.02);
  const orbitR = B3.PHASE1.SHIELD_ORBIT_RADIUS;
  b.shields.forEach(s => {
    s.angle += B3.PHASE1.SHIELD_ROTATION_SPEED;
  });

  // ===== Pulse wave =====
  if (b.atkTimer % ph.PULSE_INTERVAL === 0) {
    for (let i = 0; i < ph.PULSE_BULLET_COUNT; i++) {
      const a = (Math.PI * 2 / ph.PULSE_BULLET_COUNT) * i + b.atkTimer * 0.01;
      const bul = {
        x: b.x, y: b.y,
        vx: Math.cos(a) * ph.PULSE_BULLET_SPEED,
        vy: Math.sin(a) * ph.PULSE_BULLET_SPEED,
        life: ph.PULSE_BULLET_LIFETIME, dmg: ph.PULSE_BULLET_DAMAGE,
        r: 4, color: isCharmed ? '#cc44ff' : '#FFD700',
      };
      if (isCharmed) bul.friendly = true;
      eBullets.push(bul);
    }
    gameState.screenShake = 2;
  }

  // ===== Homing bolts (only initiate with real target) =====
  if (hasRealTarget && b.atkTimer % ph.BOLT_INTERVAL === 0) {
    for (let i = 0; i < ph.BOLT_COUNT; i++) {
      const a = ang(b, T) + (i - Math.floor(ph.BOLT_COUNT / 2)) * 0.5;
      b.bolts.push({
        x: b.x, y: b.y,
        vx: Math.cos(a) * ph.BOLT_SPEED,
        vy: Math.sin(a) * ph.BOLT_SPEED,
        speed: ph.BOLT_SPEED,
        homing: ph.BOLT_HOMING,
        life: ph.BOLT_LIFETIME,
        dmg: ph.BOLT_DAMAGE,
        r: ph.BOLT_RADIUS,
        isCharmed: isCharmed,
      });
    }
  }

  // ===== Phase 2: Gravity pull =====
  if (b.phase === 2) {
    b.gravityTimer++;
    const p2 = B3.PHASE2;
    if (hasRealTarget && b.gravityTimer >= p2.GRAVITY_INTERVAL && !b.gravityActive) {
      b.gravityActive = true;
      b.gravityDuration = p2.GRAVITY_DURATION;
    }
    if (b.gravityActive) {
      b.gravityDuration--;
      // Pull target toward boss
      if (isCharmed) {
        // Charmed: pull enemies toward boss
        if (enemies) {
          for (const e of enemies) {
            if (e.faction !== 'enemy') continue;
            const ea = ang(e, b);
            e.x += Math.cos(ea) * p2.GRAVITY_STRENGTH;
            e.y += Math.sin(ea) * p2.GRAVITY_STRENGTH;
          }
        }
      } else if (hasRealTarget && T.x !== undefined) {
        // Only pull real target (not dummy lastTargetPos)
        const ga = ang(T, b);
        T.x += Math.cos(ga) * p2.GRAVITY_STRENGTH;
        T.y += Math.sin(ga) * p2.GRAVITY_STRENGTH;
      }
      if (b.gravityDuration <= 0) {
        b.gravityActive = false;
        b.gravityTimer = 0;
      }
    }

    // ===== Phase 2: Star burst =====
    if (b.atkTimer % p2.STARBURST_INTERVAL === 0) {
      for (let ring = 0; ring < p2.STARBURST_RINGS; ring++) {
        const spd = p2.STARBURST_SPEED_BASE + ring * p2.STARBURST_SPEED_INCREMENT;
        const offset = ring * 0.15;
        for (let i = 0; i < p2.STARBURST_BULLETS_PER_RING; i++) {
          const a = (Math.PI * 2 / p2.STARBURST_BULLETS_PER_RING) * i + offset;
          const bul = {
            x: b.x, y: b.y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            life: p2.STARBURST_LIFETIME, dmg: p2.STARBURST_DAMAGE,
            r: 3, color: isCharmed ? '#cc44ff' : '#ffaa00',
          };
          if (isCharmed) bul.friendly = true;
          eBullets.push(bul);
        }
      }
      gameState.screenShake = 5;
      particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : '#FFD700', 15, 4, 20, 3);
    }
  }

  // ===== Bolts update — all bolts track T =====
  b.bolts = b.bolts.filter(m => {
    const mTarget = T; // always track current resolved target
    const a = ang(m, mTarget);
    m.vx = lerp(m.vx, Math.cos(a) * m.speed, m.homing);
    m.vy = lerp(m.vy, Math.sin(a) * m.speed, m.homing);
    m.x += m.vx; m.y += m.vy;
    m.life--;
    if (m.isCharmed) {
      if (enemies) {
        for (const e of enemies) {
          if (e.faction !== 'enemy') continue;
          if (dist(m, e) < e.radius + m.r) {
            e.hp -= m.dmg; e.hitFlash = 6;
            particles.spawn(m.x, m.y, '#cc44ff', 6, 3, 12, 2);
            return false;
          }
        }
      }
    } else {
      if (!P.hidden && !P.invincible && dist(m, P) < P.radius + m.r) {
        gameState.dmgPlayer(m.dmg);
        particles.spawn(m.x, m.y, '#FFD700', 6, 3, 12, 2);
        gameState.screenShake = 3;
        return false;
      }
    }
    return m.life > 0;
  });

  // ===== Bullet vs boss & shields =====
  bullets.forEach(bul => {
    if (bul.life <= 0) return;
    // Check shields first
    for (const s of b.shields) {
      if (s.hp <= 0) continue;
      const sx = b.x + Math.cos(s.angle) * orbitR;
      const sy = b.y + Math.sin(s.angle) * orbitR;
      if (Math.hypot(bul.x - sx, bul.y - sy) < s.radius + 3) {
        s.hp -= bul.dmg;
        bul.life = 0;
        particles.spawn(bul.x, bul.y, '#FFD700', 4, 2, 10, 2);
        // Shield destroyed
        if (s.hp <= 0) {
          particles.spawn(sx, sy, '#FFD700', 12, 4, 20, 3);
          // Phase 2: shield explodes into bullets
          if (b.phase === 2) {
            const p2 = B3.PHASE2;
            for (let i = 0; i < p2.SHIELD_EXPLODE_BULLET_COUNT; i++) {
              const ea = (Math.PI * 2 / p2.SHIELD_EXPLODE_BULLET_COUNT) * i;
              const ebul = {
                x: sx, y: sy,
                vx: Math.cos(ea) * p2.SHIELD_EXPLODE_BULLET_SPEED,
                vy: Math.sin(ea) * p2.SHIELD_EXPLODE_BULLET_SPEED,
                life: p2.SHIELD_EXPLODE_LIFETIME, dmg: p2.SHIELD_EXPLODE_DAMAGE,
                r: 3, color: isCharmed ? '#cc44ff' : '#ffaa00',
              };
              if (isCharmed) ebul.friendly = true;
              eBullets.push(ebul);
            }
          }
        }
        return;
      }
    }
    // Then check boss body
    if (dist(bul, b) < b.radius) {
      b.hp -= bul.dmg; bul.life = 0; b.hitFlash = 6;
      particles.spawn(bul.x, bul.y, '#FFF', 3, 3, 10, 2);
      const ka = ang(bul, b);
      b.vx = (b.vx || 0) + Math.cos(ka) * 0.5;
      b.vy = (b.vy || 0) + Math.sin(ka) * 0.5;
      if (b.threatTable) b.threatTable.player = (b.threatTable.player || 0) + bul.dmg;
    }
  });


  // Boss dead
  if (b.hp <= 0) {
    particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : '#FFD700', 40, 7, 40, 6);
    particles.spawn(b.x, b.y, '#FFF', 25, 5, 35, 4);
    gameState.screenShake = 15;
    gameState.hitStop = CONFIG.COMBAT.HITSTOP_ON_BOSS_KILL;
    gameState.kills += B3.KILL_SCORE;
    gameState.showWaveText('BOSS DEFEATED!');
    return true;
  }

  // Contact damage
  if (isCharmed) {
    if (enemies) {
      for (const e of enemies) {
        if (e.faction !== 'enemy') continue;
        if (dist(b, e) < b.radius + e.radius) {
          e.hp -= B3.CONTACT_DAMAGE;
          e.hitFlash = 8;
          const pa = ang(b, e);
          e.vx = (e.vx || 0) + Math.cos(pa) * B3.CONTACT_KNOCKBACK;
          e.vy = (e.vy || 0) + Math.sin(pa) * B3.CONTACT_KNOCKBACK;
          particles.spawn(e.x, e.y, '#cc44ff', 5, 3, 12, 3);
        }
      }
    }
  } else {
    if (!P.invincible && dist(b, P) < b.radius + P.radius) {
      gameState.dmgPlayer(B3.CONTACT_DAMAGE);
      const pa = ang(b, P);
      P.x += Math.cos(pa) * B3.CONTACT_KNOCKBACK;
      P.y += Math.sin(pa) * B3.CONTACT_KNOCKBACK;
      gameState.screenShake = 5;
    }
  }

  return false;
}

export function drawBoss3(g, boss3, P, time) {
  const b = boss3;
  const B3 = CONFIG.BOSS3;
  const orbitR = B3.PHASE1.SHIELD_ORBIT_RADIUS;
  const b3Color = Phaser.Display.Color.HexStringToColor(B3.COLOR).color;

  g.save();
  g.translateCanvas(b.x, b.y);

  // Gravity field visual
  if (b.gravityActive) {
    const pulse = 1 + Math.sin(time * 0.01) * 0.2;
    const alpha = (b.gravityDuration / B3.PHASE2.GRAVITY_DURATION) * 0.3;
    g.lineStyle(2, b.faction === 'ally' ? 0xcc44ff : 0xffd700, alpha);
    g.strokeCircle(0, 0, 120 * pulse);
    g.strokeCircle(0, 0, 80 * pulse);
    g.strokeCircle(0, 0, 40 * pulse);
  }

  // Charmed aura
  if (b.faction === 'ally') {
    const pulse = 1 + Math.sin(time * 0.005) * 0.3;
    g.lineStyle(3, 0xcc44ff, 0.6);
    g.strokeCircle(0, 0, b.radius + 15 * pulse);
    g.lineStyle(1.5, 0xcc44ff, 0.3);
    g.strokeCircle(0, 0, b.radius + 25 * pulse);
  }

  // Orbital shields
  b.shields.forEach(s => {
    if (s.hp <= 0) return;
    const sx = Math.cos(s.angle) * orbitR;
    const sy = Math.sin(s.angle) * orbitR;
    const shieldColor = b.faction === 'ally' ? 0xcc44ff :
      (s.hp > s.maxHp * 0.5 ? 0xffd700 : 0xff8844);
    g.fillStyle(shieldColor, 0.8);
    g.fillCircle(sx, sy, s.radius);
    // Shield glow
    g.lineStyle(1.5, 0xffffff, 0.4);
    g.strokeCircle(sx, sy, s.radius + 2);
  });

  // Core — hexagon
  const coreColor = b.hitFlash > 0 ? 0xffffff : b.faction === 'ally' ? 0xcc44ff : b3Color;
  g.fillStyle(coreColor, 1);
  drawPoly(g, 0, 0, b.radius, 6, time * 0.0008);
  g.fillPath();

  // Inner crystal
  g.fillStyle(0xffffff, 0.3);
  drawPoly(g, 0, 0, b.radius * 0.5, 6, time * -0.0012);
  g.fillPath();

  // Center eye
  g.fillStyle(b.faction === 'ally' ? 0xcc44ff : 0xffa500, 0.9);
  g.fillCircle(0, 0, b.radius * 0.2);
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(0, 0, b.radius * 0.08);

  g.restore();

  // Bolts
  b.bolts.forEach(m => {
    const boltColor = m.isCharmed ? 0xcc44ff : 0xffd700;
    g.fillStyle(boltColor, 1);
    drawPoly(g, m.x, m.y, m.r, 4, ang(m, P) + Math.PI / 4);
    g.fillPath();
    // Trail
    g.fillStyle(boltColor, 0.3);
    g.fillCircle(m.x - m.vx * 2, m.y - m.vy * 2, m.r * 0.6);
  });
}

function drawPoly(g, x, y, r, sides, rot) {
  g.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (Math.PI * 2 / sides) * i;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}
