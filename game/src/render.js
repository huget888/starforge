// Everything the world draws, in draw order: field, ore, rocks, drones,
// ship, bullets, orbs, particles, popups. The HUD lives in hud.js; this
// file only paints what exists in space.
import { PAL } from './config.js';
import { ROCK_FILL } from './entities.js';

export function drawShip(ctx, ship, t) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  // Engine flame: flickers with thrust and flares on dash.
  const flame = ship.thrust > 0.1 ? 14 + Math.random() * 10 : 6 + Math.random() * 3;
  const flameLen = ship.dashTimer > 0 ? flame * 2.2 : flame;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = ship.dashTimer > 0 ? '#fde68a' : '#fb923c';
  ctx.beginPath();
  ctx.moveTo(-12, 5);
  ctx.lineTo(-12 - flameLen, 0);
  ctx.lineTo(-12, -5);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Hull: a chunky mining prow with a cargo jaw at the front.
  ctx.shadowColor = PAL.ship;
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#0e7490';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, 11);
  ctx.lineTo(-14, 6);
  ctx.lineTo(-14, -6);
  ctx.lineTo(-10, -11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PAL.ship;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-8, 8);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-8, -8);
  ctx.closePath();
  ctx.fill();
  // Cockpit and the ore scoop glow.
  ctx.fillStyle = PAL.shipCore;
  ctx.beginPath();
  ctx.arc(4, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.shard;
  ctx.beginPath();
  ctx.arc(14, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Invulnerability shimmer after a hit or a dash.
  if (ship.invuln > 0 && Math.floor(t * 18) % 2 === 0) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawAsteroid(ctx, rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.rot);
  ctx.beginPath();
  const n = rock.verts.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = rock.radius * rock.verts[i];
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = ROCK_FILL[rock.size];
  ctx.fill();
  ctx.strokeStyle = PAL.asteroidEdge;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Craters: seeded dots so each rock keeps its own face.
  ctx.fillStyle = PAL.asteroidDark;
  const craters = 3 + Math.floor(rock.seed * 3);
  for (let i = 0; i < craters; i++) {
    const a = rock.seed * 20 + i * 2.4;
    const d = rock.radius * (0.2 + ((i * 37) % 10) / 22);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, rock.radius * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  // Damage flash: the rock pales as its hull gives out.
  if (rock.hp < rock.maxHp) {
    ctx.globalAlpha = (1 - rock.hp / rock.maxHp) * 0.5;
    ctx.fillStyle = '#fca5a5';
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawShard(ctx, shard, t) {
  const pulse = 1 + 0.18 * Math.sin(t * 6 + shard.rot);
  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.rot + t * shard.spin * 0.2);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = PAL.shard;
  ctx.shadowBlur = 10;
  ctx.fillStyle = PAL.shard;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 8);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PAL.shardCore;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(2.4, 0);
  ctx.lineTo(0, 4);
  ctx.lineTo(-2.4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawDrone(ctx, drone, t) {
  ctx.save();
  ctx.translate(drone.x, drone.y);
  ctx.rotate(Math.sin(t * 2 + drone.seed * 9) * 0.25);
  ctx.shadowColor = PAL.drone;
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#701a75';
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(14, 11);
  ctx.lineTo(0, 6);
  ctx.lineTo(-14, 11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PAL.drone;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(10, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  // The eye: it brightens as the next shot charges.
  const charge = 1 - Math.max(0, drone.shotTimer) / 2.3;
  ctx.fillStyle = PAL.droneCore;
  ctx.globalAlpha = 0.5 + charge * 0.5;
  ctx.beginPath();
  ctx.arc(0, -2, 3 + charge * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawBullet(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.shadowColor = PAL.bullet;
  ctx.shadowBlur = 8;
  ctx.fillStyle = PAL.bullet;
  ctx.beginPath();
  ctx.roundRect(-9, -2.2, 18, 4.4, 2.2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-9, -1, 18, 2, 1);
  ctx.fill();
  ctx.restore();
}

export function drawOrb(ctx, o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.shadowColor = PAL.orb;
  ctx.shadowBlur = 12;
  ctx.fillStyle = PAL.orb;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawFloater(ctx, f) {
  const a = Math.max(0, f.life / f.maxLife);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = 'bold 17px "DejaVu Sans", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = f.color;
  ctx.fillText(f.text, f.x, f.y);
  ctx.restore();
}
