// Particles, shockwave rings and the parallax starfield. Nothing here
// knows about the rules — it only remembers sparks and draws them until
// they fade, so the world can celebrate or mourn with one call.
import { range } from './random.js';

export class Particles {
  constructor() {
    this.list = [];
    this.rings = [];
    this.shake = 0;
  }

  burst(x, y, color, n, speed, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.7);
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: life * (0.5 + Math.random() * 0.5), maxLife: life,
        size: size * (0.6 + Math.random() * 0.8), color,
      });
    }
  }

  ring(x, y, color, maxR) {
    this.rings.push({ x, y, r: 6, maxR, color, life: 0.45, maxLife: 0.45 });
  }

  trail(x, y, color) {
    this.list.push({
      x, y, vx: 0, vy: 0,
      life: 0.3, maxLife: 0.3, size: 5, color,
    });
  }

  addShake(amount) {
    this.shake = Math.min(16, this.shake + amount);
  }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 34);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      r.r = 6 + (r.maxR - 6) * (1 - r.life / r.maxLife);
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.list.length = 0;
    this.rings.length = 0;
    this.shake = 0;
  }
}

export function makeStars(rng, w, h) {
  const layers = [];
  for (let l = 0; l < 3; l++) {
    const stars = [];
    const count = [70, 50, 30][l];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rng() * w, y: rng() * h,
        size: [1, 1.4, 2][l],
        tw: rng() * Math.PI * 2,
        speed: [0.25, 0.5, 0.9][l],
      });
    }
    layers.push(stars);
  }
  return layers;
}

export function drawStars(ctx, layers, w, h, t, px, py) {
  for (const stars of layers) {
    for (const s of stars) {
      // Parallax: the field drifts against the ship so the void feels deep.
      const x = (((s.x - px * s.speed) % w) + w) % w;
      const y = (((s.y - py * s.speed) % h) + h) % h;
      const a = 0.45 + 0.4 * Math.sin(t * 1.6 + s.tw);
      ctx.globalAlpha = Math.max(0.1, Math.min(1, a));
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x, y, s.size, s.size);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawNebula(ctx, w, h) {
  const blobs = [
    [w * 0.22, h * 0.28, 260, 'rgba(124, 58, 237, 0.15)'],
    [w * 0.82, h * 0.66, 300, 'rgba(13, 148, 136, 0.12)'],
    [w * 0.62, h * 0.12, 200, 'rgba(196, 28, 131, 0.09)'],
  ];
  for (const [x, y, r, color] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
