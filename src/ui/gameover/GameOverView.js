// ===========================
//  GameOverView — 游戏结束 DOM 视图层
//  职责：创建/销毁 DOM、绑定 UI 事件
//  不负责：场景跳转、GameState 读取
// ===========================
import './gameOverStyles.css';

/**
 * @param {Object} data
 * @param {number} data.kills
 * @param {number} data.wave
 * @param {string} data.gameMode
 */
function getGameOverHTML(data) {
  const waveLabel = data.gameMode === 'bossRush' ? '生存轮次' : '生存波次';
  return `
    <div class="go-card">
      <div class="go-deco">KO</div>
      <h1 class="go-title">游戏结束</h1>
      <p class="go-subtitle">YOU HAVE BEEN ELIMINATED</p>

      <div class="go-stats">
        <div class="go-stat">
          <div class="go-stat-label">击杀数</div>
          <div class="go-stat-value">${data.kills}</div>
        </div>
        <div class="go-stat">
          <div class="go-stat-label">${waveLabel}</div>
          <div class="go-stat-value">${data.wave}</div>
        </div>
      </div>

      <button class="go-btn" id="goRestartBtn">重新开始 →</button>
      <button class="go-btn-ghost" id="goMenuBtn">← 返回主菜单</button>
    </div>
  `;
}

/**
 * GameOverView — 纯 DOM 视图层
 *
 * @example
 *   const view = new GameOverView();
 *   view.mount({ kills: 10, wave: 3, gameMode: 'normal' }, {
 *     onRestart: () => ...,
 *     onMenu: () => ...,
 *   });
 *   view.unmount();
 */
export default class GameOverView {
  constructor() {
    this.root = null;
  }

  /**
   * 挂载 DOM
   * @param {Object} data - { kills, wave, gameMode }
   * @param {Object} callbacks - { onRestart, onMenu }
   */
  mount(data, callbacks) {
    this.unmount();

    const div = document.createElement('div');
    div.id = 'gameover-ui';
    div.innerHTML = getGameOverHTML(data);
    document.body.appendChild(div);
    this.root = div;

    div.querySelector('#goRestartBtn').addEventListener('click', () => callbacks.onRestart());
    div.querySelector('#goMenuBtn').addEventListener('click', () => callbacks.onMenu());

    return div;
  }

  /** 卸载 DOM */
  unmount() {
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }
}
