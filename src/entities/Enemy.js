// ===========================
//  Enemy — spawn, update, draw for all 4 types
// ===========================
import CONFIG from '../config.js';
import { ang, rand, randInt, dist } from '../utils.js';

export function spawnEnemy(W, H, wave, forceType) {
  const side = randInt(0, 3);
  let x, y;
  if (side === 0) { x = rand(0, W); y = -30; }
  else if (side === 1) { x = W + 30; y = rand(0, H); }
  else if (side === 2) { x = rand(0, W); y = H + 30; }
  else { x = -30; y = rand(0, H); }

  const EC = CONFIG.ENEMIES;
  let type;
  if (forceType) {
    type = forceType;
  } else {
    const weights = wave < 3 ? EC.WEIGHTS_EARLY : wave < 5 ? EC.WEIGHTS_MID : EC.WEIGHTS_LATE;
    let r = Math.random(), acc = 0, ti = 0;
    for (let i = 0; i < 4; i++) { acc += weights[i]; if (r < acc) { ti = i; break; } }
    const types = ['grunt', 'fast', 'tank', 'shooter'];
    type = types[ti];
  }

  const e = { x, y, vx: 0, vy: 0, type, hitFlash: 0, charmed: 0, faction: 'enemy' };
  if (type === 'grunt') {
    const c = EC.GRUNT;
    e.radius = c.RADIUS; e.hp = c.BASE_HP + wave * c.HP_PER_WAVE;
    e.speed = c.SPEED; e.color = c.COLOR; e.score = c.SCORE; e.contactDmg = c.CONTACT_DAMAGE;
  } else if (type === 'fast') {
    const c = EC.FAST;
    e.radius = c.RADIUS; e.hp = c.BASE_HP + wave * c.HP_PER_WAVE;
    e.speed = c.SPEED; e.color = c.COLOR; e.score = c.SCORE; e.contactDmg = c.CONTACT_DAMAGE;
  } else if (type === 'tank') {
    const c = EC.TANK;
    e.radius = c.RADIUS; e.hp = c.BASE_HP + wave * c.HP_PER_WAVE;
    e.speed = c.SPEED; e.color = c.COLOR; e.score = c.SCORE; e.contactDmg = c.CONTACT_DAMAGE;
  } else if (type === 'shooter') {
    const c = EC.SHOOTER;
    e.radius = c.RADIUS; e.hp = c.BASE_HP + wave * c.HP_PER_WAVE;
    e.speed = c.SPEED; e.color = c.COLOR; e.score = c.SCORE; e.contactDmg = c.CONTACT_DAMAGE;
    e.shootCd = c.BASE_SHOOT_CD; e.shootRate = c.BASE_SHOOT_RATE - wave * c.RATE_REDUCTION_PER_WAVE;
  }
  e.maxHp = e.hp;
  return e;
}

export function updateEnemies(enemies, P, eBullets, bosses) {
  const SC = CONFIG.ENEMIES.SHOOTER;
  enemies.forEach(e => {
    // Charm timer countdown — sync faction
    if (e.charmed > 0) {
      e.charmed--;
      if (e.charmed <= 0 && e.faction === 'ally') e.faction = 'enemy';
    }

    // Launched (Boss6 tentacle): frozen — position/scale driven externally by
    // Boss6.js launched-target ticker. Skip AI, movement, aggro, and shooting.
    if (e.launched) {
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - 1);
      e.vx = 0; e.vy = 0;
      return;
    }

    // Snared (Boss6 shadow trap / other CC): frozen in place, no AI/move/shoot.
    // Enemy still ticks hitFlash and takes external damage normally.
    if (e.snared && e.snared > 0) {
      e.snared--;
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - 1);
      e.vx = 0; e.vy = 0;
      return;
    }

    e.vx = (e.vx || 0) * 0.9;
    e.vy = (e.vy || 0) * 0.9;
    e.hitFlash = Math.max(0, (e.hitFlash || 0) - 1);

    // Aggro decay: clear aggro if target is dead/gone
    if (e.aggroTarget) {
      if (e.aggroTarget.hp <= 0 || (e.aggroTarget !== P && !enemies.includes(e.aggroTarget) && !(bosses && bosses.includes(e.aggroTarget)))) {
        e.aggroTarget = null;
      }
      // If aggro target is on the same team now, clear
      if (e.aggroTarget && e.aggroTarget !== P && e.faction === e.aggroTarget.faction) {
        e.aggroTarget = null;
      }
    }

    if (e.faction === 'ally') {
      // ---- ALLY: target nearest enemy-faction target ----
      let target = e.aggroTarget || null;

      // If no aggro or aggro is same-faction, find nearest enemy target
      if (!target || target === P || target.faction === 'ally' || target.faction === 'player') {
        target = null;
        let bestDist = Infinity;
        // Check enemy-faction enemies
        for (const other of enemies) {
          if (other === e || other.faction !== 'enemy') continue;
          const d = dist(e, other);
          if (d < bestDist) { bestDist = d; target = other; }
        }
        // Check enemy-faction bosses
        if (bosses) {
          for (const boss of bosses) {
            if (boss.faction !== 'enemy' || boss.hp <= 0) continue;
            const d = dist(e, boss);
            if (d < bestDist) { bestDist = d; target = boss; }
          }
        }
      }

      if (target) {
        const tDist = dist(e, target);
        const a = ang(e, target);
        e.x += Math.cos(a) * e.speed * 1.2 + (e.vx || 0);
        e.y += Math.sin(a) * e.speed * 1.2 + (e.vy || 0);

        // Ally contact damage to enemies (with cooldown)
        e.contactCd = (e.contactCd || 0) - 1;
        if (tDist < e.radius + target.radius && e.contactCd <= 0) {
          target.hp -= (e.contactDmg || 6);
          target.hitFlash = 6;
          e.contactCd = 30; // 30 frame cooldown (~0.5s)
        }

        // Ally shooter fires at enemies (2x rate)
        if (e.type === 'shooter') {
          e.shootCd--;
          if (e.shootCd <= 0 && tDist < SC.SHOOT_RANGE) {
            e.shootCd = Math.max(20, Math.floor(e.shootRate / 2));
            const ba = ang(e, target);
            eBullets.push({
              x: e.x, y: e.y,
              vx: Math.cos(ba) * SC.BULLET_SPEED,
              vy: Math.sin(ba) * SC.BULLET_SPEED,
              life: SC.BULLET_LIFETIME, dmg: SC.BULLET_DAMAGE * 1.5,
              r: SC.BULLET_RADIUS, color: '#cc44ff',
              friendly: true, sourceRef: e,
            });
          }
        }
      }
    } else {
      // ---- ENEMY: target aggro or nearest ally/player ----
      let target = e.aggroTarget || null;

      if (!target) {
        let bestDist = Infinity;
        // Check ally-faction enemies
        for (const other of enemies) {
          if (other === e || other.faction !== 'ally') continue;
          const d = dist(e, other);
          if (d < bestDist) { bestDist = d; target = other; }
        }
        // Check ally-faction bosses
        if (bosses) {
          for (const boss of bosses) {
            if (boss.faction !== 'ally' || boss.hp <= 0) continue;
            const d = dist(e, boss);
            if (d < bestDist) { bestDist = d; target = boss; }
          }
        }
        // Fallback to player (skip if hidden)
        if (!P.hidden) {
          const pDist = dist(e, P);
          if (!target || pDist < bestDist) target = P;
        }
      }
      if (!target) return; // no valid target, idle

      const a = ang(e, target);
      e.x += Math.cos(a) * e.speed + (e.vx || 0);
      e.y += Math.sin(a) * e.speed + (e.vy || 0);

      // Enemy contact damage to ally targets (with cooldown)
      if (target !== P && target.faction === 'ally') {
        e.contactCd = (e.contactCd || 0) - 1;
        if (dist(e, target) < e.radius + target.radius && e.contactCd <= 0) {
          target.hp -= (e.contactDmg || 6);
          target.hitFlash = 6;
          e.contactCd = 30;
        }
      }

      if (e.type === 'shooter') {
        e.shootCd--;
        if (e.shootCd <= 0 && dist(e, target) < SC.SHOOT_RANGE) {
          e.shootCd = e.shootRate;
          const ba = ang(e, target);
          eBullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(ba) * SC.BULLET_SPEED,
            vy: Math.sin(ba) * SC.BULLET_SPEED,
            life: SC.BULLET_LIFETIME, dmg: SC.BULLET_DAMAGE,
            r: SC.BULLET_RADIUS, color: SC.BULLET_COLOR,
          });
        }
      }
    }
  });
}

export function drawEnemies(g, enemies, P, time) {
  enemies.forEach(e => {
    g.save();
    g.translateCanvas(e.x, e.y);

    // Charmed aura
    if (e.faction === 'ally') {
      const pulse = 1 + Math.sin(time * 0.006) * 0.3;
      g.lineStyle(2.5, 0xcc44ff, 0.5);
      g.strokeCircle(0, 0, e.radius + 6 * pulse);
      // Hearts / sparkle particles
      const ha = time * 0.003;
      g.fillStyle(0xcc44ff, 0.6);
      g.fillCircle(Math.cos(ha) * (e.radius + 10), Math.sin(ha) * (e.radius + 10), 3);
      g.fillCircle(Math.cos(ha + Math.PI) * (e.radius + 10), Math.sin(ha + Math.PI) * (e.radius + 10), 3);
    }

    const baseColor = e.faction === 'ally' ? 0xcc44ff : Phaser.Display.Color.HexStringToColor(e.color).color;
    const color = e.hitFlash > 0 ? 0xffffff : baseColor;
    g.fillStyle(color, 1);

    // Launch-scale effect (Boss6 tentacle): only affects rendered size, not collision radius
    const ls = (e.launched && e.launchScale) ? e.launchScale : 1;
    const dr = e.radius * ls;

    if (e.type === 'tank') {
      drawPoly(g, 0, 0, dr, 4, Math.PI / 4 + time * 0.001);
      g.fillPath();
    } else if (e.type === 'fast') {
      const a = e.faction === 'ally' ? time * 0.005 : ang(e, P);
      g.beginPath();
      g.moveTo(Math.cos(a) * dr, Math.sin(a) * dr);
      g.lineTo(Math.cos(a + Math.PI + 0.7) * dr, Math.sin(a + Math.PI + 0.7) * dr);
      g.lineTo(Math.cos(a + Math.PI - 0.7) * dr, Math.sin(a + Math.PI - 0.7) * dr);
      g.closePath();
      g.fillPath();
    } else if (e.type === 'shooter') {
      drawPoly(g, 0, 0, dr, 5, time * 0.002);
      g.fillPath();
    } else {
      g.fillCircle(0, 0, dr);
    }

    // HP bar
    if (e.hp < e.maxHp) {
      const bw = e.radius * 2;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(-bw / 2, -e.radius - 10, bw, 3);
      const barColor = e.faction === 'ally' ? 0xcc44ff : Phaser.Display.Color.HexStringToColor(e.color).color;
      g.fillStyle(barColor, 1);
      g.fillRect(-bw / 2, -e.radius - 10, bw * (e.hp / e.maxHp), 3);
    }

    g.restore();
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
