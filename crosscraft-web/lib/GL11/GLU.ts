import { mat4 } from 'gl-matrix';
import {GL, GL11} from './GL11';
import { ByteBuffer } from './ByteBuffer';
import { IntBuffer } from './IntBuffer';

export class GLU {
    /**
     * Создаёт матрицу перспективной проекции.
     * @param fovy Угол обзора по вертикали в градусах.
     * @param aspect Соотношение сторон (ширина / высота).
     * @param zNear Расстояние до ближней плоскости отсечения.
     * @param zFar Расстояние до дальней плоскости отсечения.
     * @returns {mat4} Матрица проекции.
     */
    public static gluPerspective(fovy: number, aspect: number, zNear: number, zFar: number): mat4 {
        const matrix = mat4.create();
        mat4.perspective(matrix, fovy * (Math.PI / 180.0), aspect, zNear, zFar);
        GL11.glMultMatrixf(matrix);
        return matrix;
    }

    /**
     * Создаёт матрицу для выбора объектов (picking).
     * Эта матрица сужает область видимости до небольшого региона вокруг курсора.
     * @param x Координата X центра области.
     * @param y Координата Y центра области.
     * @param width Ширина области.
     * @param height Высота области.
     * @param viewport Массив [x, y, width, height] области просмотра.
     * @returns {mat4} Матрица для выбора.
     */
    public static gluPickMatrix(
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        viewport: [number, number, number, number] | IntBuffer
    ): mat4 {
        const matrix = mat4.create();
        mat4.identity(matrix);

        let viewportData: [number, number, number, number];
        
        if (viewport instanceof IntBuffer) {
            const rawArray = viewport.getRawArray();
            viewportData = [rawArray[0], rawArray[1], rawArray[2], rawArray[3]];
        } else {
            viewportData = viewport;
        }

        if (viewportData[2] <= 0 || viewportData[3] <= 0) return matrix;
        const sx = viewportData[2] / width;
        const sy = viewportData[3] / height;
        const tx = (viewportData[2] - 2 * (x - viewportData[0])) / width;
        const ty = (viewportData[3] - 2 * (y - viewportData[1])) / height;
        mat4.translate(matrix, matrix, [tx, ty, 0]);
        mat4.scale(matrix, matrix, [sx, sy, 1]);
        GL11.glMultMatrixf(matrix);
        return matrix;
    }

    /**
     * Создаёт 2D текстуру с мип-уровнями (точный порт из оригинального GLU).
     * @param target Цель текстуры (GL.TEXTURE_2D)
     * @param internalFormat Внутренний формат (GL.RGBA)
     * @param width Ширина текстуры
     * @param height Высота текстуры
     * @param format Формат пикселей (GL.RGBA)
     * @param type Тип данных (GL.UNSIGNED_BYTE)
     * @param pixels Данные пикселей
     */
    public static gluBuild2DMipmaps(
        target: number, 
        internalFormat: number, 
        width: number, 
        height: number, 
        format: number, 
        type: number, 
        pixels: ArrayBufferView | ByteBuffer | Uint8Array
    ): void {
        const gl = GL11['gl'];
        
        let pixelData: ArrayBufferView;
        
        // Обрабатываем разные типы входных данных
        if (pixels instanceof ByteBuffer) {
            pixelData = pixels.getRawArray();
        } else if (pixels instanceof Uint8Array) {
            pixelData = pixels;
        } else {
            pixelData = pixels;
        }

        // Загружаем базовый уровень (уровень 0)
        gl.texImage2D(target, 0, internalFormat, width, height, 0, format, type, pixelData);
        
        // Проверяем, является ли размер степенью двойки
        if (this.isPowerOf2(width) && this.isPowerOf2(height)) {
            // Автоматически генерируем мип-уровни
            gl.generateMipmap(target);
        } else {
            // Для текстур, размер которых не является степенью двойки,
            // устанавливаем параметры для работы без мип-уровней
            gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    }


    /**
     * Возвращает строку ошибки для кода ошибки GL.
     * @param errorCode Код ошибки.
     * @returns {string} Описание ошибки.
     */
    public static gluErrorString(errorCode: number): string {
        switch (errorCode) {
            case GL.NO_ERROR: return "No error";
            case GL.INVALID_ENUM: return "Invalid enum";
            case GL.INVALID_VALUE: return "Invalid value";
            case GL.INVALID_OPERATION: return "Invalid operation";
            case GL.STACK_OVERFLOW: return "Stack overflow";
            case GL.STACK_UNDERFLOW: return "Stack underflow";
            case GL.OUT_OF_MEMORY: return "Out of memory";
            case GL.INVALID_FRAMEBUFFER_OPERATION: return "Invalid framebuffer operation";
            // Эти ошибки были в старом GL, но редки в WebGL
            case GL.TABLE_TOO_LARGE: return "Table too large";
            default: return `Unknown error code ${errorCode}`;
        }
    }

    /**
     * Проверяет, является ли число степенью двойки
     * @param value Число для проверки
     * @returns {boolean} True если число является степенью двойки
     */
    private static isPowerOf2(value: number): boolean {
        return (value & (value - 1)) === 0;
    }
}