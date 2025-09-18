import { AABB } from "../../phys/AABB";
import type { Player } from "../../Player";
import type { Tessellator } from "../../render/Tessellator";
import type { Level } from "../Level";
import type { Random } from '../../../lib/UTIL/Random';
import type { ParticleEngine } from "../../particle/ParticleManager";
import { Particle } from "../../particle/Particle";


export class Tile {

    public static tiles: Tile[] = new Array<Tile>(256);
    public static rock: Tile;
    public static grass: Tile;
    public static dirt: Tile;
    public static cobblestone: Tile;
    public static wood: Tile;
    public static bush: Tile;
    public static unbreakble: Tile;
    public static water: Tile;
    public static calmWater: Tile;
    public static lava: Tile;
    public static calmLava: Tile;

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

    protected shouldRenderFace(level: Level, x: number, y: number, z: number, layer: number, face: number): boolean {
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

    protected getTexture(face: number): number {
        return this.textureId;
    }

    protected setShape(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
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

        const atlasSize = 16;
        const tilePixels = 16;
        const atlasPixels = 256;
        
        const col = tex % atlasSize;
        const row = Math.floor(tex / atlasSize);
        
        const u0 = col * tilePixels / atlasPixels;
        const u1 = u0 + tilePixels / atlasPixels;
        const v0 = row * tilePixels / atlasPixels;
        const v1 = v0 + tilePixels / atlasPixels;

        var x0: number = (x + this.minX);
        var x1: number = (x + this.maxX);
        var y0: number = (y + this.minY);
        var y1: number = (y + this.maxY);
        var z0: number = (z + this.minZ);
        var z1: number = (z + this.maxZ);
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

    public renderBackFace(t: Tessellator, x: number, y: number, z: number, face: number): void {
        const tex: number = this.getTexture(face);

        const atlasSize = 16;
        const tilePixels = 16;
        const atlasPixels = 256;
        
        const col = tex % atlasSize;
        const row = Math.floor(tex / atlasSize);
        
        const u0 = col * tilePixels / atlasPixels;
        const u1 = u0 + tilePixels / atlasPixels;
        const v0 = row * tilePixels / atlasPixels;
        const v1 = v0 + tilePixels / atlasPixels;

        var x0: number = (x + this.minX);
        var x1: number = (x + this.maxX);
        var y0: number = (y + this.minY);
        var y1: number = (y + this.maxY);
        var z0: number = (z + this.minZ);
        var z1: number = (z + this.maxZ);
        
        if (face == 0) {
            t.vertexUV(x1, y0, z1, u1, v1);
            t.vertexUV(x1, y0, z0, u1, v0);
            t.vertexUV(x0, y0, z0, u0, v0);
            t.vertexUV(x0, y0, z1, u0, v1);
        } else if (face == 1) {
            t.vertexUV(x0, y1, z1, u0, v1);
            t.vertexUV(x0, y1, z0, u0, v0);
            t.vertexUV(x1, y1, z0, u1, v0);
            t.vertexUV(x1, y1, z1, u1, v1);
        } else if (face == 2) {
            t.vertexUV(x0, y0, z0, u1, v1);
            t.vertexUV(x1, y0, z0, u0, v1);
            t.vertexUV(x1, y1, z0, u0, v0);
            t.vertexUV(x0, y1, z0, u1, v0);
        } else if (face == 3) {
            t.vertexUV(x1, y1, z1, u1, v0);
            t.vertexUV(x1, y0, z1, u1, v1);
            t.vertexUV(x0, y0, z1, u0, v1);
            t.vertexUV(x0, y1, z1, u0, v0);
        } else if (face == 4) {
            t.vertexUV(x0, y0, z1, u1, v1);
            t.vertexUV(x0, y0, z0, u0, v1);
            t.vertexUV(x0, y1, z0, u0, v0);
            t.vertexUV(x0, y1, z1, u1, v0);
        } else if (face == 5) {
            t.vertexUV(x1, y1, z1, u0, v0);
            t.vertexUV(x1, y1, z0, u1, v0);
            t.vertexUV(x1, y0, z0, u1, v1);
            t.vertexUV(x1, y0, z1, u0, v1);
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

    /**
     * Called when a tile gets destroyed by the player
     *
     * @param level          The current level
     * @param x              Tile x location
     * @param y              Tile y location
     * @param z              Tile z location
     * @param particleEngine ParticleEngine to create the particles
     */
    public onDestroy(level: Level, x: number, y: number, z: number, engine: ParticleEngine): void {
        var spread = 4;

        for (var offsetX = 0; offsetX < spread; offsetX++) {
            for (var offsetY = 0; offsetY < spread; offsetY++) {
                for (var offsetZ = 0; offsetZ < spread; offsetZ++) {
                    var targetX: number = x + (offsetX + 0.5) / spread;
                    var targetY: number = y + (offsetY + 0.5) / spread;
                    var targetZ: number = z + (offsetZ + 0.5) / spread;

                    var motionX: number = targetX - x - 0.5;
                    var motionY: number = targetY - y - 0.5;
                    var motionZ: number = targetZ - z - 0.5;

                    var particle: Particle = new Particle(level, targetX, targetY, targetZ, motionX, motionY, motionZ, this.textureId);
                    engine.add(particle);
                }
            }
        }
    }

    public tick(level: Level, x: number, y: number, z: number, random: Random) {
        // No implementation
    }

    public mayPick(): boolean {
        return true;
    }

    public blocksLight(): boolean {
        return true;
    }

    public isSolid(): boolean {
        return true;
    }

    public getTileAABB(x: number, y: number, z: number): AABB {
        return new AABB(x, y, z, x+1, y+1, z+1);
    }

    public getAABB(x: number, y: number, z: number): AABB | null {
        return new AABB(x, y, z, x+1, y+1, z+1);
    }

    public neighborChanged(level: Level, x: number, y: number, z: number, type: number): void {
        // No implementation
    }

    public getLiquidType(): number {
        return 0;
    }

    public isCalmLiquid(): boolean {
      return false;
   }
}