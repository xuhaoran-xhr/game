// ===========================
//  GameState — 全局游戏状态 (单例)
//  角色选择、游戏模式等在场景切换间持久保存
// ===========================

/** 角色标识符常量 */
export const CHARACTER = {
  RANGED: 'ranged',   // 霓虹特工 — 远程射手
  MELEE:  'melee',    // 腥红幽影 — 近战狂战士
};

/** 游戏模式标识符常量 */
export const GAME_MODE = {
  NORMAL:    'normal',
  BOSS_RUSH: 'bossRush',
  CUSTOM:    'custom',
};

/** 全局状态（跨场景持久化） */
const GameState = {
  // 当前选中的角色 (默认远程)
  selectedCharacter: CHARACTER.RANGED,

  // 当前游戏模式
  gameMode: GAME_MODE.NORMAL,

  // 设置项
  startWeapon: 0,
  shakeMultiplier: 1,
  particleMode: 'full',
  mapTheme: 'dark',        // 'dark' | 'light' — 游戏内地图主题

  /** 设置角色 */
  setCharacter(charId) {
    if (charId === CHARACTER.RANGED || charId === CHARACTER.MELEE) {
      this.selectedCharacter = charId;
    }
  },

  /** 当前是否是近战角色 */
  isMelee() {
    return this.selectedCharacter === CHARACTER.MELEE;
  },

  /** 当前是否是远程角色 */
  isRanged() {
    return this.selectedCharacter === CHARACTER.RANGED;
  },
};

export default GameState;
