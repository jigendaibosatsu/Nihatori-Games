# PuniPuni Arena

A tap/click-based real-time action arena featuring the PuniPuni blob character. Built with TypeScript and HTML5 Canvas.

## Controls

| Input | Action |
|-------|--------|
| **Tap/click on empty space** | Move toward that direction |
| **Single tap on character** | Normal attack (DPS) |
| **Double tap on character** | Stone Form (defense up, brief invulnerability) |
| **Double tap on empty space** | Hyper Attack (dash AoE, costs Energy) |
| **6+ rapid taps on character** | Multiply (spawn 2–5 clones) |
| **Circular drag around character** | Spin Attack (AoE while dragging) |
| **Hold on character + vertical drag** | Giant Smash (scale up, then slam) |

## Gesture Details

- **Spin**: Pointer down on/near PuniPuni, then drag in a circle (~300° within 700ms)
- **Giant**: Pointer down on character, hold 150ms+, drag vertically 40px+, release to slam
- **Multiply**: 6 or more clicks on character within 800ms
- **Double click**: Two taps within 250ms

## How to Run

```bash
cd games/punipuni-arena
npm install
npm run dev
```

Opens at `http://localhost:5174` (or the next available port).

## Build

```bash
npm run build
```

Outputs to `dist/`. To integrate with Nihatori Games:

1. Copy `dist/index.html` to `games/punipuni-arena/index.html`
2. Copy `dist/assets/*` to `games/punipuni-arena/assets/`

## Tech

- **TypeScript** + **HTML5 Canvas** (no frameworks)
- **Pointer Events** for mouse + touch
- **Fixed timestep** (60 Hz) for deterministic logic
- **Config file** (`src/config.ts`) for all tunable constants

## Game Rules

- **Win**: Survive 60 seconds OR defeat 15 enemies
- **Lose**: HP reaches 0
- Enemies spawn every 3 seconds and deal contact damage
- State priority: HITSTUN > DOWN > STONE > GIANT > SPIN > HYPER > ATTACK > MOVE > IDLE

## File Structure

```
punipuni-arena/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── src/
    ├── main.ts      # Entry point
    ├── config.ts    # All constants (cooldowns, damage, thresholds)
    ├── game.ts      # Main loop, state machine, input routing
    ├── character.ts # PuniPuni stats, damage formula
    ├── input.ts     # Pointer position helpers
    ├── gesture.ts   # Gesture recognition (double, multiply, spin, giant)
    ├── enemy.ts     # Enemy AI, collision
    ├── render.ts    # Canvas drawing
    └── ui.ts        # HP, Energy, cooldown display
```
