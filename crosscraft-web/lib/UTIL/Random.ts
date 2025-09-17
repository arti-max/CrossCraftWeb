export class Random {
    private static readonly multiplier: bigint = 0x5DEECE66Dn;
    private static readonly addend: bigint = 0xBn;
    private static readonly mask: bigint = (1n << 48n) - 1n;

    private seed!: bigint;

    /**
     * Создает новый генератор случайных чисел.
     * Если seed не указан, используется текущее время.
     * @param seed Начальное значение (опционально).
     */
    constructor(seed?: number | bigint) {
        if (seed === undefined) {
            this.setSeed(BigInt(Date.now()));
        } else {
            this.setSeed(BigInt(seed));
        }
    }

    /**
     * Устанавливает начальное значение генератора.
     * @param seed Новое начальное значение.
     */
    public setSeed(seed: bigint): void {
        this.seed = (seed ^ Random.multiplier) & Random.mask;
    }

    /**
     * Внутренний метод для генерации следующего псевдослучайного числа.
     * @param bits Количество бит (от 1 до 32).
     * @returns {number}
     * @protected
     */
    protected next(bits: number): number {
        this.seed = (this.seed * Random.multiplier + Random.addend) & Random.mask;
        const result = Number(this.seed >> (48n - BigInt(bits)));
        return result;
    }

    /**
     * Возвращает следующее псевдослучайное число типа int (32-битное знаковое).
     * @returns {number} Случайное число между -2^31 и 2^31 - 1.
     */
    public nextInt(bound?: number): number {
        if (bound === undefined) {
            return this.next(32);
        }

        if (bound <= 0) {
            throw new Error("bound must be positive");
        }

        // Если bound является степенью двойки, можно оптимизировать
        if ((bound & -bound) === bound) {
            const r = this.next(31);
            const val = BigInt(bound) * BigInt(r);
            return Number(val >> 31n);
        }

        let bits: number, val: number;
        do {
            bits = this.next(31);
            val = bits % bound;
        } while (bits - val + (bound - 1) < 0);

        return val;
    }

    /**
     * Возвращает следующее псевдослучайное число типа long (64-битное).
     * В TypeScript возвращается как bigint.
     * @returns {bigint}
     */
    public nextLong(): bigint {
        const high = BigInt(this.next(32));
        const low = BigInt(this.next(32));
        return (high << 32n) + low;
    }

    /**
     * Возвращает следующее псевдослучайное число с плавающей точкой между 0.0 (включительно) и 1.0 (не включая).
     * @returns {number}
     */
    public nextFloat(): number {
        return this.next(24) / (1 << 24);
    }
    
    /**
     * Возвращает следующее псевдослучайное число с плавающей точкой двойной точности между 0.0 (включительно) и 1.0 (не включая).
     * @returns {number}
     */
    public nextDouble(): number {
        const high = BigInt(this.next(26));
        const low = BigInt(this.next(27));
        const value = (high << 27n) + low;
        return Number(value) / Number(1n << 53n);
    }

    /**
     * Возвращает следующее псевдослучайное число с Гауссовым распределением 
     * со средним значением 0.0 и стандартным отклонением 1.0.
     * @returns {number}
     */
    public nextGaussian(): number {
        // Используется метод Бокса-Мюллера
        let v1: number, v2: number, s: number;
        do {
            v1 = 2 * this.nextDouble() - 1; // между -1.0 и 1.0
            v2 = 2 * this.nextDouble() - 1; // между -1.0 и 1.0
            s = v1 * v1 + v2 * v2;
        } while (s >= 1 || s === 0);

        const multiplier = Math.sqrt(-2 * Math.log(s) / s);
        return v1 * multiplier;
    }

    /**
     * Возвращает следующее псевдослучайное булево значение.
     * @returns {boolean}
     */
    public nextBoolean(): boolean {
        return this.next(1) !== 0;
    }
}
