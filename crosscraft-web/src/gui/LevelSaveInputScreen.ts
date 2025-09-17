import { Key } from "../../lib/IO/Key";
import { Keyboard } from "../../lib/IO/Keyboard";
import type { CrossCraft } from "../CrossCraft";
import { Button } from "./Button";
import { Screen } from "./Screen";


export class LevelSaveInputScreen extends Screen {
    private parent: Screen;
    private title: string = "Enter level name:";
    private levelId: number;
    private levelName: string;
    private tickCounter: number = 0;

    constructor(parent: Screen, currentName: string, levelId: number) {
        super()
        this.parent = parent;
        this.levelId = levelId;
        this.levelName = currentName;

        if (this.levelName == "-") {
            this.levelName = "";
        }
    }

    public init(cc: CrossCraft, width: number, height: number): void {
        super.init(cc, width, height);
        this.buttons = [];
        Keyboard.enableRepeatEvents(true);
        this.buttons.push(new Button(0, this.width / 2 - 100, this.height / 4 + 120, 200, 20, "Save"));
        this.buttons.push(new Button(1, this.width / 2 - 100, this.height / 4 + 144, 200, 20, "Cancel"));

        this.buttons[0].enabled = this.levelName.trim().length > 1;
    } 

    public onClose(): void {
        Keyboard.enableRepeatEvents(false);
    }

    public tick(): void {
        ++this.tickCounter;
    }

    protected buttonClicked(button: Button): void {
        if (button.enabled) {
            if (button.id == 0 && this.levelName.trim().length > 1) {
                this.cc.saveLevel(this.levelId, this.levelName.trim());
                this.cc.setScreen(null as unknown as Screen);
                this.cc.resumeGame();
            }

            if (button.id == 1) {
                this.cc.setScreen(this.parent);
            }
        }
    }

    protected keyPressed(character: string, key: number): void {
        if (key == Key.BACK && this.levelName.length > 0) {
            this.levelName = this.levelName.substring(0, this.levelName.length - 1);
        }

        if ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.:-_'*!\"#%/()=+?[]{}<>".indexOf(character) >= 0 && this.levelName.length < 64) {
            this.levelName = this.levelName + character;
        }

        this.buttons[0].enabled = this.levelName.trim().length > 1;
    }

    public render(xMouse: number, yMouse: number): void {
        this.fillGradient(0, 0, this.width, this.height, 1610941696, -1607454624);
        this.drawCenteredString(this.title, this.width / 2, 40, 0xFFFFFF);

        var fieldX: number = this.width / 2 - 100;
        var fieldY: number = this.height / 2 - 10;

        this.fill(fieldX - 1, fieldY - 1, fieldX + 200 + 1, fieldY + 20 + 1, -6250336);
        this.fill(fieldX, fieldY, fieldX + 200, fieldY + 20, -16777216);

        this.drawString(this.levelName + (this.tickCounter / 6 % 2 == 0 ? "_" : ""), fieldX + 4, fieldY + 6, 14737632);

        super.render(xMouse, yMouse);
    }
}