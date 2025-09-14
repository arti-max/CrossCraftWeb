/**
 * Реализация буфера для целочисленных значений (int), имитирующая java.nio.IntBuffer.
 */
export class IntBuffer {
    private readonly array: Int32Array;
    private _position: number;
    private _limit: number;
    private readonly _capacity: number;

    constructor(capacityOrBuffer: number | ArrayBuffer) {
        if (typeof capacityOrBuffer === 'number') {
            this.array = new Int32Array(capacityOrBuffer);
        } else {
            this.array = new Int32Array(capacityOrBuffer);
        }
        
        this._capacity = this.array.length;
        this._limit = this._capacity;
        this._position = 0;
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
     * @param srcOrValue Массив или одиночное значение
     */
    public put(srcOrValue: number | number[] | Int32Array): this {
        if (typeof srcOrValue === 'number') {
            // put(value)
            if (this.remaining() < 1) {
                throw new Error("Buffer overflow");
            }
            this.array[this._position++] = srcOrValue;
        } else {
            // put(array)
            if (srcOrValue.length > this.remaining()) {
                throw new Error("Buffer overflow");
            }
            this.array.set(srcOrValue, this._position);
            this._position += srcOrValue.length;
        }
        return this;
    }
    
    /**
     * Читает данные из буфера
     * @param index Опциональный индекс (не изменяет позицию)
     */
    public get(index?: number): number {
        if (index !== undefined) {
            // get(index) - читаем с указанной позиции
            if (index < 0 || index >= this._limit) {
                throw new Error("Index out of bounds");
            }
            return this.array[index];
        } else {
            // get() - читаем с текущей позиции
            if (this._position >= this._limit) {
                throw new Error("Buffer underflow");
            }
            return this.array[this._position++];
        }
    }

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

    public remaining(): number {
        return this._limit - this._position;
    }
    
    public capacity(): number {
        return this._capacity;
    }

    public getRawArray(): Int32Array {
        return this.array;
    }
}
