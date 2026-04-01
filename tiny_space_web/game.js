// Tiny Space — vanilla JS, HTML5 Canvas, no dependencies
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hudEl = document.getElementById("hud");
const controlsEl = document.getElementById("controls");

const W = canvas.width;
const H = canvas.height;

// ─── Game Constants ─────────────────────────────────────────────────────────
const FPS = 60;
const PLAYER_W = 32;
const PLAYER_H = 28;
const PLAYER_SPEED = 5;
const PLAYER_SHOOT_COOLDOWN = 8; // frames between shots

const BULLET_W = 4;
const BULLET_H = 12;
const BULLET_SPEED = 8;

const ENEMY_BULLET_SPEED = 4;
const ENEMY_BULLET_R = 3;

const POWERUP_SIZE = 16;
const POWERUP_SPEED = 2;
const POWERUP_CHANCE = 0.15;

const STAR_COUNT = 80;
const STAR_SPEED_MIN = 0.5;
const STAR_SPEED_MAX = 3;

const MAX_LIVES = 5;
const INVULN_FRAMES = 90; // 1.5 sec invulnerability after hit

// ─── Enemy Types ────────────────────────────────────────────────────────────
const ENEMY_TYPES = {
  scout:    { w: 24, h: 20, hp: 1, speed: 2,   pts: 10,  color: "#33cc33", shootRate: 0 },
  fighter:  { w: 28, h: 24, hp: 2, speed: 1.8, pts: 25,  color: "#ffcc00", shootRate: 0.005 },
  bomber:   { w: 36, h: 30, hp: 4, speed: 1.2, pts: 50,  color: "#ff8800", shootRate: 0.008 },
  cruiser:  { w: 40, h: 34, hp: 6, speed: 0.8, pts: 100, color: "#ff3333", shootRate: 0.012 },
  boss:     { w: 64, h: 48, hp: 30, speed: 0.5, pts: 500, color: "#cc33ff", shootRate: 0.02 },
};

// ─── Wave Definitions ───────────────────────────────────────────────────────
const WAVES = [
  // wave 1: scouts only
  { enemies: [{ type: "scout", count: 6 }], spawnDelay: 40 },
  // wave 2: scouts + fighters
  { enemies: [{ type: "scout", count: 4 }, { type: "fighter", count: 3 }], spawnDelay: 35 },
  // wave 3: fighters + bomber
  { enemies: [{ type: "fighter", count: 5 }, { type: "bomber", count: 2 }], spawnDelay: 30 },
  // wave 4: mixed
  { enemies: [{ type: "scout", count: 4 }, { type: "fighter", count: 4 }, { type: "bomber", count: 2 }], spawnDelay: 28 },
  // wave 5: bombers + cruiser
  { enemies: [{ type: "bomber", count: 4 }, { type: "cruiser", count: 2 }], spawnDelay: 25 },
  // wave 6: heavy
  { enemies: [{ type: "fighter", count: 4 }, { type: "bomber", count: 3 }, { type: "cruiser", count: 3 }], spawnDelay: 22 },
  // wave 7: swarm
  { enemies: [{ type: "scout", count: 10 }, { type: "fighter", count: 6 }, { type: "cruiser", count: 2 }], spawnDelay: 15 },
  // wave 8: boss wave
  { enemies: [{ type: "fighter", count: 4 }, { type: "cruiser", count: 2 }, { type: "boss", count: 1 }], spawnDelay: 30 },
];

// ─── Powerup Types ──────────────────────────────────────────────────────────
const POWERUP_TYPES = {
  spread: { color: "#ff33ff", label: "S", duration: 600 },
  shield: { color: "#33ccff", label: "O", duration: 480 },
  rapid:  { color: "#ffcc00", label: "R", duration: 600 },
  life:   { color: "#ff6699", label: "+", duration: 0 },
};

// ─── State ──────────────────────────────────────────────────────────────────
let state = "title"; // title | playing | gameover | win
let player, bullets, enemies, enemyBullets, powerups, particles, stars;
let score, lives, wave, waveTimer, spawnQueue, shootTimer;
let invulnTimer, spreadTimer, shieldTimer, rapidTimer;
let highScore = parseInt(localStorage.getItem("tinySpaceHigh")) || 0;
let keys = {};
let mouseX = W / 2;
let useMouseAim = false;

// ─── Stars (Background) ────────────────────────────────────────────────────
function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: STAR_SPEED_MIN + Math.random() * (STAR_SPEED_MAX - STAR_SPEED_MIN),
      brightness: 0.3 + Math.random() * 0.7,
    });
  }
}

function updateStars() {
  for (const s of stars) {
    s.y += s.speed;
    if (s.y > H) {
      s.y = 0;
      s.x = Math.random() * W;
    }
  }
}

function drawStars() {
  for (const s of stars) {
    ctx.fillStyle = `rgba(255,255,255,${s.brightness})`;
    const size = s.speed > 2 ? 2 : 1;
    ctx.fillRect(s.x, s.y, size, size);
  }
}

// ─── Particles ──────────────────────────────────────────────────────────────
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color,
      size: 1 + Math.random() * 3,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ─── Player ─────────────────────────────────────────────────────────────────
function drawPlayer() {
  if (invulnTimer > 0 && Math.floor(invulnTimer / 4) % 2 === 0) return;

  const x = player.x;
  const y = player.y;
  const hw = PLAYER_W / 2;
  const hh = PLAYER_H / 2;

  // Ship body
  ctx.fillStyle = "#33ccff";
  ctx.beginPath();
  ctx.moveTo(x, y - hh);         // nose
  ctx.lineTo(x - hw, y + hh);    // bottom-left
  ctx.lineTo(x - hw * 0.3, y + hh * 0.5); // inner-left
  ctx.lineTo(x + hw * 0.3, y + hh * 0.5); // inner-right
  ctx.lineTo(x + hw, y + hh);    // bottom-right
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#0066cc";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();

  // Engine glow
  ctx.fillStyle = "#ff6600";
  const flicker = 2 + Math.random() * 4;
  ctx.fillRect(x - 4, y + hh * 0.5, 8, flicker);

  // Shield effect
  if (shieldTimer > 0) {
    ctx.strokeStyle = shieldTimer < 60 && Math.floor(shieldTimer / 6) % 2 === 0
      ? "rgba(51,204,255,0.3)" : "rgba(51,204,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, hw + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// ─── Enemy Drawing ──────────────────────────────────────────────────────────
function drawEnemy(e) {
  const { x, y, type } = e;
  const t = ENEMY_TYPES[type];
  const hw = t.w / 2;
  const hh = t.h / 2;

  ctx.fillStyle = t.color;

  if (type === "boss") {
    // Boss: big hexagonal shape
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.4);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.4);
    ctx.lineTo(x - hw, y - hh * 0.4);
    ctx.closePath();
    ctx.fill();
    // Boss eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    // HP bar
    const barW = t.w;
    const hpRatio = e.hp / ENEMY_TYPES.boss.hp;
    ctx.fillStyle = "#333";
    ctx.fillRect(x - barW / 2, y - hh - 8, barW, 4);
    ctx.fillStyle = hpRatio > 0.5 ? "#33cc33" : hpRatio > 0.25 ? "#ffcc00" : "#ff3333";
    ctx.fillRect(x - barW / 2, y - hh - 8, barW * hpRatio, 4);
  } else {
    // Regular enemies: inverted triangle/diamond shapes
    ctx.beginPath();
    ctx.moveTo(x - hw, y - hh);
    ctx.lineTo(x + hw, y - hh);
    ctx.lineTo(x + hw * 0.5, y + hh);
    ctx.lineTo(x - hw * 0.5, y + hh);
    ctx.closePath();
    ctx.fill();
    // Cockpit
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Powerup Drawing ────────────────────────────────────────────────────────
function drawPowerup(p) {
  const pt = POWERUP_TYPES[p.type];
  ctx.fillStyle = pt.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, POWERUP_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pt.label, p.x, p.y);
}

// ─── Collision ──────────────────────────────────────────────────────────────
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy <= cr * cr;
}

// ─── Game Init ──────────────────────────────────────────────────────────────
function initGame() {
  player = { x: W / 2, y: H - 60 };
  bullets = [];
  enemies = [];
  enemyBullets = [];
  powerups = [];
  particles = [];
  score = 0;
  lives = 3;
  wave = 0;
  waveTimer = 0;
  spawnQueue = [];
  shootTimer = 0;
  invulnTimer = 0;
  spreadTimer = 0;
  shieldTimer = 0;
  rapidTimer = 0;
  initStars();
  startWave();
}

// ─── Wave Management ────────────────────────────────────────────────────────
function startWave() {
  if (wave >= WAVES.length) {
    state = "win";
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("tinySpaceHigh", highScore);
    }
    return;
  }

  const w = WAVES[wave];
  spawnQueue = [];
  for (const g of w.enemies) {
    for (let i = 0; i < g.count; i++) {
      spawnQueue.push(g.type);
    }
  }
  // Shuffle spawn order
  for (let i = spawnQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spawnQueue[i], spawnQueue[j]] = [spawnQueue[j], spawnQueue[i]];
  }
  waveTimer = 0;
}

function spawnEnemy(type) {
  const t = ENEMY_TYPES[type];
  const x = t.w / 2 + Math.random() * (W - t.w);
  const y = -t.h;
  enemies.push({
    x, y,
    type,
    hp: t.hp,
    movePhase: Math.random() * Math.PI * 2,
  });
}

// ─── Player Shooting ────────────────────────────────────────────────────────
function playerShoot() {
  const cooldown = rapidTimer > 0 ? Math.floor(PLAYER_SHOOT_COOLDOWN / 2) : PLAYER_SHOOT_COOLDOWN;
  if (shootTimer > 0) return;
  shootTimer = cooldown;

  if (spreadTimer > 0) {
    // Spread shot: 3 bullets
    bullets.push({ x: player.x, y: player.y - PLAYER_H / 2, vx: 0, vy: -BULLET_SPEED });
    bullets.push({ x: player.x - 8, y: player.y - PLAYER_H / 2 + 4, vx: -1.5, vy: -BULLET_SPEED });
    bullets.push({ x: player.x + 8, y: player.y - PLAYER_H / 2 + 4, vx: 1.5, vy: -BULLET_SPEED });
  } else {
    bullets.push({ x: player.x, y: player.y - PLAYER_H / 2, vx: 0, vy: -BULLET_SPEED });
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────
function update() {
  if (state !== "playing") return;

  // ── Player movement ──
  let dx = 0, dy = 0;
  if (keys["ArrowLeft"] || keys["KeyA"] || keys["KeyH"]) dx = -1;
  if (keys["ArrowRight"] || keys["KeyD"] || keys["KeyL"]) dx = 1;
  if (keys["ArrowUp"] || keys["KeyW"] || keys["KeyK"]) dy = -1;
  if (keys["ArrowDown"] || keys["KeyS"] || keys["KeyJ"]) dy = 1;

  if (useMouseAim) {
    const diff = mouseX - player.x;
    if (Math.abs(diff) > 3) {
      dx = diff > 0 ? 1 : -1;
    }
  }

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  player.x += dx * PLAYER_SPEED;
  player.y += dy * PLAYER_SPEED;
  player.x = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, player.x));
  player.y = Math.max(H * 0.3, Math.min(H - PLAYER_H / 2, player.y));

  // ── Auto-fire ──
  if (shootTimer > 0) shootTimer--;
  playerShoot();

  // ── Timers ──
  if (invulnTimer > 0) invulnTimer--;
  if (spreadTimer > 0) spreadTimer--;
  if (shieldTimer > 0) shieldTimer--;
  if (rapidTimer > 0) rapidTimer--;

  // ── Spawn enemies ──
  if (spawnQueue.length > 0) {
    const w = WAVES[wave];
    waveTimer++;
    if (waveTimer >= w.spawnDelay) {
      waveTimer = 0;
      spawnEnemy(spawnQueue.shift());
    }
  }

  // ── Move player bullets ──
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    if (b.y < -10 || b.x < -10 || b.x > W + 10) {
      bullets.splice(i, 1);
    }
  }

  // ── Move enemies ──
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const t = ENEMY_TYPES[e.type];

    // Sine wave horizontal movement
    e.movePhase += 0.02;
    e.x += Math.sin(e.movePhase) * 1.5;
    e.y += t.speed;

    // Boss stays in upper portion and oscillates
    if (e.type === "boss" && e.y > 100) {
      e.y = 100;
    }

    // Enemy shooting
    if (t.shootRate > 0 && Math.random() < t.shootRate) {
      // Aim at player
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        enemyBullets.push({
          x: e.x,
          y: e.y + t.h / 2,
          vx: (dx / dist) * ENEMY_BULLET_SPEED,
          vy: (dy / dist) * ENEMY_BULLET_SPEED,
        });
      }
    }

    // Off-screen removal (bottom)
    if (e.y > H + 50) {
      enemies.splice(i, 1);
    }
  }

  // ── Move enemy bullets ──
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.x += b.vx;
    b.y += b.vy;
    if (b.y > H + 10 || b.y < -10 || b.x < -10 || b.x > W + 10) {
      enemyBullets.splice(i, 1);
    }
  }

  // ── Move powerups ──
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += POWERUP_SPEED;
    if (p.y > H + 20) {
      powerups.splice(i, 1);
    }
  }

  // ── Bullet-Enemy collisions ──
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      const t = ENEMY_TYPES[e.type];
      if (rectsOverlap(
        b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H,
        e.x - t.w / 2, e.y - t.h / 2, t.w, t.h
      )) {
        bullets.splice(bi, 1);
        e.hp--;
        spawnParticles(b.x, b.y, t.color, 3);
        if (e.hp <= 0) {
          score += t.pts;
          spawnParticles(e.x, e.y, t.color, 15);
          // Powerup drop
          if (Math.random() < POWERUP_CHANCE) {
            const types = Object.keys(POWERUP_TYPES);
            const pt = types[Math.floor(Math.random() * types.length)];
            powerups.push({ x: e.x, y: e.y, type: pt });
          }
          enemies.splice(ei, 1);
        }
        break;
      }
    }
  }

  // ── Enemy bullet-Player collisions ──
  if (invulnTimer <= 0) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      if (circleRectOverlap(
        b.x, b.y, ENEMY_BULLET_R,
        player.x - PLAYER_W / 2, player.y - PLAYER_H / 2, PLAYER_W, PLAYER_H
      )) {
        enemyBullets.splice(i, 1);
        if (shieldTimer > 0) {
          shieldTimer = 0;
          spawnParticles(b.x, b.y, "#33ccff", 8);
        } else {
          playerHit();
        }
      }
    }
  }

  // ── Enemy-Player collisions ──
  if (invulnTimer <= 0) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const t = ENEMY_TYPES[e.type];
      if (rectsOverlap(
        player.x - PLAYER_W / 2, player.y - PLAYER_H / 2, PLAYER_W, PLAYER_H,
        e.x - t.w / 2, e.y - t.h / 2, t.w, t.h
      )) {
        if (shieldTimer > 0) {
          shieldTimer = 0;
          e.hp -= 2;
          spawnParticles(e.x, e.y, "#33ccff", 8);
          if (e.hp <= 0) {
            score += t.pts;
            spawnParticles(e.x, e.y, t.color, 15);
            enemies.splice(i, 1);
          }
        } else {
          playerHit();
          e.hp -= 2;
          if (e.hp <= 0) {
            score += t.pts;
            spawnParticles(e.x, e.y, t.color, 15);
            enemies.splice(i, 1);
          }
        }
      }
    }
  }

  // ── Powerup collection ──
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (circleRectOverlap(
      p.x, p.y, POWERUP_SIZE / 2,
      player.x - PLAYER_W / 2, player.y - PLAYER_H / 2, PLAYER_W, PLAYER_H
    )) {
      applyPowerup(p.type);
      spawnParticles(p.x, p.y, POWERUP_TYPES[p.type].color, 8);
      powerups.splice(i, 1);
    }
  }

  // ── Wave completion ──
  if (spawnQueue.length === 0 && enemies.length === 0) {
    wave++;
    startWave();
  }

  updateStars();
  updateParticles();
}

function playerHit() {
  lives--;
  invulnTimer = INVULN_FRAMES;
  spawnParticles(player.x, player.y, "#33ccff", 20);
  if (lives <= 0) {
    state = "gameover";
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("tinySpaceHigh", highScore);
    }
  }
}

function applyPowerup(type) {
  const pt = POWERUP_TYPES[type];
  if (type === "life") {
    lives = Math.min(lives + 1, MAX_LIVES);
  } else if (type === "spread") {
    spreadTimer = pt.duration;
  } else if (type === "shield") {
    shieldTimer = pt.duration;
  } else if (type === "rapid") {
    rapidTimer = pt.duration;
  }
}

// ─── Drawing ────────────────────────────────────────────────────────────────
function draw() {
  ctx.fillStyle = "#050510";
  ctx.fillRect(0, 0, W, H);

  drawStars();

  if (state === "title") {
    drawTitle();
    updateStars();
    updateHud();
    return;
  }

  if (state === "gameover") {
    drawGameOver();
    updateHud();
    return;
  }

  if (state === "win") {
    drawWin();
    updateHud();
    return;
  }

  // Draw game objects
  // Bullets
  ctx.fillStyle = "#33ccff";
  for (const b of bullets) {
    ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
  }

  // Enemy bullets
  ctx.fillStyle = "#ff4444";
  for (const b of enemyBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, ENEMY_BULLET_R, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemies
  for (const e of enemies) {
    drawEnemy(e);
  }

  // Powerups
  for (const p of powerups) {
    drawPowerup(p);
  }

  // Player
  drawPlayer();

  // Particles
  drawParticles();

  // Wave indicator
  if (wave < WAVES.length) {
    ctx.fillStyle = "#666";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`WAVE ${wave + 1} / ${WAVES.length}`, W / 2, 20);
  }

  updateHud();
}

function drawTitle() {
  ctx.fillStyle = "#33ccff";
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.fillText("TINY SPACE", W / 2, H / 2 - 60);

  ctx.fillStyle = "#aaa";
  ctx.font = "16px monospace";
  ctx.fillText("Arrow Keys / WASD to move", W / 2, H / 2 + 10);
  ctx.fillText("Auto-fire enabled", W / 2, H / 2 + 35);
  ctx.fillText("Mouse for horizontal aim (optional)", W / 2, H / 2 + 60);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "18px monospace";
  ctx.fillText("Press ENTER or SPACE to start", W / 2, H / 2 + 110);

  if (highScore > 0) {
    ctx.fillStyle = "#ff8800";
    ctx.font = "14px monospace";
    ctx.fillText(`High Score: ${highScore}`, W / 2, H / 2 + 150);
  }
}

function drawGameOver() {
  // Keep drawing game objects faded
  ctx.globalAlpha = 0.3;
  for (const e of enemies) drawEnemy(e);
  ctx.globalAlpha = 1;
  drawParticles();

  ctx.fillStyle = "#ff3333";
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", W / 2, H / 2 - 30);

  ctx.fillStyle = "#aaa";
  ctx.font = "20px monospace";
  ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 20);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = "#ffcc00";
    ctx.font = "16px monospace";
    ctx.fillText("NEW HIGH SCORE!", W / 2, H / 2 + 50);
  }

  ctx.fillStyle = "#ffcc00";
  ctx.font = "16px monospace";
  ctx.fillText("Press ENTER or SPACE to retry", W / 2, H / 2 + 90);
}

function drawWin() {
  drawParticles();

  ctx.fillStyle = "#33ff33";
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.fillText("VICTORY!", W / 2, H / 2 - 50);

  ctx.fillStyle = "#aaa";
  ctx.font = "20px monospace";
  ctx.fillText(`Final Score: ${score}`, W / 2, H / 2 + 10);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "16px monospace";
  ctx.fillText(`High Score: ${highScore}`, W / 2, H / 2 + 45);

  ctx.fillText("Press ENTER or SPACE to play again", W / 2, H / 2 + 90);
}

function updateHud() {
  if (state === "title") {
    hudEl.innerHTML = `<span>TINY SPACE</span><span>High: ${highScore}</span>`;
    controlsEl.textContent = "Arrows/WASD: move | Auto-fire | Collect powerups";
    return;
  }

  const livesStr = "\u2764".repeat(lives);
  const powerupsActive = [];
  if (spreadTimer > 0) powerupsActive.push("SPREAD");
  if (shieldTimer > 0) powerupsActive.push("SHIELD");
  if (rapidTimer > 0) powerupsActive.push("RAPID");
  const pwrStr = powerupsActive.length > 0 ? ` | ${powerupsActive.join(" ")}` : "";

  hudEl.innerHTML = `<span>Score: ${score} | ${livesStr}${pwrStr}</span><span>Wave ${Math.min(wave + 1, WAVES.length)}/${WAVES.length} | High: ${highScore}</span>`;
  controlsEl.textContent = "Arrows/WASD: move | Auto-fire | Powerups: [S]pread [O]shield [R]apid [+]life";
}

// ─── Input ──────────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  if (state === "title" && (e.code === "Enter" || e.code === "Space")) {
    e.preventDefault();
    state = "playing";
    initGame();
  } else if ((state === "gameover" || state === "win") && (e.code === "Enter" || e.code === "Space")) {
    e.preventDefault();
    state = "playing";
    initGame();
  }

  if (e.code === "Space") e.preventDefault();
});

document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (W / rect.width);
  useMouseAim = true;
});

canvas.addEventListener("mouseleave", () => {
  useMouseAim = false;
});

canvas.addEventListener("click", (e) => {
  if (state === "title") {
    state = "playing";
    initGame();
  } else if (state === "gameover" || state === "win") {
    state = "playing";
    initGame();
  }
});

// ─── Game Loop ──────────────────────────────────────────────────────────────
initStars();

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
