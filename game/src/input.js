// input.js — keyboard + mouse (pointer lock for aiming, drag fallback).
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

  // Call once per frame: consume edge-triggered state.
  poll() {
    const p = {
      pressed: this.pressed,
      mouseDX: this.mouseDX,
      mouseDY: this.mouseDY,
      mousePressed: this.mousePressed,
    };
    this.pressedSet = this.pressed;
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mousePressed = false;
    return p;
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
