// ===========================
//  Boss 2: Phantom Weaver (幻影织网者)
// ===========================
import CONFIG from '../config.js';
import { ang, dist, lerp, clamp, rand, getCharmedTarget } from '../utils.js';
import { tickBossStatus } from '../bossShared/index.js';

export function createBoss2(W, H, wave) {
  const B2C = CONFIG.BOSS2;
  return {
    faction: 'enemy',
    x: W / 2, y: -60,
    vx: 0, vy: 0,
    radius: B2C.RADIUS,
    hp: B2C.BASE_HP + wave * B2C.HP_PER_WAVE,
    maxHp: B2C.BASE_HP + wave * B2C.HP_PER_WAVE,
    speed: B2C.PHASE1.SPEED,
    color: B2C.COLOR,
    phase: 1,
    atkTimer: 0,
    teleTimer: 0, teleWarn: 0, teleporting: false,
    teleFrom: { x: 0, y: 0 },
    clones: [],
    dashing: false, dashCount: 0, dashWarn: 0, dashGap: 0,
    dashTarget: { x: 0, y: 0 }, dashTrail: [],
    // Mirror dash ghosts
    mirrorGhosts: [],
    hitFlash: 0, entered: false,
    alpha: 1,
    // Phase immunity
    phaseTimer: 0, phasing: false, phaseWarn: 0,
    exposedTimer: 0,
    // Enrage
    enraged: false,
    // Tether (蛛丝牵引)
    tether: null, tetherCd: 0,
    // Cage (蛛网囚笼)
    cages: [], cageCd: 0,
    bossName: '幻影织网者',
    hpColor: 0x00ffcc,
    updateFn: updateBoss2,
    drawFn: drawBoss2,
  };
}

export function updateBoss2(boss2, P, bullets, eBullets, mines, particles, gameState, weapons, enemies, otherBoss) {
  const b = boss2;
  const B2C = CONFIG.BOSS2;
  const W = gameState.W;
  const H = gameState.H;

  // Entry
  if (!b.entered) {
    b.y = lerp(b.y, H * 0.3, 0.03);
    if (b.y > H * 0.25) b.entered = true;
    return;
  }

  b.atkTimer++;
  // Unified hit-flash + charmed decay + snared/launched early-return
  if (tickBossStatus(b)) return;

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
  const hasRealTarget = !!T;
  if (T) b.lastTargetPos = { x: T.x, y: T.y };
  if (!T) T = b.lastTargetPos || { x: b.x, y: b.y };

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
      b.threatTable.player = 0; b.threatTable.otherBoss = 0;
      if (enemies) enemies.forEach((_, i) => { b.threatTable[i] = 0; });
    }
    if (b.threatTable.target && b.threatTable.target !== P) {
      const tt = b.threatTable.target;
      if (tt.hp > 0 && (tt.faction === 'ally' || (enemies && enemies.includes(tt)))) T = tt;
    }
  }

  // ---- Phase transitions ----
  const hpPct = b.hp / b.maxHp;
  if (hpPct < (B2C.PHASE2_THRESHOLD || 0.55) && b.phase === 1) {
    b.phase = 2;
    b.speed = B2C.PHASE2.SPEED;
    b.teleTimer = 0; b.teleporting = false; b.dashing = false; b.alpha = 1;
    particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : B2C.COLOR, 25, 5, 30, 4);
    gameState.screenShake = 8;
    gameState.showWaveText('PHASE 2');
  }
  // Enrage at 20%
  if (hpPct < (B2C.ENRAGE_THRESHOLD || 0.20) && !b.enraged) {
    b.enraged = true;
    b.speed = B2C.ENRAGE_SPEED || 3.2;
    b.phasing = false; b.exposedTimer = 0;
    particles.spawn(b.x, b.y, '#00ffcc', 40, 8, 40, 6);
    particles.spawn(b.x, b.y, '#ffffff', 20, 5, 30, 4);
    gameState.screenShake = 20;
    gameState.showWaveText && gameState.showWaveText('蛛后降临！');
    // Spawn enrage clones immediately
    for (let i = 0; i < (B2C.ENRAGE_CLONE_COUNT || 4); i++) {
      const ca = (Math.PI * 2 / (B2C.ENRAGE_CLONE_COUNT || 4)) * i;
      b.clones.push({
        x: b.x + Math.cos(ca) * 80, y: b.y + Math.sin(ca) * 80,
        vx: 0, vy: 0,
        hp: B2C.ENRAGE_CLONE_HP || 60, maxHp: B2C.ENRAGE_CLONE_HP || 60,
        speed: B2C.ENRAGE_CLONE_SPEED || 2.2,
        life: 99999,
        radius: b.radius * 0.9,
        isCharmed,
        isEnrageClone: true,
      });
    }
  }

  const ph = b.phase === 1 ? B2C.PHASE1 : B2C.PHASE2;

  // ========== PHASE IMMUNITY (虚空态) ==========
  if (!b.enraged) {
    b.phaseTimer = (b.phaseTimer || 0) + 1;
    if (!b.phasing && b.exposedTimer <= 0 && b.phaseTimer >= (B2C.PHASE_INTERVAL || 360)) {
      b.phasing = true;
      b.phaseWarn = B2C.PHASE_DURATION || 120;
      b.phaseTimer = 0;
    }
    if (b.phasing) {
      b.phaseWarn--;
      b.alpha = 0.25 + Math.abs(Math.sin(b.phaseWarn * 0.12)) * 0.25;
      // Fast repositioning: only once when entering phase (phaseWarn first frame)
      if (hasRealTarget && b.phaseWarn === (B2C.PHASE_DURATION || 120) - 1) {
        const pa = ang(b, T) + Math.PI + rand(-0.6, 0.6);
        const pdist = rand(180, 300);
        b.x = clamp(T.x + Math.cos(pa) * pdist, b.radius + 20, W - b.radius - 20);
        b.y = clamp(T.y + Math.sin(pa) * pdist, b.radius + 20, H - b.radius - 20);
      }
      // Lay web zones during phase
      if (b.phaseWarn % 40 === 0 && gameState.webZones && hasRealTarget) {
        gameState.webZones.push({
          x: T.x + rand(-60, 60), y: T.y + rand(-60, 60),
          radius: B2C.WEB_ZONE_RADIUS || 65,
          life: B2C.WEB_ZONE_DURATION || 240,
          maxLife: B2C.WEB_ZONE_DURATION || 240,
          hp: B2C.WEB_ZONE_HP || 2,
          isCharmed,
        });
      }
      if (b.phaseWarn <= 0) {
        b.phasing = false;
        b.alpha = 1;
        b.exposedTimer = B2C.PHASE_EXPOSE_WINDOW || 30;
        particles.spawn(b.x, b.y, '#00ffcc', 15, 5, 20, 3);
        gameState.screenShake = 6;
      }
      // Immune during phase — skip damage
    } else if (b.exposedTimer > 0) {
      b.exposedTimer--;
    }
  }

  // ========== MOVEMENT ==========
  if (!b.dashing && !b.teleporting && !b.phasing && hasRealTarget) {
    // Dynamic preferred distance based on state
    const targetDist = b.enraged ? 308
      : (b.atkTimer % (b.phase === 2 ? B2C.PHASE2.WEB_FIRE_INTERVAL : ph.WEB_FIRE_INTERVAL) < 30) ? 238  // closing to shoot
      : 336;

    const d = dist(b, T);
    const toTx = (T.x - b.x) / (d || 1);
    const toTy = (T.y - b.y) / (d || 1);

    // Strafe direction: persist and flip periodically or near walls
    if (!b.strafeDir) b.strafeDir = Math.random() < 0.5 ? 1 : -1;
    b.strafeTimer = (b.strafeTimer || 0) + 1;
    const margin = 55;
    const nearWall = b.x < margin || b.x > W - margin || b.y < margin || b.y > H - margin;
    if (b.strafeTimer > 90 + Math.random() * 60 || nearWall) {
      b.strafeDir *= -1;
      b.strafeTimer = 0;
    }
    // Lateral vector (perpendicular to toTarget)
    const latX = -toTy * b.strafeDir;
    const latY = toTx * b.strafeDir;

    // Predict target position (12 frames ahead)
    const predX = T.x + (T.vx || 0) * 12;
    const predY = T.y + (T.vy || 0) * 12;
    const predDx = predX - b.x, predDy = predY - b.y;
    const predDist = Math.hypot(predDx, predDy) || 1;
    const toPredX = predDx / predDist, toPredY = predDy / predDist;

    let moveX = 0, moveY = 0;
    if (d > targetDist + 40) {
      // Approach: blend toward predicted position + strafe
      moveX = toPredX * 0.8 + latX * 0.4;
      moveY = toPredY * 0.8 + latY * 0.4;
    } else if (d < targetDist - 40) {
      // Retreat: back away + strong strafe
      moveX = -toTx * 0.7 + latX * 0.7;
      moveY = -toTy * 0.7 + latY * 0.7;
    } else {
      // In range: pure strafe with slight orbit drift
      const orbitA = ang(b, T) + Math.PI * 0.5 * b.strafeDir;
      moveX = Math.cos(orbitA) * 0.85 + latX * 0.4;
      moveY = Math.sin(orbitA) * 0.85 + latY * 0.4;
    }
    // Normalize and apply (web zone slow)
    if (b.webSlowed > 0) b.webSlowed--;
    const webMult = (b.webSlowed > 0) ? (1 - (CONFIG.BOSS2.WEB_ZONE_SLOW || 0.62)) : 1;
    const mLen = Math.hypot(moveX, moveY) || 1;
    b.x += (moveX / mLen) * b.speed * webMult;
    b.y += (moveY / mLen) * b.speed * webMult;
    b.x = clamp(b.x, b.radius, W - b.radius);
    b.y = clamp(b.y, b.radius, H - b.radius);
    // Apply knockback decay
    b.vx = (b.vx || 0) * 0.88; b.vy = (b.vy || 0) * 0.88;
    b.x += b.vx; b.y += b.vy;
    if (Math.abs(b.vx) < 0.05) b.vx = 0;
    if (Math.abs(b.vy) < 0.05) b.vy = 0;
  }

  // ========== TELEPORT ==========
  if (!b.phasing) b.teleTimer++;
  // 控距触发：玩家太近时立刻闪烁拉开
  const tooClose = hasRealTarget && dist(b, T) < (b.enraged ? 150 : 120);
  const teleReady = b.teleTimer >= (b.enraged ? 80 : ph.TELEPORT_INTERVAL);
  if (hasRealTarget && (teleReady || tooClose) && !b.dashing && !b.phasing && !b.teleporting) {
    b.teleporting = true;
    b.teleWarn = tooClose ? 8 : ph.TELEPORT_WARN_DURATION; // 太近时几乎无预警直接闪
    b.teleFrom = { x: b.x, y: b.y };
    b.teleReason = tooClose ? 'escape' : 'normal';
  }
  if (b.teleporting) {
    b.teleWarn--;
    b.alpha = 0.2 + Math.abs(Math.sin(b.teleWarn * 0.4)) * 0.6;
    if (b.teleWarn <= 0) {
      let tAngle, tDist;
      if (b.teleReason === 'escape') {
        // 逃脱：直接闪到目标背后较远处
        tAngle = ang(T, b) + rand(-0.5, 0.5); // 远离目标方向
        tDist = rand(280, 380);
      } else {
        tAngle = rand(0, Math.PI * 2);
        tDist = rand(ph.TELEPORT_MIN_DIST, ph.TELEPORT_MAX_DIST);
      }
      b.x = clamp(T.x + Math.cos(tAngle) * tDist, b.radius + 20, W - b.radius - 20);
      b.y = clamp(T.y + Math.sin(tAngle) * tDist, b.radius + 20, H - b.radius - 20);
      b.teleporting = false; b.teleTimer = 0; b.alpha = 1; b.teleReason = null;
      particles.spawn(b.teleFrom.x, b.teleFrom.y, isCharmed ? '#cc44ff' : B2C.COLOR, 8, 3, 15, 3);
      particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : B2C.COLOR, 12, 4, 18, 4);
      gameState.screenShake = 4;
    }
  }

  // ========== WEB BULLETS (编织弹幕 → 交叉菱形) ==========
  if (!b.phasing) {
    const webInterval = b.phase === 2 ? B2C.PHASE2.WEB_FIRE_INTERVAL : ph.WEB_FIRE_INTERVAL;
    const crossCount = b.phase === 2 ? B2C.PHASE2.WEB_CROSS_COUNT : ph.WEB_CROSS_COUNT;
    const crossSpd = b.phase === 2 ? B2C.PHASE2.WEB_CROSS_SPEED : ph.WEB_CROSS_SPEED;
    const ringSpd = b.phase === 2 ? B2C.PHASE2.WEB_RING_SPEED : ph.WEB_RING_SPEED;
    const ringDmg = b.phase === 2 ? B2C.PHASE2.WEB_RING_DAMAGE : ph.WEB_RING_DAMAGE;
    const crossDmg = b.phase === 2 ? B2C.PHASE2.WEB_CROSS_DAMAGE : ph.WEB_CROSS_DAMAGE;

    if (b.atkTimer % webInterval === 0) {
      const aimA = hasRealTarget ? ang(b, T) : 0;
      // 编织弹幕：两组弹从左右各自扩散，形成交叉菱形
      // 组A：向左扩散
      for (let i = 0; i < crossCount; i++) {
        const spread = (i / (crossCount - 1)) * 1.2 - 0.6; // -0.6 ~ +0.6
        const a = aimA + spread;
        const bul = {
          x: b.x, y: b.y,
          vx: Math.cos(a) * crossSpd, vy: Math.sin(a) * crossSpd,
          life: ph.WEB_CROSS_LIFETIME, dmg: crossDmg,
          r: 4, color: isCharmed ? '#cc44ff' : '#00ffcc',
          isWebBullet: true, isCharmed,
        };
        if (isCharmed) bul.friendly = true;
        eBullets.push(bul);
      }
      // 组B：从±45°方向以稍慢速度射出，与组A交叉
      const weaveSpdB = crossSpd * 0.72;
      for (let i = 0; i < crossCount - 1; i++) {
        const spread = (i / (crossCount - 2)) * 1.0 - 0.5;
        const a = aimA + spread + 0.22; // 偏移22°，形成交叉
        const bul = {
          x: b.x, y: b.y,
          vx: Math.cos(a) * weaveSpdB, vy: Math.sin(a) * weaveSpdB,
          life: ph.WEB_CROSS_LIFETIME, dmg: ringDmg,
          r: 3, color: isCharmed ? '#aa33ff' : '#00ffaa',
          isWebBullet: true, isCharmed,
        };
        if (isCharmed) bul.friendly = true;
        eBullets.push(bul);
      }
      gameState.screenShake = 2;
    }
  }

  // ========== CLONES (真假分身) ==========
  if (!b.enraged && b.phase === 1 && hasRealTarget && b.atkTimer % ph.CLONE_INTERVAL === 0) {
    // 生成1个真分身（isDecoy:false）和1个假分身（isDecoy:true）
    for (let i = 0; i < 2; i++) {
      const ca = rand(0, Math.PI * 2);
      const isDecoy = i === 1;
      b.clones.push({
        x: b.x + Math.cos(ca) * 60, y: b.y + Math.sin(ca) * 60,
        vx: 0, vy: 0,
        hp: ph.CLONE_HP, maxHp: ph.CLONE_HP,
        speed: ph.CLONE_SPEED,
        life: ph.CLONE_DURATION,
        radius: b.radius * 0.9,
        isCharmed,
        isDecoy,          // 假分身：打死爆弹，真身不掉血
        glowTimer: 0,     // 真身偶尔发光用于辨别
      });
    }
    particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : '#00ffcc', 10, 3, 15, 3);
  }

  // Clone update
  b.clones = b.clones.filter(c => {
    c.life--;
    c.glowTimer = Math.max(0, (c.glowTimer || 0) - 1);
    // 真分身每120帧有3帧发光（可辨别窗口）
    if (!c.isDecoy && !c.isEnrageClone && c.life % 120 === 0) c.glowTimer = 3;
    const a = ang(c, T);
    c.x += Math.cos(a) * c.speed + (c.vx || 0);
    c.y += Math.sin(a) * c.speed + (c.vy || 0);
    c.vx = (c.vx || 0) * 0.9; c.vy = (c.vy || 0) * 0.9;
    bullets.forEach(bul => {
      if (bul.life <= 0) return;
      if (dist(bul, c) < c.radius) {
        c.hp -= bul.dmg; bul.life = 0;
        particles.spawn(bul.x, bul.y, '#00ffcc', 3, 2, 8, 2);
        const ka = ang(bul, c);
        c.vx += Math.cos(ka) * 1.5; c.vy += Math.sin(ka) * 1.5;
      }
    });
    c.contactCd = Math.max(0, (c.contactCd || 0) - 1);
    const explodeTriggerDist = c.radius * 1.8;
    let shouldExplode = false;
    if (c.isCharmed) {
      if (enemies) for (const e of enemies) {
        if (e.faction !== 'enemy') continue;
        if (dist(c, e) < explodeTriggerDist + (e.radius || 12)) {
          shouldExplode = true;
          break;
        }
      }
    } else {
      if (!P.hidden && !P.invincible && dist(c, P) < explodeTriggerDist + P.radius) {
        shouldExplode = true;
      }
    }
    if (shouldExplode) {
      c.hp = 0;
    }
    if (c.hp <= 0) {
      particles.spawn(c.x, c.y, '#00ffcc', 15, 5, 20, 4);
      particles.spawn(c.x, c.y, '#ffffff', 8, 3, 15, 3);
      gameState.screenShake = 5;
      // 爆炸伤害：AOE范围内造成伤害
      const explodeR = c.radius * 3.5;
      const explodeDmg = c.isDecoy ? 28 : 21;
      if (!c.isCharmed) {
        // 正常分身爆炸伤害玩家
        if (!P.hidden && !P.invincible && dist(c, P) < explodeR + P.radius) {
          gameState.dmgPlayer(explodeDmg);
        }
      } else {
        // 魅惑分身爆炸伤害enemy
        if (enemies) for (const e of enemies) {
          if (e.faction !== 'enemy') continue;
          if (dist(c, e) < explodeR + (e.radius || 12)) { e.hp -= explodeDmg; e.hitFlash = 8; }
        }
      }
      if (c.isDecoy) {
        // 打死假分身：额外爆出8颗惩罚弹
        for (let i = 0; i < 8; i++) {
          const pa = (Math.PI * 2 / 8) * i;
          const bul = {
            x: c.x, y: c.y,
            vx: Math.cos(pa) * 3.5, vy: Math.sin(pa) * 3.5,
            life: 120, dmg: 17, r: 4,
            color: '#ff4444',
          };
          if (c.isCharmed) bul.friendly = true;
          eBullets.push(bul);
        }
      }
      return false;
    }
    return c.life > 0;
  });

  // ========== MINES (Phase 2) ==========
  if (b.phase === 2 && !b.enraged) {
    const p2 = B2C.PHASE2;
    if (hasRealTarget && b.atkTimer % p2.MINE_INTERVAL === 0) {
      for (let i = 0; i < p2.MINE_COUNT; i++) {
        const mx = b.x + rand(-120, 120), my = b.y + rand(-120, 120);
        mines.push({
          x: mx, y: my, radius: p2.MINE_RADIUS,
          dmg: p2.MINE_DAMAGE, life: p2.MINE_LIFETIME, armDelay: p2.MINE_ARM_DELAY,
          isCharmed,
        });
      }
    }
    // Mirror dash (三重残影冲刺)
    if (hasRealTarget && !b.dashing && !b.teleporting && b.atkTimer % p2.DASH_INTERVAL === Math.floor(p2.DASH_INTERVAL / 2)) {
      b.dashing = true;
      b.dashCount = p2.DASH_COUNT;
      b.dashWarn = p2.DASH_WARN_DURATION;
      b.dashTarget = { x: T.x, y: T.y };
      b.dashIsCharmed = isCharmed;
      // Spawn 2 mirror ghosts at ±30°
      b.mirrorGhosts = [];
      const realAngle = ang(b, T);
      for (const offset of [-0.52, 0.52]) {
        b.mirrorGhosts.push({
          x: b.x, y: b.y,
          angle: realAngle + offset,
          speed: p2.DASH_SPEED,
          life: 40, maxLife: 40,
          trail: [],
        });
      }
    }
  }

  // Mirror ghost update
  b.mirrorGhosts = (b.mirrorGhosts || []).filter(g => {
    g.life--;
    g.x += Math.cos(g.angle) * g.speed;
    g.y += Math.sin(g.angle) * g.speed;
    g.trail.push({ x: g.x, y: g.y, life: 15 });
    g.trail = g.trail.filter(t => { t.life--; return t.life > 0; });
    return g.life > 0;
  });

  // Dash logic
  if (b.dashing) {
    if (b.dashWarn > 0) {
      b.dashWarn--;
      b.dashTarget = { x: T.x, y: T.y };
    } else {
      const p2 = B2C.PHASE2;
      const a = ang(b, b.dashTarget);
      b.x += Math.cos(a) * p2.DASH_SPEED;
      b.y += Math.sin(a) * p2.DASH_SPEED;
      b.dashTrail.push({ x: b.x, y: b.y, life: 20 });
      if (b.dashIsCharmed) {
        if (enemies) for (const e of enemies) {
          if (e.faction !== 'enemy') continue;
          if (dist(b, e) < b.radius + e.radius + 8) { e.hp -= p2.DASH_DAMAGE; e.hitFlash = 8; particles.spawn(e.x, e.y, '#cc44ff', 5, 3, 12, 3); }
        }
      } else {
        if (!P.invincible && dist(b, P) < b.radius + P.radius + 8) {
          gameState.dmgPlayer(p2.DASH_DAMAGE);
          gameState.screenShake = 6;
        }
      }
      if (dist(b, b.dashTarget) < 40) {
        b.dashCount--;
        particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : B2C.COLOR, 6, 3, 12, 3);
        if (b.dashCount > 0) {
          b.dashWarn = p2.DASH_GAP;
          b.dashTarget = { x: T.x, y: T.y };
        } else {
          b.dashing = false;
        }
      }
    }
  }
  b.dashTrail = b.dashTrail.filter(t => { t.life--; return t.life > 0; });

  // ========== 蛛网喷射 (P2+狂化均可用) ==========
  if (b.phase >= 2 && hasRealTarget && !b.phasing) {
    const sprayInterval = b.enraged ? Math.floor((B2C.WEB_SPRAY_INTERVAL || 150) * 0.6) : (B2C.WEB_SPRAY_INTERVAL || 150);
    if (b.atkTimer % sprayInterval === 0) {
      const sprayCount = B2C.WEB_SPRAY_COUNT || 7;
      const sprayArc = B2C.WEB_SPRAY_ARC || 1.4;
      const spraySpd = B2C.WEB_SPRAY_SPEED || 6;
      const aimA = ang(b, T);
      for (let i = 0; i < sprayCount; i++) {
        const a = aimA - sprayArc / 2 + (sprayArc / (sprayCount - 1)) * i;
        const bul = {
          x: b.x, y: b.y,
          vx: Math.cos(a) * spraySpd, vy: Math.sin(a) * spraySpd,
          life: B2C.WEB_SPRAY_LIFETIME || 180,
          dmg: B2C.WEB_SPRAY_DAMAGE || 8,
          r: 4, color: isCharmed ? '#cc44ff' : '#00ff88',
          isWebSpray: true, isCharmed,
        };
        if (isCharmed) bul.friendly = true;
        eBullets.push(bul);
      }
      particles.spawn(b.x, b.y, '#00ffcc', 10, 4, 15, 3);
      gameState.screenShake = 3;
    }
  }

  // ========== ENRAGE: 蛛后降临 ==========
  if (b.enraged && hasRealTarget) {
    // 每90帧在玩家脚下布蛛网
    if (b.atkTimer % (B2C.ENRAGE_WEB_INTERVAL || 90) === 0 && gameState.webZones) {
      gameState.webZones.push({
        x: T.x, y: T.y,
        radius: (B2C.WEB_ZONE_RADIUS || 70) * 1.2,
        life: B2C.WEB_ZONE_DURATION || 300,
        maxLife: B2C.WEB_ZONE_DURATION || 300,
        hp: B2C.WEB_ZONE_HP || 3,
        isCharmed,
      });
      particles.spawn(T.x, T.y, '#00ffcc', 8, 3, 12, 3);
    }
  }

  // ========== 蛛丝牵引 (P1+) ==========
  b.tetherCd = Math.max(0, (b.tetherCd || 0) - 1);
  if (b.tether) {
    // 牵引激活中：每帧把目标拉向boss
    const th = b.tether;
    th.duration--;
    const pullForce = B2C.TETHER_PULL_FORCE || 2.2;
    // 牵引只对玩家生效
    if (!P.rolling && !P.invincible) {
      const ta = ang(P, b);
      P.x += Math.cos(ta) * pullForce;
      P.y += Math.sin(ta) * pullForce;
      if (b.atkTimer % 10 === 0) gameState.dmgPlayer(B2C.TETHER_DAMAGE || 5);
      particles.spawn(P.x, P.y, '#00ffcc', 2, 1, 8, 1);
    }
    if (P.rolling || th.duration <= 0) b.tether = null;
  } else if (hasRealTarget && !b.phasing && b.tetherCd <= 0 && b.phase >= 1) {
    // 发射蛛丝弹
    const ta = ang(b, T);
    const tetherBul = {
      x: b.x, y: b.y,
      vx: Math.cos(ta) * (B2C.TETHER_SPEED || 7),
      vy: Math.sin(ta) * (B2C.TETHER_SPEED || 7),
      life: B2C.TETHER_LIFETIME || 120,
      dmg: 0, r: 5,
      color: isCharmed ? '#cc44ff' : '#00ffcc',
      isTether: true, isCharmed,
      sourceRef: b,
    };
    if (isCharmed) tetherBul.friendly = true;
    eBullets.push(tetherBul);
    b.tetherCd = B2C.TETHER_INTERVAL || 300;
  }

  // ========== 蛛网囚笼 ==========
  b.cageCd = Math.max(0, (b.cageCd || 0) - 1);
  // 发射囚笼弹
  if (hasRealTarget && !b.phasing && b.cageCd <= 0 && b.phase >= 1) {
    const ca = ang(b, T);
    const cageBul = {
      x: b.x, y: b.y,
      vx: Math.cos(ca) * (B2C.CAGE_BULLET_SPEED || 5),
      vy: Math.sin(ca) * (B2C.CAGE_BULLET_SPEED || 5),
      life: B2C.CAGE_BULLET_LIFETIME || 180,
      dmg: 0, r: B2C.CAGE_BULLET_RADIUS || 18,
      color: isCharmed ? '#cc44ff' : '#00ffcc',
      isCageBullet: true, isCharmed,
      sourceRef: b,
    };
    if (isCharmed) cageBul.friendly = true;
    eBullets.push(cageBul);
    b.cageCd = B2C.CAGE_INTERVAL || 1680;
    particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : '#00ffcc', 12, 5, 18, 4);
    gameState.screenShake = 4;
  }
  // 囚笼更新
  b.cages = (b.cages || []).filter(cage => {
    cage.life--;
    // 生成动画
    cage.spawnT = Math.min(1, (cage.spawnT || 0) + 1 / 20);
    // 墙壁被子弹命中（玩家子弹 + 正确阵营的eBullets）
    cage.walls.forEach(w => {
      if (w.hp <= 0) return;
      // 玩家子弹打墙（正常囚笼）
      if (!isCharmed) {
        bullets.forEach(bul => {
          if (bul.life <= 0) return;
          if (dist(bul, w) < w.radius + (bul.r || 3)) {
            w.hp -= bul.dmg; bul.life = 0; w.hitFlash = 6;
            particles.spawn(w.x, w.y, '#00ffcc', 4, 2, 10, 2);
          }
        });
        // friendly eBullets（ally单位）也能打正常囚笼
        eBullets.forEach(bul => {
          if (bul.life <= 0 || !bul.friendly) return;
          if (dist(bul, w) < w.radius + (bul.r || 3)) {
            w.hp -= bul.dmg; bul.life = 0; w.hitFlash = 6;
            particles.spawn(w.x, w.y, '#00ffcc', 4, 2, 10, 2);
          }
        });
      } else {
        // 魅惑囚笼：enemy子弹打墙（暂无来源，预留）
        bullets.forEach(bul => {
          if (bul.life <= 0) return;
          if (dist(bul, w) < w.radius + (bul.r || 3)) {
            w.hp -= bul.dmg; bul.life = 0; w.hitFlash = 6;
            particles.spawn(w.x, w.y, '#cc44ff', 4, 2, 10, 2);
          }
        });
      }
      if (w.hitFlash > 0) w.hitFlash--;
    });
    // 圆形边界阻挡：用囚笼圆心+半径判断，而非单节点
    const cageR = B2C.CAGE_RADIUS || 120;
    const blocked = [];
    if (!isCharmed) {
      if (!P.hidden) blocked.push({ obj: P, r: P.radius });
      const allyUnits = [...(enemies || []), ...(otherBoss ? (Array.isArray(otherBoss) ? otherBoss : [otherBoss]) : [])].filter(e => e.faction === 'ally' && e.hp > 0);
      allyUnits.forEach(e => blocked.push({ obj: e, r: e.radius || 20 }));
    } else {
      const enemyUnits = [...(enemies || []), ...(otherBoss ? (Array.isArray(otherBoss) ? otherBoss : [otherBoss]) : [])].filter(e => e.faction === 'enemy' && e.hp > 0);
      enemyUnits.forEach(e => blocked.push({ obj: e, r: e.radius || 20 }));
    }
    for (const { obj, r } of blocked) {
      const dx = obj.x - cage.cx, dy = obj.y - cage.cy;
      const d = Math.hypot(dx, dy) || 1;
      // 初始化：记录目标进入囚笼时是在内部还是外部
      if (cage.insideMap === undefined) cage.insideMap = new Map();
      if (!cage.insideMap.has(obj)) cage.insideMap.set(obj, d < cageR - r);
      const startedInside = cage.insideMap.get(obj);
      if (!startedInside) continue; // 生成时不在内部，不阻挡
      // 检查目标是否试图越出圆形边界
      if (d + r > cageR) {
        // 找到目标方向角对应的最近墙壁节点
        const exitAngle = Math.atan2(dy, dx);
        let nearestWall = null, nearestAngleDiff = Infinity;
        for (const w of cage.walls) {
          if (w.hp <= 0) continue;
          const wa = Math.atan2(w.y - cage.cy, w.x - cage.cx);
          let diff = Math.abs(exitAngle - wa);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < nearestAngleDiff) { nearestAngleDiff = diff; nearestWall = w; }
        }
        // 如果该方向有存活墙壁（±36°内），推回
        const wallArcThreshold = Math.PI / (B2C.CAGE_WALL_COUNT || 10); // 每节点覆盖弧度
        if (nearestWall && nearestAngleDiff < wallArcThreshold * 1.5) {
          obj.x = cage.cx + (dx / d) * (cageR - r - 1);
          obj.y = cage.cy + (dy / d) * (cageR - r - 1);
        }
      }
    }
    if (cage.life <= 0) {
      particles.spawn(cage.cx, cage.cy, '#00ffcc', 20, 5, 25, 4);
      return false;
    }
    return true;
  });

  // ========== BULLET VS BOSS2 ==========
  const dmgMult = b.exposedTimer > 0 ? (B2C.PHASE_DMG_MULT || 3.0) : 1;
  const immune = b.phasing;
  bullets.forEach(bul => {
    if (bul.life <= 0) return;
    if (dist(bul, b) < b.radius) {
      if (!immune) {
        b.hp -= bul.dmg * dmgMult; b.hitFlash = 6;
        if (dmgMult > 1) {
          particles.spawn(b.x, b.y, '#ffffff', 12, 5, 18, 4);
          gameState.screenShake = 5;
        }
      }
      bul.life = 0;
      particles.spawn(bul.x, bul.y, '#FFF', 3, 3, 10, 2);
      const ka = ang(bul, b);
      if (!immune) {
        b.vx = (b.vx || 0) + Math.cos(ka) * 0.8;
        b.vy = (b.vy || 0) + Math.sin(ka) * 0.8;
      }
      if (b.threatTable) b.threatTable.player = (b.threatTable.player || 0) + bul.dmg;
    }
  });

  // ========== BOSS2 DEAD ==========
  if (b.hp <= 0) {
    particles.spawn(b.x, b.y, isCharmed ? '#cc44ff' : B2C.COLOR, 40, 7, 40, 6);
    particles.spawn(b.x, b.y, '#FFD700', 25, 5, 35, 4);
    gameState.screenShake = 15;
    gameState.hitStop = CONFIG.COMBAT.HITSTOP_ON_BOSS_KILL;
    gameState.kills += B2C.KILL_SCORE;
    gameState.showWaveText('BOSS DEFEATED!');
    return true;
  }

  // Contact damage
  if (isCharmed) {
    if (enemies) for (const e of enemies) {
      if (e.faction === 'ally') continue;
      if (dist(b, e) < b.radius + e.radius) {
        e.hp -= B2C.CONTACT_DAMAGE; e.hitFlash = 6;
        const pa = ang(b, e);
        e.vx = (e.vx || 0) + Math.cos(pa) * B2C.CONTACT_KNOCKBACK;
        e.vy = (e.vy || 0) + Math.sin(pa) * B2C.CONTACT_KNOCKBACK;
        particles.spawn(e.x, e.y, '#cc44ff', 5, 3, 12, 3);
      }
    }
  } else {
    if (!P.invincible && dist(b, P) < b.radius + P.radius) {
      gameState.dmgPlayer(B2C.CONTACT_DAMAGE);
      const pa = ang(b, P);
      P.x += Math.cos(pa) * B2C.CONTACT_KNOCKBACK;
      P.y += Math.sin(pa) * B2C.CONTACT_KNOCKBACK;
      gameState.screenShake = 5;
    }
  }

  return false;
}

export function drawBoss2(g, boss2, P, time) {
  const b = boss2;
  const B2C = CONFIG.BOSS2;
  const b2Color = Phaser.Display.Color.HexStringToColor(B2C.COLOR).color;

  // Dash trail
  b.dashTrail.forEach(t => {
    g.fillStyle(b.faction === 'ally' ? 0xcc44ff : b2Color, t.life / 20 * 0.3);
    drawPoly(g, t.x, t.y, b.radius * 0.6, 3, ang(t, P));
    g.fillPath();
  });

  // Mirror ghost trails
  (b.mirrorGhosts || []).forEach(mg => {
    const a = mg.life / mg.maxLife;
    mg.trail.forEach(t => {
      g.fillStyle(b2Color, (t.life / 15) * 0.25 * a);
      drawPoly(g, t.x, t.y, b.radius * 0.55, 3, time * 0.005);
      g.fillPath();
    });
    g.fillStyle(b2Color, a * 0.5);
    drawPoly(g, mg.x, mg.y, b.radius * 0.75, 3, time * 0.005);
    g.fillPath();
    // X mark on ghost to show it's fake
    g.lineStyle(2, 0xff4444, a * 0.7);
    g.beginPath(); g.moveTo(mg.x - 8, mg.y - 8); g.lineTo(mg.x + 8, mg.y + 8); g.strokePath();
    g.beginPath(); g.moveTo(mg.x + 8, mg.y - 8); g.lineTo(mg.x - 8, mg.y + 8); g.strokePath();
  });

  // ── 蛛网囚笼渲染 ──
  (b.cages || []).forEach(cage => {
    const spawnT = Math.min(cage.spawnT || 0, 1);
    const lifeRatio = cage.life / (CONFIG.BOSS2.CAGE_DURATION || 1080);
    const cageColor = b.faction === 'ally' ? 0xcc44ff : 0x00ffcc;
    // 囚笼连线（墙壁之间的蛛丝）
    const aliveWalls = cage.walls.filter(w => w.hp > 0);
    for (let i = 0; i < aliveWalls.length; i++) {
      const w1 = aliveWalls[i], w2 = aliveWalls[(i + 1) % aliveWalls.length];
      const lineAlpha = (0.4 + Math.sin(time * 0.01 + i) * 0.15) * spawnT * lifeRatio;
      g.lineStyle(2, cageColor, lineAlpha);
      g.beginPath(); g.moveTo(w1.x, w1.y);
      const segs = 6;
      for (let s = 1; s <= segs; s++) {
        const t2 = s / segs;
        const mx = w1.x + (w2.x - w1.x) * t2, my = w1.y + (w2.y - w1.y) * t2;
        const perp = s % 2 === 0 ? 5 : -5;
        const dx = w2.x - w1.x, dy = w2.y - w1.y, len = Math.hypot(dx, dy) || 1;
        g.lineTo(mx + (-dy / len) * perp, my + (dx / len) * perp);
      }
      g.lineTo(w2.x, w2.y); g.strokePath();
    }
    // 墙壁节点
    cage.walls.forEach(w => {
      if (w.hp <= 0) return;
      const pulse = 1 + Math.sin(time * 0.018) * 0.2;
      const wAlpha = spawnT * 0.9 * (w.hitFlash > 0 ? 1 : lifeRatio * 0.7 + 0.3);
      const wColor = w.hitFlash > 0 ? 0xffffff : cageColor;
      // 生成动画：从外向内收缩
      const spawnScale = 0.5 + spawnT * 0.5;
      g.fillStyle(wColor, wAlpha);
      g.fillCircle(w.x, w.y, w.radius * pulse * spawnScale);
      g.lineStyle(1.5, 0xffffff, wAlpha * 0.4);
      g.strokeCircle(w.x, w.y, w.radius * pulse * spawnScale + 2);
      // HP条
      if (w.hp < w.maxHp) {
        const bw = 28;
        g.fillStyle(0x000000, 0.5);
        g.fillRect(w.x - bw / 2, w.y - w.radius - 8, bw, 3);
        g.fillStyle(cageColor, 0.9);
        g.fillRect(w.x - bw / 2, w.y - w.radius - 8, bw * (w.hp / w.maxHp), 3);
      }
    });
    // 囚笼中心光晕
    g.fillStyle(cageColor, spawnT * 0.08);
    g.fillCircle(cage.cx, cage.cy, CONFIG.BOSS2.CAGE_RADIUS || 120);
  });

  // ── 蛛丝牵引连线 ──
  if (b.tether && !P.hidden) {
    const tetherAlpha = Math.min(1, b.tether.duration / 20) * 0.7;
    g.lineStyle(2, b.faction === 'ally' ? 0xcc44ff : 0x00ffcc, tetherAlpha);
    g.beginPath();
    g.moveTo(b.x, b.y);
    // 锯齿蛛丝线
    const segs = 12;
    for (let s = 1; s <= segs; s++) {
      const t2 = s / segs;
      const mx = b.x + (P.x - b.x) * t2;
      const my = b.y + (P.y - b.y) * t2;
      const perp = s % 2 === 0 ? 5 : -5;
      const dx = P.x - b.x, dy = P.y - b.y;
      const len = Math.hypot(dx, dy) || 1;
      g.lineTo(mx + (-dy / len) * perp, my + (dx / len) * perp);
    }
    g.lineTo(P.x, P.y);
    g.strokePath();
    // 牵引粒子光点
    g.fillStyle(0x00ffcc, tetherAlpha * 0.6);
    g.fillCircle(P.x, P.y, 6);
  }

  // Clones
  b.clones.forEach(c => {
    const baseAlpha = c.isDecoy ? 0.55 : 0.85;
    g.fillStyle(c.isCharmed ? 0xcc44ff : b2Color, baseAlpha);
    drawPoly(g, c.x, c.y, c.radius, 3, ang(c, P) + time * 0.005);
    g.fillPath();
    // Real clone: brief inner glow to hint identity
    if (!c.isDecoy && c.glowTimer > 0) {
      g.fillStyle(0xffffff, c.glowTimer / 3 * 0.6);
      g.fillCircle(c.x, c.y, c.radius * 0.4);
    }
    // Decoy: subtle red tint on eye
    g.fillStyle(c.isDecoy ? 0xff4444 : 0x000000, 0.6);
    g.fillCircle(c.x, c.y, c.radius * 0.28);
    g.fillStyle(c.isCharmed ? 0xcc44ff : b2Color, 1);
    g.fillCircle(c.x, c.y, c.radius * 0.12);
    if (c.hp < c.maxHp) {
      const bw = c.radius * 2;
      g.fillStyle(0x000000, 0.3);
      g.fillRect(c.x - bw / 2, c.y - c.radius - 10, bw, 3);
      g.fillStyle(c.isCharmed ? 0xcc44ff : b2Color, 0.6);
      g.fillRect(c.x - bw / 2, c.y - c.radius - 10, bw * (c.hp / c.maxHp), 3);
    }
  });

  // Core
  g.save();
  g.translateCanvas(b.x, b.y);

  // Charmed aura
  if (b.faction === 'ally') {
    const pulse = 1 + Math.sin(time * 0.005) * 0.3;
    g.lineStyle(3, 0xcc44ff, 0.6);
    g.strokeCircle(0, 0, b.radius + 12 * pulse);
    g.lineStyle(1.5, 0xcc44ff, 0.3);
    g.strokeCircle(0, 0, b.radius + 20 * pulse);
  }

  // Phase immunity ring
  if (b.phasing) {
    const pAlpha = 0.4 + Math.sin(time * 0.03) * 0.3;
    g.lineStyle(3, 0x00ffff, pAlpha);
    g.strokeCircle(0, 0, b.radius + 10);
    g.lineStyle(1, 0xffffff, pAlpha * 0.5);
    g.strokeCircle(0, 0, b.radius + 18);
  }

  // Exposed window: bright yellow flash
  if (b.exposedTimer > 0) {
    const ef = b.exposedTimer / (B2C.PHASE_EXPOSE_WINDOW || 30);
    g.lineStyle(4, 0xffff00, ef * 0.9);
    g.strokeCircle(0, 0, b.radius + 6);
    g.fillStyle(0xffff00, ef * 0.15);
    g.fillCircle(0, 0, b.radius + 6);
  }

  // Enrage aura
  if (b.enraged) {
    const ep = 1 + Math.sin(time * 0.02) * 0.4;
    g.lineStyle(3, 0xff0088, 0.7);
    g.strokeCircle(0, 0, b.radius + 8 * ep);
    g.lineStyle(1.5, 0xffffff, 0.3);
    g.strokeCircle(0, 0, b.radius + 16 * ep);
  }

  const coreColor = b.hitFlash > 0 ? 0xffffff : b.faction === 'ally' ? 0xcc44ff : b2Color;
  g.fillStyle(coreColor, b.alpha || 1);
  drawPoly(g, 0, 0, b.radius, 3, ang(b, P) + Math.PI / 2);
  g.fillPath();

  // Inner eye
  g.fillStyle(0x000000, 0.6 * (b.alpha || 1));
  g.fillCircle(0, 0, b.radius * 0.3);
  g.fillStyle(b.enraged ? 0xff0088 : (b.faction === 'ally' ? 0xcc44ff : b2Color), b.alpha || 1);
  g.fillCircle(0, 0, b.radius * 0.12);

  // Dash warning
  if (b.dashing && b.dashWarn > 0) {
    const alpha = Math.sin(b.dashWarn * 0.4) * 0.5 + 0.5;
    g.lineStyle(2, b.faction === 'ally' ? 0xcc44ff : b2Color, alpha);
    g.strokeCircle(0, 0, b.radius + 8);
  }

  g.restore();
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




