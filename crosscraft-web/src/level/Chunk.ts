import { GL11, GL } from "../../lib/GL11/GL11";
import { AABB } from "../phys/AABB";
import { Tessellator } from '../render/Tessellator';
import type { Level } from "./Level";
import { Tile } from "./Tile";
import type { Player } from "../Player";

export class Chunk {
    // private static TEXTURE: any;
    private static readonly TESSELLATOR: Tessellator = Tessellator.instance;

    public static rebuiltThisFrame: number;
    public static updates: number;

    private readonly level: Level;

    public boundingBox: AABB;
    private readonly minX: number
    private readonly minY: number
    private readonly minZ: number

    private readonly maxX: number
    private readonly maxY: number
    private readonly maxZ: number

    private readonly x: number;
    private readonly y: number;
    private readonly z: number;

    private readonly lists: number;
    private dirty: boolean = true;

    public visible: boolean = false;

    constructor(level: Level, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
        // Chunk.TEXTURE = Textures.loadTexture('/terraing.png', GL.NEAREST);

        this.level = level;

        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
        this.minZ = minZ;
        this.maxZ = maxZ;

        this.x = (minX + maxX) / 2.0;
        this.y = (minY + maxY) / 2.0;
        this.z = (minZ + maxZ) / 2.0;

        this.lists = GL11.glGenLists(2);

        this.boundingBox = new AABB(minX, minY, minZ, maxX, maxY, maxZ);
        
    }

    public rebuildLayer(layer: number) {
        // if (Chunk.rebuiltThisFrame == 2) {
        //     return;
        // }
        // Chunk.rebuiltThisFrame++;

        GL11.glNewList(this.lists + layer, GL.COMPILE);
        GL11.glEnable(GL.TEXTURE_2D);
        // GL11.glBindTexture(GL.TEXTURE_2D, Chunk.TEXTURE);
        Chunk.TESSELLATOR.begin();

        for (var x = this.minX; x < this.maxX; ++x) {
            for (var y = this.minY; y < this.maxY; ++y) {
                for (var z = this.minZ; z < this.maxZ; ++z) {
                    if (this.level.isTile(x, y, z)) {
                        // var id = (y != this.level.depth * 2 / 3) ? 1 : 0;
                        if (y > this.level.depth - 7 && this.level.getBrightness(x, y, z) == 1.0) {
                            Tile.grass.render(Chunk.TESSELLATOR, this.level, layer, x, y, z);
                        } else {
                            Tile.rock.render(Chunk.TESSELLATOR, this.level, layer, x, y, z);
                        }
                    }
                }
            }
        }

        Chunk.TESSELLATOR.end();
        // GL11.glDisable(GL.TEXTURE_2D);
        GL11.glEndList();
    }

    public rebuild() {
        Chunk.updates++;
        this.rebuildLayer(0);
        this.rebuildLayer(1);
        this.dirty = false;
    }

    public render(layer: number): void {
        GL11.glCallList(this.lists + layer);
    }

    public setDirty(): void {
        this.dirty = true;
    }

    public isDirty(): boolean {
        return this.dirty;
    }

    public distanceToSqr(player: Player): number {
        var xd: number = player.x - this.x;
        var yd: number = player.y - this.y;
        var zd: number = player.z - this.z;
        return xd*xd + yd*yd + zd*zd;
    }
    
    public reset(): void {
        this.dirty = true;

        for (var i = 0; i < 2; ++i) {
            GL11.glNewList(this.lists + i, GL.COMPILE);
            GL11.glEndList();
        }
    }
}