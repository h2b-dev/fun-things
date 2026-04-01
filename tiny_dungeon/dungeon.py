"""Procedural dungeon generation for Tiny Dungeon."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from enum import Enum


class Tile(Enum):
    WALL = "#"
    FLOOR = "."
    DOOR = "+"
    STAIRS_DOWN = ">"
    STAIRS_UP = "<"


@dataclass
class Room:
    x: int
    y: int
    w: int
    h: int

    @property
    def cx(self) -> int:
        return self.x + self.w // 2

    @property
    def cy(self) -> int:
        return self.y + self.h // 2

    def intersects(self, other: Room, padding: int = 1) -> bool:
        return (
            self.x - padding < other.x + other.w
            and self.x + self.w + padding > other.x
            and self.y - padding < other.y + other.h
            and self.y + self.h + padding > other.y
        )


@dataclass
class DungeonFloor:
    width: int
    height: int
    floor_num: int
    tiles: list[list[Tile]] = field(default_factory=list)
    rooms: list[Room] = field(default_factory=list)
    stairs_up: tuple[int, int] | None = None
    stairs_down: tuple[int, int] | None = None
    enemy_spawns: list[tuple[int, int]] = field(default_factory=list)
    visible: list[list[bool]] = field(default_factory=list)
    revealed: list[list[bool]] = field(default_factory=list)

    def generate(self, total_floors: int = 5) -> None:
        # Initialize all walls
        self.tiles = [[Tile.WALL for _ in range(self.width)] for _ in range(self.height)]
        self.visible = [[False] * self.width for _ in range(self.height)]
        self.revealed = [[False] * self.width for _ in range(self.height)]

        # Deeper floors get more rooms and tighter corridors
        min_rooms = 5 + self.floor_num // 2
        max_rooms = 8 + self.floor_num // 2
        target_rooms = random.randint(min_rooms, max_rooms)

        # Room size shrinks on deeper floors (tighter corridors)
        max_room_w = max(6, 12 - self.floor_num)
        max_room_h = max(4, 8 - self.floor_num)

        self._place_rooms(target_rooms, max_room_w, max_room_h)
        self._connect_rooms()
        self._place_doors()
        self._place_stairs(total_floors)
        self._place_enemy_spawns()

    def _place_rooms(self, target: int, max_w: int, max_h: int) -> None:
        attempts = 0
        while len(self.rooms) < target and attempts < 200:
            w = random.randint(4, max_w)
            h = random.randint(3, max_h)
            x = random.randint(1, self.width - w - 1)
            y = random.randint(1, self.height - h - 1)
            room = Room(x, y, w, h)

            if not any(room.intersects(r) for r in self.rooms):
                self.rooms.append(room)
                self._carve_room(room)
            attempts += 1

    def _carve_room(self, room: Room) -> None:
        for dy in range(room.h):
            for dx in range(room.w):
                self.tiles[room.y + dy][room.x + dx] = Tile.FLOOR

    def _connect_rooms(self) -> None:
        """Connect rooms using minimum spanning tree to ensure all reachable."""
        if len(self.rooms) < 2:
            return

        connected = {0}
        unconnected = set(range(1, len(self.rooms)))

        while unconnected:
            best_dist = float("inf")
            best_pair = (0, 1)
            for ci in connected:
                for ui in unconnected:
                    dist = abs(self.rooms[ci].cx - self.rooms[ui].cx) + abs(
                        self.rooms[ci].cy - self.rooms[ui].cy
                    )
                    if dist < best_dist:
                        best_dist = dist
                        best_pair = (ci, ui)

            self._carve_corridor(self.rooms[best_pair[0]], self.rooms[best_pair[1]])
            connected.add(best_pair[1])
            unconnected.discard(best_pair[1])

    def _carve_corridor(self, a: Room, b: Room) -> None:
        x, y = a.cx, a.cy
        tx, ty = b.cx, b.cy

        # L-shaped corridor: go horizontal first or vertical first (random)
        if random.random() < 0.5:
            self._carve_h_tunnel(x, tx, y)
            self._carve_v_tunnel(y, ty, tx)
        else:
            self._carve_v_tunnel(y, ty, x)
            self._carve_h_tunnel(x, tx, ty)

    def _carve_h_tunnel(self, x1: int, x2: int, y: int) -> None:
        for x in range(min(x1, x2), max(x1, x2) + 1):
            if 0 < x < self.width - 1 and 0 < y < self.height - 1:
                self.tiles[y][x] = Tile.FLOOR

    def _carve_v_tunnel(self, y1: int, y2: int, x: int) -> None:
        for y in range(min(y1, y2), max(y1, y2) + 1):
            if 0 < x < self.width - 1 and 0 < y < self.height - 1:
                self.tiles[y][x] = Tile.FLOOR

    def _place_doors(self) -> None:
        """Place doors where corridors meet room edges."""
        for y in range(1, self.height - 1):
            for x in range(1, self.width - 1):
                if self.tiles[y][x] != Tile.FLOOR:
                    continue
                # Check if this is a transition between corridor and room
                h_walls = (
                    self.tiles[y - 1][x] == Tile.WALL
                    and self.tiles[y + 1][x] == Tile.WALL
                )
                v_walls = (
                    self.tiles[y][x - 1] == Tile.WALL
                    and self.tiles[y][x + 1] == Tile.WALL
                )
                if (h_walls or v_walls) and random.random() < 0.3:
                    self.tiles[y][x] = Tile.DOOR

    def _place_stairs(self, total_floors: int) -> None:
        if len(self.rooms) < 2:
            return

        # Stairs up in first room (except floor 1)
        if self.floor_num > 1:
            room = self.rooms[0]
            self.stairs_up = (room.cx, room.cy)
            self.tiles[room.cy][room.cx] = Tile.STAIRS_UP

        # Stairs down in last room (except last floor)
        if self.floor_num < total_floors:
            room = self.rooms[-1]
            self.stairs_down = (room.cx, room.cy)
            self.tiles[room.cy][room.cx] = Tile.STAIRS_DOWN

    def _place_enemy_spawns(self) -> None:
        """More spawns on deeper floors, but kept manageable."""
        # ~1 enemy per room on floor 1, scaling gently
        spawn_chance = 0.5 + self.floor_num * 0.1
        for room in self.rooms:
            if random.random() < spawn_chance:
                sx = random.randint(room.x + 1, room.x + room.w - 2)
                sy = random.randint(room.y + 1, room.y + room.h - 2)
                if self.tiles[sy][sx] == Tile.FLOOR:
                    self.enemy_spawns.append((sx, sy))

    def is_walkable(self, x: int, y: int) -> bool:
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.tiles[y][x] != Tile.WALL
        return False

    def compute_fov(self, px: int, py: int, radius: int = 8) -> None:
        """Simple shadowcasting FOV from player position."""
        self.visible = [[False] * self.width for _ in range(self.height)]

        # Player tile is always visible
        self.visible[py][px] = True
        self.revealed[py][px] = True

        # Cast rays in all directions
        for angle_step in range(360):
            import math

            rad = math.radians(angle_step)
            dx = math.cos(rad)
            dy = math.sin(rad)

            x, y = float(px) + 0.5, float(py) + 0.5
            for _ in range(radius):
                x += dx
                y += dy
                ix, iy = int(x), int(y)
                if not (0 <= ix < self.width and 0 <= iy < self.height):
                    break
                self.visible[iy][ix] = True
                self.revealed[iy][ix] = True
                if self.tiles[iy][ix] == Tile.WALL:
                    break


def generate_floor(width: int, height: int, floor_num: int, total_floors: int = 5) -> DungeonFloor:
    """Generate a single dungeon floor."""
    dungeon = DungeonFloor(width=width, height=height, floor_num=floor_num)
    dungeon.generate(total_floors)
    return dungeon
