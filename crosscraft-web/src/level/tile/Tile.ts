import { AABB } from "../../phys/AABB";
import type { Player } from "../../Player";
import type { Tessellator } from "../../render/Tessellator";
import type { Level } from "../Level";


export class Tile {

    public static tiles: Tile[] = new Array<Tile>(256);
    public static grass: Tile = new Tile(1, 0);
    public static rock: Tile = new Tile(2, 5);

    public textureId!: number;
    public readonly id: number;

    private minX!: number;
    private maxX!: number;
    private minY!: number;
    private maxY!: number;
    private minZ!: number;
    private maxZ!: number;

    constructor(id: number, tex?: number) {
        Tile.tiles[id] = this;
        this.id = id;
        this.setShape(0.0, 0.0, 0.0, 1.0, 1.0, 1.0);
        if (tex != null) {
            this.textureId = tex;
        }
    }

    private shouldRenderFace(level: Level, x: number, y: number, z: number, layer: number, face: number): boolean {
        var layerOk: boolean = true;
        if (layer == 2) {
            return false;
        } else {
            if (layer >= 0) {
                const isLit = level.isLit(x, y, z);
                layerOk = (isLit) !== (layer == 1);
            }
            
            const isSolid = level.isSolidTile(x, y, z);
            const shouldRender = !isSolid && layerOk;   
            return shouldRender;
        }
    }

    private getTexture(face: number): number {
        return this.textureId;
    }

    private setShape(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): void {
        this.minX = x0;
        this.maxX = x1;
        this.minY = y0;
        this.maxY = y1;
        this.minZ = z0;
        this.maxZ = z1;
    }

    public render(t: Tessellator, level: Level, layer: number, x: number, y: number, z: number): void {
        var c2: number = 0.6;
        var c1: number = 1.0;
        var c3: number = 0.8;

        if (this.shouldRenderFace(level, x, y - 1, z, layer, 0)) {
            t.color(c1, c1, c1);
            this.renderFace(t, x, y, z, 0);
        }

        if (this.shouldRenderFace(level, x, y + 1, z, layer, 1)) {
            t.color(c1, c1, c1);
            this.renderFace(t, x, y, z, 1);
        }

        if (this.shouldRenderFace(level, x, y, z - 1, layer, 2)) {
            t.color(c2, c2, c2);
            this.renderFace(t, x, y, z, 2);
        }

        if (this.shouldRenderFace(level, x, y, z + 1, layer, 3)) {
            t.color(c2, c2, c2);
            this.renderFace(t, x, y, z, 3);
        }

        if (this.shouldRenderFace(level, x - 1, y, z, layer, 4)) {
            t.color(c3, c3, c3);
            this.renderFace(t, x, y, z, 4);
        }

        if (this.shouldRenderFace(level, x + 1, y, z, layer, 5)) {
            t.color(c3, c3, c3);
            this.renderFace(t, x, y, z, 5);
        }
    }

    public renderFace(t: Tessellator, x: number, y: number, z: number, face: number): void {
        const tex: number = this.getTexture(face);
        var u0: number = tex / 16.0;
        var u1: number = u0 + 16 / 256.0;
        var v0: number = 0.0;
        var v1: number = v0 + 16 / 256.0;

        var x0: number = (x + 0);
        var x1: number = (x + 1);
        var y0: number = (y + 0);
        var y1: number = (y + 1);
        var z0: number = (z + 0);
        var z1: number = (z + 1);
        if (face == 0) {
            t.vertexUV(x0, y0, z1, u0, v1);
            t.vertexUV(x0, y0, z0, u0, v0);
            t.vertexUV(x1, y0, z0, u1, v0);
            t.vertexUV(x1, y0, z1, u1, v1);
        } else if (face == 1) {
            t.vertexUV(x1, y1, z1, u1, v1);
            t.vertexUV(x1, y1, z0, u1, v0);
            t.vertexUV(x0, y1, z0, u0, v0);
            t.vertexUV(x0, y1, z1, u0, v1);
        } else if (face == 2) {
            t.vertexUV(x0, y1, z0, u1, v0);
            t.vertexUV(x1, y1, z0, u0, v0);
            t.vertexUV(x1, y0, z0, u0, v1);
            t.vertexUV(x0, y0, z0, u1, v1);
        } else if (face == 3) {
            t.vertexUV(x0, y1, z1, u0, v0);
            t.vertexUV(x0, y0, z1, u0, v1);
            t.vertexUV(x1, y0, z1, u1, v1);
            t.vertexUV(x1, y1, z1, u1, v0);
        } else if (face == 4) {
            t.vertexUV(x0, y1, z1, u1, v0);
            t.vertexUV(x0, y1, z0, u0, v0);
            t.vertexUV(x0, y0, z0, u0, v1);
            t.vertexUV(x0, y0, z1, u1, v1);
        } else if (face == 5) {
            t.vertexUV(x1, y0, z1, u0, v1);
            t.vertexUV(x1, y0, z0, u1, v1);
            t.vertexUV(x1, y1, z0, u1, v0);
            t.vertexUV(x1, y1, z1, u0, v0);
        }
    }

    public renderFaceNoTexture(player: Player, t: Tessellator, x: number, y: number, z: number, face: number) {
        var x0: number = x + 0.0;
        var x1: number = x + 1.0;
        var y0: number = y + 0.0;
        var y1: number = y + 1.0;
        var z0: number = z + 0.0;
        var z1: number = z + 1.0;

        if (face == 0 && y > player.y) {
            t.vertex(x0, y0, z1);
            t.vertex(x0, y0, z0);
            t.vertex(x1, y0, z0);
            t.vertex(x1, y0, z1);
        }

        if (face == 1 && y < player.y) {
            t.vertex(x1, y1, z1);
            t.vertex(x1, y1, z0);
            t.vertex(x0, y1, z0);
            t.vertex(x0, y1, z1);
        }

        if (face == 2 && z > player.z) {
            t.vertex(x0, y1, z0);
            t.vertex(x1, y1, z0);
            t.vertex(x1, y0, z0);
            t.vertex(x0, y0, z0);
        }

        if (face == 3 && z < player.z) {
            t.vertex(x0, y1, z1);
            t.vertex(x0, y0, z1);
            t.vertex(x1, y0, z1);
            t.vertex(x1, y1, z1);
        }

        if (face == 4 && x > player.x) {
            t.vertex(x0, y1, z1);
            t.vertex(x0, y1, z0);
            t.vertex(x0, y0, z0);
            t.vertex(x0, y0, z1);
        }

        if (face == 5 && x < player.x) {
            t.vertex(x1, y0, z1);
            t.vertex(x1, y0, z0);
            t.vertex(x1, y1, z0);
            t.vertex(x1, y1, z1);
        }
    }

    public mayPick(): boolean {
        return true;
    }

    public getTileAABB(x: number, y: number, z: number): AABB {
        return new AABB(x, y, z, x+1, y+1, z+1);
    }
}