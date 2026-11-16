// Screenshot staging: reads ?shot=<name>&seed=<n> from the URL and builds
// a frozen, lively frame of the game — the same frame every render, so the
// screenshots are real renders of the game's own code, just staged.
// Names: start (title menu), play (mid-wave action), shop (forge shop),
// over (game-over card). With no query the game starts normally.
import { CFG } from './config.js';
import { mulberry32, range } from './random.js';
import { makeAsteroid, makeShard, makeDrone, makeBullet, makeFloater } from './entities.js';

export function shotParams() {
  const q = new URLSearchParams(window.location.search);
  return { shot: q.get('shot'), seed: Number(q.get('seed') || '7') };
}

function scatterRocks(g, n, sizes) {
  for (let i = 0; i < n; i++) {
    const size = sizes[i % sizes.length];
    const rock = makeAsteroid(g.rng, size,
      range(g.rng, 80, CFG.view.w - 80), range(g.rng, 90, CFG.view.h - 80));
    g.asteroids.push(rock);
  }
}

export function applyShot(g, name, seed) {
  g.rng = mulberry32(seed);
  g.shotMode = true;
  g.time = 0;
  if (name === 'start') {
    g.state = 'menu';
    g.best = 2480;
    scatterRocks(g, 6, ['large', 'medium', 'small']);
    return;
  }
  if (name === 'play') {
    g.state = 'playing';
    g.wave = 3;
    g.score = 1250;
    g.credits = 85;
    g.best = 2480;
    g.combo = { mult: 3, timer: 2.2, chain: 9 };
    g.ship.hull = 72;
    g.ship.x = CFG.view.w * 0.38;
    g.ship.y = CFG.view.h * 0.55;
    g.ship.angle = -0.5;
    g.ship.thrust = 1;
    scatterRocks(g, 9, ['large', 'medium', 'small', 'large', 'medium']);
    const drone = makeDrone(g.rng, CFG.view.w, CFG.view.h);
    drone.x = CFG.view.w * 0.78;
    drone.y = CFG.view.h * 0.3;
    drone.shotTimer = 0.8;
    g.drones.push(drone);
    for (let i = 0; i < 4; i++) {
      g.bullets.push(makeBullet(
        g.ship.x + 60 + i * 34, g.ship.y - 26 - i * 8, -0.45, 25));
    }
    for (let i = 0; i < 5; i++) {
      g.shards.push(makeShard(g.rng,
        g.ship.x + range(g.rng, -160, 200), g.ship.y + range(g.rng, -120, 120)));
    }
    g.floaters.push(makeFloater(g.ship.x + 120, g.ship.y - 90, '+40', '#fbbf24'));
    g.floaters.push(makeFloater(g.ship.x - 60, g.ship.y + 110, '+5', '#fbbf24'));
    g.particles.burst(g.ship.x + 320, g.ship.y - 140, '#fca5a5', 22, 260, 0.7, 3);
    g.particles.burst(g.ship.x + 320, g.ship.y - 140, '#fbbf24', 12, 180, 0.5, 2.5);
    g.particles.ring(g.ship.x + 320, g.ship.y - 140, '#fca5a5', 70);
    g.banner = 0;
    return;
  }
  if (name === 'shop') {
    g.state = 'shop';
    g.wave = 2;
    g.score = 980;
    g.credits = 120;
    g.best = 2480;
    g.lastBonus = 200;
    g.shop.buy('rapid', g);
    g.credits = 120;
    g.shopSel = 1;
    scatterRocks(g, 3, ['small', 'medium']);
    return;
  }
  if (name === 'over') {
    g.state = 'over';
    g.wave = 4;
    g.score = 2480;
    g.best = 2480;
    g.bestCombo = 4;
    g.ship.alive = false;
    g.ship.hull = 0;
    g.particles.burst(CFG.view.w / 2, CFG.view.h / 2, '#fca5a5', 40, 320, 1.0, 3.5);
    g.particles.burst(CFG.view.w / 2, CFG.view.h / 2, '#fbbf24', 20, 220, 0.8, 3);
    g.particles.ring(CFG.view.w / 2, CFG.view.h / 2, '#f87171', 130);
    scatterRocks(g, 4, ['medium', 'small']);
    return;
  }
}
