import { GL, GL11 } from "../../lib/GL11/GL11";
import { Keyboard } from "../../lib/IO/Keyboard";
import { Mouse } from "../../lib/IO/Mouse";
import type { CrossCraft } from "../CrossCraft";
import { Tessellator } from "../render/Tessellator";
import { Button } from './Button';
import type { Font } from "./Font";

export class Screen {
    protected cc!: CrossCraft;
    protected width!: number;
    protected height!: number;
    protected buttons: Button[] = [];

    /**
     * Отрисовывает экран. В базовом классе отрисовывает все кнопки.
     * Дочерние классы должны вызывать super.render() для отрисовки кнопок.
     */
    public render(xMouse: number, yMouse: number): void {
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];

            // Пропускаем невидимые кнопки
            if (!button.visible) continue;
            this.fill(button.x - 1, button.y - 1, button.x + button.w + 1, button.y + button.h + 1, -16777216);
            // Отрисовка неактивной кнопки
            if (!button.enabled) {
                this.fill(button.x, button.y, button.x + button.w, button.y + button.h, -8355680); // Серый фон
                this.drawCenteredString(button.msg, button.x + button.w / 2, button.y + (button.h - 8) / 2, -6250336); // Темный текст
            } 
            // Отрисовка кнопки при наведении мыши
            else if (xMouse >= button.x && yMouse >= button.y && xMouse < button.x + button.w && yMouse < button.y + button.h) {
                this.fill(button.x, button.y, button.x + button.w, button.y + button.h, -8355680); // Светлый фон
                this.drawCenteredString(button.msg, button.x + button.w / 2, button.y + (button.h - 8) / 2, 16777120); // Яркий текст
            } 
            // Отрисовка кнопки в стандартном состоянии
            else {
                this.fill(button.x, button.y, button.x + button.w, button.y + button.h, -9408400); // Стандартный фон
                this.drawCenteredString(button.msg, button.x + button.w / 2, button.y + (button.h - 8) / 2, 14737632); // Белый текст
            }
        }
    }

    public onClose(): void {
    }

    public init(cc: CrossCraft, width: number, height: number): void {
        cc.player.releaseAllKeys();
        this.cc = cc;
        this.width = width;
        this.height = height;
        this.buttons = []; // Очищаем кнопки при инициализации
    }

    protected fill(x0: number, y0: number, x1: number, y1: number, col: number): void {
        var a: number = (col >> 24 & 255) / 255.0;
        var r: number = (col >> 16 & 255) / 255.0;
        var g: number = (col >> 8 & 255) / 255.0;
        var b: number = (col & 255) / 255.0;
        var t: Tessellator = Tessellator.instance;
        GL11.glEnable(GL.BLEND);
        GL11.glBlendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
        GL11.glColor4f(r, g, b, a);
        t.begin();
        t.vertex(x0, y1, 0.0);
        t.vertex(x1, y1, 0.0);
        t.vertex(x1, y0, 0.0);
        t.vertex(x0, y0, 0.0);
        t.end();
        GL11.glDisable(GL.BLEND);
    }

    protected fillGradient(x0: number, y0: number, x1: number, y1: number, col1: number, col2: number): void {
        const a1: number = (col1 >> 24 & 255) / 255.0;
        const r1: number = (col1 >> 16 & 255) / 255.0;
        const g1: number = (col1 >> 8 & 255) / 255.0;
        const b1: number = (col1 & 255) / 255.0;
        const a2: number = (col2 >> 24 & 255) / 255.0;
        const r2: number = (col2 >> 16 & 255) / 255.0;
        const g2: number = (col2 >> 8 & 255) / 255.0;
        const b2: number = (col2 & 255) / 255.0;
        
        GL11.glEnable(GL.BLEND);
        GL11.glBlendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
        const t: Tessellator = Tessellator.instance;
        t.begin();
        GL11.glColor4f(r1, g1, b1, a1);
        t.vertex(x1, y0, 0.0);
        t.vertex(x0, y0, 0.0);
        GL11.glColor4f(r2, g2, b2, a2);
        t.vertex(x0, y1, 0.0);
        t.vertex(x1, y1, 0.0);
        t.end();
        GL11.glDisable(GL.BLEND);
    }

    public drawCenteredString(str: string, x: number, y: number, color: number): void {
        var font: Font = this.cc.font;
        font.drawShadow(str, x - font.width(str) / 2, y, color);
    }

    public drawString(str: string, x: number, y: number, color: number): void {
        var font: Font = this.cc.font;
        font.drawShadow(str, x, y, color);
    }
    
    /**
     * Обрабатывает клик мыши и вызывает buttonClicked, если клик попал по кнопке.
     */
    protected mouseClicked(x: number, y: number, button: number): void {
        if (button === 0) { // Левая кнопка мыши
            for (let i = 0; i < this.buttons.length; i++) {
                const btn = this.buttons[i];
                if (btn.enabled && btn.visible && x >= btn.x && y >= btn.y && x < btn.x + btn.w && y < btn.y + btn.h) {
                    this.buttonClicked(btn);
                }
            }
        }
    }
    
    /**
     * Вызывается, когда по кнопке был произведен клик.
     * Этот метод должен быть переопределен дочерними классами.
     */
    protected buttonClicked(button: Button): void {
    }

    public updateEvents(): void {
        while (Mouse.next()) {
            if (Mouse.getEventButtonState()) {
                var xm: number = Mouse.getEventX() * this.width / this.cc.width;
                var ym: number = this.height - Mouse.getEventY() * this.height / this.cc.height - 1;
                this.mouseClicked(xm, ym, Mouse.getEventButton());
            }
        }

        while (Keyboard.next()) {
            if (Keyboard.getEventKeyState()) {
                this.keyPressed(Keyboard.getEventCharacter(), Keyboard.getEventKey());
            }
        }
    }

    protected keyPressed(eventCharacter: string, eventKey: number): void {
    }

    public tick(): void {
    }
}
