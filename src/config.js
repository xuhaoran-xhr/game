// ============================================================
//  NEON OPS — 游戏配置文件 (ES Module)
//  所有数值都在这里调整，游戏代码会自动读取
// ============================================================

const CONFIG = {

  // ========================
  //  主角属性
  // ========================
  PLAYER: {
    SPEED: 2.5,
    RADIUS: 16,
    MAX_HP: 500,

    ROLL_DURATION: 28,
    ROLL_SPEED: 7.5,
    ROLL_COOLDOWN: 25,
    ROLL_DMG_BOOST_WINDOW: 30,
    ROLL_DMG_MULTIPLIER: 2,

    SKILL_Q_COOLDOWN: 300,
    SKILL_E_COOLDOWN: 1200,

    COMBO_THRESHOLD: 5,
    COMBO_SPEED_BONUS: 0.2,
    COMBO_TIMEOUT: 120,

    PLASMA_SLOW_FACTOR: 0.4,
  },

  // ========================
  //  近战狂战士 (腥红幽影)
  // ========================
  BERSERKER: {
    // ── 基础属性 ──
    SPEED: 3.2,                    // 基础移速 (像素/帧)
    RADIUS: 16,                    // 碰撞体半径
    MAX_HP: 1050,                   // 最大生命值

    // ── 暗影步 (翻滚/闪避) ──
    ROLL_DURATION: 18,             // 翻滚持续帧数
    ROLL_SPEED: 9,                 // 翻滚速度 (像素/帧)
    ROLL_COOLDOWN: 20,             // 翻滚冷却帧数
    SHADOW_STEP_DMG_BOOST: 1.5,    // 暗影步后伤害加成倍率
    SHADOW_STEP_BOOST_WINDOW: 60,  // 暗影步增伤窗口 (帧)

    // ── 移动 ──
    FRENZY_MOVE_SPEED_MULT: 1.15,  // 狂暴模式移速倍率 (×1.15)
    RAGE_ATTACK_SPEED_BONUS: 0.35, // 最大怒气时攻速加成 (15%)

    // ── 十字斩 (连击第1段) ──
    CROSS_RANGE: 150,              // 攻击范围 (像素)
    CROSS_WIDTH: 40,               // 十字宽度 (像素)
    CROSS_DAMAGE: 50,              // 伤害
    CROSS_DURATION: 24,            // 动画帧数
    CROSS_COOLDOWN: 14,            // 冷却帧数
    CROSS_LUNGE: 15,               // 突进距离 (像素)
    CROSS_CONE: Math.PI / 4,       // 判定锥形角度 (90°)

    // ── 月牙斩 (连击第2段) ──
    MOON_SPEED: 18,                // 弹道速度 (像素/帧)
    MOON_RANGE: 500,               // 最大飞行距离
    MOON_RADIUS: 160,              // 波纹半径
    MOON_DAMAGE: 55,               // 伤害
    MOON_DURATION: 29,             // 动画帧数
    MOON_COOLDOWN: 18,             // 冷却帧数
    MOON_LUNGE: 30,                // 突进距离 (像素)
    MOON_CONE: Math.PI / 2.5,      // 判定锥形角度 (~72°)

    // ── 地狱血砸 (连击第3段) ──
    SMASH_RADIUS: 180,             // AOE 半径
    SMASH_DAMAGE: 85,              // 伤害
    SMASH_DURATION: 40,            // 动画帧数
    SMASH_COOLDOWN: 22,            // 冷却帧数
    SMASH_OFFSET: 50,              // 砸击偏移 (从角色前方发出，像素)
    SMASH_TRIGGER: 0.3,            // 触发时机 (动画进度30%时释放判定)
    SMASH_LIFE: 15,                // 砸击持续帧数

    // ── 挥剑视觉 ──
    SWING_RANGE: 100,              // 剑身基础长度 (用于拖尾计算)
    SWORD_COLOR: '#cc0000',        // 剑身颜色

    // ── 拖尾特效 ──
    TRAIL_MAX_LENGTH: 25,          // 拖尾最大记录点数
    TRAIL_MAX_AGE: 12,             // 普通模式拖尾寿命 (帧)
    TRAIL_MAX_AGE_FRENZY: 18,      // 狂暴模式拖尾寿命 (帧)
    TRAIL_BASE_WIDTH: 15,          // 普通模式拖尾基础宽度
    TRAIL_BASE_WIDTH_FRENZY: 28,   // 狂暴模式拖尾基础宽度

    // ── 血怒狂暴 (E技能) ──
    FRENZY_DURATION: 650,          // 狂暴持续帧数 (~7.5秒)
    FRENZY_COOLDOWN: 1200,         // 冷却帧数 (~20秒)
    FRENZY_LIFESTEAL: 0.20,        // 吸血比例 (伤害的10%)
    FRENZY_SPEED_MULT: 2.5,          // 狂暴攻速倍率 (×2)
    FRENZY_RANGE_MULT: 1.3,        // 狂暴范围倍率 (×1.3)
    FRENZY_WAVE_SPEED: 6,          // 剑气波速度 (像素/帧)
    FRENZY_WAVE_DAMAGE: 30,        // 剑气波伤害
    FRENZY_WAVE_RANGE: 500,        // 剑气波最大距离

    // ── 怒气系统 ──
    RAGE_PER_KILL: 50,             // 击杀小怪获得怒气 (打Boss无效)
    RAGE_PER_HIT: 20,               // 每次攻击命中小怪获得怒气 (打Boss无效)
    RAGE_MAX: 2000,                // 怒气上限
    RAGE_MIN_ACTIVATE: 300,        // 激活狂暴最低怒气

    // ── 叠伤机制 ──
    ATK_STACK_PER_HIT: 0.03,       // 每层伤害加成 2%
    ATK_STACK_MAX: 10,              // 最多8层 (16%)
    ATK_STACK_DURATION: 300,       // 每层持续5秒 (300帧@60fps)

    // ── 狂暴专属连招 (狂暴模式下替换普通连招) ──
    // 血旋风 (连击第1段)
    F_WHIRLWIND_DAMAGE: 58,        // 每跳伤害 (45→58)
    F_WHIRLWIND_RADIUS: 230,       // AOE 半径 (190→230)
    F_WHIRLWIND_DURATION: 26,      // 动画帧数 (28→26)
    F_WHIRLWIND_LIFE: 25,          // 判定持续帧数 (20→25)

    // 千刃斩 (连击第2段)
    F_THOUSAND_DAMAGE: 10,         // 每帧伤害
    F_THOUSAND_COUNT: 5,           // 刀数 (帧伤模式下不宜过多)
    F_THOUSAND_ARC: 2.6,           // 扇形弧度 (~149°)
    F_THOUSAND_RANGE: 280,         // 扇形半径
    F_THOUSAND_DURATION: 26,       // 动画帧数
    F_THOUSAND_DELAY: 2,           // 每刀延迟帧数
    F_THOUSAND_LIFE: 16,           // 每刀判定持续帧数
    F_THOUSAND_CONE: 0.9,          // 每刀判定锥形角度
    F_THOUSAND_LUNGE: 45,          // 前冲距离

    // 炼狱重击 (连击第3段)
    F_INFERNO_DAMAGE: 155,         // 伤害 (120→155)
    F_INFERNO_RADIUS: 340,         // 地面 AOE 半径 (280→340)
    F_INFERNO_DURATION: 42,        // 动画帧数 (45→42)
    F_INFERNO_LIFE: 42,            // 判定持续帧数 (35→42)
    F_INFERNO_LUNGE: 65,           // 前冲距离 (50→65)
    F_INFERNO_CRACKS: 10,          // 地裂纹数量 (8→10)

    // ── 腥红处决 (右键终结技) ──
    EXEC_DAMAGE: 300,              // 单体伤害
    EXEC_ARC: 4.7,                 // 斩击弧度 (~270°)
    EXEC_RANGE: 250,               // 斩击半径
    EXEC_DURATION: 60,             // 总动画帧数 (~1秒)
    EXEC_KILL_INTENT_COST: 2,      // 每次消耗2层杀意
    EXEC_KILL_INTENT_MAX: 10,      // 杀意最高10层
    EXEC_DASH_SPEED: 30,           // 瞬移速度 (像素/帧)
    EXEC_LOCK_RANGE: 500,          // 锁定目标最大距离 (像素)
    EXEC_DASH_OFFSET: 60,          // 瞬移到目标身后偏移量 (像素)
    EXEC_AFTERIMAGE_STEPS: 6,      // 残影数量
    EXEC_AFTERIMAGE_DECAY: 0.88,   // 残影淡出速率 (每帧×0.88)
    EXEC_KNOCKBACK: 25,            // 处决击退距离 (像素)
    EXEC_SIGIL_SIZE: 80,           // 锁定标记初始大小 (像素)

    // ── 终极处决 (杀意满10后长按右键3s) ──
    ULTIMATE_CHARGE_TIME: 180,     // 长按蓄力帧数 (3秒@60fps)
    ULTIMATE_DAMAGE: 450,          // 每个目标伤害
    ULTIMATE_DASH_SPEED: 80,       // 追击速度 (大幅提升速度，只留残影束)
    ULTIMATE_HITSTOP_FRAMES: 5,    // 每次命中目标时的定格帧数 (Hit-stop)
    ULTIMATE_VANISH_FRAMES: 15,    // 蓄满后原地的消失/音爆闪烁延迟
    ULTIMATE_ZANSHIN_FRAMES: 30,   // 收刀延迟(残心)，之后引爆全屏伤害

    // ── 居合斩 (Q技能 — 蓄力拔刀斩) ──
    CHARGE_COOLDOWN: 300,          // Q技能冷却帧数 (~5秒)
    CHARGE_TIER1_FRAMES: 30,       // 一阶蓄力所需帧数 (~0.5秒)
    CHARGE_TIER2_FRAMES: 72,       // 二阶蓄力所需帧数 (~1.2秒)
    CHARGE_TIER3_FRAMES: 120,      // 三阶(满蓄)所需帧数 (~2.0秒)
    CHARGE_MOVE_MULT: 0.3,         // 蓄力时移速倍率
    CHARGE_TIER1_DAMAGE: 80,       // 一阶伤害
    CHARGE_TIER2_DAMAGE: 160,      // 二阶伤害
    CHARGE_TIER3_DAMAGE: 350,      // 三阶(满蓄)伤害
    CHARGE_SLASH_WIDTH: 80,        // 斩击线宽度 (像素)
    CHARGE_SLASH_LENGTH: 2000,     // 斩击贯穿距离 (像素)
    CHARGE_HITSTOP: 12,            // 释放时顿帧 (帧)
    CHARGE_AFTERMATH_DELAY: 30,    // 延迟爆发帧数 (~0.5秒)
    CHARGE_RING_RADIUS: 60,        // 脚下聚气圆环初始半径

    // ── 接触伤害 ──
    CONTACT_DAMAGE: 6,             // 友方单位近身伤害 (每次)
    CONTACT_COOLDOWN: 30,          // 接触伤害冷却帧数
  },

  // ========================
  //  武器属性
  // ========================
  WEAPONS: {
    PISTOL: {
      NAME: 'PULSE PISTOL',
      FIRE_RATE: 20,
      BULLET_SPEED: 5,
      DAMAGE: 14,
      BULLET_COUNT: 1,
      SPREAD: 0,
      RANGE: 500,
      BULLET_RADIUS: 3,
      COLOR: '#44ddff',
      // Ramping fire (倾泻火力)
      RAMP_START_RATE: 20,       // initial fire rate (frames between shots)
      RAMP_MIN_RATE: 3,          // fastest possible fire rate (at max heat)
      RAMP_SPEED: 0.09,           // fire rate reduction per shot (~35s to full heat)
      RAMP_COOLDOWN: 0.8,          // fire rate recovery per frame when NOT firing
      RAMP_MAX_SPREAD: 0.12,     // random spread at max heat
      OVERHEAT_THRESHOLD: 0.6,   // fraction of heat for overheat VFX (0-1)
    },
    SHOTGUN: {
      NAME: 'SHOTGUN',
      FIRE_RATE: 80,
      BULLET_SPEED: 8,
      DAMAGE: 25,
      BULLET_COUNT: 18,
      SPREAD: 0.05,
      RANGE: 180,
      BULLET_RADIUS: 3,
      COLOR: '#ffaa44',
      KNOCKBACK: 12,
    },
    PLASMA: {
      NAME: '轨道炮',
      FIRE_RATE: 3,
      DAMAGE_MIN: 30,        // minimum damage (tap shot)
      DAMAGE_MAX: 600,       // maximum damage (full 8s charge)
      RANGE: 2000,
      BEAM_ANGLE_THRESHOLD: 0.15,
      COLOR: '#88ff44',
      MAX_CHARGE_FRAMES: 480, // 8 seconds at 60fps
      WIDTH_MIN: 4,           // beam width at min charge
      WIDTH_MAX: 60,          // beam width at max charge
      LINGER_DURATION: 45,    // how many frames the fired beam lingers
      CHARGE_SLOW_FACTOR: 0.6, // movement slow while charging
      // Overdrive (超载) — beyond 100% charge
      OVERDRIVE_THRESHOLD: 480,    // frames at which overdrive begins (= MAX_CHARGE_FRAMES)
      OVERDRIVE_MAX_FRAMES: 960,   // absolute max charge (16s total)
      OVERDRIVE_DAMAGE: 2000,       // overdrive max damage
      OVERDRIVE_WIDTH: 140,        // overdrive beam max width
      OVERDRIVE_LINGER: 75,        // overdrive beam linger frames
      OVERDRIVE_RECOIL: 180,       // recoil pushback distance (px)
      OVERDRIVE_HITSTOP: 12,       // hitstop on overdrive release
      OVERDRIVE_SLOW: 0.15,        // movement slow during overdrive charge (85% reduction)
      // Rift (次元裂隙)
      RIFT_DURATION: 180,          // rift lasts 3s at 60fps
      RIFT_DAMAGE_PER_FRAME: 3,   // damage per frame to enemies in rift
      RIFT_WIDTH: 30,              // rift hit width (px)
    },
  },

  // ========================
  //  黑洞手雷 (Q技能)
  // ========================
  BLACK_HOLE: {
    THROW_DISTANCE: 150,
    DURATION: 480,
    PULL_RADIUS: 300,
    PULL_FORCE: 3.0,
    DAMAGE_PER_FRAME: 1.5,
    MISSILE_PULL_FORCE: 1.0,
    ABSORB_BULLETS: true,
    BULLET_PULL_FORCE: 2.0,
    BULLET_DESTROY_RADIUS: 0.3,
  },

  // ========================
  //  魅惑蛋 (E技能)
  // ========================
  CHARM_EGG: {
    SPEED: 6,
    RADIUS: 8,
    LIFETIME: 120,
    CHARM_DURATION: 4600,  // ~60 seconds at 60fps
    COLOR: '#cc44ff',
  },

  // ========================
  //  敌人属性
  // ========================
  ENEMIES: {
    GRUNT: {
      RADIUS: 14, BASE_HP: 25, HP_PER_WAVE: 4, SPEED: 0.7,
      CONTACT_DAMAGE: 6, COLOR: '#ff4466', SCORE: 1,
    },
    FAST: {
      RADIUS: 10, BASE_HP: 12, HP_PER_WAVE: 2, SPEED: 1.5,
      CONTACT_DAMAGE: 6, COLOR: '#44ff88', SCORE: 2,
    },
    TANK: {
      RADIUS: 22, BASE_HP: 70, HP_PER_WAVE: 8, SPEED: 0.35,
      CONTACT_DAMAGE: 12, COLOR: '#ff8844', SCORE: 3,
    },
    SHOOTER: {
      RADIUS: 13, BASE_HP: 20, HP_PER_WAVE: 3, SPEED: 0.6,
      CONTACT_DAMAGE: 6, SHOOT_RANGE: 450, BULLET_SPEED: 2.5,
      BULLET_DAMAGE: 6, BULLET_LIFETIME: 110, BULLET_RADIUS: 4,
      BULLET_COLOR: '#aa44ff', BASE_SHOOT_CD: 150, BASE_SHOOT_RATE: 120,
      RATE_REDUCTION_PER_WAVE: 3, COLOR: '#aa44ff', SCORE: 2,
    },
    SPAWN: {
      BASE_RATE: 100, MIN_RATE: 40, RATE_REDUCTION_PER_WAVE: 3,
      BASE_MAX_COUNT: 3, MAX_COUNT_PER_WAVE: 1,
    },
    HP_DROP_CHANCE: 0.15,
    HP_DROP_AMOUNT: 15,
    HP_DROP_LIFETIME: 720,
    WEIGHTS_EARLY: [0.7, 0.3, 0, 0],
    WEIGHTS_MID: [0.35, 0.3, 0.2, 0.15],
    WEIGHTS_LATE: [0.2, 0.25, 0.25, 0.3],
  },

  // ========================
  //  BOSS: 毁灭者-K
  // ========================
  BOSS: {
    RADIUS: 50, BASE_HP: 1680, HP_PER_WAVE: 50,
    COLOR: '#ff2244', KILL_SCORE: 10,
    CONTACT_DAMAGE: 10, CONTACT_KNOCKBACK: 25,
    SPAWN_EVERY_N_WAVES: 5,
    PHASE1: {
      SPEED: 0.3, ARMOR_PLATES: 4, ARMOR_ROTATION_SPEED: 0.015,
      PATTERN_SWITCH_INTERVAL: 600, // 10 seconds at 60fps
      // Pattern A: Spiral
      SPIRAL_FIRE_INTERVAL: 14, SPIRAL_BULLET_COUNT: 2,
      SPIRAL_BULLET_SPEED: 1.3, SPIRAL_BULLET_DAMAGE: 8,
      SPIRAL_BULLET_LIFETIME: 600, SPIRAL_ANGLE_INCREMENT: 0.3,
      // Pattern B: Aimed Burst (shotgun fan toward target)
      BURST_FIRE_INTERVAL: 100, BURST_BULLET_COUNT: 5,
      BURST_BULLET_SPEED: 2.5, BURST_BULLET_DAMAGE: 10,
      BURST_BULLET_LIFETIME: 500, BURST_SPREAD: 0.15,
      // Pattern C: Expanding Ring
      RING_FIRE_INTERVAL: 150, RING_BULLET_COUNT: 10,
      RING_BULLET_SPEED: 1.0, RING_BULLET_DAMAGE: 7,
      RING_BULLET_LIFETIME: 600,
      // Missiles (always active)
      MISSILE_INTERVAL: 280, MISSILE_COUNT: 3, MISSILE_DELAY: 400,
      MISSILE_SPEED_BASE: 1.2, MISSILE_SPEED_INCREMENT: 0.3,
      MISSILE_LIFETIME: 240, MISSILE_HP: 8, MISSILE_DAMAGE: 15,
      MISSILE_HOMING_FACTOR: 0.03, MISSILE_RADIUS: 6,
    },
    PHASE2: {
      SPEED: 0.6,
      SPIRAL_FIRE_INTERVAL: 12, SPIRAL_BULLET_COUNT: 2,
      SPIRAL_BULLET_SPEED: 1.5, SPIRAL_BULLET_DAMAGE: 10,
      SPIRAL_BULLET_LIFETIME: 500, SPIRAL_ANGLE_INCREMENT: 0.25,
      CHARGE_INTERVAL: 300, CHARGE_OFFSET: 150,
      CHARGE_WARN_DURATION: 180, CHARGE_SPEED: 8,
      CHARGE_DAMAGE: 25, CHARGE_TRAIL_LIFETIME: 30,
      CHARGE_RECOVERY: 60, CHARGE_COOLDOWN: 300,
      CHARGE_SHOCKWAVE_RADIUS: 200, CHARGE_SHOCKWAVE_DAMAGE: 12, CHARGE_SHOCKWAVE_KNOCKBACK: 15,
      BEAM_INTERVAL: 400, BEAM_WARN_DURATION: 200,
      BEAM_SWEEP_SPEED: 0.008, BEAM_SWEEP_ANGLE: Math.PI * 0.5,
      BEAM_HIT_ANGLE: 0.08, BEAM_HIT_RANGE: 600,
      BEAM_DAMAGE_PER_FRAME: 4,
    },
  },

  // ========================
  //  BOSS2: 幻影织网者
  // ========================
  BOSS2: {
    RADIUS: 30, BASE_HP: 1800, HP_PER_WAVE: 40,
    COLOR: '#00ffcc', KILL_SCORE: 12,
    CONTACT_DAMAGE: 18, CONTACT_KNOCKBACK: 20,
    PHASE2_THRESHOLD: 0.55,   // 55% HP进入二阶段
    ENRAGE_THRESHOLD: 0.20,   // 20% HP狂化

    // ── 蛛网地形 ──
    WEB_ZONE_RADIUS: 70,       // 蛛网陷阱半径
    WEB_ZONE_DURATION: 300,    // 蛛网持续帧(5秒)
    WEB_ZONE_SLOW: 0.50,       // 减速比例(×0.50移速)
    WEB_ZONE_HP: 3,            // 被子弹击中几次后消除

    // ── 相位无敌 ──
    PHASE_INTERVAL: 300,       // 每5秒进入一次虚空态
    PHASE_DURATION: 100,       // 虚空态持续1.7秒
    PHASE_EXPOSE_WINDOW: 35,   // 出来后暴露窗口帧数
    PHASE_DMG_MULT: 3.0,       // 暴露窗口伤害倍率

    // ── 蛛丝牵引 ──
    TETHER_INTERVAL: 300,      // 每5秒释放一次
    TETHER_SPEED: 7,           // 蛛丝弹速
    TETHER_DURATION: 90,       // 牵引持续帧(1.5秒)
    TETHER_PULL_FORCE: 2.2,    // 每帧拉力(px)
    TETHER_DAMAGE: 5,          // 每帧持续伤害
    TETHER_LIFETIME: 120,      // 蛛丝弹生命帧

    // ── 蛛网囚笼 ──
    CAGE_INTERVAL: 1680,       // 冷却28秒
    CAGE_BULLET_SPEED: 5,      // 囚笼弹速
    CAGE_BULLET_RADIUS: 18,    // 囚笼弹半径
    CAGE_BULLET_LIFETIME: 180, // 囚笼弹生命帧
    CAGE_RADIUS: 120,          // 囚笼半径
    CAGE_WALL_COUNT: 10,       // 墙壁节点数
    CAGE_WALL_HP: 800,         // 每块墙壁血量
    CAGE_DURATION: 1080,       // 囚笼持续帧(18秒)
    CAGE_WALL_RADIUS: 16,      // 墙壁节点碰撞半径

    // ── 蛛网喷射 (狂化专属) ──
    WEB_SPRAY_INTERVAL: 150,   // 每2.5秒喷射一次
    WEB_SPRAY_COUNT: 7,        // 扇形线数
    WEB_SPRAY_ARC: 1.4,        // 扇形弧度(~80°)
    WEB_SPRAY_SPEED: 6,        // 弹速
    WEB_SPRAY_LIFETIME: 180,   // 弹丸生命帧
    WEB_SPRAY_DAMAGE: 8,       // 命中伤害
    WEB_SPRAY_SNARE: 60,       // 基础禁锢帧数(1s)
    WEB_SPRAY_SNARE_STACK: 0.15, // 多重命中禁锢增幅

    // ── 狂化蛛后 ──
    ENRAGE_SPEED: 3.5,
    ENRAGE_WEB_INTERVAL: 90,   // 每1.5秒在玩家脚下布蛛网
    ENRAGE_CLONE_COUNT: 4,
    ENRAGE_CLONE_SPEED: 2.5,
    ENRAGE_CLONE_HP: 80,

    PHASE1: {
      SPEED: 1.4,
      TELEPORT_INTERVAL: 180, TELEPORT_WARN_DURATION: 35,
      TELEPORT_MIN_DIST: 150, TELEPORT_MAX_DIST: 300,
      WEB_FIRE_INTERVAL: 160, WEB_RING_COUNT: 7, WEB_RING_SPEED: 3.5,
      WEB_RING_DAMAGE: 18, WEB_RING_LIFETIME: 500,
      WEB_CROSS_COUNT: 3, WEB_CROSS_SPEED: 5,
      WEB_CROSS_DAMAGE: 22, WEB_CROSS_LIFETIME: 500,
      CLONE_INTERVAL: 200, CLONE_COUNT: 1, CLONE_HP: 100,
      CLONE_SPEED: 1.6, CLONE_DURATION: 420,
    },
    PHASE2: {
      SPEED: 2.2,
      TELEPORT_INTERVAL: 90, TELEPORT_WARN_DURATION: 20,
      TELEPORT_MIN_DIST: 120, TELEPORT_MAX_DIST: 250,
      MINE_INTERVAL: 160, MINE_COUNT: 6, MINE_RADIUS: 32,
      MINE_DAMAGE: 40, MINE_LIFETIME: 480, MINE_ARM_DELAY: 45,
      DASH_INTERVAL: 180, DASH_COUNT: 3, DASH_SPEED: 14,
      DASH_WARN_DURATION: 25, DASH_DAMAGE: 35, DASH_GAP: 30,
      WEB_FIRE_INTERVAL: 110, WEB_RING_COUNT: 9, WEB_RING_SPEED: 4,
      WEB_RING_DAMAGE: 20, WEB_RING_LIFETIME: 500,
      WEB_CROSS_COUNT: 5, WEB_CROSS_SPEED: 5.5,
      WEB_CROSS_DAMAGE: 26, WEB_CROSS_LIFETIME: 500,
    },
  },

  // ========================
  //  BOSS3: 星核守卫
  // ========================
  BOSS3: {
    RADIUS: 40, BASE_HP: 1960, HP_PER_WAVE: 55,
    COLOR: '#FFD700', KILL_SCORE: 15,
    CONTACT_DAMAGE: 10, CONTACT_KNOCKBACK: 22,
    PHASE1: {
      SPEED: 0.4,
      SHIELD_COUNT: 3, SHIELD_RADIUS: 14, SHIELD_ORBIT_RADIUS: 65,
      SHIELD_ROTATION_SPEED: 0.02, SHIELD_HP: 25,
      PULSE_INTERVAL: 300, PULSE_BULLET_COUNT: 8,
      PULSE_BULLET_SPEED: 1.8, PULSE_BULLET_DAMAGE: 9,
      PULSE_BULLET_LIFETIME: 500,
      BOLT_INTERVAL: 200, BOLT_COUNT: 2, BOLT_SPEED: 1.5,
      BOLT_HOMING: 0.03, BOLT_DAMAGE: 14, BOLT_LIFETIME: 200, BOLT_RADIUS: 5,
    },
    PHASE2: {
      SPEED: 0.6,
      SHIELD_COUNT: 5, SHIELD_HP: 20,
      SHIELD_EXPLODE_BULLET_COUNT: 6, SHIELD_EXPLODE_BULLET_SPEED: 3,
      SHIELD_EXPLODE_DAMAGE: 10, SHIELD_EXPLODE_LIFETIME: 80,
      GRAVITY_INTERVAL: 300, GRAVITY_DURATION: 150, GRAVITY_STRENGTH: 1.0,
      STARBURST_INTERVAL: 300, STARBURST_RINGS: 2, STARBURST_BULLETS_PER_RING: 8,
      STARBURST_SPEED_BASE: 1.5, STARBURST_SPEED_INCREMENT: 0.8,
      STARBURST_DAMAGE: 10, STARBURST_LIFETIME: 500,
      PULSE_INTERVAL: 240, PULSE_BULLET_COUNT: 10,
      PULSE_BULLET_SPEED: 2.2, PULSE_BULLET_DAMAGE: 10,
      PULSE_BULLET_LIFETIME: 500,
      BOLT_INTERVAL: 150, BOLT_COUNT: 2, BOLT_SPEED: 1.8,
      BOLT_HOMING: 0.035, BOLT_DAMAGE: 16, BOLT_LIFETIME: 200, BOLT_RADIUS: 5,
    },
  },

  // ========================
  //  BOSS4: 零号协议·霓虹神明 (Protocol OMEGA)
  // ========================
  BOSS4: {
    RADIUS: 55,          // 碰撞半径
    BASE_HP: 20000,       // 基础血量 (+40%)
    HP_PER_WAVE: 80,     // 每波增加血量
    COLOR: '#00ffff',    // 颜色
    KILL_SCORE: 25,      // 击杀得分
    CONTACT_DAMAGE: 15,  // 接触伤害
    CONTACT_KNOCKBACK: 30, // 接触击退
    ENTRANCE_DURATION: 180, // 入场动画时长（帧）

    // 一阶段: 防火墙压制 (100%-60% 血量)
    PHASE1: {
      SPEED: 0.6,                  // 移动速度
      // 矩阵弹幕
      MATRIX_INTERVAL: 120,       // 弹幕发射间隔（帧）
      MATRIX_ROWS: 6,             // 弹幕行数
      MATRIX_COLS: 10,            // 弹幕列数
      MATRIX_BULLET_SPEED: 2.5,   // 子弹速度
      MATRIX_BULLET_DAMAGE: 7,    // 子弹伤害
      MATRIX_BULLET_LIFETIME: 180,// 子弹存在时间
      MATRIX_GAP_SIZE: 2,         // 安全缝隙宽度
      // 数据切割（十字激光）
      SLICE_INTERVAL: 300,        // 激光发射间隔（现改为随机4-8秒）
      SLICE_WARN_DURATION: 150,   // 前摇预警时间（帧）≈2.5秒
      SLICE_DAMAGE_PER_FRAME: 2,  // 每帧伤害
      SLICE_THICKNESS: 35,        // 激光宽度
      SLICE_DURATION: 100,        // 激光持续时间（帧）
    },

    // 二阶段: 硬件熔毁 (60%-25% 血量)
    PHASE2: {
      SPEED: 1.0,                  // 移动速度
      // 转阶段冲击波
      SHOCKWAVE_RADIUS: 450,      // 冲击波半径
      SHOCKWAVE_KNOCKBACK: 18,    // 冲击波击退力
      // 轨道打击（从天而降的AOE）
      STRIKE_INTERVAL: 180,       // 打击间隔（帧）
      STRIKE_COUNT: 5,            // 同时打击数量
      STRIKE_WARN_DURATION: 90,   // 预警圈持续时间
      STRIKE_RADIUS: 55,          // 打击半径
      STRIKE_DAMAGE: 20,          // 打击伤害
      STRIKE_FIRE_LIFETIME: 240,  // 火焰区域持续时间
      STRIKE_FIRE_DAMAGE: 2,      // 火焰区域每帧伤害
      // 全息冲刺（连续冲撞）
      DASH_INTERVAL: 360,         // 冲刺技能CD（帧）≈6秒
      DASH_SPEED: 7,              // 冲刺速度
      DASH_DAMAGE: 15,            // 冲刺伤害
      DASH_WARN_DURATION: 140,    // 每次冲刺前摇（帧）≈2.3秒
      DASH_COUNT: 2,              // 连续冲刺次数
      DASH_GAP: 60,               // 两次冲刺间休息（帧）
      // 增强矩阵弹幕
      MATRIX_INTERVAL: 100,       // 弹幕间隔
      MATRIX_ROWS: 7,             // 弹幕行数
      MATRIX_COLS: 12,            // 弹幕列数
      MATRIX_BULLET_SPEED: 3,     // 子弹速度
      MATRIX_BULLET_DAMAGE: 9,    // 子弹伤害
      MATRIX_BULLET_LIFETIME: 150,// 子弹存在时间
      MATRIX_GAP_SIZE: 2,         // 安全缝隙宽度
    },

    // 三阶段: 终末狂怒 (25%-0% 血量)
    PHASE3: {
      SPEED: 1.2,                  // 移动速度（大幅提升）
      // 死亡光束（双向旋转激光）
      BEAM_DURATION: 360,          // 光束持续时间（帧）加长
      BEAM_SWEEP_SPEED: 0.025,    // 光束旋转速度（更快）
      BEAM_DAMAGE_PER_FRAME: 7,   // 每帧伤害（提升）
      BEAM_HIT_ANGLE: 0.15,       // 命中判定角度（更宽）
      BEAM_HIT_RANGE: 900,        // 光束射程
      BEAM_INTERVAL: 240,         // 光束发射间隔（帧）更频繁
      // 故障炸弹（爆炸后散射子弹环）
      BOMB_INTERVAL: 35,          // 炸弹生成间隔（帧）更频繁
      BOMB_SPEED: 4.5,            // 炸弹飞行速度（更快）
      BOMB_DAMAGE: 15,            // 炸弹直接伤害（提升）
      BOMB_LIFETIME: 65,          // 炸弹飞行时间
      BOMB_EXPLODE_RADIUS: 110,   // 爆炸半径（更大）
      BOMB_RING_COUNT: 16,        // 爆炸散射子弹数（更多）
      BOMB_RING_SPEED: 4,         // 散射子弹速度（更快）
      BOMB_RING_DAMAGE: 8,        // 散射子弹伤害（提升）
      BOMB_RING_LIFETIME: 90,     // 散射子弹存在时间
      // 屏幕特效
      GLITCH_INTENSITY: 1.5,      // 故障特效强度（更强）
      // 幽灵召唤
      GHOST_INTERVAL: 400,        // 召唤间隔（帧）≈6.7秒（更频繁）
      GHOST_HP: 100,              // 幽灵血量（更肉）
      GHOST_SPEED: 2.5,           // 幽灵追踪速度（更快）
      GHOST_DAMAGE: 10,           // 幽灵接触伤害（提升）
      GHOST_RADIUS: 30,           // 幽灵碰撞半径
      GHOST_MAX: 4,               // 最大同时存在数量（更多）
      // 错乱神经束 (Glitch Threads)
      THREAD_INTERVAL: 600,       // 技能冷却（帧）=10秒
      THREAD_BURST_COUNT: 20,     // 总共射出的激光束数量
      THREAD_SPAWN_RATE: 6,       // 每隔多少帧射出一道（越小越密集）
      THREAD_WARN_TIME: 18,       // 每道光束的红线警告时间（帧）
      THREAD_BURST_TIME: 8,       // 每道光束爆发持续时间（帧）
      THREAD_DAMAGE: 12,          // 每道光束爆发命中伤害
      THREAD_THICKNESS: 14,       // 光束粗细（像素）
      THREAD_LENGTH: 900,         // 光束射程
    },

    // ── 过热机制 (Overheat) ──
    // Boss 释放大招累积 Heat,满了强制进入散热状态 — 玩家的反击窗口
    // 节奏: normal → (heat=100) → overheating(前摇 60f) → venting(散热 180f, 受伤x2) → normal
    OVERHEAT: {
      MAX_HEAT: 100,
      DECAY_PER_SEC: 5,             // 自然衰减,单位 heat/秒
      OVERHEATING_DURATION: 60,     // 过热前摇,1秒 — 视觉警告
      VENTING_DURATION: 180,        // 散热脆弱期,3秒 — 玩家 DPS 窗口
      VENT_DMG_MULTIPLIER: 2.0,     // 散热时玩家伤害倍率
      // Heat 增量表 — 每个技能启动时累积一次
      HEAT_BEAM: 25,                // 死亡光束
      HEAT_SLICE: 18,               // 数据切割
      HEAT_SHOCKWAVE: 20,           // 转阶段冲击波
      HEAT_DASH: 15,                // 全息冲刺 (整组一次)
      HEAT_THREAD: 20,              // 神经束爆发
      HEAT_BOMB_EXPLODE: 3,         // 每次炸弹爆炸
      HEAT_STRIKE: 2,               // 每次轨道打击落下
      // 阶段解锁 — Phase 1 不启用 (给新手喘息),Phase 2+ 启用
      ENABLED_FROM_PHASE: 2,
    },

    // 故障核心击破机制 (Glitch Cores)
    GLITCH_CORE: {
      // 触发条件 — 仅在 phase 2 和 3 生效
      SPAWN_INTERVAL_P2: 3600,       // 二阶段核心召唤间隔（帧）=60秒
      SPAWN_INTERVAL_P3: 3600,       // 三阶段核心召唤间隔（帧）=60秒
      CORE_COUNT_P2: 3,             // 二阶段核心数量
      CORE_COUNT_P3: 4,             // 三阶段核心数量
      CORE_HP: 200,                 // 每个核心的血量
      CORE_RADIUS: 22,              // 核心碰撞半径
      CHANNEL_DURATION: 480,        // 引导时间（帧）=8秒，玩家必须在此期间击破所有核心
      // 成功击破所有核心 → 数据反噬
      BACKLASH_DAMAGE: 2000,        // 击破全部核心时 Boss 受到的真实伤害
      STUN_DURATION: 240,           // Boss 瘫痪时间（帧）=4秒
      DAMAGE_MULTIPLIER: 2.0,       // 瘫痪期间玩家伤害倍率
      // 玩家未能击破核心 → 全屏惩罚
      PUNISHMENT_DAMAGE: 200,        // 全屏打击伤害
      PUNISHMENT_SHAKE: 25,         // 惩罚震屏强度
    },
  },

  // ========================
  //  通用战斗参数
  // ========================
  COMBAT: {
    KNOCKBACK_ON_HIT: 2,
    PLAYER_KNOCKBACK_ON_HIT: 18,
    HITSTOP_ON_KILL: 2,
    HITSTOP_ON_BOSS_KILL: 12,
    SCREEN_SHAKE_ON_HIT: 3,
    SCREEN_SHAKE_ON_SHOOT: 1.5,
    SCREEN_SHAKE_SHOTGUN: 4,
  },

  // ========================
  // ========================
  //  Boss 5: 黑化狂战士 (Dark Berserker — 堕落幽影)
  // ========================
  BOSS5: {
    BASE_HP: 18000,
    RADIUS: 22,
    BASE_SPEED: 2.5,

    // 阶段血量阈值
    PHASE2_THRESHOLD: 0.6,     // 60% 进入二阶段
    PHASE3_THRESHOLD: 0.25,    // 25% 进入三阶段

    // ── AI 行为 ──
    CHASE_RANGE: 600,           // 开始追击距离
    MELEE_RANGE: 120,           // 近战攻击距离
    DODGE_CHANCE: 0.15,         // 被击中时闪避概率
    DODGE_COOLDOWN: 90,         // 闪避冷却帧

    // ── 暗影步 (Shadow Step) ──
    ROLL_DURATION: 20,
    ROLL_SPEED: 10,
    ROLL_COOLDOWN: 360,          // 闪避冷却6秒

    // ── 普通三段连招 (大幅增加前摇, 大幅降低攻速) ──
    // 十字斩
    CROSS_RANGE: 160,
    CROSS_WIDTH: 45,
    CROSS_DAMAGE: 18,
    CROSS_DURATION: 100,        // 挥刀速度大幅减慢
    CROSS_COOLDOWN: 80,         // 攻速再次降低
    CROSS_LUNGE: 8,             // 突进距离同步减小
    // 月牙斩
    MOON_SPEED: 10,             // 投射速度同步减慢
    MOON_RANGE: 450,
    MOON_RADIUS: 160,
    MOON_DAMAGE: 20,
    MOON_DURATION: 120,         // 挥刀速度大幅减慢
    MOON_COOLDOWN: 100,         // 攻速再次降低
    MOON_LUNGE: 15,             // 突进距离同步减小
    // 地狱血砸
    SMASH_RADIUS: 200,
    SMASH_DAMAGE: 30,
    SMASH_DURATION: 160,        // 挥刀速度大幅减慢
    SMASH_COOLDOWN: 120,        // 攻速再次降低
    SMASH_OFFSET: 25,           // 突进距离同步减小

    // ── 血怒狂暴 ──
    FRENZY_DURATION: 600,       // 10秒（Boss 版更长）
    FRENZY_COOLDOWN: 900,       // 15秒冷却
    FRENZY_SPEED_MULT: 1.6,
    FRENZY_WAVE_SPEED: 6,
    FRENZY_WAVE_DAMAGE: 8,
    FRENZY_WAVE_RANGE: 450,

    // ── 狂暴连招 ──
    // 血旋风
    F_WHIRLWIND_DAMAGE: 15,
    F_WHIRLWIND_RADIUS: 200,
    F_WHIRLWIND_DURATION: 70,
    F_WHIRLWIND_LIFE: 28,
    // 千刃斩
    F_THOUSAND_DAMAGE: 10,
    F_THOUSAND_COUNT: 5,
    F_THOUSAND_ARC: 2.1,
    F_THOUSAND_RANGE: 220,
    F_THOUSAND_DURATION: 75,
    F_THOUSAND_DELAY: 3,
    F_THOUSAND_LIFE: 13,        // 10×5×13=650
    F_THOUSAND_LUNGE: 12,
    // 炼狱重击
    F_INFERNO_DAMAGE: 35,
    F_INFERNO_RADIUS: 300,
    F_INFERNO_DURATION: 90,
    F_INFERNO_LIFE: 45,
    F_INFERNO_LUNGE: 25,

    // ── 居合斩 (三阶段专属) ──
    CHARGE_INTERVAL: 240,       // 居合斩释放间隔（4秒）
    CHARGE_TIME: 120,           // 蓄力时间（2秒）
    CHARGE_DAMAGE: 150,         // 居合伤害
    CHARGE_SLASH_WIDTH: 90,
    CHARGE_SLASH_LENGTH: 2000,
    CHARGE_HITSTOP: 12,

    // ── 腥红处决 (三阶段专属) ──
    EXEC_INTERVAL: 300,         // 处决释放间隔（5秒）
    EXEC_DAMAGE: 80,
    EXEC_ARC: 4.7,
    EXEC_RANGE: 270,
    EXEC_DURATION: 70,          // 60 * 1.17 ≈ 70
    EXEC_DASH_SPEED: 25,
    EXEC_LOCK_RANGE: 500,

    // ── AI 决策系统 ──
    DECISION_INTERVAL: 18,           // AI 决策间隔帧数
    OBSERVE_TIME: 30,                // 观察行为持续帧数
    PRESSURE_TIME: 36,               // 施压行为持续帧数
    RESET_TIME: 24,                  // 重置行为持续帧数
    STALK_TIME: 54,                  // 对峙巡游帧数
    STALK_BAND_LOW: 1.15,            // 对峙距离下限 (* MELEE_RANGE)
    STALK_BAND_HIGH: 2.1,            // 对峙距离上限 (* MELEE_RANGE)
    STALK_FLIP_CHANCE: 0.32,         // 连续 stalk 翻向概率
    INTENT_LOCK_FRAMES: 24,          // 意图锁定帧数
    TARGET_MEMORY_FRAMES: 90,        // 目标行为记忆帧数
    CHARGE_PREDICT_TIME: 18,         // 位置预测基础帧数
    PREDICTION_CLAMP: 22,            // 预测最大帧数
    CORNER_MARGIN: 60,               // 角落判定边距
    CORNER_PRESSURE_BONUS: 12,       // 角落施压评分加成
    STRAFE_BIAS: 0.38,               // 横移偏好系数
    ROLL_PUNISH_WINDOW: 24,          // 翻滚惩罚窗口帧数
    EXEC_PUNISH_WINDOW: 18,          // 攻击后惩罚窗口帧数
    REPEAT_ACTION_PENALTY: 6,        // 重复动作惩罚分
    FEINT_CHANCE: 0.15,              // 佯攻概率
    AGGRESSION_PHASE_BONUS: [0, 8, 18], // 各阶段攻击评分加成
    MISSED_ATTACK_RESET_THRESHOLD: 2,   // 连续未命中时触发重置

    // ── AI 子弹闪避 ──
    DODGE_RADIUS: 110,               // 子弹CPA距离阈值(px)
    DODGE_LOOKAHEAD: 55,             // 威胁前瞻帧数
    DODGE_THREAT_THRESHOLD: 0.20,    // 触发侧移闪避的威胁分
    DODGE_WEIGHT: 0.75,              // 闪避力度因子
    DODGE_STRAFE_SPEED: 1.2,         // 侧移闪避速度倍率
    SHADOW_STEP_THREAT: 0.58,        // 触发shadowStep的威胁分
    PLASMA_CHARGE_THRESHOLD: 18,     // 玩家等离子蓄能被视为“正在蓄力”的阈值

    // ── 战术状态机 ──
    // pressure: 默认压制姿态（评分按原样应用）
    // commit:   锁定攻击序列（仅防御性打断可介入）
    // recover:  攻击后的防守窗口（攻击评分降权、防御评分升权）
    // reposition: 移动到更好位置（移动评分升权、攻击评分降权）
    RECOVER_DURATION: 24,            // 攻击后 recover 状态持续帧数
    COMMIT_TAIL_FRAMES: 8,           // commit 状态在动作时长基础上追加的锁定帧数

    // ── 评分权重表（按动作分组；缺省时 JS 侧有兜底默认值） ──
    // 调整这些数字可直接改变 boss 的战斗倾向；不同档位可预设多套
    SCORES: {
      observe:     { base: 8,  phase1: 12, lateGame: 3,  inPressure: 6,  outPressure: -8,  aggroMult: 10,  cornered: -6, tooFar: -8 },
      // stalk = 中距离对峙巡游 (魂游 boss 读招窗口)
      //   inBand: 距离落在 STALK_BAND_LOW..HIGH 时加分
      //   afterAttack: 攻击刚结束的窗口特别倾向对峙
      //   recoverBoost: 战术状态为 recover 时进一步加分
      //   lowHp / enraged / cornered: 不该对峙的场景降权
      stalk:       { base: 3,  inBand: 22, outBand: -18, afterAttack: 14, recoverBoost: 16, phase1: 6, phase2Plus: 10, aggroMult: -6, lowHp: -14, enraged: -10, selfCorner: -12, targetCorner: -6, bulletThreat: -14 },
      strafe:      { base: 4,  inPressure: 12, outPressure: -10, mobMult: 10, aggroMult: 0.45, selfCorner: -10, tooFar: -14 },
      approach:    { base: 6,  outRange: 22, inRange: 4,  beyondChase: 14, aggroMult: 0.55, charging: -6, veryFar: 10, bulletThreat: -12 },
      baitRoll:    { phase2: 10, phase1: -4, earlyRoller: 18, inPressure: 8, outPressure: -14, feintMult: 10, inMelee: -4, tooFar: -12 },
      punish:      { justRolled: 24, recentAttack: 14, recentCharge: 16, inRange: 14, outRange: -10, aggroMult: 0.65 },
      reset:       { selfCorner: 18, missed: 22, highPressure: 10, targetCorner: -8, enraged: 6 },
      dodge:       { high: 28, low: -20, countMult: 4, threatMult: 20, meleeCrit: -12, meleeNormal: -30, phase2Plus: 6, justRolled: -10, charging: 24 },
      shadowStep:  { hitFlash: 26, charging: 18, selfCorner: 12, punishCombo: 8, critBullet: 30, multiBullet: 12 },
      normalCombo: { inMelee: 24, outMelee: -16, justRolled: 18, notRolling: 8, rolling: -18, phase1: 8, tooFar: -12 },
      frenzyCombo: { inMelee: 22, outMelee: -18, cornered: 12, justRolled: 10, phase2Plus: 8, enraged: 8 },
      chargeSlash: { predictFar: 16, predictNear: -14, charging: 18, stable: 10, cornered: 8, aggroMult: 0.55, enraged: 6 },
      execution:   { sweetSpot: 18, badRange: -20, justRolled: 24, recentCharge: 22, recentAttack: 14, cornered: 12, lowHp: 10, rolling: -16, aggroMult: 0.85 },
    },

    // 外观
    COLOR_PRIMARY: '#4400aa',    // 暗紫
    COLOR_SECONDARY: '#8800ff',  // 亮紫
    COLOR_ACCENT: '#ff00ff',     // 品红
    COLOR_EYES: '#ff00ff',       // 眼睛颜色
  },

  // ========================
  //  Boss 6: 深渊术士 (Abyss Warlock)
  //  精灵图驱动的 boss — 使用 mage-3 触手怪本体 + shadow/tentacles/acid 三大技能素材
  // ========================
  BOSS6: {
    BASE_HP: 24000,
    RADIUS: 132,              // 本体半径 (mage-3 半宽 × 3)
    BASE_SPEED: 0.21,         // 漂浮速度 (原 0.35,再减慢 40% → 0.21)
    SPRITE_SCALE: 3.3,        // 精灵显示缩放 (体型增大 200%)
    PHASE2_THRESHOLD: 0.6,    // 60%  → P2
    PHASE3_THRESHOLD: 0.25,   // 25%  → P3

    // ── 移动行为 ──
    HOVER_DIST: 380,          // 尝试与玩家保持的理想距离
    DRIFT_AMPLITUDE: 90,      // 悬浮飘移幅度
    DRIFT_PERIOD: 240,        // 悬浮飘移周期

    // ── 施法状态机 (State Machine) ──
    // boss 在 idle/casting/recover 三态间切换。施法期间静止、
    // 拉起能量并展开召唤法阵,给玩家充足预警和观赏性。
    GLOBAL_CD_P1: 90,           // 施法结束后到下次选技能的最短间隔 (1.5s)
    GLOBAL_CD_P2: 60,
    GLOBAL_CD_P3: 40,
    CAST_SHADOW_DURATION: 60,   // 影之浮现 施法前摇 (1s)
    CAST_TENTACLE_DURATION: 80, // 深渊触手 施法前摇 (1.33s)
    CAST_ACID_DURATION: 55,     // 酸液喷柱 施法前摇 (0.92s)
    RECOVER_DURATION: 25,       // 施法后硬直 (0.42s)
    // 单技能自身的最小复充 — 防止连续用同一个技能
    RECHARGE_SHADOW: 300,
    RECHARGE_TENTACLE: 360,
    RECHARGE_ACID: 180,

    // ── 技能 1: 影之陷阱 (Shadow Trap) ──
    // 新逻辑:boss 在地图随机位置埋下阴影陷阱,陷阱播放到"第三行第一个"(帧 8)暂停。
    // 玩家靠近触发时,陷阱沉入地下(动画反向),1s 后在玩家右侧现身,完整浮现后禁锢玩家 5s。
    SHADOW_CD_P1: 300,        // P1 冷却 (5s)
    SHADOW_CD_P2: 200,        // P2
    SHADOW_CD_P3: 120,        // P3
    SHADOW_EMERGE_FRAMES: 20, // 完整浮现动画帧数 (匹配 shadow 资源)
    SHADOW_EMERGE_FPS: 12,    // 保留(legacy / 装甲动画用)

    // Trap 布置阶段
    SHADOW_ARM_END_FRAME: 8,  // 第三行第一个 = frame 8(1-indexed row 3 col 1)
    SHADOW_ARM_FPS: 12,       // 布置速率(从地面缓慢升起 — 不动,陷阱本身的布置节奏)
    // ── 响应链(触发后 → 抓人)全面加速 ──
    SHADOW_SINK_FPS: 28,      // 沉入速率(原 16 → 28,快 75%,惊动后几乎瞬沉)
    SHADOW_DETECT_RADIUS: 140, // 玩家进入此距离内触发陷阱(原 110 → 140,触发更灵敏)
    SHADOW_UNDERGROUND_DELAY: 24,  // 地下追踪(原 60/1s → 24/0.4s,极大减少预警窗口)
    SHADOW_STRIKE_EMERGE_FPS: 36, // 浮现袭击速率(原 20 → 36,几乎瞬突)
    SHADOW_STRIKE_OFFSET_X: 44,   // 在玩家右侧多远处浮现(略靠近,配合更快的出手)
    SHADOW_STRIKE_GRAB_RADIUS: 105, // 浮现完成抓取半径(原 80 → 105,补偿玩家快速移动)
    SHADOW_IMPRISON_DURATION: 300, // 5s 禁锢(复用 player.snared)
    // 消失动画:反向播放浮现前 14 帧(0→13 反过来 = 13→0),塌回地下
    SHADOW_RETRACT_FRAMES: 14,     // 前 14 帧(索引 0-13)
    SHADOW_RETRACT_FPS: 28,        // 塌陷速率(原 16 → 28,禁锢结束后快速收回)
    // 地图随机布置范围
    SHADOW_TRAP_MARGIN_X: 0.08,    // 左右边缘留白(占屏宽)
    SHADOW_TRAP_TOP_FRAC: 0.28,    // 避开 boss 顶部区
    SHADOW_TRAP_BOTTOM_FRAC: 0.92,
    SHADOW_MIN_DIST_FROM_PLAYER: 140, // 布置时至少离玩家这么远,避免放脸上

    SHADOW_COUNT_P1: 1,
    SHADOW_COUNT_P2: 2,
    SHADOW_COUNT_P3: 3,
    SHADOW_MAX_ACTIVE: 10,   // 场上陷阱总数上限(≥此数时 boss 不再选择影之陷阱技能)
    // Legacy 保留(实际不再引用)
    SHADOW_CHASE_SPEED: 1.5,
    SHADOW_DAMAGE: 18,
    SHADOW_LIFE: 360,
    SHADOW_HP: 40,
    SHADOW_SPAWN_OFFSET: 140,

    // ── 技能 2: 深渊触手 (Tentacle Launch) ──
    // 新逻辑:触手从目标位置长出(rows 1→2 = frames 0-15,像酸液 precast),
    // 动画进入 row 3 第一帧(frame 16)瞬间,将目标"击飞" —— 抛物线飞行 1.2s
    // 后落地,造成目标 maxHp 20% 的坠落伤害。若地图上有未触发的影之陷阱,
    // 目标会被精准抛到陷阱正上方。飞行期间目标不可移动/射击/被选为目标。
    TENTACLE_CD_P1: 360,      // 6s
    TENTACLE_CD_P2: 240,      // 4s
    TENTACLE_CD_P3: 180,      // 3s
    TENTACLE_WARN_FRAMES: 30, // 预警圈持续帧(无 sprite)
    // 生长阶段:播放 frames 0-15(rows 1+2)
    TENTACLE_SPROUT_FRAMES: 16,
    TENTACLE_SPROUT_FPS: 12,  // 16 帧 / 12fps ≈ 1.33s
    // 摇摆阶段:frames 16-23(row 3)循环
    TENTACLE_SWAY_FRAMES: 8,
    TENTACLE_SWAY_FPS: 10,
    TENTACLE_SWAY_DURATION: 150, // 击飞后触手自然摇摆 2.5s 再 fade
    // 击飞参数
    TENTACLE_HIT_RADIUS: 90,  // strike 瞬间的抓取范围(sprout 完成时)
    TENTACLE_LAUNCH_DURATION: 72,      // 飞行时长 1.2s
    TENTACLE_LAUNCH_MAX_HEIGHT: 180,   // 抛物线最高点
    TENTACLE_LAUNCH_RANGE: 260,        // 随机落点距起点的最大半径
    TENTACLE_LAUNCH_RANGE_MIN: 120,    // 最小落点半径(避免原地落下)
    TENTACLE_FALL_DMG_FRAC: 0.20,      // 落地伤害 = 目标 maxHp × 此值
    TENTACLE_COUNT_P1: 1,      // P1 只释放 1 根(高伤害不叠加)
    TENTACLE_COUNT_P2: 2,
    TENTACLE_COUNT_P3: 3,
    TENTACLE_SPREAD: 60,       // 多根触手时互相间隔
    // ── 触手大小随机化 ──
    // 每根触手在生成时随机一个 scaleMul ∈ [MIN, MAX],
    // 同时影响 sprite 缩放、抓取半径、坠落伤害系数。
    // 大触手命中范围更广、伤害更高,但起手前摇视觉上也更明显。
    TENTACLE_SIZE_MIN: 0.75,   // 小型:半径 ×0.75,伤害系数 ×0.75
    TENTACLE_SIZE_MAX: 1.40,   // 大型:半径 ×1.40,伤害系数 ×1.40
    TENTACLE_BASE_SPRITE_SCALE: 2.0, // 原先硬编码的 setScale 基准

    // ── 技能 3: 酸液喷柱 (Acid Spout) ──
    ACID_CD_P1: 180,
    ACID_CD_P2: 140,
    ACID_CD_P3: 90,
    // Pre-cast warning (只是吓人,不造成伤害):sprite 前 2 帧无限循环,时长控制在 [MIN, MAX]
    ACID_PRECAST_FRAMES: 2,      // sprite 前 2 帧 (frames 0-1)
    ACID_PRECAST_FPS: 18,        // 前摇播放速率(越高越急促)
    ACID_PRECAST_DURATION_MIN: 30, // 最短 0.5s
    ACID_PRECAST_DURATION_MAX: 45, // 最长 0.75s(给点随机感,也可以等于 MIN)
    // Full-spray damage phase (时间驱动 2~8 秒,持续造成伤害)
    ACID_FULLSPRAY_FRAMES: 8,    // 中间整排 (frames 8-15)
    ACID_FULLSPRAY_FPS: 12,      // 循环速率
    ACID_FULLSPRAY_DURATION_MIN: 120, // 最短 2s (120 ticks @ 60fps)
    ACID_FULLSPRAY_DURATION_MAX: 480, // 最长 8s (480 ticks @ 60fps)
    // Retract — grow 动画反向播放 = 收回
    ACID_RETRACT_FRAMES: 8,      // 同 grow 帧数
    ACID_RETRACT_FPS: 16,        // 稍快一点,塌陷感更强

    // ── 大招: 酸液之海 (Acid Ocean) ──
    // Boss HP 跨越每个阈值时各触发一次。数组从高到低排列,越往后越接近死亡。
    OCEAN_TRIGGER_HP_FRACS: [0.80, 0.50],  // 80% 与 50% 各触发一次
    OCEAN_TRIGGER_HP_FRAC: 0.80,  // 保留(legacy,已被 _FRACS 替代)
    OCEAN_COUNT_MIN: 15,
    OCEAN_COUNT_MAX: 25,
    OCEAN_SIZE_MIN: 0.75,         // 相对正常酸柱大小
    OCEAN_SIZE_MAX: 2.50,         // 伤害 / 命中半径随此倍率缩放
    OCEAN_SPAWN_DELAY_MIN: 0,     // 第一个柱子出现延迟(帧)
    OCEAN_SPAWN_DELAY_MAX: 90,    // 最后一个柱子出现延迟(≤ 1.5s)
    OCEAN_SPAWN_MARGIN_X: 0.05,   // 左右边界留白(占屏宽)
    OCEAN_SPAWN_TOP_FRAC: 0.25,   // 从屏幕 25% 高度开始放(避开 boss 所在顶部)
    OCEAN_SPAWN_BOTTOM_FRAC: 0.90, // 到屏幕 90% 高度
    // Legacy 保留(部分 draw 代码仍可能引用)
    ACID_GROW_FRAMES: 8,
    ACID_LOOP_FRAMES: 16,
    ACID_GROW_FPS: 14,
    ACID_LOOP_FPS: 12,
    ACID_ACTIVE_DURATION: 150, // 2.5s — 保留作为 fallback
    ACID_TRAVEL_TIME: 40,     // 抛物线到达目标位置
    ACID_DAMAGE: 15,          // 每次触发伤害
    ACID_TICK_RATE: 15,       // 每 0.25s tick 一次伤害 (2× 频率)
    ACID_HIT_RADIUS: 30,
    ACID_COUNT_P1: 1,
    ACID_COUNT_P2: 2,
    ACID_COUNT_P3: 3,
    ACID_PREDICT_LEAD: 25,    // 预判玩家位置的帧数

    // ═══════════════════════════════════════════════════
    //  增强系统(9 项方案,不涉及 CD 缩短)
    // ═══════════════════════════════════════════════════

    // ── ① 痛感反击 Pain-Reaction Burst ──
    PAIN_WINDOW: 180,             // 3s 累积窗口
    PAIN_THRESHOLD_FRAC: 0.08,    // ≥ 8% maxHP 触发
    PAIN_BURST_RADIUS: 180,       // 近身爆发环半径
    PAIN_BURST_DAMAGE: 28,        // 近身爆发伤害
    PAIN_STAGGER_FRAMES: 18,      // 爆发后的 "免费 cast" 使用 cast 快进 = 现有 cast×0.3
    PAIN_COOLDOWN: 420,           // 触发后 7s 不再触发(防止刷屏)

    // ── ② 阶段仪式 Phase Ritual ──
    RITUAL_INVUL_FRAMES: 90,      // 进入 P2/P3 时无敌 1.5s
    RITUAL_P2_TENTACLES: 6,       // P2 圆阵触手数
    RITUAL_P2_SHADOWS: 3,         // P2 附加陷阱数
    RITUAL_P3_TENTACLES: 4,       // P3 圆阵触手数(已附带 Ocean)
    RITUAL_CIRCLE_RADIUS: 220,    // 圆阵半径

    // ── ③ 连锁打击 Combo Cast ──
    COMBO_CAST_SPEED: 0.7,        // cast 时长 × 0.7
    COMBO_LONG_RECOVER: 2.0,      // combo 结束后 recover × 2.0

    // ── ④ 精准陷落 Precision Launch-to-Trap ──
    LAUNCH_TRAP_GRAB_RADIUS: 150, // 击飞落点为陷阱时的扩大抓取半径
    LAUNCH_TRAP_INSTANT: true,    // 击飞落在陷阱上 → 立即 strike

    // ── ⑤ 酸池残留 Acid Residue ──
    ACID_POOL_DURATION: 240,      // 4s 持续
    ACID_POOL_TICK: 18,           // 每 0.3s 伤害一次 (1.67× 频率)
    ACID_POOL_DAMAGE: 6,          // 每 tick 伤害
    ACID_POOL_RADIUS_MULT: 0.8,   // 半径 = ACID_HIT_RADIUS × 此值

    // ── ⑥ 触手群体智能选点 ──
    TENTACLE_GROUP_RADIUS: 90,    // 扫描 hostile 密集度的半径(等于 HIT_RADIUS)
    TENTACLE_GROUP_BONUS: 0.8,    // 密集区落点的加权 +80%

    // ── ⑦ 施法期符文圈 ──(纯视觉,无数值)

    // ── ⑧ 陷阱上限策略 ──
    SHADOW_OLDEST_DESTROY: true,  // 超上限时销毁最老的未触发陷阱

    // ── ⑨ Sub-10% 狂化 ──
    FRENZY_HP_FRAC: 0.10,         // HP ≤ 10% 进入狂化
    FRENZY_SPEED_MULT: 1.8,
    FRENZY_CAST_MULT: 0.7,        // cast 时长 × 0.7

    // ── 外观 / 颜色 ──
    COLOR_PRIMARY: '#8b2a4e',   // 深红紫
    COLOR_ACCENT: '#ff2255',    // 鲜红(眼睛/心核)
    COLOR_SHADOW: '#2a1a3a',    // 阴影紫黑
    COLOR_ACID: '#a040ff',      // 酸液紫

    // ── 评分 ──
    KILL_SCORE: 3000,
  },

  // ========================
  //  波次系统
  // ========================
  WAVES: {
    BASE_DURATION: 700,
    DURATION_PER_WAVE: 80,
  },

  // ========================
  //  Boss 连战模式
  // ========================
  BOSS_RUSH: {
    HP_MULTIPLIER_PER_ROUND: 0.4,   // Boss HP increases 40% each round
    SPEED_MULTIPLIER_PER_ROUND: 0.08, // Boss speed increases 8% each round
    ENEMY_SPAWN_PER_ROUND: 2,        // Extra enemies per round
  },
};

export default CONFIG;
