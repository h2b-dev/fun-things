"""Entities (player, enemies) for Tiny Dungeon."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Entity:
    x: int
    y: int
    hp: int
    max_hp: int
    atk: int
    defense: int  # DEF
    name: str
    char: str
    xp_value: int = 0
    alive: bool = True

    def take_damage(self, amount: int) -> int:
        """Apply damage, return actual damage dealt."""
        dmg = max(1, amount - self.defense)
        self.hp -= dmg
        if self.hp <= 0:
            self.hp = 0
            self.alive = False
        return dmg


@dataclass
class Player(Entity):
    level: int = 1
    xp: int = 0
    xp_to_next: int = 20

    def gain_xp(self, amount: int) -> list[str]:
        """Gain XP and return level-up messages if any."""
        self.xp += amount
        messages = []
        while self.xp >= self.xp_to_next:
            self.xp -= self.xp_to_next
            self.level += 1
            self.max_hp += 5
            self.hp = min(self.hp + 5, self.max_hp)
            self.atk += 1
            self.defense += 1
            self.xp_to_next = int(self.xp_to_next * 1.5)
            messages.append(f"Level up! You are now level {self.level}.")
        return messages


def make_player(x: int = 0, y: int = 0) -> Player:
    return Player(x=x, y=y, hp=25, max_hp=25, atk=3, defense=1, name="Player", char="@")


# Enemy definitions: (name, char, hp, atk, def, xp_value, min_floor, max_floor)
ENEMY_TEMPLATES = [
    ("Rat", "r", 4, 1, 0, 5, 1, 3),
    ("Skeleton", "s", 8, 3, 1, 15, 2, 5),
    ("Dragon", "D", 20, 6, 3, 50, 4, 5),
]


def make_enemy(template_name: str, x: int, y: int) -> Entity:
    for name, char, hp, atk, defense, xp_val, _, _ in ENEMY_TEMPLATES:
        if name == template_name:
            return Entity(
                x=x, y=y, hp=hp, max_hp=hp, atk=atk, defense=defense,
                name=name, char=char, xp_value=xp_val,
            )
    raise ValueError(f"Unknown enemy: {template_name}")


def enemies_for_floor(floor_num: int) -> list[tuple[str, int, int]]:
    """Return (template_name, min_floor, max_floor) for enemies available on this floor."""
    return [
        (name, min_f, max_f)
        for name, _, _, _, _, _, min_f, max_f in ENEMY_TEMPLATES
        if min_f <= floor_num <= max_f
    ]
