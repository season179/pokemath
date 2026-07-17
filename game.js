const TILE = 48;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = MAP[0].length * TILE;
canvas.height = MAP.length * TILE;

// --- Player ---
// x,y are grid coordinates; px,py are pixel positions for smooth walking.
const player = {
  x: 2, y: 3,
  px: 2 * TILE, py: 3 * TILE,
  dir: "down",     // down | up | left | right
  moving: false,
  speed: 4,        // pixels per frame
};

// --- Input ---
const keys = {};
const KEY_DIRS = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
};
let bufferedDir = null; // remembers a tap that lands mid-step so it isn't lost
window.addEventListener("keydown", (e) => {
  if (KEY_DIRS[e.code]) {
    keys[KEY_DIRS[e.code]] = true;
    bufferedDir = KEY_DIRS[e.code];
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  if (KEY_DIRS[e.code]) keys[KEY_DIRS[e.code]] = false;
});

const DIR_DELTA = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

function heldDirection() {
  for (const dir of ["up", "down", "left", "right"]) {
    if (keys[dir]) return dir;
  }
  return null;
}

function update() {
  if (!player.moving) {
    const dir = heldDirection() || bufferedDir;
    bufferedDir = null;
    if (dir) {
      player.dir = dir;
      const [dx, dy] = DIR_DELTA[dir];
      if (isWalkable(player.x + dx, player.y + dy)) {
        player.x += dx;
        player.y += dy;
        player.moving = true;
      }
    }
  }

  if (player.moving) {
    const tx = player.x * TILE;
    const ty = player.y * TILE;
    player.px += Math.sign(tx - player.px) * Math.min(player.speed, Math.abs(tx - player.px));
    player.py += Math.sign(ty - player.py) * Math.min(player.speed, Math.abs(ty - player.py));
    if (player.px === tx && player.py === ty) {
      player.moving = false;
      maybeStartEncounter();
    }
  }
}

// --- Drawing ---
function drawTile(type, x, y) {
  const px = x * TILE, py = y * TILE;

  // grass base under everything
  ctx.fillStyle = (x + y) % 2 === 0 ? "#7ec850" : "#77c04a";
  ctx.fillRect(px, py, TILE, TILE);

  if (type === "p") {
    ctx.fillStyle = "#e0c084";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#d4b070";
    ctx.fillRect(px + 6, py + 6, 8, 8);
    ctx.fillRect(px + 30, py + 26, 8, 8);
  } else if (type === "G") {
    ctx.fillStyle = "#4ea23a";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#3d8a2e";
    for (let i = 0; i < 3; i++) {
      const gx = px + 6 + i * 14;
      ctx.beginPath();
      ctx.moveTo(gx, py + 40);
      ctx.lineTo(gx + 5, py + 14);
      ctx.lineTo(gx + 10, py + 40);
      ctx.fill();
    }
  } else if (type === "T") {
    // trunk
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(px + 18, py + 26, 12, 18);
    // leaves
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.arc(px + 24, py + 18, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#388e3c";
    ctx.beginPath();
    ctx.arc(px + 16, py + 24, 11, 0, Math.PI * 2);
    ctx.arc(px + 32, py + 24, 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const { px, py, dir } = player;
  const cx = px + TILE / 2;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, py + TILE - 6, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = "#ff6f61";
  ctx.beginPath();
  ctx.roundRect(cx - 10, py + 18, 20, 20, 6);
  ctx.fill();

  // head
  ctx.fillStyle = "#ffd9b3";
  ctx.beginPath();
  ctx.arc(cx, py + 14, 10, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = "#6b4226";
  ctx.beginPath();
  ctx.arc(cx, py + 11, 10, Math.PI, 2 * Math.PI);
  ctx.fill();

  // eyes (skip when facing away)
  if (dir !== "up") {
    ctx.fillStyle = "#333";
    const offset = dir === "left" ? -4 : dir === "right" ? 4 : 0;
    if (dir === "down" || dir === "left") {
      ctx.beginPath();
      ctx.arc(cx - 4 + offset, py + 14, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (dir === "down" || dir === "right") {
      ctx.beginPath();
      ctx.arc(cx + 4 + offset, py + 14, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function draw() {
  for (let y = 0; y < MAP.length; y++) {
    for (let x = 0; x < MAP[0].length; x++) {
      drawTile(MAP[y][x], x, y);
    }
  }
  drawPlayer();
  drawTeamHud();
}

function loop() {
  if (scene === "world") {
    update();
    draw();
  } else if (scene === "battle") {
    drawBattle();
  }
  requestAnimationFrame(loop);
}
loop();
