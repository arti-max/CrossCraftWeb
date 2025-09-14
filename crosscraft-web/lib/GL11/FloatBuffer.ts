export class FloatBuffer {
    private readonly array: Float32Array;
    private _position: number;
    private _limit: number;
    private readonly _capacity: number;

    constructor(capacity: number) {
        this.array = new Float32Array(capacity);
        this._capacity = capacity;
        this._limit = capacity;
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

    public put(srcOrValue: number | number[] | Float32Array, offset: number = 0, length?: number): this {
        if (typeof srcOrValue === 'number') {
            if (this.remaining() < 1) {
                throw new Error("Buffer overflow");
            }
            this.array[this._position++] = srcOrValue;
        } else {
            const len = length === undefined ? srcOrValue.length - offset : length;
            
            if (len > this.remaining()) {
                throw new Error("Buffer overflow");
            }

            for (let i = 0; i < len; i++) {
                this.array[this._position++] = srcOrValue[offset + i];
            }
        }

        return this;
    }

    public get(index?: number): number {
        if (index !== undefined) {
            if (index < 0 || index >= this._limit) {
                throw new Error("Index out of bounds");
            }
            return this.array[index];
        } else {
            if (this._position >= this._limit) {
                throw new Error("Buffer underflow");
            }
            return this.array[this._position++];
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
    
    public remaining(): number {
        return this._limit - this._position;
    }
    
    public capacity(): number {
        return this._capacity;
    }

    public getRawArray(): Float32Array {
        return this.array;
    }

    public toFloat32Array(): Float32Array {
        return this.array.subarray(0, this._limit);
    }
}
