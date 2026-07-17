// Slice 10: money economy. Battles pay RM; the shop sells potions and balls.
// The shopkeeper only sells to customers who can work out their change.

const SHOP_ITEMS = [
  { key: "potion", icon: "🧪", zh: "药水", en: "Potion", price: 120, note: "heals 10 HP / 恢复 10 点" },
  { key: "ball",   icon: "⚪", zh: "精灵球", en: "Ball",  price: 80,  note: "catch creatures / 捕捉宝可梦" },
];

let money = 200;
const bag = { potion: 1, ball: 3 };

let shopButtons = [];
let shopNotice = null; // { text, color, at }

function shopSay(text, color) {
  shopNotice = { text, color, at: performance.now() };
}

function leaveShop() {
  scene = "world";
  shopNotice = null;
  for (const k in keys) keys[k] = false;
}

// Buying asks a change question: pay with a big note, work out the change.
function buyItem(item) {
  if (money < item.price) {
    shopSay("Not enough money! 钱不够!", "#c62828");
    return;
  }
  const pays = [Math.ceil((item.price + 1) / 100) * 100, 500].filter((p) => p > item.price);
  const pay = pays[Math.floor(Math.random() * pays.length)];
  const q = {
    id: 0,
    question_zh: `${item.zh}要 RM${item.price}。你付了 RM${pay}。要找回多少钱？`,
    question_en: `The ${item.en.toLowerCase()} costs RM${item.price}. You pay RM${pay}. How much change do you get?`,
    operation: "subtraction",
    expression: `${pay} - ${item.price}`,
    answer: pay - item.price,
  };
  askQuestion(q, (correct) => {
    if (correct) {
      money -= item.price;
      bag[item.key]++;
      shopSay(`You bought a ${item.en.toLowerCase()}! 买到了!`, "#2e7d32");
    } else {
      shopSay("The shopkeeper shakes their head... 再算算!", "#c62828");
    }
  });
}

// --- Input ---
window.addEventListener("click", (e) => {
  if (scene !== "shop" || questionActive()) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  for (const b of shopButtons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      b.action();
      return;
    }
  }
});

window.addEventListener("keydown", (e) => {
  if (scene !== "shop" || questionActive()) return;
  if (e.code === "Escape") {
    leaveShop();
    e.preventDefault();
  }
});

// --- Drawing ---
function drawShop() {
  const W = canvas.width, H = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#ffe0b2");
  sky.addColorStop(1, "#fff8e1");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(60, 36, W - 120, H - 130, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#333";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("商店 · Shop", 92, 90);
  ctx.textAlign = "right";
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = "#2e7d32";
  ctx.fillText(`RM ${fmtNum(money)}`, W - 92, 90);
  ctx.textAlign = "left";

  shopButtons = [];
  SHOP_ITEMS.forEach((item, i) => {
    const y = 130 + i * 100;
    ctx.fillStyle = "#f7f3e8";
    ctx.beginPath();
    ctx.roundRect(88, y, W - 176, 84, 12);
    ctx.fill();
    ctx.font = "38px sans-serif";
    ctx.fillText(item.icon, 104, y + 54);
    ctx.fillStyle = "#333";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(`${item.en} ${item.zh} — RM ${fmtNum(item.price)}`, 160, y + 36);
    ctx.font = "15px sans-serif";
    ctx.fillStyle = "#667";
    ctx.fillText(`${item.note}   ·   you have ${bag[item.key]}`, 160, y + 62);
    shopButtons.push({
      x: W - 216, y: y + 18, w: 110, h: 48,
      label: "Buy", color: "#42a5f5", font: "bold 22px sans-serif",
      action: () => buyItem(item),
    });
  });

  if (shopNotice && performance.now() - shopNotice.at < 3000) {
    ctx.fillStyle = shopNotice.color;
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(shopNotice.text, 92, 372);
  }

  shopButtons.push({
    x: W / 2 - 80, y: H - 76, w: 160, h: 52,
    label: "Leave 离开", color: "#90a4ae", font: "bold 20px sans-serif",
    action: leaveShop,
  });
  shopButtons.forEach(drawQButton);
}

// Wallet + bag panel, shown on the map next to the team HUD.
function drawMoneyHud() {
  const W = canvas.width;
  ctx.fillStyle = "rgba(255, 253, 245, 0.9)";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W - 218, 8, 210, 40, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#333";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText(`RM ${fmtNum(money)}   🧪${bag.potion}  ⚪${bag.ball}`, W - 202, 34);
}
