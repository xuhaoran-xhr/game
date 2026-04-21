// ============================================================
//  NEON OPS — 游戏配置文件
//  所有数值都在这里调整，游戏代码会自动读取
// ============================================================

const CONFIG = {

  // ========================
  //  主角属性
  // ========================
  PLAYER: {
    SPEED: 5.0,              // 移动速度（像素/帧）
    RADIUS: 16,              // 碰撞半径（像素）
    MAX_HP: 500,             // 最大生命值

    // --- 翻滚 ---
    ROLL_DURATION: 14,       // 翻滚持续帧数（越大滚得越久）
    ROLL_SPEED: 6.5,         // 翻滚速度（像素/帧）
    ROLL_COOLDOWN: 50,       // 翻滚冷却帧数（60帧=1秒）
    ROLL_DMG_BOOST_WINDOW: 30, // 翻滚后加伤窗口（帧），在此期间下一枪伤害翻倍
    ROLL_DMG_MULTIPLIER: 2,  // 翻滚后加伤倍率

    // --- 护盾 (E技能) ---
    SHIELD_MAX_HITS: 3,      // 护盾可以抵挡的攻击次数
    SHIELD_DURATION: 600,    // 护盾最长持续帧数（600帧=10秒）
    SHIELD_BREAK_KNOCKBACK: 6, // 护盾破裂时击退力度

    // --- 技能冷却 ---
    SKILL_Q_COOLDOWN: 300,   // 黑洞手雷冷却帧（900=15秒）
    SKILL_E_COOLDOWN: 1200,  // 纳米光盾冷却帧（1200=20秒）

    // --- 被动: 连杀加速 ---
    COMBO_THRESHOLD: 5,      // 连杀多少次触发加速
    COMBO_SPEED_BONUS: 0.2,  // 加速倍率（0.2 = 额外20%速度）
    COMBO_TIMEOUT: 120,      // 连杀计时器（帧），超过此时间不杀人则重置

    // --- 等离子射线减速 ---
    PLASMA_SLOW_FACTOR: 0.4, // 开等离子射线时移速降低比例（0.5=减半）
  },

  // ========================
  //  武器属性
  // ========================
  WEAPONS: {
    // --- 脉冲手枪 ---
    PISTOL: {
      NAME: 'PULSE PISTOL',
      FIRE_RATE: 20,         // 开火间隔（帧数，越大越慢）
      BULLET_SPEED: 5,       // 子弹飞行速度
      DAMAGE: 14,            // 单发伤害
      BULLET_COUNT: 1,       // 每次发射子弹数量
      SPREAD: 0,             // 散布角度（弧度）
      RANGE: 80,             // 子弹存活帧数（决定射程）
      BULLET_RADIUS: 3,      // 子弹碰撞半径
      COLOR: '#44ddff',      // 子弹颜色
    },
    // --- 散弹枪 ---
    SHOTGUN: {
      NAME: 'SHOTGUN',
      FIRE_RATE: 30,         // 开火间隔（很慢，强调单次爆发）
      BULLET_SPEED: 4.5,
      DAMAGE: 10,            // 单颗弹丸伤害（5颗=总50）
      BULLET_COUNT: 15,       // 弹丸数量
      SPREAD: 0.15,          // 扇形散布角度（弧度）
      RANGE: 80,             // 存活帧数（短，模拟近程）
      BULLET_RADIUS: 2,
      COLOR: '#ffaa44',
    },
    // --- 等离子射线 ---
    PLASMA: {
      NAME: 'PLASMA BEAM',
      FIRE_RATE: 3,          // 每帧都在打，不重要
      DAMAGE: 1.5,           // 每帧伤害（持续造成）
      RANGE: 320,            // 射线长度（像素÷2）
      BEAM_ANGLE_THRESHOLD: 0.12, // 射线宽度（弧度，越大越容易命中）
      COLOR: '#88ff44',
    },
  },

  // ========================
  //  黑洞手雷 (Q技能)
  // ========================
  BLACK_HOLE: {
    THROW_DISTANCE: 150,     // 投掷距离（从主角位置向前多远）
    DURATION: 480,           // 持续帧数（180=3秒）
    PULL_RADIUS: 300,        // 引力场半径
    PULL_FORCE: 3.0,         // 引力强度（越大吸力越猛）
    DAMAGE_PER_FRAME: 1.5,   // 核心区域每帧伤害
    MISSILE_PULL_FORCE: 1.0, // 对Boss导弹的引力
    ABSORB_BULLETS: true,    // 是否吸引并销毁敌方子弹
    BULLET_PULL_FORCE: 2.0,  // 对敌方子弹的引力强度
    BULLET_DESTROY_RADIUS: 0.3, // 子弹在引力场多近时被销毁（占半径比例，0.3=30%半径内）
  },

  // ========================
  //  敌人属性
  // ========================
  ENEMIES: {
    // --- 普通步兵 (红色圆形) ---
    GRUNT: {
      RADIUS: 14,
      BASE_HP: 25,           // 基础生命
      HP_PER_WAVE: 4,        // 每波增加的生命
      SPEED: 0.7,
      CONTACT_DAMAGE: 6,     // 碰撞伤害
      COLOR: '#ff4466',
      SCORE: 1,
    },
    // --- 疾速兵 (绿色三角) ---
    FAST: {
      RADIUS: 10,
      BASE_HP: 12,
      HP_PER_WAVE: 2,
      SPEED: 1.5,
      CONTACT_DAMAGE: 6,
      COLOR: '#44ff88',
      SCORE: 2,
    },
    // --- 重装坦克 (橙色方块) ---
    TANK: {
      RADIUS: 22,
      BASE_HP: 70,
      HP_PER_WAVE: 8,
      SPEED: 0.35,
      CONTACT_DAMAGE: 12,    // 坦克碰撞伤害更高
      COLOR: '#ff8844',
      SCORE: 3,
    },
    // --- 紫色射手 (五边形) ---
    SHOOTER: {
      RADIUS: 13,
      BASE_HP: 20,
      HP_PER_WAVE: 3,
      SPEED: 0.6,
      CONTACT_DAMAGE: 6,
      SHOOT_RANGE: 450,      // 开火范围
      BULLET_SPEED: 2.5,     // 子弹速度
      BULLET_DAMAGE: 6,
      BULLET_LIFETIME: 110,
      BULLET_RADIUS: 4,
      BULLET_COLOR: '#aa44ff',
      BASE_SHOOT_CD: 150,    // 基础射击冷却
      BASE_SHOOT_RATE: 120,  // 基础射击间隔
      RATE_REDUCTION_PER_WAVE: 3, // 每波减少的间隔
      COLOR: '#aa44ff',
      SCORE: 2,
    },

    // --- 生成控制 ---
    SPAWN: {
      BASE_RATE: 70,         // 基础生成间隔（帧）
      MIN_RATE: 25,          // 最小生成间隔
      RATE_REDUCTION_PER_WAVE: 5, // 每波减少的间隔
      BASE_MAX_COUNT: 4,     // 基础最大同屏敌人数
      MAX_COUNT_PER_WAVE: 2, // 每波增加的同屏上限
    },

    // --- 掉落 ---
    HP_DROP_CHANCE: 0.15,    // 击杀掉落血瓶概率 (0.15=15%)
    HP_DROP_AMOUNT: 15,      // 血瓶回复量
    HP_DROP_LIFETIME: 360,   // 血瓶存在帧数

    // --- 出现权重（按波数阶段） ---
    // 每个数组是 [grunt, fast, tank, shooter] 的出现概率
    WEIGHTS_EARLY: [0.7, 0.3, 0, 0],       // 1~2波
    WEIGHTS_MID: [0.35, 0.3, 0.2, 0.15], // 3~4波
    WEIGHTS_LATE: [0.2, 0.25, 0.25, 0.3], // 5波以后
  },

  // ========================
  //  BOSS: 毁灭者-K (Destroyer-K)
  // ========================
  BOSS: {
    // --- 基础属性 ---
    RADIUS: 50,
    BASE_HP: 300,
    HP_PER_WAVE: 50,         // 每波增加的Boss血量
    COLOR: '#ff2244',
    KILL_SCORE: 10,          // 击杀Boss得分
    CONTACT_DAMAGE: 10,      // 碰撞伤害
    CONTACT_KNOCKBACK: 25,   // 碰撞击退距离

    // --- 出现规则 ---
    SPAWN_EVERY_N_WAVES: 5,  // 每隔几波出现一次

    // --- Phase 1 (满血 ~ 50%) ---
    PHASE1: {
      SPEED: 0.3,            // 移动速度
      ARMOR_PLATES: 4,       // 装甲板数量（挡子弹）
      ARMOR_ROTATION_SPEED: 0.015, // 装甲板旋转速度

      // 螺旋弹幕
      SPIRAL_FIRE_INTERVAL: 8,  // 每隔多少帧发一组弹幕
      SPIRAL_BULLET_COUNT: 3,   // 每组子弹数
      SPIRAL_BULLET_SPEED: 2,
      SPIRAL_BULLET_DAMAGE: 8,
      SPIRAL_BULLET_LIFETIME: 150,
      SPIRAL_ANGLE_INCREMENT: 0.3, // 每组旋转角度

      // 追踪导弹
      MISSILE_INTERVAL: 180,    // 每隔多少帧发导弹（180=3秒）
      MISSILE_COUNT: 3,         // 一次发射数量
      MISSILE_DELAY: 400,       // 每颗导弹之间的间隔(毫秒)
      MISSILE_SPEED_BASE: 1.2,
      MISSILE_SPEED_INCREMENT: 0.3, // 后续导弹更快
      MISSILE_LIFETIME: 240,
      MISSILE_HP: 8,            // 可以被打爆
      MISSILE_DAMAGE: 12,
      MISSILE_HOMING_FACTOR: 0.03, // 追踪灵敏度
      MISSILE_RADIUS: 6,
    },

    // --- Phase 2 (50% 以下) ---
    PHASE2: {
      SPEED: 0.6,            // 加速

      // 更密集的弹幕
      SPIRAL_FIRE_INTERVAL: 6,
      SPIRAL_BULLET_COUNT: 4,
      SPIRAL_BULLET_SPEED: 2.2,
      SPIRAL_BULLET_DAMAGE: 10,
      SPIRAL_BULLET_LIFETIME: 120,
      SPIRAL_ANGLE_INCREMENT: 0.25,

      // 冲锋粉碎
      CHARGE_INTERVAL: 300,     // 多少帧触发一次冲锋
      CHARGE_OFFSET: 150,       // 偏移（在interval的什么时间点触发）
      CHARGE_WARN_DURATION: 60, // 冲锋预警帧数
      CHARGE_SPEED: 7,         // 冲锋速度
      CHARGE_DAMAGE: 20,
      CHARGE_TRAIL_LIFETIME: 30,

      // 灭世射线
      BEAM_INTERVAL: 480,
      BEAM_WARN_DURATION: 120,  // 射线预警帧数（越长越仁慈）
      BEAM_SWEEP_SPEED: 0.008, // 扫射角速度
      BEAM_SWEEP_ANGLE: Math.PI * 0.5, // 总扫射角度（90度）
      BEAM_HIT_ANGLE: 0.08,   // 命中判定角度
      BEAM_HIT_RANGE: 600,    // 命中判定距离
      BEAM_DAMAGE_PER_FRAME: 3,
    },
  },

  // ========================
  //  BOSS2: 幻影织网者 (Phantom Weaver)
  //  特点：快速移动 + 传送 + 分身 + 弹网
  //  与毁灭者-K形成对比（敏捷 vs 坦克）
  // ========================
  BOSS2: {
    // --- 基础属性 ---
    RADIUS: 30,                // 比毁灭者小（灵活型）
    BASE_HP: 200,
    HP_PER_WAVE: 40,
    COLOR: '#00ffcc',          // 青绿色
    KILL_SCORE: 12,
    CONTACT_DAMAGE: 8,
    CONTACT_KNOCKBACK: 20,

    // --- Phase 1 (满血 ~ 40%) ---
    PHASE1: {
      SPEED: 1.2,              // 快！比毁灭者快4倍

      // 传送闪现
      TELEPORT_INTERVAL: 240,  // 多少帧传送一次（240=4秒）
      TELEPORT_WARN_DURATION: 40, // 传送前闪烁预警帧数
      TELEPORT_MIN_DIST: 150,  // 传送最小距离
      TELEPORT_MAX_DIST: 300,  // 传送最大距离

      // 弹网（放射状+环形弹幕组合）
      WEB_FIRE_INTERVAL: 120,  // 每隔多少帧释放一次弹网
      WEB_RING_COUNT: 12,      // 环形子弹数量
      WEB_RING_SPEED: 2.5,
      WEB_RING_DAMAGE: 6,
      WEB_RING_LIFETIME: 100,
      WEB_CROSS_COUNT: 4,      // 十字追踪弹数量
      WEB_CROSS_SPEED: 3,
      WEB_CROSS_DAMAGE: 8,
      WEB_CROSS_LIFETIME: 120,

      // 分身（虚假目标）
      CLONE_INTERVAL: 360,     // 多少帧生成分身
      CLONE_COUNT: 2,          // 同时生成几个分身
      CLONE_HP: 150,            // 分身血量
      CLONE_SPEED: 1.0,
      CLONE_DURATION: 500,     // 分身存活帧数
    },

    // --- Phase 2 (40% 以下) ---
    PHASE2: {
      SPEED: 1.8,              // 更快

      // 更频繁传送
      TELEPORT_INTERVAL: 150,
      TELEPORT_WARN_DURATION: 25,

      // 毒雷区域
      MINE_INTERVAL: 180,      // 多少帧布雷一次
      MINE_COUNT: 5,           // 一次布几颗
      MINE_RADIUS: 20,         // 地雷碰撞半径
      MINE_DAMAGE: 15,
      MINE_LIFETIME: 480,      // 地雷存活帧数（8秒）
      MINE_ARM_DELAY: 60,      // 地雷投放后多久激活（期间不会爆炸）

      // 冲刺斩击（连续3次短冲刺）
      DASH_INTERVAL: 300,
      DASH_COUNT: 4,           // 连续冲刺次数
      DASH_SPEED: 10,
      DASH_WARN_DURATION: 30,
      DASH_DAMAGE: 12,
      DASH_GAP: 40,            // 每次冲刺之间的间隔帧

      // 弹幕加强
      WEB_FIRE_INTERVAL: 80,
      WEB_RING_COUNT: 16,
      WEB_RING_SPEED: 3,
      WEB_CROSS_COUNT: 6,
      WEB_CROSS_SPEED: 3.5,
    },
  },

  // ========================
  //  通用战斗参数
  // ========================
  COMBAT: {
    KNOCKBACK_ON_HIT: 2,       // 子弹击中敌人的击退力度
    PLAYER_KNOCKBACK_ON_HIT: 18, // 敌人碰撞后主角被推开的距离
    HITSTOP_ON_KILL: 2,        // 击杀时冻结帧数（卡肉感）
    HITSTOP_ON_BOSS_KILL: 12,
    SCREEN_SHAKE_ON_HIT: 3,
    SCREEN_SHAKE_ON_SHOOT: 1.5,
    SCREEN_SHAKE_SHOTGUN: 4,
  },

  // ========================
  //  波次系统
  // ========================
  WAVES: {
    BASE_DURATION: 500,        // 基础波次持续帧数
    DURATION_PER_WAVE: 150,    // 每波增加的持续帧数
  },
};
