/* ============================================================
   characters.js — Character Data + Side-Profile Fighter Sprites
   Classic 2D Fighting Game Stance (Street Fighter / Tekken Style)
   Drawings rendered facing RIGHT by default.
   `facing = -1` automatically flips canvas horizontally.
   ============================================================ */
'use strict';

/* ----------------------------------------------------------
   CHARACTER DEFINITIONS
   ---------------------------------------------------------- */
const CHAR_DATA = {
  BALE: {
    id: 'BALE', displayName: 'BALE',
    w: 62, h: 108,
    col: {
      primary:'#e74c3c', secondary:'#c0392b', accent:'#ff6b6b',
      skin:'#f5cba7', dark:'#7b241c', belt:'#d4ac0d',
      pants:'#2c2c2c', boot:'#1a0a0a', hair:'#111111'
    },
    stats: { maxHp:150, maxSt:100, speed:3.6, jumpPow:-15, weight:1.25 },
    moves: {
      light:   { dmg:8,  kbx:4,  kby:-2, range:68,  su:4,  act:5,  rec:8,  st:5,  name:'JAB'         },
      heavy:   { dmg:20, kbx:9,  kby:-3, range:72,  su:9,  act:6,  rec:17, st:13, name:'CROSS'        },
      kick:    { dmg:14, kbx:8,  kby:-5, range:82,  su:6,  act:7,  rec:12, st:9,  name:'STOMP'        },
      special: { dmg:42, kbx:5,  kby:-9, range:90,  su:14, act:12, rec:28, st:45, name:'GROUND SLAM'  },
    },
  },

  MODU: {
    id: 'MODU', displayName: 'MODU',
    w: 48, h: 100,
    col: {
      primary:'#00bcd4', secondary:'#00838f', accent:'#80deea',
      skin:'#f5cba7', dark:'#004d5e', belt:'#37474f',
      pants:'#1c2833', boot:'#0d1b22', hair:'#0a0a0a'
    },
    stats: { maxHp:110, maxSt:120, speed:5.6, jumpPow:-16.5, weight:0.82 },
    moves: {
      light:   { dmg:6,  kbx:3,  kby:-1, range:60,  su:2,  act:3,  rec:5,  st:4,  name:'SLASH'        },
      heavy:   { dmg:15, kbx:7,  kby:-2, range:66,  su:7,  act:5,  rec:13, st:10, name:'STRIKE'       },
      kick:    { dmg:11, kbx:9,  kby:-6, range:74,  su:4,  act:4,  rec:9,  st:7,  name:'SWEEP'        },
      special: { dmg:32, kbx:14, kby:-5, range:105, su:8,  act:22, rec:20, st:40, name:'SHADOW DASH'  },
    },
  },

  SUBBU: {
    id: 'SUBBU', displayName: 'SUBBU',
    w: 56, h: 105,
    col: {
      primary:'#27ae60', secondary:'#1e8449', accent:'#82e0aa',
      skin:'#d4a574', dark:'#145a32', belt:'#ca6f1e',
      pants:'#1a1a1a', boot:'#0d0d0d', hair:'#0a0a0a'
    },
    stats: { maxHp:130, maxSt:110, speed:4.2, jumpPow:-15.5, weight:1.0 },
    moves: {
      light:   { dmg:7,  kbx:4,  kby:-2, range:64,  su:3,  act:4,  rec:7,  st:5,  name:'PUNCH'        },
      heavy:   { dmg:18, kbx:8,  kby:-3, range:70,  su:8,  act:6,  rec:15, st:11, name:'SLAM'         },
      kick:    { dmg:13, kbx:7,  kby:-4, range:78,  su:5,  act:6,  rec:11, st:8,  name:'WHEEL KICK'   },
      special: { dmg:36, kbx:5,  kby:-3, range:88,  su:10, act:20, rec:25, st:42, name:'SPIN STRIKE'  },
    },
  },

  AMIT: {
    id: 'AMIT', displayName: 'AMIT',
    w: 50, h: 102,
    col: {
      primary:'#9b59b6', secondary:'#7d3c98', accent:'#d7bde2',
      skin:'#f5cba7', dark:'#4a235a', belt:'#f1c40f',
      pants:'#17202a', boot:'#0d0d0d', hair:'#0a0a0a'
    },
    stats: { maxHp:120, maxSt:130, speed:4.0, jumpPow:-15.2, weight:0.95 },
    moves: {
      light:   { dmg:7,  kbx:4,  kby:-2, range:65,  su:3,  act:4,  rec:7,  st:5,  name:'ZAP'          },
      heavy:   { dmg:17, kbx:8,  kby:-4, range:72,  su:7,  act:5,  rec:14, st:11, name:'BLAST'         },
      kick:    { dmg:12, kbx:7,  kby:-3, range:76,  su:5,  act:5,  rec:10, st:8,  name:'VOLT KICK'     },
      special: { dmg:34, kbx:11, kby:-5, range:999, su:16, act:8,  rec:24, st:45, name:'ENERGY BURST'  },
    },
  },
};

/* ----------------------------------------------------------
   SPRITE DRAWING
   ---------------------------------------------------------- */

/** Entry point: draw any character facing right (or mirrored left) */
function drawCharacter(ctx, charId, x, fy, facing, state, frame, opts = {}) {
  const d = CHAR_DATA[charId];
  if (!d) return;

  ctx.save();
  // Mirror canvas for left-facing characters
  if (facing === -1) {
    ctx.translate(x + d.w, 0);
    ctx.scale(-1, 1);
    x = 0;
  }

  switch (charId) {
    case 'BALE':  _drawBale (ctx, d, x, fy, state, frame, opts); break;
    case 'MODU':  _drawModu (ctx, d, x, fy, state, frame, opts); break;
    case 'SUBBU': _drawSubbu(ctx, d, x, fy, state, frame, opts); break;
    case 'AMIT':  _drawAmit (ctx, d, x, fy, state, frame, opts); break;
  }
  ctx.restore();
}

function _shadow(ctx, cx, fy, rx, ry) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, fy + 4, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ----------------------------------------------------------
   BALE — Red Heavy Brawler (Side Profile / Stance)
   ---------------------------------------------------------- */
function _drawBale(ctx, d, x, fy, state, frame, opts) {
  const C = d.col;
  const W = d.w; // 62

  let bob = 0, crouch = 0, punchExt = 0, kickExt = 0, recoilX = 0, specialFx = false;

  switch (state) {
    case 'IDLE':
      bob = Math.sin(frame * 0.08) * 3;
      break;
    case 'WALK_FWD': case 'WALK_BWD':
      bob = Math.sin(frame * 0.2) * 4;
      break;
    case 'JUMP_RISE': case 'JUMP_FALL':
      bob = -6;
      break;
    case 'CROUCH':
      crouch = 22;
      break;
    case 'ATTACK_LIGHT':
      punchExt = frame < 5 ? frame * 8 : Math.max(0, 40 - (frame - 5) * 15);
      break;
    case 'ATTACK_HEAVY':
      punchExt = frame < 8 ? frame * 7 : Math.max(0, 52 - (frame - 8) * 12);
      break;
    case 'ATTACK_KICK':
      kickExt = frame < 7 ? frame * 10 : Math.max(0, 65 - (frame - 7) * 16);
      break;
    case 'ATTACK_SPECIAL':
      specialFx = true;
      punchExt = frame > 8 ? 45 : frame * 5;
      break;
    case 'HIT':
      recoilX = -12;
      bob = -2;
      break;
    case 'KO':
      _drawKO(ctx, C, x, fy, W, d.h);
      return;
  }

  const bx = x + recoilX;
  const ty = fy + bob - crouch;

  _shadow(ctx, bx + W / 2, fy, W * 0.5, 7);

  if (specialFx) {
    ctx.save();
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(255,50,50,0.2)';
    ctx.fillRect(bx - 10, ty - d.h - 10, W + 45, d.h + 15);
    ctx.restore();
  }

  // --- REAR LEG (Back foot) ---
  ctx.fillStyle = C.pants;
  ctx.fillRect(bx + 6, ty - 52 + crouch, 18, 30);
  ctx.fillStyle = C.boot;
  ctx.fillRect(bx + 2, ty - 24 + crouch, 22, 24);

  // --- LEAD LEG (Front foot forward) ---
  ctx.fillStyle = C.dark;
  ctx.fillRect(bx + 26, ty - 52 + crouch, 20, 30);
  ctx.fillStyle = C.boot;
  ctx.fillRect(bx + 24 + (kickExt > 0 ? kickExt * 0.8 : 0), ty - 24 + crouch - (kickExt > 0 ? 15 : 0), 26, 24);

  // --- KICK EXTENSION ---
  if (kickExt > 0) {
    ctx.fillStyle = C.pants;
    ctx.fillRect(bx + 26, ty - 45 + crouch, kickExt, 18);
    ctx.fillStyle = C.boot;
    ctx.fillRect(bx + 26 + kickExt, ty - 48 + crouch, 28, 24);
  }

  // --- BELT & TORSO (Side Profile) ---
  const torsoH = 46 - crouch * 0.5 | 0;
  ctx.fillStyle = C.belt;
  ctx.fillRect(bx + 8, ty - 55 + crouch, 36, 7);

  // Torso turned sideways
  ctx.fillStyle = C.primary;
  ctx.fillRect(bx + 10, ty - 55 - torsoH + crouch * 0.5, 34, torsoH);
  // Vest front trim
  ctx.fillStyle = C.secondary;
  ctx.fillRect(bx + 34, ty - 55 - torsoH + crouch * 0.5, 10, torsoH);

  // --- REAR ARM (Guarding back) ---
  ctx.fillStyle = C.dark;
  ctx.fillRect(bx + 6, ty - 52 - torsoH * 0.7 + crouch * 0.5, 14, 26);
  ctx.fillStyle = C.secondary;
  ctx.fillRect(bx + 4, ty - 32 - torsoH * 0.7 + crouch * 0.5, 16, 16); // Fist

  // --- HEAD (Side Profile looking RIGHT) ---
  const neckY = ty - 55 - torsoH + crouch * 0.5 - 6;
  ctx.fillStyle = C.skin;
  ctx.fillRect(bx + 20, neckY, 14, 8);

  const headY = neckY - 28;
  const headX = bx + 16;
  // Face block
  ctx.fillStyle = C.skin;
  ctx.fillRect(headX, headY, 26, 28);
  // Hair (Short spiky cut facing right)
  ctx.fillStyle = C.hair;
  ctx.fillRect(headX - 4, headY - 4, 30, 10);
  ctx.fillRect(headX - 4, headY - 4, 10, 24); // back of hair
  ctx.fillRect(headX + 22, headY - 2, 8, 8);  // front bang

  // Eye looking RIGHT
  if (state === 'HIT') {
    ctx.fillStyle = C.hair;
    ctx.fillRect(headX + 16, headY + 12, 8, 4);
  } else {
    ctx.fillStyle = C.hair;
    ctx.fillRect(headX + 14, headY + 9, 8, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(headX + 18, headY + 10, 4, 4); // pupil looking right
    // Brow
    ctx.fillStyle = C.hair;
    ctx.fillRect(headX + 12, headY + 6, 11, 3);
  }
  // Nose / Jaw profile
  ctx.fillStyle = C.skin;
  ctx.fillRect(headX + 26, headY + 12, 4, 6); // nose bump right

  // --- LEAD ARM (Front Punch / Attack) ---
  ctx.fillStyle = C.primary;
  if (punchExt > 0) {
    // Punching forward to the right
    ctx.fillRect(bx + 34, ty - 55 - torsoH * 0.8 + crouch * 0.5, punchExt + 10, 14);
    ctx.fillStyle = C.accent;
    ctx.fillRect(bx + 34 + punchExt + 8, ty - 57 - torsoH * 0.8 + crouch * 0.5, 18, 18); // Big Fist right
  } else {
    // Guard stance (elbow bent forward)
    ctx.fillRect(bx + 26, ty - 50 - torsoH * 0.6 + crouch * 0.5, 16, 22);
    ctx.fillStyle = C.secondary;
    ctx.fillRect(bx + 34, ty - 45 - torsoH * 0.6 + crouch * 0.5, 16, 16); // Fist forward right
  }
}

/* ----------------------------------------------------------
   MODU — Cyan Speed Ninja (Side Profile Stance)
   ---------------------------------------------------------- */
function _drawModu(ctx, d, x, fy, state, frame, opts) {
  const C = d.col;
  const W = d.w; // 48

  let bob = 0, crouch = 0, punchExt = 0, kickExt = 0, recoilX = 0, specialFx = false;

  switch (state) {
    case 'IDLE':      bob = Math.sin(frame * 0.1) * 2.5; break;
    case 'WALK_FWD': case 'WALK_BWD': bob = Math.sin(frame * 0.22) * 3.5; break;
    case 'JUMP_RISE': case 'JUMP_FALL': bob = -6; break;
    case 'CROUCH':    crouch = 20; break;
    case 'ATTACK_LIGHT':
      punchExt = frame < 4 ? frame * 10 : Math.max(0, 40 - (frame - 4) * 16);
      break;
    case 'ATTACK_HEAVY':
      punchExt = frame < 6 ? frame * 8 : Math.max(0, 48 - (frame - 6) * 12);
      break;
    case 'ATTACK_KICK':
      kickExt = frame < 5 ? frame * 12 : Math.max(0, 60 - (frame - 5) * 18);
      break;
    case 'ATTACK_SPECIAL':
      specialFx = true; punchExt = 35;
      break;
    case 'HIT': recoilX = -10; break;
    case 'KO':  _drawKO(ctx, C, x, fy, W, d.h); return;
  }

  const bx = x + recoilX;
  const ty = fy + bob - crouch;

  _shadow(ctx, bx + W / 2, fy, W * 0.45, 6);

  if (specialFx) {
    ctx.save();
    ctx.shadowColor = '#00bcd4'; ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(0,188,212,0.2)';
    ctx.fillRect(bx - 10, ty - d.h - 10, W + 50, d.h + 15);
    ctx.restore();
  }

  // --- REAR LEG ---
  ctx.fillStyle = C.pants;
  ctx.fillRect(bx + 4, ty - 46 + crouch, 14, 26);
  ctx.fillStyle = C.boot;
  ctx.fillRect(bx + 1, ty - 20 + crouch, 18, 20);

  // --- LEAD LEG ---
  ctx.fillStyle = C.dark;
  ctx.fillRect(bx + 20, ty - 46 + crouch, 16, 26);
  ctx.fillStyle = C.boot;
  ctx.fillRect(bx + 22, ty - 20 + crouch, 20, 20);

  // --- KICK EXTENSION ---
  if (kickExt > 0) {
    ctx.fillStyle = C.pants;
    ctx.fillRect(bx + 20, ty - 38 + crouch, kickExt, 14);
    ctx.fillStyle = C.boot;
    ctx.fillRect(bx + 20 + kickExt, ty - 40 + crouch, 22, 18);
  }

  // --- TORSO (Slim Ninja Side View) ---
  const torsoH = 42 - crouch * 0.5 | 0;
  ctx.fillStyle = C.belt;
  ctx.fillRect(bx + 6, ty - 48 + crouch, 28, 5);
  ctx.fillStyle = C.accent;
  ctx.fillRect(bx + 2, ty - 48 + crouch, 6, 12); // Ribbon trailing behind left

  ctx.fillStyle = C.primary;
  ctx.fillRect(bx + 8, ty - 48 - torsoH + crouch * 0.5, 26, torsoH);
  ctx.fillStyle = C.secondary;
  ctx.fillRect(bx + 24, ty - 48 - torsoH + crouch * 0.5, 10, torsoH);

  // --- REAR ARM ---
  ctx.fillStyle = C.dark;
  ctx.fillRect(bx + 4, ty - 44 - torsoH * 0.7 + crouch * 0.5, 12, 22);

  // --- HEAD (Ninja Mask Side Profile) ---
  const neckY = ty - 48 - torsoH + crouch * 0.5 - 5;
  const headY = neckY - 26;
  const headX = bx + 12;

  ctx.fillStyle = C.secondary;
  ctx.fillRect(headX, headY, 24, 26);
  // Headband trailing behind
  ctx.fillStyle = C.accent;
  ctx.fillRect(headX - 8, headY + 2, 10, 5);
  ctx.fillRect(headX - 12, headY + 5, 8, 4);

  // Eye slit facing right
  ctx.fillStyle = C.skin;
  ctx.fillRect(headX + 12, headY + 7, 10, 7);
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(headX + 15, headY + 8, 5, 4); // Glowing cyan ninja eye right

  // --- LEAD ARM (Slash / Punch right) ---
  ctx.fillStyle = C.primary;
  if (punchExt > 0) {
    ctx.fillRect(bx + 26, ty - 48 - torsoH * 0.75 + crouch * 0.5, punchExt + 10, 11);
    ctx.fillStyle = C.accent;
    ctx.fillRect(bx + 26 + punchExt + 6, ty - 50 - torsoH * 0.75 + crouch * 0.5, 16, 15);
  } else {
    ctx.fillRect(bx + 20, ty - 44 - torsoH * 0.6 + crouch * 0.5, 14, 18);
    ctx.fillStyle = C.secondary;
    ctx.fillRect(bx + 26, ty - 38 - torsoH * 0.6 + crouch * 0.5, 13, 13);
  }
}

/* ----------------------------------------------------------
   SUBBU — Green Balanced Warrior (Side Profile Stance)
   ---------------------------------------------------------- */
function _drawSubbu(ctx, d, x, fy, state, frame, opts) {
  const C = d.col;
  const W = d.w; // 56

  let bob = 0, crouch = 0, punchExt = 0, kickExt = 0, recoilX = 0, specialFx = false;

  switch (state) {
    case 'IDLE':      bob = Math.sin(frame * 0.08) * 3; break;
    case 'WALK_FWD': case 'WALK_BWD': bob = Math.sin(frame * 0.2) * 3.5; break;
    case 'JUMP_RISE': case 'JUMP_FALL': bob = -5; break;
    case 'CROUCH':    crouch = 20; break;
    case 'ATTACK_LIGHT':
      punchExt = frame < 5 ? frame * 8 : Math.max(0, 38 - (frame - 5) * 14);
      break;
    case 'ATTACK_HEAVY':
      punchExt = frame < 7 ? frame * 7 : Math.max(0, 48 - (frame - 7) * 11);
      break;
    case 'ATTACK_KICK':
      kickExt = frame < 6 ? frame * 10 : Math.max(0, 62 - (frame - 6) * 16);
      break;
    case 'ATTACK_SPECIAL':
      specialFx = true; punchExt = 32;
      break;
    case 'HIT': recoilX = -10; break;
    case 'KO':  _drawKO(ctx, C, x, fy, W, d.h); return;
  }

  const bx = x + recoilX;
  const ty = fy + bob - crouch;

  _shadow(ctx, bx + W / 2, fy, W * 0.5, 7);

  if (specialFx) {
    ctx.save();
    ctx.shadowColor = C.primary; ctx.shadowBlur = 25;
    ctx.fillStyle = 'rgba(39,174,96,0.2)';
    ctx.fillRect(bx - 10, ty - d.h - 10, W + 45, d.h + 15);
    ctx.restore();
  }

  // --- LEGS (Staggered Warrior Stance) ---
  ctx.fillStyle = C.pants;
  ctx.fillRect(bx + 6, ty - 50 + crouch, 16, 28);
  ctx.fillStyle = C.boot;
  ctx.fillRect(bx + 2, ty - 24 + crouch, 20, 24);

  ctx.fillStyle = C.dark;
  ctx.fillRect(bx + 24, ty - 50 + crouch, 18, 28);
  ctx.fillStyle = C.boot;
  ctx.fillRect(bx + 24, ty - 24 + crouch, 24, 24);

  if (kickExt > 0) {
    ctx.fillStyle = C.pants;
    ctx.fillRect(bx + 24, ty - 42 + crouch, kickExt, 16);
    ctx.fillStyle = C.boot;
    ctx.fillRect(bx + 24 + kickExt, ty - 44 + crouch, 24, 20);
  }

  // --- TORSO ---
  const torsoH = 44 - crouch * 0.5 | 0;
  ctx.fillStyle = C.belt;
  ctx.fillRect(bx + 8, ty - 53 + crouch, 32, 6);

  ctx.fillStyle = C.dark;
  ctx.fillRect(bx + 10, ty - 53 - torsoH + crouch * 0.5, 30, torsoH);
  ctx.fillStyle = C.primary;
  ctx.fillRect(bx + 22, ty - 53 - torsoH + crouch * 0.5, 18, torsoH);

  // --- REAR ARM ---
  ctx.fillStyle = C.dark;
  ctx.fillRect(bx + 4, ty - 48 - torsoH * 0.7 + crouch * 0.5, 13, 24);

  // --- HEAD (Side Profile looking RIGHT) ---
  const neckY = ty - 53 - torsoH + crouch * 0.5 - 5;
  const headY = neckY - 28;
  const headX = bx + 15;

  ctx.fillStyle = C.skin;
  ctx.fillRect(headX, headY, 25, 28);
  ctx.fillStyle = C.hair;
  ctx.fillRect(headX - 3, headY - 4, 28, 8);
  ctx.fillRect(headX + 10, headY - 10, 8, 10); // Warrior crest hair

  // Eye
  ctx.fillStyle = C.hair;
  ctx.fillRect(headX + 13, headY + 9, 8, 8);
  ctx.fillStyle = '#a5d6a7';
  ctx.fillRect(headX + 17, headY + 10, 4, 4);

  // --- LEAD ARM ---
  ctx.fillStyle = C.dark;
  if (punchExt > 0) {
    ctx.fillRect(bx + 30, ty - 53 - torsoH * 0.8 + crouch * 0.5, punchExt + 10, 13);
    ctx.fillStyle = C.skin;
    ctx.fillRect(bx + 30 + punchExt + 6, ty - 55 - torsoH * 0.8 + crouch * 0.5, 18, 17);
  } else {
    ctx.fillRect(bx + 24, ty - 48 - torsoH * 0.6 + crouch * 0.5, 15, 20);
    ctx.fillStyle = C.skin;
    ctx.fillRect(bx + 30, ty - 42 - torsoH * 0.6 + crouch * 0.5, 15, 15);
  }
}

/* ----------------------------------------------------------
   AMIT — Purple Technical Fighter (Side Profile Stance)
   ---------------------------------------------------------- */
function _drawAmit(ctx, d, x, fy, state, frame, opts) {
  const C = d.col;
  const W = d.w; // 50

  let bob = 0, crouch = 0, punchExt = 0, kickExt = 0, recoilX = 0, specialFx = false, glowPulse = 0;

  switch (state) {
    case 'IDLE':
      bob = Math.sin(frame * 0.08) * 2.5;
      glowPulse = (Math.sin(frame * 0.1) * 0.5 + 0.5);
      break;
    case 'WALK_FWD': case 'WALK_BWD': bob = Math.sin(frame * 0.2) * 3; break;
    case 'JUMP_RISE': case 'JUMP_FALL': bob = -5; break;
    case 'CROUCH':    crouch = 20; break;
    case 'ATTACK_LIGHT':
      punchExt = frame < 5 ? frame * 8 : Math.max(0, 38 - (frame - 5) * 14);
      glowPulse = 1;
      break;
    case 'ATTACK_HEAVY':
      punchExt = frame < 7 ? frame * 7 : Math.max(0, 48 - (frame - 7) * 11);
      glowPulse = 1;
      break;
    case 'ATTACK_KICK':
      kickExt = frame < 6 ? frame * 10 : Math.max(0, 60 - (frame - 6) * 15);
      break;
    case 'ATTACK_SPECIAL':
      specialFx = true; glowPulse = 1; punchExt = 30;
      break;
    case 'HIT': recoilX = -10; break;
    case 'KO':  _drawKO(ctx, C, x, fy, W, d.h); return;
  }

  const bx = x + recoilX;
  const ty = fy + bob - crouch;

  _shadow(ctx, bx + W / 2, fy, W * 0.48, 6);

  if (specialFx || glowPulse > 0.5) {
    ctx.save();
    ctx.shadowColor = C.primary; ctx.shadowBlur = 25;
    ctx.restore();
  }

  // --- LEGS ---
  ctx.fillStyle = C.pants;
  ctx.fillRect(bx + 5, ty - 48 + crouch, 15, 26);
  ctx.fillStyle = C.boot;
  ctx.fillRect(bx + 2, ty - 22 + crouch, 18, 22);

  ctx.fillStyle = C.pants;
  ctx.fillRect(bx + 22, ty - 48 + crouch, 17, 26);
  ctx.fillStyle = C.boot;
  ctx.fillRect(bx + 22, ty - 22 + crouch, 22, 22);

  if (kickExt > 0) {
    ctx.fillStyle = C.pants;
    ctx.fillRect(bx + 22, ty - 40 + crouch, kickExt, 14);
    ctx.fillStyle = C.boot;
    ctx.fillRect(bx + 22 + kickExt, ty - 42 + crouch, 22, 18);
  }

  // --- TORSO ---
  const torsoH = 42 - crouch * 0.5 | 0;
  ctx.fillStyle = C.belt;
  ctx.fillRect(bx + 6, ty - 50 + crouch, 30, 6);

  ctx.fillStyle = C.primary;
  ctx.fillRect(bx + 8, ty - 50 - torsoH + crouch * 0.5, 28, torsoH);
  ctx.fillStyle = C.accent;
  ctx.fillRect(bx + 28, ty - 50 - torsoH + crouch * 0.5 + 4, 3, torsoH - 8);

  // --- REAR ARM ---
  ctx.fillStyle = C.secondary;
  ctx.fillRect(bx + 4, ty - 46 - torsoH * 0.7 + crouch * 0.5, 12, 22);

  // --- HEAD (Side Profile with Goggles looking RIGHT) ---
  const neckY = ty - 50 - torsoH + crouch * 0.5 - 4;
  const headY = neckY - 26;
  const headX = bx + 13;

  ctx.fillStyle = C.skin;
  ctx.fillRect(headX, headY, 24, 26);
  ctx.fillStyle = C.hair;
  ctx.fillRect(headX - 2, headY - 3, 26, 8);
  ctx.fillRect(headX + 16, headY - 3, 8, 12); // hair sweep

  // Tech Visor/Goggles (Side View pointing right)
  ctx.fillStyle = C.dark;
  ctx.fillRect(headX + 6, headY + 8, 18, 9);
  ctx.fillStyle = C.accent;
  ctx.fillRect(headX + 12, headY + 9, 11, 7); // Visor front right

  // --- LEAD ARM ---
  ctx.fillStyle = C.secondary;
  if (punchExt > 0) {
    ctx.fillRect(bx + 26, ty - 50 - torsoH * 0.8 + crouch * 0.5, punchExt + 10, 12);
    ctx.fillStyle = C.accent;
    ctx.fillRect(bx + 26 + punchExt + 6, ty - 52 - torsoH * 0.8 + crouch * 0.5, 17, 16);
  } else {
    ctx.fillRect(bx + 20, ty - 46 - torsoH * 0.6 + crouch * 0.5, 14, 18);
    ctx.fillStyle = C.accent;
    ctx.fillRect(bx + 26, ty - 40 - torsoH * 0.6 + crouch * 0.5, 14, 14);
  }
}

/* ----------------------------------------------------------
   KO pose — character lies flat on the ground
   ---------------------------------------------------------- */
function _drawKO(ctx, C, x, fy, W, H) {
  const col = C.primary || '#888';
  ctx.fillStyle = col;
  ctx.fillRect(x - H * 0.3, fy - 18, H * 0.8, 18);
  ctx.fillStyle = C.skin || '#f5cba7';
  ctx.fillRect(x - H * 0.3 - 20, fy - 20, 28, 20);
  ctx.fillStyle = C.pants || '#222';
  ctx.fillRect(x + H * 0.4, fy - 14, 30, 14);
}
