// ===========================
//  GameScene — main game loop
// ===========================
import CONFIG from '../config.js';
import { dist, ang, rand, clamp } from '../utils.js';
import { updatePlayer, dmgPlayer, castBlackHole, castCharmEgg, drawPlayer } from '../entities/Player.js';
import { updateBerserker, drawBerserker, getActiveHitboxes, isHitboxColliding, addRage, activateFrenzy, startExecution, updateExecution, startUltimateExecution, updateUltimateExecution, startCharging, releaseChargeSlash } from '../entities/Berserker.js';
import { createCharacter } from '../entities/characterRegistry.js';
import { WEAPONS, shoot } from '../entities/weapons.js';
import { spawnEnemy, updateEnemies, drawEnemies } from '../entities/Enemy.js';
import { createBoss, BOSS_META, bossIdFromType } from '../entities/bossRegistry.js';
import { preloadBoss6Assets, registerBoss6Animations } from '../entities/Boss6.js';
import { destroyMatrixRain, startMatrixRain, drawMatrixRain } from '../systems/MatrixRain.js';
import { createCSSRainBG, destroyCSSRainBG } from '../systems/CSSRainBG.js';
import ParticleManager from '../systems/ParticleManager.js';
import WaveManager from '../systems/WaveManager.js';
import HUD from '../systems/HUD.js';
import { pickRandomAugments, showAugmentSelection } from '../systems/AugmentSystem.js';
import { initCleanup } from '../systems/SceneCleanupMixin.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.startWeapon = (data && data.startWeapon) || 0;
    this.shakeMultiplier = (data && data.shakeMultiplier !== undefined) ? data.shakeMultiplier : 1;
    this.gameMode = (data && data.gameMode) || 'normal';
    this.characterType = (data && data.characterType) || 'ranged'; // 'ranged' or 'melee'
    this.mapTheme = (data && data.mapTheme) || 'dark';             // 'dark' | 'light'
  }

  preload() {
    // Boss 6 is the first sprite-sheet driven boss — other bosses are fully
    // procedural and require no preload. Guarded by registration check so
    // re-entering the scene doesn't re-fetch.
    preloadBoss6Assets(this);
  }

  create() {
    initCleanup(this);
    // Register sprite animations (idempotent — early-returns if already done)
    registerBoss6Animations(this);

    const W = this.scale.width;
    const H = this.scale.height;

    // Game state
    this.gameRunning = true;
    this.kills = 0;

    // Re-enable input (may have been disabled by gameOver)
    this.input.enabled = true;
    const canvas = this.game.canvas;
    if (canvas) canvas.style.pointerEvents = 'auto';

    destroyMatrixRain(); // cleanup any leftover from previous game
    createCSSRainBG(this.mapTheme);   // animated rain background behind canvas
    this.trackExternalSystem(() => destroyCSSRainBG());
    this.trackExternalSystem(() => destroyMatrixRain());
    this.comboCount = 0;
    this.comboTimer = 0;
    this.screenShake = 0;
    this.hitStop = 0;
    this.impactFrames = 0;
    this.bossActive = false;

    // Inject Impact Frame CSS if not exists
    if (!document.getElementById('impact-frame-style')) {
      const style = document.createElement('style');
      style.id = 'impact-frame-style';
      style.innerHTML = `
        .impact-frame-active {
          filter: invert(100%) hue-rotate(180deg) brightness(1.5) !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Boss Rush state
    this.bossRushRound = 1;
    this.bossRushPaused = false;
    this.pickedAugmentIds = [];

    // Arrays
    this.bullets = [];
    this.eBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.gravWells = [];
    this.mines = [];
    this.webZones = [];      // Boss2 web zone traps
    this.charmBullets = [];  // Charm Egg projectiles
    this.rifts = [];         // Overdrive dimension rifts

    // Player — dispatched via characterRegistry
    this.P = createCharacter(this.characterType === 'melee' ? 'melee' : 'ranged', W, H);
    if (this.P.type === 'ranged') this.P.weapon = this.startWeapon;

    // Boss references — dynamic array
    this.bosses = [];

    // Systems
    this.particles = new ParticleManager(this);
    this.waveManager = new WaveManager(this);
    this.hud = new HUD(this);
    this.hud.resize(W, H);

    // Graphics layers
    this.bgGraphics = this.add.graphics().setDepth(0);
    this.gameGraphics = this.add.graphics().setDepth(10);
    this.playerGraphics = this.add.graphics().setDepth(20);
    this.bulletGraphics = this.add.graphics().setDepth(15);
    this.crosshairGraphics = this.add.graphics().setDepth(150);

    // Input
    this.keys = {};
    this.mouse = { x: W / 2, y: H / 2, down: false, rightDown: false };

    this.input.keyboard.on('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    this.input.keyboard.on('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    this.input.on('pointermove', (pointer) => {
      this.mouse.x = pointer.x;
      this.mouse.y = pointer.y;
    });
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        this.mouse.down = true;
        // Custom mode: left click to place unit
        if (this.gameMode === 'custom' && this.customPendingUnit) {
          this.customSpawnUnit(pointer.x, pointer.y);
        }
      }
      if (pointer.rightButtonDown()) {
        this.mouse.rightDown = true;
        if (this.P && this.P.type === 'melee' && this.P.frenzy) {
          // Clear any previous ultimate charge timer
          if (this._ultChargeTimeout) { clearTimeout(this._ultChargeTimeout); this._ultChargeTimeout = null; }
          
          // Single click: always try normal execution first (costs 2 killIntent)
          if (!this.P.ultActive && !this.P.ultCharging && !this.P.executing) {
            if (this.P.killIntent >= (CONFIG.BERSERKER.EXEC_KILL_INTENT_MAX || 10)) {
              // Kill intent is full: delay 200ms to distinguish click vs hold
              // If player releases before 200ms -> normal exec
              // If player holds past 200ms -> ultimate charge
              this._ultChargeTimeout = setTimeout(() => {
                if (this.mouse.rightDown && this.P && this.P.frenzy && !this.P.executing &&
                    this.P.killIntent >= (CONFIG.BERSERKER.EXEC_KILL_INTENT_MAX || 10) &&
                    !this.P.ultActive && !this.P.ultCharging) {
                  this.P.ultCharging = true;
                  this.P.ultChargeTimer = 0;
                }
              }, 200);
            } else {
              // Not full: just do normal execution immediately
              startExecution(this.P, this.enemies, this.bosses || [], this.particles);
            }
          }
        }
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (!pointer.leftButtonDown()) this.mouse.down = false;
      if (!pointer.rightButtonDown()) {
        this.mouse.rightDown = false;
        // If released before 200ms timeout fired, do normal execution instead
        if (this._ultChargeTimeout) {
          clearTimeout(this._ultChargeTimeout);
          this._ultChargeTimeout = null;
          // Quick click with full intent -> normal execution
          if (this.P && this.P.type === 'melee' && this.P.frenzy && !this.P.executing && !this.P.ultActive && !this.P.ultCharging) {
            startExecution(this.P, this.enemies, this.bosses || [], this.particles);
          }
        }
        // Cancel ultimate charging on right button release
        if (this.P && this.P.ultCharging) {
          this.P.ultCharging = false;
          this.P.ultChargeTimer = 0;
        }
      }
    });

    // Disable right-click context menu on game canvas
    this._contextMenuHandler = (e) => e.preventDefault();
    this.trackListener(this.game.canvas, 'contextmenu', this._contextMenuHandler);

    // Pause menu state
    this.gamePaused = false;
    this.showHitboxes = false;
    this.autoAim = false;
    this.createPauseMenu();

    // ESC to toggle pause (window-level so it works when scene is paused)
    this._escHandler = (e) => {
      if (e.key === 'Escape') this.togglePause();
    };
    this.trackListener(window, 'keydown', this._escHandler);

    // Resize handler
    this._resizeHandler = (gameSize) => {
      this.hud.resize(gameSize.width, gameSize.height);
    };
    this.trackScaleListener('resize', this._resizeHandler);

    // Start
    if (this.gameMode === 'bossRush') {
      this.showWaveText('⚔ BOSS 连战 · 第 1 轮 ⚔');
      // Delay boss spawn slightly
      this.time.delayedCall(1500, () => this.spawnBossRushRound());
    } else if (this.gameMode === 'custom') {
      this.showWaveText('🎮 自定义模式');
      this.customPendingUnit = null; // { type, faction }
      this.createCustomPanel();
    } else {
      this.showWaveText('第 1 波');
    }

    // Draw static BG
    this.drawBG();
  }

  drawBG() {
    const g = this.bgGraphics;
    const W = this.scale.width;
    const H = this.scale.height;
    g.clear();
    // Theme-aware tint overlay (sits above CSS rain to unify with the canvas)
    // and grid lines. Dark → deep blue-black + thin white grid.
    //               Light → warm off-white + thin dark grid.
    if (this.mapTheme === 'light') {
      g.fillStyle(0xF7F4F0, 0.35);
      g.fillRect(0, 0, W, H);
      g.lineStyle(1, 0x1D1C1A, 0.06);
    } else {
      g.fillStyle(0x080810, 0.3);  // semi-transparent so CSS rain shows through
      g.fillRect(0, 0, W, H);
      g.lineStyle(1, 0xffffff, 0.025);
    }
    for (let x = 0; x < W; x += 60) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath();
    }
    for (let y = 0; y < H; y += 60) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath();
    }
  }

  // === Game state helpers for bosses ===
  get gameStateProxy() {
    const scene = this;
    return {
      get W() { return scene.scale.width; },
      get H() { return scene.scale.height; },
      get screenShake() { return scene.screenShake; },
      set screenShake(v) { scene.screenShake = v; },
      get hitStop() { return scene.hitStop; },
      set hitStop(v) { scene.hitStop = v; },
      get kills() { return scene.kills; },
      set kills(v) { scene.kills = v; },
      get gameRunning() { return scene.gameRunning; },
      get cursorX() { return scene.mouse.x; },
      get cursorY() { return scene.mouse.y; },
      dmgPlayer: (dmg) => {
        const dead = dmgPlayer(scene.P, dmg, scene.enemies, scene.particles);
        scene.screenShake = 5;
        scene.comboCount = 0; scene.comboTimer = 0; scene.P.comboSpeed = 0;
        if (dead) scene.gameOver();
      },
      showWaveText: (t) => scene.showWaveText(t),
      get webZones() { return scene.webZones; },
      get fatalErrorCutscene() { return scene.fatalErrorCutscene; },
      set fatalErrorCutscene(v) { scene.fatalErrorCutscene = v; },
      // Sprite-based bosses (Boss6) need scene access for add.sprite / anims
      get scene() { return scene; },
    };
  }

  showWaveText(text) {
    this.hud.showWaveText(text);
  }

  spawnEnemy() {
    this.enemies.push(spawnEnemy(this.scale.width, this.scale.height, this.waveManager.wave));
  }

  /**
   * Spawn a boss by numeric id (1-6). Replaces the previous 6 copy-pasted
   * spawnBoss / spawnBoss2 / ... / spawnBoss6 methods.
   */
  spawnBoss(id) {
    const meta = BOSS_META[id];
    if (!meta) { console.warn('spawnBoss: unknown id', id); return; }
    this.bossActive = true;
    this.bosses.push(createBoss(id, this.scale.width, this.scale.height, this.waveManager.wave));
    this.showWaveText(meta.spawnText);
  }

  // ---- Custom Mode Methods ----
  createCustomPanel() {
    const div = document.createElement('div');
    div.id = 'custom-spawn-panel';
    div.innerHTML = `
      <style>
        #custom-spawn-panel {
          position: fixed; top: 10px; left: 10px; width: 220px;
          background: rgba(255,255,255,0.95); border: 3px solid #1A1A1A;
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          z-index: 999; pointer-events: all; user-select: none;
          max-height: 90vh; overflow-y: auto;
        }
        #custom-spawn-panel .csp-title {
          background: #1A1A1A; color: #F5F2EE; padding: 12px 16px;
          font-size: 14px; font-weight: 900; text-transform: uppercase;
          letter-spacing: 3px; text-align: center;
        }
        #custom-spawn-panel .csp-section {
          padding: 8px 12px; font-size: 11px; font-weight: 900;
          color: #C8A96E; text-transform: uppercase; letter-spacing: 2px;
          border-bottom: 2px solid #E8E2DA;
        }
        #custom-spawn-panel .csp-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; cursor: pointer; transition: all 0.1s;
          border-bottom: 1px solid #eee;
        }
        #custom-spawn-panel .csp-item:hover { background: #f0ece6; }
        #custom-spawn-panel .csp-item.selected { background: #1A1A1A; color: #F5F2EE; }
        #custom-spawn-panel .csp-dot {
          width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
        }
        #custom-spawn-panel .csp-name {
          flex: 1; font-size: 13px; font-weight: 700;
        }
        #custom-spawn-panel .csp-faction {
          font-size: 10px; font-weight: 900; padding: 3px 6px;
          border: 2px solid currentColor; cursor: pointer;
          text-transform: uppercase; letter-spacing: 1px;
        }
        #custom-spawn-panel .csp-faction.enemy { color: #ff4466; }
        #custom-spawn-panel .csp-faction.ally { color: #cc44ff; }
        #custom-spawn-panel .csp-hint {
          padding: 10px 12px; font-size: 11px; color: #888;
          text-align: center; border-top: 2px solid #1A1A1A;
        }
      </style>
      <div class="csp-title">🎮 单位生成</div>
      <div class="csp-section">普通敌人</div>
      <div class="csp-item" data-type="grunt">
        <div class="csp-dot" style="background:#ff4466"></div>
        <span class="csp-name">普通兵</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="fast">
        <div class="csp-dot" style="background:#44ff88"></div>
        <span class="csp-name">快速兵</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="tank">
        <div class="csp-dot" style="background:#ff8844"></div>
        <span class="csp-name">坦克兵</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="shooter">
        <div class="csp-dot" style="background:#aa44ff"></div>
        <span class="csp-name">射手兵</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="dummy">
        <div class="csp-dot" style="background:#888888"></div>
        <span class="csp-name">训练假人</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-section">BOSS</div>
      <div class="csp-item" data-type="boss1">
        <div class="csp-dot" style="background:#ff2244"></div>
        <span class="csp-name">毁灭者-K</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="boss2">
        <div class="csp-dot" style="background:#00ffcc"></div>
        <span class="csp-name">幻影织网者</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="boss3">
        <div class="csp-dot" style="background:#FFD700"></div>
        <span class="csp-name">星核守卫</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="boss4">
        <div class="csp-dot" style="background:#00ffff"></div>
        <span class="csp-name">零号协议</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="boss5">
        <div class="csp-dot" style="background:#8800ff"></div>
        <span class="csp-name">堕落幽影</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-item" data-type="boss6">
        <div class="csp-dot" style="background:#ff2255"></div>
        <span class="csp-name">深渊术士</span>
        <span class="csp-faction enemy" data-faction="enemy">敌方</span>
      </div>
      <div class="csp-hint">选择单位后点击场景放置<br>右键取消 · F1 隐藏面板</div>
      <div class="csp-item csp-toggle" id="cspPlayerToggle">
        <div class="csp-dot" style="background:#44aaff"></div>
        <span class="csp-name">玩家</span>
        <span class="csp-faction ally" id="cspPlayerState">显示中</span>
      </div>
    `;
    document.body.appendChild(div);
    this.customPanelDOM = div;
    this.trackDOM(div);
    this.playerHidden = false;

    // Player toggle
    div.querySelector('#cspPlayerToggle').addEventListener('click', () => {
      this.playerHidden = !this.playerHidden;
      const stateEl = div.querySelector('#cspPlayerState');
      if (this.playerHidden) {
        stateEl.textContent = '已移除';
        stateEl.classList.remove('ally');
        stateEl.classList.add('enemy');
        this.P.invincible = true;
        this.P.hidden = true;
      } else {
        stateEl.textContent = '显示中';
        stateEl.classList.remove('enemy');
        stateEl.classList.add('ally');
        this.P.invincible = false;
        this.P.hidden = false;
        this.P.x = this.scale.width / 2;
        this.P.y = this.scale.height / 2;
      }
    });

    // Item click → select unit
    div.querySelectorAll('.csp-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // If clicking the faction toggle, don't select
        if (e.target.classList.contains('csp-faction')) return;
        const type = item.dataset.type;
        const factionEl = item.querySelector('.csp-faction');
        const faction = factionEl.dataset.faction;
        // Deselect all
        div.querySelectorAll('.csp-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        this.customPendingUnit = { type, faction };
      });
    });

    // Faction toggle click
    div.querySelectorAll('.csp-faction').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.faction === 'enemy') {
          btn.dataset.faction = 'ally';
          btn.textContent = '友方';
          btn.classList.remove('enemy');
          btn.classList.add('ally');
        } else {
          btn.dataset.faction = 'enemy';
          btn.textContent = '敌方';
          btn.classList.remove('ally');
          btn.classList.add('enemy');
        }
        // Update pending unit if this item is selected
        const item = btn.closest('.csp-item');
        if (item.classList.contains('selected') && this.customPendingUnit) {
          this.customPendingUnit.faction = btn.dataset.faction;
        }
      });
    });

    // Right click or ESC to cancel
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown() && this.gameMode === 'custom') {
        this.customPendingUnit = null;
        div.querySelectorAll('.csp-item').forEach(i => i.classList.remove('selected'));
      }
    });

    // F1 to toggle panel visibility
    this.input.keyboard.on('keydown-F1', (e) => {
      e.preventDefault();
      if (div.style.display === 'none') {
        div.style.display = 'block';
      } else {
        div.style.display = 'none';
      }
    });
  }

  customSpawnUnit(x, y) {
    const u = this.customPendingUnit;
    if (!u) return;
    const W = this.scale.width;
    const H = this.scale.height;
    const wave = 5; // baseline wave for stats
    const isAlly = u.faction === 'ally';

    if (['grunt', 'fast', 'tank', 'shooter', 'dummy'].includes(u.type)) {
      // Spawn enemy at position
      const e = spawnEnemy(W, H, wave, u.type === 'dummy' ? 'tank' : u.type);
      e.x = x; e.y = y;
      if (u.type === 'dummy') {
        // Training dummy: high HP, no move, no attack, damage tracking
        e.hp = 9999; e.maxHp = 9999;
        e.speed = 0;
        e.isDummy = true;
        e.totalDamage = 0;
        e.dmgPopups = []; // { value, life, x, y }
        e.shootCd = 999999;
        e.contactDmg = 0;
        e.radius = 25;
        e.color = '#888888';
      }
      if (isAlly) { e.charmed = 999999; e.faction = 'ally'; }
      this.enemies.push(e);
      this.particles.spawn(x, y, u.type === 'dummy' ? '#888888' : (isAlly ? '#cc44ff' : '#ff4466'), 10, 3, 15, 3);
    } else {
      // Boss unit: u.type is 'boss1' … 'boss6'. Use registry to dispatch.
      const bossId = bossIdFromType(u.type);
      if (bossId) {
        const meta = BOSS_META[bossId];
        const b = createBoss(bossId, W, H, wave);
        b.x = x; b.y = y; b.entered = true;
        if (bossId === 4) b.phase = 1;
        if (isAlly) { b.charmed = 999999; b.faction = 'ally'; }
        this.bosses.push(b);
        this.bossActive = true;
        // Bigger bosses (4/5/6) use a beefier particle burst
        const bigBurst = bossId >= 4;
        this.particles.spawn(
          x, y,
          isAlly ? '#cc44ff' : meta.particleColor,
          bigBurst ? 30 : 20,
          bigBurst ? 8 : 5,
          bigBurst ? 35 : 25,
          bigBurst ? 5 : 4,
        );
        // Boss4 also triggers matrix rain on spawn
        if (bossId === 4) startMatrixRain(this.scale.width, this.scale.height, 1);
      }
    }
    this.screenShake = 3;
  }

  gameOver() {
    this.gameRunning = false;
    // Clean up any lingering CSS effects that block DOM interaction
    document.body.classList.remove('impact-frame-active');
    this.impactFrames = 0;
    this.destroyAllGameDOM();

    // Failsafe: forcefully remove custom panel by ID (in case ref was lost)
    const cp = document.getElementById('custom-spawn-panel');
    if (cp) cp.remove();

    // Disable Phaser input so canvas stops intercepting pointer events
    this.input.enabled = false;
    // Set canvas to pass-through so DOM buttons are clickable
    const canvas = this.game.canvas;
    if (canvas) canvas.style.pointerEvents = 'none';

    this.scene.launch('GameOverScene', {
      kills: this.kills,
      wave: this.gameMode === 'bossRush' ? this.bossRushRound : this.waveManager.wave,
      gameMode: this.gameMode,
    });
    // Pause this scene so Phaser stops capturing pointer events,
    // allowing the DOM overlay buttons to be clickable
    this.scene.pause('GameScene');
  }

  // ---- Boss Rush Methods ----

  spawnBossRushRound() {
    if (!this.gameRunning) return;
    const round = this.bossRushRound;
    const W = this.scale.width;
    const H = this.scale.height;
    const BR = CONFIG.BOSS_RUSH;

    // Compute effective wave for boss scaling
    const effectiveWave = 5 + (round - 1) * 3;

    // Randomly pick 2 bosses from the available pool
    const hpMul = 1 + (round - 1) * BR.HP_MULTIPLIER_PER_ROUND;
    const spdMul = 1 + (round - 1) * BR.SPEED_MULTIPLIER_PER_ROUND;
    const bossPool = [1, 2, 3, 4, 5, 6];
    // Shuffle and pick 2
    for (let i = bossPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bossPool[i], bossPool[j]] = [bossPool[j], bossPool[i]];
    }
    const picked = bossPool.slice(0, 2);

    this.bosses = [];
    for (const id of picked) {
      const bRef = createBoss(id, W, H, effectiveWave);
      bRef.hp = Math.floor(bRef.hp * hpMul);
      bRef.maxHp = bRef.hp;
      bRef.speed *= spdMul;
      this.bosses.push(bRef);
    }

    this.bossActive = true;
    this.bossRushPaused = false;

    // Spawn some adds for flavor
    const addCount = Math.min(round * BR.ENEMY_SPAWN_PER_ROUND, 12);
    for (let i = 0; i < addCount; i++) {
      this.time.delayedCall(500 + i * 300, () => {
        if (this.gameRunning && !this.bossRushPaused) this.spawnEnemy();
      });
    }
  }

  checkBossRushComplete() {
    // Both bosses must be dead
    if (this.bosses.length > 0) return;
    if (this.bossRushPaused) return;

    this.bossRushPaused = true;
    this.bossActive = false;

    // Clear remaining enemies and projectiles
    this.enemies = [];
    this.eBullets = [];
    this.bullets = [];
    this.mines = [];
    this.webZones = [];
    this.charmBullets = [];
    this.gravWells = [];

    // Pause the entire scene (true time-stop)
    this.scene.pause();

    // Show augment selection
    const augments = pickRandomAugments(3, this.pickedAugmentIds);
    showAugmentSelection(this.bossRushRound, augments).then(chosen => {
      // Resume the scene
      this.scene.resume();

      // Apply the augment
      chosen.apply(this.P, CONFIG);
      this.pickedAugmentIds.push(chosen.id);

      // Heal player partially
      this.P.hp = Math.min(this.P.maxHp, this.P.hp + Math.floor(this.P.maxHp * 0.3));

      // Next round
      this.bossRushRound++;
      this.showWaveText(`⚔ 第 ${this.bossRushRound} 轮 ⚔`);

      this.time.delayedCall(1500, () => {
        this.bossRushPaused = false;
        this.spawnBossRushRound();
      });
    });
  }

  update(time) {
    if (!this.gameRunning) return;
    if (this.hitStop > 0) { this.hitStop--; return; }
    if (this.bossRushPaused) return;

    // === FATAL ERROR CUTSCENE (Time Stop) ===
    if (this.fatalErrorCutscene) {
      const cx = this.fatalErrorCutscene;
      cx.timer++;
      // Shake screen intensely during cutscene
      this.screenShake = 5 + Math.random() * 10;

      this.drawFrame(time); // Still render the frozen world + cutscene

      // Phase 1: scan complete → deal damage (once)
      if (cx.timer >= cx.duration && !cx.damageDealt) {
        cx.damageDealt = true;
        cx.postDelay = 60; // 1 second freeze after damage

        // SYSTEM FORMAT damages EVERYTHING on screen
        const fatalDmg = CONFIG.BOSS4.GLITCH_CORE.PUNISHMENT_DAMAGE;

        // Damage player
        if (!this.P.hidden && !this.P.invincible) {
          this.dmgPlayer(fatalDmg);
        }

        // Damage all enemies — 1500 damage
        const wipeDmg = 1500;
        this.enemies.forEach(e => {
          e.hp -= wipeDmg;
          e.hitFlash = 15;
          this.particles.spawn(e.x, e.y, '#ff0044', 12, 5, 20, 4);
        });

        // Damage all other bosses — 2000 damage
        this.bosses.forEach(boss => {
          if (boss.glitchCores !== undefined) return;
          boss.hp -= wipeDmg;
          boss.hitFlash = 15;
          this.particles.spawn(boss.x, boss.y, '#ff0044', 20, 8, 30, 6);
        });

        this.screenShake = 40;
        this.showWaveText('💀 系统格式化完成！');
      }

      // Phase 2: post-damage freeze (1 second)
      if (cx.damageDealt) {
        cx.postDelay--;
        if (cx.postDelay <= 0) {
          this.fatalErrorCutscene = null;
        }
      }
      return; // Skip normal update physics
    }

    const P = this.P;
    const W = this.scale.width;
    const H = this.scale.height;
    const PC = CONFIG.PLAYER;

    // Update player (skip entirely when hidden)
    if (!P.hidden) {
      if (P.type === 'melee') {
        updateBerserker(P, this.keys, this.mouse, W, H, this.particles);
      } else {
        updatePlayer(P, this.keys, this.mouse, W, H, this.particles);
      }

      // Auto-aim: override angle to nearest target
      if (this.autoAim) {
        let nearest = null, nearestDist = Infinity;
        this.enemies.forEach(e => {
          if (e.faction === 'ally' || e.faction === 'player') return;
          const d = dist(P, e);
          if (d < nearestDist) { nearestDist = d; nearest = e; }
        });
        this.bosses.forEach(boss => {
          if (!boss.entered && boss.entered !== undefined) return;
          if (boss.faction === 'ally' || boss.faction === 'player') return;
          const d = dist(P, boss);
          if (d < nearestDist) { nearestDist = d; nearest = boss; }
        });
        if (nearest) {
          P.angle = ang(P, nearest);
          this.mouse.x = nearest.x;
          this.mouse.y = nearest.y;
        }
      }

      if (P.type === 'melee') {
        // Action Lock: block all inputs during charge aftermath (收刀硬直)
        const actionLocked = P.chargeAftermaths && P.chargeAftermaths.some(a => !a.triggered);
        if (actionLocked) {
          P.autoSwing = false;
          P.swinging = false;
        } else {
          // Berserker melee: mouse held = auto swing
          P.autoSwing = this.mouse.down && !P.rolling;
          // E key = Blood Frenzy
          if (this.keys['e'] && !P.frenzy) {
            if (activateFrenzy(P)) {
              this.screenShake = 10;
              this.particles.spawn(P.x, P.y, '#ff0000', 30, 8, 30, 5);
              this.showWaveText('🩸 嗜血狂化！');
            }
            this.keys['e'] = false;
          }
          // Q key = 居合斩 (Charge Draw Slash)
          if (this.keys['q'] && !P.charging && !P.executing) {
            startCharging(P);
          }
          if (!this.keys['q'] && P.charging) {
            const result = releaseChargeSlash(P, this.particles);
            if (result) {
              this.hitStop = result.hitstop;
              this.screenShake = 10 + result.tier * 8;
              if (result.impactFrame) this.impactFrames = result.impactFrame;
            }
          }
        }
        // Tick execution state machine
        updateExecution(P, this.particles);
        // Ultimate execution update + charge check
        if (P.ultActive) {
          updateUltimateExecution(P, this.particles, this.gameStateProxy);
        } else if (P.ultCharging && this.mouse.rightDown) {
          P.ultChargeTimer++;
          if (P.ultChargeTimer >= (CONFIG.BERSERKER.ULTIMATE_CHARGE_TIME || 180)) {
            P.ultCharging = false;
            P.ultChargeTimer = 0;
            startUltimateExecution(P, this.enemies, this.bosses || [], this.particles);
          }
        }
      } else {
        // Weapon switch (ranged only)
        if (this.keys['1']) { P.weapon = 0; P.plasmaOn = false; this.keys['1'] = false; }
        if (this.keys['2']) { P.weapon = 1; P.plasmaOn = false; this.keys['2'] = false; }
        if (this.keys['3']) { P.weapon = 2; this.keys['3'] = false; }

        // Shoot
        if (P.weapon === 2) {
          // Railgun charge mechanic (with Overdrive)
          const PL = CONFIG.WEAPONS.PLASMA;
          if (this.mouse.down && !P.rolling && !P.plasmaFiring) {
            P.plasmaCharge = Math.min(P.plasmaCharge + 1, PL.OVERDRIVE_MAX_FRAMES);
            P.plasmaOverdrive = P.plasmaCharge > PL.OVERDRIVE_THRESHOLD;
            P.plasmaOn = false;
          } else if (!this.mouse.down && P.plasmaCharge > 0 && !P.plasmaFiring) {
            // Release — fire the beam
            const isOverdrive = P.plasmaOverdrive;
            P.plasmaFiring = true;
            P.plasmaFireAngle = P.angle;

            if (isOverdrive) {
              // Overdrive release
              const odPct = Math.min(1, (P.plasmaCharge - PL.OVERDRIVE_THRESHOLD) / (PL.OVERDRIVE_MAX_FRAMES - PL.OVERDRIVE_THRESHOLD));
              P.plasmaFireCharge = 1 + odPct; // 1.0 ~ 2.0 for overdrive
              P.plasmaFireTimer = PL.OVERDRIVE_LINGER;
              this.screenShake = 30 + odPct * 20;
              this.hitStop = PL.OVERDRIVE_HITSTOP;
              this.impactFrames = 3;
              // Recoil — push player backwards
              const recoilDist = PL.OVERDRIVE_RECOIL * odPct;
              P.x -= Math.cos(P.angle) * recoilDist;
              P.y -= Math.sin(P.angle) * recoilDist;
              P.x = Math.max(P.radius, Math.min(this.scale.width - P.radius, P.x));
              P.y = Math.max(P.radius, Math.min(this.scale.height - P.radius, P.y));
              // Create dimension rift along beam path
              const beamLen = PL.RANGE * 2;
              this.rifts.push({
                sx: P.x + Math.cos(P.angle) * 30,
                sy: P.y + Math.sin(P.angle) * 30,
                ex: P.x + Math.cos(P.angle) * beamLen,
                ey: P.y + Math.sin(P.angle) * beamLen,
                life: PL.RIFT_DURATION,
                maxLife: PL.RIFT_DURATION,
                width: PL.RIFT_WIDTH * (0.5 + odPct * 0.5),
                angle: P.angle,
              });
              // Burst particles at muzzle
              this.particles.spawn(P.x, P.y, '#ff4444', 30, 8, 35, 6);
              this.particles.spawn(P.x, P.y, '#ffffff', 20, 6, 25, 5);
            } else {
              // Normal release
              P.plasmaFireCharge = P.plasmaCharge / PL.MAX_CHARGE_FRAMES;
              P.plasmaFireTimer = PL.LINGER_DURATION;
              this.screenShake = 5 + P.plasmaFireCharge * 20;
              if (P.plasmaFireCharge > 0.8) this.hitStop = 4;
            }
            P.plasmaCharge = 0;
            P.plasmaOn = false;
            P.plasmaOverdrive = false;
          }
          if (P.plasmaFiring) {
            P.plasmaFireTimer--;
            if (P.plasmaFireTimer <= 0) P.plasmaFiring = false;
          }
        } else {
          P.plasmaCharge = 0;
          P.plasmaFiring = false;
          if (this.mouse.down && !P.rolling) {
            const shake = shoot(P, this.bullets, this.particles);
            if (shake) this.screenShake = shake;
          } else if (P.weapon === 0) {
            // Pistol heat cooldown when NOT firing
            const PC_W = CONFIG.WEAPONS.PISTOL;
            P.pistolCurrentRate = Math.min(PC_W.RAMP_START_RATE, P.pistolCurrentRate + PC_W.RAMP_COOLDOWN);
            P.pistolHeat = 1 - (P.pistolCurrentRate - PC_W.RAMP_MIN_RATE) / (PC_W.RAMP_START_RATE - PC_W.RAMP_MIN_RATE);
            P.pistolHeat = Math.max(0, Math.min(1, P.pistolHeat));
          }
        }
      }

      // Skills (ranged character only)
      if (P.type !== 'melee') {
        if (this.keys['q']) { castBlackHole(P, this.gravWells, this.particles); this.screenShake = 3; this.keys['q'] = false; }
        if (this.keys['e']) { castCharmEgg(P, this.charmBullets, this.particles); this.keys['e'] = false; }
      }
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) { this.comboCount = 0; P.comboSpeed = 0; }
    }

    // Time Dilation calculation
    let timeScale = 1.0;
    if (P.type === 'melee' && P.charging && P.chargeTier === 3) {
      timeScale = 0.2; // 20% global speed
    }

    this.worldTickTimer = (this.worldTickTimer || 0) + timeScale;
    if (this.worldTickTimer < 1.0) {
      // Skip world updates to simulate slow motion, but keep visuals running
      this.particles.update();
      this.hud.update(P, WEAPONS, this.kills, this.waveManager.wave, this.comboCount, this.bosses);
      return;
    }
    this.worldTickTimer -= 1.0;

    // Player bullets
    this.bullets = this.bullets.filter(b => {
      b.x += b.vx; b.y += b.vy; b.life--;
      return b.life > 0 && b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < H + 50;
    });

    // Charm bullets movement + collision
    this.charmBullets = this.charmBullets.filter(cb => {
      cb.x += cb.vx; cb.y += cb.vy; cb.life--;

      // Charm bullet vs enemies
      for (const e of this.enemies) {
        if (e.faction === 'ally') continue; // already allied
        if (dist(cb, e) < e.radius + cb.r) {
          e.charmed = CONFIG.CHARM_EGG.CHARM_DURATION;
          e.faction = 'ally';
          this.particles.spawn(e.x, e.y, CONFIG.CHARM_EGG.COLOR, 15, 4, 25, 4);
          this.showWaveText('💜 魅惑成功！');
          cb.life = 0;
          return false;
        }
      }

      // Charm bullet vs all bosses
      for (const boss of this.bosses) {
        if (boss.entered !== false && (!boss.charmed || boss.charmed <= 0)) {
          if (dist(cb, boss) < boss.radius + cb.r) {
            boss.charmed = CONFIG.CHARM_EGG.CHARM_DURATION;
            boss.faction = 'ally';
            this.particles.spawn(boss.x, boss.y, CONFIG.CHARM_EGG.COLOR, 25, 5, 35, 5);
            this.showWaveText('💜 BOSS 被魅惑！');
            this.screenShake = 8;
            cb.life = 0;
            return false;
          }
        }
      }

      return cb.life > 0 && cb.x > -50 && cb.x < W + 50 && cb.y > -50 && cb.y < H + 50;
    });

    // Enemy bullets (skip friendly bullets damaging player)
    this.eBullets = this.eBullets.filter(b => {
      b.x += b.vx; b.y += b.vy; b.life--;

      // Friendly bullets (from charmed/ally sources) → hit enemy-faction targets
      if (b.friendly) {
        const allTargets = [...this.enemies, ...this.bosses];
        for (const t of allTargets) {
          if (t.faction !== 'enemy') continue;
          if (dist(b, t) < (t.radius || 40) + (b.r || 4)) {
            t.hp -= b.dmg; t.hitFlash = 6;
            this.particles.spawn(b.x, b.y, '#cc44ff', 3, 2, 10, 2);
            // Web spray: snare enemy target
            if (b.isWebSpray) {
              const B2C = CONFIG.BOSS2;
              const baseSnare = B2C.WEB_SPRAY_SNARE || 60;
              const stackBonus = B2C.WEB_SPRAY_SNARE_STACK || 0.15;
              t.snareTier = (t.snareTier || 0) + 1;
              t.snared = Math.max(t.snared || 0, Math.floor(baseSnare * (1 + (t.snareTier - 1) * stackBonus)));
            }
            // Cage bullet (charmed): spawn cage around enemy target
            if (b.isCageBullet && b.sourceRef) {
              const B2C = CONFIG.BOSS2;
              const cageR = B2C.CAGE_RADIUS || 120;
              const wallCount = B2C.CAGE_WALL_COUNT || 10;
              const walls = [];
              for (let i = 0; i < wallCount; i++) {
                const wa = (Math.PI * 2 / wallCount) * i;
                walls.push({ x: t.x + Math.cos(wa) * cageR, y: t.y + Math.sin(wa) * cageR,
                  hp: B2C.CAGE_WALL_HP || 800, maxHp: B2C.CAGE_WALL_HP || 800,
                  radius: B2C.CAGE_WALL_RADIUS || 16, hitFlash: 0 });
              }
              b.sourceRef.cages = b.sourceRef.cages || [];
              b.sourceRef.cages.push({ cx: t.x, cy: t.y, walls, life: B2C.CAGE_DURATION || 1080, spawnT: 0 });
              this.particles.spawn(t.x, t.y, '#cc44ff', 20, 6, 25, 5);
              this.screenShake = 8;
            }
            // Aggro: enemy locks onto the attacker
            if (b.sourceRef) {
              if (t.aggroTarget === undefined || t.aggroTarget === null) t.aggroTarget = b.sourceRef;
              if (t.threatTable) {
                const idx = this.enemies.indexOf(b.sourceRef);
                if (idx >= 0) t.threatTable[idx] = (t.threatTable[idx] || 0) + b.dmg;
                else if (this.bosses.includes(b.sourceRef)) t.threatTable.otherBoss = (t.threatTable.otherBoss || 0) + b.dmg;
              }
            }
            b.life = 0;
            return false;
          }
        }
        return b.life > 0;
      }

      // Normal enemy bullets → hit player-faction and ally-faction targets
      // Hit player
      if (!P.invincible && dist(b, P) < P.radius + (b.r || 4)) {
        const dead = dmgPlayer(P, b.dmg, this.enemies, this.particles);
        this.screenShake = 5;
        this.comboCount = 0; this.comboTimer = 0; P.comboSpeed = 0;
        if (dead) this.gameOver();
        // Web bullet: spawn web zone at impact point
        if (b.isWebBullet) {
          const B2C = CONFIG.BOSS2;
          this.webZones.push({
            x: P.x, y: P.y,
            radius: B2C.WEB_ZONE_RADIUS || 70,
            life: B2C.WEB_ZONE_DURATION || 300,
            maxLife: B2C.WEB_ZONE_DURATION || 300,
            hp: B2C.WEB_ZONE_HP || 3,
            isCharmed: false,
          });
        }
        // Cage bullet: spawn cage around player
        if (b.isCageBullet && b.sourceRef) {
          const B2C = CONFIG.BOSS2;
          const cageR = B2C.CAGE_RADIUS || 120;
          const wallCount = B2C.CAGE_WALL_COUNT || 10;
          const walls = [];
          for (let i = 0; i < wallCount; i++) {
            const wa = (Math.PI * 2 / wallCount) * i;
            walls.push({
              x: P.x + Math.cos(wa) * cageR,
              y: P.y + Math.sin(wa) * cageR,
              hp: B2C.CAGE_WALL_HP || 800,
              maxHp: B2C.CAGE_WALL_HP || 800,
              radius: B2C.CAGE_WALL_RADIUS || 16,
              hitFlash: 0,
            });
          }
          b.sourceRef.cages = b.sourceRef.cages || [];
          b.sourceRef.cages.push({
            cx: P.x, cy: P.y,
            walls,
            life: B2C.CAGE_DURATION || 1080,
            spawnT: 0,
          });
          this.particles.spawn(P.x, P.y, '#00ffcc', 20, 6, 25, 5);
          this.screenShake = 8;
        }
        // Tether: activate pull on boss
        if (b.isTether && b.sourceRef) {
          b.sourceRef.tether = {
            duration: CONFIG.BOSS2.TETHER_DURATION || 90,
            isCharmed: b.isCharmed || false,
          };
          b.sourceRef.tetherCd = CONFIG.BOSS2.TETHER_INTERVAL || 300;
          this.particles.spawn(P.x, P.y, '#00ffcc', 8, 3, 14, 3);
        }
        // Web spray: snare target
        if (b.isWebSpray) {
          const B2C = CONFIG.BOSS2;
          const baseSnare = B2C.WEB_SPRAY_SNARE || 60;
          const stackBonus = B2C.WEB_SPRAY_SNARE_STACK || 0.15;
          P.snareTier = (P.snareTier || 0) + 1;
          const snareFrames = Math.floor(baseSnare * (1 + (P.snareTier - 1) * stackBonus));
          P.snared = Math.max(P.snared || 0, snareFrames);
          this.particles.spawn(P.x, P.y, '#00ff88', 6, 3, 12, 3);
        }
        b.life = 0;
      }

      // Hit ally-faction targets (charmed bosses, ally dummies, etc.)
      if (b.life > 0) {
        const allTargets = [...this.enemies, ...this.bosses];
        for (const t of allTargets) {
          if (t.faction !== 'ally') continue;
          if (dist(b, t) < (t.radius || 40) + (b.r || 4)) {
            t.hp -= b.dmg; t.hitFlash = 6;
            // Training dummy: track damage
            if (t.isDummy) {
              t.totalDamage += b.dmg;
              t.hp = 9999;
              t.dmgPopups.push({ value: b.dmg, life: 30, x: t.x + (Math.random() - 0.5) * 30, y: t.y - 30 });
            }
            this.particles.spawn(b.x, b.y, '#cc44ff', 3, 2, 10, 2);
            b.life = 0;
            break;
          }
        }
      }

      return b.life > 0;
    });

    // Railgun beam damage — single devastating hit on fire frame only
    const plasmaLingerRef = P.plasmaFireCharge > 1 ? CONFIG.WEAPONS.PLASMA.OVERDRIVE_LINGER : CONFIG.WEAPONS.PLASMA.LINGER_DURATION;
    if (P.plasmaFiring && P.plasmaFireTimer === plasmaLingerRef - 1) {
      const PL = CONFIG.WEAPONS.PLASMA;
      const chrgPct = P.plasmaFireCharge; // 0..1 normal, 1..2 overdrive
      const isOD = chrgPct > 1;
      let dmg;
      if (isOD) {
        const odPct = chrgPct - 1; // 0..1
        dmg = PL.DAMAGE_MAX + (PL.OVERDRIVE_DAMAGE - PL.DAMAGE_MAX) * odPct;
      } else {
        dmg = PL.DAMAGE_MIN + (PL.DAMAGE_MAX - PL.DAMAGE_MIN) * chrgPct;
      }
      dmg *= (P.rollDmgBoost ? PC.ROLL_DMG_MULTIPLIER : 1);
      const beamLen = PL.RANGE * 2;
      const beamThresh = PL.BEAM_ANGLE_THRESHOLD * (1 + Math.min(chrgPct, 1) * 2) * (isOD ? 2 : 1);
      const fireAngle = P.plasmaFireAngle;

      // Damage enemies
      this.enemies.forEach(e => {
        if (e.faction === 'ally' || e.faction === 'player') return;
        const toE = ang(P, e);
        const diff = Math.abs(((toE - fireAngle) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (diff < beamThresh && dist(P, e) < beamLen) {
          if (e.isDummy) {
            // Training dummy
            e.totalDamage = (e.totalDamage || 0) + dmg;
            e.damagePopups = e.damagePopups || [];
            e.damagePopups.push({ value: Math.round(dmg), x: e.x, y: e.y - 20, life: 60, startLife: 60 });
            e.hp = 9999;
          } else {
            e.hp -= dmg;
          }
          e.hitFlash = 8;
          this.particles.spawn(e.x, e.y, '#ffffff', isOD ? 16 : 8, 4, 20, 4);
          this.particles.spawn(e.x, e.y, isOD ? '#ff4444' : PL.COLOR, isOD ? 12 : 6, 3, 15, 3);
        }
      });
      // Damage bosses
      this.bosses.forEach(boss => {
        if (!boss.entered && boss.entered !== undefined) return;
        if (boss.faction === 'ally' || boss.faction === 'player') return;
        const toB = ang(P, boss);
        const diff = Math.abs(((toB - fireAngle) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (diff < beamThresh && dist(P, boss) < beamLen) {
          const stunMulti = (boss.coreStunned && boss.coreStunned > 0) ? (CONFIG.BOSS4.GLITCH_CORE.DAMAGE_MULTIPLIER || 2) : 1;
          boss.hp -= dmg * stunMulti; boss.hitFlash = 8;
          this.particles.spawn(boss.x, boss.y, '#ffffff', isOD ? 20 : 12, 5, 25, 5);
          this.particles.spawn(boss.x, boss.y, boss.coreStunned > 0 ? '#ffcc00' : (isOD ? '#ff4444' : PL.COLOR), isOD ? 14 : 8, 4, 20, 4);
        }
        // Beam vs Glitch Cores
        if (boss.glitchCores) {
          boss.glitchCores.forEach(core => {
            if (core.hp <= 0) return;
            const toC = ang(P, core);
            const cDiff = Math.abs(((toC - fireAngle) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            if (cDiff < beamThresh + 0.05 && dist(P, core) < beamLen) {
              core.hp -= dmg;
              core.hitFlash = 4;
              this.particles.spawn(core.x, core.y, '#ff0066', 5, 3, 12, 3);
            }
          });
        }
      });
    }

    // === Dimension Rifts — continuous damage zones ===
    this.rifts = this.rifts.filter(rift => {
      rift.life--;
      const lifePct = rift.life / rift.maxLife;
      const PL = CONFIG.WEAPONS.PLASMA;
      // Check enemies in rift line
      this.enemies.forEach(e => {
        if (e.faction === 'ally' || e.faction === 'player') return;
        // Point-to-line distance
        const dx = rift.ex - rift.sx, dy = rift.ey - rift.sy;
        const len2 = dx * dx + dy * dy;
        const t = Math.max(0, Math.min(1, ((e.x - rift.sx) * dx + (e.y - rift.sy) * dy) / len2));
        const closestX = rift.sx + t * dx, closestY = rift.sy + t * dy;
        const d = Math.hypot(e.x - closestX, e.y - closestY);
        if (d < rift.width) {
          if (e.isDummy) {
            e.totalDamage = (e.totalDamage || 0) + PL.RIFT_DAMAGE_PER_FRAME;
            e.hp = 9999;
          } else {
            e.hp -= PL.RIFT_DAMAGE_PER_FRAME;
          }
          if (Math.random() > 0.7) {
            this.particles.spawn(e.x, e.y, '#aa44ff', 2, 2, 10, 2);
          }
        }
      });
      // Check bosses in rift line
      this.bosses.forEach(boss => {
        if (!boss.entered && boss.entered !== undefined) return;
        if (boss.faction === 'ally' || boss.faction === 'player') return;
        const dx = rift.ex - rift.sx, dy = rift.ey - rift.sy;
        const len2 = dx * dx + dy * dy;
        const t = Math.max(0, Math.min(1, ((boss.x - rift.sx) * dx + (boss.y - rift.sy) * dy) / len2));
        const closestX = rift.sx + t * dx, closestY = rift.sy + t * dy;
        const d = Math.hypot(boss.x - closestX, boss.y - closestY);
        if (d < rift.width + (boss.radius || 20)) {
          boss.hp -= PL.RIFT_DAMAGE_PER_FRAME;
          if (Math.random() > 0.8) this.particles.spawn(boss.x, boss.y, '#aa44ff', 2, 2, 10, 2);
        }
      });
      return rift.life > 0;
    });

    // Gravity wells
    this.gravWells = this.gravWells.filter(g => {
      g.life--;
      this.enemies.forEach(e => {
        if (e.faction === 'ally' || e.faction === 'player') return; // don't pull allies
        const d = dist(g, e);
        if (d < g.radius * 2) {
          const a = ang(e, g);
          const force = (g.pullForce || CONFIG.BLACK_HOLE.PULL_FORCE) * (1 - d / (g.radius * 2));
          e.x += Math.cos(a) * force; e.y += Math.sin(a) * force;
          if (d < g.radius * 0.5) e.hp -= g.dmg;
        }
      });
      if (this.boss) {
        this.boss.missiles.forEach(m => {
          const d = dist(g, m);
          if (d < g.radius * 2) {
            const a = ang(m, g);
            m.vx += Math.cos(a) * CONFIG.BLACK_HOLE.MISSILE_PULL_FORCE;
            m.vy += Math.sin(a) * CONFIG.BLACK_HOLE.MISSILE_PULL_FORCE;
          }
        });
      }
      if (CONFIG.BLACK_HOLE.ABSORB_BULLETS) {
        this.eBullets.forEach(b => {
          if (b.friendly) return; // don't absorb friendly bullets
          const d = dist(g, b);
          if (d < g.radius * 2) {
            const a = ang(b, g);
            b.vx += Math.cos(a) * CONFIG.BLACK_HOLE.BULLET_PULL_FORCE;
            b.vy += Math.sin(a) * CONFIG.BLACK_HOLE.BULLET_PULL_FORCE;
            if (d < g.radius * CONFIG.BLACK_HOLE.BULLET_DESTROY_RADIUS) {
              b.life = 0;
              this.particles.spawn(b.x, b.y, '#aa44ff', 2, 2, 8, 2);
            }
          }
        });
      }
      return g.life > 0;
    });

    // Update enemies
    updateEnemies(this.enemies, P, this.eBullets, this.bosses);

    // Enemy-player contact (skip charmed enemies)
    this.enemies.forEach(e => {
      if (e.faction === 'ally' || e.faction === 'player') return; // allies don't contact-damage player
      if (!P.invincible && dist(e, P) < e.radius + P.radius) {
        const dead = dmgPlayer(P, e.contactDmg || 6, this.enemies, this.particles);
        const pa = ang(e, P);
        P.x += Math.cos(pa) * CONFIG.COMBAT.PLAYER_KNOCKBACK_ON_HIT;
        P.y += Math.sin(pa) * CONFIG.COMBAT.PLAYER_KNOCKBACK_ON_HIT;
        this.screenShake = CONFIG.COMBAT.SCREEN_SHAKE_ON_HIT;
        this.comboCount = 0; this.comboTimer = 0; P.comboSpeed = 0;
        if (dead) this.gameOver();
      }
    });

    // Bullet vs targets (skip allies — player bullets only hit hostiles)
    this.bullets.forEach(b => {
      if (b.life <= 0) return;
      this.enemies.forEach(e => {
        if (e.faction === 'ally' || e.faction === 'player') return;
        if (dist(b, e) < e.radius + (b.r || 3)) {
          e.hp -= b.dmg; e.hitFlash = 6; b.life = 0;
          // Training dummy: track damage
          if (e.isDummy) {
            e.totalDamage += b.dmg;
            e.hp = 9999;
            e.dmgPopups.push({ value: b.dmg, life: 30, x: e.x + (Math.random() - 0.5) * 30, y: e.y - 30 });
          }
          this.particles.spawn(b.x, b.y, '#FFF', 3, 2, 10, 2);
          if (!e.isDummy) {
            const ka = ang(b, e);
            const kbForce = b.knockback !== undefined ? b.knockback : CONFIG.COMBAT.KNOCKBACK_ON_HIT;
            e.vx = (e.vx || 0) + Math.cos(ka) * kbForce;
            e.vy = (e.vy || 0) + Math.sin(ka) * kbForce;
          }
        }
      });
      // Bullet vs bosses
      this.bosses.forEach(boss => {
        if (boss.entered === false) return;
        if (boss.faction === 'ally' || boss.faction === 'player') return;
        if (boss.hp <= 0) return;
        const bossR = boss.radius || 40;
        if (dist(b, boss) < bossR + (b.r || 3)) {
          const stunMulti = (boss.coreStunned && boss.coreStunned > 0) ? (CONFIG.BOSS4?.GLITCH_CORE?.DAMAGE_MULTIPLIER || 2) : 1;
          boss.hp -= b.dmg * stunMulti;
          boss.hitFlash = 6;
          if (boss.threatTable) boss.threatTable.player = (boss.threatTable.player || 0) + b.dmg;
          b.life = 0;
          this.particles.spawn(b.x, b.y, '#FFF', 5, 3, 12, 3);
          this.particles.spawn(b.x, b.y, boss.coreStunned > 0 ? '#ffcc00' : '#ff8800', 4, 2, 10, 2);
          // Knockback for bosses
          const ka = ang(b, boss);
          const bossKb = b.knockback !== undefined ? b.knockback * 0.12 : 0.3;
          boss.vx = (boss.vx || 0) + Math.cos(ka) * bossKb;
          boss.vy = (boss.vy || 0) + Math.sin(ka) * bossKb;

          // Glitch cores
          if (boss.glitchCores) {
            boss.glitchCores.forEach(core => {
              if (core.hp <= 0) return;
              if (dist(b, core) < (core.radius || 20) + (b.r || 3)) {
                core.hp -= b.dmg;
                core.hitFlash = 4;
                this.particles.spawn(core.x, core.y, '#ff0066', 5, 3, 12, 3);
              }
            });
          }
        }
      });
    });

    // === Berserker melee collision ===
    if (P.type === 'melee') {
      const hitboxes = getActiveHitboxes(P);
      hitboxes.forEach(hitbox => {
        const dmg = hitbox.dmg;
        // Unified melee vs ALL targets (enemies + bosses)
        const allTargets = [...this.enemies, ...this.bosses];
        allTargets.forEach(t => {
          // Skip allies (charmed enemies are allies)
          if (t.faction === 'ally' || t.faction === 'player') return;
          // Skip unentered bosses
          if (t.entered === false) return;
          const tRadius = t.radius || 40;
          if (isHitboxColliding(hitbox, t.x, t.y, tRadius)) {
            if (t.lastHitSwingId !== hitbox.id) {
              t.lastHitSwingId = hitbox.id;
              t.hp -= dmg; t.hitFlash = 6;
              // Tag death type for kill VFX
              if (t.hp <= 0) t.killedByMeleeHitbox = hitbox.type;

              // Training dummy: track damage
              if (t.isDummy) {
                t.totalDamage += dmg;
                t.hp = 9999;
                t.dmgPopups.push({
                  value: dmg, life: 30,
                  x: t.x + (Math.random() - 0.5) * 30,
                  y: t.y - 30
                });
              }

              // Particles + knockback (skip dummies)
              const isBoss = this.bosses.includes(t);
              this.particles.spawn(t.x, t.y, '#ff2200', isBoss ? 12 : 8, isBoss ? 4 : 3, isBoss ? 30 : 15, isBoss ? 4 : 3);
              if (!t.isDummy) {
                const ka = ang(P, t);
                const kb = isBoss ? 0.5 : CONFIG.COMBAT.KNOCKBACK_ON_HIT * 3;
                t.vx = (t.vx || 0) + Math.cos(ka) * kb;
                t.vy = (t.vy || 0) + Math.sin(ka) * kb;
              }

              // Lifesteal + kill intent during frenzy
              if (P.frenzy) {
                const heal = Math.ceil(dmg * CONFIG.BERSERKER.FRENZY_LIFESTEAL);
                P.hp = Math.min(P.maxHp, P.hp + heal);
                if (P.killIntent < CONFIG.BERSERKER.EXEC_KILL_INTENT_MAX) {
                  P.killIntent++;
                }
              }

              // 攻击命中加怒气
              addRage(P, CONFIG.BERSERKER.RAGE_PER_HIT);

              // Hit stop + screen shake (first hit per swing)
              if (!hitbox.hasHitThisSwing) {
                hitbox.hasHitThisSwing = true;
                const isHeavy = hitbox.type === 'smash' || hitbox.type === 'inferno' || hitbox.type === 'execution';
                this.hitStop = isHeavy ? 8 : (hitbox.type === 'whirlwind' ? 3 : 2);
                this.screenShake = isHeavy ? 18 : (hitbox.type === 'whirlwind' ? 8 : (isBoss ? 6 : 5));
              }
            }
          }
        });
        // Blade Deflection: destroy enemy bullets
        this.eBullets.forEach(b => {
          if (b.friendly || b.undeflectable) return;
          if (isHitboxColliding(hitbox, b.x, b.y, b.r || 3)) {
            this.particles.spawn(b.x, b.y, '#ff4400', 4, 2, 8, 2);
            b.life = 0;
          }
        });
        // Berserker melee vs Glitch Cores
        this.bosses.forEach(boss => {
          if (!boss.glitchCores) return;
          boss.glitchCores.forEach(core => {
            if (core.hp <= 0) return;
            if (isHitboxColliding(hitbox, core.x, core.y, core.radius || 25)) {
              if (core.lastHitSwingId !== hitbox.id) {
                core.lastHitSwingId = hitbox.id;
                core.hp -= hitbox.dmg;
                core.hitFlash = 6;
                this.particles.spawn(core.x, core.y, '#ff0066', 8, 4, 15, 3);
                this.particles.spawn(core.x, core.y, '#ffcc00', 5, 3, 12, 3);
              }
            }
          });
        });
      });
      // Frenzy sword waves vs enemies
      P.frenzyWaves.forEach(w => {
        const waveTargets = [...this.enemies, ...this.bosses];
        waveTargets.forEach(t => {
          if (t.faction === 'ally' || t.faction === 'player') return;
          if (t.entered === false) return;
          if (dist(w, t) < (t.radius || 40) + 12) {
            t.hp -= w.dmg; t.hitFlash = 4;
            this.particles.spawn(t.x, t.y, '#ff0000', 4, 2, 10, 2);
          }
        });
      });
      // === 居合斩 Aftermath: delayed damage resolution ===
      P.chargeAftermaths = P.chargeAftermaths.filter(a => {
        if (a.triggered) return false;
        if (a.delay > 0) return true;
        // Delay expired — deal damage to all enemies/bosses in the slash line
        a.triggered = true;
        const allTargets = [...this.enemies, ...this.bosses];
        const cos = Math.cos(a.angle), sin = Math.sin(a.angle);
        const halfW = a.width / 2;
        let hitCount = 0;
        allTargets.forEach(t => {
          if (t.faction === 'ally' || t.faction === 'player') return;
          if (t.entered === false) return;
          // Project target onto slash line, check perpendicular distance
          const dx = t.x - a.x, dy = t.y - a.y;
          const along = dx * cos + dy * sin; // projection along slash
          if (along < -50 || along > a.length + 50) return; // outside slash length
          const perp = Math.abs(dx * (-sin) + dy * cos); // perpendicular distance
          if (perp > halfW + (t.radius || 20)) return; // outside slash width
          // HIT — delayed devastation
          t.hp -= a.dmg;
          t.hitFlash = 12;
          hitCount++;
          // Training dummy: track damage + popup
          if (t.isDummy) {
            t.totalDamage += a.dmg;
            t.hp = 9999;
            t.dmgPopups.push({
              value: a.dmg, life: 30,
              x: t.x + (Math.random() - 0.5) * 30,
              y: t.y - 30
            });
          }
          // Massive blood explosion
          this.particles.spawn(t.x, t.y, '#ff0000', 25, 8, 40, 6);
          this.particles.spawnSquares(t.x, t.y, '#ff2200', 20, 6, 35, 5);
          if (a.tier === 3) {
            this.particles.spawn(t.x, t.y, '#ffffff', 15, 5, 30, 4);
          }
          // Knockback along slash direction (skip dummies)
          if (!t.isDummy) {
            const kb = 15 + a.tier * 5;
            t.vx = (t.vx || 0) + cos * kb;
            t.vy = (t.vy || 0) + sin * kb;
          }
        });
        // Destroy enemy bullets in path
        this.eBullets.forEach(b => {
          if (b.friendly) return;
          const dx = b.x - a.x, dy = b.y - a.y;
          const along = dx * cos + dy * sin;
          if (along < 0 || along > a.length) return;
          const perp = Math.abs(dx * (-sin) + dy * cos);
          if (perp < halfW) {
            b.life = 0;
            this.particles.spawn(b.x, b.y, '#ffffff', 3, 2, 6, 2);
          }
        });
        if (hitCount > 0) {
          this.hitStop = Math.min(15, 4 + hitCount * 2);
          this.screenShake = 15 + a.tier * 5;
        }
        return false;
      });
    }

    // Dead enemies
    this.enemies = this.enemies.filter(e => {
      // Training dummies never die
      if (e.isDummy) { e.hp = 9999; return true; }
      if (e.hp <= 0) {
        // Only count kills for non-charmed enemies (charmed dying = ally lost)
        if (e.charmed <= 0) {
          this.kills++;
          this.comboCount++;
          this.comboTimer = PC.COMBO_TIMEOUT;
          if (this.comboCount >= PC.COMBO_THRESHOLD) P.comboSpeed = P.speed * PC.COMBO_SPEED_BONUS;
          addRage(P, CONFIG.BERSERKER.RAGE_PER_KILL); // 仅小怪击杀加怒气
          // Track kill intent for Crimson Execution (frenzy kills)
          if (P.type === 'melee' && P.frenzy && P.killIntent < CONFIG.BERSERKER.EXEC_KILL_INTENT_MAX) {
            P.killIntent++;
          }
        }
        this.hitStop = CONFIG.COMBAT.HITSTOP_ON_KILL;

        if (P.type === 'melee') {
          const type = e.killedByMeleeHitbox;
          if (type === 'cross') {
            // Shattering (White and red sharp bursts)
            this.particles.spawnSquares(e.x, e.y, '#ffffff', 10, 4, 25, 6);
            this.particles.spawnSquares(e.x, e.y, '#ff0000', 15, 6, 35, 5);
          } else if (type === 'moon') {
            // Bisected (Heavy sideways blast)
            this.particles.spawnSquares(e.x, e.y, '#ff2200', 20, 8, 40, 6);
            this.particles.spawn(e.x, e.y, '#ffffff', 8, 3, 20, 8);
          } else if (type === 'smash') {
            // Vaporized (Huge splash, lots of squares and circles)
            this.particles.spawn(e.x, e.y, '#ff0000', 30, 8, 40, 10);
            this.particles.spawnSquares(e.x, e.y, '#ffffff', 15, 5, 50, 12);
          } else {
            // Default glitch death
            this.particles.spawnSquares(e.x, e.y, '#ff0000', 15, 6, 30, 5);
            this.particles.spawnSquares(e.x, e.y, '#aa0000', 10, 3, 40, 8);
          }
        } else {
          this.particles.spawn(e.x, e.y, e.faction === 'ally' ? '#cc44ff' : e.color, 12, 4, 25, 4);
        }

        if (Math.random() < CONFIG.ENEMIES.HP_DROP_CHANCE) {
          this.pickups.push({ x: e.x, y: e.y, type: 'hp', life: CONFIG.ENEMIES.HP_DROP_LIFETIME });
        }
        return false;
      }
      return true;
    });

    // Pickups
    this.pickups = this.pickups.filter(p => {
      p.life--;
      if (dist(p, P) < 24) {
        if (p.type === 'hp') {
          P.hp = Math.min(P.maxHp, P.hp + CONFIG.ENEMIES.HP_DROP_AMOUNT);
          this.particles.spawn(p.x, p.y, '#44ff88', 8, 3, 15, 3);
        }
        return false;
      }
      return p.life > 0;
    });

    // Web Zones (Boss2 蛛网陷阱)
    this.webZones = this.webZones.filter(wz => {
      wz.life--;
      const slowFactor = CONFIG.BOSS2.WEB_ZONE_SLOW || 0.62;
      // Player in zone → apply slow (only enemy webzones)
      if (!wz.isCharmed && !P.invincible && dist(wz, P) < wz.radius + P.radius) {
        P.webSlowed = 8;
      }
      // AI units in zone → apply snare-style speed penalty
      const aiTargets = wz.isCharmed
        ? [...this.enemies, ...this.bosses].filter(t => t.faction === 'enemy')
        : [...this.enemies, ...this.bosses].filter(t => t.faction === 'ally');
      for (const t of aiTargets) {
        if (dist(wz, t) < wz.radius + (t.radius || 20)) {
          t.webSlowed = 8; // AI entities read this in their movement
        }
      }
      // Player bullets can destroy web zones
      this.bullets.forEach(bul => {
        if (bul.life <= 0) return;
        if (dist(bul, wz) < wz.radius) {
          wz.hp = (wz.hp || 2) - 1;
          bul.life = 0;
          this.particles.spawn(wz.x, wz.y, '#00ffcc', 4, 2, 10, 2);
        }
      });
      if ((wz.hp || 0) <= 0) {
        this.particles.spawn(wz.x, wz.y, '#00ffcc', 8, 3, 12, 2);
        return false;
      }
      return wz.life > 0;
    });

    // Mines
    this.mines = this.mines.filter(m => {
      m.life--;
      if (m.armDelay > 0) { m.armDelay--; return m.life > 0; }
      if (!m.isCharmed) {
        // Normal mine: hit player
        if (!P.invincible && dist(m, P) < m.radius + P.radius) {
          const dead = dmgPlayer(P, m.dmg, this.enemies, this.particles);
          this.particles.spawn(m.x, m.y, '#00ff88', 10, 4, 15, 3);
          this.screenShake = 4;
          this.comboCount = 0; this.comboTimer = 0; P.comboSpeed = 0;
          if (dead) this.gameOver();
          return false;
        }
        // Normal mine: also hit ally-faction entities (charmed bosses/enemies)
        for (const t of [...this.enemies, ...this.bosses]) {
          if (t.faction !== 'ally') continue;
          if (dist(m, t) < m.radius + (t.radius || 20)) {
            t.hp -= m.dmg; t.hitFlash = 8;
            this.particles.spawn(m.x, m.y, '#00ff88', 10, 4, 15, 3);
            this.screenShake = 3;
            return false;
          }
        }
      } else {
        // Charmed mine: hit enemy-faction targets only
        for (const t of [...this.enemies, ...this.bosses]) {
          if (t.faction !== 'enemy') continue;
          if (dist(m, t) < m.radius + (t.radius || 20)) {
            t.hp -= m.dmg; t.hitFlash = 8;
            this.particles.spawn(m.x, m.y, '#cc44ff', 10, 4, 15, 3);
            this.screenShake = 3;
            return false;
          }
        }
      }
      return m.life > 0;
    });

    // Wave system (skip in boss rush and custom mode)
    if (this.gameMode !== 'bossRush' && this.gameMode !== 'custom') {
      this.waveManager.update(this.enemies, this.bossActive);
    }

    // Boss update — unified loop
    this.bosses = this.bosses.filter(boss => {
      const otherBosses = this.bosses.filter(ob => ob !== boss && ob.hp > 0);
      const otherBossHpBefore = new Map(otherBosses.map(ob => [ob, ob.hp]));
      // All bosses natively consume an otherBoss array. They use
      // forEachOtherBoss / findOtherBoss from bossShared to iterate / pick
      // targets — no more single/array ambiguity or `isBoss5` special case.
      const dead = boss.updateFn(boss, P, this.bullets, this.eBullets, this.mines, this.particles, this.gameStateProxy, WEAPONS, this.enemies, otherBosses);
      if (boss.faction === 'ally') {
        for (const ob of otherBosses) {
          const prevHp = otherBossHpBefore.get(ob) || 0;
          const delta = Math.max(0, prevHp - Math.max(0, ob.hp));
          if (delta > 0 && ob.threatTable) ob.threatTable.otherBoss = (ob.threatTable.otherBoss || 0) + delta;
        }
      }
      if (dead && this.gameMode !== 'bossRush') this.bossActive = false;
      return !dead;
    });
    // Boss rush: check if both bosses dead → show augment selection
    if (this.gameMode === 'bossRush') {
      this.checkBossRushComplete();
    }

    // === Entity Collision Repulsion (prevent overlap/clipping) ===
    // Placed AFTER boss+enemy+player updates so unstoppable flags are current-frame
    {
      const REPULSE_STRENGTH = 0.4;

      // Unstoppable: entity in dash/charge/roll/execute ignores being pushed
      const isUnstoppable = (e) => !!(
        e.dashing || e.charging || e.rolling ||  // Boss1 charge, Boss2/4 dash, Boss5 roll
        e.executing ||                            // Boss5 / Berserker execution
        e.ultActive ||                            // Berserker ultimate
        e.sliceActive                             // Boss4 slice
      );

      const allEntities = [];
      this.enemies.forEach(e => {
        if (e.hp > 0) allEntities.push({ ref: e, r: e.radius || 15, mass: 1, unstop: false });
      });
      this.bosses.forEach(b => {
        if (b.hp > 0 && b.entered !== false) allEntities.push({ ref: b, r: b.radius || 40, mass: 5, unstop: isUnstoppable(b) });
      });
      if (!P.hidden && P.hp > 0) {
        allEntities.push({ ref: P, r: P.radius || 15, mass: 2, unstop: isUnstoppable(P) });
      }

      for (let i = 0; i < allEntities.length; i++) {
        for (let j = i + 1; j < allEntities.length; j++) {
          const a = allEntities[i], b = allEntities[j];
          if (a.unstop && b.unstop) continue;
          const dx = b.ref.x - a.ref.x;
          const dy = b.ref.y - a.ref.y;
          const d = Math.hypot(dx, dy) || 0.1;
          const minDist = (a.r + b.r) * 0.85;
          if (d < minDist) {
            const overlap = minDist - d;
            const nx = dx / d, ny = dy / d;
            const push = overlap * REPULSE_STRENGTH;
            const totalMass = a.mass + b.mass;
            const aMove = a.unstop ? 0 : (b.unstop ? 1 : b.mass / totalMass);
            const bMove = b.unstop ? 0 : (a.unstop ? 1 : a.mass / totalMass);
            a.ref.x -= nx * push * aMove;
            a.ref.y -= ny * push * aMove;
            b.ref.x += nx * push * bMove;
            b.ref.y += ny * push * bMove;
          }
        }
      }
    }

    // Particles
    this.particles.update();

    // Screen shake
    if (this.screenShake > 0) this.screenShake *= 0.85;

    // ---- DRAW ----
    this.drawFrame(time);
  }

  drawFrame(time) {
    const P = this.P;
    const g = this.gameGraphics;
    const pg = this.playerGraphics;
    const bg = this.bulletGraphics;
    const cg = this.crosshairGraphics;

    g.clear();
    pg.clear();
    bg.clear();
    cg.clear();

    // Matrix code rain (for Boss4) — drawn directly on canvas
    drawMatrixRain(this);

    // Apply screen shake (with settings multiplier)
    const shake = this.screenShake * this.shakeMultiplier;
    if (shake > 0.5) {
      const sx = rand(-shake, shake);
      const sy = rand(-shake, shake);
      this.cameras.main.setScroll(sx, sy);
    } else {
      this.cameras.main.setScroll(0, 0);
    }

    // Gravity wells
    this.gravWells.forEach(gw => {
      const alpha = gw.life / gw.ml;
      g.lineStyle(2, 0xaa44ff, alpha * 0.5);
      for (let i = 0; i < 3; i++) {
        const r = gw.radius * (0.3 + i * 0.35) * (1 + Math.sin(time * 0.005 + i) * 0.1);
        g.strokeCircle(gw.x, gw.y, r);
      }
    });

    // Pickups
    this.pickups.forEach(p => {
      const pulse = 1 + Math.sin(time * 0.008) * 0.2;
      const visible = p.life < 60 ? (Math.floor(p.life / 5) % 2 === 0) : true;
      if (visible) {
        g.fillStyle(0x44ff88, 1);
        g.fillCircle(p.x, p.y, 7 * pulse);
        g.fillStyle(0x080810, 1);
        g.fillRect(p.x - 4, p.y - 1, 8, 2);
        g.fillRect(p.x - 1, p.y - 4, 2, 8);
      }
    });

    // Particles
    this.particles.draw();

    // Enemy bullets (color friendly bullets differently)
    this.eBullets.forEach(b => {
      const color = Phaser.Display.Color.HexStringToColor(b.color || '#ff4466').color;
      bg.fillStyle(color, 1);
      bg.fillCircle(b.x, b.y, b.r || 4);
    });

    // Charm bullets (glowing purple orb)
    this.charmBullets.forEach(cb => {
      const pulse = 1 + Math.sin(time * 0.015) * 0.3;
      bg.fillStyle(0xcc44ff, 0.3);
      bg.fillCircle(cb.x, cb.y, cb.r * 2 * pulse);
      bg.fillStyle(0xcc44ff, 1);
      bg.fillCircle(cb.x, cb.y, cb.r);
      bg.fillStyle(0xffffff, 0.8);
      bg.fillCircle(cb.x, cb.y, cb.r * 0.4);
    });

    // Player bullets
    this.bullets.forEach(b => {
      const color = Phaser.Display.Color.HexStringToColor(b.color || '#44ddff').color;
      bg.fillStyle(color, 1);
      bg.fillCircle(b.x, b.y, b.r || 3);
    });

    // Enemies
    drawEnemies(g, this.enemies, P, time);

    // All bosses
    for (const boss of this.bosses) boss.drawFn(g, boss, P, time);

    // Web Zones
    this.webZones.forEach(wz => {
      const lifeRatio = wz.life / wz.maxLife;
      const pulse = 1 + Math.sin(time * 0.012) * 0.15;
      const alpha = lifeRatio * 0.35;
      g.fillStyle(0x00ffcc, alpha);
      g.fillCircle(wz.x, wz.y, wz.radius * pulse);
      // Web hex pattern rings
      g.lineStyle(1, 0x00ffcc, lifeRatio * 0.5);
      g.strokeCircle(wz.x, wz.y, wz.radius * 0.5);
      g.strokeCircle(wz.x, wz.y, wz.radius * 0.8);
      g.lineStyle(1.5, 0x00ffcc, lifeRatio * 0.7);
      g.strokeCircle(wz.x, wz.y, wz.radius);
      // Cross lines
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + time * 0.002;
        g.lineStyle(1, 0x00ffcc, lifeRatio * 0.3);
        g.beginPath();
        g.moveTo(wz.x, wz.y);
        g.lineTo(wz.x + Math.cos(a) * wz.radius, wz.y + Math.sin(a) * wz.radius);
        g.strokePath();
      }
    });

    // Mines
    this.mines.forEach(m => {
      const armed = m.armDelay <= 0;
      const pulse = armed ? 1 + Math.sin(time * 0.01) * 0.3 : 0.5;
      const alpha = armed ? 0.4 + Math.sin(time * 0.008) * 0.2 : 0.15;
      g.fillStyle(0x00ff88, alpha);
      g.fillCircle(m.x, m.y, m.radius * pulse);
      if (armed) {
        g.lineStyle(1, 0x00ff88, 0.3);
        g.strokeCircle(m.x, m.y, m.radius * 1.8);
      }
      g.fillStyle(0x080810, 1);
      g.fillCircle(m.x, m.y, 3);
    });

    // Player
    if (!P.hidden) {
      if (P.type === 'melee') {
        drawBerserker(P, pg.scene.sys.canvas.getContext('2d'), document.querySelector('canvas'));
      } else {
        drawPlayer(pg, P, this.keys, WEAPONS, time);
      }
      // Snare visual: web strands around player
      if (P.snared > 0) {
        const snareAlpha = Math.min(1, P.snared / 30) * 0.7;
        const pulse = 1 + Math.sin(time * 0.025) * 0.15;
        g.lineStyle(2, 0x00ff88, snareAlpha);
        g.strokeCircle(P.x, P.y, (P.radius + 8) * pulse);
        g.lineStyle(1, 0x00ffcc, snareAlpha * 0.6);
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + time * 0.005;
          g.beginPath();
          g.moveTo(P.x, P.y);
          g.lineTo(P.x + Math.cos(a) * (P.radius + 10) * pulse, P.y + Math.sin(a) * (P.radius + 10) * pulse);
          g.strokePath();
        }
      }

      // Training dummy damage counters (drawn AFTER drawBerserker so canvas isn't cleared)
      if (P.type === 'melee' && P._canvasEl) {
        const dummyCtx = P._canvasEl.getContext('2d');
        this.enemies.forEach(e => {
          if (!e.isDummy) return;
          e.speed = 0; e.vx = 0; e.vy = 0;
          e.hp = 9999;
          dummyCtx.save();
          dummyCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          dummyCtx.fillRect(e.x - 60, e.y - 55, 120, 24);
          dummyCtx.font = 'bold 16px Inter, monospace';
          dummyCtx.fillStyle = '#ff4444';
          dummyCtx.textAlign = 'center';
          dummyCtx.textBaseline = 'middle';
          dummyCtx.fillText(`DMG: ${Math.round(e.totalDamage)}`, e.x, e.y - 43);
          dummyCtx.font = '11px Inter, sans-serif';
          dummyCtx.fillStyle = '#aaaaaa';
          dummyCtx.fillText('\u8bad\u7ec3\u5047\u4eba', e.x, e.y - 65);
          e.dmgPopups = e.dmgPopups.filter(p => {
            p.life--; p.y -= 1.5;
            const alpha = Math.max(0, p.life / 30);
            dummyCtx.font = `bold ${14 + (30 - p.life) * 0.3}px Inter, monospace`;
            dummyCtx.fillStyle = `rgba(255, 68, 0, ${alpha})`;
            dummyCtx.fillText(`-${p.value}`, p.x + (Math.random() - 0.5) * 2, p.y);
            return p.life > 0;
          });
          dummyCtx.restore();
        });
      }

      // Training dummy HTML overlays (for ALL character types)
      this.enemies.forEach(e => {
        if (!e.isDummy) return;
        e.speed = 0; e.vx = 0; e.vy = 0;
        e.hp = 9999;
        // Create or update HTML overlay for this dummy
        if (!e._dummyDiv) {
          e._dummyDiv = document.createElement('div');
          e._dummyDiv.style.cssText = 'position:absolute;pointer-events:none;z-index:200;text-align:center;font-family:Inter,monospace;';
          e._dummyLabel = document.createElement('div');
          e._dummyLabel.style.cssText = 'color:#aaa;font-size:11px;';
          e._dummyLabel.textContent = '\u8bad\u7ec3\u5047\u4eba';
          e._dummyDmg = document.createElement('div');
          e._dummyDmg.style.cssText = 'background:rgba(0,0,0,0.75);color:#ff4444;font-size:16px;font-weight:bold;padding:3px 12px;border-radius:4px;display:inline-block;';
          e._dummyPopContainer = document.createElement('div');
          e._dummyPopContainer.style.cssText = 'position:relative;height:0;';
          e._dummyDiv.appendChild(e._dummyLabel);
          e._dummyDiv.appendChild(e._dummyDmg);
          e._dummyDiv.appendChild(e._dummyPopContainer);
          document.body.appendChild(e._dummyDiv);
        }
        // Position the overlay
        const canvas = document.querySelector('canvas');
        const scaleX = canvas.clientWidth / this.scale.width;
        const scaleY = canvas.clientHeight / this.scale.height;
        e._dummyDiv.style.left = (e.x * scaleX - 60) + 'px';
        e._dummyDiv.style.top = (e.y * scaleY - 75) + 'px';
        e._dummyDiv.style.width = '120px';
        e._dummyDmg.textContent = `DMG: ${Math.round(e.totalDamage)}`;
        // Floating popups via DOM
        e.dmgPopups = e.dmgPopups.filter(p => {
          p.life--;
          if (!p._el) {
            p._el = document.createElement('span');
            p._el.style.cssText = 'position:absolute;color:#ff4400;font-weight:bold;font-size:14px;pointer-events:none;white-space:nowrap;';
            p._el.textContent = `-${p.value}`;
            p._el.style.left = (Math.random() * 60 + 10) + 'px';
            p._el.style.top = '0px';
            e._dummyPopContainer.appendChild(p._el);
          }
          const alpha = Math.max(0, p.life / 30);
          p._el.style.opacity = alpha;
          p._el.style.top = (-(30 - p.life) * 1.5) + 'px';
          p._el.style.fontSize = (14 + (30 - p.life) * 0.3) + 'px';
          if (p.life <= 0 && p._el.parentNode) {
            p._el.parentNode.removeChild(p._el);
          }
          return p.life > 0;
        });
      });

      // ========== PISTOL OVERHEAT VFX (ranged only) ==========
      if (P.type !== 'melee' && P.weapon === 0 && P.pistolHeat > 0.3) {
        const heat = P.pistolHeat;
        const t = performance.now() * 0.001;
        const pg2 = this.playerGraphics;

        // Heat glow ring
        const pulse = Math.sin(t * 8) * 0.2 + 0.8;
        const ringR = 20 + heat * 15 + Math.sin(t * 6) * 3;
        const heatR = Math.floor(100 + heat * 155);
        const heatG = Math.floor(100 - heat * 80);
        const heatColor = Phaser.Display.Color.GetColor(heatR, heatG, 255 - heat * 200);
        pg2.lineStyle(1.5 + heat * 2, heatColor, 0.2 * pulse * heat);
        pg2.strokeCircle(P.x, P.y, ringR);

        // Steam/smoke particles (above overheat threshold)
        if (heat > CONFIG.WEAPONS.PISTOL.OVERHEAT_THRESHOLD) {
          if (Math.random() > 0.5) {
            const steamX = P.x + (Math.random() - 0.5) * 20;
            const steamY = P.y - 10 - Math.random() * 15;
            const steamColor = heat > 0.85 ? '#ff6644' : '#aa88cc';
            this.particles.spawn(steamX, steamY, steamColor, 1, 1, 15 + Math.random() * 10, 1);
          }
        }

        // Electrical sparks at very high heat
        if (heat > 0.8) {
          const sparkCount = Math.floor((heat - 0.8) * 10);
          for (let i = 0; i < sparkCount; i++) {
            const sa = Math.random() * Math.PI * 2;
            const sr = 12 + Math.random() * 18;
            const sparkColor = Math.random() > 0.5 ? 0xff4466 : 0xcc66ff;
            pg2.lineStyle(1, sparkColor, 0.4 + Math.random() * 0.4);
            pg2.beginPath();
            let sx = P.x + Math.cos(sa) * 10;
            let sy = P.y + Math.sin(sa) * 10;
            pg2.moveTo(sx, sy);
            sx += Math.cos(sa + (Math.random() - 0.5)) * sr;
            sy += Math.sin(sa + (Math.random() - 0.5)) * sr;
            pg2.lineTo(sx, sy);
            pg2.strokePath();
          }
        }
      }

      // ========== RAILGUN VISUALS (ranged only) ==========
      if (P.type !== 'melee') {
        const PL = CONFIG.WEAPONS.PLASMA;
        const wColor = Phaser.Display.Color.HexStringToColor(PL.COLOR).color;

        // (Charging visuals now handled by SVG crosshair in Player.js)

        // --- OVERDRIVE CHARGING VFX: lightning arcs + danger ring ---
        if (P.plasmaOverdrive && P.plasmaCharge > 0 && !P.plasmaFiring) {
          const odPct = Math.min(1, (P.plasmaCharge - PL.OVERDRIVE_THRESHOLD) / (PL.OVERDRIVE_MAX_FRAMES - PL.OVERDRIVE_THRESHOLD));
          const t = performance.now() * 0.001;
          const pg2 = this.playerGraphics;

          // Pulsing danger ring
          const pulse = Math.sin(t * 15) * 0.3 + 0.7;
          const ringR = 35 + odPct * 25 + Math.sin(t * 8) * 5;
          pg2.lineStyle(2 + odPct * 3, 0xff2200, 0.3 * pulse);
          pg2.strokeCircle(P.x, P.y, ringR);
          pg2.lineStyle(1, 0xffaa00, 0.5 * pulse);
          pg2.strokeCircle(P.x, P.y, ringR - 5);

          // Crackling lightning arcs (4-8 random arcs)
          const numArcs = 4 + Math.floor(odPct * 4);
          for (let i = 0; i < numArcs; i++) {
            const arcAngle = Math.random() * Math.PI * 2;
            const arcLen = 20 + Math.random() * 30 * (1 + odPct);
            const arcColor = Math.random() > 0.5 ? 0xff4400 : 0xffaa00;
            pg2.lineStyle(1 + Math.random(), arcColor, 0.4 + Math.random() * 0.5);
            pg2.beginPath();
            let ax = P.x + Math.cos(arcAngle) * 15;
            let ay = P.y + Math.sin(arcAngle) * 15;
            pg2.moveTo(ax, ay);
            const segs = 3 + Math.floor(Math.random() * 3);
            for (let s = 0; s < segs; s++) {
              ax += Math.cos(arcAngle + (Math.random() - 0.5) * 1.5) * (arcLen / segs);
              ay += Math.sin(arcAngle + (Math.random() - 0.5) * 1.5) * (arcLen / segs);
              pg2.lineTo(ax, ay);
            }
            pg2.strokePath();
          }

          // Warning particles
          if (Math.random() > 0.6) {
            const pa = Math.random() * Math.PI * 2;
            const pr = 20 + Math.random() * 20;
            this.particles.spawn(P.x + Math.cos(pa) * pr, P.y + Math.sin(pa) * pr,
              Math.random() > 0.5 ? '#ff4400' : '#ffaa00', 2, 2, 12, 2);
          }
        }

        // --- FIRED BEAM: Massive blast that fades over time ---
        if (P.plasmaFiring) {
          const chrgPct = P.plasmaFireCharge; // 0..1 normal, 1..2 overdrive
          const isOD = chrgPct > 1;
          const lingerDur = isOD ? PL.OVERDRIVE_LINGER : PL.LINGER_DURATION;
          const lingerPct = P.plasmaFireTimer / lingerDur;
          const fireAngle = P.plasmaFireAngle;
          const beamLen = PL.RANGE * 2;

          const startX = P.x + Math.cos(fireAngle) * 22;
          const startY = P.y + Math.sin(fireAngle) * 22;
          const endX = P.x + Math.cos(fireAngle) * beamLen;
          const endY = P.y + Math.sin(fireAngle) * beamLen;

          let baseWidth;
          if (isOD) {
            const odPct = chrgPct - 1;
            baseWidth = PL.WIDTH_MAX + (PL.OVERDRIVE_WIDTH - PL.WIDTH_MAX) * odPct;
          } else {
            baseWidth = PL.WIDTH_MIN + (PL.WIDTH_MAX - PL.WIDTH_MIN) * chrgPct;
          }
          const currentWidth = baseWidth * lingerPct;

          // Save to history for afterimage
          if (!P.plasmaHist) P.plasmaHist = [];
          P.plasmaHist.unshift({ sx: startX, sy: startY, ex: endX, ey: endY, alpha: lingerPct, w: currentWidth });
          if (P.plasmaHist.length > 12) P.plasmaHist.pop();

          if (isOD) {
            // OVERDRIVE BEAM — red/white alternating, extra layers
            const odFlicker = Math.sin(performance.now() * 0.05) > 0 ? 0xff2200 : 0xffaa00;
            // Outer crimson glow
            pg.lineStyle(currentWidth * 3.5, 0xff0000, 0.06 * lingerPct);
            pg.beginPath(); pg.moveTo(startX, startY); pg.lineTo(endX, endY); pg.strokePath();
            // Red aura
            pg.lineStyle(currentWidth * 2, odFlicker, 0.12 * lingerPct);
            pg.beginPath(); pg.moveTo(startX, startY); pg.lineTo(endX, endY); pg.strokePath();
            // Inner aura (orange-white)
            pg.lineStyle(currentWidth * 1.2, 0xffcc44, 0.4 * lingerPct);
            pg.beginPath(); pg.moveTo(startX, startY); pg.lineTo(endX, endY); pg.strokePath();
            // Core (blazing white)
            pg.lineStyle(currentWidth * 0.5, 0xffffff, 0.95 * lingerPct);
            pg.beginPath(); pg.moveTo(startX, startY); pg.lineTo(endX, endY); pg.strokePath();
          } else {
            // Normal beam (unchanged)
            pg.lineStyle(currentWidth * 2.5, wColor, 0.08 * lingerPct);
            pg.beginPath(); pg.moveTo(startX, startY); pg.lineTo(endX, endY); pg.strokePath();
            pg.lineStyle(currentWidth * 1.2, wColor, 0.35 * lingerPct);
            pg.beginPath(); pg.moveTo(startX, startY); pg.lineTo(endX, endY); pg.strokePath();
            pg.lineStyle(currentWidth * 0.4, 0xffffff, 0.9 * lingerPct);
            pg.beginPath(); pg.moveTo(startX, startY); pg.lineTo(endX, endY); pg.strokePath();
          }

          // Scatter sparks along beam
          if (lingerPct > 0.5) {
            const sparkCount = isOD ? Math.ceil(12 + (chrgPct - 1) * 8) : Math.ceil(chrgPct * 6);
            for (let s = 0; s < sparkCount; s++) {
              const t = Math.random();
              const perpAngle = fireAngle + Math.PI / 2;
              const offset = (Math.random() - 0.5) * currentWidth;
              const px = startX + (endX - startX) * t + Math.cos(perpAngle) * offset;
              const py = startY + (endY - startY) * t + Math.sin(perpAngle) * offset;
              const sparkColor = isOD
                ? (Math.random() > 0.3 ? '#ff4400' : '#ffffff')
                : (Math.random() > 0.5 ? '#ffffff' : PL.COLOR);
              this.particles.spawn(px, py, sparkColor, 1, 2, 15, 3);
            }
          }

          // Muzzle flash
          if (lingerPct > 0.85) {
            const flashR = isOD ? 20 + (chrgPct - 1) * 25 : 8 + chrgPct * 15;
            const glowR = isOD ? 40 + (chrgPct - 1) * 40 : 15 + chrgPct * 25;
            pg.fillStyle(0xffffff, lingerPct);
            pg.fillCircle(startX, startY, flashR);
            pg.fillStyle(isOD ? 0xff4400 : wColor, lingerPct * 0.5);
            pg.fillCircle(startX, startY, glowR);
          }
        } else if (P.plasmaHist && P.plasmaHist.length > 0) {
          P.plasmaHist.forEach(ph => ph.alpha *= 0.6);
        }

        // --- AFTERIMAGE TRAILS ---
        if (P.plasmaHist && P.plasmaHist.length > 1) {
          for (let i = 0; i < P.plasmaHist.length - 1; i++) {
            const curr = P.plasmaHist[i];
            const next = P.plasmaHist[i + 1];
            if (curr.alpha < 0.03) continue;
            pg.fillStyle(wColor, curr.alpha * 0.25);
            pg.beginPath();
            pg.moveTo(curr.sx, curr.sy);
            pg.lineTo(curr.ex, curr.ey);
            pg.lineTo(next.ex, next.ey);
            pg.lineTo(next.sx, next.sy);
            pg.closePath();
            pg.fillPath();
            curr.alpha *= 0.8;
          }
          P.plasmaHist = P.plasmaHist.filter(ph => ph.alpha > 0.03);
        }
      } // end ranged-only railgun visuals

      // ========== DIMENSION RIFT VFX ==========
      if (this.rifts && this.rifts.length > 0) {
        const gg = this.gameGraphics;
        this.rifts.forEach(rift => {
          const lifePct = rift.life / rift.maxLife;
          const alpha = Math.min(1, lifePct * 1.2); // brighter
          const dx = rift.ex - rift.sx, dy = rift.ey - rift.sy;
          const len = Math.hypot(dx, dy);
          const perpX = -dy / len, perpY = dx / len;
          const t = performance.now() * 0.001;

          const segments = 24;
          const w = rift.width * (0.4 + lifePct * 0.6); // doesn't shrink to nothing

          // Broad pulsing glow (very wide, low alpha)
          const pulseAlpha = (0.5 + Math.sin(t * 6) * 0.3) * alpha;
          gg.lineStyle(w * 4, 0x6600cc, 0.06 * pulseAlpha);
          gg.beginPath(); gg.moveTo(rift.sx, rift.sy); gg.lineTo(rift.ex, rift.ey); gg.strokePath();

          // Outer purple glow
          gg.lineStyle(w * 2, 0x8833ff, 0.15 * alpha);
          gg.beginPath(); gg.moveTo(rift.sx, rift.sy); gg.lineTo(rift.ex, rift.ey); gg.strokePath();

          // Main crack — jagged line with animated jitter
          gg.lineStyle(Math.max(2, w * 0.6), 0xaa44ff, 0.7 * alpha);
          gg.beginPath();
          gg.moveTo(rift.sx, rift.sy);
          for (let i = 1; i <= segments; i++) {
            const f = i / segments;
            const bx = rift.sx + dx * f;
            const by = rift.sy + dy * f;
            const jitter = (Math.sin(f * 47 + t * 10) + Math.cos(f * 31 - t * 7)) * w * 0.5;
            gg.lineTo(bx + perpX * jitter, by + perpY * jitter);
          }
          gg.strokePath();

          // Inner glowing core (cyan)
          gg.lineStyle(Math.max(1, w * 0.25), 0x00ffff, 0.8 * alpha);
          gg.beginPath();
          gg.moveTo(rift.sx, rift.sy);
          for (let i = 1; i <= segments; i++) {
            const f = i / segments;
            const bx = rift.sx + dx * f;
            const by = rift.sy + dy * f;
            const jitter = (Math.sin(f * 47 + t * 10) + Math.cos(f * 31 - t * 7)) * w * 0.2;
            gg.lineTo(bx + perpX * jitter, by + perpY * jitter);
          }
          gg.strokePath();

          // Sparking particles along rift (more frequent)
          if (Math.random() > 0.3 && lifePct > 0.05) {
            const rf = Math.random();
            const rx = rift.sx + dx * rf + perpX * (Math.random() - 0.5) * w;
            const ry = rift.sy + dy * rf + perpY * (Math.random() - 0.5) * w;
            const riftColor = Math.random() > 0.5 ? '#aa44ff' : '#00ffcc';
            this.particles.spawn(rx, ry, riftColor, 2, 2, 10 + Math.random() * 8, 2);
            // Secondary smaller crackling sparks
            if (Math.random() > 0.5) {
              this.particles.spawn(rx + (Math.random() - 0.5) * 10, ry + (Math.random() - 0.5) * 10, '#ffffff', 1, 1, 6, 1);
            }
          }
        });
      }


    } // end if (!P.hidden)

    // Crosshair
    const cx = this.mouse.x;
    const cy = this.mouse.y;
    cg.lineStyle(1, 0xffffff, 0.4);
    cg.beginPath(); cg.moveTo(cx - 14, cy); cg.lineTo(cx - 5, cy); cg.strokePath();
    cg.beginPath(); cg.moveTo(cx + 5, cy); cg.lineTo(cx + 14, cy); cg.strokePath();
    cg.beginPath(); cg.moveTo(cx, cy - 14); cg.lineTo(cx, cy - 5); cg.strokePath();
    cg.beginPath(); cg.moveTo(cx, cy + 5); cg.lineTo(cx, cy + 14); cg.strokePath();
    if (P.type !== 'melee' && P.rollDmgBoost) {
      cg.lineStyle(1.5, 0xffd700, 0.5);
      cg.strokeCircle(cx, cy, 10);
    }

    // HUD
    this.hud.update(P, WEAPONS, this.kills, this.waveManager.wave, this.comboCount, this.bosses);

    // Hitbox debug overlay
    if (this.showHitboxes) {
      const hg = this.crosshairGraphics;
      // Player hitbox
      hg.lineStyle(1, 0x00ff00, 0.6);
      hg.strokeCircle(P.x, P.y, P.radius);
      // Enemy hitboxes
      this.enemies.forEach(e => {
        hg.lineStyle(1, e.faction === 'ally' ? 0xcc44ff : 0xff0000, 0.6);
        hg.strokeCircle(e.x, e.y, e.radius || 12);
      });
      // Boss hitboxes
      this.bosses.forEach(boss => {
        hg.lineStyle(1.5, 0xff4444, 0.8);
        hg.strokeCircle(boss.x, boss.y, boss.radius);
      });
      // Enemy bullets
      this.eBullets.forEach(b => {
        hg.lineStyle(1, b.friendly ? 0xcc44ff : 0xff6600, 0.5);
        hg.strokeCircle(b.x, b.y, b.r || 4);
      });
      // Player bullets
      this.bullets.forEach(b => {
        hg.lineStyle(1, 0x00ffff, 0.4);
        hg.strokeCircle(b.x, b.y, b.r || 3);
      });
    }

    // Process Impact Frames
    if (this.impactFrames > 0) {
      document.body.classList.add('impact-frame-active');
      this.impactFrames--;
    } else {
      document.body.classList.remove('impact-frame-active');
    }

    // === FATAL ERROR CUTSCENE (Scanning Line) ===
    if (this.fatalErrorCutscene) {
      const cx = this.fatalErrorCutscene;
      const pct = cx.timer / cx.duration; // 0 to 1
      const scanH = pct * this.scale.height;
      const w = this.scale.width;
      const h = this.scale.height;

      // Darken the screen over time
      const gScene = this.gameGraphics;
      gScene.fillStyle(0x1a0000, Math.min(0.8, pct * 1.5));
      gScene.fillRect(0, 0, w, h);

      // Scanning line glowing edge
      gScene.fillStyle(0xff0044, 0.4);
      gScene.fillRect(0, scanH - 40, w, 40);
      gScene.fillStyle(0xff0000, 1.0);
      gScene.fillRect(0, scanH - 4, w, 8);
      gScene.fillStyle(0xffffff, 0.8);
      gScene.fillRect(0, scanH - 1, w, 2);

      // Red noise lines behind the scan line
      for (let i = 0; i < 10; i++) {
        gScene.fillStyle(0xff0044, Math.random() * 0.5);
        gScene.fillRect(Math.random() * w, Math.random() * scanH, Math.random() * 100 + 20, 2);
      }

      // "FATAL ERROR" Text in the center
      const ctx = gScene.scene.sys.canvas.getContext('2d');
      ctx.save();
      ctx.fillStyle = (Math.floor(time / 50) % 2 === 0) ? '#ff0044' : '#ffffff';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const glitchX = (Math.random() - 0.5) * 10;
      const glitchY = (Math.random() - 0.5) * 10;
      ctx.fillText('[ FATAL ERROR : SYSTEM FORMATTING ]', w / 2 + glitchX, h / 2 + glitchY);

      // Data wipe text
      ctx.fillStyle = '#ff0000';
      ctx.font = '24px monospace';
      ctx.fillText(`DELETING SYSTEM FILES... ${Math.floor(pct * 100)}%`, w / 2 + glitchX * 2, h / 2 + 60 + glitchY * 2);
      ctx.restore();
    }
  }

  // ========== PAUSE MENU ==========

  createPauseMenu() {
    // Gear button
    const btn = document.createElement('div');
    btn.id = 'pause-gear-btn';
    btn.innerHTML = '⚙';
    btn.style.cssText = `
      position:fixed; top:16px; right:16px; z-index:900;
      width:44px; height:44px; cursor:pointer;
      font-size:28px; line-height:44px; text-align:center;
      color:#fff; opacity:0.5; transition:opacity 0.2s;
      pointer-events:all; user-select:none;
    `;
    btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '0.5');
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePause(); });
    document.body.appendChild(btn);
    this.pauseGearBtn = btn;
    this.trackDOM(btn);

    // Pause overlay (hidden by default)
    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.75); z-index:950;
      display:none; align-items:center; justify-content:center;
      font-family:'Inter','Helvetica Neue',Arial,sans-serif;
      pointer-events:all;
    `;
    overlay.innerHTML = `
      <div style="
        background:#111; border:3px solid #444; padding:48px 60px;
        min-width:340px; color:#fff; text-align:center;
      ">
        <h2 style="margin:0 0 32px; font-size:36px; font-weight:900; letter-spacing:4px;">
          暂 停
        </h2>
        <div id="pause-options" style="display:flex; flex-direction:column; gap:16px;">
          <label style="display:flex; align-items:center; justify-content:space-between; gap:16px;
                        font-size:16px; cursor:pointer; padding:10px 16px; border:2px solid #333;
                        transition:border-color 0.15s;">
            <span>碰撞箱显示</span>
            <input type="checkbox" id="hitboxToggle" style="width:20px;height:20px;cursor:pointer;">
          </label>
          <label style="display:flex; align-items:center; justify-content:space-between; gap:16px;
                        font-size:16px; cursor:pointer; padding:10px 16px; border:2px solid #333;
                        transition:border-color 0.15s;">
            <span>自动锁头</span>
            <input type="checkbox" id="autoAimToggle" style="width:20px;height:20px;cursor:pointer;">
          </label>
          <div style="height:12px;"></div>
          <button id="resumeBtn" style="
            padding:12px 24px; font-size:18px; font-weight:700;
            background:#444; color:#fff; border:2px solid #666;
            cursor:pointer; letter-spacing:2px;
            transition:background 0.15s;
          ">▶ 继续游戏</button>
          <button id="pauseMenuBtn" style="
            padding:12px 24px; font-size:16px; font-weight:700;
            background:transparent; color:#888; border:2px solid #444;
            cursor:pointer; letter-spacing:2px;
            transition:all 0.15s;
          ">↩ 返回主菜单</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.pauseOverlay = overlay;
    this.trackDOM(overlay);

    // Wire up buttons
    overlay.querySelector('#resumeBtn').addEventListener('click', () => this.togglePause());
    overlay.querySelector('#pauseMenuBtn').addEventListener('click', () => {
      this.togglePause();
      this.destroyAllGameDOM();
      this.scene.stop();
      this.scene.start('MenuScene');
    });
    overlay.querySelector('#hitboxToggle').addEventListener('change', (e) => {
      this.showHitboxes = e.target.checked;
    });
    overlay.querySelector('#autoAimToggle').addEventListener('change', (e) => {
      this.autoAim = e.target.checked;
    });

    // Hover effects
    overlay.querySelectorAll('button').forEach(b => {
      b.addEventListener('mouseenter', () => { b.style.background = '#555'; b.style.color = '#fff'; });
      b.addEventListener('mouseleave', () => {
        if (b.id === 'resumeBtn') { b.style.background = '#444'; b.style.color = '#fff'; }
        else { b.style.background = 'transparent'; b.style.color = '#888'; }
      });
    });
    overlay.querySelectorAll('label').forEach(l => {
      l.addEventListener('mouseenter', () => l.style.borderColor = '#888');
      l.addEventListener('mouseleave', () => l.style.borderColor = '#333');
    });
  }

  togglePause() {
    if (!this.gameRunning) return;
    this.gamePaused = !this.gamePaused;
    if (this.gamePaused) {
      this.scene.pause();
      this.pauseOverlay.style.display = 'flex';
      this.pauseGearBtn.style.display = 'none';
      // Sync checkbox states
      this.pauseOverlay.querySelector('#hitboxToggle').checked = this.showHitboxes;
      this.pauseOverlay.querySelector('#autoAimToggle').checked = this.autoAim;
    } else {
      this.scene.resume();
      this.pauseOverlay.style.display = 'none';
      this.pauseGearBtn.style.display = 'block';
    }
  }
  /**
   * 🧹 Unified cleanup — destroys ALL game DOM elements and external resources.
   * Called from: gameOver (manual), and automatically on SHUTDOWN/DESTROY via SceneCleanupMixin.
   */
  destroyAllGameDOM() {
    // 1. Player DOM elements (both character types) — cleanup by selector for safety
    document.querySelectorAll([
      '.player-ship',       // ranged player ship
      '.plasma-xhair',      // ranged crosshair
      '.crimson-ghost',     // berserker ghost body
      '.sword-container',    // berserker sword
      '.sword-slash',       // berserker slash swoosh
      '.frenzy-vignette',   // berserker frenzy vignette
      '.phantom-ghost',     // boss5 ghost body
      '.greatsword-container', // boss5 sword
      '#boss5-canvas',      // boss5 canvas overlay
    ].join(',')).forEach(el => el.remove());

    // 2. Berserker custom canvas overlay
    if (this.P && this.P._canvasEl) {
      this.P._canvasEl.remove();
      this.P._canvasEl = null;
    }

    // 2b. Boss DOM cleanup (Boss5 + any with DOM attachments)
    if (this.bosses) {
      this.bosses.forEach(boss => {
        if (boss._ghostEl) { boss._ghostEl.remove(); boss._ghostEl = null; }
        if (boss._swordEl) { boss._swordEl.remove(); boss._swordEl = null; }
        if (boss._canvasEl) { boss._canvasEl.remove(); boss._canvasEl = null; }
        if (boss._resizeHandler) { window.removeEventListener('resize', boss._resizeHandler); boss._resizeHandler = null; }
        // Boss4 fire blob DOM
        if (boss.fireBlobEl) { boss.fireBlobEl.remove(); boss.fireBlobEl = null; }
        // Boss6 Phaser Sprites (body + active skill instances)
        if (boss.bodySprite) { boss.bodySprite.destroy(); boss.bodySprite = null; }
        if (boss.shadows) { boss.shadows.forEach(s => s.sprite && s.sprite.destroy()); boss.shadows = []; }
        if (boss.tentacles) { boss.tentacles.forEach(t => t.sprite && t.sprite.destroy()); boss.tentacles = []; }
        if (boss.acidShots) { boss.acidShots.forEach(a => a.sprite && a.sprite.destroy()); boss.acidShots = []; }
      });
    }

    // 3. Training dummy HTML overlays
    if (this.enemies) {
      this.enemies.forEach(e => {
        if (e._dummyDiv) { e._dummyDiv.remove(); e._dummyDiv = null; }
      });
    }

    // Failsafe: forcefully remove custom panel by ID (in case ref was lost)
    const cpFallback = document.getElementById('custom-spawn-panel');
    if (cpFallback) cpFallback.remove();

    // 4. Delegate to SceneCleanupMixin for all tracked resources
    //    (DOM elements, native listeners, scale listeners, external systems like CSSRainBG/MatrixRain)
    if (this.cleanupAll) this.cleanupAll();
  }
}
