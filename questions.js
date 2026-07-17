// Slice 7: question engine — renders a bilingual word problem with a number
// pad, checks the typed answer, and shows the working as feedback.
// Standalone: depends only on `canvas`/`ctx` globals and questions-data.js.

let question = null; // { q, entry, phase: input | feedback, correct, onDone, buttons }
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

// Accepts a turn from questionTurns(), or a plain question for convenience.
function askQuestion(spec, onDone) {
  const turn = spec.q ? spec : questionTurns(spec)[0];
  question = { ...turn, entry: "", phase: "input", correct: false, onDone, buttons: [] };
}

function turnAnswer() {
  return question.step ? question.step.answer : question.q.answer;
}

function turnExpression() {
  return question.step ? question.step.expression : question.q.expression;
}

function submitAnswer() {
  if (question.entry === "") return;
  question.correct = Number(question.entry) === turnAnswer();
  question.phase = "feedback";
}

function finishQuestion() {
  const { onDone, correct } = question;
  question = null;
  onDone(correct);
}

function typeDigit(d) {
  if (question.entry.length >= 7) return;
  question.entry = (question.entry + d).replace(/^0+(?=\d)/, "");
}

// --- Input ---
window.addEventListener("keydown", (e) => {
  if (!question) return;
  if (question.phase === "input") {
    const digit = e.code.match(/^(?:Digit|Numpad)(\d)$/);
    if (digit) typeDigit(digit[1]);
    else if (e.code === "Backspace") question.entry = question.entry.slice(0, -1);
    else if (e.code === "Enter" || e.code === "NumpadEnter") submitAnswer();
    else return;
  } else {
    if (e.code === "Enter" || e.code === "Space") finishQuestion();
    else return;
  }
  e.preventDefault();
  e.stopImmediatePropagation(); // the overlay owns the keyboard while open
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

// Wraps mixed Chinese/English text: CJK breaks per character, Latin per word.
function wrapText(text, maxWidth) {
  // "RM55 000" style amounts stay on one line; CJK breaks per character.
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
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 9);
  ctx.textAlign = "left";
}

// --- Drawing ---
function drawQuestion() {
  if (!question) return;
  const W = canvas.width, H = canvas.height;
  const q = question.q;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#aee7ff");
  sky.addColorStop(1, "#e8f9d9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // question card
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
    drawAnswerBox();
    drawKeypad();
  } else {
    drawFeedback();
  }
}

function drawAnswerBox() {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#3b4a6b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(40, 340, 350, 64, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#333";
  ctx.font = "bold 30px sans-serif";
  const text = `RM ${fmtNum(question.entry || "")}`;
  ctx.fillText(text, 58, 383);
  if (Math.floor(performance.now() / 500) % 2 === 0) {
    const w = ctx.measureText(text).width;
    ctx.fillRect(62 + w, 352, 3, 40);
  }
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#667";
  ctx.fillText("Type your answer / 输入答案", 40, 436);
}

function drawKeypad() {
  const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "⌫", "0", "OK"];
  KEYS.forEach((k, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    question.buttons.push({
      x: 420 + col * 112, y: 330 + row * 58, w: 104, h: 50,
      label: k,
      color: k === "OK" ? "#66bb6a" : k === "⌫" ? "#ff8a65" : "#546e7a",
      action: k === "OK" ? submitAnswer
            : k === "⌫" ? () => { question.entry = question.entry.slice(0, -1); }
            : () => typeDigit(k),
    });
  });
  question.buttons.forEach(drawQButton);
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
    ctx.fillText(`You answered RM ${fmtNum(question.entry)}`, 70, 470);
  }

  question.buttons = [
    { x: W - 230, y: 490, w: 160, h: 52, label: "Next ▶", color: "#42a5f5", action: finishQuestion },
  ];
  question.buttons.forEach(drawQButton);
}
