export class Mouse {
    private static _dx: number = 0;
    private static _dy: number = 0;
    private static _isGrabbed: boolean = false;
    
    // Карта для хранения состояния кнопок мыши
    private static buttonStates: Map<number, boolean> = new Map();

    // Очередь событий кнопок, как в LWJGL
    private static buttonEvents: { button: number, state: boolean }[] = [];
    private static eventIndex: number = 0;
    
    private static element: HTMLElement | null = null;

    /**
     * Инициализирует слушателей мыши для указанного элемента.
     * @param element Элемент (обычно canvas), который будет захватывать мышь.
     */
    public static create(element: HTMLElement): void {
        this.element = element;
        // --- Движение мыши (Pointer Lock API) ---
        document.addEventListener('pointerlockchange', () => {
            this._isGrabbed = document.pointerLockElement === element;
        });

        element.addEventListener('mousemove', (e: MouseEvent) => {
            if (this._isGrabbed) {
                this._dx += e.movementX;
                this._dy += e.movementY;
            }
        });

        // --- События кнопок ---
        element.addEventListener('mousedown', (e: MouseEvent) => {
            this.buttonStates.set(e.button, true);
            this.buttonEvents.push({ button: e.button, state: true });
        });

        element.addEventListener('mouseup', (e: MouseEvent) => {
            this.buttonStates.set(e.button, false);
            this.buttonEvents.push({ button: e.button, state: false });
        });
    }

    /**
     * Возвращает смещение мыши по оси X с последнего вызова.
     * @returns {number}
     */
    public static getDX(): number {
        const dx = this._dx;
        this._dx = 0; // Сбрасываем дельту после чтения
        return dx;
    }

    /**
     * Возвращает смещение мыши по оси Y с последнего вызова.
     * @returns {number}
     */
    public static getDY(): number {
        const dy = this._dy;
        this._dy = 0; // Сбрасываем дельту после чтения
        return dy;
    }

    /**
     * Проверяет, зажата ли указанная кнопка мыши в данный момент.
     * @param button 0 - левая, 1 - средняя, 2 - правая
     * @returns {boolean}
     */
    public static isButtonDown(button: number): boolean {
        return this.buttonStates.get(button) || false;
    }

    /**
     * Переключает на следующее событие в очереди.
     * @returns {boolean} True, если есть следующее событие.
     */
    public static next(): boolean {
        if (this.eventIndex < this.buttonEvents.length) {
            this.eventIndex++;
            return true;
        }
        // Если дошли до конца, очищаем очередь для новых событий
        this.buttonEvents = [];
        this.eventIndex = 0;
        return false;
    }

    /**
     * Возвращает ID кнопки для текущего события.
     * @returns {number}
     */
    public static getEventButton(): number {
        if (this.eventIndex > 0 && this.eventIndex <= this.buttonEvents.length) {
            return this.buttonEvents[this.eventIndex - 1].button;
        }
        return -1;
    }

    /**
     * Возвращает состояние кнопки для текущего события (true - нажата).
     * @returns {boolean}
     */
    public static getEventButtonState(): boolean {
        if (this.eventIndex > 0 && this.eventIndex <= this.buttonEvents.length) {
            return this.buttonEvents[this.eventIndex - 1].state;
        }
        return false;
    }

    /**
     * Управляет захватом курсора мыши.
     * @param grab True для захвата, false для освобождения.
     */
    public static setGrabbed(grab: boolean): void {
        if (!this.element) return; // Защита, если не инициализировано

        if (grab) {
            // Запрашиваем захват для нашего canvas
            this.element.requestPointerLock(); 
        } else {
            document.exitPointerLock();
        }
    }
    
    /**
     * В вебе этот метод не нужен, но оставляем для совместимости API.
     */
    public static destroy(): void {
        // В браузере слушатели удаляются автоматически при уходе со страницы.
        console.log("Mouse listeners will be garbage collected.");
    }
}
