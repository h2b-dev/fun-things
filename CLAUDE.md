# Tiny Dungeon — Dev Notes

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
```

## Running

Terminal version:
```bash
uv run -m tiny_dungeon
```

Browser version: open `tiny_dungeon_web/index.html` in a browser.

## Key Design Decisions

- **MST connectivity**: rooms are connected via minimum spanning tree to guarantee all rooms are reachable
- **Raycasting FOV**: 360-degree raycast with radius 8 for fog of war
- **Turn-based**: player moves first, then all enemies move/attack
- **Enemy AI**: simple manhattan-distance chase within 6 tiles
- **Balance**: ~40% win rate with optimal play. Player starts at 25 HP, enemies scale with depth.

## Future Work Ideas

- More enemy types and boss encounters
- Ranged weapons/spells
- Save/load system
- Minimap
- Sound effects
- Configurable keybindings
