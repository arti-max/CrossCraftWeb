import { Random } from "../../lib/UTIL/Random";
import { AABB } from "../phys/AABB";
import { PerlinNoiseFilter } from "./levelgen/PerlinNoiseFilter";
import type { LevelListener } from "./LevelListener";
import { Tile } from "./tile/TileDefenitions";



export class Level {
    public width: number;
    public height: number;
    public depth: number;

    public blocks: number[];
    public lightDepths: number[];

    public name!: string;
    public creator!: string;
    public creationTime!: BigInt;

    private levelListeners: Array<LevelListener> = new Array<LevelListener>();
    private random: Random;
     private liquidPositions: Set<number> = new Set();
    private readonly maxBits = 10;

    constructor(width: number, height: number, depth: number) {
        this.width = width;
        this.height = height;
        this.depth = depth;

        this.random = new Random();

        this.blocks = new Array<number>(width * height * depth);
        this.lightDepths = new Array<number>(width * height);

        // for (var x = 0; x < width; x++) {
        //     for (var y = 0; y < depth; y++) {
        //         for (var z = 0; z < height; z++) {
        //             var index: number = (y * this.height + z) * this.width + x;

        //             this.blocks[index] = ((y <= depth * 2 / 3) ? 1 : 0);;
        //         }
        //     }
        // }

        // this.generateMap();

        // this.calcLightDepths(0, 0, width, height);
    }

    public setData(w: number, d: number, h: number, blocks: number[]): void {
        this.width = w;
        this.height = h;
        this.depth = d;
        this.blocks = blocks;
        this.lightDepths = new Array<number>(w * h);
        this.calcLightDepths(0, 0, w, h);

        for (const listener of this.levelListeners) {
            listener.allChanged();
        }
    }

    public getGroundLevel(): number {
        return 32.0;
    }

    private generateMap(): void {
        var firstHeightMap: number[] = new PerlinNoiseFilter(0).read(this.width, this.height);
        var secondHeightMap: number[] = new PerlinNoiseFilter(0).read(this.width, this.height);
        var cliffMap: number[] = new PerlinNoiseFilter(1).read(this.width, this.height);
        var rockMap: number[] = new PerlinNoiseFilter(1).read(this.width, this.height);

        for (var x = 0; x < this.width; ++x) {
            for (var y = 0; y < this.depth; ++y) {
                for (var z = 0; z < this.height; ++z) {
                    var firstHeightValue: number = Math.floor(firstHeightMap[x + z * this.width]);
                    var secondHeightValue: number = Math.floor(secondHeightMap[x + z * this.width]);

                    if (cliffMap[x + z * this.width] < 128) {
                        secondHeightValue = firstHeightValue;
                    }

                    var maxLevelHeight: number = Math.floor(Math.max(secondHeightValue, firstHeightValue) / 8 + this.depth / 3);

                    var maxRockHeight: number = Math.floor(rockMap[x + z * this.width] / 8 + this.depth / 3);

                    if (maxRockHeight > maxLevelHeight - 2) {
                        maxRockHeight = maxLevelHeight - 2;
                    }

                    var index: number = (y * this.height + z) * this.width + x;

                    var id: number = 0;

                    // Grass layer
                    if (y == maxLevelHeight) {
                        // console.log("GRASS");
                        id = Tile.grass.id;
                    }

                    // Dirt layer
                    if (y < maxLevelHeight) {
                        // console.log("DIRT");
                        id = Tile.dirt.id;
                    }

                    // Rock layer
                    if (y <= maxRockHeight) {
                        // console.log("ROCK");
                        id = Tile.rock.id;
                    }

                    // console.log(id);

                    // Set the tile id
                    this.blocks[index] = id;
                }
            }
        }

        // console.log(this.blocks);
    }

    public tick(): void {
        this.tickLiquids();

        var totalTiles: number = this.width * this.height * this.depth;

        var ticks: number = totalTiles / 400;

        for (var i = 0; i < ticks; ++i) {
            var x = this.random.nextInt(this.width);
            var y = this.random.nextInt(this.depth);
            var z = this.random.nextInt(this.height);

            var tileId = this.getTile(x, y, z);
            var tile: Tile = Tile.tiles[tileId];
            if (tile != null && !this.isActiveLiquidTile(tileId)) {
                tile.tick(this, x, y, z, this.random);
            }
        }
    }

    private tickLiquids(): void {
        const positionsToUpdate = Array.from(this.liquidPositions);
        
        for (const positionCode of positionsToUpdate) {
            const [x, y, z] = this.decodePosition(positionCode);
            const tileId = this.getTile(x, y, z);
            const tile: Tile = Tile.tiles[tileId];
            
            if (tile != null) {
                if (tile.isCalmLiquid()) {
                    this.removeLiquidPosition(x, y, z);
                    continue;
                }
                tile.tick(this, x, y, z, this.random);
            }
        }
    }



    private calcLightDepths(minX: number, minZ: number, maxX: number, maxZ: number): void {
        for (var x = minX; x < minX + maxX; x++) {
            for (var z = minZ; z < minZ + maxZ; z++) {
                var prevDepth: number = this.lightDepths[x + z * this.width];

                var depth: number = this.depth - 1;
                while (depth > 0 && !this.isLightBlocker(x, depth, z)) {
                    depth--;
                }

                this.lightDepths[x + z * this.width] = depth;

                if (prevDepth != depth) {
                    var minTileChangeY = Math.min(prevDepth, depth);
                    var maxTileChangeY = Math.max(prevDepth, depth);

                    for (const listener of this.levelListeners) {
                        listener.lightColumnChanged(x, z, minTileChangeY, maxTileChangeY);
                    }
                }
            }
        }
    }

    /**
     * Return true if a tile is available at the given location
     *
     * @param x Level position x
     * @param y Level position y
     * @param z Level position z
     * @return Tile available
     */
    public isTile(x: number, y: number, z: number): boolean {
        if (x < 0 || y < 0 || z < 0 || x >= this.width || y >= this.depth || z >= this.height) {
            return false;
        }

        var index: number = (y * this.height + z) * this.width + x;

        return this.blocks[index] != 0;
    }

    /**
     * Returns true if tile is solid and not transparent
     *
     * @param x Tile position x
     * @param y Tile position y
     * @param z Tile position z
     * @return Tile is solid
     */
    public isSolidTile(x: number, y: number, z: number): boolean {
        var tile: Tile = Tile.tiles[this.getTile(x, y, z)];
        return tile != null && tile.isSolid();
    }

    /**
     * Returns true if the tile is blocking the light
     *
     * @param x Tile position x
     * @param y Tile position y
     * @param z Tile position z
     * @return Tile blocks the light
     */
    public isLightBlocker(x: number, y: number, z: number): boolean {
        var tile: Tile = Tile.tiles[this.getTile(x, y, z)];
        return tile != null && tile.blocksLight();
    }

    /**
     * Get brightness of a tile
     *
     * @param x Tile position x
     * @param y Tile position y
     * @param z Tile position z
     * @return The brightness value from 0 to 1
     */
    public getBrightness(x: number, y: number, z: number): number {
        var dark: number = 1.0;
        var light: number = 1.0;

        if (x < 0 || y < 0 || z < 0 || x >= this.width || y >= this.depth || z >= this.height) {
            return light;
        }

        if (y < this.lightDepths[x + z * this.width]) {
            return dark;
        }

        return light;
    }

    public isLit(x: number, y: number, z: number): boolean {
        if (x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.depth && z < this.height) {
            return y >= this.lightDepths[x + z * this.width];
        } else {
            return true;
        }
    }

    public getTile(x: number, y: number, z: number): number {
        if (x < 0 || y < 0 || z < 0 || x >= this.width || y >= this.depth || z >= this.height) {
            return 0;
        }
        var index: number = (y * this.height + z) * this.width + x;
        return this.blocks[index];
    }

    public setTile(x: number, y: number, z: number, type: number): boolean {
        if (x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.depth && z < this.height) {
            const index = (y * this.height + z) * this.width + x;
            const oldType = this.blocks[index];
            
            if (type == oldType) {
                return false;
            }

            if (this.isActiveLiquidTile(oldType)) {
                this.removeLiquidPosition(x, y, z);
            }
            if (this.isActiveLiquidTile(type)) {
                this.addLiquidPosition(x, y, z);
            }

            this.blocks[index] = type;
            
            this.neighborChanged(x - 1, y, z, type);
            this.neighborChanged(x + 1, y, z, type);
            this.neighborChanged(x, y - 1, z, type);
            this.neighborChanged(x, y + 1, z, type);
            this.neighborChanged(x, y, z - 1, type);
            this.neighborChanged(x, y, z + 1, type);
            this.calcLightDepths(x, z, 1, 1);
            
            for (var i = 0; i < this.levelListeners.length; ++i) {
                this.levelListeners[i].tileChanged(x, y, z);
            }
            
            return true;
        } else {
            return false;
        }
    }

    public setTileNoUpdate(x: number, y: number, z: number, type: number): boolean {
        if (x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.depth && z < this.height) {
            if (type == this.blocks[(y * this.height + z) * this.width + x]) {
                return false;
            } else {
                this.blocks[(y * this.height + z) * this.width + x] = type;
                return true;
            }
        } else {
            return false;
        }
    }

    private neighborChanged(x: number, y: number, z: number, type: number): void {
        if (x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.depth && z < this.height) {
            var tile: Tile = Tile.tiles[this.getTile(x, y, z)];
            if (tile != null) {
                tile.neighborChanged(this, x, y, z, type);
            }
        }
    }

    private isLiquidTile(tileId: number): boolean {
        return tileId === Tile.water.id || 
            tileId === Tile.calmWater.id || 
            tileId === Tile.lava.id || 
            tileId === Tile.calmLava.id;
    }

    private encodePosition(x: number, y: number, z: number): number {
        return (z << (this.maxBits * 2)) | (y << this.maxBits) | x;
    }

    private decodePosition(code: number): [number, number, number] {
        const mask = (1 << this.maxBits) - 1;
        const x = code & mask;
        const y = (code >> this.maxBits) & mask;
        const z = (code >> (this.maxBits * 2)) & mask;
        return [x, y, z];
    }

    private isActiveLiquidTile(tileId: number): boolean {
        // Только активные жидкости, НЕ спокойные (calm)
        return tileId === Tile.water.id || tileId === Tile.lava.id;
    }

    public addLiquidPosition(x: number, y: number, z: number): void {
        if (!this.liquidPositions.has(this.encodePosition(x, y, z))) {
            this.liquidPositions.add(this.encodePosition(x, y, z));
        }
    }

    public removeLiquidPosition(x: number, y: number, z: number): void {
        if (this.liquidPositions.has(this.encodePosition(x, y, z))) {
            this.liquidPositions.delete(this.encodePosition(x, y, z));
        }
    }

    public addListener(listener: LevelListener): void {
        this.levelListeners.push(listener);
    }

    /**
     * Get bounding box of all tiles surrounded by the given bounding box
     *
     * @param boundingBox Target bounding box located in the level
     * @return List of bounding boxes representing the tiles around the given bounding box
     */
    public getCubes(boundingBox: AABB): Array<AABB> {
        var boundingBoxList = new Array<AABB>();

        var minX: number = Math.floor(boundingBox.minX) - 1
        var maxX: number = Math.ceil(boundingBox.maxX) + 1
        var minY: number = Math.floor(boundingBox.minY) - 1
        var maxY: number = Math.ceil(boundingBox.maxY) + 1
        var minZ: number = Math.floor(boundingBox.minZ) - 1
        var maxZ: number = Math.ceil(boundingBox.maxZ) + 1

        for (var x = minX; x < maxX; ++x) {
            for (var y = minY; y < maxY; ++y) {
                for (var z = minZ; z < maxZ; ++z) {
                    if (x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.depth && z < this.height) {
                        var tile: Tile = Tile.tiles[this.getTile(x, y, z)];

                        if (tile != null) {

                            var aabb: AABB | null = tile.getAABB(x, y, z);
                            if (aabb != null) {
                                boundingBoxList.push(aabb)
                            }
                        }
                    } else if (x < 0 || y < 0 || z < 0 || x >= this.width || z >= this.height) {
                        var aabb: AABB | null = Tile.unbreakble.getAABB(x, y, z);
                        if (aabb != null) {
                            boundingBoxList.push(aabb);
                        }
                    }
                }
            }
        }
        
        return boundingBoxList;
    }
}