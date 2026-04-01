// Tiny Dungeon — Browser Port
// Faithful JS/Canvas recreation of the Python roguelike

"use strict";

// ── Constants ──────────────────────────────────────────────────────────────────

const MAP_W = 80;
const MAP_H = 20;
const TILE_W = 10;
const TILE_H = 20;
const TOTAL_FLOORS = 5;
const CHASE_RANGE = 6;
const MAX_MESSAGES = 3;
const ENEMY_DROP_CHANCE = 0.4;
const MAX_INVENTORY = 5;
const FOV_RADIUS = 8;

const TILE = { WALL: "#", FLOOR: ".", DOOR: "+", STAIR_UP: "<", STAIR_DOWN: ">" };

const Phase = { TITLE: 0, PLAYING: 1, INVENTORY: 2, GAME_OVER: 3, WIN: 4 };

// ── Item Definitions ───────────────────────────────────────────────────────────

const ItemKind = { POTION: "potion", WEAPON: "weapon", ARMOR: "armor", GOLD: "gold" };

const ITEM_TEMPLATES = [
  { name: "Health Potion", char: "!", kind: ItemKind.POTION, value: 8, weight: 4 },
  { name: "Sword",         char: "/", kind: ItemKind.WEAPON, value: 2, weight: 1 },
  { name: "Shield",        char: "[", kind: ItemKind.ARMOR,  value: 2, weight: 1 },
  { name: "Gold",           char: "$", kind: ItemKind.GOLD,   value: 50, weight: 3 },
];

const TOTAL_WEIGHT = ITEM_TEMPLATES.reduce((s, t) => s + t.weight, 0);

function randomItem() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const t of ITEM_TEMPLATES) {
    r -= t.weight;
    if (r <= 0) return { ...t };
  }
  return { ...ITEM_TEMPLATES[0] };
}

// ── Enemy Definitions ──────────────────────────────────────────────────────────

const ENEMY_TEMPLATES = [
  { name: "Rat",      char: "r", hp: 4,  atk: 1, def: 0, xp: 5,  floors: [1, 2, 3] },
  { name: "Skeleton", char: "s", hp: 8,  atk: 3, def: 1, xp: 15, floors: [2, 3, 4, 5] },
  { name: "Dragon",   char: "D", hp: 20, atk: 6, def: 3, xp: 50, floors: [4, 5] },
];

function enemiesForFloor(floor) {
  return ENEMY_TEMPLATES.filter(t => t.floors.includes(floor));
}

// ── Utility ────────────────────────────────────────────────────────────────────

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

function manhattan(x1, y1, x2, y2) { return Math.abs(x1 - x2) + Math.abs(y1 - y2); }

// ── Dungeon Generation ─────────────────────────────────────────────────────────

function generateFloor(floorNum) {
  const tiles = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(TILE.WALL));
  const visible = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
  const revealed = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));

  const minRooms = 5 + Math.floor(floorNum / 2);
  const maxRooms = 8 + Math.floor(floorNum / 2);
  const maxRoomW = Math.max(6, 12 - floorNum);
  const maxRoomH = Math.max(4, 8 - floorNum);

  // Place rooms
  const rooms = [];
  const target = randInt(minRooms, maxRooms);
  for (let attempt = 0; attempt < 200 && rooms.length < target; attempt++) {
    const w = randInt(4, maxRoomW);
    const h = randInt(3, maxRoomH);
    const x = randInt(1, MAP_W - w - 1);
    const y = randInt(1, MAP_H - h - 1);

    let overlaps = false;
    for (const r of rooms) {
      if (x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    const cx = Math.floor(x + w / 2);
    const cy = Math.floor(y + h / 2);
    rooms.push({ x, y, w, h, cx, cy });

    for (let ry = y; ry < y + h; ry++)
      for (let rx = x; rx < x + w; rx++)
        tiles[ry][rx] = TILE.FLOOR;
  }

  // MST corridor connection
  if (rooms.length > 1) {
    const connected = [0];
    const unconnected = new Set(rooms.map((_, i) => i));
    unconnected.delete(0);

    while (unconnected.size > 0) {
      let bestDist = Infinity, bestC = 0, bestU = 0;
      for (const c of connected) {
        for (const u of unconnected) {
          const d = manhattan(rooms[c].cx, rooms[c].cy, rooms[u].cx, rooms[u].cy);
          if (d < bestDist) { bestDist = d; bestC = c; bestU = u; }
        }
      }
      carveCorridor(tiles, rooms[bestC].cx, rooms[bestC].cy, rooms[bestU].cx, rooms[bestU].cy);
      connected.push(bestU);
      unconnected.delete(bestU);
    }
  }

  // Place doors
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (tiles[y][x] !== TILE.FLOOR) continue;
      if (Math.random() > 0.3) continue;
      const hWalls = tiles[y - 1][x] === TILE.WALL && tiles[y + 1][x] === TILE.WALL;
      const vWalls = tiles[y][x - 1] === TILE.WALL && tiles[y][x + 1] === TILE.WALL;
      if (hWalls || vWalls) tiles[y][x] = TILE.DOOR;
    }
  }

  // Place stairs
  if (floorNum > 1 && rooms.length > 0) {
    tiles[rooms[0].cy][rooms[0].cx] = TILE.STAIR_UP;
  }
  if (floorNum < TOTAL_FLOORS && rooms.length > 1) {
    const last = rooms[rooms.length - 1];
    tiles[last.cy][last.cx] = TILE.STAIR_DOWN;
  }

  // Enemy spawns
  const enemySpawns = [];
  const templates = enemiesForFloor(floorNum);
  if (templates.length > 0) {
    for (let i = 1; i < rooms.length; i++) {
      const chance = 0.5 + floorNum * 0.1;
      if (Math.random() > chance) continue;
      const r = rooms[i];
      const ex = randInt(r.x + 1, r.x + r.w - 2);
      const ey = randInt(r.y + 1, r.y + r.h - 2);
      if (tiles[ey][ex] === TILE.FLOOR) {
        const t = templates[randInt(0, templates.length - 1)];
        enemySpawns.push({
          name: t.name, char: t.char,
          x: ex, y: ey,
          hp: t.hp, maxHp: t.hp,
          atk: t.atk, def: t.def,
          xp: t.xp, alive: true,
        });
      }
    }
  }

  return { tiles, visible, revealed, rooms, enemies: enemySpawns };
}

function carveCorridor(tiles, x1, y1, x2, y2) {
  let cx = x1, cy = y1;
  const horizFirst = Math.random() < 0.5;

  if (horizFirst) {
    while (cx !== x2) { tiles[cy][cx] = TILE.FLOOR; cx += cx < x2 ? 1 : -1; }
    tiles[cy][cx] = TILE.FLOOR;
    while (cy !== y2) { tiles[cy][cx] = TILE.FLOOR; cy += cy < y2 ? 1 : -1; }
    tiles[cy][cx] = TILE.FLOOR;
  } else {
    while (cy !== y2) { tiles[cy][cx] = TILE.FLOOR; cy += cy < y2 ? 1 : -1; }
    tiles[cy][cx] = TILE.FLOOR;
    while (cx !== x2) { tiles[cy][cx] = TILE.FLOOR; cx += cx < x2 ? 1 : -1; }
    tiles[cy][cx] = TILE.FLOOR;
  }
}

// ── FOV ────────────────────────────────────────────────────────────────────────

function computeFov(floor, px, py) {
  const { tiles, visible, revealed } = floor;
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      visible[y][x] = false;

  visible[py][px] = true;
  revealed[py][px] = true;

  for (let angle = 0; angle < 360; angle++) {
    const rad = angle * Math.PI / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    let fx = px + 0.5;
    let fy = py + 0.5;

    for (let r = 0; r < FOV_RADIUS; r++) {
      fx += dx;
      fy += dy;
      const mx = Math.floor(fx);
      const my = Math.floor(fy);
      if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) break;
      visible[my][mx] = true;
      revealed[my][mx] = true;
      if (tiles[my][mx] === TILE.WALL) break;
    }
  }
}

// ── Game State ─────────────────────────────────────────────────────────────────

const game = {
  phase: Phase.TITLE,
  floor: 1,
  floors: {},
  floorItems: {},
  player: null,
  score: 0,
  messages: [],
  inventory: [],
};

function initGame() {
  game.phase = Phase.PLAYING;
  game.floor = 1;
  game.floors = {};
  game.floorItems = {};
  game.score = 0;
  game.messages = [];
  game.inventory = [];
  game.player = {
    x: 0, y: 0, char: "@",
    hp: 25, maxHp: 25,
    atk: 3, def: 1,
    level: 1, xp: 0, xpToNext: 20,
    alive: true,
  };

  enterFloor(1);
}

function enterFloor(floorNum) {
  game.floor = floorNum;

  let isNew = false;
  if (!game.floors[floorNum]) {
    game.floors[floorNum] = generateFloor(floorNum);
    isNew = true;
  }

  const f = game.floors[floorNum];
  if (f.rooms.length > 0) {
    game.player.x = f.rooms[0].cx;
    game.player.y = f.rooms[0].cy;
  }

  if (isNew) {
    spawnFloorItems(floorNum, f);
  }

  computeFov(f, game.player.x, game.player.y);
  addMessage(`Entered floor ${floorNum}.`);
}

function spawnFloorItems(floorNum, floor) {
  const items = [];
  const count = randInt(2, Math.min(4, floor.rooms.length));
  const occupied = new Set();
  occupied.add(`${game.player.x},${game.player.y}`);

  for (const e of floor.enemies) occupied.add(`${e.x},${e.y}`);

  for (let i = 0; i < count; i++) {
    const room = floor.rooms[randInt(0, floor.rooms.length - 1)];
    const ix = randInt(room.x + 1, room.x + room.w - 2);
    const iy = randInt(room.y + 1, room.y + room.h - 2);
    const key = `${ix},${iy}`;
    if (occupied.has(key)) continue;
    if (floor.tiles[iy][ix] !== TILE.FLOOR) continue;
    occupied.add(key);
    const item = randomItem();
    item.x = ix;
    item.y = iy;
    items.push(item);
  }

  game.floorItems[floorNum] = items;
}

function addMessage(msg) {
  game.messages.push(msg);
  if (game.messages.length > MAX_MESSAGES) game.messages.shift();
}

// ── Combat & Items ─────────────────────────────────────────────────────────────

function calcDamage(atkStat, defStat) {
  return Math.max(1, atkStat - defStat);
}

function attackEntity(attacker, defender) {
  const dmg = calcDamage(attacker.atk, defender.def);
  defender.hp -= dmg;

  if (defender === game.player) {
    addMessage(`${attacker.name} hits you for ${dmg} damage!`);
    if (defender.hp <= 0) {
      defender.alive = false;
      game.phase = Phase.GAME_OVER;
    }
  } else {
    addMessage(`You hit ${defender.name} for ${dmg} damage!`);
    if (defender.hp <= 0) {
      defender.alive = false;
      game.score += defender.xp;
      gainXp(defender.xp);
      addMessage(`${defender.name} defeated! (+${defender.xp} XP)`);

      if (Math.random() < ENEMY_DROP_CHANCE) {
        const drop = randomItem();
        drop.x = defender.x;
        drop.y = defender.y;
        game.floorItems[game.floor].push(drop);
        addMessage(`${defender.name} dropped ${drop.name}!`);
      }
    }
  }
}

function gainXp(amount) {
  const p = game.player;
  p.xp += amount;
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext;
    p.level++;
    p.maxHp += 5;
    p.hp = Math.min(p.hp + 5, p.maxHp);
    p.atk++;
    p.def++;
    p.xpToNext = Math.floor(p.xpToNext * 1.5);
    addMessage(`Level up! You are now level ${p.level}.`);
  }
}

function applyItem(item) {
  const p = game.player;
  switch (item.kind) {
    case ItemKind.POTION:
      if (p.hp < p.maxHp) {
        const heal = Math.min(item.value, p.maxHp - p.hp);
        p.hp += heal;
        addMessage(`Used ${item.name}. Healed ${heal} HP.`);
        return true;
      } else {
        if (game.inventory.length < MAX_INVENTORY) {
          game.inventory.push(item);
          addMessage(`Picked up ${item.name} (inventory).`);
          return true;
        }
        addMessage("Inventory full!");
        return false;
      }
    case ItemKind.WEAPON:
      p.atk += item.value;
      addMessage(`Equipped ${item.name}! ATK +${item.value}.`);
      return true;
    case ItemKind.ARMOR:
      p.def += item.value;
      addMessage(`Equipped ${item.name}! DEF +${item.value}.`);
      return true;
    case ItemKind.GOLD:
      game.score += item.value;
      addMessage(`Picked up ${item.value} gold!`);
      return true;
  }
  return false;
}

function pickupItem() {
  const items = game.floorItems[game.floor];
  if (!items) return;
  const idx = items.findIndex(i => i.x === game.player.x && i.y === game.player.y);
  if (idx === -1) return;
  const item = items[idx];
  if (applyItem(item)) {
    items.splice(idx, 1);
  }
}

function useInventoryItem(slot) {
  if (slot < 0 || slot >= game.inventory.length) return;
  const item = game.inventory[slot];
  const p = game.player;
  if (item.kind === ItemKind.POTION) {
    if (p.hp < p.maxHp) {
      const heal = Math.min(item.value, p.maxHp - p.hp);
      p.hp += heal;
      addMessage(`Used ${item.name}. Healed ${heal} HP.`);
      game.inventory.splice(slot, 1);
    } else {
      addMessage("Already at full HP!");
    }
  }
}

// ── Enemy AI ───────────────────────────────────────────────────────────────────

function enemyTurn() {
  const floor = game.floors[game.floor];
  if (!floor) return;

  for (const enemy of floor.enemies) {
    if (!enemy.alive) continue;
    const dist = manhattan(enemy.x, enemy.y, game.player.x, game.player.y);
    if (dist > CHASE_RANGE) continue;

    if (dist === 1) {
      attackEntity(enemy, game.player);
      if (!game.player.alive) return;
      continue;
    }

    // Greedy pathfinding
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let bestDir = null;
    let bestDist = dist;

    for (const [dx, dy] of dirs) {
      const nx = enemy.x + dx;
      const ny = enemy.y + dy;
      if (ny < 0 || ny >= MAP_H || nx < 0 || nx >= MAP_W) continue;
      const t = floor.tiles[ny][nx];
      if (t === TILE.WALL) continue;

      // Check not occupied by another enemy
      const blocked = floor.enemies.some(e => e.alive && e !== enemy && e.x === nx && e.y === ny);
      if (blocked) continue;

      const nd = manhattan(nx, ny, game.player.x, game.player.y);
      if (nd < bestDist) {
        bestDist = nd;
        bestDir = [dx, dy];
      }
    }

    if (bestDir) {
      enemy.x += bestDir[0];
      enemy.y += bestDir[1];
    }
  }
}

// ── Player Actions ─────────────────────────────────────────────────────────────

function isWalkable(tile) {
  return tile !== TILE.WALL;
}

function movePlayer(dx, dy) {
  if (game.phase !== Phase.PLAYING) return;

  const p = game.player;
  const nx = p.x + dx;
  const ny = p.y + dy;
  if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;

  const floor = game.floors[game.floor];

  // Check for enemy at target
  const enemy = floor.enemies.find(e => e.alive && e.x === nx && e.y === ny);
  if (enemy) {
    attackEntity(p, enemy);
    enemyTurn();
    render();
    return;
  }

  if (!isWalkable(floor.tiles[ny][nx])) return;

  p.x = nx;
  p.y = ny;
  computeFov(floor, p.x, p.y);
  pickupItem();
  enemyTurn();
  render();
}

function descend() {
  const floor = game.floors[game.floor];
  const tile = floor.tiles[game.player.y][game.player.x];

  if (game.floor === TOTAL_FLOORS) {
    const aliveEnemies = floor.enemies.filter(e => e.alive).length;
    if (aliveEnemies === 0) {
      game.score += 500;
      game.phase = Phase.WIN;
      render();
      return;
    }
    addMessage("Defeat all enemies on this floor first!");
    render();
    return;
  }

  if (tile !== TILE.STAIR_DOWN) {
    addMessage("No stairs down here.");
    render();
    return;
  }

  game.score += 100;
  enterFloor(game.floor + 1);
  render();
}

function ascend() {
  const floor = game.floors[game.floor];
  const tile = floor.tiles[game.player.y][game.player.x];

  if (tile !== TILE.STAIR_UP) {
    addMessage("No stairs up here.");
    render();
    return;
  }

  if (game.floor <= 1) {
    addMessage("You're already on the first floor.");
    render();
    return;
  }

  game.floor--;
  const prevFloor = game.floors[game.floor];
  // Place player at stairs down of previous floor
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (prevFloor.tiles[y][x] === TILE.STAIR_DOWN) {
        game.player.x = x;
        game.player.y = y;
        break;
      }
    }
  }
  computeFov(prevFloor, game.player.x, game.player.y);
  addMessage(`Returned to floor ${game.floor}.`);
  render();
}

// ── Rendering ──────────────────────────────────────────────────────────────────

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hudEl = document.getElementById("hud");
const msgEl = document.getElementById("messages");
const helpEl = document.getElementById("help");

function render() {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "16px 'Courier New', monospace";
  ctx.textBaseline = "top";

  switch (game.phase) {
    case Phase.TITLE:     renderTitle(); break;
    case Phase.PLAYING:   renderPlaying(); break;
    case Phase.INVENTORY: renderInventory(); break;
    case Phase.GAME_OVER: renderGameOver(); break;
    case Phase.WIN:       renderWin(); break;
  }
}

function drawText(text, x, y, color) {
  ctx.fillStyle = color || "#cccccc";
  ctx.fillText(text, x, y);
}

function drawCentered(text, y, color) {
  const w = ctx.measureText(text).width;
  drawText(text, (canvas.width - w) / 2, y, color);
}

function renderTitle() {
  const art = [
    " _____ _               ____",
    "|_   _(_)_ __  _   _  |  _ \\ _   _ _ __   __ _  ___  ___  _ __",
    "  | | | | '_ \\| | | | | | | | | | | '_ \\ / _` |/ _ \\/ _ \\| '_ \\",
    "  | | | | | | | |_| | | |_| | |_| | | | | (_| |  __/ (_) | | | |",
    "  |_| |_|_| |_|\\__, | |____/ \\__,_|_| |_|\\__, |\\___|\\___/|_| |_|",
    "               |___/                      |___/",
  ];

  const startY = 80;
  for (let i = 0; i < art.length; i++) {
    drawCentered(art[i], startY + i * 20, "#ffcc00");
  }

  drawCentered("Press any key to start", 260, "#cccccc");
  drawCentered("q to quit", 290, "#666666");

  hudEl.textContent = "";
  msgEl.textContent = "";
  helpEl.textContent = "";
}

function renderPlaying() {
  const floor = game.floors[game.floor];
  if (!floor) return;

  const { tiles, visible, revealed, enemies } = floor;
  const items = game.floorItems[game.floor] || [];

  // Draw map
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const px = x * TILE_W;
      const py = y * TILE_H;
      const ch = tiles[y][x];

      if (visible[y][x]) {
        let color = "#aaaaaa";
        if (ch === TILE.WALL) color = "#888888";
        else if (ch === TILE.DOOR) color = "#aa8844";
        else if (ch === TILE.STAIR_UP || ch === TILE.STAIR_DOWN) color = "#ffcc00";
        drawText(ch, px, py, color);
      } else if (revealed[y][x]) {
        drawText(ch, px, py, "#2a2a6a");
      }
    }
  }

  // Draw items
  for (const item of items) {
    if (visible[item.y][item.x]) {
      drawText(item.char, item.x * TILE_W, item.y * TILE_H, "#cc44cc");
    }
  }

  // Draw enemies
  for (const e of enemies) {
    if (e.alive && visible[e.y][e.x]) {
      drawText(e.char, e.x * TILE_W, e.y * TILE_H, "#ff4444");
    }
  }

  // Draw player
  drawText("@", game.player.x * TILE_W, game.player.y * TILE_H, "#44ff44");

  // HUD
  const p = game.player;
  hudEl.textContent = `F:${game.floor} HP:${p.hp}/${p.maxHp} ATK:${p.atk} DEF:${p.def} Lv:${p.level} XP:${p.xp}/${p.xpToNext} Score:${game.score}`;

  // Messages
  msgEl.textContent = game.messages.join("\n");

  // Help
  helpEl.textContent = "Move: arrows/wasd/hjkl  >: descend  <: ascend  i: inventory  q: quit";
}

function renderInventory() {
  drawCentered("=== INVENTORY ===", 20, "#ffcc00");

  if (game.inventory.length === 0) {
    drawCentered("Empty", 80, "#666666");
  } else {
    for (let i = 0; i < game.inventory.length; i++) {
      const item = game.inventory[i];
      let desc = item.name;
      if (item.kind === ItemKind.POTION) desc += ` (heals ${item.value} HP)`;
      drawText(`${i + 1}. ${desc}`, 40, 60 + i * 24, "#cccccc");
    }
  }

  drawCentered("1-5: use item | i/Esc: close", 340, "#666666");
  hudEl.textContent = "";
  msgEl.textContent = "";
  helpEl.textContent = "";
}

function renderGameOver() {
  drawCentered("=== GAME OVER ===", 80, "#ff4444");
  drawCentered(`Floor reached: ${game.floor}`, 140, "#cccccc");
  drawCentered(`Score: ${game.score}`, 170, "#ffcc00");
  drawCentered(`Level: ${game.player.level}`, 200, "#cccccc");
  drawCentered("r: restart  q: quit", 280, "#666666");

  hudEl.textContent = "";
  msgEl.textContent = "";
  helpEl.textContent = "";
}

function renderWin() {
  drawCentered("*** YOU WIN! ***", 60, "#44ff44");
  drawCentered("You conquered all 5 floors of the dungeon!", 110, "#cccccc");
  drawCentered(`Final score: ${game.score}`, 160, "#ffcc00");
  drawCentered(`Level: ${game.player.level}`, 190, "#cccccc");
  drawCentered(`HP: ${game.player.hp}/${game.player.maxHp}`, 220, "#cccccc");
  drawCentered("r: play again  q: quit", 300, "#666666");

  hudEl.textContent = "";
  msgEl.textContent = "";
  helpEl.textContent = "";
}

// ── Input ──────────────────────────────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
  const key = e.key;

  switch (game.phase) {
    case Phase.TITLE:
      if (key === "q") return; // no-op in browser
      initGame();
      render();
      break;

    case Phase.PLAYING:
      switch (key) {
        case "ArrowUp":    case "w": case "k": movePlayer(0, -1); break;
        case "ArrowDown":  case "s": case "j": movePlayer(0, 1);  break;
        case "ArrowLeft":  case "a": case "h": movePlayer(-1, 0); break;
        case "ArrowRight": case "d": case "l": movePlayer(1, 0);  break;
        case ">": case ".": descend(); break;
        case "<": case ",": ascend();  break;
        case "i":
          game.phase = Phase.INVENTORY;
          render();
          break;
      }
      break;

    case Phase.INVENTORY:
      if (key === "i" || key === "Escape") {
        game.phase = Phase.PLAYING;
        render();
      } else if (key >= "1" && key <= "5") {
        useInventoryItem(parseInt(key) - 1);
        render();
      }
      break;

    case Phase.GAME_OVER:
    case Phase.WIN:
      if (key === "r") {
        initGame();
        render();
      }
      break;
  }

  e.preventDefault();
});

// ── Boot ───────────────────────────────────────────────────────────────────────

render();
