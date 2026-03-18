# Tower Defense Game — Product Requirements Document

> **Status:** Design phase complete. Ready for implementation.
> **Last updated:** 2026-03-18

---

## Overview

A browser-based medieval tower defense game. A king defends his castle against waves of enemies marching along a fixed path. Players place and upgrade soldiers using coins collected from defeated enemies.

---

## Core Concept

| | |
|---|---|
| **Theme** | Medieval fantasy — the King's last stand |
| **Genre** | Tower Defense (grid-based, fixed path) |
| **Platform** | Web browser, desktop-first |
| **Tech Stack** | Vanilla JS + HTML5 Canvas (no framework) |
| **Art Style** | Clash of Clans–inspired: chibi proportions, thick outlines, saturated colors, SVG illustrations |
| **Win Condition** | Survive all 20 waves |
| **Lose Condition** | Castle HP reaches 0 |

---

## Game Loop

```
[Build Phase]  Player places / upgrades soldiers (10–15 sec timer)
      ↓
[Wave Phase]   Enemies spawn left → march S-path → attack castle
      ↓
[Kill & Earn]  Enemies die → drop coins → auto-collected
      ↓
[Repeat]       Next wave, harder enemies
      ↓
[End]          Wave 20 cleared = Victory / Castle HP 0 = Game Over
```

---

## Map Design

### Layout
- **Grid:** 21 columns × 13 rows, each cell = 40×40 px → 840×520 px map area
- **Path:** Fixed S-shaped dirt path, enemies always follow it
- **Placement:** Grid cells adjacent to the path are highlighted as placeable slots

### S-Path (Level 1)
```
Entry (left, row 6) → right → turn UP → right across top → turn DOWN → right to castle
```
| Segment | Direction | Description |
|---|---|---|
| Entry | → | Col 0–4, Row 6 |
| Turn 1 | ↑ | Col 4, Row 6→2 |
| Top lane | → | Col 4–14, Row 2 |
| Turn 2 | ↓ | Col 14, Row 2→10 |
| Exit lane | → | Col 14–20, Row 10 → Castle |

### Castle
- Fixed at far right (col 20, row 9–10)
- Has HP bar shown in HUD

### Enemy Spawn
- Portal at col 0, row 6 (left center)

---

## UI Layout

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                  MAP  (840 × 520)                    │
│     Grid + S-Path + Soldiers + Enemies + Castle      │
│                                                      │
├──────────────────── gold divider ────────────────────┤
│  HUD TOP ROW:                                        │
│  Wave 1/20 | Wave Progress | 🏰 HP bar | 🪙 Coins   │
│  Kills | Speed (1×/2×) | [▶ Start Wave] button       │
├──────────────────────────────────────────────────────┤
│  HUD BOTTOM ROW (Soldier Tray):                      │
│  [🏹Archer] [🎯Crossbow] [⚡Mage] [⚔Knight]        │
│  [💣Catapult] [👑King★]                              │
│  Each card: icon / name / DMG·SPD·RNG bars / cost    │
└──────────────────────────────────────────────────────┘
```

### HUD Elements

| Element | Location | Description |
|---|---|---|
| Wave counter | HUD top-left | "Wave 1 / 20" |
| Wave progress bar | HUD top | Orange fill bar, shows next enemy type |
| Castle HP bar | HUD top-center | Green bar, "1000 / 1000" |
| Coin counter | HUD top-right | 🪙 current coins |
| Kill counter | HUD top-right | ⚔ total kills |
| Speed toggle | HUD top-right | 1× / 2× buttons |
| Start Wave button | HUD top-right | Disabled during wave, pulse animation during build |
| Soldier tray | HUD bottom | 6 cards (5 soldiers + King hero) |
| Upgrade panel | In-map overlay | Appears on click of placed soldier |
| Game Over screen | Full overlay | Shows wave reached, kills, retry button |
| Victory screen | Full overlay | Crown animation, stats, replay button |

---

## Soldiers

All soldiers placed on grid cells adjacent to the path. Each has 3 upgrade levels.

| # | Soldier | Role | DMG | SPD | RNG | AOE | Lv3 Ability | Cost |
|---|---|---|---|---|---|---|---|---|
| 1 | Archer | Ranged DPS | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ | — | Twin shot | 50 🪙 |
| 2 | Crossbowman | Sniper | ★★★★☆ | ★★☆☆☆ | ★★★★★ | — | Piercing bolt | 80 🪙 |
| 3 | Mage | AOE Nuker | ★★★★☆ | ★★☆☆☆ | ★★☆☆☆ | ★ Splash | Chain lightning | 120 🪙 |
| 4 | Knight | Melee Tank | ★★★☆☆ | ★★★☆☆ | ★☆☆☆☆ | — | Slow on hit | 100 🪙 |
| 5 | Catapult | Siege | ★★★★★ | ★☆☆☆☆ | ★★★★★ | ★★ Massive | Flaming boulder | 200 🪙 |

### Upgrade Costs (per soldier)
| Level | Cost | Effect |
|---|---|---|
| Lv 1 → 2 | 50% of base cost | +20% DMG, +10% SPD, +10% RNG |
| Lv 2 → 3 | 100% of base cost | +40% DMG, +20% SPD, +20% RNG + unlock ability |

---

## King (Hero Unit)

Special unit, unique, auto-deployed near castle. Cannot be moved.

| Stat | Value |
|---|---|
| Role | Hero / Melee defender |
| DMG | ★★★★★ |
| SPD | ★★★☆☆ |
| RNG | Melee (1 cell) |
| Special | AOE shockwave every 10s |
| Lv3 Ability | Royal Rage — temporary speed + damage buff |
| Cost | Unlocked from start, no cost |

### King Design (visual reference)
- Blue royal cape over gray underlayer
- Gold crown (5 spikes, blue headband, diamond gem)
- Thick dark charcoal beard and mustache
- Big laughing expression
- Gold square-link chain necklace
- Gold crown-shaped belt buckle held in hands
- Dark boots with gold toe caps
- Chunky chibi proportions (CoC style)

---

## Enemies

Spawn from left portal, march S-path to castle. On reaching castle: deal damage to castle HP.

| Enemy | HP | Speed | Castle DMG | Coin Reward | First Appears |
|---|---|---|---|---|---|
| Goblin | 50 | Fast | 10 | 5 🪙 | Wave 1 |
| Orc | 150 | Medium | 25 | 10 🪙 | Wave 3 |
| Troll | 400 | Slow | 50 | 25 🪙 | Wave 6 |
| Dark Knight | 350 | Medium | 40 | 30 🪙 | Wave 10 |
| Dragon (Boss) | 2000 | Slow | 200 | 100 🪙 | Wave 5, 10, 15, 20 |

### Wave Composition
| Wave | Enemies |
|---|---|
| 1 | 8× Goblin |
| 2 | 12× Goblin |
| 3 | 8× Goblin + 3× Orc |
| 4 | 6× Orc |
| 5 | 5× Orc + **1× Dragon (Boss)** |
| 6–9 | Mix: Goblin / Orc / Troll, increasing |
| 10 | 4× Dark Knight + **1× Dragon (Boss)** |
| 11–14 | All types, scaling HP +10% per wave |
| 15 | Elite mix + **1× Dragon (Boss)** |
| 16–19 | Full elite waves |
| 20 | All types, max HP + **2× Dragon (Boss)** |

---

## Coin Economy

| Action | Amount |
|---|---|
| Starting coins | 100 🪙 |
| Goblin kill | +5 🪙 |
| Orc kill | +10 🪙 |
| Troll kill | +25 🪙 |
| Dark Knight kill | +30 🪙 |
| Dragon kill | +100 🪙 |
| Place Archer | −50 🪙 |
| Place Crossbow | −80 🪙 |
| Place Mage | −120 🪙 |
| Place Knight | −100 🪙 |
| Place Catapult | −200 🪙 |

---

## Technical Design

### File Structure
```
towerD/
├── index.html              # Game entry, canvas + HUD
├── style.css               # Layout, HUD, overlays
├── src/
│   ├── main.js             # Boot, game loop (requestAnimationFrame)
│   ├── game.js             # State machine: BUILD / WAVE / GAMEOVER / WIN
│   ├── map.js              # Grid data, path cells, placeable slots
│   ├── soldiers/
│   │   ├── soldier.js      # Base class: pos, level, attack(), upgrade()
│   │   └── types.js        # Archer, Crossbow, Mage, Knight, Catapult, King
│   ├── enemies/
│   │   ├── enemy.js        # Base class: hp, speed, pathIndex, takeDamage()
│   │   └── types.js        # Goblin, Orc, Troll, DarkKnight, Dragon
│   ├── wave.js             # Wave definitions, spawn scheduler
│   ├── economy.js          # Coin balance, spend(), earn()
│   ├── projectile.js       # Bullets/arrows/spells in flight
│   └── ui.js               # HUD render, soldier tray, upgrade panel
├── assets/
│   └── soldiers/           # SVG files: archer.svg, mage.svg, etc.
└── pics/                   # Design references (not shipped)
```

### Game States
```
IDLE → BUILD_PHASE → WAVE_PHASE → (loop) → VICTORY
                                ↘ GAME_OVER
```

### Rendering
- Single `<canvas>` for map + entities
- HUD in HTML/CSS below the canvas (not on canvas)
- 60 fps via `requestAnimationFrame`
- Soldiers and enemies rendered as colored circles + emoji icons (v1)

---

## Assets (designed)

| File | Description |
|---|---|
| `pics/archer.svg` | Archer — green hooded, CoC chibi style |
| `pics/crossbowman.svg` | Crossbowman — blue armored, visored helmet |
| `pics/mage.svg` | Mage — purple robes, wizard hat, white beard |
| `pics/knight.svg` | Knight — full plate armor, glowing visor, sword+shield |
| `pics/catapult.svg` | Catapult — wooden siege machine, fire boulder, operator |
| `pics/king.svg` | King — blue cape, gold crown, dark beard, CoC Clash Royale style |
| `pics/map_level1.html` | Level 1 map mockup with HUD panel |
| `pics/preview.html` | Soldier roster gallery |

---

## Out of Scope (v1)

- Multiplayer
- Mobile / touch
- Sound effects & music
- Persistent save / leaderboard
- Story cutscenes
- Multiple maps

## Stretch Goals (v2+)

- More maps with different path layouts
- Additional enemy types
- Hero ability UI (manual trigger)
- Sound effects and background music
- Leaderboard
- Mobile support
