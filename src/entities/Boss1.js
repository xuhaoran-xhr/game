// ===========================
//  Boss 1: Destroyer-K (毁灭者-K)
// ===========================
import CONFIG from '../config.js';
import { ang, dist, lerp, clamp, getCharmedTarget } from '../utils.js';
import { tickBossStatus, findOtherBoss } from '../bossShared/index.js';

export function createBoss1(W, H, wave) {
  const BC = CONFIG.BOSS;
  return {
    faction: 'enemy',
    x: W / 2, y: -80,
    vx: 0, vy: 0,
    radius: BC.RADIUS,
    hp: BC.BASE_HP + wave * BC.HP_PER_WAVE,
    maxHp: BC.BASE_HP + wave * BC.HP_PER_WAVE,
    speed: BC.PHASE1.SPEED,
    color: BC.COLOR,
    phase: 1,
    armorAngle: 0,
    armorPlates: BC.PHASE1.ARMOR_PLATES,
    atkTimer: 0, atkPattern: 0,
    spiralAngle: 0,
    bulletPattern: 0, patternTimer: 0, // 0=spiral, 1=burst, 2=ring
    missiles: [],
    charging: false, chargeTarget: { x: 0, y: 0 }, chargeWarn: 0,
    chargeDx: 0, chargeDy: 0, chargeTrail: [],
    chargeCooldown: 0, chargeRecovery: 0,
    beaming: false, beamAngle: 0, beamWarn: 0, beamSweep: 0,
    hitFlash: 0, entered: false,
    bossName: '毁灭者-K',
    hpColor: 0xff4466,
    updateFn: updateBoss1,
    drawFn: drawBoss1,
  };
}

export function updateBoss1(boss, P, bullets, eBullets, mines, particles, gameState, weapons, enemies, otherBoss) {
  const b = boss;
  const W = gameState.W;
  const H = gameState.H;
  // Entry animation
  if (!b.entered) {
    b.y = lerp(b.y, H * 0.22, 0.02);
    if (b.y > H * 0.2) b.entered = true;
    return;
  }

  // Unified hit-flash + charmed decay + snared/launched early-return
  if (tickBossStatus(b)) return;

  // ---- Determine target: charmed → nearest enemy, normal → player ----
  const isCharmed = b.faction === 'ally';
  let T = P.hidden ? null : P;
  if (isCharmed) {
    const ct = getCharmedTarget(b, enemies, otherBoss);
    T = ct.target || (P.hidden ? null : P);
  } else if (P.hidden) {
    // Player removed: target charmed otherBoss(es) first, then any ally enemy
    const allyBoss = findOtherBoss(otherBoss, (ob) => ob.faction === 'ally');
    if (allyBoss) T = allyBoss;
    else if (enemies) {
      for (const e of enemies) { if (e.faction === 'ally') { T = e; break; } }
    }
  }
  // Store last known target position so ongoing attacks can finish
  const hasRealTarget = !!T;
  if (T) {
    b.lastTargetPos = { x: T.x, y: T.y };
  }
  if (!T) {
    // No real target: use last known position as dummy, or boss's own position
    T = b.lastTargetPos || { x: b.x, y: b.y };
  }

  // ---- Threat table (when NOT charmed) ----
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
      // Also consider charmed otherBoss(es) — highest threat wins
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
    // Override T if threat table picked a valid non-player target
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
    b.speed = CONFIG.BOSS.PHASE2.SPEED;
    b.armorPlates = 0;
    b.phaseStagger = 120; // 2 second stagger — free damage window!
    b.charging = false;
    b.beaming = false;
    particles.spawn(b.x, b.y, '#ff8844', 40, 8, 40, 6);
    particles.spawn(b.x, b.y, '#ffffff', 20, 5, 25, 4);
    gameState.screenShake = 20;
    gameState.showWaveText('⚠ PHASE 2 ⚠');
  }

  // Phase transition stagger — boss is stunned
  if (b.phaseStagger > 0) {
    b.phaseStagger--;
    // Visual: boss flickers and sparks
    if (b.phaseStagger % 6 < 3) b.hitFlash = 2;
    if (b.phaseStagger % 10 === 0) {
      particles.spawn(b.x + (Math.random()-0.5)*40, b.y + (Math.random()-0.5)*40, '#ffaa00', 4, 3, 12, 2);
    }
    return; // skip ALL logic during stagger
  }

  // Movement — chase target T (only if real target exists and not mid-attack)
  if (!b.charging && !b.beaming && hasRealTarget) {
    const a = ang(b, T);
    b.x += Math.cos(a) * b.speed + (b.vx || 0);
    b.y += Math.sin(a) * b.speed * (isCharmed ? 1 : 0.3) + (b.vy || 0);
    b.vx = (b.vx || 0) * 0.92;
    b.vy = (b.vy || 0) * 0.92;
    b.x = lerp(b.x, clamp(b.x, 80, W - 80), 0.08);
    b.y = lerp(b.y, clamp(b.y, 60, isCharmed ? H - 60 : H * 0.5), 0.08);
  }

  b.armorAngle += CONFIG.BOSS.PHASE1.ARMOR_ROTATION_SPEED;
  b.atkTimer++;

  // Phase 1 attacks — 3 patterns, random switch every 10s
  if (b.phase === 1) {
    const p1 = CONFIG.BOSS.PHASE1;

    // Pattern switch timer
    b.patternTimer++;
    if (b.patternTimer >= p1.PATTERN_SWITCH_INTERVAL) {
      b.patternTimer = 0;
      const oldPattern = b.bulletPattern;
      while (b.bulletPattern === oldPattern) {
        b.bulletPattern = Math.floor(Math.random() * 3);
      }
      // Visual flash on pattern switch
      particles.spawn(b.x, b.y, '#ffff00', 10, 3, 20, 3);
      gameState.screenShake = 3;
    }

    // Pattern A: Spiral (rotating dual bullets)
    if (b.bulletPattern === 0) {
      if (b.atkTimer % p1.SPIRAL_FIRE_INTERVAL === 0) {
        b.spiralAngle += p1.SPIRAL_ANGLE_INCREMENT;
        for (let i = 0; i < p1.SPIRAL_BULLET_COUNT; i++) {
          const a = b.spiralAngle + (Math.PI * 2 / p1.SPIRAL_BULLET_COUNT) * i;
          const bul = {
            x: b.x, y: b.y,
            vx: Math.cos(a) * p1.SPIRAL_BULLET_SPEED,
            vy: Math.sin(a) * p1.SPIRAL_BULLET_SPEED,
            life: p1.SPIRAL_BULLET_LIFETIME, dmg: p1.SPIRAL_BULLET_DAMAGE,
            r: 4, color: isCharmed ? '#cc44ff' : '#ff4466',
          };
          if (isCharmed) bul.friendly = true;
          eBullets.push(bul);
        }
      }
    }

    // Pattern B: Aimed Burst (shotgun fan toward target)
    if (b.bulletPattern === 1) {
      if (b.atkTimer % p1.BURST_FIRE_INTERVAL === 0 && hasRealTarget) {
        const baseAngle = ang(b, T);
        for (let i = 0; i < p1.BURST_BULLET_COUNT; i++) {
          const offset = (i - Math.floor(p1.BURST_BULLET_COUNT / 2)) * p1.BURST_SPREAD;
          const a = baseAngle + offset + (Math.random() - 0.5) * 0.05;
          const bul = {
            x: b.x, y: b.y,
            vx: Math.cos(a) * p1.BURST_BULLET_SPEED,
            vy: Math.sin(a) * p1.BURST_BULLET_SPEED,
            life: p1.BURST_BULLET_LIFETIME, dmg: p1.BURST_BULLET_DAMAGE,
            r: 5, color: isCharmed ? '#cc44ff' : '#ff8800',
          };
          if (isCharmed) bul.friendly = true;
          eBullets.push(bul);
        }
        particles.spawn(b.x, b.y, '#ff8800', 4, 3, 12, 2);
      }
    }

    // Pattern C: Expanding Ring (even circle burst)
    if (b.bulletPattern === 2) {
      if (b.atkTimer % p1.RING_FIRE_INTERVAL === 0) {
        for (let i = 0; i < p1.RING_BULLET_COUNT; i++) {
          const a = (Math.PI * 2 / p1.RING_BULLET_COUNT) * i + Math.random() * 0.1;
          const bul = {
            x: b.x, y: b.y,
            vx: Math.cos(a) * p1.RING_BULLET_SPEED,
            vy: Math.sin(a) * p1.RING_BULLET_SPEED,
            life: p1.RING_BULLET_LIFETIME, dmg: p1.RING_BULLET_DAMAGE,
            r: 5, color: isCharmed ? '#cc44ff' : '#44aaff',
          };
          if (isCharmed) bul.friendly = true;
          eBullets.push(bul);
        }
        particles.spawn(b.x, b.y, '#44aaff', 6, 2, 15, 2);
      }
    }

    // Missiles always fire regardless of pattern
    if (hasRealTarget && b.atkTimer % p1.MISSILE_INTERVAL === 0) {
      for (let i = 0; i < p1.MISSILE_COUNT; i++) {
        const wasCharmed = isCharmed;
        setTimeout(() => {
          if (!gameState.gameRunning) return;
          const mTarget = wasCharmed ? T : P;
          const a = ang(b, mTarget);
          b.missiles.push({
            x: b.x, y: b.y,
            vx: Math.cos(a) * p1.MISSILE_SPEED_BASE,
            vy: Math.sin(a) * p1.MISSILE_SPEED_BASE,
            life: p1.MISSILE_LIFETIME, hp: p1.MISSILE_HP,
            r: p1.MISSILE_RADIUS,
            speed: p1.MISSILE_SPEED_BASE + i * p1.MISSILE_SPEED_INCREMENT,
            charmedMissile: wasCharmed,
          });
        }, i * p1.MISSILE_DELAY);
      }
    }
  }

  // Phase 2 attacks → retarget T
  if (b.phase === 2) {
    const p2 = CONFIG.BOSS.PHASE2;
    if (b.atkTimer % p2.SPIRAL_FIRE_INTERVAL === 0) {
      b.spiralAngle += p2.SPIRAL_ANGLE_INCREMENT;
      for (let i = 0; i < p2.SPIRAL_BULLET_COUNT; i++) {
        const a = b.spiralAngle + (Math.PI * 2 / p2.SPIRAL_BULLET_COUNT) * i;
        const bul = {
          x: b.x, y: b.y,
          vx: Math.cos(a) * p2.SPIRAL_BULLET_SPEED,
          vy: Math.sin(a) * p2.SPIRAL_BULLET_SPEED,
          life: p2.SPIRAL_BULLET_LIFETIME, dmg: p2.SPIRAL_BULLET_DAMAGE,
          r: 4, color: isCharmed ? '#cc44ff' : '#ff6644',
        };
        if (isCharmed) bul.friendly = true;
        eBullets.push(bul);
      }
    }
    b.chargeCooldown = Math.max(0, b.chargeCooldown - 1);
    b.chargeRecovery = Math.max(0, b.chargeRecovery - 1);
    if (hasRealTarget && !b.charging && !b.beaming && b.chargeCooldown <= 0 && b.chargeRecovery <= 0 && b.atkTimer % p2.CHARGE_INTERVAL === p2.CHARGE_OFFSET) {
      b.charging = true;
      b.chargeWarn = p2.CHARGE_WARN_DURATION;
      b.chargeTarget = { x: T.x, y: T.y };
      b.chargeIsCharmed = isCharmed;
    }
    if (hasRealTarget && !b.charging && !b.beaming && b.atkTimer % p2.BEAM_INTERVAL === 0) {
      b.beaming = true;
      b.beamWarn = p2.BEAM_WARN_DURATION;
      b.beamAngle = ang(b, T) - Math.PI * 0.25;
      b.beamSweep = 0;
      b.beamIsCharmed = isCharmed;
    }
  }

  // Charge logic
  if (b.charging) {
    if (b.chargeWarn > 0) {
      b.chargeWarn--;
    } else {
      const p2c = CONFIG.BOSS.PHASE2;
      const a = ang(b, b.chargeTarget);
      b.x += Math.cos(a) * p2c.CHARGE_SPEED;
      b.y += Math.sin(a) * p2c.CHARGE_SPEED;
      b.chargeTrail.push({ x: b.x, y: b.y, life: p2c.CHARGE_TRAIL_LIFETIME });
      // Charge damage on contact
      if (b.chargeIsCharmed) {
        if (enemies) {
          for (const e of enemies) {
            if (e.faction !== 'enemy') continue;
            if (dist(b, e) < b.radius + e.radius + 10) {
              e.hp -= p2c.CHARGE_DAMAGE;
              e.hitFlash = 8;
              particles.spawn(e.x, e.y, '#cc44ff', 8, 4, 15, 3);
            }
          }
        }
      } else {
        if (!P.invincible && dist(b, P) < b.radius + P.radius + 10) {
          gameState.dmgPlayer(p2c.CHARGE_DAMAGE);
          gameState.screenShake = 8;
        }
      }
      // Check wall impact or target reached
      const hitWall = b.x < b.radius || b.x > W - b.radius || b.y < b.radius || b.y > H - b.radius;
      const reachedTarget = dist(b, b.chargeTarget) < 30;
      if (hitWall || reachedTarget) {
        b.charging = false;
        b.chargeCooldown = p2c.CHARGE_COOLDOWN;
        b.chargeRecovery = p2c.CHARGE_RECOVERY;
        b.x = clamp(b.x, b.radius + 5, W - b.radius - 5);
        b.y = clamp(b.y, b.radius + 5, H - b.radius - 5);
        particles.spawn(b.x, b.y, b.chargeIsCharmed ? '#cc44ff' : '#ff4444', 12, 5, 20, 4);
        gameState.screenShake = hitWall ? 15 : 6;

        // Wall impact shockwave!
        if (hitWall) {
          const swR = p2c.CHARGE_SHOCKWAVE_RADIUS;
          const swCount = 12;
          for (let i = 0; i < swCount; i++) {
            const sa = (Math.PI * 2 / swCount) * i;
            const bul = {
              x: b.x, y: b.y,
              vx: Math.cos(sa) * 3,
              vy: Math.sin(sa) * 3,
              life: 120, dmg: p2c.CHARGE_SHOCKWAVE_DAMAGE,
              r: 6, color: b.chargeIsCharmed ? '#cc44ff' : '#ff6644',
            };
            if (b.chargeIsCharmed) bul.friendly = true;
            eBullets.push(bul);
          }
          particles.spawn(b.x, b.y, '#ff8844', 20, 6, 30, 5);
          // Knockback player if close enough
          if (!P.invincible && dist(b, P) < swR) {
            const ka = ang(b, P);
            P.vx = (P.vx || 0) + Math.cos(ka) * p2c.CHARGE_SHOCKWAVE_KNOCKBACK;
            P.vy = (P.vy || 0) + Math.sin(ka) * p2c.CHARGE_SHOCKWAVE_KNOCKBACK;
          }
        }
      }
    }
  }
  b.chargeTrail = b.chargeTrail.filter(t => { t.life--; return t.life > 0; });

  // Beam logic
  if (b.beaming) {
    if (b.beamWarn > 0) {
      b.beamWarn--;
    } else {
      const p2b = CONFIG.BOSS.PHASE2;
      b.beamSweep += p2b.BEAM_SWEEP_SPEED;
      const ba = b.beamAngle + b.beamSweep;
      if (b.beamIsCharmed) {
        if (enemies) {
          for (const e of enemies) {
            if (e.faction !== 'enemy') continue;
            const eAngle = ang(b, e);
            const diff = Math.abs(((eAngle - ba) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            if (diff < p2b.BEAM_HIT_ANGLE && dist(b, e) < p2b.BEAM_HIT_RANGE) {
              e.hp -= p2b.BEAM_DAMAGE_PER_FRAME * 2;
              e.hitFlash = 4;
            }
          }
        }
      } else {
        if (!P.invincible) {
          const pAngle = ang(b, P);
          const diff = Math.abs(((pAngle - ba) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          if (diff < p2b.BEAM_HIT_ANGLE && dist(b, P) < p2b.BEAM_HIT_RANGE) {
            gameState.dmgPlayer(p2b.BEAM_DAMAGE_PER_FRAME);
          }
        }
      }
      if (b.beamSweep > p2b.BEAM_SWEEP_ANGLE) {
        b.beaming = false;
      }
    }
  }

  // Missiles update — all missiles track T (the resolved current target)
  b.missiles = b.missiles.filter(m => {
    const mTarget = T; // always track current resolved target
    const a = ang(m, mTarget);
    m.vx = lerp(m.vx, Math.cos(a) * m.speed, CONFIG.BOSS.PHASE1.MISSILE_HOMING_FACTOR);
    m.vy = lerp(m.vy, Math.sin(a) * m.speed, CONFIG.BOSS.PHASE1.MISSILE_HOMING_FACTOR);
    m.x += m.vx; m.y += m.vy;
    m.life--;
    if (m.charmedMissile) {
      if (enemies) {
        for (const e of enemies) {
          if (e.faction !== 'enemy') continue;
          if (dist(m, e) < e.radius + m.r) {
            e.hp -= CONFIG.BOSS.PHASE1.MISSILE_DAMAGE;
            e.hitFlash = 6;
            particles.spawn(m.x, m.y, '#cc44ff', 10, 4, 15, 3);
            return false;
          }
        }
      }
    } else {
      if (!P.hidden && !P.invincible && dist(m, P) < P.radius + m.r) {
        gameState.dmgPlayer(CONFIG.BOSS.PHASE1.MISSILE_DAMAGE);
        particles.spawn(m.x, m.y, '#ff8844', 10, 4, 15, 3);
        gameState.screenShake = 4;
        return false;
      }
    }
    return m.life > 0 && m.hp > 0;
  });

  // Bullet vs boss
  bullets.forEach(bul => {
    if (bul.life <= 0) return;
    if (b.phase === 1 && b.armorPlates > 0) {
      for (let i = 0; i < b.armorPlates; i++) {
        const aa = b.armorAngle + (Math.PI * 2 / b.armorPlates) * i;
        const ax = b.x + Math.cos(aa) * 55;
        const ay = b.y + Math.sin(aa) * 55;
        if (Math.hypot(bul.x - ax, bul.y - ay) < 20) {
          bul.life = 0;
          particles.spawn(bul.x, bul.y, '#888', 3, 2, 8, 2);
          return;
        }
      }
    }
    if (dist(bul, b) < b.radius) {
      b.hp -= bul.dmg; bul.life = 0; b.hitFlash = 6;
      particles.spawn(bul.x, bul.y, '#FFF', 3, 3, 10, 2);
      const ka = ang(bul, b);
      b.vx = (b.vx || 0) + Math.cos(ka) * 0.5;
      b.vy = (b.vy || 0) + Math.sin(ka) * 0.5;
      if (b.threatTable) b.threatTable.player = (b.threatTable.player || 0) + bul.dmg;
    }
  });

  // Player can shoot missiles
  bullets.forEach(bul => {
    if (bul.life <= 0) return;
    b.missiles.forEach(m => {
      if (dist(bul, m) < m.r + 3) {
        m.hp -= bul.dmg; bul.life = 0;
        particles.spawn(m.x, m.y, '#ff8844', 5, 3, 10, 2);
        if (m.hp <= 0) { m.life = 0; particles.spawn(m.x, m.y, '#ff8844', 10, 4, 15, 3); }
      }
    });
  });

  // Boss dead
  if (b.hp <= 0) {
    particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : '#ff2244', 40, 7, 40, 6);
    particles.spawn(b.x, b.y, '#FFD700', 25, 5, 35, 4);
    gameState.screenShake = 15;
    gameState.hitStop = CONFIG.COMBAT.HITSTOP_ON_BOSS_KILL;
    gameState.kills += CONFIG.BOSS.KILL_SCORE;
    gameState.showWaveText('BOSS DEFEATED!');
    return true;
  }

  // Contact damage — charmed: hurt enemies, normal: hurt player
  if (isCharmed) {
    if (enemies) {
      for (const e of enemies) {
        if (e.faction !== 'enemy') continue;
        if (dist(b, e) < b.radius + e.radius) {
          e.hp -= CONFIG.BOSS.CONTACT_DAMAGE;
          e.hitFlash = 8;
          const pa = ang(b, e);
          e.vx = (e.vx || 0) + Math.cos(pa) * CONFIG.BOSS.CONTACT_KNOCKBACK;
          e.vy = (e.vy || 0) + Math.sin(pa) * CONFIG.BOSS.CONTACT_KNOCKBACK;
          particles.spawn(e.x, e.y, '#cc44ff', 5, 3, 12, 3);
        }
      }
    }
  } else {
    if (!P.invincible && dist(b, P) < b.radius + P.radius) {
      gameState.dmgPlayer(CONFIG.BOSS.CONTACT_DAMAGE);
      const pa = ang(b, P);
      P.x += Math.cos(pa) * CONFIG.BOSS.CONTACT_KNOCKBACK;
      P.y += Math.sin(pa) * CONFIG.BOSS.CONTACT_KNOCKBACK;
      gameState.screenShake = 5;
    }
  }

  return false; // alive
}

export function drawBoss1(g, boss, P, time) {
  const b = boss;
  g.save();
  g.translateCanvas(b.x, b.y);

  // Charge trail
  b.chargeTrail.forEach(t => {
    g.fillStyle(b.faction === 'ally' ? 0xcc44ff : 0xff4422, t.life / 30 * 0.4);
    g.fillCircle(t.x - b.x, t.y - b.y, 12);
  });

  // Charmed aura
  if (b.faction === 'ally') {
    const pulse = 1 + Math.sin(time * 0.005) * 0.3;
    g.lineStyle(3, 0xcc44ff, 0.6);
    g.strokeCircle(0, 0, b.radius + 15 * pulse);
    g.lineStyle(1.5, 0xcc44ff, 0.3);
    g.strokeCircle(0, 0, b.radius + 25 * pulse);
  }

  // Armor plates (phase 1)
  if (b.phase === 1) {
    for (let i = 0; i < b.armorPlates; i++) {
      const aa = b.armorAngle + (Math.PI * 2 / b.armorPlates) * i;
      const ax = Math.cos(aa) * 55;
      const ay = Math.sin(aa) * 55;
      g.fillStyle(b.hitFlash > 0 ? 0xffffff : 0xcc3344, 1);
      const hw = 16, hh = 8;
      const cos = Math.cos(aa), sin = Math.sin(aa);
      g.beginPath();
      g.moveTo(ax + cos * hw - sin * hh, ay + sin * hw + cos * hh);
      g.lineTo(ax + cos * hw + sin * hh, ay + sin * hw - cos * hh);
      g.lineTo(ax - cos * hw + sin * hh, ay - sin * hw - cos * hh);
      g.lineTo(ax - cos * hw - sin * hh, ay - sin * hw + cos * hh);
      g.closePath();
      g.fillPath();
    }
  }

  // Core
  const coreColor = b.hitFlash > 0 ? 0xffffff : b.faction === 'ally' ? 0xcc44ff : Phaser.Display.Color.HexStringToColor(b.color).color;
  g.fillStyle(coreColor, 1);
  drawPoly(g, 0, 0, b.radius, 8, time * 0.001);
  g.fillPath();

  // Inner glow
  g.fillStyle(0xff6432, 0.3);
  drawPoly(g, 0, 0, b.radius * 0.6, 8, time * -0.002);
  g.fillPath();

  // Charge warning
  if (b.charging && b.chargeWarn > 0) {
    const alpha = Math.sin(b.chargeWarn * 0.3) * 0.5 + 0.5;
    g.lineStyle(3, 0xffff00, alpha);
    g.strokeCircle(0, 0, b.radius + 10 + Math.sin(b.chargeWarn * 0.5) * 5);
  }

  g.restore();

  // Beam
  if (b.beaming && b.beamWarn <= 0) {
    const ba = b.beamAngle + b.beamSweep;
    const beamColor = b.beamIsCharmed ? 0xcc44ff : 0xff3232;
    g.lineStyle(12, beamColor, 0.8);
    g.beginPath();
    g.moveTo(b.x, b.y);
    g.lineTo(b.x + Math.cos(ba) * 1200, b.y + Math.sin(ba) * 1200);
    g.strokePath();
  }
  // Beam warning
  if (b.beaming && b.beamWarn > 0) {
    const ba = b.beamAngle;
    const endBa = ba + Math.PI * 0.5;
    const alpha = Math.sin(b.beamWarn * 0.2) * 0.3 + 0.3;
    g.lineStyle(2, 0xff6464, alpha);
    for (let a = ba; a < endBa; a += 0.1) {
      g.beginPath();
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + Math.cos(a) * 800, b.y + Math.sin(a) * 800);
      g.strokePath();
    }
  }

  // Missiles
  b.missiles.forEach(m => {
    g.fillStyle(m.charmedMissile ? 0xcc44ff : 0xff8844, 1);
    drawPoly(g, m.x, m.y, m.r, 3, ang(m, P));
    g.fillPath();
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
