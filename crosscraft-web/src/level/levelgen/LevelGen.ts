import { Random } from "../../../lib/UTIL/Random";
import type { Level } from "../Level";
import type { LevelLoaderListener } from "../LevelLoaderListener";
import { Tile } from "../tile/TileDefenitions";
import { PerlinNoiseFilter } from "./PerlinNoiseFilter";

export class LevelGen {
    private levelLoaderListener: LevelLoaderListener;
    private width: number = 0;
    private height: number = 0;
    private depth: number = 0;
    private random: Random = new Random();
    private blocks: number[] = [];
    private coords: number[] = new Array(1048576); // Координатный буфер как в Java

    constructor(levelLoaderListener: LevelLoaderListener) {
        this.levelLoaderListener = levelLoaderListener;
    }

    public async generateLevel(level: Level, userName: string, width: number, height: number, depth: number) {
        this.levelLoaderListener.beginLevelLoading("Generating level");

        await this.levelLoaderListener.levelLoadUpdate("Raising...");

        this.width = width;
        this.height = height;
        this.depth = depth;
        this.blocks = new Array(width * height * depth).fill(0);

        const heightMap = this.buildHeightmap(width, height);

        await this.levelLoaderListener.levelLoadUpdate("Eroding...");
        this.buildBlocksFromHeightmap(heightMap);

        await this.levelLoaderListener.levelLoadUpdate("Carving...");
        this.carveTunnels();

        await this.levelLoaderListener.levelLoadUpdate("Watering...");
        this.addWater();

        await this.levelLoaderListener.levelLoadUpdate("Melting...");
        this.addLava();

        level.setData(width, depth, height, this.blocks);
        level.creationTime = BigInt(Date.now());
        level.creator = userName;
        level.name = "A Nice World";

        await this.levelLoaderListener.levelLoadUpdate("Generation complete");
        await this.sleep(500);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    private buildBlocksFromHeightmap(heightMap: number[]): void {
        const cliffMap = new PerlinNoiseFilter(1).read(this.width, this.height);
        const rockMap = new PerlinNoiseFilter(1).read(this.width, this.height);

        for (let x = 0; x < this.width; ++x) {
            for (let z = 0; z < this.height; ++z) {
                const firstHeightValue = heightMap[x + z * this.width] / 8 + this.depth / 3;
                let secondHeightValue = heightMap[x + z * this.width] / 8 + this.depth / 3;
                
                if (cliffMap[x + z * this.width] < 128) {
                    secondHeightValue = firstHeightValue;
                }

                const maxLevelHeight = Math.floor(Math.max(firstHeightValue, secondHeightValue));
                let maxRockHeight = Math.floor(rockMap[x + z * this.width] / 8 + this.depth / 3);

                if (maxRockHeight > maxLevelHeight - 2) {
                    maxRockHeight = maxLevelHeight - 2;
                }

                for (let y = 0; y < this.depth; ++y) {
                    const index = (y * this.height + z) * this.width + x;
                    let id = 0;
                    if (y === maxLevelHeight) id = Tile.grass.id;
                    else if (y < maxLevelHeight) id = Tile.dirt.id;
                    if (y <= maxRockHeight) id = Tile.rock.id;
                    this.blocks[index] = id;
                }
            }
        }
    }

    private buildHeightmap(width: number, height: number): number[] {
        return new PerlinNoiseFilter(0).read(width, height);
    }

    public carveTunnels(): void {
        const w = this.width;
        const h = this.height;
        const d = this.depth;
        const count = Math.floor(w * h * d / 256 / 64);

        for (let i = 0; i < count; ++i) {
            let x = this.random.nextFloat() * w;
            let y = this.random.nextFloat() * d;
            let z = this.random.nextFloat() * h;
            const length = Math.floor((this.random.nextFloat() + this.random.nextFloat()) * 150);
            
            let yaw = this.random.nextFloat() * Math.PI * 2.0;
            let pitch = 0.0;
            let yawMod = 0.0;
            let pitchMod = 0.0;

            for (let l = 0; l < length; ++l) {
                x += Math.sin(yaw) * Math.cos(pitch);
                z += Math.cos(yaw) * Math.cos(pitch);
                y += Math.sin(pitch);
                
                yaw += yawMod * 0.2;
                yawMod = (yawMod * 0.9) + (this.random.nextFloat() - this.random.nextFloat());
                pitch = (pitch + pitchMod * 0.5) * 0.5;
                pitchMod = (pitchMod * 0.9) + (this.random.nextFloat() - this.random.nextFloat());

                const size = Math.sin(l * Math.PI / length) * 2.5 + 1.0;

                for (let xx = Math.floor(x - size); xx <= Math.floor(x + size); ++xx) {
                    for (let yy = Math.floor(y - size); yy <= Math.floor(y + size); ++yy) {
                        for (let zz = Math.floor(z - size); zz <= Math.floor(z + size); ++zz) {
                            const xd = xx - x;
                            const yd = yy - y;
                            const zd = zz - z;
                            const distSq = xd * xd + yd * yd * 2.0 + zd * zd;
                            
                            if (distSq < size * size && xx >= 1 && yy >= 1 && zz >= 1 && xx < this.width - 1 && yy < this.depth - 1 && zz < this.height - 1) {
                                const index = (yy * this.height + zz) * this.width + xx;
                                if (this.blocks[index] === Tile.rock.id) {
                                    this.blocks[index] = 0;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Добавляет воду в мир
     */
    public addWater(): void {
        const before = performance.now();
        let tiles = 0;
        const source = 0; // Пустое пространство
        const target = Tile.calmWater.id;

        // Добавляем воду по краям мира на уровне depth/2-1
        for (let i = 0; i < this.width; ++i) {
            tiles += this.floodFillLiquid(i, Math.floor(this.depth / 2) - 1, 0, source, target);
            tiles += this.floodFillLiquid(i, Math.floor(this.depth / 2) - 1, this.height - 1, source, target);
        }

        for (let i = 0; i < this.height; ++i) {
            tiles += this.floodFillLiquid(0, Math.floor(this.depth / 2) - 1, i, source, target);
            tiles += this.floodFillLiquid(this.width - 1, Math.floor(this.depth / 2) - 1, i, source, target);
        }

        // Добавляем случайные источники воды
        for (let i = 0; i < Math.floor(this.width * this.height / 5000); ++i) {
            const x = this.random.nextInt(this.width);
            const y = Math.floor(this.depth / 2) - 1;
            const z = this.random.nextInt(this.height);
            const index = (y * this.height + z) * this.width + x;
            if (this.blocks[index] === 0) {
                tiles += this.floodFillLiquid(x, y, z, 0, target);
            }
        }

        const after = performance.now();
        console.log(`Flood filled ${tiles} tiles in ${after - before} ms`);
    }

    /**
     * Добавляет лаву в мир
     */
    public addLava(): void {
        let lavaCount = 0;

        for (let i = 0; i < Math.floor(this.width * this.height * this.depth / 10000); ++i) {
            const x = this.random.nextInt(this.width);
            const y = this.random.nextInt(Math.floor(this.depth / 2)); // Лава только в нижней половине
            const z = this.random.nextInt(this.height);
            const index = (y * this.height + z) * this.width + x;
            
            if (this.blocks[index] === 0) {
                ++lavaCount;
                this.floodFillLiquid(x, y, z, 0, Tile.calmLava.id);
            }
        }

        console.log(`LavaCount: ${lavaCount}`);
    }

    /**
     * Заливает жидкость от заданной точки
     */
    public floodFillLiquid(x: number, y: number, z: number, source: number, target: number): number {
        const coordBuffer: number[][] = [];
        let p = 0;
        
        // Упрощенная система координат (без битовых операций как в Java)
        let tiles = 0;
        const upStep = this.width * this.height;
        
        // Добавляем начальную координату
        this.coords[p++] = this.getCoordIndex(x, y, z);

        while (p > 0) {
            --p;
            const cl = this.coords[p];
            
            // Распаковываем координаты
            const coords = this.unpackCoord(cl);
            var x0 = coords[0];
            var y0 = coords[1];
            var z0 = coords[2];

            // Если буфер переполнен, создаем новый
            if (p === 0 && coordBuffer.length > 0) {
                this.coords = coordBuffer.pop()!;
                p = this.coords.length;
            }

            // Ищем горизонтальную линию пустых блоков
            let x1 = x0;
            let currentIndex = (y0 * this.height + z0) * this.width + x0;
            
            // Идем влево
            while (x0 > 0 && this.blocks[currentIndex - 1] === source) {
                currentIndex--;
                x0--;
            }

            // Идем вправо
            while (x1 < this.width && this.blocks[currentIndex + (x1 - x0)] === source) {
                x1++;
            }

            // Заливаем линию и проверяем соседей
            let lastNorth = false;
            let lastSouth = false; 
            let lastBelow = false;
            
            tiles += (x1 - x0);

            for (let xx = x0; xx < x1; ++xx) {
                this.blocks[currentIndex] = target;

                // Проверяем север (z-1)
                if (z0 > 0) {
                    const north = this.blocks[currentIndex - this.width] === source;
                    if (north && !lastNorth) {
                        if (p === this.coords.length) {
                            coordBuffer.push(this.coords);
                            this.coords = new Array(1048576);
                            p = 0;
                        }
                        this.coords[p++] = this.getCoordIndex(xx, y0, z0 - 1);
                    }
                    lastNorth = north;
                }

                // Проверяем юг (z+1)
                if (z0 < this.height - 1) {
                    const south = this.blocks[currentIndex + this.width] === source;
                    if (south && !lastSouth) {
                        if (p === this.coords.length) {
                            coordBuffer.push(this.coords);
                            this.coords = new Array(1048576);
                            p = 0;
                        }
                        this.coords[p++] = this.getCoordIndex(xx, y0, z0 + 1);
                    }
                    lastSouth = south;
                }

                // Проверяем низ (y-1)
                if (y0 > 0) {
                    const belowId = this.blocks[currentIndex - upStep];
                    
                    // Лава превращает воду в камень
                    if ((target === Tile.lava.id || target === Tile.calmLava.id) && 
                        (belowId === Tile.water.id || belowId === Tile.calmWater.id)) {
                        this.blocks[currentIndex - upStep] = Tile.rock.id;
                    }

                    const below = belowId === source;
                    if (below && !lastBelow) {
                        if (p === this.coords.length) {
                            coordBuffer.push(this.coords);
                            this.coords = new Array(1048576);
                            p = 0;
                        }
                        this.coords[p++] = this.getCoordIndex(xx, y0 - 1, z0);
                    }
                    lastBelow = below;
                }

                currentIndex++;
            }
        }

        return tiles;
    }

    /**
     * Упаковывает координаты в одно число
     */
    private getCoordIndex(x: number, y: number, z: number): number {
        return (y * this.height + z) * this.width + x;
    }

    /**
     * Распаковывает координаты из числа
     */
    private unpackCoord(index: number): [number, number, number] {
        const x = index % this.width;
        const temp = Math.floor(index / this.width);
        const z = temp % this.height;
        const y = Math.floor(temp / this.height);
        return [x, y, z];
    }
}
