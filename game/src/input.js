// Keyboard and mouse state, kept in one place so the world never reads
// the DOM directly. Keys are tracked by code (layout independent); the
// mouse position is stored in game coordinates, scaled from the canvas.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    canvas.addEventListener('mousemove', (e) => this.updateMouse(e));
    canvas.addEventListener('mousedown', (e) => {
      this.updateMouse(e);
      this.mouseDown = true;
      this.mouseClicked = true;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  updateMouse(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - r.left - this.offsetX) / this.scale;
    this.mouseY = (e.clientY - r.top - this.offsetY) / this.scale;
  }

  // Called by the resize handler so mouse coordinates stay in game space.
  setViewport(scale, offsetX, offsetY) {
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // True only on the frame the key went down.
  hit(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }

  // True only on the frame the mouse button went down.
  click() {
    return this.mouseClicked;
  }

  firing() {
    return this.mouseDown || this.keys.has('Space');
  }

  // Call at the end of every frame: edge-triggered state lasts one frame.
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
