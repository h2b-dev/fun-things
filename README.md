# Fun Things

A collection of tiny browser games. No dependencies, no build tools — just open in a browser and play.

## Games

### Tiny Dungeon
A roguelike dungeon crawler. Explore 5 procedurally generated floors, fight enemies, collect loot, and try to clear the dungeon. Available as a terminal game (Python/curses) and a browser game (JS/Canvas).

**[Play in your browser](https://h2b-dev.github.io/fun-things/)** | **[Play on itch.io](https://h2bdev.itch.io/tiny-dungeon)**

### Tiny Tower Defense
A grid-based tower defense game. Place towers to stop waves of enemies from reaching the exit. 4 tower types, 4 enemy types, 12 waves of increasing difficulty.

**[Play in your browser](https://h2b-dev.github.io/fun-things/tiny-td/)** | **[Play on itch.io](https://h2bdev.itch.io/tiny-tower-defense)**

### Tiny Puzzle
A Sokoban-style puzzle game. Push crates onto target squares across 25 hand-crafted levels. Features undo, level select, move counter with par targets, and progress saving.

**[Play in your browser](https://h2b-dev.github.io/fun-things/tiny-puzzle/)**

### Tiny Breakout
A classic brick-breaker arcade game. Smash bricks with a bouncing ball across 5 levels of increasing difficulty. Features powerups (wide paddle, multi-ball, slow motion, extra life), particle effects, and high score tracking.

**[Play in your browser](https://h2b-dev.github.io/fun-things/tiny-breakout/)**

### Tiny Space
A vertical shoot-em-up. Pilot your ship through 8 waves of enemies, dodge bullets, collect powerups, and defeat the boss. Features auto-fire, spread shots, shields, and high score tracking.

**[Play in your browser](https://h2b-dev.github.io/fun-things/tiny-space/)**

## Install

```bash
pip install tiny-dungeon
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv tool install tiny-dungeon
```

Then run:

```bash
tiny-dungeon
```

### Development

```bash
uv run -m tiny_dungeon
```

Requires Python 3.10+.

### Browser Version (Tiny Dungeon)

Open `tiny_dungeon_web/index.html` in any modern browser. No build tools or dependencies required.

## Controls

| Key              | Action                          |
|------------------|---------------------------------|
| Arrow keys / WASD / HJKL | Move                 |
| `>` or `.`       | Descend stairs                  |
| `<` or `,`       | Ascend stairs                   |
| `i`              | Open inventory                  |
| `1`-`5`          | Use inventory item              |
| `r`              | Restart (game over / win)       |
| `q`              | Quit                            |

## Gameplay

- **5 floors** of procedurally generated dungeons with rooms and corridors
- **Fog of war** — only see what's in your line of sight
- **3 enemy types**: Rats (floors 1-3), Skeletons (2-5), Dragons (4-5)
- **Bump-to-attack** combat — walk into enemies to fight them
- **Items**: Health Potions, Swords, Shields, Gold — dropped by enemies or found in rooms
- **Level up** by gaining XP from kills — increases HP, ATK, and DEF
- **Win** by clearing all enemies on floor 5

## Tile Legend

| Symbol | Meaning      |
|--------|--------------|
| `@`    | Player       |
| `#`    | Wall         |
| `.`    | Floor        |
| `+`    | Door         |
| `>`    | Stairs down  |
| `<`    | Stairs up    |
| `r`    | Rat          |
| `s`    | Skeleton     |
| `D`    | Dragon       |
| `!`    | Health Potion|
| `/`    | Sword        |
| `[`    | Shield       |
| `$`    | Gold         |
