/* ============================================================
   input.js — Keyboard Input Handler
   P1: W A S D  +  G (light)  H (heavy)  J (kick)  K (special)
   P2: Arrow keys + Numpad 1/2/3/4
   ============================================================ */
'use strict';

const Input = (() => {
  const _held    = new Set();
  const _pressed = new Set();

  const BLOCK_KEYS = new Set([
    'Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'KeyW','KeyA','KeyS','KeyD',
    'KeyG','KeyH','KeyJ','KeyK',
    'Numpad1','Numpad2','Numpad3','Numpad4',
  ]);

  window.addEventListener('keydown', e => {
    if (BLOCK_KEYS.has(e.code)) e.preventDefault();
    if (!_held.has(e.code)) _pressed.add(e.code);
    _held.add(e.code);
  });

  window.addEventListener('keyup', e => {
    _held.delete(e.code);
  });

  return {
    /** Is key currently held down? */
    held: code => _held.has(code),
    /** Was key pressed THIS frame only? */
    pressed: code => _pressed.has(code),
    /** Call once per frame after reading inputs */
    flush() { _pressed.clear(); }
  };
})();
