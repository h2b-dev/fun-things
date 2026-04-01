# Tiny Dungeon

A tiny roguelike dungeon crawler that runs in your terminal. Explore 5 procedurally generated floors, fight enemies, collect loot, and try to clear the dungeon.

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
