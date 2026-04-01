"""Screen rendering for Tiny Dungeon."""

from __future__ import annotations

import curses

from .dungeon import Tile
from .state import GameState

TITLE_ART = r"""
  _____ _               ____
 |_   _(_)_ __  _   _  |  _ \ _   _ _ __   __ _  ___  ___  _ __
   | | | | '_ \| | | | | | | | | | | '_ \ / _` |/ _ \/ _ \| '_ \
   | | | | | | | |_| | | |_| | |_| | | | | (_| |  __/ (_) | | | |
   |_| |_|_| |_|\__, | |____/ \__,_|_| |_|\__, |\___|\___/|_| |_|
                 |___/                      |___/
""".strip("\n")

# Color pairs
_COLOR_DIM = 1
_COLOR_STAIRS = 2
_COLOR_ENEMY = 3
_COLOR_PLAYER = 4
_COLOR_MSG = 5
_COLOR_ITEM = 6
_COLORS_INITIALIZED = False


def _center_text(win: curses.window, y: int, text: str) -> None:
    _, max_x = win.getmaxyx()
    x = max(0, (max_x - len(text)) // 2)
    try:
        win.addstr(y, x, text)
    except curses.error:
        pass


def _center_block(win: curses.window, start_y: int, block: str) -> None:
    for i, line in enumerate(block.splitlines()):
        _center_text(win, start_y + i, line)


def _init_colors() -> None:
    global _COLORS_INITIALIZED
    if _COLORS_INITIALIZED:
        return
    _COLORS_INITIALIZED = True
    try:
        curses.start_color()
        curses.use_default_colors()
        curses.init_pair(_COLOR_DIM, curses.COLOR_BLUE, -1)
        curses.init_pair(_COLOR_STAIRS, curses.COLOR_YELLOW, -1)
        curses.init_pair(_COLOR_ENEMY, curses.COLOR_RED, -1)
        curses.init_pair(_COLOR_PLAYER, curses.COLOR_GREEN, -1)
        curses.init_pair(_COLOR_MSG, curses.COLOR_CYAN, -1)
        curses.init_pair(_COLOR_ITEM, curses.COLOR_MAGENTA, -1)
    except curses.error:
        pass


_TILE_DISPLAY = {
    Tile.WALL: "#",
    Tile.FLOOR: ".",
    Tile.DOOR: "+",
    Tile.STAIRS_DOWN: ">",
    Tile.STAIRS_UP: "<",
}


def draw_title(win: curses.window) -> None:
    win.clear()
    max_y, _ = win.getmaxyx()
    art_lines = TITLE_ART.count("\n") + 1
    top = max(1, (max_y - art_lines - 4) // 2)

    _center_block(win, top, TITLE_ART)
    _center_text(win, top + art_lines + 2, "Press any key to start")
    _center_text(win, top + art_lines + 4, "q to quit")
    win.refresh()


def draw_playing(win: curses.window, state: GameState) -> None:
    win.clear()
    max_y, max_x = win.getmaxyx()
    _init_colors()

    p = state.player
    dungeon = state._current_dungeon()
    enemies = state._current_enemies()
    items = state._current_items()

    # Row 0: status bar
    status = f" F:{state.floor}  HP:{p.hp}/{p.max_hp}  ATK:{p.atk}  DEF:{p.defense}  Lv:{p.level}  XP:{p.xp}/{p.xp_to_next}  Score:{state.score} "
    try:
        win.addstr(0, 0, status.ljust(max_x - 1), curses.A_REVERSE)
    except curses.error:
        pass

    # Rows 1..MAP_HEIGHT: dungeon map
    map_offset_y = 1
    for y in range(min(dungeon.height, max_y - 4)):
        for x in range(min(dungeon.width, max_x)):
            if dungeon.visible[y][x]:
                tile = dungeon.tiles[y][x]
                ch = _TILE_DISPLAY.get(tile, "?")
                if tile in (Tile.STAIRS_DOWN, Tile.STAIRS_UP):
                    attr = curses.color_pair(_COLOR_STAIRS) | curses.A_BOLD
                else:
                    attr = 0
                try:
                    win.addch(y + map_offset_y, x, ch, attr)
                except curses.error:
                    pass
            elif dungeon.revealed[y][x]:
                tile = dungeon.tiles[y][x]
                ch = _TILE_DISPLAY.get(tile, "?")
                try:
                    win.addch(y + map_offset_y, x, ch, curses.color_pair(_COLOR_DIM))
                except curses.error:
                    pass

    # Draw items (only visible, not picked up)
    for di in items:
        if not di.picked_up and dungeon.visible[di.y][di.x]:
            iy = di.y + map_offset_y
            if 0 <= iy < max_y and 0 <= di.x < max_x:
                try:
                    win.addch(iy, di.x, di.item.char, curses.color_pair(_COLOR_ITEM) | curses.A_BOLD)
                except curses.error:
                    pass

    # Draw enemies (only if visible)
    for e in enemies:
        if e.alive and dungeon.visible[e.y][e.x]:
            ey = e.y + map_offset_y
            if 0 <= ey < max_y and 0 <= e.x < max_x:
                try:
                    win.addch(ey, e.x, e.char, curses.color_pair(_COLOR_ENEMY) | curses.A_BOLD)
                except curses.error:
                    pass

    # Draw player
    py = p.y + map_offset_y
    if 0 <= py < max_y and 0 <= p.x < max_x:
        try:
            win.addch(py, p.x, "@", curses.color_pair(_COLOR_PLAYER) | curses.A_BOLD)
        except curses.error:
            pass

    # Message log (last 3 messages)
    msg_start = min(dungeon.height + map_offset_y, max_y - 4)
    for i, msg in enumerate(state.messages):
        row = msg_start + i
        if row < max_y - 1:
            try:
                win.addstr(row, 0, msg[: max_x - 1], curses.color_pair(_COLOR_MSG))
            except curses.error:
                pass

    # Help line at very bottom
    help_row = max_y - 1
    help_text = "Move: arrows/wasd/hjkl  >: descend  <: ascend  i: inventory  q: quit"
    try:
        win.addstr(help_row, 0, help_text[: max_x - 1])
    except curses.error:
        pass

    win.refresh()


def draw_inventory(win: curses.window, state: GameState) -> None:
    win.clear()
    max_y, max_x = win.getmaxyx()
    _init_colors()

    _center_text(win, 1, "=== INVENTORY ===")

    if not state.inventory:
        _center_text(win, 3, "(empty)")
    else:
        for i, item in enumerate(state.inventory):
            text = f"  {i + 1}) {item.describe()}"
            try:
                win.addstr(3 + i, 2, text[: max_x - 3])
            except curses.error:
                pass

    _center_text(win, max_y - 2, "1-5: use item  |  i/Esc: close inventory")
    win.refresh()


def draw_game_over(win: curses.window, state: GameState) -> None:
    win.clear()
    max_y, _ = win.getmaxyx()
    mid = max_y // 2

    _center_text(win, mid - 3, "=== GAME OVER ===")
    _center_text(win, mid - 1, f"Floor reached: {state.floor}")
    _center_text(win, mid, f"Score: {state.score}")
    _center_text(win, mid + 1, f"Level: {state.player.level}")
    _center_text(win, mid + 3, "Press r to restart  |  q to quit")
    win.refresh()


def draw_win(win: curses.window, state: GameState) -> None:
    win.clear()
    max_y, _ = win.getmaxyx()
    mid = max_y // 2

    _center_text(win, mid - 4, "*** YOU WIN! ***")
    _center_text(win, mid - 2, "You conquered all 5 floors of the dungeon!")
    _center_text(win, mid, f"Final Score: {state.score}")
    _center_text(win, mid + 1, f"Level: {state.player.level}")
    _center_text(win, mid + 2, f"HP: {state.player.hp}/{state.player.max_hp}")
    _center_text(win, mid + 4, "Press r to play again  |  q to quit")
    win.refresh()
