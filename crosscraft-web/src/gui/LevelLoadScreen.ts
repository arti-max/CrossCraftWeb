import type { CrossCraft } from "../CrossCraft";
import { Button } from './Button';
import { Screen } from "./Screen";


export class LevelLoadScreen extends Screen {
    private parent: Screen;
    private loadingFinished: boolean = false;
    private loadingFailed: boolean = false;
    private levelNames: string[] = null as unknown as string[];
    private statusMessage: string = "";
    protected title: string = "Load level";

    constructor(parent: Screen) {
        super();
        this.parent = parent;
    }

    public init(cc: CrossCraft, width: number, height: number): void {
        super.init(cc, width, height);
        this.buttons = [];

        for (var i = 0; i < 5; ++i) {
            this.buttons.push(new Button(i, this.width / 2 - 100, this.height / 4 + i * 24, 200, 20, "---"));
            this.buttons[i].visible = false;
        }

        this.buttons.push(new Button(5, this.width / 2 - 100, this.height / 4 + 144, 200, 20, "Cancel"));

        this.loadLevelList();
    }

    private async loadLevelList(): Promise<void> {
        try {
            this.statusMessage = "Getting level list..";
            const url = `http://${this.cc.host}/listmaps.jsp?user=${this.cc.user.username}`;

            // Выполняем сетевой запрос с помощью fetch
            const response = await fetch(url);

            // Проверяем, успешен ли HTTP-ответ
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Получаем тело ответа как текст
            const text = await response.text();
            
            this.levelNames = text.trim().split(';');

            if (this.levelNames.length < 5) {
                this.statusMessage = this.levelNames[0] || "Invalid response from server";
                this.loadingFailed = true;
            } else {
                this.updateButtonLabels(this.levelNames);
                this.loadingFinished = true;
            }
        } catch (error) {
            console.error("Failed to load level list:", error);
            this.statusMessage = "Failed to load levels";
            this.loadingFailed = true;
        }
    }

    protected updateButtonLabels(names: string[]): void {
        for (var i = 0; i < 5; ++i) {
            const b: Button = this.buttons[i]

            b.enabled = !(names[i] == "-");
            b.msg = names[i];
            b.visible = true;
        }
    }

    protected buttonClicked(button: Button): void {
        if (button.enabled) {
            if (this.loadingFinished && button.id < 5) {
                this.loadLevel(button.id);
            }

            if (this.loadingFailed || (this.loadingFinished && button.id == 5)) {
                this.cc.setScreen(this.parent);
            }
        }
    }

    protected async loadLevel(levelId: number): Promise<void> {
        await this.cc.loadLevel(this.cc.user.username, levelId);
        this.cc.setScreen(null as unknown as Screen);
        this.cc.resumeGame();
    }


    public render(mouseX: number, mouseY: number): void {
        this.fillGradient(0, 0, this.width, this.height, 537199872, -1607454624);
        this.drawCenteredString(this.title, this.width / 2, 40, 0xFFFFFF);

        if (!this.loadingFinished) {
            this.drawCenteredString(this.statusMessage, this.width / 2, this.height / 2 - 4, 0xFFFFFF);
        }

        super.render(mouseX, mouseY);
    }
}