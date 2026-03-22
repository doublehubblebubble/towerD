// ============================================================
//  ui.js  —  HUD, events, overlays
// ============================================================

var game;

window.onload = function() {
  game = new Game();
  setupEvents();
  updateHUD();
};

// ============================================================
//  setupEvents
// ============================================================
function setupEvents() {
  var canvas = document.getElementById('game-canvas');

  // Canvas click
  canvas.addEventListener('click', function(e) {
    var rect   = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
    var scaleY = canvas.height / rect.height;
    var mx     = (e.clientX - rect.left) * scaleX;
    var my     = (e.clientY - rect.top)  * scaleY;
    var col    = Math.floor(mx / CELL);
    var row    = Math.floor(my / CELL);
    var key    = col + ',' + row;

    if (game.occupiedCells[key]) {
      game.selectSoldier(game.occupiedCells[key]);
    } else if (PLACEABLE_SET[key]) {
      if (game.state === 'build' || game.state === 'wave') {
        game.placeSoldier(col, row);
      }
      // Deselect
      game.selectedSoldier = null;
      hideUpgradePanel();
    } else {
      game.selectedSoldier = null;
      hideUpgradePanel();
    }
  });

  // Canvas mousemove: show range for hovered soldier
  canvas.addEventListener('mousemove', function(e) {
    var rect   = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
    var scaleY = canvas.height / rect.height;
    var mx     = (e.clientX - rect.left) * scaleX;
    var my     = (e.clientY - rect.top)  * scaleY;
    var col    = Math.floor(mx / CELL);
    var row    = Math.floor(my / CELL);
    var key    = col + ',' + row;

    for (var i = 0; i < game.soldiers.length; i++) {
      var s    = game.soldiers[i];
      var sKey = s.col + ',' + s.row;
      s.showRange = (sKey === key);
    }

    // Update cursor
    if (PLACEABLE_SET[key] && !game.occupiedCells[key]) {
      canvas.style.cursor = 'pointer';
    } else if (game.occupiedCells[key]) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  });

  canvas.addEventListener('mouseleave', function() {
    for (var i = 0; i < game.soldiers.length; i++) {
      game.soldiers[i].showRange = false;
    }
  });

  // Soldier card clicks
  var cards = document.querySelectorAll('.soldier-card');
  for (var ci = 0; ci < cards.length; ci++) {
    cards[ci].addEventListener('click', (function(card) {
      return function() {
        game.selectedSoldierType = card.getAttribute('data-type');
        // Toggle selected class
        for (var i = 0; i < cards.length; i++) {
          cards[i].classList.remove('selected');
        }
        card.classList.add('selected');
      };
    })(cards[ci]));
  }

  // Music: start on first user interaction (browser autoplay policy)
  var musicStarted = false;
  function ensureMusic() {
    if (!musicStarted) { musicStarted = true; AudioManager.start(); }
  }
  document.addEventListener('click', ensureMusic, { once: true });
  document.addEventListener('keydown', ensureMusic, { once: true });

  // Mute button
  var muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', function() {
      musicStarted = true; // may be the first interaction
      var nowPlaying = AudioManager.toggle();
      muteBtn.textContent = nowPlaying ? '🔊' : '🔇';
    });
  }

  // Start button
  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      game.startWave();
      updateHUD();
    });
  }

  // Speed buttons
  var speedBtns = document.querySelectorAll('.speed-btn');
  for (var sb = 0; sb < speedBtns.length; sb++) {
    speedBtns[sb].addEventListener('click', (function(btn) {
      return function() {
        var s = parseInt(btn.getAttribute('data-speed'));
        game.setSpeed(s);
        for (var i = 0; i < speedBtns.length; i++) {
          speedBtns[i].classList.remove('active');
        }
        btn.classList.add('active');
      };
    })(speedBtns[sb]));
  }

  // Upgrade button
  var upgradeBtn = document.getElementById('upgrade-btn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', function() {
      if (game.selectedSoldier) game.upgradeSoldier(game.selectedSoldier);
    });
  }

  // Sell button
  var sellBtn = document.getElementById('sell-btn');
  if (sellBtn) {
    sellBtn.addEventListener('click', function() {
      if (game.selectedSoldier) game.sellSoldier(game.selectedSoldier);
    });
  }

  // Close panel button
  var closeBtn = document.getElementById('close-panel-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      game.selectedSoldier = null;
      hideUpgradePanel();
    });
  }
}

// ============================================================
//  updateHUD
// ============================================================
function updateHUD() {
  if (!game) return;

  // Wave display
  var waveDisp = document.getElementById('wave-display');
  if (waveDisp) {
    var waveShown;
    if (game.state === 'wave') {
      waveShown = game.waveNumber;
    } else if (game.state === 'build' && game.waveNumber === 0) {
      waveShown = '—';
    } else {
      waveShown = game.waveNumber;
    }
    waveDisp.textContent = waveShown + ' / ' + game.totalWaves;
  }

  // Coins
  var coinDisp = document.getElementById('coin-display');
  if (coinDisp) coinDisp.textContent = game.coins + 'g';

  // Kills
  var killDisp = document.getElementById('kill-display');
  if (killDisp) killDisp.textContent = game.kills;

  // Castle HP
  var hpDisp = document.getElementById('hp-display');
  if (hpDisp) hpDisp.textContent = game.castleHp + ' / ' + CASTLE.maxHp;

  var hpBar = document.getElementById('hp-bar-fill');
  if (hpBar) {
    var hpPct = (game.castleHp / CASTLE.maxHp) * 100;
    hpBar.style.width = hpPct + '%';
    if (hpPct > 60)      hpBar.style.background = 'linear-gradient(90deg,#22aa22,#44cc44)';
    else if (hpPct > 30) hpBar.style.background = 'linear-gradient(90deg,#aaaa22,#cccc44)';
    else                 hpBar.style.background = 'linear-gradient(90deg,#aa2222,#cc4444)';
  }

  // Wave progress bar
  var waveBar = document.getElementById('wave-bar-fill');
  if (waveBar) {
    waveBar.style.width = ((game.waveNumber / game.totalWaves) * 100) + '%';
  }

  // Next wave label
  var nextLabel = document.getElementById('next-wave-label');
  if (nextLabel) {
    var nextWave = game.waveNumber + 1;
    if (nextWave <= game.totalWaves && game.state === 'build') {
      var waveDef = WAVE_DEFS[nextWave - 1];
      var emojiStr = '';
      for (var gi = 0; gi < waveDef.length; gi++) {
        var grp = waveDef[gi];
        emojiStr += ENEMY_DEFS[grp.type].emoji + '×' + grp.count + '  ';
      }
      nextLabel.textContent = 'Next: ' + emojiStr.trim();
    } else if (game.state === 'wave') {
      nextLabel.textContent = 'Wave in progress…';
    } else {
      nextLabel.textContent = '';
    }
  }

  // Start button state
  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    if (game.state === 'gameover' || game.state === 'victory') {
      startBtn.disabled     = true;
      startBtn.textContent  = '— Game Over —';
    } else if (game.state === 'wave') {
      startBtn.disabled    = true;
      startBtn.textContent = '⚔ Wave ' + game.waveNumber + ' in progress';
    } else {
      // build
      startBtn.disabled    = false;
      var nextWaveNum = game.waveNumber + 1;
      startBtn.textContent = '▶ Start Wave ' + nextWaveNum + '  (auto ' + Math.ceil(game.buildTimer) + 's)';
    }
  }

  // Soldier card affordability
  var cards = document.querySelectorAll('.soldier-card');
  for (var ci = 0; ci < cards.length; ci++) {
    var t   = cards[ci].getAttribute('data-type');
    var def = SOLDIER_DEFS[t];
    if (def && game.coins < def.cost) {
      cards[ci].classList.add('cant-afford');
    } else {
      cards[ci].classList.remove('cant-afford');
    }
  }
}

// ============================================================
//  updateBuildTimer  (called every frame during build)
// ============================================================
function updateBuildTimer(t) {
  var startBtn = document.getElementById('start-btn');
  if (startBtn && game && game.state === 'build') {
    var nextWaveNum = game.waveNumber + 1;
    startBtn.textContent = '▶ Start Wave ' + nextWaveNum + '  (auto ' + t + 's)';
  }
}

// ============================================================
//  showUpgradePanel
// ============================================================
function showUpgradePanel(soldier) {
  var panel = document.getElementById('upgrade-panel');
  if (!panel) return;
  panel.style.display = 'flex';

  var nameEl = document.getElementById('up-name');
  if (nameEl) {
    var typeName = soldier.type.charAt(0).toUpperCase() + soldier.type.slice(1);
    if (soldier.type === 'darkKnight') typeName = 'Dark Knight';
    nameEl.textContent = typeName + ' — Lv ' + soldier.level;
  }

  var upgradeBtn = document.getElementById('upgrade-btn');
  if (upgradeBtn) {
    if (soldier.level >= soldier.maxLevel) {
      upgradeBtn.textContent = 'MAX LEVEL';
      upgradeBtn.disabled    = true;
      upgradeBtn.style.opacity = '0.5';
    } else {
      var cost = getUpgradeCost(soldier.type, soldier.level);
      upgradeBtn.textContent = '⬆ Upgrade (' + cost + 'g)';
      upgradeBtn.disabled    = (game.coins < cost);
      upgradeBtn.style.opacity = (game.coins < cost) ? '0.5' : '1';
    }
  }

  var sellBtn = document.getElementById('sell-btn');
  if (sellBtn) {
    sellBtn.textContent = '💰 Sell (' + soldier.getSellValue() + 'g)';
    sellBtn.disabled    = false;
    sellBtn.style.opacity = '1';
  }
}

// ============================================================
//  hideUpgradePanel
// ============================================================
function hideUpgradePanel() {
  var panel = document.getElementById('upgrade-panel');
  if (panel) panel.style.display = 'none';
}

// ============================================================
//  flashInsufficientCoins
// ============================================================
function flashInsufficientCoins() {
  var el = document.getElementById('coin-display');
  if (!el) return;
  el.style.color = '#ff4444';
  setTimeout(function() {
    el.style.color = '';
  }, 600);
}

// ============================================================
//  showGameOver
// ============================================================
function showGameOver(wave, kills) {
  var overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML =
    '<div class="overlay-box">' +
    '  <div class="overlay-title" style="color:#cc2222">⚔ DEFEAT ⚔</div>' +
    '  <p class="overlay-stat">The kingdom has fallen…</p>' +
    '  <p class="overlay-stat">Survived: Wave ' + wave + ' / 20</p>' +
    '  <p class="overlay-stat">Enemies slain: ' + kills + '</p>' +
    '  <button class="overlay-btn" onclick="location.reload()">🔄 Try Again</button>' +
    '</div>';
}

// ============================================================
//  showVictory
// ============================================================
function showVictory(kills, coins) {
  var overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML =
    '<div class="overlay-box">' +
    '  <div class="overlay-title" style="color:#f0c030">👑 VICTORY! 👑</div>' +
    '  <p class="overlay-stat">The kingdom is saved!</p>' +
    '  <p class="overlay-stat">Enemies slain: ' + kills + '</p>' +
    '  <p class="overlay-stat">Gold remaining: ' + coins + 'g</p>' +
    '  <button class="overlay-btn" onclick="location.reload()">▶ Play Again</button>' +
    '</div>';
}
