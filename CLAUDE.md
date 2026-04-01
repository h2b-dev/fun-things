# Fun Things — Dev Notes

## Project Structure

```
tiny_dungeon/              — Terminal version (Python/curses)
  __init__.py              — Package marker
  __main__.py              — Entry point, input handling, game loop
  state.py                 — GameState: floor management, combat, items, win/death
  dungeon.py               — Procedural dungeon generation (rooms, corridors, FOV)
  entities.py              — Player and enemy definitions
  items.py                 — Item types, drops, inventory
  screens.py               — Curses rendering (title, game, inventory, game over, win)

tiny_dungeon_web/          — Browser version (JS/Canvas)
  index.html               — Entry point, open in browser
  style.css                — Layout and styling
  game.js                  — All game logic, rendering, input (single file, no deps)

tiny_td_web/               — Tiny Tower Defense (JS/Canvas)
  index.html               — Entry point, open in browser
  style.css                — Layout and styling
  game.js                  — All game logic, rendering, input (single file, no deps)

tiny_puzzle_web/           — Tiny Puzzle / Sokoban (JS/Canvas)
  index.html               — Entry point, open in browser
  style.css                — Layout and styling
  game.js                  — All game logic, rendering, input (single file, no deps)

tiny_breakout_web/         — Tiny Breakout / Brick Breaker (JS/Canvas)
  index.html               — Entry point, open in browser
  style.css                — Layout and styling
  game.js                  — All game logic, rendering, input (single file, no deps)

tiny_space_web/            — Tiny Space / Shoot-em-up (JS/Canvas)
  index.html               — Entry point, open in browser
  style.css                — Layout and styling
  game.js                  — All game logic, rendering, input (single file, no deps)
```

## Running

Terminal version (Tiny Dungeon):
```bash
uv run -m tiny_dungeon
```

Browser games: open `tiny_dungeon_web/index.html`, `tiny_td_web/index.html`, `tiny_puzzle_web/index.html`, `tiny_breakout_web/index.html`, or `tiny_space_web/index.html` in a browser.

## Key Design Decisions

### Tiny Dungeon
- **MST connectivity**: rooms are connected via minimum spanning tree to guarantee all rooms are reachable
- **Raycasting FOV**: 360-degree raycast with radius 8 for fog of war
- **Turn-based**: player moves first, then all enemies move/attack
- **Enemy AI**: simple manhattan-distance chase within 6 tiles
- **Balance**: ~40% win rate with optimal play. Player starts at 25 HP, enemies scale with depth.

### Tiny Tower Defense
- **Fixed path**: enemies follow a predefined serpentine path from entry to exit
- **4 tower types**: Arrow (fast/cheap), Cannon (AoE), Ice (slow), Lightning (chain)
- **4 enemy types**: Normal, Fast, Tank, Flying (only hit by Arrow/Lightning)
- **12 waves**: escalating difficulty with mixed enemy compositions
- **Economy**: start with 150 gold, earn gold per kill, spend on towers

### Tiny Puzzle
- **Classic Sokoban**: push crates onto target squares
- **25 hand-crafted levels**: increasing difficulty, each with a par move count
- **Undo system**: full move-by-move undo via history stack
- **Level select**: click-to-play grid with completion tracking and best scores
- **Progress persistence**: localStorage saves completed levels and best move counts

### Tiny Breakout
- **Classic brick breaker**: paddle, ball, bricks — reflex-based arcade action
- **5 levels**: escalating speed, multi-hit bricks from level 3+
- **4 powerup types**: Wide paddle, Multi-ball, Slow motion, Extra life (12% drop rate)
- **Scoring**: row-based points (7/5/3/1) multiplied by level number
- **Controls**: mouse (smooth follow) or arrow keys/WASD
- **High score persistence**: localStorage tracks best score

### Tiny Space
- **Vertical shoot-em-up**: player ship, enemies, bullets — reflex-based arcade action
- **8 waves**: escalating difficulty with 5 enemy types (scout, fighter, bomber, cruiser, boss)
- **Auto-fire**: continuous shooting, focus on movement and dodging
- **4 powerup types**: Spread shot, Shield, Rapid fire, Extra life (15% drop rate)
- **Boss fight**: wave 8 features a high-HP boss with aimed shots
- **Controls**: arrow keys/WASD (full movement) or mouse (horizontal aim)
- **High score persistence**: localStorage tracks best score
