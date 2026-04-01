// Tiny Tower Defense — vanilla JS, HTML5 Canvas, no dependencies
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hudEl = document.getElementById("hud");
const controlsEl = document.getElementById("controls");

// ─── Constants ───────────────────────────────────────────────────────────────
const TILE = 40;
const COLS = 20;
const ROWS = 15;
const FPS = 30;

// Map: 0 = buildable, 1 = path, 2 = entry, 3 = exit, 4 = blocked (decoration)
const MAP = [
  [4,4,4,2,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4],
  [4,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,4],
  [4,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,4],
  [4,4,4,4,4,4,4,4,4,4,4,4,4,3,4,4,4,4,4,4],
];

// Build the path waypoints from the map
function buildPath() {
  const path = [];
  // Find entry
  let start = null;
  for (let c = 0; c < COLS; c++) {
    if (MAP[0][c] === 2) { start = { r: 0, c }; break; }
  }
  if (!start) return path;

  const visited = new Set();
  const queue = [start];
  visited.add(`${start.r},${start.c}`);
  path.push({ x: start.c * TILE + TILE / 2, y: start.r * TILE + TILE / 2 });

  // BFS-like trace following path tiles
  let cur = start;
  while (true) {
    const neighbors = [
      { r: cur.r - 1, c: cur.c },
      { r: cur.r + 1, c: cur.c },
      { r: cur.r, c: cur.c - 1 },
      { r: cur.r, c: cur.c + 1 },
    ];
    let found = false;
    for (const n of neighbors) {
      const key = `${n.r},${n.c}`;
      if (n.r < 0 || n.r >= ROWS || n.c < 0 || n.c >= COLS) continue;
      if (visited.has(key)) continue;
      const tile = MAP[n.r][n.c];
      if (tile === 1 || tile === 3) {
        visited.add(key);
        path.push({ x: n.c * TILE + TILE / 2, y: n.r * TILE + TILE / 2 });
        cur = n;
        found = true;
        if (tile === 3) return path; // reached exit
        break;
      }
    }
    if (!found) break;
  }
  return path;
}

const PATH = buildPath();

// ─── Tower Definitions ──────────────────────────────────────────────────────
const TOWER_TYPES = {
  arrow:     { name: "Arrow",     cost: 25,  range: 120, damage: 8,   rate: 8,  color: "#44aa44", splash: 0, slow: 0,   chain: 0, desc: "Fast, low damage" },
  cannon:    { name: "Cannon",    cost: 50,  range: 100, damage: 30,  rate: 20, color: "#aa6633", splash: 50, slow: 0,  chain: 0, desc: "Slow, area damage" },
  ice:       { name: "Ice",       cost: 40,  range: 110, damage: 0,   rate: 15, color: "#66ccff", splash: 0, slow: 0.5, chain: 0, desc: "Slows enemies" },
  lightning: { name: "Lightning", cost: 75,  range: 130, damage: 15,  rate: 12, color: "#ffff44", splash: 0, slow: 0,   chain: 3, desc: "Chain damage" },
};

// ─── Enemy Definitions ──────────────────────────────────────────────────────
const ENEMY_TYPES = {
  normal: { hp: 60,  speed: 1.2, reward: 10, color: "#cc3333", radius: 8, name: "Normal" },
  fast:   { hp: 35,  speed: 2.2, reward: 12, color: "#ff6600", radius: 6, name: "Fast" },
  tank:   { hp: 150, speed: 0.7, reward: 20, color: "#9933cc", radius: 11, name: "Tank" },
  flying: { hp: 50,  speed: 1.5, reward: 15, color: "#33cccc", radius: 7, name: "Flying" },
};

// ─── Wave Definitions (12 waves) ────────────────────────────────────────────
const WAVES = [
  // wave 1–3: easy
  [{ type: "normal", count: 6, interval: 30 }],
  [{ type: "normal", count: 8, interval: 25 }, { type: "fast", count: 3, interval: 20 }],
  [{ type: "normal", count: 6, interval: 25 }, { type: "fast", count: 5, interval: 20 }],
  // wave 4–6: medium
  [{ type: "tank", count: 3, interval: 40 }, { type: "normal", count: 8, interval: 20 }],
  [{ type: "fast", count: 10, interval: 15 }, { type: "tank", count: 2, interval: 40 }],
  [{ type: "normal", count: 8, interval: 20 }, { type: "flying", count: 5, interval: 25 }],
  // wave 7–9: hard
  [{ type: "tank", count: 5, interval: 30 }, { type: "fast", count: 8, interval: 15 }],
  [{ type: "flying", count: 8, interval: 18 }, { type: "tank", count: 4, interval: 35 }],
  [{ type: "normal", count: 10, interval: 15 }, { type: "fast", count: 8, interval: 12 }, { type: "tank", count: 3, interval: 35 }],
  // wave 10–12: brutal
  [{ type: "tank", count: 6, interval: 25 }, { type: "flying", count: 8, interval: 15 }],
  [{ type: "fast", count: 15, interval: 10 }, { type: "tank", count: 5, interval: 25 }, { type: "flying", count: 5, interval: 20 }],
  [{ type: "tank", count: 8, interval: 20 }, { type: "fast", count: 10, interval: 10 }, { type: "flying", count: 8, interval: 15 }],
];

// ─── Game State ─────────────────────────────────────────────────────────────
let state = "title"; // title, playing, gameover, win
let gold = 150;
let lives = 20;
let wave = 0;
let waveActive = false;
let waveTimer = 0;
let spawnQueue = [];
let enemies = [];
let towers = [];
let projectiles = [];
let effects = [];
let selectedTower = "arrow";
let hoverTile = null;
let tick = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function tileAt(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return -1;
  return MAP[r][c];
}

function canBuild(r, c) {
  return tileAt(r, c) === 0 && !towers.some(t => t.row === r && t.col === c);
}

// ─── Spawning ───────────────────────────────────────────────────────────────
function startWave() {
  if (wave >= WAVES.length) return;
  waveActive = true;
  spawnQueue = [];
  const waveDef = WAVES[wave];
  let delay = 0;
  for (const group of waveDef) {
    for (let i = 0; i < group.count; i++) {
      spawnQueue.push({ type: group.type, delay });
      delay += group.interval;
    }
  }
  waveTimer = 0;
}

function spawnEnemy(type) {
  const def = ENEMY_TYPES[type];
  const start = PATH[0];
  enemies.push({
    x: start.x, y: start.y,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed,
    color: def.color,
    radius: def.radius,
    reward: def.reward,
    type: type,
    pathIdx: 0,
    slowTimer: 0,
    slowFactor: 1,
  });
}

// ─── Tower Logic ────────────────────────────────────────────────────────────
function placeTower(r, c, type) {
  const def = TOWER_TYPES[type];
  if (gold < def.cost) return false;
  if (!canBuild(r, c)) return false;
  gold -= def.cost;
  towers.push({
    row: r, col: c,
    x: c * TILE + TILE / 2,
    y: r * TILE + TILE / 2,
    type: type,
    cooldown: 0,
    ...def,
  });
  return true;
}

function towerUpdate(tower) {
  if (tower.cooldown > 0) { tower.cooldown--; return; }

  // Find target — closest enemy in range
  let target = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    // Flying enemies can only be targeted by arrow and lightning towers
    if (e.type === "flying" && tower.type !== "arrow" && tower.type !== "lightning") continue;
    const d = dist(tower, e);
    if (d <= tower.range && d < bestDist) {
      bestDist = d;
      target = e;
    }
  }
  if (!target) return;

  tower.cooldown = tower.rate;

  if (tower.type === "ice") {
    // Ice tower slows
    target.slowTimer = 90; // 3 seconds
    target.slowFactor = 1 - tower.slow;
    effects.push({ type: "ice", x: target.x, y: target.y, timer: 10 });
  } else if (tower.type === "lightning") {
    // Chain lightning
    const hit = [target];
    let current = target;
    for (let i = 0; i < tower.chain; i++) {
      let next = null;
      let nd = Infinity;
      for (const e of enemies) {
        if (hit.includes(e)) continue;
        const d = dist(current, e);
        if (d < 80 && d < nd) { nd = d; next = e; }
      }
      if (next) { hit.push(next); current = next; }
      else break;
    }
    for (const e of hit) {
      e.hp -= tower.damage;
    }
    // Draw chain effect
    effects.push({ type: "lightning", points: hit.map(e => ({ x: e.x, y: e.y })), start: { x: tower.x, y: tower.y }, timer: 8 });
  } else {
    // Arrow and Cannon fire projectiles
    const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    projectiles.push({
      x: tower.x, y: tower.y,
      vx: Math.cos(angle) * 5,
      vy: Math.sin(angle) * 5,
      damage: tower.damage,
      splash: tower.splash,
      color: tower.color,
      type: tower.type,
      life: 60,
    });
  }
}

// ─── Projectile Logic ───────────────────────────────────────────────────────
function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    if (p.life <= 0) { projectiles.splice(i, 1); continue; }

    // Check collision with enemies
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      if (dist(p, e) < e.radius + 4) {
        if (p.splash > 0) {
          // Area damage
          for (const e2 of enemies) {
            if (dist(p, e2) <= p.splash) {
              e2.hp -= p.damage;
            }
          }
          effects.push({ type: "explosion", x: p.x, y: p.y, radius: p.splash, timer: 12 });
        } else {
          e.hp -= p.damage;
        }
        projectiles.splice(i, 1);
        break;
      }
    }
  }
}

// ─── Enemy Movement ─────────────────────────────────────────────────────────
function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    // Dead?
    if (e.hp <= 0) {
      gold += e.reward;
      effects.push({ type: "death", x: e.x, y: e.y, timer: 15 });
      enemies.splice(i, 1);
      continue;
    }

    // Slow decay
    if (e.slowTimer > 0) {
      e.slowTimer--;
      if (e.slowTimer <= 0) e.slowFactor = 1;
    }

    // Move along path
    if (e.pathIdx >= PATH.length - 1) {
      // Reached exit
      lives--;
      enemies.splice(i, 1);
      if (lives <= 0) { state = "gameover"; }
      continue;
    }

    const target = PATH[e.pathIdx + 1];
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const speed = e.speed * e.slowFactor;

    if (d < speed) {
      e.x = target.x;
      e.y = target.y;
      e.pathIdx++;
    } else {
      e.x += (dx / d) * speed;
      e.y += (dy / d) * speed;
    }
  }
}

// ─── Effects ────────────────────────────────────────────────────────────────
function updateEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].timer--;
    if (effects[i].timer <= 0) effects.splice(i, 1);
  }
}

// ─── Main Update ────────────────────────────────────────────────────────────
function update() {
  if (state !== "playing") return;
  tick++;

  // Spawn enemies
  if (waveActive) {
    waveTimer++;
    for (let i = spawnQueue.length - 1; i >= 0; i--) {
      if (spawnQueue[i].delay <= waveTimer) {
        spawnEnemy(spawnQueue[i].type);
        spawnQueue.splice(i, 1);
      }
    }
    if (spawnQueue.length === 0 && enemies.length === 0) {
      waveActive = false;
      wave++;
      if (wave >= WAVES.length) {
        state = "win";
      }
    }
  }

  // Towers
  for (const t of towers) towerUpdate(t);

  // Projectiles
  updateProjectiles();

  // Enemies
  updateEnemies();

  // Effects
  updateEffects();
}

// ─── Rendering ──────────────────────────────────────────────────────────────
const TILE_COLORS = {
  0: "#1a2a1a", // buildable
  1: "#3a3322", // path
  2: "#553322", // entry
  3: "#335533", // exit
  4: "#111111", // blocked
};

function drawMap() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = MAP[r][c];
      ctx.fillStyle = TILE_COLORS[tile] || "#111";
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);
    }
  }

  // Draw path direction arrows (subtle)
  ctx.fillStyle = "rgba(255,255,200,0.08)";
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    ctx.beginPath();
    ctx.arc(mx, my, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTowers() {
  for (const t of towers) {
    // Base
    ctx.fillStyle = "#222";
    ctx.fillRect(t.col * TILE + 4, t.row * TILE + 4, TILE - 8, TILE - 8);
    // Tower body
    ctx.fillStyle = t.color;
    ctx.fillRect(t.col * TILE + 8, t.row * TILE + 8, TILE - 16, TILE - 16);
    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.name[0], t.x, t.y);
  }
}

function drawEnemies() {
  for (const e of enemies) {
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.radius, e.radius, e.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flying enemies float above
    const yOff = e.type === "flying" ? -6 : 0;

    // Body
    ctx.fillStyle = e.slowTimer > 0 ? "#88bbff" : e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y + yOff, e.radius, 0, Math.PI * 2);
    ctx.fill();

    // HP bar
    const barW = e.radius * 2.5;
    const barH = 3;
    const barX = e.x - barW / 2;
    const barY = e.y + yOff - e.radius - 6;
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = e.hp > e.maxHp * 0.5 ? "#44cc44" : e.hp > e.maxHp * 0.25 ? "#cccc44" : "#cc4444";
    ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.type === "cannon" ? 4 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEffects() {
  for (const e of effects) {
    const alpha = e.timer / 15;
    if (e.type === "explosion") {
      ctx.strokeStyle = `rgba(255,150,50,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * (1 - alpha * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === "death") {
      ctx.fillStyle = `rgba(255,100,100,${alpha})`;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("x", e.x, e.y - 5 + (15 - e.timer));
    } else if (e.type === "ice") {
      ctx.fillStyle = `rgba(100,200,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 12 * alpha, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "lightning") {
      ctx.strokeStyle = `rgba(255,255,100,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.start.x, e.start.y);
      for (const pt of e.points) {
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }
}

function drawHoverPreview() {
  if (!hoverTile || state !== "playing") return;
  const { r, c } = hoverTile;
  if (!canBuild(r, c)) {
    ctx.fillStyle = "rgba(255,50,50,0.2)";
    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    return;
  }
  const def = TOWER_TYPES[selectedTower];
  // Range preview
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, def.range, 0, Math.PI * 2);
  ctx.stroke();
  // Tower preview
  ctx.fillStyle = gold >= def.cost ? "rgba(100,255,100,0.3)" : "rgba(255,100,100,0.3)";
  ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
  ctx.fillStyle = def.color + "88";
  ctx.fillRect(c * TILE + 8, r * TILE + 8, TILE - 16, TILE - 16);
}

function drawTitleScreen() {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TINY TOWER DEFENSE", canvas.width / 2, 180);

  ctx.fillStyle = "#999";
  ctx.font = "16px monospace";
  ctx.fillText("Defend the exit from waves of enemies!", canvas.width / 2, 240);
  ctx.fillText("Place towers on green tiles to stop them.", canvas.width / 2, 270);

  ctx.fillStyle = "#666";
  ctx.font = "14px monospace";
  ctx.fillText("[1] Arrow  [2] Cannon  [3] Ice  [4] Lightning", canvas.width / 2, 330);
  ctx.fillText("Click to place towers. Press SPACE to start.", canvas.width / 2, 360);

  ctx.fillStyle = "#44aa44";
  ctx.font = "bold 20px monospace";
  ctx.fillText("Press SPACE to begin", canvas.width / 2, 430);
}

function drawGameOverScreen() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#cc3333";
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GAME OVER", canvas.width / 2, 250);

  ctx.fillStyle = "#999";
  ctx.font = "16px monospace";
  ctx.fillText(`Survived ${wave} of ${WAVES.length} waves`, canvas.width / 2, 300);

  ctx.fillStyle = "#44aa44";
  ctx.font = "bold 16px monospace";
  ctx.fillText("Press R to restart", canvas.width / 2, 360);
}

function drawWinScreen() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VICTORY!", canvas.width / 2, 250);

  ctx.fillStyle = "#999";
  ctx.font = "16px monospace";
  ctx.fillText(`All ${WAVES.length} waves defeated!`, canvas.width / 2, 300);
  ctx.fillText(`Gold remaining: ${gold}  |  Lives: ${lives}`, canvas.width / 2, 330);

  ctx.fillStyle = "#44aa44";
  ctx.font = "bold 16px monospace";
  ctx.fillText("Press R to play again", canvas.width / 2, 390);
}

function drawHUD() {
  if (state === "title") {
    hudEl.innerHTML = "";
    controlsEl.innerHTML = "";
    return;
  }

  const towerDef = TOWER_TYPES[selectedTower];
  hudEl.innerHTML =
    `<span>Wave: ${wave + 1}/${WAVES.length} | Gold: ${gold} | Lives: ${lives}</span>` +
    `<span>Selected: ${towerDef.name} ($${towerDef.cost}) — ${towerDef.desc}</span>`;

  controlsEl.innerHTML =
    `[1] Arrow $25 | [2] Cannon $50 | [3] Ice $40 | [4] Lightning $75 | ` +
    `SPACE: ${waveActive ? "wave in progress..." : "send next wave"} | ` +
    `Click: place tower`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state === "title") {
    drawTitleScreen();
    return;
  }

  drawMap();
  drawTowers();
  drawHoverPreview();
  drawEnemies();
  drawProjectiles();
  drawEffects();

  if (state === "gameover") drawGameOverScreen();
  if (state === "win") drawWinScreen();

  drawHUD();
}

// ─── Input ──────────────────────────────────────────────────────────────────
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  hoverTile = { r: Math.floor(my / TILE), c: Math.floor(mx / TILE) };
});

canvas.addEventListener("mouseleave", () => {
  hoverTile = null;
});

canvas.addEventListener("click", (e) => {
  if (state !== "playing") return;
  if (!hoverTile) return;
  placeTower(hoverTile.r, hoverTile.c, selectedTower);
});

document.addEventListener("keydown", (e) => {
  if (state === "title" && e.code === "Space") {
    e.preventDefault();
    state = "playing";
    startWave();
    return;
  }

  if ((state === "gameover" || state === "win") && (e.code === "KeyR")) {
    resetGame();
    return;
  }

  if (state !== "playing") return;

  switch (e.code) {
    case "Digit1": case "Numpad1": selectedTower = "arrow"; break;
    case "Digit2": case "Numpad2": selectedTower = "cannon"; break;
    case "Digit3": case "Numpad3": selectedTower = "ice"; break;
    case "Digit4": case "Numpad4": selectedTower = "lightning"; break;
    case "Space":
      e.preventDefault();
      if (!waveActive) startWave();
      break;
  }
});

// ─── Reset ──────────────────────────────────────────────────────────────────
function resetGame() {
  state = "playing";
  gold = 150;
  lives = 20;
  wave = 0;
  waveActive = false;
  waveTimer = 0;
  spawnQueue = [];
  enemies = [];
  towers = [];
  projectiles = [];
  effects = [];
  selectedTower = "arrow";
  tick = 0;
  startWave();
}

// ─── Game Loop ──────────────────────────────────────────────────────────────
function gameLoop() {
  update();
  draw();
  setTimeout(gameLoop, 1000 / FPS);
}

gameLoop();
