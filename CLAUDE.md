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
```

## Running

Terminal version (Tiny Dungeon):
```bash
uv run -m tiny_dungeon
```

Browser games: open `tiny_dungeon_web/index.html` or `tiny_td_web/index.html` in a browser.

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
