/* ============================================================
   BLOCK BRAWL — UI / Screen Navigation
   Landing -> Mode Select -> Char Select (P1) -> Char Select (P2, CPU) -> Game
             -> Settings
             -> Controls
   Keeps all menu/DOM logic separate from main.js's game loop.
   ============================================================ */

(() => {
  const screens = {
    landing:     document.getElementById('screen-landing'),
    modeSelect:  document.getElementById('screen-mode-select'),
    charSelect:  document.getElementById('screen-char-select'),
    settings:    document.getElementById('screen-settings'),
    controls:    document.getElementById('screen-controls'),
  };
  const gameWrapper = document.getElementById('game-wrapper');

  /** Hide every screen + the game canvas, then show exactly one. */
  function showScreen(id) {
    Object.values(screens).forEach(el => el.classList.add('hidden'));
    gameWrapper.classList.add('hidden');
    if (id === 'game') {
      gameWrapper.classList.remove('hidden');
    } else {
      screens[id].classList.remove('hidden');
    }
  }

  /* ---- Generic back/forward nav via [data-nav] buttons ---- */
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      Audio.unlock(); // any menu click is a valid user gesture to start audio
      const target = btn.dataset.nav.replace('screen-', '');
      const map = { landing: 'landing', 'mode-select': 'modeSelect', settings: 'settings', controls: 'controls' };
      showScreen(map[target]);
    });
  });

  /* ============================================================
     CHARACTER SELECT (Tekken-style)
     ============================================================ */
  const ROSTER = Object.keys(CHAR_DATA); // ['BALE','MODU','SUBBU','AMIT']
  const RANDOM = 'RANDOM';
  const ITEMS = [...ROSTER, RANDOM];     // roster strip order — real fighters, then Random

  // Fixed internal coordinate space every portrait is drawn into, then scaled
  // up/down per-canvas via ctx.scale() — keeps thumbnails & the big portrait
  // perfectly consistent with each other and with in-match sprites.
  const BASE_W = 140, BASE_H = 180;

  // Normalise each stat against the roster's own max so bars are comparable —
  // computed once from CHAR_DATA rather than hardcoded.
  const STAT_MAX = (() => {
    let hp = 0, speed = 0, power = 0;
    ROSTER.forEach(id => {
      const d = CHAR_DATA[id];
      const avgDmg = (d.moves.light.dmg + d.moves.heavy.dmg + d.moves.kick.dmg + d.moves.special.dmg) / 4;
      hp = Math.max(hp, d.stats.maxHp);
      speed = Math.max(speed, d.stats.speed);
      power = Math.max(power, avgDmg);
    });
    return { hp, speed, power };
  })();

  function renderPortrait(canvas, charId, frame) {
    const ctx = canvas.getContext('2d');
    const scale = canvas.width / BASE_W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (charId === RANDOM) {
      _renderRandomBox(ctx, canvas.width, canvas.height, frame);
      return;
    }
    ctx.save();
    ctx.scale(scale, scale);
    const d = CHAR_DATA[charId];
    const x = (BASE_W - d.w) / 2;
    const fy = BASE_H - 15;
    drawCharacter(ctx, charId, x, fy, 1, 'IDLE', frame);
    ctx.restore();
  }

  function _renderRandomBox(ctx, w, h, frame) {
    const pulse = 1 + Math.sin(frame * 0.1) * 0.08;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(pulse, pulse);
    ctx.font = `bold ${Math.round(h * 0.4)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff9800';
    ctx.shadowColor = '#ff9800';
    ctx.shadowBlur = 16;
    ctx.fillText('?', 0, 4);
    ctx.restore();
  }

  // Roster strip DOM (built once)
  const rosterEl = document.getElementById('cs-roster');
  const rosterCanvases = {}; // charId/RANDOM -> canvas element
  ITEMS.forEach(id => {
    const item = document.createElement('div');
    item.className = 'cs-roster-item' + (id === RANDOM ? ' random-item' : '');
    item.dataset.char = id;

    const canvas = document.createElement('canvas');
    canvas.width = 60; canvas.height = 78;
    item.appendChild(canvas);
    rosterCanvases[id] = canvas;

    const label = document.createElement('div');
    label.className = 'cs-roster-label';
    label.textContent = id === RANDOM ? 'RANDOM' : CHAR_DATA[id].displayName;
    item.appendChild(label);

    item.addEventListener('click', () => selectItem(id));
    rosterEl.appendChild(item);
  });

  const bigCanvas   = document.getElementById('cs-portrait-canvas');
  const nameEl      = document.getElementById('cs-name');
  const playerTagEl = document.getElementById('cs-player-tag');
  const backBtn     = document.getElementById('cs-back-btn');
  const confirmBtn  = document.getElementById('cs-confirm-btn');
  const barPower    = document.getElementById('cs-stat-power');
  const barSpeed    = document.getElementById('cs-stat-speed');
  const barHealth   = document.getElementById('cs-stat-health');

  // Selection state — remembered separately per step so going Back to P1
  // select doesn't reset what was highlighted.
  const state = {
    step: 'p1',                 // 'p1' | 'p2'
    p1Index: 0,
    p2Index: 0,
    p1Char: null,
  };

  function currentIndex() { return state.step === 'p1' ? state.p1Index : state.p2Index; }
  function setCurrentIndex(i) {
    if (state.step === 'p1') state.p1Index = i; else state.p2Index = i;
  }

  function selectItem(id, { silent = false } = {}) {
    setCurrentIndex(ITEMS.indexOf(id));
    if (!silent) Audio.menuMove();
    updateSelectionUI();
  }

  function updateSelectionUI() {
    const id = ITEMS[currentIndex()];
    const p2 = state.step === 'p2';

    // Roster highlight
    Array.from(rosterEl.children).forEach(item => {
      const isSel = item.dataset.char === id;
      item.classList.toggle('selected', isSel);
      item.classList.toggle('p2-accent', p2);
    });

    // Header accent
    playerTagEl.classList.toggle('p2-accent', p2);

    // Big portrait info panel
    if (id === RANDOM) {
      nameEl.textContent = '???';
      barPower.style.width = '0%';
      barSpeed.style.width = '0%';
      barHealth.style.width = '0%';
    } else {
      const d = CHAR_DATA[id];
      const avgDmg = (d.moves.light.dmg + d.moves.heavy.dmg + d.moves.kick.dmg + d.moves.special.dmg) / 4;
      nameEl.textContent = d.displayName;
      barPower.style.width  = Math.round((avgDmg / STAT_MAX.power) * 100) + '%';
      barSpeed.style.width  = Math.round((d.stats.speed / STAT_MAX.speed) * 100) + '%';
      barHealth.style.width = Math.round((d.stats.maxHp / STAT_MAX.hp) * 100) + '%';
    }
  }

  function pickRandomRealChar() {
    return ROSTER[Math.floor(Math.random() * ROSTER.length)];
  }

  /** Open the character-select screen for a given step ('p1' or 'p2'). */
  function openCharSelect(step) {
    state.step = step;
    playerTagEl.textContent = step === 'p1' ? 'PLAYER 1' : 'PLAYER 2 (CPU)';
    confirmBtn.textContent = step === 'p1' ? 'SELECT →' : 'START MATCH →';
    updateSelectionUI();
    showScreen('charSelect');
  }

  backBtn.addEventListener('click', () => {
    Audio.unlock();
    if (state.step === 'p1') {
      showScreen('modeSelect');
    } else {
      openCharSelect('p1');
    }
  });

  confirmBtn.addEventListener('click', () => {
    Audio.unlock();
    Audio.menuConfirm();
    const id = ITEMS[currentIndex()];
    const resolved = id === RANDOM ? pickRandomRealChar() : id;

    if (state.step === 'p1') {
      state.p1Char = resolved;
      openCharSelect('p2');
    } else {
      showScreen('game');
      Game.startMatch(state.p1Char, resolved);
    }
  });

  // Arrow-key navigation + Enter to confirm, active only while this screen is visible.
  document.addEventListener('keydown', e => {
    if (screens.charSelect.classList.contains('hidden')) return;
    if (e.code === 'ArrowRight') {
      e.preventDefault();
      selectItem(ITEMS[(currentIndex() + 1) % ITEMS.length]);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      selectItem(ITEMS[(currentIndex() - 1 + ITEMS.length) % ITEMS.length]);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      confirmBtn.click();
    }
  });

  // Play -> Mode Select -> VS PC opens the character-select flow (P1 first).
  document.getElementById('btn-vs-pc').addEventListener('click', () => {
    Audio.unlock();
    openCharSelect('p1');
  });

  // Idle "breathing" animation loop for the roster thumbnails + big portrait —
  // only runs while the char-select screen is actually visible.
  let csFrame = 0;
  function csAnimLoop() {
    if (!screens.charSelect.classList.contains('hidden')) {
      csFrame++;
      renderPortrait(bigCanvas, ITEMS[currentIndex()], csFrame);
      ITEMS.forEach(id => renderPortrait(rosterCanvases[id], id, csFrame));
    }
    requestAnimationFrame(csAnimLoop);
  }
  csAnimLoop();

  /* ============================================================
     SETTINGS — volume slider
     ============================================================ */
  const slider = document.getElementById('volume-slider');
  const volLabel = document.getElementById('volume-value');

  // Reflect the persisted volume (Audio module loads it from localStorage) on load
  const initialPct = Math.round(Audio.getVolume() * 100);
  slider.value = initialPct;
  volLabel.textContent = initialPct + '%';

  slider.addEventListener('input', () => {
    const pct = parseInt(slider.value, 10);
    volLabel.textContent = pct + '%';
    Audio.setVolume(pct / 100);
  });

  /* ---- Game -> ESC returns to the landing page mid-match ---- */
  Game.onExitToMenu = () => {
    Game.pause();
    showScreen('landing');
  };

  /* ---- Boot on the landing page ---- */
  showScreen('landing');
})();