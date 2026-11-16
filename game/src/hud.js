// The HUD and every screen around the action: the title menu, the
// in-game readout, the upgrade shop and the game-over card. All of it is
// drawn on the canvas so a screenshot always shows the whole game.
import { PAL, CFG } from './config.js';

const FONT = '"DejaVu Sans", Verdana, sans-serif';

function panel(ctx, x, y, w, h, r) {
  ctx.fillStyle = PAL.panel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = PAL.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(h, w * Math.max(0, Math.min(1, frac))), h, h / 2);
  ctx.fill();
}

export function drawHud(ctx, g) {
  const w = CFG.view.w;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Top-left: hull and dash.
  ctx.fillStyle = PAL.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText('HULL', 24, 34);
  const hullFrac = g.ship.hull / g.ship.maxHull;
  bar(ctx, 76, 22, 190, 16, hullFrac, hullFrac > 0.35 ? PAL.ok : PAL.danger);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = PAL.dim;
  ctx.fillText(`${Math.ceil(g.ship.hull)} / ${g.ship.maxHull}`, 276, 35);
  ctx.fillStyle = PAL.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText('DASH', 24, 62);
  const dashFrac = 1 - Math.max(0, g.ship.dashCooldown) / g.ship.dashCooldownMax;
  bar(ctx, 76, 50, 190, 10, dashFrac, PAL.ship);
  if (g.ship.dashCooldown <= 0) {
    ctx.fillStyle = PAL.ship;
    ctx.fillText('READY', 276, 61);
  }
  // Top-centre: wave and score.
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.text;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText(`WAVE ${g.wave}`, w / 2, 38);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = PAL.gold;
  ctx.fillText(`SCORE ${g.score.toLocaleString('en-US')}`, w / 2, 66);
  // Top-right: credits, combo and mute.
  ctx.textAlign = 'right';
  ctx.fillStyle = PAL.gold;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(`◈ ${g.credits}`, w - 24, 36);
  if (g.combo.mult > 1) {
    ctx.fillStyle = '#f0abfc';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`COMBO ×${g.combo.mult}`, w - 24, 64);
  }
  ctx.fillStyle = PAL.dim;
  ctx.font = `14px ${FONT}`;
  ctx.fillText(g.audio.muted ? 'M — sound off' : 'M — mute', w - 24, 88);
  // Bottom hints, fading after the first wave.
  if (g.wave <= 1 && g.state === 'playing') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.font = `15px ${FONT}`;
    ctx.fillText('WASD / arrows — fly      mouse — aim      click / space — fire      SHIFT — dash      P — pause', w / 2, CFG.view.h - 18);
  }
  // Wave banner (the first seconds of a wave).
  if (g.banner > 0) {
    const a = Math.min(1, g.banner);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.text;
    ctx.font = `bold 54px ${FONT}`;
    ctx.fillText(`WAVE ${g.wave}`, w / 2, CFG.view.h / 2 - 40);
    ctx.font = `22px ${FONT}`;
    ctx.fillStyle = PAL.dim;
    ctx.fillText(g.wave === 1 ? 'Mine the rocks. Bank the ore. Survive.' : 'Clear every rock and drone', w / 2, CFG.view.h / 2 - 6);
    ctx.restore();
  }
}

export function drawMenu(ctx, g) {
  const w = CFG.view.w;
  const h = CFG.view.h;
  ctx.fillStyle = 'rgba(4, 6, 15, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.ship;
  ctx.font = `bold 92px ${FONT}`;
  ctx.fillText('STARFORGE', w / 2, 208);
  ctx.fillStyle = PAL.gold;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText('— ASTEROID MINER —', w / 2, 252);
  ctx.fillStyle = PAL.text;
  ctx.font = `20px ${FONT}`;
  ctx.fillText('Blast the rocks. Haul the ore. Spend it between waves. Don’t get hit.', w / 2, 306);
  ctx.fillStyle = PAL.dim;
  ctx.font = `18px ${FONT}`;
  ctx.fillText('WASD / arrows — fly      mouse — aim      click / space — fire', w / 2, 342);
  ctx.fillText('SHIFT — dash through danger      P — pause      M — mute', w / 2, 372);
  // Launch button.
  const bx = w / 2 - 190;
  const by = 420;
  panel(ctx, bx, by, 380, 64, 12);
  ctx.fillStyle = PAL.ship;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText('▶  LAUNCH  (Enter)', w / 2, by + 42);
  if (g.best > 0) {
    ctx.fillStyle = PAL.gold;
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`Best score: ${g.best.toLocaleString('en-US')}`, w / 2, 530);
  }
  ctx.fillStyle = PAL.dim;
  ctx.font = `15px ${FONT}`;
  ctx.fillText('3 waves in, drones start shooting back. Clear a wave to open the forge shop.', w / 2, h - 28);
}

export function drawShop(ctx, g) {
  const w = CFG.view.w;
  const h = CFG.view.h;
  ctx.fillStyle = 'rgba(4, 6, 15, 0.62)';
  ctx.fillRect(0, 0, w, h);
  const pw = 760;
  const px = (w - pw) / 2;
  const py = 92;
  panel(ctx, px, py, pw, 500, 16);
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.gold;
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText('FORGE SHOP', w / 2, py + 56);
  ctx.fillStyle = PAL.text;
  ctx.font = `20px ${FONT}`;
  ctx.fillText(`Wave ${g.wave} cleared  ·  bonus +${g.lastBonus}  ·  you hold ◈ ${g.credits}`, w / 2, py + 92);
  const rows = g.shop.rows();
  let y = py + 122;
  rows.forEach((row, i) => {
    const afford = g.shop.canBuy(row.id, g.credits);
    const ry = y + i * 58;
    ctx.fillStyle = i === g.shopSel ? 'rgba(34, 211, 238, 0.12)' : 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.roundRect(px + 24, ry, pw - 48, 48, 10);
    ctx.fill();
    ctx.strokeStyle = i === g.shopSel ? PAL.ship : PAL.panelEdge;
    ctx.lineWidth = i === g.shopSel ? 2 : 1;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = PAL.text;
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(`${i + 1}. ${row.name}`, px + 44, ry + 21);
    ctx.fillStyle = PAL.dim;
    ctx.font = `16px ${FONT}`;
    ctx.fillText(row.desc, px + 44, ry + 41);
    // Level pips.
    for (let p = 0; p < row.max; p++) {
      ctx.fillStyle = p < row.level ? PAL.gold : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(px + pw - 190 + p * 22, ry + 24, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'right';
    if (row.price === null) {
      ctx.fillStyle = PAL.dim;
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText('MAX', px + pw - 44, ry + 30);
    } else {
      ctx.fillStyle = afford ? PAL.gold : PAL.danger;
      ctx.font = `bold 19px ${FONT}`;
      ctx.fillText(`◈ ${row.price}`, px + pw - 44, ry + 30);
    }
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.ship;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('ENTER — next wave', w / 2, py + 122 + rows.length * 58 + 30);
  ctx.fillStyle = PAL.dim;
  ctx.font = `16px ${FONT}`;
  ctx.fillText('Click a row or press 1–5 to buy. Upgrades stay for the whole run.', w / 2, py + 122 + rows.length * 58 + 58);
}

export function drawGameOver(ctx, g) {
  const w = CFG.view.w;
  const h = CFG.view.h;
  ctx.fillStyle = 'rgba(20, 4, 8, 0.6)';
  ctx.fillRect(0, 0, w, h);
  const pw = 560;
  const px = (w - pw) / 2;
  const py = 150;
  panel(ctx, px, py, pw, 380, 16);
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.danger;
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText('SHIP LOST', w / 2, py + 78);
  ctx.fillStyle = PAL.text;
  ctx.font = `24px ${FONT}`;
  ctx.fillText(`Score  ${g.score.toLocaleString('en-US')}`, w / 2, py + 138);
  ctx.fillText(`Wave reached  ${g.wave}`, w / 2, py + 176);
  ctx.fillText(`Best combo  ×${g.bestCombo}`, w / 2, py + 214);
  ctx.fillStyle = PAL.gold;
  ctx.font = `bold 22px ${FONT}`;
  if (g.score >= g.best && g.score > 0) {
    ctx.fillText('★ NEW BEST SCORE ★', w / 2, py + 258);
  } else {
    ctx.fillText(`Best score  ${g.best.toLocaleString('en-US')}`, w / 2, py + 258);
  }
  ctx.fillStyle = PAL.ship;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('Press R or click to fly again', w / 2, py + 320);
}

export function drawPaused(ctx) {
  const w = CFG.view.w;
  const h = CFG.view.h;
  ctx.fillStyle = 'rgba(4, 6, 15, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.text;
  ctx.font = `bold 54px ${FONT}`;
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.fillStyle = PAL.dim;
  ctx.font = `20px ${FONT}`;
  ctx.fillText('P or Esc — resume      R — restart run', w / 2, h / 2 + 32);
}
