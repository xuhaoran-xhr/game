// ===========================
//  Particle Manager — polygon shard particles
// ===========================
import { rand, randInt } from '../utils.js';

export default class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5);
  }

  spawn(x, y, color, count, spd, life, sz) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(spd * 0.3, spd);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life, ml: life,
        r: rand(sz * 0.4, sz),
        color,
        sides: randInt(3, 5),
        rot: rand(0, Math.PI * 2),
        rotSpd: rand(-0.1, 0.1),
      });
    }
  }

  spawnSquares(x, y, color, count, spd, life, sz) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(spd * 0.3, spd);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life, ml: life,
        r: rand(sz * 0.4, sz),
        color,
        isSquare: true
      });
    }
  }

  update() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.rot += p.rotSpd;
      p.life--;
      return p.life > 0;
    });
  }

  draw() {
    const g = this.graphics;
    g.clear();
    this.particles.forEach(p => {
      const alpha = p.life / p.ml;
      const color = Phaser.Display.Color.HexStringToColor(p.color).color;
      g.fillStyle(color, alpha);
      
      if (p.isSquare) {
        g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        return;
      }

      g.beginPath();
      const sides = p.sides || 4;
      const r = p.r * Math.min(1, alpha * 2);
      for (let i = 0; i < sides; i++) {
        const a = (p.rot || 0) + (Math.PI * 2 / sides) * i;
        const px = p.x + Math.cos(a) * r;
        const py = p.y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
    });
  }

  clear() {
    this.particles = [];
    this.graphics.clear();
  }
}
