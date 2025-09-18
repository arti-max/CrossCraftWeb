import type { Random } from "../../../lib/UTIL/Random";
import type { Level } from "../Level";
import { Tile } from "./Tile";
import type { Tessellator } from "../../render/Tessellator";
import { AABB } from "../../phys/AABB";

export class LiquidTile extends Tile {
    protected liquidType: number;
    protected calmTileId: number;
    protected tileId: number;
    protected spreadSpeed: number = 1;

    constructor(id: number, liquidType: number) {
        super(id);
        this.liquidType = liquidType;
        if (liquidType == 2) {
            this.textureId = 30;
        } else {
            this.textureId = 14;
        }

        if (liquidType == 1) {
            this.spreadSpeed = 8;
        }

        if (liquidType == 2) {
            this.spreadSpeed = 2;
        }

        this.tileId = id;
        this.calmTileId = id + 1;
        const dd: number = 0.1;
        this.setShape(0.0, 0.0 - dd, 0.0, 1.0, 1.0 - dd, 1.0);
    }

    public tick(level: Level, x: number, y: number, z: number, random: Random): void {
        this.updateWater(level, x, y, z, 0);
    }

    public updateWater(level: Level, x: number, y: number, z: number, depth: number): boolean {
        let hasChanged: boolean = false;

        let change: boolean;
        do {
            --y;
            if (level.getTile(x, y, z) != 0) {
                break;
            }
            change = level.setTile(x, y, z, this.tileId);
            if (change) {
                hasChanged = true;
            }
        } while (change && this.liquidType != 2);

        ++y;
        if (this.liquidType == 1 || !hasChanged) {
            hasChanged = hasChanged || this.checkWater(level, x - 1, y, z, depth);
            hasChanged = hasChanged || this.checkWater(level, x + 1, y, z, depth);
            hasChanged = hasChanged || this.checkWater(level, x, y, z - 1, depth);
            hasChanged = hasChanged || this.checkWater(level, x, y, z + 1, depth);
        }

        if (!hasChanged) {
            level.setTileNoUpdate(x, y, z, this.calmTileId);
        }

        return hasChanged;
    }

    private checkWater(level: Level, x: number, y: number, z: number, depth: number): boolean {
        let hasChanged: boolean = false;
        const type: number = level.getTile(x, y, z);
        if (type == 0) {
            const changed: boolean = level.setTile(x, y, z, this.tileId);
            if (changed && depth < this.spreadSpeed) {
                hasChanged = hasChanged || this.updateWater(level, x, y, z, depth + 1);
            }
        }

        return hasChanged;
    }

    protected shouldRenderFace(level: Level, x: number, y: number, z: number, layer: number, face: number): boolean {
        if (x >= 0 && y >= 0 && z >= 0 && x < level.width && z < level.height) {
            if (layer != 2 && this.liquidType == 1) {
                return false;
            } else {
                const id: number = level.getTile(x, y, z);
                return id != this.tileId && id != this.calmTileId ? super.shouldRenderFace(level, x, y, z, -1, face) : false;
            }
        } else {
            return false;
        }
    }

    public renderFace(t: Tessellator, x: number, y: number, z: number, face: number): void {
        super.renderFace(t, x, y, z, face);
        super.renderBackFace(t, x, y, z, face);
    }

    public mayPick(): boolean {
        return false;
    }

    public getAABB(x: number, y: number, z: number): AABB | null {
        return null;
    }

    public blocksLight(): boolean {
        return true;
    }

    public isSolid(): boolean {
        return false;
    }

    public getLiquidType(): number {
        return this.liquidType;
    }

    public neighborChanged(level: Level, x: number, y: number, z: number, type: number): void {
        if (this.liquidType == 1 && (type == Tile.lava.id || type == Tile.calmLava.id)) {
            level.setTileNoUpdate(x, y, z, Tile.rock.id);
        }

        if (this.liquidType == 2 && (type == Tile.water.id || type == Tile.calmWater.id)) {
            level.setTileNoUpdate(x, y, z, Tile.rock.id);
        }
    }
}
