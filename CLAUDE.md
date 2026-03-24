# CLAUDE.md — The King's Road (Tower Defense)

## Project Overview
A browser-based tower defense game built with vanilla HTML/CSS/JavaScript (no frameworks, no build tools). Open `index.html` directly in a browser to play.

**Title:** The King's Road
**Canvas:** 840×520 px (21 cols × 13 rows, 40px cells)

## File Structure
```
index.html          — Main HTML, HUD layout, soldier tray cards
style.css           — All styling
src/
  constants.js      — PATH_CELLS, WAYPOINTS, SOLDIER_DEFS, ENEMY_DEFS, WAVE_DEFS, CASTLE
  entities.js       — Projectile, Enemy, Soldier, FloatingText classes
  game.js           — Game class: main loop, wave logic, combat, rendering
  audio.js          — Procedural background music (Web Audio API), mute toggle
  ui.js             — DOM event wiring, HUD updates, overlay, settings persistence
pics/
  preview.html      — Static map preview
  map_level1.html   — Level 1 map layout visualization
```

Script load order is important: `constants → entities → game → audio → ui`

## Game Mechanics

### Map
- S-shaped dirt path from left edge (col 0, row 6) to right edge (col 20, row 10) — enemies walk this path to the castle
- Towers can only be placed on cells **adjacent** to the path (not on path cells)
- Castle is at col 20, row 9 with 1000 max HP

### Towers (SOLDIER_DEFS in constants.js)
| Tower    | Cost | Special |
|----------|------|---------|
| Archer   | 50g  | Fast attack, mid range |
| Crossbow | 80g  | High damage, long range, slow fire |
| Mage     | 120g | AOE (radius 60), medium range |
| Knight   | 100g | Melee only (range 48), no projectile |
| Catapult | 200g | Highest damage, AOE (radius 90), slow fire |
| Glacier  | 90g  | Low damage, slows enemies 45% for 2s |

- **Upgrades:** Lv1→2→3 (cost = base × level). Only `damage` and `fireRate` scale; `range` and `aoeRadius` are **fixed**
- Upgrade cost formula: `getUpgradeCost(type, currentLevel)` in constants.js
- Sell refunds 60% of `totalSpent`

### Enemies (ENEMY_DEFS in constants.js)
goblin, orc, troll, darkKnight, dragon — each with HP, speed, reward (gold), castleDmg, radius

### Waves
- 20 waves total (WAVE_DEFS array in constants.js)
- Each wave is an array of groups `{type, count, interval}`
- Build phase: 15s timer (configurable via `GameSettings.buildTime`)
- Speed multipliers: 1×, 2×, 3×
- Difficulty multiplier applies to enemy HP

### Initial Soldiers (free, pre-placed)
2 Archers, 1 Crossbow, 2 Mages, 1 Knight — defined in `game.js:_placeInitialSoldiers`

## Settings (localStorage)
`GameSettings` object persisted by `ui.js`:
- `musicVolume` (0.55 default)
- `difficulty`: 'easy' | 'normal' | 'hard'
- `difficultyMult`: applied to enemy HP
- `buildTime`: 15s default

## Key Design Decisions
- Projectiles track living targets; on death they continue to last known position
- AOE splash hits all enemies within `aoeRadius` of impact
- Slow effect: enemies get `slowFactor` (0.45) applied to speed for `slowDuration` (2.0s)
- Background is pre-rendered to an offscreen canvas for performance
- Music generated procedurally via Web Audio API (no audio files)
- Pause (P key or button) shows modal with Resume / Exit options
