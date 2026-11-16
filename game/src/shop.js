// The between-wave upgrade shop: five tracks, each with levels and a
// rising price. Buying applies the track's effect to the ship at once
// and is the game's real choice — spend now or save for the next wave.
import { CFG } from './config.js';

export class Shop {
  constructor() {
    this.levels = {};
    for (const u of CFG.upgrades) this.levels[u.id] = 0;
  }

  track(id) {
    return CFG.upgrades.find((u) => u.id === id);
  }

  level(id) {
    return this.levels[id] || 0;
  }

  maxed(id) {
    const t = this.track(id);
    return this.level(id) >= t.costs.length;
  }

  price(id) {
    const t = this.track(id);
    const lv = this.level(id);
    return lv >= t.costs.length ? null : t.costs[lv];
  }

  canBuy(id, credits) {
    const p = this.price(id);
    return p !== null && credits >= p;
  }

  buy(id, state) {
    const t = this.track(id);
    const p = this.price(id);
    if (p === null || state.credits < p) return false;
    state.credits -= p;
    this.levels[id]++;
    t.apply(state.ship);
    return true;
  }

  // One line per track for the HUD: name, description, level pips, price.
  rows() {
    return CFG.upgrades.map((t) => ({
      id: t.id,
      name: t.name,
      desc: t.desc,
      level: this.level(t.id),
      max: t.costs.length,
      price: this.price(t.id),
    }));
  }
}
