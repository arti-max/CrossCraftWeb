import type { Player } from "../Player";
import type { Chunk } from "./Chunk";

/**
 * Компаратор для сортировки "грязных" чанков по приоритету обновления.
 * Сначала сортирует по видимости, затем по расстоянию до игрока.
 */
export class DirtyChunkSorter {
    private player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    /**
     * Сравнивает два чанка для определения порядка сортировки.
     * @param c0 Первый чанк
     * @param c1 Второй чанк
     * @returns -1 если c0 должен быть перед c1, 1 если после, 0 если равны
     */
    public compare(c0: Chunk, c1: Chunk): number {
        const i0: boolean = c0.visible;
        const i1: boolean = c1.visible;
        
        if (i0 && !i1) {
            return -1; // c0 видимый, c1 не видимый - c0 приоритетнее
        } else if (i1 && !i0) {
            return 1;  // c1 видимый, c0 не видимый - c1 приоритетнее
        } else {
            // Оба видимые или оба невидимые - сортируем по расстоянию
            return c0.distanceToSqr(this.player) < c1.distanceToSqr(this.player) ? -1 : 1;
        }
    }

    /**
     * Создает функцию сравнения для использования с Array.sort()
     * @returns Функция сравнения совместимая с Array.sort()
     */
    public getCompareFn(): (a: Chunk, b: Chunk) => number {
        return (a: Chunk, b: Chunk) => this.compare(a, b);
    }
}
