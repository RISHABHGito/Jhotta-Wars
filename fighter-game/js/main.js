/* ============================================================
   main.js — BLOCK BRAWL Game Engine
   Physics · Combat · AI · HUD · Effects · Round System
   ============================================================ */
'use strict';

/* ============================================================
   CONSTANTS
   ============================================================ */
const GW = 1200;          // canvas logical width
const GH = 620;           // canvas logical height
const GROUND_Y  = 490;    // feet stand here
const GRAVITY   = 0.72;
const MAX_FALL  = 20;
const PUSH_SEP  = 6;      // push-apart enforced gap (px)
const STAGE_L   = 30;     // left wall
const STAGE_R   = 1170;   // right wall
const ROUND_SEC = 60;     // timer per round

/* ============================================================
   AUDIO (Web Audio API — synthesised SFX)
   ============================================================ */
const Audio = (() => {
  let ctx = null;
  function _ctx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function tone(freq, type, dur, vol = 0.3, detune = 0) {
    try {
      const ac = _ctx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type; osc.frequency.value = freq;
      osc.detune.value = detune;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  function noise(dur, vol = 0.2) {
    try {
      const ac = _ctx();
      const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      const gain = ac.createGain();
      src.buffer = buf; src.connect(gain); gain.connect(ac.destination);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      src.start(); src.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  return {
    hitLight()   { tone(180, 'square', 0.08, 0.25); noise(0.05, 0.15); },
    hitHeavy()   { tone(90,  'sawtooth', 0.15, 0.4); noise(0.12, 0.3); },
    hitBlock()   { tone(300, 'triangle', 0.1, 0.2); },
    hitKick()    { tone(130, 'sawtooth', 0.1, 0.3); noise(0.07, 0.2); },
    special()    { tone(220, 'sine', 0.05, 0.2); tone(440, 'sine', 0.3, 0.3, 1200); },
    ko()         { tone(55, 'sawtooth', 0.5, 0.5); tone(44, 'sine', 0.8, 0.3); },
    jump()       { tone(200, 'sine', 0.08, 0.1); },
    fightStart() { tone(660, 'square', 0.1, 0.4); setTimeout(() => tone(880, 'square', 0.2, 0.4), 120); },
    roundWin()   { [523,659,784,1047].forEach((f,i) => setTimeout(() => tone(f,'square',0.15,0.35), i*100)); },
    projectile() { tone(500, 'sine', 0.04, 0.15); },
  };
})();

/* ============================================================
   PARTICLE EFFECTS
   ============================================================ */
const Particles = (() => {
  const list = [];
  function spawn(x, y, col, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (opts.spd || 3) + Math.random() * (opts.spd || 3);
      list.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - (opts.upBias || 1),
        life: 1,
        decay: 0.04 + Math.random() * 0.04,
        size: (opts.size || 4) + Math.random() * (opts.size || 3),
        col,
        gravity: opts.gravity !== false,
        square: opts.square || false,
      });
    }
  }
  function update() {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x  += p.vx; p.y += p.vy;
      if (p.gravity) p.vy += 0.3;
      p.vx *= 0.93; p.life -= p.decay;
      if (p.life <= 0) list.splice(i, 1);
    }
  }
  function draw(ctx) {
    list.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.col;
      if (p.square) {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }
  return { spawn, update, draw };
})();

/* ============================================================
   PROJECTILE SYSTEM (for AMIT's Energy Burst)
   ============================================================ */
const Projectiles = (() => {
  const list = [];
  function spawn(x, y, dir, ownerId) {
    Audio.projectile();
    list.push({ x, y, vx: dir * 14, vy: 0, ownerId, w: 24, h: 12, alive: true, frame: 0 });
  }
  function update(fighters) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx; p.frame++;
      if (p.x < -50 || p.x > GW + 50) { list.splice(i, 1); continue; }
      // hit check
      fighters.forEach(f => {
        if (f.id === p.ownerId || f.state === 'KO') return;
        const fb = f.getHurtbox();
        if (p.x < fb.r && p.x + p.w > fb.l && p.y < fb.b && p.y + p.h > fb.t) {
          const move = CHAR_DATA[f.charId === 'BALE' ? 'AMIT' : 'BALE'].moves.special; // approx
          f.takeHit(22, p.vx > 0 ? 10 : -10, -5, false, 'ENERGY BURST');
          Particles.spawn(p.x, p.y, '#ce93d8', 10, { spd: 5, size: 5, square: true });
          list.splice(i, 1);
        }
      });
    }
  }
  function draw(ctx) {
    list.forEach(p => {
      const pulse = Math.sin(p.frame * 0.4) * 0.3 + 0.7;
      ctx.save();
      ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 14;
      ctx.fillStyle = `rgba(206,147,216,${pulse})`;
      ctx.fillRect(p.x, p.y - p.h / 2, p.w, p.h);
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x + 4, p.y - 3, p.w - 8, 6);
      ctx.restore();
    });
  }
  function clear() { list.length = 0; }
  return { spawn, update, draw, clear };
})();

/* ============================================================
   FIGHTER CLASS
   ============================================================ */
class Fighter {
  constructor(charId, x, facing, isPlayer, id) {
    this.id       = id;          // 'p1' or 'p2'
    this.charId   = charId;
    this.isPlayer = isPlayer;
    const d       = CHAR_DATA[charId];
    this.w        = d.w;
    this.h        = d.h;
    this.x        = x;          // left edge
    this.fy       = GROUND_Y;   // feet Y
    this.vx       = 0;
    this.vy       = 0;
    this.facing   = facing;     // 1=right, -1=left
    this.grounded = true;

    this.maxHp    = d.stats.maxHp;
    this.hp       = this.maxHp;
    this.maxSt    = d.stats.maxSt;
    this.st       = this.maxSt;
    this.speed    = d.stats.speed;
    this.jumpPow  = d.stats.jumpPow;
    this.weight   = d.stats.weight;

    this.state      = 'IDLE';
    this.stateFrame = 0;

    // Combat timers (frames)
    this.hitStun       = 0;
    this.blockStun     = 0;
    this.attackActive  = false;
    this.attackType    = null;
    this.attackHit     = false; // did this attack already hit?
    this.invFrames     = 0;
    this.specialCD     = 0;

    this.animFrame  = 0;        // raw frame counter for animations
    this.wins       = 0;
  }

  /* ---- reset for new round ---- */
  reset(x, facing) {
    this.x = x; this.fy = GROUND_Y;
    this.vx = 0; this.vy = 0;
    this.facing = facing; this.grounded = true;
    this.hp = this.maxHp; this.st = this.maxSt;
    this.state = 'IDLE'; this.stateFrame = 0;
    this.hitStun = 0; this.blockStun = 0;
    this.attackActive = false; this.attackType = null; this.attackHit = false;
    this.invFrames = 0; this.specialCD = 0;
    this.animFrame = 0;
  }

  /* ---- hurtbox (body that receives hits) ---- */
  getHurtbox() {
    const cr = this.state === 'CROUCH' ? 0.65 : 1;
    return {
      l: this.x + 4,
      r: this.x + this.w - 4,
      t: this.fy - this.h * cr,
      b: this.fy,
    };
  }

  /* ---- hitbox (active during attack frames) ---- */
  getHitbox() {
    if (!this.attackActive || this.attackHit) return null;
    const move = CHAR_DATA[this.charId].moves[this.attackType];
    if (!move) return null;
    const ox = this.facing === 1 ? this.x + this.w : this.x - move.range;
    const h  = CHAR_DATA[this.charId];
    return {
      l: ox,
      r: ox + move.range,
      t: this.fy - this.h * 0.7,
      b: this.fy - this.h * 0.1,
      move,
    };
  }

  /* ---- enemy reference (set by Game) ---- */
  setEnemy(enemy) { this.enemy = enemy; }

  /* ---- take a hit ---- */
  takeHit(dmg, kbx, kby, blocked, moveName) {
    if (this.invFrames > 0 || this.state === 'KO') return;
    if (blocked) {
      this.hp -= dmg * 0.15 | 0;
      this.blockStun = 12;
      Audio.hitBlock();
      Particles.spawn(this.x + this.w / 2, this.fy - this.h * 0.5, '#aaa', 5, { spd: 2 });
    } else {
      this.hp -= dmg;
      this.hitStun = 18 + (dmg > 15 ? 10 : 0);
      this.vx = kbx;
      this.vy = kby;
      this.grounded = false;
      this.state = 'HIT';
      this.stateFrame = 0;
      this.invFrames = 12;
      const hitCol = dmg > 20 ? '#ff4444' : dmg > 12 ? '#ffaa00' : '#fff';
      Particles.spawn(this.x + this.w / 2, this.fy - this.h * 0.5, hitCol, dmg > 20 ? 14 : 7, { spd: 5 + dmg * 0.2, size: 4, square: true });
      Game.shakeScreen(dmg > 20 ? 10 : 5, dmg > 15 ? 8 : 4);
      // floaty hit text
      Game.spawnHitText(moveName, this.x + this.w / 2, this.fy - this.h * 0.9, hitCol);
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'KO';
      this.stateFrame = 0;
      this.vx = 0; this.vy = 0;
      Audio.ko();
    }
  }

  /* ---- try to attack ---- */
  startAttack(type) {
    if (this.hitStun > 0 || this.blockStun > 0) return;
    if (['ATTACK_LIGHT','ATTACK_HEAVY','ATTACK_KICK','ATTACK_SPECIAL'].includes(this.state)) return;
    if (this.state === 'KO') return;
    const move = CHAR_DATA[this.charId].moves[type];
    if (!move) return;
    if (type === 'special' && (this.specialCD > 0 || this.st < move.st)) return;
    if (this.st < move.st) return;

    this.st = Math.max(0, this.st - move.st);
    this.state = 'ATTACK_' + type.toUpperCase();
    this.stateFrame = 0;
    this.attackType = type;
    this.attackActive = false;
    this.attackHit = false;
    if (type === 'special') { this.specialCD = 300; Audio.special(); }
  }

  /* ---- jump ---- */
  tryJump() {
    if (!this.grounded || this.hitStun > 0) return;
    this.vy = this.jumpPow;
    this.grounded = false;
    this.state = 'JUMP_RISE';
    this.stateFrame = 0;
    Audio.jump();
  }

  /* ---- per-frame update ---- */
  update() {
    this.animFrame++;
    if (this.invFrames  > 0) this.invFrames--;
    if (this.hitStun    > 0) this.hitStun--;
    if (this.blockStun  > 0) this.blockStun--;
    if (this.specialCD  > 0) this.specialCD--;
    this.stateFrame++;

    // Stamina regen
    if (!['ATTACK_LIGHT','ATTACK_HEAVY','ATTACK_KICK','ATTACK_SPECIAL'].includes(this.state)) {
      this.st = Math.min(this.maxSt, this.st + 0.15);
    }

    // KO — no further processing
    if (this.state === 'KO') {
      this._applyPhysics();
      return;
    }

    // Attack state machine
    if (this.state.startsWith('ATTACK_')) {
      this._updateAttack();
    }

    // Hit recovery
    if (this.state === 'HIT' && this.hitStun <= 0 && this.grounded) {
      this.state = 'IDLE'; this.stateFrame = 0;
    }

    this._applyPhysics();
    this._clampToStage();
    this._updateFacing();
  }

  _updateAttack() {
    const type = this.attackType;
    const move = CHAR_DATA[this.charId].moves[type];
    if (!move) return;

    const sf = this.stateFrame;
    // startup -> active window
    if (sf >= move.su && sf < move.su + move.act) {
      this.attackActive = true;
    } else {
      this.attackActive = false;
    }
    // recovery end
    if (sf >= move.su + move.act + move.rec) {
      this.state = this.grounded ? 'IDLE' : 'JUMP_FALL';
      this.stateFrame = 0;
      this.attackActive = false;
      this.attackType = null;
    }

    // AMIT special: spawn projectile at end of startup
    if (this.charId === 'AMIT' && type === 'special' && sf === move.su) {
      const px = this.facing === 1 ? this.x + this.w + 10 : this.x - 34;
      Projectiles.spawn(px, this.fy - this.h * 0.55, this.facing, this.id);
    }
  }

  _applyPhysics() {
    // Gravity
    if (!this.grounded) {
      this.vy = Math.min(this.vy + GRAVITY * this.weight, MAX_FALL);
    }
    // Friction (horizontal)
    if (this.grounded && !['WALK_FWD','WALK_BWD'].includes(this.state)) {
      this.vx *= 0.7;
    }
    this.x  += this.vx;
    this.fy += this.vy;

    // Ground check
    if (this.fy >= GROUND_Y) {
      this.fy = GROUND_Y;
      this.vy = 0;
      this.grounded = true;
      if (this.state === 'JUMP_FALL' || this.state === 'JUMP_RISE') {
        this.state = 'IDLE'; this.stateFrame = 0;
      }
    } else {
      this.grounded = false;
      if (this.vy < 0) this.state = 'JUMP_RISE';
      else if (this.vy > 0 && !this.state.startsWith('ATTACK')) this.state = 'JUMP_FALL';
    }
  }

  _clampToStage() {
    if (this.x < STAGE_L)              this.x = STAGE_L;
    if (this.x + this.w > STAGE_R)     this.x = STAGE_R - this.w;
  }

  _updateFacing() {
    if (!this.enemy) return;
    if (this.state === 'KO') return;
    if (this.state.startsWith('ATTACK')) return;
    if (this.hitStun > 0 || this.blockStun > 0) return;
    // Face toward enemy
    const ex = this.enemy.x + this.enemy.w / 2;
    const mx = this.x + this.w / 2;
    if (ex > mx) this.facing = 1;
    else          this.facing = -1;
  }

  /* ---- draw ---- */
  draw(ctx) {
    drawCharacter(ctx, this.charId, this.x, this.fy, this.facing, this.state, this.animFrame);
    // Debug: uncomment to see hitboxes
    // const hb = this.getHurtbox();
    // ctx.strokeStyle = 'lime'; ctx.lineWidth = 1;
    // ctx.strokeRect(hb.l, hb.t, hb.r-hb.l, hb.b-hb.t);
  }
}

/* ============================================================
   CPU AI
   ============================================================ */
class CpuAI {
  constructor(me, enemy) {
    this.me = me;
    this.enemy = enemy;
    this.decisionTimer = 0;
    this.action = 'approach';
    this.actionFrames = 0;
    this.reactionDelay = 20; // frames before reacting
  }

  update(roundPhase) {
    if (roundPhase !== 'FIGHT') return;
    const me = this.me, en = this.enemy;
    if (me.state === 'KO') return;

    this.decisionTimer++;
    this.actionFrames++;

    const dist = Math.abs((me.x + me.w / 2) - (en.x + en.w / 2));
    const hpRatio = me.hp / me.maxHp;

    // Re-decide every 25-45 frames
    if (this.decisionTimer >= this.reactionDelay + (Math.random() * 20 | 0)) {
      this.decisionTimer = 0;
      this._decide(dist, hpRatio);
    }

    this._execute(dist);
  }

  _decide(dist, hpRatio) {
    if (hpRatio < 0.2) {
      // low HP: mix retreat and attack
      const r = Math.random();
      if (r < 0.4) this.action = 'retreat';
      else if (r < 0.7) this.action = 'attack_light';
      else this.action = 'approach';
    } else if (dist > 220) {
      this.action = Math.random() < 0.7 ? 'approach' : 'idle';
    } else if (dist < 80) {
      const r = Math.random();
      if (r < 0.12) this.action = 'jump';
      else if (r < 0.2) this.action = 'special';
      else if (r < 0.45) this.action = 'attack_light';
      else if (r < 0.65) this.action = 'attack_heavy';
      else this.action = 'retreat';
    } else {
      const r = Math.random();
      if (r < 0.12) this.action = 'jump';
      else if (r < 0.25) this.action = 'attack_kick';
      else if (r < 0.48) this.action = 'attack_light';
      else if (r < 0.62) this.action = 'attack_heavy';
      else if (r < 0.72) this.action = 'block';
      else if (r < 0.85) this.action = 'approach';
      else this.action = 'retreat';
    }
  }

  _execute(dist) {
    const me = this.me;
    if (me.hitStun > 0 || me.blockStun > 0) return;
    if (['ATTACK_LIGHT','ATTACK_HEAVY','ATTACK_KICK','ATTACK_SPECIAL'].includes(me.state)) return;

    const dir = me.facing;

    switch (this.action) {
      case 'approach':
        me.vx = dir * me.speed * 0.85;
        if (!me.state.startsWith('ATTACK') && me.state !== 'HIT') me.state = 'WALK_FWD';
        break;

      case 'retreat':
        me.vx = -dir * me.speed * 0.7;
        if (!me.state.startsWith('ATTACK') && me.state !== 'HIT') me.state = 'WALK_BWD';
        break;

      case 'jump':
        me.tryJump(); this.action = 'approach';
        break;

      case 'block':
        me.state = 'CROUCH';
        me.blockStun = 15;
        break;

      case 'attack_light':
        if (dist < 120) { me.startAttack('light'); this.action = 'approach'; }
        else this.action = 'approach';
        break;

      case 'attack_heavy':
        if (dist < 110) { me.startAttack('heavy'); this.action = 'approach'; }
        else this.action = 'approach';
        break;

      case 'attack_kick':
        if (dist < 140) { me.startAttack('kick'); this.action = 'approach'; }
        else this.action = 'approach';
        break;

      case 'special':
        if (dist < 160 || me.charId === 'AMIT') {
          me.startAttack('special'); this.action = 'approach';
        } else this.action = 'approach';
        break;

      default:
        if (!['HIT','JUMP_RISE','JUMP_FALL'].includes(me.state)) me.state = 'IDLE';
        break;
    }
  }
}

/* ============================================================
   HIT TEXTS (floating move names)
   ============================================================ */
const HitTexts = (() => {
  const list = [];
  function spawn(text, x, y, col) {
    list.push({ text, x, y, vy: -1.2, life: 1.0, decay: 0.025, col, size: 13 });
  }
  function update() {
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      t.y += t.vy; t.x += (Math.random() - 0.5) * 0.5;
      t.life -= t.decay;
      if (t.life <= 0) list.splice(i, 1);
    }
  }
  function draw(ctx) {
    list.forEach(t => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life * 1.5);
      ctx.font = `bold ${t.size}px 'Press Start 2P', monospace`;
      ctx.fillStyle = t.col;
      ctx.shadowColor = t.col; ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }
  return { spawn, update, draw };
})();

/* ============================================================
   GAME OBJECT
   ============================================================ */
const Game = {
  canvas: null,
  ctx: null,
  fighters: [],
  cpu: null,
  phase: 'COUNTDOWN',  // COUNTDOWN | FIGHT | ROUND_END | MATCH_END
  round: 1,
  maxRounds: 3,
  countdown: 3,
  countdownTimer: 0,
  roundEndTimer: 0,
  roundWinner: null,  // 'p1' | 'p2' | 'time'
  matchWinner: null,
  p1Wins: 0,
  p2Wins: 0,
  roundTimer: ROUND_SEC,
  timerAccum: 0,
  shakeX: 0, shakeY: 0, shakeFrames: 0, shakeMag: 0,
  announcerMsg: null,  // { text, timer, col }
  lastTime: 0,
  frame: 0,

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.canvas.width  = GW;
    this.canvas.height = GH;

    this._createFighters('BALE', 'MODU');
    this._startRound();
    this.lastTime = performance.now();
    requestAnimationFrame(t => this._loop(t));
  },

  _createFighters(p1Id, p2Id) {
    const p1 = new Fighter(p1Id, 200, 1, true,  'p1');
    const p2 = new Fighter(p2Id, 900, -1, false, 'p2');
    p1.setEnemy(p2); p2.setEnemy(p1);
    this.fighters = [p1, p2];
    this.cpu = new CpuAI(p2, p1);
  },

  _startRound() {
    const [p1, p2] = this.fighters;
    p1.reset(260, 1); p2.reset(880, -1);
    Projectiles.clear();
    this.phase = 'COUNTDOWN';
    this.countdown = 3;
    this.countdownTimer = 0;
    this.roundTimer = ROUND_SEC;
    this.timerAccum = 0;
    this.roundWinner = null;
    this.shakeFrames = 0;
    this._announce(`ROUND ${this.round}`, '#fff', 90);
  },

  _announce(text, col, duration) {
    this.announcerMsg = { text, col, timer: duration };
  },

  spawnHitText(text, x, y, col) {
    HitTexts.spawn(text, x, y, col);
  },

  shakeScreen(mag, frames) {
    this.shakeMag   = Math.max(this.shakeMag, mag);
    this.shakeFrames = Math.max(this.shakeFrames, frames);
  },

  _loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 16.67, 3); // cap at 3x
    this.lastTime = timestamp;
    this.frame++;

    this._update(dt);
    this._render();
    Input.flush();
    requestAnimationFrame(t => this._loop(t));
  },

  /* ---- UPDATE ---- */
  _update(dt) {
    if (this.phase === 'COUNTDOWN') {
      this._updateCountdown(dt);
      return;
    }
    if (this.phase === 'ROUND_END' || this.phase === 'MATCH_END') {
      this._updateRoundEnd(dt);
      return;
    }

    // FIGHT phase
    this._handleP1Input();
    this.cpu.update(this.phase);

    this.fighters.forEach(f => f.update());
    this._resolveCollisions();
    this._checkHits();
    Projectiles.update(this.fighters);
    Particles.update();
    HitTexts.update();

    if (this.announcerMsg) {
      this.announcerMsg.timer -= dt;
      if (this.announcerMsg.timer <= 0) this.announcerMsg = null;
    }

    // Round timer
    this.timerAccum += dt * 16.67;
    if (this.timerAccum >= 1000) {
      this.timerAccum -= 1000;
      this.roundTimer = Math.max(0, this.roundTimer - 1);
    }

    // Screen shake
    if (this.shakeFrames > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeMag * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeMag;
      this.shakeFrames--;
    } else { this.shakeX = 0; this.shakeY = 0; this.shakeMag = 0; }

    // Check KO or time-out
    this._checkRoundEnd();
  },

  _updateCountdown(dt) {
    this.countdownTimer += dt * 16.67;
    Particles.update(); HitTexts.update();
    if (this.countdownTimer >= 1000) {
      this.countdownTimer -= 1000;
      this.countdown--;
      if (this.countdown <= 0) {
        this.phase = 'FIGHT';
        this._announce('FIGHT!', '#ffcc00', 70);
        Audio.fightStart();
      }
    }
  },

  _updateRoundEnd(dt) {
    Particles.update(); HitTexts.update();
    if (this.announcerMsg) {
      this.announcerMsg.timer -= dt;
      if (this.announcerMsg.timer <= 0) this.announcerMsg = null;
    }
    this.roundEndTimer -= dt;
    if (this.roundEndTimer <= 0) {
      if (this.phase === 'MATCH_END') return; // wait for restart key
      this.round++;
      this._startRound();
    }
  },

  _handleP1Input() {
    const p1 = this.fighters[0];
    if (p1.state === 'KO') return;
    const inAttack = p1.state.startsWith('ATTACK_');
    const canMove  = !inAttack && p1.hitStun <= 0 && p1.blockStun <= 0;

    if (canMove) {
      let moved = false;
      if (Input.held('KeyA')) { p1.vx = -p1.speed; p1.state = 'WALK_BWD'; moved = true; }
      if (Input.held('KeyD')) { p1.vx =  p1.speed; p1.state = 'WALK_FWD'; moved = true; }
      if (!moved && p1.grounded && !['HIT','JUMP_RISE','JUMP_FALL'].includes(p1.state) && !inAttack) {
        p1.state = Input.held('KeyS') ? 'CROUCH' : 'IDLE';
      }
      if (Input.pressed('KeyW')) p1.tryJump();
    }
    // Block = hold S
    p1.isBlocking = Input.held('KeyS') && p1.grounded && !inAttack;

    // Attacks (single press)
    if (Input.pressed('KeyG')) p1.startAttack('light');
    if (Input.pressed('KeyH')) p1.startAttack('heavy');
    if (Input.pressed('KeyJ')) p1.startAttack('kick');
    if (Input.pressed('KeyK')) p1.startAttack('special');
  },

  _resolveCollisions() {
    const [a, b] = this.fighters;
    const overlap = (a.x + a.w) - b.x;
    if (a.x < b.x && overlap > PUSH_SEP) {
      const push = (overlap - PUSH_SEP) / 2;
      a.x -= push; b.x += push;
    }
  },

  _checkHits() {
    this.fighters.forEach((attacker, ai) => {
      const defender = this.fighters[1 - ai];
      const hbox = attacker.getHitbox();
      if (!hbox) return;
      const hurtbox = defender.getHurtbox();
      if (hbox.r < hurtbox.l || hbox.l > hurtbox.r) return;
      if (hbox.b < hurtbox.t || hbox.t > hurtbox.b) return;

      // Hit registered!
      attacker.attackHit = true;
      const m = hbox.move;
      const blocked = defender.isBlocking && attacker.state === 'ATTACK_LIGHT';
      const dir = attacker.facing;
      defender.takeHit(m.dmg, m.kbx * dir, m.kby, blocked, m.name);

      // Play correct audio
      if (!blocked) {
        if (attacker.attackType === 'light')   Audio.hitLight();
        else if (attacker.attackType === 'heavy') Audio.hitHeavy();
        else if (attacker.attackType === 'kick')  Audio.hitKick();
      }
    });
  },

  _checkRoundEnd() {
    const [p1, p2] = this.fighters;
    let winner = null;

    if (p1.state === 'KO' && p2.state === 'KO') winner = 'draw';
    else if (p1.state === 'KO') winner = 'p2';
    else if (p2.state === 'KO') winner = 'p1';
    else if (this.roundTimer <= 0) {
      winner = p1.hp > p2.hp ? 'p1' : p2.hp > p1.hp ? 'p2' : 'draw';
    }

    if (!winner) return;

    this.roundWinner = winner;
    if (winner === 'p1') { this.p1Wins++; this._announce('KO!', '#ff4444', 120); Audio.roundWin(); }
    else if (winner === 'p2') { this.p2Wins++; this._announce('KO!', '#ff4444', 120); Audio.ko(); }
    else { this._announce('DRAW!', '#ffaa00', 120); }

    Particles.spawn(GW / 2, GH / 2, '#fff', 30, { spd: 10, size: 6, square: true });

    const needed = Math.ceil(this.maxRounds / 2);
    if (this.p1Wins >= needed || this.p2Wins >= needed) {
      this.matchWinner = this.p1Wins >= needed ? 'BALE' : 'MODU';
      this.phase = 'MATCH_END';
      this.roundEndTimer = 180;
      setTimeout(() => this._announce(`${this.matchWinner} WINS!`, '#ffd700', 999), 1200);
    } else {
      this.phase = 'ROUND_END';
      this.roundEndTimer = 120;
    }
  },

  /* ---- RENDER ---- */
  _render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shakeFrames > 0) ctx.translate(this.shakeX, this.shakeY);

    // ---- BACKGROUND ----
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GW, GH);

    // Floor
    this._drawFloor(ctx);

    // Fighters
    this.fighters.forEach(f => f.draw(ctx));

    // Projectiles
    Projectiles.draw(ctx);

    // Particles
    Particles.draw(ctx);

    // HIT texts
    HitTexts.draw(ctx);

    // HUD
    this._drawHUD(ctx);

    // Announcer overlay
    if (this.announcerMsg) this._drawAnnouncer(ctx);

    // Countdown
    if (this.phase === 'COUNTDOWN' && this.countdown > 0) this._drawCountdown(ctx);

    // Match end overlay
    if (this.phase === 'MATCH_END') this._drawMatchEnd(ctx);

    ctx.restore();
  },

  _drawFloor(ctx) {
    // Subtle glowing floor line on black background
    const grd = ctx.createLinearGradient(0, GROUND_Y, 0, GH);
    grd.addColorStop(0, 'rgba(40,40,60,0.9)');
    grd.addColorStop(0.15, 'rgba(15,15,25,0.95)');
    grd.addColorStop(1, '#000');
    ctx.fillStyle = grd;
    ctx.fillRect(0, GROUND_Y, GW, GH - GROUND_Y);

    // Floor line
    ctx.save();
    const lineGrd = ctx.createLinearGradient(0, 0, GW, 0);
    lineGrd.addColorStop(0, 'transparent');
    lineGrd.addColorStop(0.1, 'rgba(100,100,180,0.6)');
    lineGrd.addColorStop(0.5, 'rgba(150,150,255,0.9)');
    lineGrd.addColorStop(0.9, 'rgba(100,100,180,0.6)');
    lineGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = lineGrd;
    ctx.fillRect(0, GROUND_Y, GW, 2);
    // glow
    ctx.shadowColor = '#8888ff';
    ctx.shadowBlur = 14;
    ctx.fillRect(0, GROUND_Y, GW, 2);
    ctx.restore();

    // Subtle grid on floor
    ctx.save();
    ctx.strokeStyle = 'rgba(50,50,100,0.2)';
    ctx.lineWidth = 1;
    for (let xi = 0; xi < GW; xi += 80) {
      ctx.beginPath(); ctx.moveTo(xi, GROUND_Y); ctx.lineTo(xi + 40, GH); ctx.stroke();
    }
    ctx.restore();
  },

  _drawHUD(ctx) {
    const [p1, p2] = this.fighters;
    const HUD_TOP = 22;
    const BAR_W   = 370;
    const BAR_H   = 22;
    const STA_H   = 8;
    const P1_X    = 50;                    // P1 left edge
    const P2_X    = GW - 50 - BAR_W;      // P2 left edge
    const CX      = GW / 2;

    // ---- P1 Health bar (fills LEFT → RIGHT) ----
    this._drawBar(ctx, P1_X, HUD_TOP, BAR_W, BAR_H, p1.hp / p1.maxHp, '#e74c3c', '#2a2a2a', true);

    // ---- P2 Health bar (fills RIGHT → LEFT) ----
    this._drawBar(ctx, P2_X, HUD_TOP, BAR_W, BAR_H, p2.hp / p2.maxHp, '#00bcd4', '#2a2a2a', false);

    // ---- P1 Stamina bar ----
    this._drawBar(ctx, P1_X, HUD_TOP + BAR_H + 4, BAR_W, STA_H, p1.st / p1.maxSt, '#f39c12', '#1a1a1a', true);

    // ---- P2 Stamina bar ----
    this._drawBar(ctx, P2_X, HUD_TOP + BAR_H + 4, BAR_W, STA_H, p2.st / p2.maxSt, '#f39c12', '#1a1a1a', false);

    // ---- Character names ----
    ctx.save();
    ctx.font = "bold 11px 'Press Start 2P', monospace";
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#e74c3c';
    ctx.fillText(p1.charId, P1_X, HUD_TOP - 5);
    ctx.textAlign = 'right';
    ctx.shadowColor = '#00bcd4';
    ctx.fillText(p2.charId, P2_X + BAR_W, HUD_TOP - 5);
    ctx.restore();

    // ---- Special cooldown icons ----
    const p1SpecAvail = p1.specialCD <= 0 && p1.st >= CHAR_DATA[p1.charId].moves.special.st;
    const p2SpecAvail = p2.specialCD <= 0 && p2.st >= CHAR_DATA[p2.charId].moves.special.st;
    this._drawSpecialIcon(ctx, P1_X + BAR_W + 8, HUD_TOP + 4, p1SpecAvail, '#e74c3c');
    this._drawSpecialIcon(ctx, P2_X - 22, HUD_TOP + 4, p2SpecAvail, '#00bcd4');

    // ---- Center HUD area ----
    const cx    = GW / 2;
    const pipCY = HUD_TOP + BAR_H / 2;

    // Timer
    const timerStr = String(Math.ceil(this.roundTimer)).padStart(2, '0');
    const timerCol = this.roundTimer <= 10 ? '#ff4444' : '#fff';
    ctx.save();
    ctx.font = "bold 28px 'Press Start 2P', monospace";
    ctx.fillStyle = timerCol;
    ctx.textAlign = 'center';
    if (this.roundTimer <= 10) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 14; }
    ctx.fillText(timerStr, cx, HUD_TOP + 18);
    ctx.restore();

    // Round label
    ctx.save();
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText(`ROUND ${this.round}`, cx, HUD_TOP + BAR_H + 16);
    ctx.restore();

    // Win pips (P1 left of timer, P2 right)
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = this.p1Wins > i ? 10 : 0;
      ctx.fillStyle = this.p1Wins > i ? '#e74c3c' : '#2a2a2a';
      ctx.fillRect(cx - 70 + i * 16, pipCY - 6, 12, 12);
      ctx.restore();
      ctx.save();
      ctx.shadowColor = '#00bcd4'; ctx.shadowBlur = this.p2Wins > i ? 10 : 0;
      ctx.fillStyle = this.p2Wins > i ? '#00bcd4' : '#2a2a2a';
      ctx.fillRect(cx + 44 + i * 16, pipCY - 6, 12, 12);
      ctx.restore();
    }

    // HP numbers inside bars
    ctx.save();
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(`${p1.hp | 0} HP`, P1_X + 4, HUD_TOP + BAR_H - 5);
    ctx.textAlign = 'right';
    ctx.fillText(`HP ${p2.hp | 0}`, P2_X + BAR_W - 4, HUD_TOP + BAR_H - 5);
    ctx.restore();

    // ---- Controls reminder (bottom) ----
    ctx.save();
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillStyle = 'rgba(100,100,120,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('P1: WASD Move  G Light  H Heavy  J Kick  K Special', 20, GH - 10);
    ctx.restore();
  },

  _drawBar(ctx, x, y, w, h, ratio, col, bg, leftAlign) {
    ratio = Math.max(0, Math.min(1, ratio));
    const fillW = (w * ratio) | 0;

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);

    // Fill (from correct side)
    const barCol = ratio > 0.5 ? col : ratio > 0.25 ? '#e67e22' : '#e74c3c';
    if (leftAlign) {
      ctx.fillStyle = barCol;
      ctx.fillRect(x, y, fillW, h);
    } else {
      ctx.fillStyle = barCol;
      ctx.fillRect(x + w - fillW, y, fillW, h);
    }

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w, h / 2 | 0);

    // Border
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  },

  _drawSpecialIcon(ctx, x, y, available, col) {
    ctx.save();
    ctx.fillStyle = available ? col : '#333';
    if (available) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
    ctx.fillRect(x, y, 14, 14);
    ctx.fillStyle = '#fff8';
    ctx.font = "5px 'Press Start 2P'";
    ctx.textAlign = 'center';
    ctx.fillText('SP', x + 7, y + 10);
    ctx.restore();
  },

  _drawAnnouncer(ctx) {
    const msg = this.announcerMsg;
    const alpha = Math.min(1, msg.timer / 20);
    // Draw announcer text on a CLEAN (non-shaken) context to avoid mirror bugs
    ctx.save();
    // Reset any transforms that might mirror text
    ctx.setTransform(1, 0, 0, 1, this.shakeX, this.shakeY);
    ctx.globalAlpha = alpha;
    ctx.font = `bold 52px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = msg.col;
    ctx.shadowColor = msg.col;
    ctx.shadowBlur = 30;
    ctx.fillText(msg.text, GW / 2, GH / 2 - 40);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.strokeText(msg.text, GW / 2, GH / 2 - 40);
    ctx.restore();
  },

  _drawCountdown(ctx) {
    const n = this.countdown;
    const pulse = Math.sin(this.frame * 0.15) * 0.1 + 0.9;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // no shake on countdown
    ctx.font   = `bold 120px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 40;
    ctx.fillText(String(n), GW / 2, GH / 2);
    ctx.restore();
  },

  _drawMatchEnd(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GW, GH);
    if (this.matchWinner) {
      ctx.font = "bold 16px 'Press Start 2P', monospace";
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PRESS F5 TO PLAY AGAIN', GW / 2, GH / 2 + 90);
    }
    ctx.restore();
  },
};

/* ============================================================
   START
   ============================================================ */
window.addEventListener('load', () => {
  // Unlock audio on first interaction
  document.addEventListener('keydown', () => {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    ac.resume();
  }, { once: true });

  // Hide loading message if present
  const msg = document.getElementById('loading-msg');
  if (msg) msg.classList.add('hidden');

  Game.init();
});
