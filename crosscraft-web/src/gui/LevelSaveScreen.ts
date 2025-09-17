import type { Button } from "./Button";
import { LevelLoadScreen } from "./LevelLoadScreen";
import { LevelSaveInputScreen } from "./LevelSaveInputScreen";
import type { Screen } from "./Screen";


export class LevelSaveScreen extends LevelLoadScreen {

    constructor(parent: Screen) {
        super(parent);
        this.title = "Save level";
    }

    protected updateButtonLabels(names: string[]): void {
        for (var i = 0; i < 5; ++i) {
            const b: Button = this.buttons[i];
            b.msg = names[i];
            b.visible = true;
        }
    }

    protected async loadLevel(levelId: number): Promise<void> {
        this.cc.setScreen(new LevelSaveInputScreen(this, this.buttons[levelId].msg, levelId));
    }

}