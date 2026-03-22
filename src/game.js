// ============================================================
//  game.js  —  Main Game class
// ============================================================

function Game() {
  this.canvas = document.getElementById('game-canvas');
  this.ctx    = this.canvas.getContext('2d');

  this.state       = 'build';
  this.waveNumber  = 0;
  this.totalWaves  = 20;
  this.buildTimer  = 15;
  this.BUILD_TIME  = 15;
  this.gameSpeed   = 1;

  this.coins     = 100;
  this.kills     = 0;
  this.castleHp  = CASTLE.maxHp;

  this.soldiers      = [];
  this.enemies       = [];
  this.projectiles   = [];
  this.floatingTexts = [];

  this.occupiedCells = {}; // "col,row" → soldier

  this.spawnQueue  = [];
  this.spawnTimer  = 0;

  this.selectedSoldierType = 'archer';
  this.selectedSoldier     = null;
  this.paused              = false;

  // Pre-render background to an offscreen canvas
  this.bgCanvas        = document.createElement('canvas');
  this.bgCanvas.width  = CANVAS_W;
  this.bgCanvas.height = CANVAS_H;

  this._renderBackground();
  this._placeInitialSoldiers();

  this._lastTime = null;
  var self       = this;
  requestAnimationFrame(function(ts) { self._loop(ts); });
}

// ============================================================
//  Pre-placed initial soldiers (free)
// ============================================================
Game.prototype._placeInitialSoldiers = function() {
  var initial = [
    { type: 'archer',   col: 2,  row: 5 },
    { type: 'archer',   col: 2,  row: 7 },
    { type: 'archer',   col: 5,  row: 3 },
    { type: 'crossbow', col: 5,  row: 1 },
    { type: 'mage',     col: 10, row: 1 },
    { type: 'mage',     col: 13, row: 3 },
    { type: 'knight',   col: 15, row: 9 },
    { type: 'knight',   col: 16, row: 9 }
  ];
  for (var i = 0; i < initial.length; i++) {
    var s   = initial[i];
    var key = s.col + ',' + s.row;
    if (PLACEABLE_SET[key]) {
      var soldier         = new Soldier(s.type, s.col, s.row);
      soldier.totalSpent  = 0; // free
      this.soldiers.push(soldier);
      this.occupiedCells[key] = soldier;
    }
  }
};

// ============================================================
//  Background pre-render
// ============================================================
Game.prototype._renderBackground = function() {
  var bctx = this.bgCanvas.getContext('2d');

  // Draw every cell
  for (var row = 0; row < ROWS; row++) {
    for (var col = 0; col < COLS; col++) {
      var key    = col + ',' + row;
      var px     = col * CELL;
      var py     = row * CELL;
      var isPath = PATH_SET[key];

      if (isPath) {
        // Dirt path
        var baseColor = ((col + row) % 2 === 0) ? '#b8935a' : '#a8844c';
        bctx.fillStyle = baseColor;
        bctx.fillRect(px, py, CELL, CELL);
        // Texture dots
        bctx.fillStyle = 'rgba(80,50,20,0.18)';
        for (var d = 0; d < 5; d++) {
          var tx = px + ((col * 7 + row * 3 + d * 13) % (CELL - 4)) + 2;
          var ty = py + ((col * 5 + row * 11 + d * 7) % (CELL - 4)) + 2;
          bctx.beginPath();
          bctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
          bctx.fill();
        }
      } else {
        // Grass (alternating shades)
        var grassColor = ((col + row) % 2 === 0) ? '#2a5a18' : '#245214';
        bctx.fillStyle = grassColor;
        bctx.fillRect(px, py, CELL, CELL);
        // Subtle texture
        bctx.fillStyle = 'rgba(0,80,0,0.12)';
        for (var g = 0; g < 3; g++) {
          var gx = px + ((col * 11 + row * 7 + g * 17) % (CELL - 4)) + 2;
          var gy = py + ((col * 3  + row * 13 + g * 5) % (CELL - 4)) + 2;
          bctx.beginPath();
          bctx.arc(gx, gy, 1, 0, Math.PI * 2);
          bctx.fill();
        }
      }
    }
  }

  // Subtle grid lines
  bctx.strokeStyle = 'rgba(0,0,0,0.12)';
  bctx.lineWidth   = 0.5;
  for (var c = 0; c <= COLS; c++) {
    bctx.beginPath();
    bctx.moveTo(c * CELL, 0);
    bctx.lineTo(c * CELL, CANVAS_H);
    bctx.stroke();
  }
  for (var r = 0; r <= ROWS; r++) {
    bctx.beginPath();
    bctx.moveTo(0, r * CELL);
    bctx.lineTo(CANVAS_W, r * CELL);
    bctx.stroke();
  }

  // Path direction arrows at key turns
  bctx.save();
  bctx.fillStyle   = 'rgba(255,230,80,0.45)';
  bctx.font        = '16px Arial';
  bctx.textAlign   = 'center';
  bctx.textBaseline = 'middle';
  var arrows = [
    { col: 2,  row: 6, ch: '→' },
    { col: 4,  row: 4, ch: '↑' },
    { col: 9,  row: 2, ch: '→' },
    { col: 14, row: 6, ch: '↓' },
    { col: 17, row: 10, ch: '→'}
  ];
  for (var a = 0; a < arrows.length; a++) {
    var ar = arrows[a];
    bctx.fillText(ar.ch, ar.col * CELL + CELL / 2, ar.row * CELL + CELL / 2);
  }
  bctx.restore();

  // Enemy spawn label above entry cell
  bctx.save();
  bctx.fillStyle    = 'rgba(220,60,60,0.9)';
  bctx.font         = 'bold 9px Arial Black, Arial';
  bctx.textAlign    = 'center';
  bctx.textBaseline = 'bottom';
  bctx.fillText('ENEMY SPAWN', WAYPOINTS[0].x, WAYPOINTS[0].y - 18);
  bctx.restore();

  // Draw castle
  this._drawCastle(bctx);
};

// ============================================================
//  Castle drawing
// ============================================================
Game.prototype._drawCastle = function(bctx) {
  var col  = CASTLE.col;
  var row  = CASTLE.row;
  var px   = col * CELL;
  var py   = row * CELL;
  var w    = CELL;
  var h    = CELL * 2; // spans rows 9-10

  // Stone base
  bctx.fillStyle = '#6a6050';
  drawRoundRect(bctx, px + 2, py + 4, w - 4, h - 4, 4);
  bctx.fill();

  // Stone wall pattern
  bctx.strokeStyle = '#4a4030';
  bctx.lineWidth   = 1;
  // Horizontal mortar lines
  for (var my = py + 14; my < py + h - 4; my += 10) {
    bctx.beginPath();
    bctx.moveTo(px + 2, my);
    bctx.lineTo(px + w - 2, my);
    bctx.stroke();
  }
  // Vertical mortar (offset rows)
  for (var mr = 0; mr < 3; mr++) {
    var oy = py + 14 + mr * 10;
    var ox = (mr % 2 === 0) ? px + w / 2 : px + 2;
    bctx.beginPath();
    bctx.moveTo(ox, oy - 10);
    bctx.lineTo(ox, oy);
    bctx.stroke();
  }

  // Battlements (crenellations) at top
  bctx.fillStyle = '#7a7060';
  var bw = 7;
  var bh = 10;
  for (var bn = 0; bn < 4; bn++) {
    var bx = px + 3 + bn * 9;
    drawRoundRect(bctx, bx, py + 2, bw, bh, 2);
    bctx.fill();
  }

  // Gate arch
  bctx.fillStyle = '#1a1008';
  bctx.beginPath();
  var gx = px + w / 2 - 7;
  var gy = py + h - 22;
  bctx.rect(gx, gy + 8, 14, 14);
  bctx.fill();
  bctx.beginPath();
  bctx.arc(px + w / 2, gy + 8, 7, Math.PI, 0, false);
  bctx.fillStyle = '#1a1008';
  bctx.fill();

  // Window with crown
  bctx.save();
  bctx.font         = '13px serif';
  bctx.textAlign    = 'center';
  bctx.textBaseline = 'middle';
  bctx.fillText('👑', px + w / 2, py + h / 2 - 6);
  bctx.restore();

  // "CASTLE" label below
  bctx.save();
  bctx.fillStyle    = '#f0c030';
  bctx.font         = 'bold 7px Arial Black, Arial';
  bctx.textAlign    = 'center';
  bctx.textBaseline = 'top';
  bctx.shadowColor  = '#000';
  bctx.shadowBlur   = 3;
  bctx.fillText('CASTLE', px + w / 2, py + h + 2);
  bctx.restore();
};

// ============================================================
//  startWave
// ============================================================
Game.prototype.startWave = function() {
  if (this.state !== 'build') return;

  this.waveNumber++;
  this.state = 'wave';

  var waveDef = WAVE_DEFS[this.waveNumber - 1];
  var hpMult  = 1 + (this.waveNumber - 1) * 0.08;

  // Build spawn queue with absolute timestamps
  var queue = [];
  for (var g = 0; g < waveDef.length; g++) {
    var group    = waveDef[g];
    var groupDelay = g * 0; // groups interleave; we'll compute absolute times
    // We stagger groups so each group starts after a gap
    for (var n = 0; n < group.count; n++) {
      queue.push({
        type:   group.type,
        delay:  g * 8 + n * group.interval,  // group offset + per-enemy interval
        hpMult: hpMult
      });
    }
  }

  // Sort by delay
  queue.sort(function(a, b) { return a.delay - b.delay; });
  this.spawnQueue = queue;
  this.spawnTimer = 0;

  if (typeof updateHUD === 'function') updateHUD();
};

// ============================================================
//  Game loop
// ============================================================
Game.prototype._loop = function(timestamp) {
  var self = this;
  if (this._lastTime === null) this._lastTime = timestamp;

  var rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
  this._lastTime = timestamp;

  if (this.state !== 'gameover' && this.state !== 'victory' && !this.paused) {
    this._update(rawDt);
  }

  this._render();

  requestAnimationFrame(function(ts) { self._loop(ts); });
};

// ============================================================
//  Update
// ============================================================
Game.prototype._update = function(rawDt) {
  var dt = rawDt * this.gameSpeed;

  // ---- BUILD PHASE ----
  if (this.state === 'build') {
    // Build timer is real-time (not speed-scaled)
    this.buildTimer -= rawDt;
    if (this.buildTimer <= 0) {
      this.buildTimer = 0;
      if (this.waveNumber < this.totalWaves) {
        this.startWave();
      }
    }
    if (typeof updateBuildTimer === 'function') {
      updateBuildTimer(Math.ceil(this.buildTimer));
    }
    this._updateFloatingTexts(dt);
    return;
  }

  // ---- WAVE PHASE ----
  if (this.state === 'wave') {
    // Spawn enemies
    this.spawnTimer += dt;
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
      var item  = this.spawnQueue.shift();
      var enemy = new Enemy(item.type, item.hpMult);
      this.enemies.push(enemy);
    }

    // Update enemies
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      e.update(dt);
      if (e.reachedCastle) {
        this.castleHp -= e.castleDmg;
        if (this.castleHp < 0) this.castleHp = 0;
        if (this.castleHp <= 0) {
          this.state = 'gameover';
          if (typeof showGameOver === 'function') showGameOver(this.waveNumber, this.kills);
          return;
        }
      }
    }

    // Update soldiers → generate projectiles
    for (var s = 0; s < this.soldiers.length; s++) {
      var sol  = this.soldiers[s];
      var proj = sol.update(dt, this.enemies);
      if (proj) this.projectiles.push(proj);
    }

    // Update projectiles → collect hits
    for (var p = 0; p < this.projectiles.length; p++) {
      var pr   = this.projectiles[p];
      if (pr.dead) continue;
      var hits = pr.update(dt, this.enemies);
      if (hits) {
        for (var h = 0; h < hits.length; h++) {
          var hit  = hits[h];
          var wasAlive = !hit.enemy.dead;
          hit.enemy.takeDamage(hit.damage);
          if (hit.slow) hit.enemy.applySlow(hit.slowFactor, hit.slowDuration);
          if (wasAlive && hit.enemy.dead) {
            // Enemy killed
            this.kills++;
            this.coins += hit.enemy.reward;
            this.floatingTexts.push(
              new FloatingText(hit.enemy.x, hit.enemy.y - 20,
                '+' + hit.enemy.reward + 'g', '#f0c030')
            );
            if (typeof updateHUD === 'function') updateHUD();
          }
        }
      }
    }

    // Clean dead entities
    this.enemies      = this.enemies.filter(function(e) { return !e.dead; });
    this.projectiles  = this.projectiles.filter(function(p) { return !p.dead; });

    // Check wave completion
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      // Wave complete
      if (this.waveNumber >= this.totalWaves) {
        this.state = 'victory';
        if (typeof showVictory === 'function') showVictory(this.kills, this.coins);
        return;
      } else {
        this.state      = 'build';
        this.buildTimer = this.BUILD_TIME;
        if (typeof updateHUD === 'function') updateHUD();
      }
    }
  }

  this._updateFloatingTexts(dt);
};

Game.prototype._updateFloatingTexts = function(dt) {
  for (var i = 0; i < this.floatingTexts.length; i++) {
    this.floatingTexts[i].update(dt);
  }
  this.floatingTexts = this.floatingTexts.filter(function(ft) { return !ft.dead; });
};

// ============================================================
//  Render
// ============================================================
Game.prototype._render = function() {
  var ctx = this.ctx;

  // Background
  ctx.drawImage(this.bgCanvas, 0, 0);

  // Placeable slot highlights
  ctx.save();
  for (var key in PLACEABLE_SET) {
    if (!this.occupiedCells[key]) {
      var parts = key.split(',');
      var pc    = parseInt(parts[0]);
      var pr    = parseInt(parts[1]);
      ctx.strokeStyle = 'rgba(80,200,80,0.35)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(pc * CELL + 1, pr * CELL + 1, CELL - 2, CELL - 2);
      ctx.setLineDash([]);
    }
  }
  ctx.restore();

  // Soldiers
  for (var si = 0; si < this.soldiers.length; si++) {
    var sol = this.soldiers[si];
    sol.draw(ctx, sol === this.selectedSoldier);
  }

  // Enemies
  for (var ei = 0; ei < this.enemies.length; ei++) {
    this.enemies[ei].draw(ctx);
  }

  // Projectiles
  for (var pi = 0; pi < this.projectiles.length; pi++) {
    this.projectiles[pi].draw(ctx);
  }

  // Floating texts
  for (var fi = 0; fi < this.floatingTexts.length; fi++) {
    this.floatingTexts[fi].draw(ctx);
  }

  // Spawn portal glow
  var portalX = WAYPOINTS[0].x;
  var portalY = WAYPOINTS[0].y;
  var grad    = ctx.createRadialGradient(portalX, portalY, 2, portalX, portalY, 28);
  grad.addColorStop(0,   'rgba(220,40,40,0.55)');
  grad.addColorStop(0.5, 'rgba(180,20,20,0.25)');
  grad.addColorStop(1,   'rgba(120,0,0,0)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(portalX, portalY, 28, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Castle HP bar
  this._renderCastleHpBar(ctx);

  // Build phase banner
  if (this.state === 'build') {
    this._renderBuildBanner(ctx);
  }
};

Game.prototype._renderCastleHpBar = function(ctx) {
  var pct  = Math.max(0, this.castleHp / CASTLE.maxHp);
  var bx   = CASTLE.col * CELL + 2;
  var by   = CASTLE.row * CELL - 10;
  var bw   = CELL - 4;
  var bh   = 6;

  ctx.save();
  ctx.fillStyle = '#333';
  drawRoundRect(ctx, bx, by, bw, bh, 3);
  ctx.fill();

  var color;
  if (pct > 0.6)      color = '#44cc44';
  else if (pct > 0.3) color = '#cccc22';
  else                color = '#cc2222';

  ctx.fillStyle = color;
  drawRoundRect(ctx, bx, by, bw * pct, bh, 3);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth   = 1;
  drawRoundRect(ctx, bx, by, bw, bh, 3);
  ctx.stroke();
  ctx.restore();
};

Game.prototype._renderBuildBanner = function(ctx) {
  var secs = Math.ceil(this.buildTimer);
  var text = '🔨 BUILD PHASE  —  Wave starts in ' + secs + 's';

  ctx.save();
  ctx.font         = 'bold 15px Arial Black, Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';

  var metrics = ctx.measureText(text);
  var bw      = metrics.width + 24;
  var bh      = 28;
  var bx      = CANVAS_W / 2 - bw / 2;
  var by      = 6;

  // Background pill
  ctx.fillStyle = 'rgba(10,8,4,0.82)';
  drawRoundRect(ctx, bx, by, bw, bh, 8);
  ctx.fill();
  ctx.strokeStyle = '#c8a020';
  ctx.lineWidth   = 1.5;
  drawRoundRect(ctx, bx, by, bw, bh, 8);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#f0c030';
  ctx.fillText(text, CANVAS_W / 2, by + 6);
  ctx.restore();
};

// ============================================================
//  Place / Select / Upgrade / Sell
// ============================================================
Game.prototype.placeSoldier = function(col, row) {
  var key = col + ',' + row;
  if (!PLACEABLE_SET[key])        return;
  if (this.occupiedCells[key])    return;
  var def = SOLDIER_DEFS[this.selectedSoldierType];
  if (this.coins < def.cost) {
    if (typeof flashInsufficientCoins === 'function') flashInsufficientCoins();
    return;
  }
  this.coins -= def.cost;
  var soldier = new Soldier(this.selectedSoldierType, col, row);
  this.soldiers.push(soldier);
  this.occupiedCells[key] = soldier;
  if (typeof updateHUD === 'function') updateHUD();
};

Game.prototype.selectSoldier = function(soldier) {
  this.selectedSoldier = soldier;
  if (typeof showUpgradePanel === 'function') showUpgradePanel(soldier);
};

Game.prototype.upgradeSoldier = function(soldier) {
  if (!soldier) return;
  if (soldier.level >= soldier.maxLevel) return;
  var cost = getUpgradeCost(soldier.type, soldier.level);
  if (this.coins < cost) {
    if (typeof flashInsufficientCoins === 'function') flashInsufficientCoins();
    return;
  }
  this.coins         -= cost;
  soldier.totalSpent += cost;
  soldier.upgrade();
  if (typeof showUpgradePanel === 'function') showUpgradePanel(soldier);
  if (typeof updateHUD === 'function') updateHUD();
};

Game.prototype.sellSoldier = function(soldier) {
  if (!soldier) return;
  var val = soldier.getSellValue();
  this.coins += val;
  this.floatingTexts.push(
    new FloatingText(soldier.x, soldier.y - 20, '+' + val + 'g (sold)', '#44cc44')
  );
  var key = soldier.col + ',' + soldier.row;
  delete this.occupiedCells[key];
  this.soldiers = this.soldiers.filter(function(s) { return s !== soldier; });
  this.selectedSoldier = null;
  if (typeof hideUpgradePanel === 'function') hideUpgradePanel();
  if (typeof updateHUD === 'function') updateHUD();
};

Game.prototype.setSpeed = function(s) {
  this.gameSpeed = s;
};
