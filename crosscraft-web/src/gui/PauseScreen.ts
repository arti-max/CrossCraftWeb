import type { CrossCraft } from "../CrossCraft";
import { Button } from "./Button";
import { LevelGenerateScreen } from "./LevelGenerateScreen";
import { LevelLoadScreen } from "./LevelLoadScreen";
import { LevelSaveScreen } from "./LevelSaveScreen";
import { Screen } from "./Screen";

export class PauseScreen extends Screen {

    public init(cc: CrossCraft, width: number, height: number): void {
        super.init(cc, width, height); // Важно вызвать родительский init

        this.buttons.push(new Button(0, this.width / 2 - 100, this.height / 3 + 0, 200, 20, "Generate new level"));
        this.buttons.push(new Button(1, this.width / 2 - 100, this.height / 3 + 32, 200, 20, "Save level..."));
        this.buttons.push(new Button(2, this.width / 2 - 100, this.height / 3 + 64, 200, 20, "Load level..."));
        this.buttons.push(new Button(3, this.width / 2 - 100, this.height / 3 + 96, 200, 20, "Back to game"));

        // Логика отключения кнопок, если нет сессии
        if (this.cc.user == null) {
            this.buttons[1].enabled = false;
            this.buttons[2].enabled = false;
        }
    }

    protected buttonClicked(button: Button): void {
        if (button.id === 0) {
            this.cc.setScreen(new LevelGenerateScreen(this));
            // this.cc.generateNewLevel();
            // this.cc.setScreen(null as unknown as Screen);
            // this.cc.resumeGame();
        }

        if (this.cc.user != null) {
            if (button.id == 1) { // Save level
                this.cc.setScreen(new LevelSaveScreen(this));
            }
            if (button.id == 2) { // Load level
                this.cc.setScreen(new LevelLoadScreen(this));
            }

        }

        if (button.id === 3) {
            this.cc.setScreen(null as unknown as Screen);
            this.cc.resumeGame();
        }
    }

    public render(xMouse: number, yMouse: number): void {
        this.fillGradient(0, 0, this.width, this.height, 537199872, -1607454624);
        
        this.drawCenteredString("Game Menu", this.width / 2, 40, 0xFFFFFF);

        super.render(xMouse, yMouse);
    }
}
