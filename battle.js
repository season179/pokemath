// Slice 3: turn-based 1v1 battle with HP bars, win/lose, and respawn on faint.
const CREATURES = [
  { name: "Addlepuff",    color: "#f48fb1", maxHp: 15, attack: 3 },
  { name: "Subtractopus", color: "#9575cd", maxHp: 17, attack: 4 },
  { name: "Countasaur",   color: "#4db6ac", maxHp: 16, attack: 3 },
  { name: "Digitell",     color: "#ffb74d", maxHp: 14, attack: 4 },
];

// The player's buddy. A real team arrives in Slice 5.
const STARTER = { name: "Multiplybara", color: "#81c784", maxHp: 22, attack: 5 };
const myCreature = { ...STARTER, hp: STARTER.maxHp };

const PLAYER_SPAWN = { x: 2, y: 3 };

let ENCOUNTER_RATE = 0.2; // chance per step onto tall grass
let scene = "world";      // world | battle
let battle = null;        // { wild, phase: msg | menu, msgs, onMsgsDone, buttons }

function maybeStartEncounter() {
  if (tileAt(player.x, player.y) !== "G") return;
  if (Math.random() >= ENCOUNTER_RATE) return;
  const c = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  battle = { wild: { ...c, hp: c.maxHp }, phase: "msg", msgs: [], buttons: [] };
  scene = "battle";
  say([`A wild ${c.name} appeared!`], () => { battle.phase = "menu"; });
}

// Show messages one at a time (click/Space to continue), then run `then`.
function say(msgs, then) {
  battle.phase = "msg";
  battle.msgs = msgs;
  battle.onMsgsDone = then;
}

function advanceMsg() {
  battle.msgs.shift();
  if (battle.msgs.length === 0) battle.onMsgsDone();
}

// --- Turn flow ---
function rollDamage(attacker) {
  return attacker.attack + Math.floor(Math.random() * 3);
}

function playerAttack() {
  const dmg = rollDamage(myCreature);
  battle.wild.hp = Math.max(0, battle.wild.hp - dmg);
  say([`${myCreature.name} attacks! ${dmg} damage!`], () => {
    if (battle.wild.hp === 0) {
      say([`${battle.wild.name} fainted.`, "You won! Hooray!"], endBattle);
    } else {
      wildAttack();
    }
  });
}

function wildAttack() {
  const dmg = rollDamage(battle.wild);
  myCreature.hp = Math.max(0, myCreature.hp - dmg);
  say([`${battle.wild.name} attacks back! ${dmg} damage!`], () => {
    if (myCreature.hp === 0) {
      say([`${myCreature.name} fainted...`, "You hurry home to rest."], () => {
        player.x = PLAYER_SPAWN.x;
        player.y = PLAYER_SPAWN.y;
        player.px = player.x * TILE;
        player.py = player.y * TILE;
        player.dir = "down";
        endBattle();
      });
    } else {
      battle.phase = "menu";
    }
  });
}

function runAway() {
  say(["Got away safely!"], endBattle);
}

function endBattle() {
  myCreature.hp = myCreature.maxHp; // no potions yet, so heal after every battle
  battle = null;
  scene = "world";
  for (const k in keys) keys[k] = false; // drop any keys held during battle
}

// --- Input ---
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

window.addEventListener("click", (e) => {
  if (scene !== "battle" || !battle) return;
  if (battle.phase === "msg") { advanceMsg(); return; }
  if (battle.phase !== "menu") return;
  const p = canvasPoint(e);
  for (const b of battle.buttons) {
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      b.action();
      return;
    }
  }
});

window.addEventListener("keydown", (e) => {
  if (scene !== "battle" || !battle) return;
  if (e.code === "Space" || e.code === "Enter") {
    if (battle.phase === "msg") advanceMsg();
    else if (battle.phase === "menu") playerAttack();
    e.preventDefault();
  } else if (e.code === "Escape" && battle.phase === "menu") {
    runAway();
    e.preventDefault();
  }
});

// --- Drawing ---
function drawCreature(cx, cy, color, size) {
  // body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();
  // ears
  ctx.beginPath();
  ctx.arc(cx - size * 0.6, cy - size * 0.8, size * 0.35, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.6, cy - size * 0.8, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx - size * 0.35, cy - size * 0.15, size * 0.22, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.35, cy - size * 0.15, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(cx - size * 0.35, cy - size * 0.12, size * 0.1, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.35, cy - size * 0.12, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  // smile
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.25, size * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawHpPanel(x, y, creature) {
  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, 250, 68, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#333";
  ctx.font = "bold 19px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(creature.name, x + 14, y + 26);

  const frac = creature.hp / creature.maxHp;
  ctx.fillStyle = "#ddd";
  ctx.beginPath();
  ctx.roundRect(x + 14, y + 36, 160, 14, 7);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = frac > 0.5 ? "#66bb6a" : frac > 0.25 ? "#ffa726" : "#ef5350";
    ctx.beginPath();
    ctx.roundRect(x + 14, y + 36, 160 * frac, 14, 7);
    ctx.fill();
  }
  ctx.font = "bold 17px sans-serif";
  ctx.fillStyle = "#333";
  ctx.fillText(`${creature.hp}/${creature.maxHp}`, x + 184, y + 49);
}

function drawButton(b) {
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + 34);
  ctx.textAlign = "left";
}

function drawBattle() {
  const W = canvas.width, H = canvas.height;

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#aee7ff");
  sky.addColorStop(1, "#e8f9d9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // wild creature (top right) + its HP panel (top left)
  ctx.fillStyle = "#9ccc65";
  ctx.beginPath();
  ctx.ellipse(W * 0.68, H * 0.5, 130, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCreature(W * 0.68, H * 0.36, battle.wild.color, 55);
  drawHpPanel(24, 24, battle.wild);

  // my creature (bottom left) + its HP panel (bottom right)
  ctx.fillStyle = "#8bc34a";
  ctx.beginPath();
  ctx.ellipse(W * 0.25, H * 0.72, 150, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCreature(W * 0.25, H * 0.575, myCreature.color, 70);
  drawHpPanel(W - 274, H * 0.60, myCreature);

  // text box
  const boxY = H - 130;
  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(16, boxY, W - 32, 110, 14);
  ctx.fill();
  ctx.stroke();

  battle.buttons = [];
  ctx.fillStyle = "#333";
  ctx.font = "bold 26px sans-serif";
  if (battle.phase === "msg") {
    ctx.fillText(battle.msgs[0], 40, boxY + 55);
    // blinking "continue" arrow
    if (Math.floor(performance.now() / 400) % 2 === 0) {
      ctx.fillText("▼", W - 60, boxY + 90);
    }
  } else if (battle.phase === "menu") {
    ctx.fillText(`What will ${myCreature.name} do?`, 40, boxY + 45);
    battle.buttons = [
      { x: W - 344, y: boxY + 48, w: 150, h: 52, label: "Attack",  color: "#42a5f5", action: playerAttack },
      { x: W - 182, y: boxY + 48, w: 150, h: 52, label: "Run",     color: "#ff8a65", action: runAway },
    ];
    battle.buttons.forEach(drawButton);
  }
}
