"""Game state for Tiny Dungeon."""

from __future__ import annotations

import random
from collections import deque
from dataclasses import dataclass, field
from enum import Enum, auto

from .dungeon import DungeonFloor, Tile, generate_floor
from .entities import (
    Entity,
    Player,
    enemies_for_floor,
    make_enemy,
    make_player,
)
from .items import (
    MAX_INVENTORY,
    DroppedItem,
    Item,
    ItemKind,
    random_item,
    spawn_floor_items,
)

TOTAL_FLOORS = 5
MAP_WIDTH = 80
MAP_HEIGHT = 20
CHASE_RANGE = 6
MAX_MESSAGES = 3
ENEMY_DROP_CHANCE = 0.4


class Phase(Enum):
    TITLE = auto()
    PLAYING = auto()
    INVENTORY = auto()
    GAME_OVER = auto()
    WIN = auto()
    QUIT = auto()


@dataclass
class GameState:
    phase: Phase = Phase.TITLE
    floor: int = 1
    score: int = 0
    player: Player = field(default_factory=lambda: make_player())
    floors: dict[int, DungeonFloor] = field(default_factory=dict)
    enemies: dict[int, list[Entity]] = field(default_factory=dict)
    floor_items: dict[int, list[DroppedItem]] = field(default_factory=dict)
    inventory: list[Item] = field(default_factory=list)
    messages: deque[str] = field(default_factory=lambda: deque(maxlen=MAX_MESSAGES))

    @property
    def alive(self) -> bool:
        return self.player.alive

    def _current_dungeon(self) -> DungeonFloor:
        if self.floor not in self.floors:
            self.floors[self.floor] = generate_floor(
                MAP_WIDTH, MAP_HEIGHT, self.floor, TOTAL_FLOORS
            )
        return self.floors[self.floor]

    def _current_enemies(self) -> list[Entity]:
        if self.floor not in self.enemies:
            self._spawn_enemies()
        return self.enemies[self.floor]

    def _current_items(self) -> list[DroppedItem]:
        if self.floor not in self.floor_items:
            self._spawn_floor_items()
        return self.floor_items[self.floor]

    def _spawn_enemies(self) -> None:
        dungeon = self._current_dungeon()
        available = enemies_for_floor(self.floor)
        spawned: list[Entity] = []

        for sx, sy in dungeon.enemy_spawns:
            if (sx, sy) == (self.player.x, self.player.y):
                continue
            if dungeon.stairs_up and (sx, sy) == dungeon.stairs_up:
                continue
            if dungeon.stairs_down and (sx, sy) == dungeon.stairs_down:
                continue
            if not available:
                continue
            template_name = random.choice([name for name, _, _ in available])
            spawned.append(make_enemy(template_name, sx, sy))

        self.enemies[self.floor] = spawned

    def _spawn_floor_items(self) -> None:
        dungeon = self._current_dungeon()
        occupied: set[tuple[int, int]] = {(self.player.x, self.player.y)}
        if dungeon.stairs_up:
            occupied.add(dungeon.stairs_up)
        if dungeon.stairs_down:
            occupied.add(dungeon.stairs_down)
        for e in self._current_enemies() if self.floor in self.enemies else []:
            occupied.add((e.x, e.y))
        self.floor_items[self.floor] = spawn_floor_items(dungeon.rooms, self.floor, occupied)

    def _spawn_player_in_room(self, room_index: int = 0) -> None:
        dungeon = self._current_dungeon()
        if dungeon.rooms:
            room = dungeon.rooms[min(room_index, len(dungeon.rooms) - 1)]
            self.player.x = room.cx
            self.player.y = room.cy
        dungeon.compute_fov(self.player.x, self.player.y)

    def _enemy_at(self, x: int, y: int) -> Entity | None:
        for e in self._current_enemies():
            if e.alive and e.x == x and e.y == y:
                return e
        return None

    def _item_at(self, x: int, y: int) -> DroppedItem | None:
        for di in self._current_items():
            if not di.picked_up and di.x == x and di.y == y:
                return di
        return None

    def _apply_item(self, item: Item) -> None:
        """Apply an item's effect to the player."""
        if item.kind == ItemKind.POTION:
            if self.player.hp < self.player.max_hp:
                healed = min(item.value, self.player.max_hp - self.player.hp)
                self.player.hp += healed
                self.messages.append(f"Used {item.name}. Restored {healed} HP.")
            else:
                # Full HP — stash in inventory
                if len(self.inventory) < MAX_INVENTORY:
                    self.inventory.append(item)
                    self.messages.append(f"Picked up {item.name} (inventory).")
                else:
                    self.messages.append("Inventory full!")
                return
        elif item.kind == ItemKind.WEAPON:
            self.player.atk += item.value
            self.messages.append(f"Equipped {item.name}! ATK +{item.value}.")
        elif item.kind == ItemKind.ARMOR:
            self.player.defense += item.value
            self.messages.append(f"Equipped {item.name}! DEF +{item.value}.")
        elif item.kind == ItemKind.GOLD:
            self.score += item.value
            self.messages.append(f"Found {item.value} gold!")

    def _pickup_item(self) -> None:
        """Check if player is standing on an item and pick it up."""
        di = self._item_at(self.player.x, self.player.y)
        if di:
            di.picked_up = True
            self._apply_item(di.item)

    def _drop_loot(self, enemy: Entity) -> None:
        """Enemy has a chance to drop an item on death."""
        if random.random() < ENEMY_DROP_CHANCE:
            item = random_item()
            dropped = DroppedItem(enemy.x, enemy.y, item)
            self._current_items().append(dropped)
            self.messages.append(f"The {enemy.name} dropped {item.name}!")

    def _attack(self, attacker: Entity, defender: Entity) -> None:
        dmg = defender.take_damage(attacker.atk)
        if attacker is self.player:
            self.messages.append(f"You hit the {defender.name} for {dmg} damage.")
            if not defender.alive:
                self.score += defender.xp_value
                msgs = self.player.gain_xp(defender.xp_value)
                self.messages.append(f"The {defender.name} dies! (+{defender.xp_value} XP)")
                for m in msgs:
                    self.messages.append(m)
                self._drop_loot(defender)
        else:
            self.messages.append(f"The {attacker.name} hits you for {dmg} damage.")
            if not self.player.alive:
                self.die()

    def use_inventory(self, slot: int) -> None:
        """Use an item from inventory by slot index."""
        if 0 <= slot < len(self.inventory):
            item = self.inventory.pop(slot)
            self._apply_item(item)

    def move(self, dx: int, dy: int) -> None:
        dungeon = self._current_dungeon()
        nx, ny = self.player.x + dx, self.player.y + dy

        enemy = self._enemy_at(nx, ny)
        if enemy:
            self._attack(self.player, enemy)
            self._enemy_turn()
            return

        if dungeon.is_walkable(nx, ny):
            self.player.x = nx
            self.player.y = ny
            dungeon.compute_fov(self.player.x, self.player.y)
            self._pickup_item()
            self._enemy_turn()

    def _enemy_turn(self) -> None:
        if not self.player.alive:
            return
        dungeon = self._current_dungeon()
        for e in self._current_enemies():
            if not e.alive:
                continue
            dist = abs(e.x - self.player.x) + abs(e.y - self.player.y)
            if dist > CHASE_RANGE:
                continue
            if dist == 1:
                self._attack(e, self.player)
                if not self.player.alive:
                    return
            else:
                best_dx, best_dy = 0, 0
                best_dist = dist
                for ddx, ddy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                    tx, ty = e.x + ddx, e.y + ddy
                    if not dungeon.is_walkable(tx, ty):
                        continue
                    if self._enemy_at(tx, ty):
                        continue
                    d = abs(tx - self.player.x) + abs(ty - self.player.y)
                    if d < best_dist:
                        best_dist = d
                        best_dx, best_dy = ddx, ddy
                e.x += best_dx
                e.y += best_dy

    def descend(self) -> None:
        dungeon = self._current_dungeon()
        if dungeon.stairs_down and (self.player.x, self.player.y) == dungeon.stairs_down:
            if self.floor < TOTAL_FLOORS:
                self.floor += 1
                self.score += 100
                self._spawn_player_in_room(0)
                self.messages.append(f"You descend to floor {self.floor}.")
        # Win condition: on floor 5 with no stairs down, reaching last room
        elif self.floor == TOTAL_FLOORS:
            # Check if all enemies on floor 5 are dead
            alive_enemies = sum(1 for e in self._current_enemies() if e.alive)
            if alive_enemies == 0:
                self.score += 500
                self.phase = Phase.WIN

    def ascend(self) -> None:
        dungeon = self._current_dungeon()
        if dungeon.stairs_up and (self.player.x, self.player.y) == dungeon.stairs_up:
            if self.floor > 1:
                self.floor -= 1
                prev = self._current_dungeon()
                if prev.stairs_down:
                    self.player.x, self.player.y = prev.stairs_down
                prev.compute_fov(self.player.x, self.player.y)
                self.messages.append(f"You ascend to floor {self.floor}.")

    def die(self) -> None:
        self.player.alive = False
        self.phase = Phase.GAME_OVER

    def reset(self) -> None:
        self.phase = Phase.PLAYING
        self.floor = 1
        self.score = 0
        self.player = make_player()
        self.floors.clear()
        self.enemies.clear()
        self.floor_items.clear()
        self.inventory.clear()
        self.messages.clear()
        self._spawn_player_in_room(0)
