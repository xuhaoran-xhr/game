// ===========================
//  Wave Manager — wave timing + enemy/boss spawning
// ===========================
import CONFIG from '../config.js';
import { rand, randInt } from '../utils.js';

const STAGE_NAMES = [
  '', // wave 0
  '序章：初始威胁',
  '', '', '',
  '第一幕：毁灭者降临',       // wave 5 → Boss1
  '渗透加剧', '', '', '',
  '第二幕：幻影织网',          // wave 10 → Boss2
  '不死军团', '', '', '',
  '第三幕：星核守卫',          // wave 15 → Boss3
  '末日前兆', '', '', '',
  '终幕：零号协议',            // wave 20 → Boss4
  '暗影蔓延', '', '', '',
  '终极试炼：堕落幽影',          // wave 25 → Boss5
];

export default class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.wave = 1;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.bossScheduled = false;
    this.bossSpawnDelay = 0;
  }

  update(enemies, bossActive) {
    this.waveTimer++;

    // Boss spawn delay countdown (clear field → pause → spawn boss)
    if (this.bossScheduled) {
      this.bossSpawnDelay--;
      if (this.bossSpawnDelay <= 0) {
        this.bossScheduled = false;
        this._spawnBossForWave(this.wave);
      }
      return; // Don't spawn enemies during boss intro
    }

    if (!bossActive) {
      this.spawnTimer--;
      const sp = CONFIG.ENEMIES.SPAWN;
      const rate = Math.max(sp.MIN_RATE, sp.BASE_RATE - this.wave * sp.RATE_REDUCTION_PER_WAVE);
      const maxE = sp.BASE_MAX_COUNT + this.wave * sp.MAX_COUNT_PER_WAVE;
      if (this.spawnTimer <= 0 && enemies.length < maxE) {
        this.scene.spawnEnemy();
        this.spawnTimer = rate;
      }
    }

    const waveDuration = CONFIG.WAVES.BASE_DURATION + this.wave * CONFIG.WAVES.DURATION_PER_WAVE;
    if (this.waveTimer > waveDuration) {
      this.wave++;
      this.waveTimer = 0;

      if (this.wave % CONFIG.BOSS.SPAWN_EVERY_N_WAVES === 0 && !bossActive) {
        // Boss wave! Schedule boss spawn with a dramatic warning
        this.scene.showWaveText('⚠ 警告：强敌来袭 ⚠');
        this.scene.screenShake = 10;
        this.bossScheduled = true;
        this.bossSpawnDelay = 60; // ~1 second pause
      } else {
        // Show stage name or wave number
        const stageName = STAGE_NAMES[this.wave];
        if (stageName) {
          this.scene.showWaveText(stageName);
        } else {
          this.scene.showWaveText('第 ' + this.wave + ' 波');
        }
      }
    }
  }

  _clearFieldForBoss() {
    // Clear all enemies
    if (this.scene.enemies) {
      this.scene.enemies.length = 0;
    }
    // Clear enemy bullets
    if (this.scene.eBullets) {
      this.scene.eBullets.length = 0;
    }
    this.scene.showWaveText('⚠ 警告：强敌来袭 ⚠');
    this.scene.screenShake = 10;
  }

  _spawnBossForWave(wave) {
    // Wave 5→Boss1, 10→Boss2, ..., 30→Boss6, then cycle (modulo 6).
    const bossIndex = wave / CONFIG.BOSS.SPAWN_EVERY_N_WAVES;
    const bossId = ((bossIndex - 1) % 6) + 1;
    this.scene.spawnBoss(bossId);
  }

  reset() {
    this.wave = 1;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.bossScheduled = false;
    this.bossSpawnDelay = 0;
  }
}
