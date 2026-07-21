// Flock Splits screen (M8, #88): the first open-ended mini-game UI. Pure rules
// live in ./flock-splits (split canonicalization, submit, session state); this
// class is view + tap input only — it never edits a FlockSession by hand.
//
// Session-local: nothing touches GameState or the save. One metadata-only
// minigame_session_ended event is emitted by GameApp.endMinigame on the
// orderly teardown (completion or exit), via the props this screen passes up.
//
// Tap model: tap a pen to aim it (highlighted), tap a meadow fluffball to send
// it into the aimed pen, tap a pen's ten-frame to return one to the meadow.
// No timer, no failure states — every non-empty split is accepted, duplicates
// are gentle, and the delight is discovering distinct decompositions.

import { Color, EventTouch, EventKeyboard, Graphics, KeyCode, Node, UITransform } from "cc";
import { paintCellGrid } from "../questions/FigureView";
import {
	FLOCK_GOAL,
	applySubmit,
	isComplete,
	newFlockSession,
	replay,
	returnToStaging,
	sendToPen,
	submitSplit,
	type FlockSession,
} from "./flock-splits";
import {
	PALETTE,
	destroyChildren,
	makeButton,
	makeLabel,
	makePanel,
	makeRect,
} from "../ui";

const MEADOW_GREEN = new Color(214, 233, 219, 255);
const PEN_FILL = new Color(247, 243, 232, 255);
const FLUFF_FILL = new Color(252, 250, 244, 255);
const FLUFF_STROKE = new Color(205, 200, 188, 255);
const FLUFF_FACE = new Color(70, 60, 55, 255);

/** Why the screen closed — drives the telemetry `reason` prop. */
export type FlockSplitsReason = "completed" | "exited";

export class FlockSplitsScreen {
	readonly root = new Node("flock-splits");

	private session: FlockSession = newFlockSession();
	/** The pen a meadow tap sends into (0 = left, 1 = right). Always set. */
	private aimedPen: 0 | 1 = 0;
	/** Sticky: reached the completion screen at least once this visit. */
	private completed = false;
	/** Teardown is one-shot even if two inputs land before Cocos destroys the root. */
	private closed = false;
	private notice: { text: string; color: Color } | null = null;

	constructor(
		private onExit: (reason: FlockSplitsReason, session: FlockSession) => void,
	) {
		this.render();
	}

	handleKeyDown(e: EventKeyboard): void {
		if (e.keyCode === KeyCode.ESCAPE) this.leave();
	}

	private leave(): void {
		if (this.closed) return;
		this.closed = true;
		this.onExit(this.completed ? "completed" : "exited", this.session);
	}

	// --- tap-driven state transitions (all routed through the pure module) ---

	private aimPen(pen: 0 | 1): void {
		this.aimedPen = pen;
		this.notice = null;
		this.render();
	}

	private sendFromMeadow(): void {
		if (this.session.staging <= 0) return;
		this.session = sendToPen(this.session, this.aimedPen);
		this.notice = null;
		this.render();
	}

	private returnFromPen(pen: 0 | 1): void {
		if (this.session.pens[pen] <= 0) return;
		this.session = returnToStaging(this.session, pen);
		this.notice = null;
		this.render();
	}

	private submit(): void {
		const result = submitSplit(this.session);
		if (result.kind === "incomplete") {
			this.notice = { text: "还有羊在外面。 Sheep are still outside!", color: PALETTE.bad };
			this.render();
			return;
		}
		if (result.kind === "empty-pen") {
			this.notice = { text: "两个围栏都要有羊哦。 Both pens need a sheep!", color: PALETTE.bad };
			this.render();
			return;
		}
		if (result.kind === "duplicate") {
			this.notice = { text: "这种分法找过了，再试一个？ Found that split — try another?", color: PALETTE.sub };
			this.session = applySubmit(this.session, result);
			this.render();
			return;
		}
		// accepted: record, return every fluffball to the meadow, maybe complete.
		this.session = applySubmit(this.session, result);
		this.notice = { text: `${result.key.replace("+", " + ")} = 10  ✓`, color: PALETTE.good };
		if (isComplete(this.session)) this.completed = true;
		this.render();
	}

	private replayRound(): void {
		this.session = replay(this.session);
		// `completed` stays sticky for the telemetry reason: a replay-then-quit
		// still counts as a completed visit (the most interesting replay signal).
		// render() re-shows the playing field because isComplete is now false.
		this.aimedPen = 0;
		this.notice = null;
		this.render();
	}

	// --- rendering ------------------------------------------------------------

	private render(): void {
		destroyChildren(this.root);
		makeRect(this.root, 0, 0, 960, 640, MEADOW_GREEN);
		if (this.completed && isComplete(this.session)) {
			this.drawComplete();
		} else {
			this.drawPlaying();
		}
	}

	private drawPlaying(): void {
		makeLabel(this.root, "分羊群 · Flock Splits", 0, 292, { fontSize: 30 });
		makeLabel(this.root, `找出 10 的 ${FLOCK_GOAL} 种分法！  ·  Find ${FLOCK_GOAL} ways to split 10!`, 0, 262, {
			fontSize: 17,
			color: PALETTE.sub,
		});

		this.drawMeadow();
		this.drawPen(0, -230);
		this.drawPen(1, 230);
		this.drawFoundCards(0, -108);
		this.drawNotice(-228);

		makeButton(this.root, {
			x: 0,
			y: -176,
			w: 200,
			h: 56,
			label: "好了！ Done",
			color: PALETTE.actionBlue,
			fontSize: 22,
			onTap: () => this.submit(),
		});
		makeButton(this.root, {
			x: 0,
			y: -286,
			w: 170,
			h: 42,
			label: "离开 Leave  (Esc)",
			color: new Color(144, 164, 174, 255),
			fontSize: 16,
			onTap: () => this.leave(),
		});
	}

	// The meadow: unplaced fluffballs waiting in a row. Tap any to send one
	// into the aimed pen.
	private drawMeadow(): void {
		const panel = makePanel(this.root, 0, 195, 740, 84, {
			fill: PEN_FILL,
			stroke: PALETTE.panelStroke,
			radius: 14,
		});
		makeLabel(panel, "草场 · Meadow", -330, 24, {
			fontSize: 16,
			color: PALETTE.sub,
			align: "left",
		});
		const n = this.session.staging;
		const gap = 30;
		const startX = -((n - 1) * gap) / 2;
		for (let i = 0; i < n; i++) {
			this.makeFluff(panel, startX + i * gap, -6, 13, () => this.sendFromMeadow());
		}
		if (n === 0) {
			makeLabel(panel, "都进围栏啦！ All in pens!", 0, -6, {
				fontSize: 16,
				color: PALETTE.good,
			});
		}
	}

	// A pen: tap its background to aim it (highlighted), tap its ten-frame to
	// return one fluffball to the meadow. Count + ten-frame track it live.
	private drawPen(i: 0 | 1, cx: number): void {
		const aimed = this.aimedPen === i;
		const panel = makePanel(this.root, cx, 35, 300, 210, {
			fill: PEN_FILL,
			stroke: aimed ? PALETTE.actionBlue : PALETTE.panelStroke,
			lineWidth: aimed ? 6 : 3,
			radius: 16,
		});
		makeLabel(panel, `围栏 ${i + 1}`, -130, 82, { fontSize: 18, align: "left" });
		if (aimed) {
			makeLabel(panel, "↓ 收这里 Collect", 130, 82, {
				fontSize: 14,
				color: PALETTE.actionBlue,
				align: "right",
			});
		}
		const count = this.session.pens[i];
		makeLabel(panel, String(count), 0, 50, { fontSize: 40, color: PALETTE.ink });

		// The ten-frame is the pen's sheep pen: tapping it returns one. Wrap
		// paintCellGrid in a tappable container sized to the grid's hit box.
		const grid = new Node("pen-grid");
		grid.parent = panel;
		grid.addComponent(UITransform).setContentSize(110, 60);
		grid.setPosition(0, -16);
		paintCellGrid(grid, 0, 0, { cols: 5, rows: 2, cell: 13, gap: 3, filled: count });
		grid.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
			e.propagationStopped = true;
			this.returnFromPen(i);
		});

		panel.on(Node.EventType.TOUCH_END, () => this.aimPen(i));
	}

	private drawFoundCards(cx: number, cy: number): void {
		const found = this.session.found;
		if (found.length === 0) {
			makeLabel(this.root, "找到的分法会显示在这里。 Found splits appear here.", cx, cy, {
				fontSize: 15,
				color: PALETTE.sub,
			});
			return;
		}
		const gap = 150;
		const startX = cx - ((found.length - 1) * gap) / 2;
		found.forEach((key, i) => {
			const card = makePanel(this.root, startX + i * gap, cy, 130, 44, {
				fill: new Color(255, 253, 245, 255),
				stroke: PALETTE.good,
				lineWidth: 2,
				radius: 10,
			});
			makeLabel(card, `${key.replace("+", " + ")} = 10`, 0, 0, {
				fontSize: 20,
				color: PALETTE.good,
			});
		});
	}

	private drawNotice(cy: number): void {
		if (!this.notice) return;
		makeLabel(this.root, this.notice.text, 0, cy, {
			fontSize: 18,
			color: this.notice.color,
		});
	}

	private drawComplete(): void {
		const card = makePanel(this.root, 0, 40, 760, 420, {
			fill: PEN_FILL,
			stroke: PALETTE.good,
			lineWidth: 6,
			radius: 20,
		});
		makeLabel(card, `你找到了 ${this.session.found.length} 种分法！太棒了！`, 0, 160, { fontSize: 30, color: PALETTE.good });
		makeLabel(card, `You found ${this.session.found.length} ways to split 10! Amazing!`, 0, 128, {
			fontSize: 22,
			color: PALETTE.good,
		});

		const found = this.session.found;
		const gap = 150;
		const startX = -((found.length - 1) * gap) / 2;
		found.forEach((key, i) => {
			const eq = makePanel(card, startX + i * gap, 40, 130, 50, {
				fill: new Color(255, 253, 245, 255),
				stroke: PALETTE.good,
				lineWidth: 2,
				radius: 10,
			});
			makeLabel(eq, `${key.replace("+", " + ")} = 10`, 0, 0, {
				fontSize: 22,
				color: PALETTE.good,
			});
		});

		makeButton(card, {
			x: -120,
			y: -60,
			w: 200,
			h: 56,
			label: "再玩一次 Play again",
			color: PALETTE.actionBlue,
			fontSize: 19,
			onTap: () => this.replayRound(),
		});
		makeButton(card, {
			x: 120,
			y: -60,
			w: 200,
			h: 56,
			label: "离开 Leave",
			color: new Color(144, 164, 174, 255),
			fontSize: 19,
			onTap: () => this.leave(),
		});
	}

	// A tappable fluffball placeholder (no PNG art): a fluffy disc with a face.
	private makeFluff(parent: Node, x: number, y: number, r: number, onTap?: () => void): Node {
		const node = new Node("fluff");
		node.parent = parent;
		node.addComponent(UITransform).setContentSize(r * 2 + 6, r * 2 + 6);
		node.setPosition(x, y);
		const g = node.addComponent(Graphics);
		g.fillColor = FLUFF_FILL;
		g.strokeColor = FLUFF_STROKE;
		g.lineWidth = 2;
		g.circle(0, 0, r);
		g.fill();
		g.stroke();
		g.fillColor = FLUFF_FACE;
		g.circle(-r * 0.28, r * 0.12, r * 0.12);
		g.fill();
		g.circle(r * 0.28, r * 0.12, r * 0.12);
		g.fill();
		if (onTap) {
			node.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
				e.propagationStopped = true;
				onTap();
			});
		}
		return node;
	}
}
