// Shared Cocos renderer/controller for one QuestionRound. Battle and shop
// both use it; the pure answer logic remains in shared/question-engine.ts.
// Form-aware labels, hints, keyboard mapping, and feedback live in
// shared/question-objective.ts (#11): pointer taps and digit keys both land
// on choose(index), so the Cocos layer stays a thin renderer.

import { Color, KeyCode, Label, Node } from "cc";
import {
  QuestionRound,
  formatAnswer,
  formatObjectiveChoice,
  objectiveHint,
  objectiveKeyIndex,
} from "../../shared/index";
import { PALETTE, makeButton, makeLabel, makePanel, makeWrappedLabel } from "../ui";

export class QuestionView {
  readonly root = new Node("question");

  constructor(
    parent: Node,
    readonly round: QuestionRound,
    private onAnswer: (picked: number, correct: boolean) => void,
  ) {
    parent.addChild(this.root);
    this.build();
  }

  choose(index: number): void {
    const picked = this.round.choices[index];
    if (picked === undefined) return;
    this.onAnswer(picked, this.round.judge(picked));
  }

  handleKey(key: KeyCode): boolean {
    const keys: Array<[KeyCode, KeyCode, string]> = [
      [KeyCode.DIGIT_1, KeyCode.NUM_1, "1"],
      [KeyCode.DIGIT_2, KeyCode.NUM_2, "2"],
      [KeyCode.DIGIT_3, KeyCode.NUM_3, "3"],
      [KeyCode.DIGIT_4, KeyCode.NUM_4, "4"],
    ];
    const hit = keys.find(([top, pad]) => key === top || key === pad);
    if (!hit) return false;
    const index = objectiveKeyIndex(hit[2]);
    if (index < 0 || index >= this.round.choices.length) return false;
    this.choose(index);
    return true;
  }

  private build(): void {
    const turn = this.round.turn;
    const q = turn.question;
    const card = makePanel(this.root, 0, 92, 820, 330, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 16,
      lineWidth: 5,
    });

    // Keep the text boxes inside the card: half-height is 165, so a box's
    // center + half its height must stay under ~145 (20px padding).
    const contextH = turn.step ? 84 : 125;
    makeWrappedLabel(card, q.question_zh, 0, turn.step ? 112 : 80, 760, contextH, {
      fontSize: turn.step ? 17 : 22,
      lineHeight: turn.step ? 22 : 28,
    });
    makeWrappedLabel(card, q.question_en, 0, turn.step ? 48 : -17, 760, contextH, {
      fontSize: turn.step ? 13 : 17,
      color: PALETTE.sub,
      lineHeight: turn.step ? 17 : 22,
    });

    if (q.table) {
      const row = Object.entries(q.table)
        .map(([k, v]) => `${k}: ${formatAnswer(v, q.answer_unit)}`)
        .join("        ");
      const table = makeLabel(card, row, 0, -40, { fontSize: 16 });
      table.horizontalAlign = Label.HorizontalAlign.CENTER;
    }

    if (turn.step) {
      const stepY = q.table ? -78 : -62;
      makeLabel(card, `第 ${turn.stepIndex + 1}/${turn.stepCount} 步 · Step ${turn.stepIndex + 1} of ${turn.stepCount}`, -350, stepY, {
        fontSize: 14,
        color: new Color(21, 101, 192, 255),
      });
      makeWrappedLabel(card, turn.step.prompt_zh, 0, stepY - 34, 760, 48, {
        fontSize: 20,
        color: new Color(21, 101, 192, 255),
      });
      makeWrappedLabel(card, turn.step.prompt_en, 0, stepY - 72, 760, 34, {
        fontSize: 14,
        color: PALETTE.sub,
      });
    }

    const positions: Array<[number, number]> = [
      [-205, -126],
      [205, -126],
      [-205, -206],
      [205, -206],
    ];
    this.round.choices.forEach((v, i) => {
      const [x, y] = positions[i];
      makeButton(this.root, {
        x,
        y,
        w: 390,
        h: 62,
        label: formatObjectiveChoice(q, v),
        color: new Color(84, 110, 122, 255),
        fontSize: 21,
        onTap: () => this.choose(i),
      });
    });

    const hint = makeLabel(this.root, objectiveHint(q), 0, -260, {
      fontSize: 15,
      color: PALETTE.sub,
    });
    hint.horizontalAlign = Label.HorizontalAlign.CENTER;
  }
}
