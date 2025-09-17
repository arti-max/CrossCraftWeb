// /lib/IO/Key.ts (Этот файл остается без изменений)
import { Key } from "./Key";

// Интерфейс события
interface KeyboardEventExt {
    key: number;
    state: boolean;
    character: string;
    timestamp: number;
    repeat: boolean;
}

export class Keyboard {
    // --- ИСПРАВЛЕНИЕ №1: Возвращаем `states` к работе со строками ('KeyW') ---
    private static states: Map<string, boolean> = new Map();
    
    // --- Очередь событий (остается без изменений) ---
    private static eventQueue: KeyboardEventExt[] = [];
    private static currentEvent: KeyboardEventExt | null = null;
    private static repeatEvents: boolean = false;

    // --- Маппинг кодов (остается без изменений) ---
    private static keyCodeMap: Map<string, number> = new Map([
        ['Escape', Key.ESCAPE], ['Digit1', Key.KEY_1], ['Digit2', Key.KEY_2], ['Digit3', Key.KEY_3], ['Digit4', Key.KEY_4],
        ['Digit5', Key.KEY_5], ['Digit6', Key.KEY_6], ['Digit7', Key.KEY_7], ['Digit8', Key.KEY_8], ['Digit9', Key.KEY_9],
        ['Digit0', Key.KEY_0], ['Minus', Key.MINUS], ['Equal', Key.EQUALS], ['Backspace', Key.BACK], ['Tab', Key.TAB],
        ['KeyQ', Key.Q], ['KeyW', Key.W], ['KeyE', Key.E], ['KeyR', Key.R], ['KeyT', Key.T], ['KeyY', Key.Y], ['KeyU', Key.U],
        ['KeyI', Key.I], ['KeyO', Key.O], ['KeyP', Key.P], ['BracketLeft', Key.LBRACKET], ['BracketRight', Key.RBRACKET],
        ['Enter', Key.RETURN], ['ControlLeft', Key.LCONTROL], ['KeyA', Key.A], ['KeyS', Key.S], ['KeyD', Key.D],
        ['KeyF', Key.F], ['KeyG', Key.G], ['KeyH', Key.H], ['KeyJ', Key.J], ['KeyK', Key.K], ['KeyL', Key.L],
        ['Semicolon', Key.SEMICOLON], ['Quote', Key.APOSTROPHE], ['Backquote', Key.GRAVE], ['ShiftLeft', Key.LSHIFT],
        ['Backslash', Key.BACKSLASH], ['KeyZ', Key.Z], ['KeyX', Key.X], ['KeyC', Key.C], ['KeyV', Key.V],
        ['KeyB', Key.B], ['KeyN', Key.N], ['KeyM', Key.M], ['Comma', Key.COMMA], ['Period', Key.PERIOD],
        ['Slash', Key.SLASH], ['ShiftRight', Key.RSHIFT], ['NumpadMultiply', Key.MULTIPLY], ['AltLeft', Key.LMENU],
        ['Space', Key.SPACE], ['CapsLock', Key.CAPITAL], ['F1', Key.F1], ['F2', Key.F2], ['F3', Key.F3], ['F4', Key.F4],
        ['F5', Key.F5], ['F6', Key.F6], ['F7', Key.F7], ['F8', Key.F8], ['F9', Key.F9], ['F10', Key.F10],
        ['NumLock', Key.NUMLOCK], ['ScrollLock', Key.SCROLL], ['Numpad7', Key.NUMPAD7], ['Numpad8', Key.NUMPAD8],
        ['Numpad9', Key.NUMPAD9], ['NumpadSubtract', Key.SUBTRACT], ['Numpad4', Key.NUMPAD4], ['Numpad5', Key.NUMPAD5],
        ['Numpad6', Key.NUMPAD6], ['NumpadAdd', Key.ADD], ['Numpad1', Key.NUMPAD1], ['Numpad2', Key.NUMPAD2],
        ['Numpad3', Key.NUMPAD3], ['Numpad0', Key.NUMPAD0], ['NumpadDecimal', Key.DECIMAL], ['F11', Key.F11],
        ['F12', Key.F12], ['NumpadEnter', Key.NUMPADENTER], ['ControlRight', Key.RCONTROL], ['ArrowUp', Key.UP],
        ['PageUp', Key.PRIOR], ['ArrowLeft', Key.LEFT], ['ArrowRight', Key.RIGHT], ['End', Key.END],
        ['ArrowDown', Key.DOWN], ['PageDown', Key.NEXT], ['Insert', Key.INSERT], ['Delete', Key.DELETE]
    ]);
    
    // Экспорт констант для доступа как `Keyboard.KEY_...`
    public static readonly KEY_BACK = Key.BACK;

    public static create(): void {
        window.addEventListener('keydown', (e) => {
            if (!this.repeatEvents && e.repeat) return;

            // --- ИСПРАВЛЕНИЕ №2: Сохраняем состояние по строковому коду `e.code` ---
            this.states.set(e.code, true);

            // Логика для очереди событий остается прежней (с числовыми кодами)
            const keyCode = this.keyCodeMap.get(e.code) || Key.NONE;
            const character = e.key.length === 1 ? e.key : '\0';

            this.eventQueue.push({
                key: keyCode,
                state: true,
                character: character,
                timestamp: performance.now(),
                repeat: e.repeat
            });
        });

        window.addEventListener('keyup', (e) => {
            // --- ИСПРАВЛЕНИЕ №3: Обновляем состояние по строковому коду `e.code` ---
            this.states.set(e.code, false);

            const keyCode = this.keyCodeMap.get(e.code) || Key.NONE;

            this.eventQueue.push({
                key: keyCode,
                state: false,
                character: '\0',
                timestamp: performance.now(),
                repeat: false
            });
        });
    }

    /**
     * Проверяет, нажата ли клавиша. Принимает строковый код (например, 'KeyW').
     * @param code Код клавиши из события `KeyboardEvent.code`.
     */
    public static isKeyDown(code: string): boolean {
        return this.states.get(code) || false;
    }

    // --- Остальные методы для работы с очередью событий остаются без изменений ---

    public static enableRepeatEvents(enabled: boolean): void {
        this.repeatEvents = enabled;
    }

    public static next(): boolean {
        if (this.eventQueue.length > 0) {
            this.currentEvent = this.eventQueue.shift()!;
            return true;
        }
        return false;
    }

    public static getEventKey(): number {
        return this.currentEvent?.key || 0;
    }

    public static getEventKeyState(): boolean {
        return this.currentEvent?.state || false;
    }

    public static getEventCharacter(): string {
        return this.currentEvent?.character || '\0';
    }
}
