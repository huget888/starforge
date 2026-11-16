// Everything that moves and collides: the ship, its bullets, the rocks,
// the ore they drop, the drones that shoot back, and the floating score
// popups. Plain objects, no classes — the world owns the arrays and
// passes them around, so a new entity is one push.
import { CFG } from './config.js';
import { range, pick } from './random.js';

export function makeShip(x, y) {
  return {
    kind: 'ship', x, y, vx: 0, vy: 0, angle: -Math.PI / 2,
    radius: CFG.ship.radius, hull: CFG.ship.hull, maxHull: CFG.ship.hull,
    fireTimer: 0, dashTimer: 0, dashCooldown: 0, invuln: 0,
    thrust: 0, alive: true,
    // Upgradeable stats, mutated by the shop.
    fireInterval: CFG.ship.fireInterval,
    bulletDamage: CFG.ship.bulletDamage,
    magnet: CFG.ship.magnet,
    dashCooldownMax: CFG.ship.dashCooldown,
  };
}

export function makeBullet(x, y, angle, damage) {
  return {
    kind: 'bullet', x, y,
    vx: Math.cos(angle) * CFG.ship.bulletSpeed,
    vy: Math.sin(angle) * CFG.ship.bulletSpeed,
    radius: 4, damage, life: 1.1,
  };
}

export function makeAsteroid(rng, size, x, y, vx, vy) {
  const spec = CFG.asteroid[size];
  const r = range(rng, spec.r[0], spec.r[1]);
  const speed = range(rng, spec.speed[0], spec.speed[1]);
  const a = rng() * Math.PI * 2;
  const verts = [];
  const n = 9 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    verts.push(range(rng, 0.72, 1.08));
  }
  return {
    kind: 'asteroid', size,
    x: x !== undefined ? x : 0,
    y: y !== undefined ? y : 0,
    vx: vx !== undefined ? vx : Math.cos(a) * speed,
    vy: vy !== undefined ? vy : Math.sin(a) * speed,
    radius: r, hp: spec.hp, maxHp: spec.hp,
    rot: rng() * Math.PI * 2,
    rotSpeed: range(rng, -0.9, 0.9),
    verts, seed: rng(),
  };
}

// Spawn just outside one edge of the view, drifting inward.
export function spawnEdgeAsteroid(rng, size, w, h) {
  const edge = Math.floor(rng() * 4);
  let x, y;
  if (edge === 0) { x = -70; y = rng() * h; }
  else if (edge === 1) { x = w + 70; y = rng() * h; }
  else if (edge === 2) { x = rng() * w; y = -70; }
  else { x = rng() * w; y = h + 70; }
  const rock = makeAsteroid(rng, size, x, y);
  // Steer the drift roughly toward the middle so rocks actually arrive.
  const cx = w / 2 - x;
  const cy = h / 2 - y;
  const len = Math.hypot(cx, cy) || 1;
  const sp = Math.hypot(rock.vx, rock.vy) || 50;
  const jitter = range(rng, -0.6, 0.6);
  const base = Math.atan2(cy, cx) + jitter;
  rock.vx = Math.cos(base) * sp;
  rock.vy = Math.sin(base) * sp;
  return rock;
}

export function splitAsteroid(rng, rock) {
  const kids = [];
  if (rock.size === 'large' || rock.size === 'medium') {
    const next = rock.size === 'large' ? 'medium' : 'small';
    for (let i = 0; i < 2; i++) {
      const k = makeAsteroid(rng, next, rock.x, rock.y);
      const a = rng() * Math.PI * 2;
      const sp = range(rng, 60, 130);
      k.vx = Math.cos(a) * sp;
      k.vy = Math.sin(a) * sp;
      kids.push(k);
    }
  }
  return kids;
}

export function makeShard(rng, x, y) {
  const a = rng() * Math.PI * 2;
  const sp = range(rng, 40, 140);
  return {
    kind: 'shard', x, y,
    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
    radius: CFG.shard.radius, value: CFG.shard.value,
    life: CFG.shard.life, spin: range(rng, -3, 3), rot: rng() * Math.PI,
  };
}

export function makeDrone(rng, w, h) {
  const edge = Math.floor(rng() * 4);
  let x, y;
  if (edge === 0) { x = -40; y = rng() * h; }
  else if (edge === 1) { x = w + 40; y = rng() * h; }
  else if (edge === 2) { x = rng() * w; y = -40; }
  else { x = rng() * w; y = h + 40; }
  return {
    kind: 'drone', x, y, vx: 0, vy: 0, radius: CFG.drone.r,
    hp: CFG.drone.hp, maxHp: CFG.drone.hp,
    shotTimer: range(rng, 1.2, 2.2), orbit: rng() * Math.PI * 2,
    seed: rng(),
  };
}

export function makeOrb(x, y, angle) {
  return {
    kind: 'orb', x, y,
    vx: Math.cos(angle) * CFG.drone.orbSpeed,
    vy: Math.sin(angle) * CFG.drone.orbSpeed,
    radius: 6, life: 4,
  };
}

export function makeFloater(x, y, text, color) {
  return { kind: 'floater', x, y, text, color: color || '#e2e8f0', life: 0.9, maxLife: 0.9 };
}

// Rock shapes differ per size so the player reads danger at a glance.
export const ROCK_FILL = { large: '#8a7a68', medium: '#7a6f5e', small: '#6b6156' };
export const ROCK_SCORE = { large: 40, medium: 20, small: 10 };
