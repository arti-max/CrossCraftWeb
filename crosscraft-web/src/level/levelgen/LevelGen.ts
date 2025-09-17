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

        this.levelLoaderListener.levelLoadUpdate("Carving...");
        this.carveTunnels();


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
}
