// input.js — keyboard + mouse (pointer lock for aiming, drag fallback),
// plus mouse-wheel camera zoom and a self-describing control table the
// HUD's help line reads from, so the docs can never drift from the code.
export const BINDINGS = [
  { keys: 'W A S D', action: 'Move / drive' },
  { keys: 'Mouse', action: 'Look & aim (click the game to lock the mouse)' },
  { keys: 'Mouse wheel', action: 'Zoom the camera in / out' },
  { keys: 'Click / Space', action: 'Shoot the pistol' },
  { keys: 'E', action: 'Steal / enter a car, exit a car' },
  { keys: 'H', action: 'Horn (while driving)' },
  { keys: 'R', action: 'Reload' },
  { keys: 'Shift', action: 'Run' },
  { keys: 'P', action: 'Pause (progress saves)' },
  { keys: 'M', action: 'Mute' },
];

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since last poll()
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.mousePressed = false;
    this.pressedSet = new Set(); // snapshot of the last poll()'s presses
    this.wheelDelta = 0; // mouse-wheel steps since last poll()
    this.locked = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    // Wheel zoom: accumulate steps; the game consumes them in poll().
    // preventDefault keeps the page from scrolling while zooming.
    canvas.addEventListener('wheel', (e) => {
      this.wheelDelta += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.mousePressed = true;
      if (e.button === 0 && !this.locked && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(code) {
    return this.keys.has(code);
  }

  // True once per physical press; snapshot survives until the next poll().
  wasPressed(code) {
    return this.pressedSet.has(code);
  }

  // Drop all edge-triggered state without consuming it (e.g. on pause, so a
  // key pressed to pause does not also fire a shot on resume).
  clearPressed() {
    this.pressed.clear();
    this.pressedSet = new Set();
    this.mousePressed = false;
    this.wheelDelta = 0;
  }

  // Call once per frame: consume edge-triggered state.
  poll() {
    const p = {
      pressed: this.pressed,
      mouseDX: this.mouseDX,
      mouseDY: this.mouseDY,
      mousePressed: this.mousePressed,
      wheelDelta: this.wheelDelta,
    };
    this.pressedSet = this.pressed;
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mousePressed = false;
    this.wheelDelta = 0;
    return p;
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
