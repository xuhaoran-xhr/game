// ===========================
//  MenuScene — Start menu + Settings
//  设计：利用 MenuView 管理 DOM，场景只负责背景绘制、状态管理和场景跳转
// ===========================
import CONFIG from '../config.js';
import GameState, { CHARACTER, GAME_MODE } from '../GameState.js';
import { initCleanup } from '../systems/SceneCleanupMixin.js';
import MenuView from '../ui/menu/MenuView.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    initCleanup(this);

    const W = this.scale.width;
    const H = this.scale.height;

    // 创建 MenuView 并挂载
    this.menuView = new MenuView();
    const rootEl = this.menuView.mount({
      onStartGame: () => this.startGame(),
      onBossRush: () => this.startBossRush(),
      onCustom: () => this.startCustom(),
      onSelectCharacter: (type) => GameState.setCharacter(type),
    });
    this.trackDOM(rootEl);

    // 同步初始角色选择状态
    this.menuView.setCharacter(GameState.selectedCharacter);
    // 回填已保存的设置 (目前仅地图主题)
    this.menuView.applySettings({ mapTheme: GameState.mapTheme });

    // 背景粒子
    this.bgGraphics = this.add.graphics();
    this.bgParticles = [];
    for (let i = 0; i < 40; i++) {
      this.bgParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    // Resize 处理
    this._resizeHandler = (gameSize) => {
      if (this.menuView) {
        this.menuView.unmount();
        const el = this.menuView.mount({
          onStartGame: () => this.startGame(),
          onBossRush: () => this.startBossRush(),
          onCustom: () => this.startCustom(),
          onSelectCharacter: (type) => GameState.setCharacter(type),
        });
        this.trackDOM(el);
        this.menuView.setCharacter(GameState.selectedCharacter);
      }
    };
    this.trackScaleListener('resize', this._resizeHandler);
  }

  startGame() {
    const settings = this.menuView.readSettings();

    // Apply difficulty presets
    if (settings.difficulty === 'easy') {
      CONFIG.PLAYER.SKILL_Q_COOLDOWN = 200;
      CONFIG.PLAYER.SKILL_E_COOLDOWN = 800;
    } else if (settings.difficulty === 'hard') {
      CONFIG.PLAYER.SKILL_Q_COOLDOWN = 450;
      CONFIG.PLAYER.SKILL_E_COOLDOWN = 1500;
    } else {
      CONFIG.PLAYER.SKILL_Q_COOLDOWN = 300;
      CONFIG.PLAYER.SKILL_E_COOLDOWN = 1200;
    }

    // Apply individual settings
    CONFIG.PLAYER.SPEED = settings.speed;
    CONFIG.PLAYER.MAX_HP = settings.hp;
    CONFIG.ENEMIES.SPAWN.BASE_RATE = settings.spawnRate;
    CONFIG.PLAYER.COMBO_TIMEOUT = settings.comboTimeout;

    // Save to global state
    GameState.startWeapon = settings.weapon;
    GameState.shakeMultiplier = settings.shakePct;
    GameState.particleMode = settings.particles;
    GameState.mapTheme = settings.mapTheme || 'dark';
    GameState.gameMode = GAME_MODE.NORMAL;

    this.menuView.unmount();
    this.menuView = null;

    this.scene.start('GameScene', {
      characterType: GameState.selectedCharacter,
      startWeapon: settings.weapon,
      shakeMultiplier: settings.shakePct,
      particleMode: settings.particles,
      mapTheme: GameState.mapTheme,
    });
  }

  startBossRush() {
    // Pull latest settings from the panel so mapTheme survives into BossRush
    const settings = this.menuView ? this.menuView.readSettings() : {};
    if (settings.mapTheme) GameState.mapTheme = settings.mapTheme;
    GameState.gameMode = GAME_MODE.BOSS_RUSH;
    this.menuView.unmount();
    this.menuView = null;
    this.scene.start('GameScene', {
      characterType: GameState.selectedCharacter,
      gameMode: 'bossRush',
      startWeapon: 0,
      shakeMultiplier: 1,
      mapTheme: GameState.mapTheme,
    });
  }

  startCustom() {
    const settings = this.menuView ? this.menuView.readSettings() : {};
    if (settings.mapTheme) GameState.mapTheme = settings.mapTheme;
    GameState.gameMode = GAME_MODE.CUSTOM;
    this.menuView.unmount();
    this.menuView = null;
    this.scene.start('GameScene', {
      characterType: GameState.selectedCharacter,
      gameMode: 'custom',
      startWeapon: 0,
      shakeMultiplier: 1,
      mapTheme: GameState.mapTheme,
    });
  }

  update(time) {
    const W = this.scale.width;
    const H = this.scale.height;
    const g = this.bgGraphics;
    g.clear();

    // Light background
    g.fillStyle(0xF7F4F0, 1);
    g.fillRect(0, 0, W, H);

    // Subtle grid
    g.lineStyle(1, 0x1D1C1A, 0.05);
    for (let x = 0; x < W; x += 60) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath();
    }
    for (let y = 0; y < H; y += 60) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath();
    }

    // Floating particles
    this.bgParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      const pulse = p.alpha + Math.sin(time * 0.002 + p.x) * 0.1;
      g.fillStyle(0x1D1C1A, pulse);
      g.fillCircle(p.x, p.y, p.r);
    });
  }
}
