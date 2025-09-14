import type { Player } from "../Player";
import type { Chunk } from "./Chunk";

/**
 * Компаратор для сортировки чанков по расстоянию до игрока.
 * Ближайшие чанки будут первыми в отсортированном массиве.
 */
export class DistanceSorter {
    private player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    /**
     * Сравнивает два чанка по расстоянию до игрока.
     * @param c0 Первый чанк
     * @param c1 Второй чанк
     * @returns -1 если c0 ближе к игроку, 1 если c1 ближе
     */
    public compare(c0: Chunk, c1: Chunk): number {
        return c0.distanceToSqr(this.player) < c1.distanceToSqr(this.player) ? -1 : 1;
    }

    /**
     * Создает функцию сравнения для использования с Array.sort()
     * @returns Функция сравнения совместимая с Array.sort()
     */
    public getCompareFn(): (a: Chunk, b: Chunk) => number {
        return (a: Chunk, b: Chunk) => this.compare(a, b);
    }
}
