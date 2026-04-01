// Tiny Breakout — vanilla JS, HTML5 Canvas, no dependencies
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hudEl = document.getElementById("hud");
const controlsEl = document.getElementById("controls");

const W = canvas.width;
const H = canvas.height;

// ─── Game Constants ─────────────────────────────────────────────────────────
const PADDLE_W = 100;
const PADDLE_H = 14;
const PADDLE_Y = H - 40;
const PADDLE_SPEED = 8;

const BALL_R = 6;
const BALL_SPEED_INIT = 5;
const BALL_SPEED_MAX = 9;
const BALL_SPEED_INC = 0.3; // per level

const BRICK_ROWS = 8;
const BRICK_COLS = 12;
const BRICK_W = 58;
const BRICK_H = 18;
const BRICK_PAD = 4;
const BRICK_TOP = 60;
const BRICK_LEFT = (W - BRICK_COLS * (BRICK_W + BRICK_PAD) + BRICK_PAD) / 2;

const FPS = 60;

// ─── Brick Colors by Row ────────────────────────────────────────────────────
const ROW_COLORS = [
  "#ff3333", "#ff3333",
  "#ff8800", "#ff8800",
  "#ffcc00", "#ffcc00",
  "#33cc33", "#33cc33",
];
const ROW_POINTS = [7, 7, 5, 5, 3, 3, 1, 1];

// ─── Powerup Types ──────────────────────────────────────────────────────────
const POWERUP_TYPES = {
  wide:   { color: "#33ccff", label: "W", duration: 600 },
  multi:  { color: "#ff33ff", label: "M", duration: 0 },
  slow:   { color: "#33ff33", label: "S", duration: 480 },
  life:   { color: "#ff6699", label: "+", duration: 0 },
};
const POWERUP_CHANCE = 0.12;
const POWERUP_R = 10;
const POWERUP_SPEED = 2;

// ─── Game State ─────────────────────────────────────────────────────────────
let state = "title"; // title, playing, paused, gameover, win
let level = 1;
let lives = 3;
let score = 0;
let highScore = parseInt(localStorage.getItem("tinyBreakoutHigh") || "0", 10);

let paddle = { x: W / 2, w: PADDLE_W };
let balls = [];
let bricks = [];
let powerups = [];
let particles = [];
let activeEffects = { wide: 0, slow: 0 };

let keys = {};

// ─── Input ──────────────────────────────────────────────────────────────────
let mouseX = W / 2;

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (state === "title" && (e.key === "Enter" || e.key === " ")) {
    startGame();
  } else if (state === "playing" && e.key === "p") {
    state = "paused";
  } else if (state === "paused" && (e.key === "p" || e.key === " ")) {
    state = "playing";
  } else if ((state === "gameover" || state === "win") && (e.key === "Enter" || e.key === " ")) {
    state = "title";
  }
});

document.addEventListener("keyup", e => { keys[e.key] = false; });

canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (W / rect.width);
});

canvas.addEventListener("click", () => {
  if (state === "title") startGame();
  else if (state === "gameover" || state === "win") state = "title";
});

// ─── Level Setup ────────────────────────────────────────────────────────────
function buildBricks() {
  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      // On higher levels, some bricks take 2 hits
      const hits = (level >= 3 && r < 2 && Math.random() < 0.3 * level) ? 2 : 1;
      bricks.push({
        x: BRICK_LEFT + c * (BRICK_W + BRICK_PAD),
        y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        w: BRICK_W,
        h: BRICK_H,
        color: ROW_COLORS[r],
        points: ROW_POINTS[r] * level,
        hits,
        maxHits: hits,
        alive: true,
      });
    }
  }
}

function resetBall() {
  const speed = Math.min(BALL_SPEED_INIT + (level - 1) * BALL_SPEED_INC, BALL_SPEED_MAX);
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
  balls = [{
    x: W / 2,
    y: PADDLE_Y - BALL_R - 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed,
  }];
}

function startGame() {
  state = "playing";
  level = 1;
  lives = 3;
  score = 0;
  activeEffects = { wide: 0, slow: 0 };
  paddle = { x: W / 2, w: PADDLE_W };
  powerups = [];
  particles = [];
  buildBricks();
  resetBall();
}

function nextLevel() {
  level++;
  activeEffects = { wide: 0, slow: 0 };
  paddle.w = PADDLE_W;
  powerups = [];
  particles = [];
  buildBricks();
  resetBall();
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
      life: 20 + Math.random() * 15,
      color,
      r: 2 + Math.random() * 2,
    });
  }
}

// ─── Powerup Spawning ───────────────────────────────────────────────────────
function maybeSpawnPowerup(x, y) {
  if (Math.random() > POWERUP_CHANCE) return;
  const types = Object.keys(POWERUP_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push({
    x: x, y: y,
    type,
    ...POWERUP_TYPES[type],
  });
}

function applyPowerup(p) {
  switch (p.type) {
    case "wide":
      paddle.w = PADDLE_W * 1.5;
      activeEffects.wide = POWERUP_TYPES.wide.duration;
      break;
    case "multi": {
      const newBalls = [];
      for (const b of balls) {
        for (let i = 0; i < 2; i++) {
          const angle = Math.atan2(b.vy, b.vx) + (i === 0 ? -0.4 : 0.4);
          newBalls.push({
            x: b.x, y: b.y,
            vx: Math.cos(angle) * b.speed,
            vy: Math.sin(angle) * b.speed,
            speed: b.speed,
          });
        }
      }
      balls.push(...newBalls);
      break;
    }
    case "slow":
      activeEffects.slow = POWERUP_TYPES.slow.duration;
      break;
    case "life":
      lives = Math.min(lives + 1, 5);
      break;
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────
function update() {
  if (state !== "playing") return;

  // Paddle movement (keyboard + mouse)
  if (keys["ArrowLeft"] || keys["a"]) paddle.x -= PADDLE_SPEED;
  if (keys["ArrowRight"] || keys["d"]) paddle.x += PADDLE_SPEED;

  // Mouse following
  const targetX = mouseX;
  paddle.x += (targetX - paddle.x) * 0.3;

  // Clamp paddle
  const halfPad = paddle.w / 2;
  paddle.x = Math.max(halfPad, Math.min(W - halfPad, paddle.x));

  // Tick effects
  if (activeEffects.wide > 0) {
    activeEffects.wide--;
    if (activeEffects.wide === 0) paddle.w = PADDLE_W;
  }
  if (activeEffects.slow > 0) {
    activeEffects.slow--;
  }

  const speedMult = activeEffects.slow > 0 ? 0.6 : 1;

  // Update balls
  const deadBalls = [];
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.x += b.vx * speedMult;
    b.y += b.vy * speedMult;

    // Wall collisions
    if (b.x - BALL_R <= 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
    if (b.x + BALL_R >= W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
    if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }

    // Bottom — ball lost
    if (b.y + BALL_R >= H) {
      deadBalls.push(i);
      continue;
    }

    // Paddle collision
    const padLeft = paddle.x - paddle.w / 2;
    const padRight = paddle.x + paddle.w / 2;
    if (b.vy > 0 &&
        b.y + BALL_R >= PADDLE_Y &&
        b.y + BALL_R <= PADDLE_Y + PADDLE_H &&
        b.x >= padLeft && b.x <= padRight) {
      // Reflect with angle based on where ball hit paddle
      const hit = (b.x - paddle.x) / (paddle.w / 2); // -1 to 1
      const angle = hit * (Math.PI / 3) - Math.PI / 2; // -150 to -30 degrees
      b.vx = Math.cos(angle) * b.speed;
      b.vy = Math.sin(angle) * b.speed;
      b.y = PADDLE_Y - BALL_R;
    }

    // Brick collisions
    for (const brick of bricks) {
      if (!brick.alive) continue;
      if (b.x + BALL_R > brick.x && b.x - BALL_R < brick.x + brick.w &&
          b.y + BALL_R > brick.y && b.y - BALL_R < brick.y + brick.h) {
        // Determine collision side
        const overlapLeft = (b.x + BALL_R) - brick.x;
        const overlapRight = (brick.x + brick.w) - (b.x - BALL_R);
        const overlapTop = (b.y + BALL_R) - brick.y;
        const overlapBottom = (brick.y + brick.h) - (b.y - BALL_R);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapLeft || minOverlap === overlapRight) {
          b.vx = -b.vx;
        } else {
          b.vy = -b.vy;
        }

        brick.hits--;
        if (brick.hits <= 0) {
          brick.alive = false;
          score += brick.points;
          spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 8);
          maybeSpawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
        }
        break; // one brick per frame per ball
      }
    }
  }

  // Remove dead balls (from bottom to top to preserve indices)
  for (let i = deadBalls.length - 1; i >= 0; i--) {
    balls.splice(deadBalls[i], 1);
  }

  // All balls lost
  if (balls.length === 0) {
    lives--;
    if (lives <= 0) {
      state = "gameover";
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("tinyBreakoutHigh", String(highScore));
      }
    } else {
      activeEffects = { wide: 0, slow: 0 };
      paddle.w = PADDLE_W;
      resetBall();
    }
  }

  // Powerup movement and collection
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += POWERUP_SPEED;
    // Collect if touching paddle
    if (p.y + POWERUP_R >= PADDLE_Y &&
        p.y - POWERUP_R <= PADDLE_Y + PADDLE_H &&
        p.x >= paddle.x - paddle.w / 2 &&
        p.x <= paddle.x + paddle.w / 2) {
      applyPowerup(p);
      spawnParticles(p.x, p.y, p.color, 6);
      powerups.splice(i, 1);
      continue;
    }
    // Remove if off screen
    if (p.y > H + POWERUP_R) {
      powerups.splice(i, 1);
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Level clear check
  if (bricks.every(b => !b.alive)) {
    if (level >= 5) {
      state = "win";
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("tinyBreakoutHigh", String(highScore));
      }
    } else {
      nextLevel();
    }
  }
}

// ─── Rendering ──────────────────────────────────────────────────────────────
function draw() {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);

  if (state === "title") {
    drawTitle();
    drawHud();
    return;
  }

  if (state === "gameover") {
    drawGameOver();
    drawHud();
    return;
  }

  if (state === "win") {
    drawWin();
    drawHud();
    return;
  }

  // Bricks
  for (const brick of bricks) {
    if (!brick.alive) continue;
    ctx.fillStyle = brick.color;
    if (brick.hits < brick.maxHits) {
      // Damaged brick — dimmer
      ctx.globalAlpha = 0.5;
    }
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
    ctx.globalAlpha = 1;
    // Brick border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
    // Multi-hit indicator
    if (brick.maxHits > 1 && brick.hits > 0) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(brick.hits), brick.x + brick.w / 2, brick.y + brick.h / 2 + 3);
    }
  }

  // Paddle
  const padLeft = paddle.x - paddle.w / 2;
  ctx.fillStyle = activeEffects.wide > 0 ? "#33ccff" : "#cccccc";
  ctx.fillRect(padLeft, PADDLE_Y, paddle.w, PADDLE_H);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.strokeRect(padLeft, PADDLE_Y, paddle.w, PADDLE_H);

  // Balls
  for (const b of balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = activeEffects.slow > 0 ? "#33ff33" : "#ffffff";
    ctx.fill();
  }

  // Powerups
  for (const p of powerups) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, POWERUP_R, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(p.label, p.x, p.y + 4);
  }

  // Particles
  for (const p of particles) {
    ctx.globalAlpha = p.life / 35;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  ctx.globalAlpha = 1;

  // Paused overlay
  if (state === "paused") {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffcc00";
    ctx.font = "36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", W / 2, H / 2);
    ctx.fillStyle = "#999";
    ctx.font = "16px monospace";
    ctx.fillText("Press P to resume", W / 2, H / 2 + 40);
  }

  drawHud();
}

function drawTitle() {
  ctx.fillStyle = "#ffcc00";
  ctx.font = "48px monospace";
  ctx.textAlign = "center";
  ctx.fillText("TINY BREAKOUT", W / 2, H / 2 - 60);

  ctx.fillStyle = "#cc6600";
  ctx.font = "16px monospace";
  ctx.fillText("Break all the bricks!", W / 2, H / 2 - 20);

  ctx.fillStyle = "#999";
  ctx.font = "14px monospace";
  ctx.fillText("Mouse or Arrow Keys to move paddle", W / 2, H / 2 + 30);
  ctx.fillText("Click or press Enter to start", W / 2, H / 2 + 55);

  if (highScore > 0) {
    ctx.fillStyle = "#666";
    ctx.font = "14px monospace";
    ctx.fillText(`High Score: ${highScore}`, W / 2, H / 2 + 100);
  }

  // Draw some decorative bricks
  const colors = ["#ff3333", "#ff8800", "#ffcc00", "#33cc33"];
  for (let i = 0; i < 8; i++) {
    const bx = 160 + i * 65;
    ctx.fillStyle = colors[i % 4];
    ctx.globalAlpha = 0.4;
    ctx.fillRect(bx, H / 2 + 140, 55, 14);
    ctx.globalAlpha = 1;
  }
}

function drawGameOver() {
  ctx.fillStyle = "#ff3333";
  ctx.font = "48px monospace";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", W / 2, H / 2 - 40);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "20px monospace";
  ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 10);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = "#33ff33";
    ctx.font = "16px monospace";
    ctx.fillText("NEW HIGH SCORE!", W / 2, H / 2 + 40);
  }

  ctx.fillStyle = "#999";
  ctx.font = "14px monospace";
  ctx.fillText("Click or press Enter to continue", W / 2, H / 2 + 80);
}

function drawWin() {
  ctx.fillStyle = "#33ff33";
  ctx.font = "48px monospace";
  ctx.textAlign = "center";
  ctx.fillText("YOU WIN!", W / 2, H / 2 - 40);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "20px monospace";
  ctx.fillText(`Final Score: ${score}`, W / 2, H / 2 + 10);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = "#33ccff";
    ctx.font = "16px monospace";
    ctx.fillText("NEW HIGH SCORE!", W / 2, H / 2 + 40);
  }

  ctx.fillStyle = "#999";
  ctx.font = "14px monospace";
  ctx.fillText("Click or press Enter to continue", W / 2, H / 2 + 80);
}

function drawHud() {
  if (state === "title") {
    hudEl.innerHTML = `<span>TINY BREAKOUT</span><span>High: ${highScore}</span>`;
    controlsEl.textContent = "Mouse / Arrow Keys: Move  |  Enter: Start";
  } else if (state === "playing" || state === "paused") {
    let effectText = "";
    if (activeEffects.wide > 0) effectText += " [WIDE]";
    if (activeEffects.slow > 0) effectText += " [SLOW]";
    hudEl.innerHTML = `<span>Score: ${score}  |  Level: ${level}  |  Lives: ${"*".repeat(lives)}${effectText}</span><span>High: ${highScore}</span>`;
    controlsEl.textContent = "Mouse / Arrow Keys: Move  |  P: Pause";
  } else {
    hudEl.innerHTML = `<span>Score: ${score}</span><span>High: ${highScore}</span>`;
    controlsEl.textContent = "Enter: Continue";
  }
}

// ─── Game Loop ──────────────────────────────────────────────────────────────
setInterval(() => {
  update();
  draw();
}, 1000 / FPS);

// Initial draw
draw();
