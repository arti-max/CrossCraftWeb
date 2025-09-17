export class Mouse {
    // --- Состояние курсора ---
    private static _x: number = 0;
    private static _y: number = 0;
    private static _dx: number = 0;
    private static _dy: number = 0;
    private static _dwheel: number = 0;
    private static _isGrabbed: boolean = false;
    
    // --- Состояние кнопок ---
    private static buttonStates: Map<number, boolean> = new Map();

    // --- Очередь событий ---
    // Теперь храним больше информации о каждом событии
    private static events: { 
        button: number, 
        state: boolean, 
        x: number, 
        y: number, 
        dwheel: number 
    }[] = [];
    private static eventIndex: number = 0;
    
    private static element: HTMLElement | null = null;

    /**
     * Инициализирует слушателей мыши.
     */
    public static create(element: HTMLElement): void {
        if (this.element) return; // Предотвращаем повторную инициализацию
        this.element = element;

        // --- Захват курсора (Pointer Lock) ---
        document.addEventListener('pointerlockchange', () => {
            this._isGrabbed = document.pointerLockElement === element;
        }, false);

        // --- Движение мыши ---
        element.addEventListener('mousemove', (e: MouseEvent) => {
            // --- НАЧАЛО ИСПРАВЛЕНИЙ ---
            const rect = (this.element as HTMLElement).getBoundingClientRect();
            this._x = e.clientX - rect.left;
            this._y = (this.element as HTMLElement).clientHeight - (e.clientY - rect.top);
            // --- КОНЕЦ ИСПРАВЛЕНИЙ ---

            if (this._isGrabbed) {
                this._dx += e.movementX;
                this._dy += e.movementY;
            }
        }, false);

        // --- События кнопок ---
        element.addEventListener('mousedown', (e: MouseEvent) => {
            const rect = (this.element as HTMLElement).getBoundingClientRect();
            const eventX = e.clientX - rect.left;
            const eventY = (this.element as HTMLElement).clientHeight - (e.clientY - rect.top);
            
            this.buttonStates.set(e.button, true);
            this.events.push({ 
                button: e.button, 
                state: true, 
                x: eventX,
                y: eventY,
                dwheel: 0
            });
        }, false);

        element.addEventListener('mouseup', (e: MouseEvent) => {
            const rect = (this.element as HTMLElement).getBoundingClientRect();
            const eventX = e.clientX - rect.left;
            const eventY = (this.element as HTMLElement).clientHeight - (e.clientY - rect.top);

            this.buttonStates.set(e.button, false);
            this.events.push({ 
                button: e.button, 
                state: false, 
                x: eventX,
                y: eventY,
                dwheel: 0
            });
        }, false);

        // --- Колесо мыши ---
        element.addEventListener('wheel', (e: WheelEvent) => {
            // Предотвращаем прокрутку страницы
            e.preventDefault();
            
            // LWJGL возвращает положительные значения при прокрутке вверх,
            // в то время как `deltaY` отрицательный. Инвертируем.
            const wheelDelta = -Math.sign(e.deltaY); 
            
            this._dwheel += wheelDelta;
            this.events.push({ 
                button: -1, // -1 для событий колеса
                state: false, 
                x: this._x, 
                y: this._y,
                dwheel: wheelDelta
            });
        }, { passive: false });
    }

    /**
     * Управляет захватом курсора мыши.
     */
    public static setGrabbed(grab: boolean): void {
        if (!this.element) return;
        this._isGrabbed = grab;
        if (grab) {
            this.element.requestPointerLock(); 
        } else {
            document.exitPointerLock();
        }
    }
    
    /**
     * Проверяет, захвачен ли курсор.
     */
    public static isGrabbed(): boolean {
        return this._isGrabbed;
    }

    /**
     * Возвращает смещение мыши по оси X с последнего вызова.
     */
    public static getDX(): number {
        const dx = this._dx;
        this._dx = 0;
        return dx;
    }

    /**
     * Возвращает смещение мыши по оси Y с последнего вызова.
     */
    public static getDY(): number {
        // LWJGL инвертирует Y, но Pointer Lock API уже предоставляет "сырые" данные,
        // которые обычно не требуют инверсии для поворота камеры.
        // Если камера вращается не в ту сторону, верните "-dy".
        const dy = this._dy;
        this._dy = 0;
        return dy;
    }
    
    /**
     * Возвращает абсолютную X координату курсора относительно окна.
     */
    public static getX(): number {
        return this._x;
    }
    
    /**
     * Возвращает абсолютную Y координату курсора (0 внизу).
     */
    public static getY(): number {
        return this._y;
    }

    /**
     * Проверяет, зажата ли указанная кнопка мыши в данный момент.
     * @param button 0 - левая, 1 - средняя, 2 - правая.
     */
    public static isButtonDown(button: number): boolean {
        return this.buttonStates.get(button) || false;
    }
    
    /**
     * Возвращает изменение колеса мыши с последнего вызова.
     */
    public static getDWheel(): number {
        const dwheel = this._dwheel;
        this._dwheel = 0;
        return dwheel;
    }

    // --- Обработка очереди событий ---

    /**
     * Переключает на следующее событие в очереди.
     * @returns True, если есть следующее событие.
     */
    public static next(): boolean {
        if (this.eventIndex < this.events.length) {
            this.eventIndex++;
            return true;
        }
        // Если дошли до конца, очищаем очередь для новых событий
        this.events = [];
        this.eventIndex = 0;
        return false;
    }

    private static getCurrentEvent() {
        if (this.eventIndex > 0 && this.eventIndex <= this.events.length) {
            return this.events[this.eventIndex - 1];
        }
        return null;
    }

    /**
     * Возвращает ID кнопки для текущего события (-1 если событие не от кнопки).
     */
    public static getEventButton(): number {
        return this.getCurrentEvent()?.button ?? -1;
    }

    /**
     * Возвращает состояние кнопки для текущего события (true - нажата).
     */
    public static getEventButtonState(): boolean {
        return this.getCurrentEvent()?.state ?? false;
    }
    
    /**
     * Возвращает X координату мыши для текущего события.
     */
    public static getEventX(): number {
        return this.getCurrentEvent()?.x ?? 0;
    }
    
    /**
     * Возвращает Y координату мыши для текущего события.
     */
    public static getEventY(): number {
        return this.getCurrentEvent()?.y ?? 0;
    }
    
    /**
     * Возвращает изменение колеса мыши для текущего события.
     */
    public static getEventDWheel(): number {
        return this.getCurrentEvent()?.dwheel ?? 0;
    }

    // --- Методы-заглушки для совместимости ---

    /**
     * В браузере невозможно программно установить позицию курсора.
     */
    public static setCursorPosition(x: number, y: number): void {
        console.warn("Mouse.setCursorPosition() is not supported in browsers.");
    }
    
    /**
     * В браузере события обрабатываются асинхронно, этот метод не требуется.
     */
    public static updateCursor(): void {
        // No-op in browser environment
    }
    
    /**
     * Очистка слушателей происходит автоматически.
     */
    public static destroy(): void {
        // Event listeners are garbage collected with the element.
    }
}
