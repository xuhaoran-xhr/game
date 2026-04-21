// ===========================
//  Augment System — TFT-style hex augment cards
// ===========================

const ALL_AUGMENTS = [
  {
    id: 'hp_boost',
    name: '生命激增',
    icon: '🩸',
    desc: '最大 HP +200，回满血量',
    apply(P, CONFIG) {
      P.maxHp += 200;
      P.hp = P.maxHp;
    },
  },
  {
    id: 'fire_rate',
    name: '狂暴射速',
    icon: '⚡',
    desc: '所有武器射速 +50%',
    apply(P, CONFIG) {
      // Reduce all weapon cooldowns
      CONFIG.WEAPONS.PULSE.COOLDOWN = Math.floor(CONFIG.WEAPONS.PULSE.COOLDOWN * 0.5);
      CONFIG.WEAPONS.SHOTGUN.COOLDOWN = Math.floor(CONFIG.WEAPONS.SHOTGUN.COOLDOWN * 0.5);
    },
  },
  {
    id: 'shotgun_pellets',
    name: '弹幕风暴',
    icon: '🔫',
    desc: '散弹枪 +2 发弹丸',
    apply(P, CONFIG) {
      CONFIG.WEAPONS.SHOTGUN.PELLET_COUNT += 2;
    },
  },
  {
    id: 'speed_boost',
    name: '疾风步',
    icon: '💨',
    desc: '移动速度 +30%',
    apply(P, CONFIG) {
      P.speed *= 1.3;
      CONFIG.PLAYER.SPEED *= 1.3;
    },
  },
  {
    id: 'blackhole_master',
    name: '黑洞大师',
    icon: '🌀',
    desc: '黑洞 CD -50%，半径 +30%',
    apply(P, CONFIG) {
      P.skill1Max = Math.floor(P.skill1Max * 0.5);
      CONFIG.BLACK_HOLE.PULL_RADIUS = Math.floor(CONFIG.BLACK_HOLE.PULL_RADIUS * 1.3);
    },
  },
  {
    id: 'charm_master',
    name: '魅惑专家',
    icon: '💜',
    desc: '魅惑时长 +30s，CD -50%',
    apply(P, CONFIG) {
      CONFIG.CHARM_EGG.CHARM_DURATION += 1800;
      P.skill2Max = Math.floor(P.skill2Max * 0.5);
    },
  },
  {
    id: 'defense',
    name: '铁壁防御',
    icon: '🛡️',
    desc: '受到伤害 -25%',
    apply(P, CONFIG) {
      P._dmgReduction = (P._dmgReduction || 0) + 0.25;
    },
  },
  {
    id: 'damage_boost',
    name: '致命一击',
    icon: '💥',
    desc: '所有伤害 +40%',
    apply(P, CONFIG) {
      P._dmgMultiplier = (P._dmgMultiplier || 1) * 1.4;
    },
  },
  {
    id: 'roll_master',
    name: '翻滚大师',
    icon: '🎯',
    desc: '翻滚 CD -60%，无敌窗口延长',
    apply(P, CONFIG) {
      P.rollCdMax = Math.floor(P.rollCdMax * 0.4);
      P.rollDur = Math.floor(P.rollDur * 1.5);
    },
  },
  {
    id: 'lifesteal',
    name: '生命汲取',
    icon: '🧛',
    desc: '造成伤害的 5% 转化为生命',
    apply(P, CONFIG) {
      P._lifesteal = (P._lifesteal || 0) + 0.05;
    },
  },
];

/**
 * Pick N random augments from the pool, avoiding repeats of already-picked IDs.
 */
export function pickRandomAugments(count = 3, excludeIds = []) {
  const pool = ALL_AUGMENTS.filter(a => !excludeIds.includes(a.id));
  const result = [];
  const used = new Set();
  while (result.length < count && result.length < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (!used.has(i)) {
      used.add(i);
      result.push(pool[i]);
    }
  }
  return result;
}

/**
 * Show the augment selection overlay. Returns a promise that resolves with the chosen augment.
 */
export function showAugmentSelection(round, augments) {
  return new Promise((resolve) => {
    const div = document.createElement('div');
    div.id = 'augment-overlay';
    div.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

        #augment-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(245,242,238,0.92);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          z-index: 2000; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          animation: augFadeIn 0.4s ease;
        }
        @keyframes augFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .aug-header {
          text-align: center; margin-bottom: 60px;
        }
        .aug-round {
          font-size: 18px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 6px; color: #C8A96E; margin-bottom: 12px;
        }
        .aug-title {
          font-size: 56px; font-weight: 900; color: #1A1A1A;
          letter-spacing: 8px; margin: 0;
        }
        .aug-subtitle {
          font-size: 16px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 4px; color: #888; margin-top: 12px;
        }

        .aug-cards {
          display: flex; gap: 32px; justify-content: center;
        }

        .aug-card {
          width: 280px; background: #FFFFFF;
          border: 4px solid #1A1A1A; padding: 48px 32px 40px;
          text-align: center; cursor: pointer;
          transition: all 0.2s ease; position: relative;
        }
        .aug-card:hover {
          transform: translate(-6px, -10px);
          box-shadow: 12px 16px 0 #1A1A1A;
          border-color: #C8A96E;
        }
        .aug-card:active {
          transform: translate(0, 0);
          box-shadow: none;
        }

        .aug-icon {
          font-size: 64px; line-height: 1; margin-bottom: 24px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
        }
        .aug-name {
          font-size: 24px; font-weight: 900; color: #1A1A1A;
          letter-spacing: 2px; margin-bottom: 16px;
        }
        .aug-desc {
          font-size: 14px; font-weight: 400; color: #666;
          line-height: 1.6; letter-spacing: 0.5px;
        }
        .aug-tag {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
          background: #1A1A1A; color: #F5F2EE;
          font-size: 11px; font-weight: 900; letter-spacing: 3px;
          padding: 5px 16px; text-transform: uppercase;
        }

        @media (max-width: 960px) {
          .aug-cards { flex-direction: column; align-items: center; gap: 20px; }
          .aug-card { width: 90vw; max-width: 320px; padding: 32px 24px; }
          .aug-title { font-size: 36px; }
        }
      </style>

      <div class="aug-header">
        <div class="aug-round">第 ${round} 轮通关</div>
        <h1 class="aug-title">选择强化</h1>
        <div class="aug-subtitle">CHOOSE YOUR AUGMENT</div>
      </div>

      <div class="aug-cards">
        ${augments.map((aug, i) => `
          <div class="aug-card" data-index="${i}">
            <div class="aug-tag">强化 ${['Ⅰ', 'Ⅱ', 'Ⅲ'][i]}</div>
            <div class="aug-icon">${aug.icon}</div>
            <div class="aug-name">${aug.name}</div>
            <div class="aug-desc">${aug.desc}</div>
          </div>
        `).join('')}
      </div>
    `;

    document.body.appendChild(div);

    // Click handlers
    div.querySelectorAll('.aug-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index);
        const chosen = augments[idx];

        // Selection animation
        card.style.borderColor = '#C8A96E';
        card.style.background = '#C8A96E';
        card.querySelector('.aug-name').style.color = '#FFF';
        card.querySelector('.aug-desc').style.color = '#FFF';

        setTimeout(() => {
          div.style.transition = 'opacity 0.4s ease';
          div.style.opacity = '0';
          setTimeout(() => {
            div.remove();
            resolve(chosen);
          }, 400);
        }, 600);
      });
    });
  });
}
