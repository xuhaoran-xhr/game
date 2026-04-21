// ===========================
//  HUD — draws all UI elements using Phaser Graphics/Text
// ===========================
import CONFIG from '../config.js';

export default class HUD {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100);

    // Texts
    this.infoText = scene.add.text(16, 16, '', {
      fontSize: '11px', fontFamily: 'sans-serif', fontStyle: 'bold',
      color: 'rgba(255,255,255,0.5)',
    }).setDepth(100);

    this.weaponText = scene.add.text(0, 16, '', {
      fontSize: '11px', fontFamily: 'sans-serif', fontStyle: 'bold',
      color: 'rgba(255,255,255,0.5)',
    }).setDepth(100).setOrigin(1, 0);

    this.rollCdText = scene.add.text(0, 0, '翻滚冷却', {
      fontSize: '9px', fontFamily: 'sans-serif',
      color: 'rgba(255,255,255,0.3)',
    }).setDepth(100).setOrigin(0.5, 0).setVisible(false);

    // Wave text
    this.waveText = scene.add.text(0, 0, '', {
      fontSize: '42px', fontFamily: 'sans-serif', fontStyle: 'bold',
      color: '#ffffff', letterSpacing: 8,
    }).setDepth(200).setOrigin(0.5, 0.5).setAlpha(0);

    // Controls hint
    const controlStyle = { fontSize: '9px', fontFamily: 'sans-serif', color: 'rgba(255,255,255,0.25)' };
    this.controlsText = scene.add.text(0, 0,
      'WASD 移动   鼠标 瞄准射击   空格 翻滚(滚后加伤)   Q 黑洞手雷   E 魅惑蛋   1/2/3 切换武器',
      controlStyle
    ).setDepth(100).setOrigin(0.5, 1);

    // Skill CD labels
    this.skillLabels = [];
    for (let i = 0; i < 2; i++) {
      const label = scene.add.text(0, 0, i === 0 ? 'Q' : 'E', {
        fontSize: '13px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#fff',
      }).setDepth(101).setOrigin(0.5, 0.5);
      this.skillLabels.push(label);
    }

    // Dynamic boss name text pool
    this.bossNameTexts = [];
  }

  resize(w, h) {
    this.weaponText.setX(w - 16);
    this.controlsText.setPosition(w / 2, h - 12);
    this.waveText.setPosition(w / 2, h / 2);
  }

  showWaveText(text) {
    this.waveText.setText(text).setAlpha(1);
    this.waveText.setShadow(0, 0, 'rgba(100,220,255,0.7)', 40);
    this.scene.tweens.add({
      targets: this.waveText,
      alpha: 0,
      delay: 1800,
      duration: 400,
    });
  }

  update(player, weapons, kills, wave, comboCount, bosses) {
    const P = player;
    const W = this.scene.scale.width;
    const g = this.graphics;
    g.clear();

    // Check for Boss4 UI Corruption
    let isCorrupted = false;
    if (bosses) {
      for (const b of bosses) {
        if (b.bossName === 'PROTOCOL OMEGA' && b.phase >= 1) {
          if (b.sliceActive || b.beaming || (b.atkTimer && b.atkTimer % 100 < 15)) {
            isCorrupted = true;
            break;
          }
        }
      }
    }

    const randHex = () => Math.random().toString(16).substr(2, 4).toUpperCase();
    const randBin = () => (Math.random() > 0.5 ? '1' : '0').repeat(8);

    // Info text
    if (isCorrupted && Math.random() > 0.2) {
      this.infoText.setText(`[0x${randHex()}] ERR: ${randBin()} NULL_PTR`);
      this.infoText.setColor('#ff0000');
    } else {
      this.infoText.setText(`击杀数: ${kills}   波次: ${wave}   连杀: ${comboCount}`);
      this.infoText.setColor('rgba(255,255,255,0.5)');
    }

    // Weapon text
    let wpnName;
    if (P.isBerserker) {
      wpnName = P.frenzy ? '🩸 嗜血狂化中' : `血刃大剑  怒气:${Math.floor(P.rage || 0)}/100`;
    } else {
      wpnName = weapons[P.weapon].name + (P.rollDmgBoost ? ' [双倍伤害]' : '');
    }
    if (isCorrupted && Math.random() > 0.4) {
      wpnName = `0x${randHex()}_OVERRIDE`;
      this.weaponText.setColor('#ff0000');
    } else {
      this.weaponText.setColor(P.isBerserker ? 'rgba(255,100,100,0.7)' : 'rgba(255,255,255,0.5)');
    }
    this.weaponText.setText(wpnName);

    const H = this.scene.scale.height;

    // Rectangular HP bar in bottom right
    const hpPct = Math.max(0, P.hp / P.maxHp);
    const hpColor = Phaser.Display.Color.GetColor(
      255,
      Math.floor(hpPct * 200),
      Math.floor(hpPct * 100)
    );
    
    const barW = 200;
    const barH = 16;
    const hpBarX = W - barW - 20;
    const hpBarY = H - barH - 20;

    // HP Background
    g.fillStyle(0x0f0f18, 0.8);
    g.lineStyle(2, 0xffffff, 0.3);
    g.fillRect(hpBarX, hpBarY, barW, barH);
    g.strokeRect(hpBarX, hpBarY, barW, barH);

    // HP Fill
    g.fillStyle(hpColor, 0.9);
    g.fillRect(hpBarX + 2, hpBarY + 2, Math.max(0, (barW - 4) * hpPct), barH - 4);


    // Skill CDs
    const skills = [
      { label: 'Q', cd: P.skill1Cd, max: P.skill1Max, color: 0xaa44ff },
      { label: 'E', cd: P.skill2Cd, max: P.skill2Max, color: 0xcc44ff },
    ];
    skills.forEach((s, i) => {
      const sx = W - 100 + i * 50;
      const sy = 40;

      // Background
      g.fillStyle(0xffffff, s.cd > 0 ? 0.15 : 0.3);
      g.fillRect(sx, sy, 36, 36);

      if (s.cd > 0) {
        g.fillStyle(0x000000, 0.5);
        g.fillRect(sx, sy + 36 * (1 - s.cd / s.max), 36, 36 * (s.cd / s.max));
      } else {
        g.lineStyle(1.5, s.color, 1);
        g.strokeRect(sx, sy, 36, 36);
      }

      this.skillLabels[i].setPosition(sx + 18, sy + 18);
      this.skillLabels[i].setColor(s.cd > 0 ? 'rgba(255,255,255,0.3)' : '#FFF');
    });

    // Roll CD
    if (P.rollCd > 0) {
      this.rollCdText.setPosition(P.x, P.y + P.radius + 34).setVisible(true);
    } else {
      this.rollCdText.setVisible(false);
    }

    // Boss HP bars — dynamically render for all active bosses
    let barY = 16;
    const bpx = W / 2 - 150;
    for (let i = 0; i < bosses.length; i++) {
      const boss = bosses[i];
      // Ensure text element exists in pool
      if (!this.bossNameTexts[i]) {
        this.bossNameTexts[i] = this.scene.add.text(0, 0, '', {
          fontSize: '10px', fontFamily: 'sans-serif', fontStyle: 'bold',
          color: 'rgba(255,255,255,0.5)',
        }).setDepth(100).setOrigin(0.5, 0);
      }
      // Background
      g.fillStyle(0xffffff, 0.1);
      g.fillRect(bpx, barY, 300, 8);
      // HP fill
      const hpColor = boss.faction === 'ally' ? 0xcc44ff : (boss.hpColor || 0xff4466);
      g.fillStyle(hpColor, 1);
      g.fillRect(bpx, barY, 300 * Math.max(0, boss.hp / boss.maxHp), 8);
      // Name
      const label = boss.faction === 'ally' ? `💜 ${boss.bossName}` : boss.bossName;
      this.bossNameTexts[i].setPosition(W / 2, barY + 10).setText(label).setVisible(true);
      barY += 24;
    }
    // Hide unused text elements
    for (let i = bosses.length; i < this.bossNameTexts.length; i++) {
      this.bossNameTexts[i].setVisible(false);
    }
  }

  clear() {
    this.graphics.clear();
  }
}
