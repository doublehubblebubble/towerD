// ============================================================
//  constants.js  —  All game constants and data definitions
// ============================================================

var CELL     = 40;
var COLS     = 21;
var ROWS     = 13;
var CANVAS_W = COLS * CELL; // 840
var CANVAS_H = ROWS * CELL; // 520

// S-shaped dirt path from left (enemy spawn) to right (castle)
var PATH_CELLS = [
  [0,6],[1,6],[2,6],[3,6],[4,6],
  [4,5],[4,4],[4,3],[4,2],
  [5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],
  [14,3],[14,4],[14,5],[14,6],[14,7],[14,8],[14,9],[14,10],
  [15,10],[16,10],[17,10],[18,10],[19,10],[20,10]
];

var WAYPOINTS = PATH_CELLS.map(function(cr) {
  return { x: cr[0] * CELL + CELL / 2, y: cr[1] * CELL + CELL / 2 };
});

// Build a fast lookup set for path cells
var PATH_SET = {};
PATH_CELLS.forEach(function(cr) {
  PATH_SET[cr[0] + ',' + cr[1]] = true;
});

// Placeable cells = cells adjacent to path (not on path, not out of bounds)
var PLACEABLE_CELLS = [];
var PLACEABLE_SET   = {};

(function() {
  var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  var seen = {};
  PATH_CELLS.forEach(function(cr) {
    dirs.forEach(function(d) {
      var nc = cr[0] + d[0];
      var nr = cr[1] + d[1];
      var key = nc + ',' + nr;
      if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS
          && !PATH_SET[key] && !seen[key]) {
        seen[key] = true;
        PLACEABLE_CELLS.push([nc, nr]);
        PLACEABLE_SET[key] = true;
      }
    });
  });
})();

// Castle constant
var CASTLE = { col: 20, row: 9, maxHp: 1000 };

// ============================================================
//  SOLDIER_DEFS
// ============================================================
var SOLDIER_DEFS = {
  archer: {
    cost: 50,
    color: '#4a9a28', bgColor: '#2a5a14', emoji: '🏹',
    damage:    [15, 22, 35],
    range:     [120, 145, 170],
    fireRate:  [1.2, 1.5, 2.0],
    projSpeed: 220, projColor: '#8B4513', projRadius: 4,
    aoe: false, melee: false
  },
  crossbow: {
    cost: 80,
    color: '#2a6aaa', bgColor: '#1a3a6a', emoji: '🎯',
    damage:    [35, 55, 80],
    range:     [180, 200, 220],
    fireRate:  [0.6, 0.8, 1.0],
    projSpeed: 300, projColor: '#4488cc', projRadius: 5,
    aoe: false, melee: false
  },
  mage: {
    cost: 120,
    color: '#7a2aaa', bgColor: '#4a1070', emoji: '⚡',
    damage:    [40, 65, 100],
    range:     [100, 120, 140],
    fireRate:  [0.7, 0.9, 1.1],
    projSpeed: 180, projColor: '#cc44ff', projRadius: 8,
    aoe: true, aoeRadius: [50, 65, 80], melee: false
  },
  knight: {
    cost: 100,
    color: '#4a4a9a', bgColor: '#2a2a6a', emoji: '⚔',
    damage:    [30, 50, 75],
    range:     [48, 48, 56],
    fireRate:  [1.0, 1.2, 1.5],
    projSpeed: 0, projColor: '#6070d0', projRadius: 0,
    aoe: false, melee: true
  },
  catapult: {
    cost: 200,
    color: '#c87820', bgColor: '#7a4810', emoji: '💣',
    damage:    [80, 130, 200],
    range:     [220, 250, 280],
    fireRate:  [0.3, 0.4, 0.5],
    projSpeed: 140, projColor: '#cc6600', projRadius: 10,
    aoe: true, aoeRadius: [80, 100, 120], melee: false
  }
};

var SOLDIER_ORDER = ['archer', 'crossbow', 'mage', 'knight', 'catapult'];

// ============================================================
//  ENEMY_DEFS
// ============================================================
var ENEMY_DEFS = {
  goblin: {
    emoji: '👺', color: '#4a8a20', outlineColor: '#2a5a10',
    hp: 60,   speed: 75,  reward: 5,   castleDmg: 10,  radius: 14
  },
  orc: {
    emoji: '👹', color: '#6a3a10', outlineColor: '#3a1a00',
    hp: 180,  speed: 48,  reward: 10,  castleDmg: 25,  radius: 18
  },
  troll: {
    emoji: '🧌', color: '#3a7a2a', outlineColor: '#1a4a10',
    hp: 450,  speed: 32,  reward: 25,  castleDmg: 50,  radius: 22
  },
  darkKnight: {
    emoji: '🗡', color: '#2a2a4a', outlineColor: '#1a1a2a',
    hp: 380,  speed: 55,  reward: 30,  castleDmg: 40,  radius: 18
  },
  dragon: {
    emoji: '🐉', color: '#8a1010', outlineColor: '#4a0808',
    hp: 2200, speed: 28,  reward: 100, castleDmg: 200, radius: 28
  }
};

// ============================================================
//  WAVE_DEFS  (array of group arrays; group = {type, count, interval})
// ============================================================
var WAVE_DEFS = [
  [{type:'goblin',    count:8,  interval:1.5}],
  [{type:'goblin',    count:12, interval:1.2}],
  [{type:'goblin',    count:8,  interval:1.2}, {type:'orc',       count:3,  interval:2.0}],
  [{type:'orc',       count:6,  interval:1.8}],
  [{type:'orc',       count:5,  interval:1.5}, {type:'dragon',    count:1,  interval:0}],
  [{type:'goblin',    count:10, interval:1.0}, {type:'troll',     count:2,  interval:3.0}],
  [{type:'orc',       count:8,  interval:1.5}, {type:'troll',     count:3,  interval:3.0}],
  [{type:'goblin',    count:15, interval:0.8}, {type:'orc',       count:5,  interval:1.5}],
  [{type:'troll',     count:5,  interval:2.5}, {type:'darkKnight',count:3,  interval:2.0}],
  [{type:'darkKnight',count:4,  interval:1.8}, {type:'dragon',    count:1,  interval:0}],
  [{type:'goblin',    count:20, interval:0.7}, {type:'orc',       count:6,  interval:1.2}],
  [{type:'orc',       count:10, interval:1.2}, {type:'troll',     count:4,  interval:2.5}],
  [{type:'troll',     count:6,  interval:2.0}, {type:'darkKnight',count:5,  interval:1.8}],
  [{type:'darkKnight',count:8,  interval:1.5}, {type:'troll',     count:4,  interval:2.5}],
  [{type:'darkKnight',count:6,  interval:1.5}, {type:'troll',     count:4,  interval:2.5}, {type:'dragon',count:1,interval:0}],
  [{type:'goblin',    count:25, interval:0.6}, {type:'orc',       count:10, interval:1.0}, {type:'troll',count:5,interval:2.0}],
  [{type:'troll',     count:8,  interval:1.8}, {type:'darkKnight',count:8,  interval:1.5}],
  [{type:'darkKnight',count:12, interval:1.2}, {type:'troll',     count:6,  interval:2.0}],
  [{type:'goblin',    count:20, interval:0.6}, {type:'darkKnight',count:10, interval:1.2}, {type:'troll',count:6,interval:2.0}],
  [{type:'darkKnight',count:8,  interval:1.2}, {type:'troll',     count:8,  interval:1.8}, {type:'dragon',count:2,interval:5.0}]
];

// ============================================================
//  getUpgradeCost
// ============================================================
function getUpgradeCost(type, currentLevel) {
  var base = SOLDIER_DEFS[type].cost;
  if (currentLevel === 1) return base * 1;
  if (currentLevel === 2) return base * 2;
  return Infinity; // max level
}
