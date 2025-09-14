import { IntBuffer } from "./IntBuffer";

/**
 * Реализация байтового буфера, имитирующая java.nio.ByteBuffer.
 * Внутри использует ArrayBuffer и DataView для низкоуровневой работы с данными.
 */
export class ByteBuffer {
    // Основное хранилище байт
    public readonly buffer: ArrayBuffer; 
    // "Умная" обертка для чтения/записи разных типов данных
    private readonly view: DataView;

    private _position: number = 0;
    private _limit: number;
    private readonly _capacity: number;

    constructor(capacity: number) {
        this.buffer = new ArrayBuffer(capacity);
        this.view = new DataView(this.buffer);
        this._capacity = capacity;
        this._limit = capacity;
    }

    public clear(): this {
        this._position = 0;
        this._limit = this._capacity;
        return this;
    }

    public flip(): this {
        this._limit = this._position;
        this._position = 0;
        return this;
    }

    /**
     * Записывает данные в буфер
     * @param src Исходный массив байтов или одно значение
     * @returns {this}
     */
    public put(src: number[] | Int8Array | Uint8Array | number): this {
        if (typeof src === 'number') {
            // Записываем одно значение
            if (this.remaining() < 1) {
                throw new Error("Buffer overflow");
            }
            const uint8View = new Uint8Array(this.buffer);
            uint8View[this._position++] = src;
        } else {
            // Записываем массив
            if (src.length > this.remaining()) {
                throw new Error("Buffer overflow");
            }

            const uint8View = new Uint8Array(this.buffer);
            for (let i = 0; i < src.length; i++) {
                uint8View[this._position++] = src[i];
            }
        }

        return this;
    }

    /**
     * Читает данные из буфера
     * @param index Опциональный индекс для чтения (не изменяет позицию)
     * @returns {number}
     */
    public get(index?: number): number {
        if (index !== undefined) {
            // get(index) - читаем с указанной позиции
            if (index < 0 || index >= this._limit) {
                throw new Error("Index out of bounds");
            }
            return this.view.getUint8(index);
        } else {
            // get() - читаем с текущей позиции
            if (this._position >= this._limit) {
                throw new Error("Buffer underflow");
            }
            return this.view.getUint8(this._position++);
        }
    }

    /**
     * Получает текущую позицию буфера
     */
    public position(): number;
    /**
     * Устанавливает позицию буфера
     */
    public position(newPosition: number): this;
    public position(newPosition?: number): number | this {
        if (newPosition === undefined) {
            return this._position;
        }
        if (newPosition > this._limit || newPosition < 0) {
            throw new Error("Invalid position value");
        }
        this._position = newPosition;
        return this;
    }

    /**
     * Получает текущий лимит буфера
     */
    public limit(): number;
    /**
     * Устанавливает лимит буфера
     */
    public limit(newLimit: number): this;
    public limit(newLimit?: number): number | this {
        if (newLimit === undefined) {
            return this._limit;
        }
        if (newLimit > this._capacity || newLimit < 0) {
            throw new Error("Invalid limit value");
        }
        this._limit = newLimit;
        if (this._position > newLimit) {
            this._position = newLimit;
        }
        return this;
    }
    
    /**
     * Возвращает "представление" этого байтового буфера как буфера целых чисел.
     */
    public asIntBuffer(): IntBuffer {
        return new IntBuffer(this.buffer);
    }
    
    // --- Геттеры для состояния ---
    public capacity(): number { return this._capacity; }
    public remaining(): number { return this._limit - this._position; }
    
    /**
     * Возвращает сырой Uint8Array, представляющий весь буфер.
     */
    public getRawArray(): Uint8Array {
        return new Uint8Array(this.buffer, 0, this._limit);
    }
}
