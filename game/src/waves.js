// The wave director: what shows up, when the wave is done, and how the
// pressure grows. The world asks it for the next wave's roster and whether
// anything hostile is still alive.
import { CFG } from './config.js';
import { spawnEdgeAsteroid, makeDrone } from './entities.js';

export class WaveDirector {
  constructor(rng, w, h) {
    this.rng = rng;
    this.w = w;
    this.h = h;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.betweenWaves = false;
  }

  startWave(n) {
    this.wave = n;
    const count = Math.min(CFG.waves.maxCount, CFG.waves.baseCount + CFG.waves.perWave * n);
    this.spawnQueue = [];
    for (let i = 0; i < count; i++) {
      // Early waves are all big slow rocks; small fast ones join later.
      const roll = this.rng();
      let size = 'large';
      if (n >= 2 && roll > 0.72) size = 'medium';
      if (n >= 4 && roll > 0.9) size = 'small';
      this.spawnQueue.push({ kind: 'asteroid', size });
    }
    const drones = n >= CFG.waves.droneFromWave
      ? Math.min(4, 1 + Math.floor((n - CFG.waves.droneFromWave) / 2))
      : 0;
    for (let i = 0; i < drones; i++) this.spawnQueue.push({ kind: 'drone' });
    // Shuffle so drones and rocks arrive mixed, not in clumps.
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
    this.spawnTimer = 0.4;
    this.betweenWaves = false;
  }

  // Trickle the roster in; returns the entities spawned this frame.
  update(dt, out) {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 0.55;
    const next = this.spawnQueue.shift();
    if (next.kind === 'asteroid') {
      const rock = spawnEdgeAsteroid(this.rng, next.size, this.w, this.h);
      // Later waves drift faster.
      const scale = 1 + CFG.waves.speedScale * (this.wave - 1);
      rock.vx *= scale;
      rock.vy *= scale;
      out.push(rock);
    } else {
      out.push(makeDrone(this.rng, this.w, this.h));
    }
  }

  // The wave is clear when nothing is left to spawn and nothing hostile
  // is still flying.
  isClear(asteroids, drones) {
    return this.spawnQueue.length === 0 && asteroids.length === 0 && drones.length === 0;
  }

  clearBonus() {
    return CFG.waves.clearBonus * this.wave;
  }
}
