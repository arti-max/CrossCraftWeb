import type { Random } from "../../../lib/UTIL/Random";
import type { AABB } from "../../phys/AABB";
import type { Tessellator } from "../../render/Tessellator";
import type { Level } from "../Level";
import { Tile } from "./Tile";



export class Bush extends Tile {


    constructor(id: number) {
        super(id);

        this.textureId = 15;
    }

    public tick(level: Level, x: number, y: number, z: number, random: Random): void {
        var tileIdBelow: number = level.getTile(x, y-1, z);

        if (!level.isLit(x, y, z) || (tileIdBelow != Tile.grass.id && tileIdBelow != Tile.dirt.id)) {
            level.setTile(x, y, z, 0);
        }
    }

    public render(t: Tessellator, level: Level, layer: number, x: number, y: number, z: number) {
        if (level.isLit(x, y, z) !== (layer != 1)) {
            return;
        }

        const textureId: number = this.textureId;

        const atlasSize = 256.0;
        const tileSize = 16.0;

        const tileX = textureId % 16;
        const tileY = Math.floor(textureId / 16);

        const u0 = (tileX * tileSize) / atlasSize;
        const v0 = (tileY * tileSize) / atlasSize;
        const u1 = u0 + tileSize / atlasSize;
        const v1 = v0 + tileSize / atlasSize;

        t.color(1.0, 1.0, 1.0);

        for (var i = 0; i < 2; ++i) {
            var sin: number = Math.sin(i * Math.PI / 2 + Math.PI / 4) / 2;
            var cos: number = Math.cos(i * Math.PI / 2 + Math.PI / 4) / 2;

            var minX: number = x + 0.5 - sin;
            var maxX: number = x + 0.5 + sin;
            var minY: number = y + 0.0;
            var maxY: number = y + 1.0;
            var minZ: number = z + 0.5 - cos;
            var maxZ: number = z + 0.5 + cos;


            t.vertexUV(minX, maxY, minZ, u0, v0);
            t.vertexUV(maxX, maxY, maxZ, u1, v0);
            t.vertexUV(maxX, minY, maxZ, u1, v1);
            t.vertexUV(minX, minY, minZ, u0, v1);

            t.vertexUV(minX, maxY, minZ, u0, v0);
            t.vertexUV(minX, minY, minZ, u0, v1);
            t.vertexUV(maxX, minY, maxZ, u1, v1);
            t.vertexUV(maxX, maxY, maxZ, u1, v0);
        }
    }


    public getAABB(x: number, y: number, z: number): AABB | null {
        return null;
    }

    public blocksLight(): boolean {
        return false;
    }

    public isSolid(): boolean {
        return false;
    }
}