// Tiny Puzzle — Sokoban-style puzzle game
// No dependencies, vanilla JS + Canvas

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");
const controls = document.getElementById("controls");

// Tile types
const FLOOR = 0;
const WALL = 1;
const TARGET = 2;
const CRATE = 3;
const CRATE_ON_TARGET = 4;
const PLAYER = 5;
const PLAYER_ON_TARGET = 6;

// Tile chars for level definitions
const CHAR_MAP = {
  " ": FLOOR,
  "#": WALL,
  ".": TARGET,
  "$": CRATE,
  "*": CRATE_ON_TARGET,
  "@": PLAYER,
  "+": PLAYER_ON_TARGET,
};

// Colors
const COLORS = {
  bg: "#0a0a0a",
  wall: "#555566",
  wallTop: "#6a6a7a",
  floor: "#1a1a2e",
  target: "#ff4466",
  targetGlow: "rgba(255, 68, 102, 0.15)",
  crate: "#cc8833",
  crateOk: "#44bb44",
  crateOutline: "#aa6622",
  crateOkOutline: "#228822",
  player: "#3399ff",
  playerOutline: "#1166cc",
};

// ── Levels ──────────────────────────────────────────────────────────────
// Standard Sokoban notation:
//   # = wall, @ = player, $ = crate, . = target
//   * = crate on target, + = player on target, (space) = floor
const LEVELS = [
  { // 1 — Hello Sokoban
    name: "Hello Sokoban",
    par: 8,
    map: [
      "  ####",
      "###  #",
      "#.$  #",
      "# $. #",
      "#  @##",
      "#####",
    ],
  },
  { // 2 — Two Step
    name: "Two Step",
    par: 9,
    map: [
      "######",
      "#.  .#",
      "# $$ #",
      "#  @ #",
      "######",
    ],
  },
  { // 3 — L-Shape
    name: "L-Shape",
    par: 12,
    map: [
      "  ####",
      "###  #",
      "# $  #",
      "#  $.#",
      "#.@###",
      "####  ",
    ],
  },
  { // 4 — Corridor
    name: "Corridor",
    par: 15,
    map: [
      "#######",
      "#     #",
      "# .$. #",
      "# $.$ #",
      "#  @  #",
      "#######",
    ],
  },
  { // 5 — Zigzag
    name: "Zigzag",
    par: 20,
    map: [
      "########",
      "#   #  #",
      "# $  $ #",
      "#.# #.##",
      "#   @  #",
      "########",
    ],
  },
  { // 6 — The Box
    name: "The Box",
    par: 22,
    map: [
      " #####",
      "##   #",
      "# $# ##",
      "# .  .#",
      "## $  #",
      " # @##",
      " ####  ",
    ],
  },
  { // 7 — Squeeze
    name: "Squeeze",
    par: 18,
    map: [
      "  #####",
      "###   #",
      "#  $# #",
      "# #.  #",
      "#  .$ #",
      "##@ ###",
      " ####  ",
    ],
  },
  { // 8 — Warehouse
    name: "Warehouse",
    par: 25,
    map: [
      "########",
      "#  ..  #",
      "# #  # #",
      "#  $$  #",
      "##    ##",
      " # @  #",
      " ######",
    ],
  },
  { // 9 — Narrow Hall
    name: "Narrow Hall",
    par: 28,
    map: [
      "#######",
      "#  .  #",
      "#  $  #",
      "## # ##",
      " #$. #",
      " # @ #",
      " #####",
    ],
  },
  { // 10 — Crossroads
    name: "Crossroads",
    par: 30,
    map: [
      "  ##### ",
      "###   # ",
      "#  $  ##",
      "# #.#  #",
      "#  .$  #",
      "## #@ ##",
      " #   #  ",
      " #####  ",
    ],
  },
  { // 11 — Side Room
    name: "Side Room",
    par: 20,
    map: [
      " #####",
      "##   ##",
      "#  $  #",
      "# $.$ #",
      "##.#.##",
      " # @ # ",
      " #   # ",
      " ##### ",
    ],
  },
  { // 12 — Alley
    name: "Alley",
    par: 32,
    map: [
      "########",
      "#  #   #",
      "# $  $ #",
      "#  ## .#",
      "##$  #.#",
      " #  @. #",
      " ######",
    ],
  },
  { // 13 — Chambers
    name: "Chambers",
    par: 35,
    map: [
      " ########",
      "##  #   #",
      "#  $$ # #",
      "# #  $  #",
      "#  ..  ##",
      "##.# @# ",
      " ######  ",
    ],
  },
  { // 14 — Winding
    name: "Winding",
    par: 30,
    map: [
      "  ######",
      "### @  #",
      "#  $ # #",
      "# #$ . #",
      "# $ .# #",
      "###  . #",
      "  ######",
    ],
  },
  { // 15 — Triple Threat
    name: "Triple Threat",
    par: 38,
    map: [
      "########",
      "#      #",
      "# $$.  #",
      "## #.# #",
      " # $.  #",
      " # @ ###",
      " #####  ",
    ],
  },
  { // 16 — Spiral
    name: "Spiral",
    par: 40,
    map: [
      " #######",
      "## . . #",
      "#  # #.#",
      "# $$ $ #",
      "#  # @##",
      "##   # ",
      " ##### ",
    ],
  },
  { // 17 — Deadlock Danger
    name: "Deadlock Danger",
    par: 35,
    map: [
      "  #####  ",
      "###   ## ",
      "#   $  # ",
      "# ##$# ##",
      "# .  . .#",
      "##  $  @#",
      " ########",
    ],
  },
  { // 18 — Open Field
    name: "Open Field",
    par: 42,
    map: [
      "#########",
      "#   #   #",
      "# $ . $ #",
      "#  ###  #",
      "# $. .$ #",
      "#  .@   #",
      "#########",
    ],
  },
  { // 19 — Fortress
    name: "Fortress",
    par: 45,
    map: [
      " ########",
      " #  .   #",
      "## #$## #",
      "#  $ .  #",
      "#  ##$# #",
      "# @.    #",
      "#########",
    ],
  },
  { // 20 — Island
    name: "Island",
    par: 38,
    map: [
      "  ###### ",
      " ##    # ",
      "## $$$  #",
      "#  .#.  #",
      "#  .@   #",
      "##     ##",
      " #######",
    ],
  },
  { // 21 — Double Cross
    name: "Double Cross",
    par: 50,
    map: [
      "#########",
      "#   .   #",
      "# $#$#$ #",
      "#  . .  #",
      "## # # ##",
      " # $ $ # ",
      " # .@. # ",
      " ##   ## ",
      "  #####  ",
    ],
  },
  { // 22 — The Maze
    name: "The Maze",
    par: 48,
    map: [
      "##########",
      "#   ##   #",
      "# $    $ #",
      "#  ##.#  #",
      "## .  . ##",
      "#  #.#$ #",
      "# $   @ #",
      "##########",
    ],
  },
  { // 23 — Tight Squeeze
    name: "Tight Squeeze",
    par: 52,
    map: [
      " ######  ",
      "##    ## ",
      "# $ $  # ",
      "# .##. # ",
      "# .##. # ",
      "# $ $  ##",
      "##  @   #",
      " ########",
    ],
  },
  { // 24 — Grand Finale
    name: "Grand Finale",
    par: 60,
    map: [
      "  ########",
      " ##  .   #",
      "## $ ##$ #",
      "#  $.  . #",
      "#  .$ #$##",
      "## #.    #",
      " #   @  #",
      " ########",
    ],
  },
  { // 25 — Victory Lap
    name: "Victory Lap",
    par: 55,
    map: [
      "##########",
      "#   ..   #",
      "# #$  $# #",
      "#  $..$  #",
      "# #$  $# #",
      "#   ..   #",
      "#   @    #",
      "##########",
    ],
  },
];

// ── Game State ──────────────────────────────────────────────────────────

let state = "menu"; // "menu" | "game" | "win"
let currentLevel = 0;
let grid = [];
let gridW = 0;
let gridH = 0;
let playerX = 0;
let playerY = 0;
let moves = 0;
let history = []; // undo stack: [{px, py, crateFrom, crateTo, hadTargetFrom, hadTargetTo}]
let completed = loadProgress();
let animTimer = 0;

function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem("tinyPuzzleProgress"));
    if (d && typeof d === "object") return d;
  } catch (e) {}
  return {};
}

function saveProgress() {
  localStorage.setItem("tinyPuzzleProgress", JSON.stringify(completed));
}

// ── Level Loading ───────────────────────────────────────────────────────

function loadLevel(idx) {
  const level = LEVELS[idx];
  const rows = level.map;
  gridH = rows.length;
  gridW = Math.max(...rows.map((r) => r.length));
  grid = [];
  playerX = 0;
  playerY = 0;

  for (let y = 0; y < gridH; y++) {
    grid[y] = [];
    for (let x = 0; x < gridW; x++) {
      const ch = rows[y][x] || " ";
      const tile = CHAR_MAP[ch] !== undefined ? CHAR_MAP[ch] : FLOOR;
      if (tile === PLAYER || tile === PLAYER_ON_TARGET) {
        playerX = x;
        playerY = y;
      }
      grid[y][x] = tile;
    }
  }

  moves = 0;
  history = [];
  currentLevel = idx;
  state = "game";
}

function getTile(x, y) {
  if (x < 0 || y < 0 || y >= gridH || x >= gridW) return WALL;
  return grid[y][x];
}

function isFloor(tile) {
  return tile === FLOOR || tile === TARGET || tile === PLAYER_ON_TARGET;
}

// ── Movement ────────────────────────────────────────────────────────────

function tryMove(dx, dy) {
  const nx = playerX + dx;
  const ny = playerY + dy;
  const dest = getTile(nx, ny);

  if (dest === WALL) return;

  const record = { px: playerX, py: playerY, crateFrom: null, crateTo: null };

  if (dest === CRATE || dest === CRATE_ON_TARGET) {
    // Push crate
    const bx = nx + dx;
    const by = ny + dy;
    const behind = getTile(bx, by);
    if (behind === WALL || behind === CRATE || behind === CRATE_ON_TARGET) return;

    record.crateFrom = { x: nx, y: ny, tile: dest };
    record.crateTo = { x: bx, y: by, tile: behind };

    // Move crate
    grid[ny][nx] = dest === CRATE_ON_TARGET ? TARGET : FLOOR;
    grid[by][bx] = behind === TARGET ? CRATE_ON_TARGET : CRATE;
  } else if (dest !== FLOOR && dest !== TARGET) {
    return;
  }

  // Move player
  const oldTile = grid[playerY][playerX];
  grid[playerY][playerX] = oldTile === PLAYER_ON_TARGET ? TARGET : FLOOR;
  const newBase = grid[ny][nx];
  grid[ny][nx] = newBase === TARGET ? PLAYER_ON_TARGET : PLAYER;
  playerX = nx;
  playerY = ny;
  moves++;
  history.push(record);

  // Check win
  if (checkWin()) {
    completed[currentLevel] = Math.min(moves, completed[currentLevel] || Infinity);
    saveProgress();
    state = "win";
    animTimer = 0;
  }
}

function undo() {
  if (history.length === 0) return;
  const rec = history.pop();

  // Restore player
  const curTile = grid[playerY][playerX];
  grid[playerY][playerX] = curTile === PLAYER_ON_TARGET ? TARGET : FLOOR;
  const oldBase = grid[rec.py][rec.px];
  grid[rec.py][rec.px] = oldBase === TARGET ? PLAYER_ON_TARGET : PLAYER;
  playerX = rec.px;
  playerY = rec.py;

  // Restore crate
  if (rec.crateFrom) {
    const ct = rec.crateTo;
    grid[ct.y][ct.x] = ct.tile;
    const cf = rec.crateFrom;
    grid[cf.y][cf.x] = cf.tile;
  }

  moves--;
}

function checkWin() {
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      if (grid[y][x] === TARGET || grid[y][x] === PLAYER_ON_TARGET) return false;
    }
  }
  return true;
}

// ── Rendering ───────────────────────────────────────────────────────────

const TILE_SIZE = 48;

function drawGame() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center the grid
  const ox = Math.floor((canvas.width - gridW * TILE_SIZE) / 2);
  const oy = Math.floor((canvas.height - gridH * TILE_SIZE) / 2);

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const tile = grid[y][x];
      const px = ox + x * TILE_SIZE;
      const py = oy + y * TILE_SIZE;
      const pad = 2;

      // Skip empty outside spaces
      if (tile === FLOOR && isOutside(x, y)) continue;

      // Floor
      ctx.fillStyle = COLORS.floor;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = "#252540";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

      if (tile === WALL) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px + pad, py + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px + pad, py + pad, TILE_SIZE - pad * 2, TILE_SIZE / 2 - pad);
      }

      if (tile === TARGET || tile === PLAYER_ON_TARGET) {
        ctx.fillStyle = COLORS.targetGlow;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = COLORS.target;
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.target;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (tile === CRATE || tile === CRATE_ON_TARGET) {
        const onTarget = tile === CRATE_ON_TARGET;
        const m = 6;
        ctx.fillStyle = onTarget ? COLORS.crateOk : COLORS.crate;
        ctx.fillRect(px + m, py + m, TILE_SIZE - m * 2, TILE_SIZE - m * 2);
        ctx.strokeStyle = onTarget ? COLORS.crateOkOutline : COLORS.crateOutline;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + m, py + m, TILE_SIZE - m * 2, TILE_SIZE - m * 2);
        // Cross lines on crate
        ctx.beginPath();
        ctx.moveTo(px + m, py + m);
        ctx.lineTo(px + TILE_SIZE - m, py + TILE_SIZE - m);
        ctx.moveTo(px + TILE_SIZE - m, py + m);
        ctx.lineTo(px + m, py + TILE_SIZE - m);
        ctx.stroke();
      }

      if (tile === PLAYER || tile === PLAYER_ON_TARGET) {
        ctx.fillStyle = COLORS.player;
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.playerOutline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 8, 0, Math.PI * 2);
        ctx.stroke();
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE / 2 - 5, py + TILE_SIZE / 2 - 3, 3, 0, Math.PI * 2);
        ctx.arc(px + TILE_SIZE / 2 + 5, py + TILE_SIZE / 2 - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE / 2 - 5, py + TILE_SIZE / 2 - 2, 1.5, 0, Math.PI * 2);
        ctx.arc(px + TILE_SIZE / 2 + 5, py + TILE_SIZE / 2 - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // HUD
  const level = LEVELS[currentLevel];
  hud.innerHTML =
    `<span>Level ${currentLevel + 1}: ${level.name}</span>` +
    `<span>Moves: ${moves} (Par: ${level.par})</span>`;
  controls.textContent = "Arrow Keys / WASD: Move | Z: Undo | R: Restart | ESC: Level Select";
}

// Check if a floor tile is outside the playable area (not enclosed by walls)
function isOutside(x, y) {
  // Simple flood check: if we can reach the edge via floor tiles, it's outside
  if (x === 0 || y === 0 || x === gridW - 1 || y === gridH - 1) {
    const t = grid[y][x];
    return t === FLOOR;
  }
  return false;
}

// ── Level Select Screen ─────────────────────────────────────────────────

function drawMenu() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 36px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("TINY PUZZLE", canvas.width / 2, 50);

  ctx.fillStyle = "#888";
  ctx.font = "14px 'Courier New', monospace";
  ctx.fillText("A Sokoban-style puzzle game", canvas.width / 2, 74);

  // Level grid
  const cols = 5;
  const btnW = 130;
  const btnH = 50;
  const gapX = 14;
  const gapY = 10;
  const startX = (canvas.width - cols * (btnW + gapX) + gapX) / 2;
  const startY = 100;

  for (let i = 0; i < LEVELS.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = startX + col * (btnW + gapX);
    const by = startY + row * (btnH + gapY);
    const done = completed[i] !== undefined;

    // Button bg
    ctx.fillStyle = done ? "#1a2e1a" : "#1a1a2e";
    ctx.fillRect(bx, by, btnW, btnH);
    ctx.strokeStyle = done ? "#44bb44" : "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, btnW, btnH);

    // Level number
    ctx.fillStyle = done ? "#44bb44" : "#cccccc";
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}. ${LEVELS[i].name}`, bx + btnW / 2, by + 20);

    // Stats
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "#888";
    if (done) {
      const best = completed[i];
      const par = LEVELS[i].par;
      ctx.fillStyle = best <= par ? "#ffcc00" : "#888";
      ctx.fillText(`Best: ${best} (Par: ${par})`, bx + btnW / 2, by + 38);
    } else {
      ctx.fillText(`Par: ${LEVELS[i].par}`, bx + btnW / 2, by + 38);
    }
  }

  hud.innerHTML = `<span>Completed: ${Object.keys(completed).length} / ${LEVELS.length}</span><span>Click a level to play</span>`;
  controls.textContent = "Click level to start | Progress saved automatically";
}

// ── Win Screen ──────────────────────────────────────────────────────────

function drawWin() {
  drawGame();
  animTimer += 0.02;

  // Overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.7, animTimer)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (animTimer > 0.3) {
    const level = LEVELS[currentLevel];
    const underPar = moves <= level.par;

    ctx.fillStyle = underPar ? "#ffcc00" : "#44bb44";
    ctx.font = "bold 40px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(underPar ? "PERFECT!" : "SOLVED!", canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = "#ccc";
    ctx.font = "20px 'Courier New', monospace";
    ctx.fillText(`Moves: ${moves} / Par: ${level.par}`, canvas.width / 2, canvas.height / 2 + 10);

    ctx.fillStyle = "#888";
    ctx.font = "16px 'Courier New', monospace";
    if (currentLevel < LEVELS.length - 1) {
      ctx.fillText("Press ENTER for next level | ESC for level select", canvas.width / 2, canvas.height / 2 + 50);
    } else {
      ctx.fillText("All levels complete! Press ESC for level select", canvas.width / 2, canvas.height / 2 + 50);
    }
  }
}

// ── Input ───────────────────────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
  if (state === "game") {
    switch (e.key) {
      case "ArrowUp": case "w": case "W": tryMove(0, -1); break;
      case "ArrowDown": case "s": case "S": tryMove(0, 1); break;
      case "ArrowLeft": case "a": case "A": tryMove(-1, 0); break;
      case "ArrowRight": case "d": case "D": tryMove(1, 0); break;
      case "z": case "Z": undo(); break;
      case "r": case "R": loadLevel(currentLevel); break;
      case "Escape": state = "menu"; break;
    }
    e.preventDefault();
  } else if (state === "win") {
    if (e.key === "Enter") {
      if (currentLevel < LEVELS.length - 1) loadLevel(currentLevel + 1);
    } else if (e.key === "Escape") {
      state = "menu";
    }
    e.preventDefault();
  } else if (state === "menu") {
    // Number keys for quick level access
    if (e.key >= "1" && e.key <= "9") {
      const idx = parseInt(e.key) - 1;
      if (idx < LEVELS.length) loadLevel(idx);
    }
  }
});

canvas.addEventListener("click", (e) => {
  if (state !== "menu") return;

  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  const cols = 5;
  const btnW = 130;
  const btnH = 50;
  const gapX = 14;
  const gapY = 10;
  const startX = (canvas.width - cols * (btnW + gapX) + gapX) / 2;
  const startY = 100;

  for (let i = 0; i < LEVELS.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = startX + col * (btnW + gapX);
    const by = startY + row * (btnH + gapY);

    if (mx >= bx && mx < bx + btnW && my >= by && my < by + btnH) {
      loadLevel(i);
      return;
    }
  }
});

// ── Game Loop ───────────────────────────────────────────────────────────

function loop() {
  if (state === "menu") drawMenu();
  else if (state === "game") drawGame();
  else if (state === "win") drawWin();
  requestAnimationFrame(loop);
}

loop();
