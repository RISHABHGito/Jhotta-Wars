/* ============================================================
   BLOCK BRAWL — UI / Screen Navigation
   Landing -> Mode Select -> (Game)
             -> Settings
             -> Controls
   Keeps all menu/DOM logic separate from main.js's game loop.
   ============================================================ */

(() => {
  const screens = {
    landing:     document.getElementById('screen-landing'),
    modeSelect:  document.getElementById('screen-mode-select'),
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

  /* ---- Play -> Mode Select -> VS PC starts the match ---- */
  document.getElementById('btn-vs-pc').addEventListener('click', () => {
    Audio.unlock();
    showScreen('game');
    Game.startMatch('BALE', 'MODU');
  });

  /* ---- Settings: volume slider ---- */
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
