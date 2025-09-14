import { FloatBuffer } from "./FloatBuffer";
import { IntBuffer } from './IntBuffer';
import { ByteBuffer } from './ByteBuffer';

export class BufferUtils {
    /**
     * Создает новый кастомный FloatBuffer с поведением, как в Java.
     * @param size Ёмкость буфера.
     * @returns {FloatBuffer} Новый экземпляр FloatBuffer.
     */
    public static createFloatBuffer(size: number): FloatBuffer {
        return new FloatBuffer(size);
    }

    /**
     * Создает новый типизированный массив IntBuffer.
     * @param size Ёмкость буфера.
     * @returns {IntBuffer}
     */
    public static createIntBuffer(size: number): IntBuffer {
        return new IntBuffer(size);
    }

    /**
     * Создает новый кастомный ByteBuffer с поведением, как в Java.
     * @param size Ёмкость буфера в байтах.
     * @returns {ByteBuffer} Новый экземпляр ByteBuffer.
     */
    public static createByteBuffer(size: number): ByteBuffer {
        return new ByteBuffer(size);
    }
}
