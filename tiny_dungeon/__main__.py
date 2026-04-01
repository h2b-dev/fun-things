"""Entry point for Tiny Dungeon: uv run -m tiny_dungeon"""

from __future__ import annotations

import curses

from .screens import draw_game_over, draw_inventory, draw_playing, draw_title, draw_win
from .state import GameState, Phase

_MOVE_KEYS = {
    curses.KEY_UP: (0, -1),
    curses.KEY_DOWN: (0, 1),
    curses.KEY_LEFT: (-1, 0),
    curses.KEY_RIGHT: (1, 0),
    ord("w"): (0, -1),
    ord("s"): (0, 1),
    ord("a"): (-1, 0),
    ord("d"): (1, 0),
    ord("k"): (0, -1),
    ord("j"): (0, 1),
    ord("h"): (-1, 0),
    ord("l"): (1, 0),
}


def _handle_title_input(key: int, state: GameState) -> None:
    if key == ord("q"):
        state.phase = Phase.QUIT
    elif key != -1:
        state.reset()


def _handle_playing_input(key: int, state: GameState) -> None:
    if key == ord("q"):
        state.phase = Phase.QUIT
    elif key == ord(">") or key == ord("."):
        state.descend()
    elif key == ord("<") or key == ord(","):
        state.ascend()
    elif key == ord("i"):
        state.phase = Phase.INVENTORY
    elif key in _MOVE_KEYS:
        dx, dy = _MOVE_KEYS[key]
        state.move(dx, dy)


def _handle_inventory_input(key: int, state: GameState) -> None:
    if key == ord("i") or key == 27:  # i or Escape
        state.phase = Phase.PLAYING
    elif ord("1") <= key <= ord("5"):
        slot = key - ord("1")
        state.use_inventory(slot)
        if not state.inventory:
            state.phase = Phase.PLAYING


def _handle_game_over_input(key: int, state: GameState) -> None:
    if key == ord("q"):
        state.phase = Phase.QUIT
    elif key == ord("r"):
        state.reset()


def _handle_win_input(key: int, state: GameState) -> None:
    if key == ord("q"):
        state.phase = Phase.QUIT
    elif key == ord("r"):
        state.reset()


_DRAW = {
    Phase.TITLE: draw_title,
    Phase.PLAYING: draw_playing,
    Phase.INVENTORY: draw_inventory,
    Phase.GAME_OVER: draw_game_over,
    Phase.WIN: draw_win,
}

_INPUT = {
    Phase.TITLE: _handle_title_input,
    Phase.PLAYING: _handle_playing_input,
    Phase.INVENTORY: _handle_inventory_input,
    Phase.GAME_OVER: _handle_game_over_input,
    Phase.WIN: _handle_win_input,
}


def main(stdscr: curses.window) -> None:
    curses.curs_set(0)
    stdscr.nodelay(False)
    stdscr.timeout(100)

    state = GameState()

    while state.phase != Phase.QUIT:
        draw = _DRAW.get(state.phase)
        if draw:
            if state.phase == Phase.TITLE:
                draw(stdscr)
            else:
                draw(stdscr, state)

        key = stdscr.getch()
        handler = _INPUT.get(state.phase)
        if handler:
            handler(key, state)


if __name__ == "__main__":
    curses.wrapper(main)
