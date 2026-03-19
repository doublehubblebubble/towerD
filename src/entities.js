// ============================================================
//  entities.js  —  Projectile, Enemy, Soldier, FloatingText
// ============================================================

// ---- Helper ------------------------------------------------
function drawRoundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// ============================================================
//  class Projectile
// ============================================================
function Projectile(sx, sy, target, damage, speed, color, radius, aoe, aoeRadius) {
  this.x            = sx;
  this.y            = sy;
  this.target       = target;
  this.damage       = damage;
  this.speed        = speed;
  this.color        = color;
  this.radius       = radius;
  this.aoe          = aoe;
  this.aoeRadius    = aoeRadius || 0;
  this.lastTargetX  = target ? target.x : sx;
  this.lastTargetY  = target ? target.y : sy;
  this.dead         = false;
}

Projectile.prototype.update = function(dt, enemies) {
  // Track living target
  if (this.target && !this.target.dead) {
    this.lastTargetX = this.target.x;
    this.lastTargetY = this.target.y;
  }

  var dx   = this.lastTargetX - this.x;
  var dy   = this.lastTargetY - this.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 8) {
    this.dead = true;
    var hits  = [];

    if (this.aoe) {
      // AOE: damage all enemies within aoeRadius of impact point
      for (var i = 0; i < enemies.length; i++) {
        var e  = enemies[i];
        if (e.dead) continue;
        var ex = e.x - this.lastTargetX;
        var ey = e.y - this.lastTargetY;
        if (Math.sqrt(ex * ex + ey * ey) <= this.aoeRadius) {
          hits.push({ enemy: e, damage: this.damage });
        }
      }
    } else {
      // Single target – only if target still alive
      if (this.target && !this.target.dead) {
        hits.push({ enemy: this.target, damage: this.damage });
      }
    }
    return hits;
  }

  // Move toward target
  var nx = dx / dist;
  var ny = dy / dist;
  var step = this.speed * dt;
  if (step > dist) step = dist;
  this.x += nx * step;
  this.y += ny * step;
  return null;
};

Projectile.prototype.draw = function(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
  ctx.fillStyle = this.color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();
};

// ============================================================
//  class Enemy
// ============================================================
function Enemy(type, hpMultiplier) {
  hpMultiplier = hpMultiplier || 1;
  this.type          = type;
  this.def           = ENEMY_DEFS[type];
  this.emoji         = this.def.emoji;
  this.color         = this.def.color;
  this.outlineColor  = this.def.outlineColor;
  this.radius        = this.def.radius;
  this.maxHp         = Math.round(this.def.hp * hpMultiplier);
  this.hp            = this.maxHp;
  this.speed         = this.def.speed;
  this.reward        = this.def.reward;
  this.castleDmg     = this.def.castleDmg;
  this.waypointIndex = 0;
  this.x             = WAYPOINTS[0].x;
  this.y             = WAYPOINTS[0].y;
  this.dead          = false;
  this.reachedCastle = false;
  this.flashTimer    = 0;
}

Enemy.prototype.update = function(dt) {
  if (this.waypointIndex >= WAYPOINTS.length) {
    this.reachedCastle = true;
    this.dead          = true;
    return;
  }

  if (this.flashTimer > 0) {
    this.flashTimer -= dt;
    if (this.flashTimer < 0) this.flashTimer = 0;
  }

  var wp = WAYPOINTS[this.waypointIndex];
  var dx = wp.x - this.x;
  var dy = wp.y - this.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 3) {
    this.waypointIndex++;
    if (this.waypointIndex >= WAYPOINTS.length) {
      this.reachedCastle = true;
      this.dead          = true;
    }
    return;
  }

  var step = this.speed * dt;
  if (step > dist) step = dist;
  this.x += (dx / dist) * step;
  this.y += (dy / dist) * step;
};

Enemy.prototype.takeDamage = function(amount) {
  this.hp         -= amount;
  this.flashTimer  = 0.12;
  if (this.hp <= 0) {
    this.hp   = 0;
    this.dead = true;
  }
};

Enemy.prototype.draw = function(ctx) {
  var r = this.radius;

  // Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(this.x, this.y + r * 0.8, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
  if (this.flashTimer > 0) {
    ctx.fillStyle = '#ff3333';
  } else {
    ctx.fillStyle = this.color;
  }
  ctx.fill();
  ctx.strokeStyle = this.outlineColor;
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.restore();

  // Emoji
  ctx.save();
  ctx.font         = Math.round(r * 1.1) + 'px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(this.emoji, this.x, this.y);
  ctx.restore();

  // HP bar
  var barW  = r * 2.2;
  var barH  = 5;
  var barX  = this.x - barW / 2;
  var barY  = this.y - r - 10;
  var pct   = Math.max(0, this.hp / this.maxHp);

  ctx.save();
  // background
  ctx.fillStyle = '#333';
  drawRoundRect(ctx, barX, barY, barW, barH, 2);
  ctx.fill();

  // fill color: green → yellow → red
  var hpColor;
  if (pct > 0.6)      hpColor = '#44cc44';
  else if (pct > 0.3) hpColor = '#cccc22';
  else                hpColor = '#cc2222';

  ctx.fillStyle = hpColor;
  drawRoundRect(ctx, barX, barY, barW * pct, barH, 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth   = 1;
  drawRoundRect(ctx, barX, barY, barW, barH, 2);
  ctx.stroke();
  ctx.restore();
};

// ============================================================
//  class Soldier
// ============================================================
function Soldier(type, col, row) {
  this.type        = type;
  this.def         = SOLDIER_DEFS[type];
  this.col         = col;
  this.row         = row;
  this.x           = col * CELL + CELL / 2;
  this.y           = row * CELL + CELL / 2;
  this.level       = 1;
  this.attackTimer = 0;
  this.totalSpent  = this.def.cost;
  this.showRange   = false;
}

Object.defineProperty(Soldier.prototype, 'damage', {
  get: function() { return this.def.damage[this.level - 1]; }
});
Object.defineProperty(Soldier.prototype, 'range', {
  get: function() { return this.def.range[this.level - 1]; }
});
Object.defineProperty(Soldier.prototype, 'fireRate', {
  get: function() { return this.def.fireRate[this.level - 1]; }
});
Object.defineProperty(Soldier.prototype, 'aoeRadius', {
  get: function() {
    if (!this.def.aoeRadius) return 0;
    return this.def.aoeRadius[this.level - 1];
  }
});
Object.defineProperty(Soldier.prototype, 'maxLevel', {
  get: function() { return 3; }
});

Soldier.prototype.upgrade = function() {
  if (this.level < this.maxLevel) this.level++;
};

Soldier.prototype.getSellValue = function() {
  return Math.floor(this.totalSpent * 0.6);
};

Soldier.prototype._findTarget = function(enemies) {
  var best     = null;
  var bestWp   = -1;
  var range    = this.range;
  var sx       = this.x;
  var sy       = this.y;

  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (e.dead) continue;
    var dx   = e.x - sx;
    var dy   = e.y - sy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= range) {
      // Prioritize highest waypointIndex (furthest along path)
      if (e.waypointIndex > bestWp) {
        bestWp = e.waypointIndex;
        best   = e;
      }
    }
  }
  return best;
};

Soldier.prototype.update = function(dt, enemies) {
  this.attackTimer -= dt;
  if (this.attackTimer > 0) return null;

  var target = this._findTarget(enemies);
  if (!target) return null;

  // Set next attack time
  this.attackTimer = 1 / this.fireRate;

  if (this.def.melee) {
    // Knight: direct damage, no projectile
    target.takeDamage(this.damage);
    return null;
  }

  // Ranged: create projectile
  return new Projectile(
    this.x, this.y,
    target,
    this.damage,
    this.def.projSpeed,
    this.def.projColor,
    this.def.projRadius,
    this.def.aoe,
    this.aoeRadius
  );
};

Soldier.prototype.draw = function(ctx, selected) {
  var x = this.x;
  var y = this.y;
  var r = CELL * 0.42;

  // Range circle
  if (this.showRange || selected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, this.range, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,220,80,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,220,80,0.06)';
    ctx.fill();
    ctx.restore();
  }

  // Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.8, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outer circle (bgColor)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle   = this.def.bgColor;
  ctx.fill();
  ctx.strokeStyle = selected ? '#f0c030' : 'rgba(0,0,0,0.7)';
  ctx.lineWidth   = selected ? 3 : 2;
  ctx.stroke();
  ctx.restore();

  // Inner circle (color)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = this.def.color;
  ctx.fill();
  ctx.restore();

  // Emoji
  ctx.save();
  ctx.font         = Math.round(r * 0.9) + 'px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(this.def.emoji, x, y);
  ctx.restore();

  // Gold selection ring
  if (selected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#f0c030';
    ctx.lineWidth   = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Level badge (if > 1)
  if (this.level > 1) {
    var bx = x + r * 0.55;
    var by = y - r * 0.55;
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.fillStyle   = '#f0c030';
    ctx.fill();
    ctx.strokeStyle = '#7a5010';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.fillStyle    = '#1a0e00';
    ctx.font         = 'bold 9px Arial';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.level, bx, by);
    ctx.restore();
  }
};

// ============================================================
//  class FloatingText
// ============================================================
function FloatingText(x, y, text, color) {
  this.x    = x;
  this.y    = y;
  this.text = text;
  this.color = color || '#f0c030';
  this.alpha = 1;
  this.vy   = -40;
  this.life = 1.2;
  this.dead = false;
}

FloatingText.prototype.update = function(dt) {
  this.y    += this.vy * dt;
  this.life -= dt;
  this.alpha = Math.max(0, this.life / 1.2);
  if (this.life <= 0) this.dead = true;
};

FloatingText.prototype.draw = function(ctx) {
  ctx.save();
  ctx.globalAlpha  = this.alpha;
  ctx.font         = 'bold 14px Arial Black, Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle  = 'rgba(0,0,0,0.8)';
  ctx.lineWidth    = 3;
  ctx.strokeText(this.text, this.x, this.y);
  ctx.fillStyle    = this.color;
  ctx.fillText(this.text, this.x, this.y);
  ctx.restore();
};
