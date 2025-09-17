import type { CrossCraft } from "../CrossCraft";
import { Button } from "./Button";
import { Screen } from "./Screen";


export class LevelGenerateScreen extends Screen {
    private parent: Screen;
    protected title: string = "Generate new level";
    private buttonNames: string[] = ["Small", "Normal", "Huge"];

    constructor (parent: Screen) {
        super()
        this.parent = parent;
    }

    public init(cc: CrossCraft, width: number, height: number): void {
        super.init(cc, width, height);
        this.buttons = [];
        
        for (var i = 0; i < 3; ++i) {
            this.buttons.push(new Button(i, this.width / 2 - 100, this.height / 4 + i * 24, 200, 20, this.buttonNames[i]));
        }

        this.buttons.push(new Button(5, this.width / 2 - 100, this.height / 4 + 144, 200, 20, "Cancel"));
    }

    protected buttonClicked(button: Button): void {
        if (button.enabled) {
            if (button.id == 0) {
                this.cc.generateNewLevel(128, 128, 64);
                this.cc.setScreen(null as unknown as Screen);
                this.cc.resumeGame();
            }
            if (button.id == 1) {
                this.cc.generateNewLevel(256, 256, 64);
                this.cc.setScreen(null as unknown as Screen);
                this.cc.resumeGame();
            }
            if (button.id == 2) {
                this.cc.generateNewLevel(512, 512, 64);
                this.cc.setScreen(null as unknown as Screen);
                this.cc.resumeGame();
            }

            if (button.id == 5) {
                this.cc.setScreen(this.parent);
            }
        }
    }

    public render(mouseX: number, mouseY: number): void {
        this.fillGradient(0, 0, this.width, this.height, 537199872, -1607454624);
        this.drawCenteredString(this.title, this.width / 2, 40, 0xFFFFFF);
        super.render(mouseX, mouseY);
    }
}