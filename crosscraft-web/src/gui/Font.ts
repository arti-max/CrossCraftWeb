import { Tessellator } from "../render/Tessellator";
import { Textures } from "../Textures";
import { GL11, GL } from "../../lib/GL11/GL11";

export class Font {
    private static readonly CHAR_SPACING = 1;
    private charWidths: number[] = new Array(256).fill(0);
    private fontTexture: number = 0;

    /**
     * Синхронно создаёт и инициализирует экземпляр шрифта.
     * Требует, чтобы изображение уже было загружено в DOM.
     * @param name ID html-элемента <img> с текстурой шрифта (например, "/default.png").
     * @param textures Менеджер текстур для загрузки в WebGL.
     */
    constructor(name: string, textures: Textures) {
        try {
            // 1. Получаем изображение из DOM, как в вашем Textures.ts
            const img = document.getElementById(name) as HTMLImageElement;
            if (!img || !img.complete || img.naturalWidth === 0) {
                console.error(`Font constructor: Image element '${name}' not found or not loaded.`);
                throw new Error(`Font image '${name}' not available.`);
            }

            // 2. Получаем данные пикселей через временный canvas
            const w = img.width;
            const h = img.height;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error("Could not get 2D context for font processing.");
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, w, h);
            const rawPixels = imageData.data; // Uint8ClampedArray [R,G,B,A, R,G,B,A, ...]

            // 3. Вычисляем ширину каждого символа
            // Эта логика определяет ширину символа по последнему непрозрачному пикселю.
            for (let i = 0; i < 256; ++i) {
                const col = i % 16;
                const row = Math.floor(i / 16);
                let charPixelWidth = 7; 
                
                // Ищем первую пустую колонку пикселей справа налево
                search: for (; charPixelWidth >= 0; --charPixelWidth) {
                    const x = col * 8 + charPixelWidth;
                    for (let y = 0; y < 8; ++y) {
                        const yPixel = row * 8 + y;
                        // Проверяем альфа-канал. Если он не прозрачный, колонка не пустая.
                        if (rawPixels[(x + yPixel * w) * 4 + 3] > 128) {
                            // Нашли непрозрачный пиксель, значит ширина найдена.
                            break search;
                        }
                    }
                }

                if (i === 32) { // Пробел
                    charPixelWidth = 3;
                }
                
                this.charWidths[i] = charPixelWidth + 1; // +1 пиксель отступа
            }

            // 4. Загружаем текстуру шрифта в WebGL через ваш менеджер
            this.fontTexture = textures.loadTexture(name, GL.NEAREST);

        } catch (e) {
            console.error("Failed to create font:", e);
            throw e;
        }
    }

    /**
     * Рисует текст с тенью.
     */
    public drawShadow(str: string, x: number, y: number, color: number): void {
        this.internalDraw(str, x + 1, y + 1, color, true);
        this.internalDraw(str, x, y, color, false);
    }

    /**
     * Рисует текст.
     */
    public draw(str: string, x: number, y: number, color: number): void {
        this.internalDraw(str, x, y, color, false);
    }
    
    /**
     * Внутренний метод для отрисовки текста.
     */
    private internalDraw(str: string, x: number, y: number, color: number, darken: boolean): void {
        if (str === null || str === undefined || str.length === 0) return;
        
        if (darken) {
            color = (color & 0xFCFCFC) >> 2;
        }

        GL11.glEnable(GL.TEXTURE_2D);
        GL11.glBindTexture(GL.TEXTURE_2D, this.fontTexture);
        
        const t = Tessellator.instance;
        t.begin();

        // Устанавливаем начальный цвет
        let r = (color >> 16) & 0xFF;
        let g = (color >> 8) & 0xFF;
        let b = color & 0xFF;
        t.color(r / 255.0, g / 255.0, b / 255.0);
        
        let currentX = x;

        for (let i = 0; i < str.length; ++i) {
            // Обработка кодов цвета (например, &c для красного)
            if (str[i] === '&' && i + 1 < str.length) {
                const colorCode = "0123456789abcdef".indexOf(str[i + 1].toLowerCase());
                if (colorCode >= 0) {
                    const iy = (colorCode & 8) * 8;
                    const b_c = (colorCode & 1) * 191 + iy;
                    const g_c = ((colorCode & 2) >> 1) * 191 + iy;
                    const r_c = ((colorCode & 4) >> 2) * 191 + iy;
                    
                    let newColor = r_c << 16 | g_c << 8 | b_c;
                    if (darken) {
                        newColor = (newColor & 0xFCFCFC) >> 2;
                    }

                    r = (newColor >> 16) & 0xFF;
                    g = (newColor >> 8) & 0xFF;
                    b = newColor & 0xFF;
                    t.color(r / 255.0, g / 255.0, b / 255.0);

                    i++; // Пропускаем символ кода цвета
                    continue;
                }
            }

            const charCode = str.charCodeAt(i);
            if (charCode >= this.charWidths.length) continue; 

            const ix = charCode % 16 * 8;
            const iy = Math.floor(charCode / 16) * 8;
            
            // Размер атласа 128x128px
            const u0 = ix / 128.0;
            const v0 = iy / 128.0;
            const u1 = (ix + 7.99) / 128.0; // 7.99 для предотвращения "просачивания" текстур
            const v1 = (iy + 7.99) / 128.0;

            t.vertexUV(currentX, y + 8, 0, u0, v1);
            t.vertexUV(currentX + 8, y + 8, 0, u1, v1);
            t.vertexUV(currentX + 8, y, 0, u1, v0);
            t.vertexUV(currentX, y, 0, u0, v0);
            
            currentX += this.charWidths[charCode] + Font.CHAR_SPACING;
        }

        t.end();
        GL11.glDisable(GL.TEXTURE_2D);
    }

    /**
     * Вычисляет ширину строки в пикселях.
     */
    public width(str: string): number {
        if (str === null || str === undefined) return 0;
        let len = 0;

        for (let i = 0; i < str.length; ++i) {
            if (str[i] === '&' && i + 1 < str.length) {
                i++; // Пропускаем символ кода цвета
            } else {
                const charCode = str.charCodeAt(i);
                if (charCode < this.charWidths.length) {
                    len += this.charWidths[charCode];
                }
            }
        }
        return len;
    }
}
