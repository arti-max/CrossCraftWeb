export class Timer {
    private static readonly NS_PER_SECOND = 1_000_000_000;
    private static readonly MAX_NS_PER_UPDATE = 1_000_000_000;
    private static readonly MAX_TICKS_PER_UPDATE = 100;

    private readonly ticksPerSecond: number;
    
    private lastTime: number;

    public timeScale: number = 1.0;

    public fps: number = 0.0;

    public passedTime: number = 0.0;

    public ticks: number = 0;

    public partialTicks: number = 0.0;

    /**
     * Таймер для контроля скорости тиков независимо от FPS.
     * @param ticksPerSecond Целевое количество тиков в секунду (например, 20).
     */
    public constructor(ticksPerSecond: number) {
        this.ticksPerSecond = ticksPerSecond;
        this.lastTime = performance.now() * 1_000_000;
    }

    public advanceTime(): void {
        const now = performance.now() * 1_000_000;
        let passedNs = now - this.lastTime;
        this.lastTime = now;

        passedNs = Math.max(0, passedNs);
        passedNs = Math.min(Timer.MAX_NS_PER_UPDATE, passedNs);

        this.fps = Timer.NS_PER_SECOND / passedNs;

        this.passedTime += passedNs * this.timeScale * this.ticksPerSecond / Timer.NS_PER_SECOND;
        
        this.ticks = Math.floor(this.passedTime);
        this.ticks = Math.min(Timer.MAX_TICKS_PER_UPDATE, this.ticks);

        this.passedTime -= this.ticks;

        this.partialTicks = this.passedTime;
    }
}
