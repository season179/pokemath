// Question engine: the monster asks a bilingual word problem and the answer
// options are the attack moves — right answer hits, wrong answer does nothing.
// Two renderers share the state: a full-screen card (questions.html tester)
// and an in-battle speech bubble (drawQuestionBubble, called by battle.js).

let question = null; // { q, step, stepIndex, stepCount, choices, phase, picked, correct, showFeedback, onDone, buttons }
let lastQuestionId = null;

function questionActive() {
  return question !== null;
}

// Pick a random question, optionally filtered (e.g. by operation), avoiding
// an immediate repeat when possible.
function pickQuestion(pred) {
  let pool = QUESTION_BANK.questions.filter(pred || (() => true));
  if (pool.length > 1) pool = pool.filter((q) => q.id !== lastQuestionId);
  const q = pool[Math.floor(Math.random() * pool.length)];
  lastQuestionId = q.id;
  return q;
}

// A "turn" is one answer round. Plain questions are one turn; questions with
// `steps` become one turn per step so kids solve big problems piece by piece.
function questionTurns(q) {
  if (!q.steps) return [{ q, step: null, stepIndex: 0, stepCount: 1 }];
  return q.steps.map((s, i) => ({ q, step: s, stepIndex: i, stepCount: q.steps.length }));
}

function turnAnswer() {
  return question.step ? question.step.answer : question.q.answer;
}

function turnExpression() {
  return question.step ? question.step.expression : question.q.expression;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// One right answer + three near-miss distractors, scaled to the answer's
// size so the options can only be told apart by doing the math.
function makeChoices(answer) {
  const step = Math.pow(10, Math.max(1, String(answer).length - 2));
  const pool = shuffle(
    [1, -1, 2, -2, 3, -3, 5, -5].map((k) => answer + k * step).filter((v) => v > 0)
  );
  return shuffle([answer, ...pool.slice(0, 3)]);
}

// Accepts a turn from questionTurns(), or a plain question for convenience.
// opts.feedback: false skips the built-in feedback screen and reports the
// result immediately (battle shows the working in its own message box).
function askQuestion(spec, onDone, opts = {}) {
  const turn = spec.q ? spec : questionTurns(spec)[0];
  question = {
    ...turn,
    choices: makeChoices(turn.step ? turn.step.answer : turn.q.answer),
    phase: "input",
    picked: null,
    correct: false,
    showFeedback: opts.feedback !== false,
    onDone,
    buttons: [],
  };
}

function chooseAnswer(value) {
  question.picked = value;
  question.correct = value === turnAnswer();
  if (question.showFeedback) question.phase = "feedback";
  else finishQuestion();
}

function finishQuestion() {
  const { onDone, correct } = question;
  question = null;
  onDone(correct);
}

// --- Input ---
window.addEventListener("keydown", (e) => {
  if (!question) return;
  if (question.phase === "input") {
    const m = e.code.match(/^(?:Digit|Numpad)([1-4])$/);
    if (!m || Number(m[1]) > question.choices.length) return;
    chooseAnswer(question.choices[Number(m[1]) - 1]);
  } else {
    if (e.code !== "Enter" && e.code !== "Space") return;
    finishQuestion();
  }
  e.preventDefault();
  e.stopImmediatePropagation(); // the question owns the keyboard while open
}, true);

window.addEventListener("click", (e) => {
  if (!question) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  for (const b of question.buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      b.action();
      break;
    }
  }
  e.stopImmediatePropagation(); // clicks never reach whatever is underneath
}, true);

// --- Helpers ---
function fmtNum(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Wraps mixed Chinese/English text: CJK breaks per character, Latin per word,
// "RM55 000" style amounts stay on one line.
function wrapText(text, maxWidth) {
  const tokens = text.match(/RM[\d,]+(?: \d{3})*|[⺀-鿿＀-￯　-〿]|[^\s⺀-鿿＀-￯　-〿]+?(?=RM[\d,]|[\s⺀-鿿＀-￯　-〿]|$)|\s+/g) || [];
  const lines = [];
  let line = "";
  for (const t of tokens) {
    if (ctx.measureText(line + t).width <= maxWidth) {
      line += t;
    } else {
      if (line.trim()) lines.push(line.trimEnd());
      line = t.trimStart();
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

function drawTextBlock(text, x, y, maxWidth, lineHeight) {
  const lines = wrapText(text, maxWidth);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function drawQButton(b) {
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = b.font || "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 8);
  ctx.textAlign = "left";
}

// --- Renderer 1: full-screen card (tester page) ---
function drawQuestionCard() {
  if (!question) return;
  const W = canvas.width, H = canvas.height;
  const q = question.q;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#aee7ff");
  sky.addColorStop(1, "#e8f9d9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(16, 16, W - 32, 296, 14);
  ctx.fill();
  ctx.stroke();

  // On step turns the original problem is compact context; the step is the star.
  const step = question.step;
  ctx.fillStyle = "#333";
  ctx.font = step ? "bold 18px sans-serif" : "bold 22px sans-serif";
  let y = drawTextBlock(q.question_zh, 40, 50, W - 80, step ? 24 : 30);
  ctx.fillStyle = "#667";
  ctx.font = step ? "14px sans-serif" : "17px sans-serif";
  y = drawTextBlock(q.question_en, 40, y + 12, W - 80, step ? 19 : 24);
  if (q.table) {
    ctx.fillStyle = "#333";
    ctx.font = "bold 18px sans-serif";
    const row = Object.entries(q.table)
      .map(([k, v]) => `${k}: RM${fmtNum(v)}`)
      .join("      ");
    ctx.fillText(row, 40, y + 16);
    y += 22;
  }
  if (step) {
    ctx.fillStyle = "#1565c0";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`第 ${question.stepIndex + 1}/${question.stepCount} 步 · Step ${question.stepIndex + 1} of ${question.stepCount}`, 40, y + 24);
    ctx.font = "bold 22px sans-serif";
    y = drawTextBlock(step.prompt_zh, 40, y + 52, W - 80, 28);
    ctx.font = "16px sans-serif";
    drawTextBlock(step.prompt_en, 40, y + 6, W - 80, 21);
  }

  question.buttons = [];
  if (question.phase === "input") {
    question.choices.forEach((v, i) => {
      question.buttons.push({
        x: 40 + (i % 2) * 356, y: 340 + Math.floor(i / 2) * 72, w: 340, h: 58,
        label: `${i + 1}.   RM ${fmtNum(v)}`,
        color: "#546e7a",
        font: "bold 22px sans-serif",
        action: () => chooseAnswer(v),
      });
    });
    question.buttons.forEach(drawQButton);
    ctx.fillStyle = "#667";
    ctx.font = "16px sans-serif";
    ctx.fillText("Pick the right answer / 选出正确答案 (1-4)", 40, 512);
  } else {
    drawFeedback();
  }
}

function drawFeedback() {
  const W = canvas.width;
  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = question.correct ? "#2e7d32" : "#c62828";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(40, 330, W - 80, 230, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = question.correct ? "#2e7d32" : "#c62828";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(question.correct ? "✓ Correct! 答对了!" : "✗ Not quite... 再想想", 70, 382);

  ctx.fillStyle = "#333";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(`${turnExpression()} = ${fmtNum(turnAnswer())}`, 70, 432);

  if (!question.correct) {
    ctx.fillStyle = "#667";
    ctx.font = "20px sans-serif";
    ctx.fillText(`You picked RM ${fmtNum(question.picked)}`, 70, 470);
  }

  question.buttons = [
    { x: W - 230, y: 490, w: 160, h: 52, label: "Next ▶", color: "#42a5f5", action: finishQuestion },
  ];
  question.buttons.forEach(drawQButton);
}

// --- Renderer 2: in-battle speech bubble (the monster asks the question) ---
// Draws over the battle scene; the answer options go inside the battle text
// box whose top edge is `boxY`. battle.js calls this during its question phase.
function drawQuestionBubble(boxY) {
  if (!question) return;
  const q = question.q, step = question.step;
  // top-right, above the wild creature and clear of both HP panels and the pet
  const bx = 290, bw = 462, maxW = bw - 48;

  // measure content first so the bubble hugs it, bottom-anchored above the box
  ctx.font = "bold 17px sans-serif";
  const zhLines = wrapText(q.question_zh, maxW);
  ctx.font = "13px sans-serif";
  const enLines = wrapText(q.question_en, maxW);
  let h = 30 + zhLines.length * 23 + 8 + enLines.length * 18 + 14;
  if (q.table) h += 24;
  let stepZh = [], stepEn = [];
  if (step) {
    ctx.font = "bold 19px sans-serif";
    stepZh = wrapText(step.prompt_zh, maxW);
    ctx.font = "14px sans-serif";
    stepEn = wrapText(step.prompt_en, maxW);
    h += 20 + stepZh.length * 25 + 6 + stepEn.length * 19;
  }
  const by = 16;

  // tail first, pointing down at the wild creature; the bubble covers the joint
  const tailX = canvas.width * 0.68;
  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(tailX - 28, by + h - 6);
  ctx.lineTo(tailX, by + h + 36);
  ctx.lineTo(tailX + 28, by + h - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, h, 16);
  ctx.fill();
  ctx.stroke();

  let y = by + 30;
  ctx.fillStyle = "#333";
  ctx.font = "bold 17px sans-serif";
  zhLines.forEach((l) => { ctx.fillText(l, bx + 24, y); y += 23; });
  y += 8;
  ctx.fillStyle = "#667";
  ctx.font = "13px sans-serif";
  enLines.forEach((l) => { ctx.fillText(l, bx + 24, y); y += 18; });
  if (q.table) {
    ctx.fillStyle = "#333";
    ctx.font = "bold 15px sans-serif";
    const row = Object.entries(q.table)
      .map(([k, v]) => `${k}: RM${fmtNum(v)}`)
      .join("      ");
    ctx.fillText(row, bx + 24, y + 12);
    y += 24;
  }
  if (step) {
    ctx.fillStyle = "#1565c0";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`第 ${question.stepIndex + 1}/${question.stepCount} 步 · Step ${question.stepIndex + 1} of ${question.stepCount}`, bx + 24, y + 14);
    y += 20;
    ctx.font = "bold 19px sans-serif";
    stepZh.forEach((l) => { ctx.fillText(l, bx + 24, y + 14); y += 25; });
    y += 6;
    ctx.font = "14px sans-serif";
    stepEn.forEach((l) => { ctx.fillText(l, bx + 24, y + 10); y += 19; });
  }

  // answer options = attack moves, inside the battle text box
  question.buttons = question.choices.map((v, i) => ({
    x: 32 + (i % 2) * 360, y: boxY + 10 + Math.floor(i / 2) * 50, w: 348, h: 42,
    label: `${i + 1}.   RM ${fmtNum(v)}`,
    color: "#546e7a",
    font: "bold 20px sans-serif",
    action: () => chooseAnswer(v),
  }));
  question.buttons.forEach(drawQButton);
}
