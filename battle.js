// Slice 5: team battles — choose who fights, switch mid-battle, forced switch on faint.
const CREATURES = [
  { name: "Addlepuff",    color: "#f48fb1", maxHp: 15, attack: 3 },
  { name: "Subtractopus", color: "#9575cd", maxHp: 17, attack: 4 },
  { name: "Countasaur",   color: "#4db6ac", maxHp: 16, attack: 3 },
  { name: "Digitell",     color: "#ffb74d", maxHp: 14, attack: 4 },
];

const STARTER = { name: "Multiplybara", color: "#81c784", maxHp: 22, attack: 5 };
const team = [{ ...STARTER, hp: STARTER.maxHp, level: 1, xp: 0 }];
let active = team[0];

const XP_PER_LEVEL = 20;

const PLAYER_SPAWN = { x: 2, y: 3 };

let ENCOUNTER_RATE = 0.2; // chance per step onto tall grass
let scene = "world";      // world | battle
let battle = null;        // { wild, phase: msg | menu | switch, msgs, onMsgsDone, buttons, switchForced }

function maybeStartEncounter() {
  if (tileAt(player.x, player.y) !== "G") return;
  if (Math.random() >= ENCOUNTER_RATE) return;
  const c = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  battle = { wild: { ...c, hp: c.maxHp, level: 1 }, phase: "msg", msgs: [], buttons: [], switchForced: false };
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

function benchedFighters() {
  return team.filter((c) => c !== active && c.hp > 0);
}

// --- Turn flow ---
function rollDamage(attacker) {
  return attacker.attack + Math.floor(Math.random() * 3);
}

function playerAttack() {
  const dmg = rollDamage(active);
  battle.wild.hp = Math.max(0, battle.wild.hp - dmg);
  say([`${active.name} attacks! ${dmg} damage!`], () => {
    if (battle.wild.hp === 0) {
      say([`${battle.wild.name} fainted.`, "You won! Hooray!"], giveXp);
    } else {
      wildAttack();
    }
  });
}

function wildAttack() {
  const dmg = rollDamage(battle.wild);
  active.hp = Math.max(0, active.hp - dmg);
  say([`${battle.wild.name} attacks back! ${dmg} damage!`], () => {
    if (active.hp > 0) {
      battle.phase = "menu";
    } else if (benchedFighters().length > 0) {
      say([`${active.name} fainted...`], () => beginSwitch(true));
    } else {
      say([`${active.name} fainted...`, "All your friends are tired!", "You hurry home to rest."], respawnHome);
    }
  });
}

// Winning gives the fighter XP; every XP_PER_LEVEL points is a level: +3 HP, +1 attack.
function giveXp() {
  const gain = battle.wild.maxHp; // bigger creatures teach more
  active.xp += gain;
  const msgs = [`${active.name} got ${gain} XP!`];
  while (active.xp >= XP_PER_LEVEL) {
    active.xp -= XP_PER_LEVEL;
    active.level++;
    active.maxHp += 3;
    active.attack += 1;
    active.hp = active.maxHp;
    msgs.push(`${active.name} grew to level ${active.level}!`);
  }
  say(msgs, endBattle);
}

function beginSwitch(forced) {
  battle.phase = "switch";
  battle.switchForced = forced;
}

function switchTo(c) {
  const forced = battle.switchForced;
  battle.switchForced = false;
  active = c;
  say([`Go, ${c.name}!`], () => {
    if (forced) battle.phase = "menu"; // wild already had its turn this round
    else wildAttack();                 // a chosen switch costs your turn
  });
}

function throwBall() {
  const wild = battle.wild;
  // The weaker the wild creature, the easier the catch: 30% at full HP, ~90% near zero.
  const chance = 0.3 + 0.6 * (1 - wild.hp / wild.maxHp);
  say([`You throw a ball at ${wild.name}...`], () => {
    if (Math.random() < chance) {
      team.push({ ...wild, hp: wild.maxHp, xp: 0 });
      say([`Gotcha! ${wild.name} joined your team!`], endBattle);
    } else {
      say([`Oh no! ${wild.name} broke free!`], wildAttack);
    }
  });
}

function runAway() {
  say(["Got away safely!"], endBattle);
}

function respawnHome() {
  player.x = PLAYER_SPAWN.x;
  player.y = PLAYER_SPAWN.y;
  player.px = player.x * TILE;
  player.py = player.y * TILE;
  player.dir = "down";
  endBattle();
}

function endBattle() {
  team.forEach((c) => { c.hp = c.maxHp; }); // no potions yet, so heal after every battle
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
  } else if (e.code === "KeyC" && battle.phase === "menu") {
    throwBall();
    e.preventDefault();
  } else if (e.code === "Escape") {
    if (battle.phase === "menu") runAway();
    else if (battle.phase === "switch" && !battle.switchForced) battle.phase = "menu";
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
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Lv.${creature.level}`, x + 236, y + 26);
  ctx.textAlign = "left";

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

  // XP progress (team creatures only — wild ones don't earn XP)
  if (creature.xp !== undefined) {
    ctx.fillStyle = "#eee";
    ctx.beginPath();
    ctx.roundRect(x + 14, y + 56, 160, 6, 3);
    ctx.fill();
    if (creature.xp > 0) {
      ctx.fillStyle = "#42a5f5";
      ctx.beginPath();
      ctx.roundRect(x + 14, y + 56, 160 * Math.min(1, creature.xp / XP_PER_LEVEL), 6, 3);
      ctx.fill();
    }
  }
}

function drawButton(b) {
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + 33);
  ctx.textAlign = "left";
}

// Small always-visible team panel in the world scene.
function drawTeamHud() {
  const w = 20 + team.length * 40;
  ctx.fillStyle = "rgba(255, 253, 245, 0.9)";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(8, 8, w, 66, 12);
  ctx.fill();
  ctx.stroke();
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  team.forEach((c, i) => {
    drawCreature(30 + i * 40, 36, c.color, 13);
    ctx.fillStyle = "#333";
    ctx.fillText(`Lv.${c.level}`, 30 + i * 40, 66);
  });
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
  drawCreature(W * 0.25, H * 0.575, active.color, 70);
  drawHpPanel(W - 274, H * 0.60, active);

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
    ctx.fillText(`What will ${active.name} do?`, 40, boxY + 45);
    battle.buttons = [
      { x: W - 476, y: boxY + 48, w: 140, h: 52, label: "Attack", color: "#42a5f5", action: playerAttack },
      { x: W - 324, y: boxY + 48, w: 140, h: 52, label: "Catch",  color: "#ab47bc", action: throwBall },
      { x: W - 172, y: boxY + 48, w: 140, h: 52, label: "Run",    color: "#ff8a65", action: runAway },
    ];
    if (benchedFighters().length > 0) {
      battle.buttons.unshift(
        { x: W - 628, y: boxY + 48, w: 140, h: 52, label: "Switch", color: "#8d6e63", action: () => beginSwitch(false) }
      );
    }
    battle.buttons.forEach(drawButton);
  } else if (battle.phase === "switch") {
    ctx.fillText("Who will fight?", 40, boxY + 45);
    battle.buttons = benchedFighters().map((c, i) => ({
      x: 40 + i * 175, y: boxY + 48, w: 165, h: 52,
      label: c.name.length > 12 ? c.name.slice(0, 11) + "…" : c.name,
      color: c.color,
      action: () => switchTo(c),
    }));
    if (!battle.switchForced) {
      battle.buttons.push(
        { x: W - 150, y: boxY + 48, w: 118, h: 52, label: "Back", color: "#90a4ae", action: () => { battle.phase = "menu"; } }
      );
    }
    battle.buttons.forEach(drawButton);
  }
}
