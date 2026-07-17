// Slice 2: encounter placeholder. Real battle mechanics arrive in Slice 3.
const CREATURES = [
  { name: "Addlepuff", color: "#f48fb1" },
  { name: "Subtractopus", color: "#9575cd" },
  { name: "Countasaur", color: "#4db6ac" },
  { name: "Digitell", color: "#ffb74d" },
];

let ENCOUNTER_RATE = 0.2; // chance per step onto tall grass
let scene = "world";      // world | battle
let battle = null;        // { creature }

function maybeStartEncounter() {
  if (tileAt(player.x, player.y) !== "G") return;
  if (Math.random() < ENCOUNTER_RATE) {
    const creature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    battle = { creature };
    scene = "battle";
  }
}

function endBattle() {
  battle = null;
  scene = "world";
  for (const k in keys) keys[k] = false; // drop any keys held during battle
}

// --- Run button ---
const RUN_BUTTON = { x: 0, y: 0, w: 170, h: 52 }; // x,y set in drawBattle

window.addEventListener("click", (e) => {
  if (scene !== "battle") return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (mx >= RUN_BUTTON.x && mx <= RUN_BUTTON.x + RUN_BUTTON.w &&
      my >= RUN_BUTTON.y && my <= RUN_BUTTON.y + RUN_BUTTON.h) {
    endBattle();
  }
});

window.addEventListener("keydown", (e) => {
  if (scene !== "battle") return;
  if (e.code === "Space" || e.code === "Enter" || e.code === "Escape") {
    endBattle();
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

function drawBattle() {
  const W = canvas.width, H = canvas.height;

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#aee7ff");
  sky.addColorStop(1, "#e8f9d9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // enemy platform
  ctx.fillStyle = "#9ccc65";
  ctx.beginPath();
  ctx.ellipse(W * 0.68, H * 0.5, 130, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  drawCreature(W * 0.68, H * 0.36, battle.creature.color, 55);

  // text box
  const boxY = H - 130;
  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(16, boxY, W - 32, 110, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#333";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`A wild ${battle.creature.name} appeared!`, 40, boxY + 45);

  // run button
  RUN_BUTTON.x = W - 220;
  RUN_BUTTON.y = boxY + 62;
  ctx.fillStyle = "#ff8a65";
  ctx.beginPath();
  ctx.roundRect(RUN_BUTTON.x, RUN_BUTTON.y, RUN_BUTTON.w, RUN_BUTTON.h, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Run away!", RUN_BUTTON.x + RUN_BUTTON.w / 2, RUN_BUTTON.y + 34);
  ctx.textAlign = "left";
}
