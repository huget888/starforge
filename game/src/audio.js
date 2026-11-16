// All sound is synthesized with the Web Audio API — no audio files ship
// with the game. Every effect is a tiny oscillator/noise recipe so the
// game stays silent until the player first interacts (browser autoplay
// rules), then answers every action at once.
export class AudioBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  // Called from the first user gesture; safe to call more than once.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.42;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = src;
    if (lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      src.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  shoot() { this.tone(740, 0.09, 'square', 0.10, 210); }
  droneShot() { this.tone(320, 0.14, 'sawtooth', 0.07, 140); }
  explosion(big) {
    this.noise(big ? 0.5 : 0.28, big ? 0.5 : 0.3, 900);
    this.tone(big ? 110 : 150, big ? 0.45 : 0.25, 'sine', 0.35, 38);
  }
  pickup(step) {
    const base = 620 * Math.pow(1.059, Math.min(step, 12));
    this.tone(base, 0.09, 'sine', 0.14, base * 1.5);
  }
  hit() {
    this.tone(140, 0.18, 'sawtooth', 0.25, 60);
    this.noise(0.12, 0.2, 1400);
  }
  dash() { this.noise(0.18, 0.18, 3200); this.tone(300, 0.16, 'sine', 0.1, 900); }
  upgrade() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.16, 'triangle', 0.16), i * 70);
    });
  }
  waveHorn() {
    this.tone(196, 0.35, 'triangle', 0.2, 392);
    this.tone(294, 0.35, 'triangle', 0.12, 392);
  }
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.3, 'triangle', 0.18), i * 160);
    });
  }
  denied() { this.tone(180, 0.12, 'square', 0.12, 120); }

  // A slow two-note bass pulse that keeps the field feeling alive while
  // the player is mining. Called once per frame with the frame dt.
  tickMusic(dt) {
    if (!this.ctx || this.muted) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.52;
    const notes = [55, 0, 65.4, 0, 49, 0, 58.3, 0];
    const n = notes[this.musicStep % notes.length];
    this.musicStep++;
    if (n) this.tone(n, 0.5, 'sine', 0.05);
  }
}
