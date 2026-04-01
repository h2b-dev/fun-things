"""Items and inventory for Tiny Dungeon."""

from __future__ import annotations

import random
from dataclasses import dataclass
from enum import Enum, auto


class ItemKind(Enum):
    POTION = auto()
    WEAPON = auto()
    ARMOR = auto()
    GOLD = auto()


@dataclass
class Item:
    name: str
    char: str
    kind: ItemKind
    value: int  # HP for potion, ATK bonus for weapon, DEF bonus for armor, score for gold

    def describe(self) -> str:
        if self.kind == ItemKind.POTION:
            return f"{self.name} (restores {self.value} HP)"
        elif self.kind == ItemKind.WEAPON:
            return f"{self.name} (+{self.value} ATK)"
        elif self.kind == ItemKind.ARMOR:
            return f"{self.name} (+{self.value} DEF)"
        else:
            return f"{self.name} ({self.value} gold)"


@dataclass
class DroppedItem:
    x: int
    y: int
    item: Item
    picked_up: bool = False


ITEM_TEMPLATES = [
    Item("Health Potion", "!", ItemKind.POTION, 8),
    Item("Sword", "/", ItemKind.WEAPON, 2),
    Item("Shield", "[", ItemKind.ARMOR, 2),
    Item("Gold", "$", ItemKind.GOLD, 50),
]

# Drop weights: potions and gold more common
_DROP_WEIGHTS = [4, 1, 1, 3]  # potion, sword, shield, gold

MAX_INVENTORY = 5


def random_item() -> Item:
    return random.choices(ITEM_TEMPLATES, weights=_DROP_WEIGHTS, k=1)[0]


def spawn_floor_items(
    rooms: list, floor_num: int, occupied: set[tuple[int, int]]
) -> list[DroppedItem]:
    """Spawn 1-3 items per floor in random room positions."""
    count = random.randint(2, min(4, len(rooms)))
    items: list[DroppedItem] = []
    for _ in range(count):
        room = random.choice(rooms)
        x = random.randint(room.x + 1, room.x + room.w - 2)
        y = random.randint(room.y + 1, room.y + room.h - 2)
        if (x, y) not in occupied:
            items.append(DroppedItem(x, y, random_item()))
            occupied.add((x, y))
    return items
