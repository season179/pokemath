// Main: the game's bootstrap component and the only component referenced
// from main.scene. Everything else is constructed at runtime, code-first.

import { _decorator, Component, Node, Graphics, Label, UITransform, Color, view } from "cc";
const { ccclass } = _decorator;

@ccclass("Main")
export class Main extends Component {
  start() {
    const size = view.getDesignResolutionSize();
    const w = size.width;
    const h = size.height;

    // background, matching the prototype's page color
    const bg = new Node("Background");
    bg.parent = this.node;
    bg.addComponent(UITransform).setContentSize(w, h);
    const g = bg.addComponent(Graphics);
    g.fillColor = new Color(43, 43, 61, 255); // #2b2b3d
    g.fillRect(-w / 2, -h / 2, w, h);

    // hello label — proof the code-first pipeline works end to end
    const titleNode = new Node("Title");
    titleNode.parent = this.node;
    titleNode.addComponent(UITransform);
    const title = titleNode.addComponent(Label);
    title.string = "Pokemath";
    title.fontSize = 48;
    title.color = Color.WHITE;
  }
}
