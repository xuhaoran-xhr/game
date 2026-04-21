// ===========================
//  MenuView — 菜单 DOM 视图层
//  职责：创建/销毁 DOM、绑定 UI 事件
//  不负责：场景跳转、GameState/CONFIG 写入
// ===========================
import './menuStyles.css';

/** HTML 模板 */
function getMenuHTML() {
  return `
    <div class="page-wrapper">
      <div class="left-col">
        <div class="deco-wrapper">01</div>

        <div>
          <h1 class="menu-title">劳大特攻</h1>
          <p class="menu-subtitle">NEON OPS · TACTICAL SHOOTER</p>
        </div>

        <div class="hover-info" id="hoverInfo">
          <div class="hover-info-title" id="hoverInfoTitle"></div>
          <div class="hover-info-desc" id="hoverInfoDesc"></div>
        </div>

        <div class="controls-wrapper">
          <div class="controls-title">OPERATING INSTRUCTIONS</div>
          <div class="menu-controls">
            <div class="control-item"><span>WASD</span> MOVE</div>
            <div class="control-item"><span>MOUSE</span> AIM & SHOOT</div>
            <div class="control-item"><span>SPACE</span> DODGE ROLL</div>
            <div class="control-item"><span>1 / 2 / 3</span> WEAPON</div>
            <div class="control-item"><span>Q</span> SKILL 1</div>
            <div class="control-item"><span>E</span> SKILL 2</div>
          </div>
        </div>
      </div>

      <div class="right-col">
        <!-- ============ Main Panel ============ -->
        <div class="main-panel show" id="mainPanel">
          <button class="menu-btn primary" id="startBtn">开始任务 <span>↗</span></button>
          <button class="menu-btn" id="bossRushBtn">首领连战 <span>↗</span></button>
          <button class="menu-btn" id="customBtn">自定义模式 <span>↗</span></button>
          <button class="menu-btn" id="charSelectBtn">
            <div style="display:flex; flex-direction:column; align-items:flex-start;">
              特工选项
              <div class="selected-char-badge" id="charBadge" style="margin: 8px 0 0 0; padding: 4px 12px; font-size: 14px; border-width: 2px;">霓虹特工</div>
            </div>
            <span>→</span>
          </button>
          <button class="menu-btn" id="settingsBtn">系统配置 <span>→</span></button>
        </div>

        <!-- ============ Character Selection Panel ============ -->
        <div class="character-panel" id="characterPanel">
          <div class="panel-header">
            <h2>选择特工</h2>
          </div>
          <div class="char-cards">
            <div class="char-card selected" id="charRanged" data-char="ranged">
              <div class="char-card-name">霓虹特工</div>
              <div class="char-card-subtitle">远程战术压制</div>
              <div class="char-card-stats">
                <strong>核心武装</strong> 脉冲手枪 / 散弹枪 / 轨道炮<br>
                <strong>战术技能Q</strong> 黑洞手雷<br>
                <strong>战术技能E</strong> 魅惑彩蛋<br>
                <strong>机动闪避</strong> 战术翻滚 + 持续伤害强化<br>
                <strong>作战风格</strong> 保持距离的纯粹火力
              </div>
            </div>
            <div class="char-card melee-card" id="charMelee" data-char="melee">
              <div class="char-card-name">腥红幽影</div>
              <div class="char-card-subtitle">高机动近战狂热</div>
              <div class="char-card-stats">
                <strong>核心武装</strong> 血刃大剑<br>
                <strong>战术技能Q</strong> 暗影步突进<br>
                <strong>战术技能E</strong> 嗜血狂化<br>
                <strong>专属被动</strong> 刀刃格挡并切碎弹幕<br>
                <strong>作战风格</strong> 刀光血影的近战绞肉机
              </div>
            </div>
          </div>
          <button class="menu-btn primary" id="charConfirmBtn" style="margin-top:auto; height:100px; border-bottom:none;">确认加载 <span>✓</span></button>
          <button class="menu-btn" id="charBackBtn" style="border-top:4px solid var(--fg); height:80px; border-bottom:none;">返回主控室 <span>←</span></button>
        </div>

        <!-- ============ Settings Panel ============ -->
        <div class="settings-panel" id="settingsPanel">
          <div class="panel-header">
            <h2>系统配置</h2>
          </div>

          <div class="settings-content">
            <div class="settings-section">游戏体验体验参数</div>

            <div class="input-group">
              <label>危险门限</label>
              <select class="settings-select" id="difficultySelect">
                <option value="easy">简单 — 休闲体验</option>
                <option value="normal" selected>标准 — 常规协议</option>
                <option value="hard">满编 — 核心挑战</option>
              </select>
            </div>

            <div class="input-group">
              <label>默认武装</label>
              <select class="settings-select" id="weaponSelect">
                <option value="0">标配脉冲手枪</option>
                <option value="1">破门散弹枪</option>
                <option value="2">重型轨道炮</option>
              </select>
            </div>

            <div class="input-group">
              <label>特工机动性</label>
              <div class="settings-slider-row">
                <input type="range" class="settings-slider" id="speedSlider" min="1.5" max="6" step="0.5" value="2.5">
                <span class="settings-value" id="speedValue">2.5</span>
              </div>
            </div>

            <div class="input-group">
              <label>特工装甲值</label>
              <div class="settings-slider-row">
                <input type="range" class="settings-slider" id="hpSlider" min="100" max="1000" step="50" value="500">
                <span class="settings-value" id="hpValue">500</span>
              </div>
            </div>

            <div class="input-group">
              <label>敌方威胁部署频率</label>
              <div class="settings-slider-row">
                <input type="range" class="settings-slider" id="spawnSlider" min="40" max="150" step="5" value="100">
                <span class="settings-value" id="spawnValue">100</span>
              </div>
            </div>

            <div class="input-group">
              <label>连击容错时间</label>
              <div class="settings-slider-row">
                <input type="range" class="settings-slider" id="comboSlider" min="60" max="300" step="10" value="120">
                <span class="settings-value" id="comboValue">120</span>
              </div>
            </div>

            <div class="settings-section">视觉与反馈控制</div>

            <div class="input-group">
              <label>屏幕震颤幅度</label>
              <div class="settings-slider-row">
                <input type="range" class="settings-slider" id="shakeSlider" min="0" max="100" step="10" value="100">
                <span class="settings-value" id="shakeValue">100%</span>
              </div>
            </div>

            <div class="input-group">
              <label>粒子渲染等级</label>
              <select class="settings-select" id="particleSelect">
                <option value="full" selected>极致运算 (全量)</option>
                <option value="reduced">战术精简 (减量)</option>
                <option value="off">关闭冗余 (无粒子)</option>
              </select>
            </div>

            <div class="input-group">
              <label>地图主题</label>
              <select class="settings-select" id="mapThemeSelect">
                <option value="dark" selected>深色模式 — 霓虹暗夜</option>
                <option value="light">浅色模式 — 晨曦作战</option>
              </select>
            </div>
          </div>

          <button class="menu-btn" id="backBtn" style="border-top:4px solid var(--fg); border-bottom:none; height:100px;">返回主控室 <span>←</span></button>
        </div>
      </div>
    </div>
  `;
}

/** 按钮悬停说明文字 */
const HOVER_DATA = {
  startBtn:     { title: "开始任务", desc: "潜入霓虹网络核心。在标准战术协议下，迎击源源不断的敌对单位。" },
  bossRushBtn:  { title: "首领连战", desc: "精英战斗模式。无视杂兵干扰，连续挑战最高安全级别的核心守护者。" },
  customBtn:    { title: "自定义模式", desc: "掌控规则。调节环境参数与敌方强度，创造专属于你的战术训练场景。" },
  charSelectBtn:{ title: "角色选择", desc: "更换作战特工。在远程火力压制与高机动近战爆发之间自由切换。" },
  settingsBtn:  { title: "系统设置", desc: "调整系统参数。自定义难度曲线、视觉粒子效果及核心操作逻辑。" },
};

/**
 * MenuView — 纯 DOM 视图层
 *
 * @example
 *   const view = new MenuView();
 *   view.mount({
 *     onStartGame: () => ...,
 *     onBossRush: () => ...,
 *     onCustom: () => ...,
 *     onSelectCharacter: (type) => ...,
 *   });
 *   // later:
 *   view.unmount();
 */
export default class MenuView {
  constructor() {
    this.root = null;
  }

  /**
   * 挂载菜单 DOM 到 document.body
   * @param {Object} callbacks - 场景回调
   * @param {Function} callbacks.onStartGame
   * @param {Function} callbacks.onBossRush
   * @param {Function} callbacks.onCustom
   * @param {Function} callbacks.onSelectCharacter - (type: 'ranged'|'melee') => void
   */
  mount(callbacks) {
    this.unmount(); // 安全清理

    const div = document.createElement('div');
    div.id = 'neon-menu';
    div.innerHTML = getMenuHTML();
    document.body.appendChild(div);
    this.root = div;

    this._bindEvents(callbacks);
    return div;
  }

  /** 卸载菜单 DOM */
  unmount() {
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }

  /** 切换面板显示 */
  setPanel(panelName) {
    if (!this.root) return;
    const panels = { main: 'mainPanel', character: 'characterPanel', settings: 'settingsPanel' };
    Object.values(panels).forEach(id => {
      const el = this.root.querySelector('#' + id);
      if (el) el.classList.toggle('show', id === panels[panelName]);
    });
  }

  /** 更新角色徽章 */
  setCharacter(type) {
    if (!this.root) return;
    const badge = this.root.querySelector('#charBadge');
    if (!badge) return;
    if (type === 'melee') {
      badge.textContent = '腥红幽影';
      badge.classList.add('melee');
    } else {
      badge.textContent = '霓虹特工';
      badge.classList.remove('melee');
    }
    // 更新卡片选中状态
    const cards = this.root.querySelectorAll('.char-card');
    cards.forEach(c => c.classList.toggle('selected', c.dataset.char === type));
  }

  /** 读取设置面板的所有值 */
  readSettings() {
    if (!this.root) return {};
    return {
      difficulty: this.root.querySelector('#difficultySelect').value,
      speed: parseFloat(this.root.querySelector('#speedSlider').value),
      weapon: parseInt(this.root.querySelector('#weaponSelect').value),
      shakePct: parseInt(this.root.querySelector('#shakeSlider').value) / 100,
      hp: parseInt(this.root.querySelector('#hpSlider').value),
      spawnRate: parseInt(this.root.querySelector('#spawnSlider').value),
      comboTimeout: parseInt(this.root.querySelector('#comboSlider').value),
      particles: this.root.querySelector('#particleSelect').value,
      mapTheme: this.root.querySelector('#mapThemeSelect').value,
    };
  }

  /** 恢复设置面板的值（从 GameState 或 localStorage 回填） */
  applySettings(values) {
    if (!this.root || !values) return;
    const setVal = (id, v) => {
      const el = this.root.querySelector(id);
      if (el && v !== undefined) el.value = v;
    };
    if (values.mapTheme) setVal('#mapThemeSelect', values.mapTheme);
  }

  // ---- 内部方法 ----

  _bindEvents(callbacks) {
    const div = this.root;

    // 主按钮
    div.querySelector('#startBtn').addEventListener('click', () => callbacks.onStartGame());
    div.querySelector('#bossRushBtn').addEventListener('click', () => callbacks.onBossRush());
    div.querySelector('#customBtn').addEventListener('click', () => callbacks.onCustom());
    div.querySelector('#charSelectBtn').addEventListener('click', () => this.setPanel('character'));
    div.querySelector('#settingsBtn').addEventListener('click', () => this.setPanel('settings'));
    div.querySelector('#backBtn').addEventListener('click', () => this.setPanel('main'));

    // 悬停说明
    const hoverInfo = div.querySelector('#hoverInfo');
    const hoverInfoTitle = div.querySelector('#hoverInfoTitle');
    const hoverInfoDesc = div.querySelector('#hoverInfoDesc');

    ['startBtn', 'bossRushBtn', 'customBtn', 'charSelectBtn', 'settingsBtn'].forEach(btnId => {
      const btn = div.querySelector('#' + btnId);
      if (!btn) return;
      btn.addEventListener('mouseenter', () => {
        const data = HOVER_DATA[btnId];
        if (data) {
          hoverInfoTitle.textContent = data.title;
          hoverInfoDesc.textContent = data.desc;
          hoverInfo.classList.add('active');
        }
      });
      btn.addEventListener('mouseleave', () => {
        hoverInfo.classList.remove('active');
      });
    });

    // 角色选择
    div.querySelector('#charRanged').addEventListener('click', () => {
      callbacks.onSelectCharacter('ranged');
      this.setCharacter('ranged');
    });
    div.querySelector('#charMelee').addEventListener('click', () => {
      callbacks.onSelectCharacter('melee');
      this.setCharacter('melee');
    });
    div.querySelector('#charConfirmBtn').addEventListener('click', () => {
      this.setPanel('main');
    });
    div.querySelector('#charBackBtn').addEventListener('click', () => {
      this.setPanel('main');
    });

    // 滑块实时更新
    this._bindSlider(div, '#speedSlider', '#speedValue', v => parseFloat(v).toFixed(1));
    this._bindSlider(div, '#hpSlider', '#hpValue');
    this._bindSlider(div, '#spawnSlider', '#spawnValue');
    this._bindSlider(div, '#comboSlider', '#comboValue');
    this._bindSlider(div, '#shakeSlider', '#shakeValue', v => v + '%');
  }

  _bindSlider(div, sliderId, valueId, fmt) {
    const slider = div.querySelector(sliderId);
    const display = div.querySelector(valueId);
    slider.addEventListener('input', () => {
      display.textContent = fmt ? fmt(slider.value) : slider.value;
    });
  }
}
