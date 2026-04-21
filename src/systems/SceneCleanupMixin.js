// ===========================
//  SceneCleanupMixin — 场景资源登记表 + 统一清理
//  用法：在 scene.create() 开头调用 initCleanup(scene)
//  所有资源通过 track* 方法登记，SHUTDOWN 时自动释放
// ===========================

/**
 * 初始化清理系统。在 scene.create() 最前面调用。
 * 注册 Phaser SHUTDOWN 和 DESTROY 事件，确保场景停止时自动清理。
 *
 * @param {Phaser.Scene} scene
 */
export function initCleanup(scene) {
  // 资源登记表
  scene._tracked = {
    domElements: [],        // DOM 节点
    nativeListeners: [],    // { target, event, handler, options }
    scaleListeners: [],     // { event, handler }
    externalSystems: [],    // destroy 回调函数
  };

  // 绑定清理方法到 scene 实例
  scene.trackDOM = (el) => trackDOM(scene, el);
  scene.trackListener = (target, event, handler, options) =>
    trackListener(scene, target, event, handler, options);
  scene.trackScaleListener = (event, handler) =>
    trackScaleListener(scene, event, handler);
  scene.trackExternalSystem = (destroyFn) =>
    trackExternalSystem(scene, destroyFn);
  scene.cleanupAll = () => cleanup(scene);

  // 注册 Phaser 生命周期事件
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cleanup(scene));
  scene.events.once(Phaser.Scenes.Events.DESTROY, () => cleanup(scene));
}

/**
 * 登记一个 DOM 元素，cleanup 时自动 remove()。
 */
function trackDOM(scene, el) {
  if (!scene._tracked) return;
  scene._tracked.domElements.push(el);
}

/**
 * 登记一个原生事件监听器（addEventListener），cleanup 时自动 removeEventListener。
 * 返回 handler 引用，方便手动提前解绑。
 */
function trackListener(scene, target, event, handler, options) {
  if (!scene._tracked) return handler;
  target.addEventListener(event, handler, options);
  scene._tracked.nativeListeners.push({ target, event, handler, options });
  return handler;
}

/**
 * 登记一个 Phaser Scale Manager 事件，cleanup 时自动 off()。
 */
function trackScaleListener(scene, event, handler) {
  if (!scene._tracked) return handler;
  scene.scale.on(event, handler);
  scene._tracked.scaleListeners.push({ event, handler });
  return handler;
}

/**
 * 登记一个外部系统的销毁回调，cleanup 时自动调用。
 */
function trackExternalSystem(scene, destroyFn) {
  if (!scene._tracked) return;
  scene._tracked.externalSystems.push(destroyFn);
}

/**
 * 按登记表统一释放所有资源。
 */
function cleanup(scene) {
  if (!scene._tracked) return;

  const t = scene._tracked;

  // 1. 移除原生事件监听器
  for (const { target, event, handler, options } of t.nativeListeners) {
    try { target.removeEventListener(event, handler, options); } catch (_) {}
  }
  t.nativeListeners.length = 0;

  // 2. 移除 Scale 事件
  for (const { event, handler } of t.scaleListeners) {
    try { scene.scale.off(event, handler); } catch (_) {}
  }
  t.scaleListeners.length = 0;

  // 3. 销毁外部系统
  for (const destroyFn of t.externalSystems) {
    try { destroyFn(); } catch (_) {}
  }
  t.externalSystems.length = 0;

  // 4. 移除 DOM 元素（倒序，先移除子再移除父）
  for (let i = t.domElements.length - 1; i >= 0; i--) {
    try { t.domElements[i].remove(); } catch (_) {}
  }
  t.domElements.length = 0;

  // 5. 移除任何残留 CSS 效果
  try { document.body.classList.remove('impact-frame-active'); } catch (_) {}

  scene._tracked = null;
}
