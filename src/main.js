// ===========================
//  NEON OPS — Phaser 3 Entry Point
// ===========================
import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.CANVAS,  // Use Canvas renderer (matches original)
  width: window.innerWidth,
  height: window.innerHeight,
  transparent: true,
  parent: 'game-container',
  scene: [MenuScene, GameScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  input: {
    keyboard: true,
    mouse: true,
  },
  // No physics needed — we handle collision manually like the original
};

const game = new Phaser.Game(config);

// Prevent context menu
window.addEventListener('contextmenu', e => e.preventDefault());
