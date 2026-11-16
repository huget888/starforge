// STARFORGE — Asteroid Miner. The game loop, the state machine and every
// rule: flying, shooting, splitting rocks, banking ore, the shop, and
// losing the ship. Rendering lives in render.js and hud.js; this file
// only decides what happens next.
import { CFG, PAL } from './config.js';
import { mulberry32, clamp, dist2, angleTo, range } from './random.js';
import { AudioBank } from './audio.js';
import { Input } from './input.js';
import { Particles, makeStars, drawStars, drawNebula } from './particles.js';
import { WaveDirector } from './waves.js';
import { Shop } from './shop.js';
import {
  makeShip, makeBullet, makeShard, makeOrb, makeFloater, makeAsteroid,
  splitAsteroid, ROCK_SCORE,
} from './entities.js';
import {
  drawShip, drawAsteroid, drawShard, drawDrone, drawBullet, drawOrb, drawFloater,
} from './render.js';
import { drawHud, drawMenu, drawShop, drawGameOver, drawPaused } from './hud.js';
import { shotParams, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CFG.view.w;
canvas.height = CFG.view.h;

const input = new Input(canvas);
const audio = new AudioBank();
const particles = new Particles();

const G = {
  state: 'menu', // menu | playing | shop | over | paused
  time: 0,
  score: 0, credits: 0, wave: 0,
  best: 0, bestCombo: 0,
  combo: { mult: 1, timer: 0, chain: 0 },
  ship: null, bullets: [], asteroids: [], shards: [], drones: [], orbs: [], floaters: [],
  director: null, shop: new Shop(), shopSel: 0,
  banner: 0, lastBonus: 0,
  stars: null, rng: mulberry32((Math.random() * 1e9) | 0),
  audio, input, particles, shotMode: false, shotTicks: 0,
};

try { G.best = Number(localStorage.getItem('starforge-best') || 0); } catch (e) { G.best = 0; }

function saveBest() {
  try { localStorage.setItem('starforge-best', String(G.best)); } catch (e) { /* private mode */ }
}

function resetRun() {
  G.score = 0;
  G.credits = 0;
  G.wave = 0;
  G.bestCombo = 0;
  G.combo = { mult: 1, timer: 0, chain: 0 };
  G.ship = makeShip(CFG.view.w / 2, CFG.view.h / 2);
  G.bullets = [];
  G.asteroids = [];
  G.shards = [];
  G.drones = [];
  G.orbs = [];
  G.floaters = [];
  G.director = new WaveDirector(G.rng, CFG.view.w, CFG.view.h);
  G.shop = new Shop();
  G.shopSel = 0;
  G.banner = 0;
  G.lastBonus = 0;
  particles.clear();
}

function startWave(n) {
  G.wave = n;
  G.director.startWave(n);
  G.banner = 2.2;
  G.state = 'playing';
  audio.waveHorn();
}

function startRun() {
  resetRun();
  startWave(1);
}

function addScore(base, x, y) {
  const pts = base * G.combo.mult;
  G.score += pts;
  G.floaters.push(makeFloater(x, y, `+${pts}`, '#e2e8f0'));
}

function chainKill() {
  G.combo.chain += 1;
  G.combo.timer = CFG.combo.window;
  G.combo.mult = Math.min(CFG.combo.maxMult, 1 + Math.floor(G.combo.chain / 4));
  G.bestCombo = Math.max(G.bestCombo, G.combo.mult);
}

function damageShip(amount, x, y) {
  const ship = G.ship;
  if (!ship.alive || ship.invuln > 0 || ship.dashTimer > 0) return;
  ship.hull -= amount;
  ship.invuln = 0.9;
  particles.addShake(9);
  particles.burst(x, y, '#f87171', 16, 240, 0.5, 3);
  audio.hit();
  if (ship.hull <= 0) {
    ship.hull = 0;
    ship.alive = false;
    particles.burst(ship.x, ship.y, '#fca5a5', 46, 340, 1.0, 3.5);
    particles.burst(ship.x, ship.y, '#fbbf24', 22, 240, 0.8, 3);
    particles.ring(ship.x, ship.y, '#f87171', 130);
    particles.addShake(14);
    audio.explosion(true);
    audio.gameOver();
    if (G.score > G.best) { G.best = G.score; saveBest(); }
    G.state = 'over';
  }
}

function destroyAsteroid(i, byBullet) {
  const rock = G.asteroids[i];
  G.asteroids.splice(i, 1);
  particles.burst(rock.x, rock.y, '#d6c9b8', rock.size === 'large' ? 26 : 14, 240, 0.6, 3);
  particles.ring(rock.x, rock.y, '#a8a29e', rock.radius + 26);
  particles.addShake(rock.size === 'large' ? 6 : 3);
  audio.explosion(rock.size === 'large');
  for (const k of splitAsteroid(G.rng, rock)) G.asteroids.push(k);
  const spec = CFG.asteroid[rock.size];
  for (let s = 0; s < spec.shards; s++) G.shards.push(makeShard(G.rng, rock.x, rock.y));
  if (byBullet) {
    chainKill();
    addScore(ROCK_SCORE[rock.size], rock.x, rock.y);
  }
}

function updatePlaying(dt) {
  const ship = G.ship;
  // --- steering ---
  const ix = (input.down('KeyD', 'ArrowRight') ? 1 : 0) - (input.down('KeyA', 'ArrowLeft') ? 1 : 0);
  const iy = (input.down('KeyS', 'ArrowDown') ? 1 : 0) - (input.down('KeyW', 'ArrowUp') ? 1 : 0);
  ship.thrust = Math.hypot(ix, iy);
  if (ship.dashTimer > 0) {
    ship.dashTimer -= dt;
  } else {
    ship.vx += ix * CFG.ship.accel * dt;
    ship.vy += iy * CFG.ship.accel * dt;
    ship.vx *= Math.pow(CFG.ship.drag, dt * 60);
    ship.vy *= Math.pow(CFG.ship.drag, dt * 60);
    const sp = Math.hypot(ship.vx, ship.vy);
    if (sp > CFG.ship.maxSpeed) {
      ship.vx = (ship.vx / sp) * CFG.ship.maxSpeed;
      ship.vy = (ship.vy / sp) * CFG.ship.maxSpeed;
    }
  }
  ship.x = clamp(ship.x + ship.vx * dt, 20, CFG.view.w - 20);
  ship.y = clamp(ship.y + ship.vy * dt, 20, CFG.view.h - 20);
  ship.angle = angleTo(ship.x, ship.y, input.mouseX || ship.x + 1, input.mouseY || ship.y);
  ship.invuln = Math.max(0, ship.invuln - dt);
  ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);
  if (input.hit('ShiftLeft', 'ShiftRight') && ship.dashCooldown <= 0) {
    ship.dashTimer = CFG.ship.dashTime;
    ship.dashCooldown = ship.dashCooldownMax;
    ship.invuln = Math.max(ship.invuln, CFG.ship.dashInvuln);
    ship.vx = Math.cos(ship.angle) * CFG.ship.dashSpeed;
    ship.vy = Math.sin(ship.angle) * CFG.ship.dashSpeed;
    particles.burst(ship.x, ship.y, '#67e8f9', 10, 160, 0.35, 2.5);
    audio.dash();
  }
  // Engine trail.
  if (ship.thrust > 0.1 && Math.random() < 0.6) {
    particles.trail(ship.x - Math.cos(ship.angle) * 14, ship.y - Math.sin(ship.angle) * 14, '#fb923c');
  }
  // --- firing ---
  ship.fireTimer -= dt;
  if (input.firing() && ship.fireTimer <= 0) {
    ship.fireTimer = ship.fireInterval;
    const a = ship.angle + (Math.random() - 0.5) * 0.03;
    G.bullets.push(makeBullet(
      ship.x + Math.cos(a) * 20, ship.y + Math.sin(a) * 20, a, ship.bulletDamage));
    audio.shoot();
  }
  // --- bullets ---
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -40 || b.x > CFG.view.w + 40 || b.y < -40 || b.y > CFG.view.h + 40) {
      G.bullets.splice(i, 1);
    }
  }
  // --- asteroids drift, wrap, and get shot ---
  for (let i = G.asteroids.length - 1; i >= 0; i--) {
    const r = G.asteroids[i];
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.rot += r.rotSpeed * dt;
    if (r.x < -r.radius - 20) r.x = CFG.view.w + r.radius + 20;
    if (r.x > CFG.view.w + r.radius + 20) r.x = -r.radius - 20;
    if (r.y < -r.radius - 20) r.y = CFG.view.h + r.radius + 20;
    if (r.y > CFG.view.h + r.radius + 20) r.y = -r.radius - 20;
    for (let j = G.bullets.length - 1; j >= 0; j--) {
      const b = G.bullets[j];
      if (dist2(b.x, b.y, r.x, r.y) < (r.radius + b.radius) * (r.radius + b.radius)) {
        G.bullets.splice(j, 1);
        r.hp -= b.damage;
        particles.burst(b.x, b.y, '#67e8f9', 6, 160, 0.3, 2);
        if (r.hp <= 0) { destroyAsteroid(i, true); }
        break;
      }
    }
  }
  // --- drones hunt and shoot ---
  for (let i = G.drones.length - 1; i >= 0; i--) {
    const d = G.drones[i];
    d.orbit += dt * 0.5;
    const wantX = ship.x + Math.cos(d.orbit) * 260;
    const wantY = ship.y + Math.sin(d.orbit) * 200;
    d.vx = (wantX - d.x) * 0.8;
    d.vy = (wantY - d.y) * 0.8;
    d.x = clamp(d.x + d.vx * dt, 20, CFG.view.w - 20);
    d.y = clamp(d.y + d.vy * dt, 20, CFG.view.h - 20);
    d.shotTimer -= dt;
    if (d.shotTimer <= 0 && ship.alive) {
      d.shotTimer = CFG.drone.shotInterval * range(G.rng, 0.85, 1.15);
      G.orbs.push(makeOrb(d.x, d.y, angleTo(d.x, d.y, ship.x, ship.y)));
      audio.droneShot();
    }
    for (let j = G.bullets.length - 1; j >= 0; j--) {
      const b = G.bullets[j];
      if (dist2(b.x, b.y, d.x, d.y) < (d.radius + b.radius) * (d.radius + b.radius)) {
        G.bullets.splice(j, 1);
        d.hp -= b.damage;
        particles.burst(b.x, b.y, '#e879f9', 6, 160, 0.3, 2);
        if (d.hp <= 0) {
          G.drones.splice(i, 1);
          particles.burst(d.x, d.y, '#e879f9', 24, 260, 0.6, 3);
          particles.ring(d.x, d.y, '#f0abfc', 60);
          audio.explosion(false);
          for (let s = 0; s < 3; s++) G.shards.push(makeShard(G.rng, d.x, d.y));
          chainKill();
          addScore(CFG.drone.score, d.x, d.y);
        }
        break;
      }
    }
  }
  // --- enemy orbs ---
  for (let i = G.orbs.length - 1; i >= 0; i--) {
    const o = G.orbs[i];
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (o.life <= 0 || o.x < -20 || o.x > CFG.view.w + 20 || o.y < -20 || o.y > CFG.view.h + 20) {
      G.orbs.splice(i, 1);
      continue;
    }
    if (ship.alive && dist2(o.x, o.y, ship.x, ship.y) < (o.radius + ship.radius - 4) ** 2) {
      G.orbs.splice(i, 1);
      damageShip(10, ship.x, ship.y);
    }
  }
  // --- ore shards: magnet pull, then bank ---
  for (let i = G.shards.length - 1; i >= 0; i--) {
    const s = G.shards[i];
    s.life -= dt;
    if (s.life <= 0) { G.shards.splice(i, 1); continue; }
    const d2 = dist2(s.x, s.y, ship.x, ship.y);
    if (ship.alive && d2 < ship.magnet * ship.magnet) {
      const d = Math.sqrt(d2) || 1;
      const pull = 900 * (1 - d / ship.magnet) + 120;
      s.vx += ((ship.x - s.x) / d) * pull * dt;
      s.vy += ((ship.y - s.y) / d) * pull * dt;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.96;
    s.vy *= 0.96;
    if (ship.alive && d2 < (ship.radius + s.radius + 6) ** 2) {
      G.shards.splice(i, 1);
      G.credits += s.value;
      G.score += s.value * G.combo.mult;
      particles.burst(s.x, s.y, '#fbbf24', 5, 120, 0.3, 2);
      audio.pickup(G.combo.chain);
    }
  }
  // --- ship vs rock ---
  if (ship.alive) {
    for (let i = G.asteroids.length - 1; i >= 0; i--) {
      const r = G.asteroids[i];
      const rr = r.radius + ship.radius - 4;
      if (dist2(r.x, r.y, ship.x, ship.y) < rr * rr) {
        const dmg = r.size === 'large' ? 18 : r.size === 'medium' ? 12 : 8;
        damageShip(dmg, ship.x, ship.y);
        // The rock bounces off and cracks a little.
        const a = angleTo(ship.x, ship.y, r.x, r.y);
        r.vx = Math.cos(a) * 130;
        r.vy = Math.sin(a) * 130;
        r.hp -= 25;
        if (r.hp <= 0) destroyAsteroid(i, false);
        if (!ship.alive) break;
      }
    }
  }
  // --- combo decay ---
  if (G.combo.timer > 0) {
    G.combo.timer -= dt;
    if (G.combo.timer <= 0) {
      G.combo.mult = 1;
      G.combo.chain = 0;
    }
  }
  // --- spawner and wave clear ---
  const spawned = [];
  G.director.update(dt, spawned);
  for (const e of spawned) {
    if (e.kind === 'drone') G.drones.push(e);
    else G.asteroids.push(e);
  }
  if (G.director.isClear(G.asteroids, G.drones)) {
    const bonus = G.director.clearBonus();
    G.lastBonus = bonus;
    G.score += bonus;
    G.credits += bonus;
    G.floaters.push(makeFloater(CFG.view.w / 2, CFG.view.h / 2 - 80, `WAVE CLEAR  +${bonus}`, '#fbbf24'));
    audio.upgrade();
    G.state = 'shop';
  }
  G.banner = Math.max(0, G.banner - dt);
  audio.tickMusic(dt);
}

function updateFloaters(dt) {
  for (let i = G.floaters.length - 1; i >= 0; i--) {
    const f = G.floaters[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) G.floaters.splice(i, 1);
  }
}

function update(dt) {
  G.time += dt;
  particles.update(dt);
  updateFloaters(dt);
  if (G.state === 'menu') {
    for (const r of G.asteroids) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += r.rotSpeed * dt;
      if (r.x < -80) r.x = CFG.view.w + 80;
      if (r.x > CFG.view.w + 80) r.x = -80;
      if (r.y < -80) r.y = CFG.view.h + 80;
      if (r.y > CFG.view.h + 80) r.y = -80;
    }
    if (input.hit('Enter', 'Space') || input.click()) {
      audio.unlock();
      startRun();
    }
  } else if (G.state === 'playing') {
    updatePlaying(dt);
    if (input.hit('KeyP', 'Escape')) G.state = 'paused';
  } else if (G.state === 'paused') {
    if (input.hit('KeyP', 'Escape')) G.state = 'playing';
    if (input.hit('KeyR')) startRun();
  } else if (G.state === 'shop') {
    if (input.hit('ArrowUp', 'KeyW')) G.shopSel = (G.shopSel + 4) % 5;
    if (input.hit('ArrowDown', 'KeyS')) G.shopSel = (G.shopSel + 1) % 5;
    for (let n = 0; n < 5; n++) {
      if (input.hit(`Digit${n + 1}`, `Numpad${n + 1}`)) {
        const id = CFG.upgrades[n].id;
        if (G.shop.buy(id, G)) audio.upgrade();
        else audio.denied();
      }
    }
    if (input.click()) {
      const row = shopRowAt(input.mouseX, input.mouseY);
      if (row >= 0) {
        const id = CFG.upgrades[row].id;
        if (G.shop.buy(id, G)) audio.upgrade();
        else audio.denied();
      }
    }
    if (input.hit('Enter')) startWave(G.wave + 1);
  } else if (G.state === 'over') {
    if (input.hit('KeyR', 'Enter', 'Space') || input.click()) {
      resetRun();
      G.state = 'menu';
    }
  }
  if (input.hit('KeyM')) audio.toggleMute();
}

function shopRowAt(mx, my) {
  const pw = 760;
  const px = (CFG.view.w - pw) / 2;
  const py = 92;
  const y0 = py + 122;
  if (mx < px + 24 || mx > px + pw - 24) return -1;
  for (let i = 0; i < 5; i++) {
    const ry = y0 + i * 58;
    if (my >= ry && my <= ry + 48) return i;
  }
  return -1;
}

function render() {
  const w = CFG.view.w;
  const h = CFG.view.h;
  ctx.save();
  if (particles.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * particles.shake, (Math.random() - 0.5) * particles.shake);
  }
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, PAL.bg0);
  bg.addColorStop(1, PAL.bg1);
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  drawNebula(ctx, w, h);
  const px = G.ship ? G.ship.x - w / 2 : 0;
  const py = G.ship ? G.ship.y - h / 2 : 0;
  drawStars(ctx, G.stars, w, h, G.time, px, py);
  for (const s of G.shards) drawShard(ctx, s, G.time);
  for (const r of G.asteroids) drawAsteroid(ctx, r);
  for (const d of G.drones) drawDrone(ctx, d, G.time);
  if (G.ship && G.ship.alive && (G.state === 'playing' || G.state === 'paused' || G.state === 'shop')) {
    drawShip(ctx, G.ship, G.time);
  }
  for (const b of G.bullets) drawBullet(ctx, b);
  for (const o of G.orbs) drawOrb(ctx, o);
  particles.draw(ctx);
  for (const f of G.floaters) drawFloater(ctx, f);
  ctx.restore();
  if (G.state === 'menu') drawMenu(ctx, G);
  else if (G.state === 'playing' || G.state === 'paused') {
    drawHud(ctx, G);
    if (G.state === 'paused') drawPaused(ctx);
  } else if (G.state === 'shop') {
    drawHud(ctx, G);
    drawShop(ctx, G);
  } else if (G.state === 'over') {
    drawHud(ctx, G);
    drawGameOver(ctx, G);
  }
}

function fit() {
  const scale = Math.min(window.innerWidth / CFG.view.w, window.innerHeight / CFG.view.h);
  canvas.style.width = `${Math.floor(CFG.view.w * scale)}px`;
  canvas.style.height = `${Math.floor(CFG.view.h * scale)}px`;
  input.setViewport(scale, 0, 0);
}
window.addEventListener('resize', fit);
fit();

// Boot: fresh menu, then a staged shot if the URL asks for one.
G.stars = makeStars(G.rng, CFG.view.w, CFG.view.h);
resetRun();
G.state = 'menu';
// A few slow rocks drifting behind the title so the menu feels alive.
for (let i = 0; i < 5; i++) {
  const rock = makeAsteroid(G.rng, i % 2 ? 'medium' : 'large',
    range(G.rng, 60, CFG.view.w - 60), range(G.rng, 90, CFG.view.h - 60));
  G.asteroids.push(rock);
}
// Debug/test hook: the playtest driver reads the live state through it.
window.__game = G;
window.__shotReady = false;
if (params.shot) {
  applyShot(G, params.shot, params.seed);
  // Settle the staged frame with fixed steps, then hold it frozen.
  for (let i = 0; i < 40; i++) {
    G.time += 1 / 60;
    particles.update(1 / 60);
    updateFloaters(1 / 60);
  }
  render();
  window.__shotReady = true;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, Math.max(0.0001, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
