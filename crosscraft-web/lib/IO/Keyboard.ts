// Интерфейс для хранения события клавиатуры
interface KeyboardEvent {
    key: number;
    state: boolean;
    timestamp: number;
}

export class Keyboard {
    // Карта для хранения состояния всех клавиш (true - нажата, false - отпущена)
    private static states: Map<string, boolean> = new Map();
    
    // Очередь событий клавиатуры для буферизации
    private static eventQueue: KeyboardEvent[] = [];
    
    // Текущее событие для обработки
    private static currentEvent: KeyboardEvent | null = null;
    
    // Маппинг кодов клавиш для совместимости с LWJGL
    private static keyCodeMap: Map<string, number> = new Map([
        ['Escape', 1], ['Digit1', 2], ['Digit2', 3], ['Digit3', 4], ['Digit4', 5],
        ['Digit5', 6], ['Digit6', 7], ['Digit7', 8], ['Digit8', 9], ['Digit9', 10],
        ['Digit0', 11], ['Enter', 28], ['KeyR', 19], ['KeyY', 21], ['KeyG', 34], ['KeyF', 33]
    ]);

    /**
     * Инициализирует слушателей событий клавиатуры. 
     * Должен быть вызван один раз при старте игры.
     */
    public static create(): void {
        window.addEventListener('keydown', (e) => {
            this.states.set(e.code, true);
            
            // Добавляем событие в очередь
            const keyCode = this.keyCodeMap.get(e.code) || 0;
            this.eventQueue.push({
                key: keyCode,
                state: true,
                timestamp: performance.now()
            });
        });

        window.addEventListener('keyup', (e) => {
            this.states.set(e.code, false);
            
            // Добавляем событие в очередь
            const keyCode = this.keyCodeMap.get(e.code) || 0;
            this.eventQueue.push({
                key: keyCode,
                state: false,
                timestamp: performance.now()
            });
        });
    }

    /**
     * Проверяет, нажата ли в данный момент указанная клавиша.
     * @param code Код клавиши (например, 'KeyW', 'Space', 'ArrowUp').
     * @returns {boolean} True, если клавиша нажата.
     */
    public static isKeyDown(code: string): boolean {
        return this.states.get(code) || false;
    }

    /**
     * Читает следующее событие клавиатуры из очереди.
     * Аналог Keyboard.next() из LWJGL.
     * @returns {boolean} True, если событие было прочитано, false если очередь пуста.
     */
    public static next(): boolean {
        if (this.eventQueue.length > 0) {
            this.currentEvent = this.eventQueue.shift()!;
            return true;
        }
        return false;
    }

    /**
     * Получает код клавиши из текущего события.
     * Аналог Keyboard.getEventKey() из LWJGL.
     * @returns {number} Код клавиши или 0 если нет текущего события.
     */
    public static getEventKey(): number {
        return this.currentEvent?.key || 0;
    }

    /**
     * Получает состояние клавиши из текущего события.
     * Аналог Keyboard.getEventKeyState() из LWJGL.
     * @returns {boolean} True если клавиша нажата, false если отпущена.
     */
    public static getEventKeyState(): boolean {
        return this.currentEvent?.state || false;
    }

    /**
     * Получает количество событий в очереди.
     * @returns {number} Количество непрочитанных событий.
     */
    public static getNumKeyboardEvents(): number {
        return this.eventQueue.length;
    }

    /**
     * Очищает очередь событий клавиатуры.
     */
    public static clearEventQueue(): void {
        this.eventQueue.length = 0;
        this.currentEvent = null;
    }
}
