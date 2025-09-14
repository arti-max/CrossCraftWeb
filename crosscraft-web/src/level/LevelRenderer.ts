import { GL, GL11 } from "../../lib/GL11/GL11";
import { Frustum } from '../render/Frustum';
import type { Textures } from "../Textures";
import { Chunk } from "./Chunk";
import type { Level } from "./Level";
import type { Player } from "../Player";
import { DistanceSorter } from "./DistanceSorter";
import { DirtyChunkSorter } from "./DirtyChunkSorter";
import { Tessellator } from "../render/Tessellator";
import type { AABB } from "../phys/AABB";
import { Tile } from "./Tile";
import type { HitResult } from "../HitResult";
import type { LevelListener } from "./LevelListener";

export class LevelRenderer implements LevelListener {
    public static readonly MAX_REBUILDS_PER_FRAME = 4;
    public static readonly CHUNK_SIZE = 16;
    
    private level: Level;
    private chunks!: Chunk[];
    private sortedChunks!: Chunk[];
    private xChunks!: number;
    private yChunks!: number;
    private zChunks!: number;
    private textures: Textures;
    private drawDistance: number = 2;
    
    // Кешированная позиция для сортировки
    private lX: number = 0.0;
    private lY: number = 0.0; 
    private lZ: number = 0.0;

    constructor(level: Level, textures: Textures) {
        this.level = level;
        this.textures = textures;
        
        level.addListener(this);
        
        this.allChanged();
    }

    public allChanged(): void {
        this.lX = -900000.0;
        this.lY = -900000.0;
        this.lZ = -900000.0;
        
        this.xChunks = Math.floor((this.level.width + LevelRenderer.CHUNK_SIZE - 1) / LevelRenderer.CHUNK_SIZE);
        this.yChunks = Math.floor((this.level.depth + LevelRenderer.CHUNK_SIZE - 1) / LevelRenderer.CHUNK_SIZE);  
        this.zChunks = Math.floor((this.level.height + LevelRenderer.CHUNK_SIZE - 1) / LevelRenderer.CHUNK_SIZE);

        console.log(`📊 Level: ${this.level.width}x${this.level.depth}x${this.level.height}, Chunks: ${this.xChunks}x${this.yChunks}x${this.zChunks} = ${this.xChunks * this.yChunks * this.zChunks}`);
        
        const totalChunks = this.xChunks * this.yChunks * this.zChunks;
        this.chunks = new Array<Chunk>(totalChunks);
        this.sortedChunks = new Array<Chunk>(totalChunks);

        for (let x = 0; x < this.xChunks; ++x) {
            for (let y = 0; y < this.yChunks; ++y) {
                for (let z = 0; z < this.zChunks; ++z) {
                    const x0 = x * LevelRenderer.CHUNK_SIZE;
                    const y0 = y * LevelRenderer.CHUNK_SIZE;
                    const z0 = z * LevelRenderer.CHUNK_SIZE;
                    
                    let x1 = (x + 1) * LevelRenderer.CHUNK_SIZE;
                    let y1 = (y + 1) * LevelRenderer.CHUNK_SIZE;
                    let z1 = (z + 1) * LevelRenderer.CHUNK_SIZE;
                    
                    // Ограничиваем размеры уровня
                    if (x1 > this.level.width) x1 = this.level.width;
                    if (y1 > this.level.depth) y1 = this.level.depth;
                    if (z1 > this.level.height) z1 = this.level.height;

                    const chunk = new Chunk(this.level, x0, y0, z0, x1, y1, z1);
                    const index = (x + y * this.xChunks) * this.zChunks + z;
                    
                    this.chunks[index] = chunk;
                    this.sortedChunks[index] = chunk;
                }
            }
        }

        for (const chunk of this.chunks) {
            chunk.reset();
        }
    }

    public getAllDirtyChunks(): Chunk[] | null {
        let dirty: Chunk[] | null = null;

        for (const chunk of this.chunks) {
            if (chunk.isDirty()) {
                if (dirty === null) {
                    dirty = [];
                }
                dirty.push(chunk);
            }
        }

        return dirty;
    }

    public render(player: Player, layer: number): void {
        GL11.glEnable(GL.TEXTURE_2D);
        GL11.glBindTexture(GL.TEXTURE_2D, this.textures.loadTexture("/terrain.png", GL.NEAREST));

        const xd = player.x - this.lX;
        const yd = player.y - this.lY;
        const zd = player.z - this.lZ;
        
        if (xd * xd + yd * yd + zd * zd > 64.0) {
            this.lX = player.x;
            this.lY = player.y;
            this.lZ = player.z;
            
            const distanceSorter = new DistanceSorter(player);
            this.sortedChunks.sort(distanceSorter.getCompareFn());
        }

        for (const chunk of this.sortedChunks) {
            if (chunk.visible) {
                const dd = 256 / (1 << this.drawDistance);
                
                if (this.drawDistance === 0 || chunk.distanceToSqr(player) < dd * dd) {
                    chunk.render(layer);
                }
            }
        }

        GL11.glDisable(GL.TEXTURE_2D);
    }

    public updateDirtyChunks(player: Player): void {
        const dirty = this.getAllDirtyChunks();
        
        if (dirty !== null) {
            const dirtyChunkSorter = new DirtyChunkSorter(player);
            dirty.sort(dirtyChunkSorter.getCompareFn());

            const maxRebuilds = Math.min(LevelRenderer.MAX_REBUILDS_PER_FRAME, dirty.length);
            
            for (let i = 0; i < maxRebuilds; ++i) {
                dirty[i].rebuild();
            }
        }
    }

    public cull(frustum: Frustum): void {
        for (const chunk of this.chunks) {
            chunk.visible = frustum.isVisible(chunk.boundingBox);
        }
    }

    public setDirty(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
        x0 = Math.floor(x0 / LevelRenderer.CHUNK_SIZE);
        x1 = Math.floor(x1 / LevelRenderer.CHUNK_SIZE);
        y0 = Math.floor(y0 / LevelRenderer.CHUNK_SIZE);
        y1 = Math.floor(y1 / LevelRenderer.CHUNK_SIZE);
        z0 = Math.floor(z0 / LevelRenderer.CHUNK_SIZE);
        z1 = Math.floor(z1 / LevelRenderer.CHUNK_SIZE);

        if (x0 < 0) x0 = 0;
        if (y0 < 0) y0 = 0;
        if (z0 < 0) z0 = 0;
        if (x1 >= this.xChunks) x1 = this.xChunks - 1;
        if (y1 >= this.yChunks) y1 = this.yChunks - 1;
        if (z1 >= this.zChunks) z1 = this.zChunks - 1;

        for (let x = x0; x <= x1; ++x) {
            for (let y = y0; y <= y1; ++y) {
                for (let z = z0; z <= z1; ++z) {
                    const index = (x + y * this.xChunks) * this.zChunks + z;
                    this.chunks[index].setDirty();
                }
            }
        }
    }

    public pick(player: Player, frustum: Frustum): void {
        const t: Tessellator = Tessellator.instance;
        var r: number = 2.5;
        var box: AABB = player.boundingBox.grow(r, r, r);
        var x0: number = Math.floor(box.minX);
        var x1: number = Math.floor(box.maxX + 1.0);
        var y0: number = Math.floor(box.minY);
        var y1: number = Math.floor(box.maxY + 1.0);
        var z0: number = Math.floor(box.minZ);
        var z1: number = Math.floor(box.maxZ + 1.0);
        GL11.glInitNames();
        GL11.glPushName(0);
        GL11.glPushName(0);
        for (var x = x0; x < x1; ++x) {
            GL11.glLoadName(x);
            GL11.glPushName(0);

            for (var y = y0; y < y1; ++y) {
                GL11.glLoadName(y);
                GL11.glPushName(0);

                for (var z = z0; z < z1; ++z) {
                    var tileId = this.level.getTile(x, y, z);
                    var tile: Tile = Tile.tiles[tileId];
                    if (tile != null) {
                        if (tile.mayPick()) {
                            if (frustum.isVisible(tile.getTileAABB(x, y, z))) {
                                GL11.glLoadName(z);
                                GL11.glPushName(0)

                                for (var f = 0; f < 6; ++f) {
                                    GL11.glLoadName(f);
                                    t.begin()
                                    tile.renderFaceNoTexture(player, t, x, y, z, f);
                                    t.end();
                                }

                                GL11.glPopName();
                            }
                        }
                    }
                }

                GL11.glPopName();
            }

            GL11.glPopName();
        }

        GL11.glPopName();
        GL11.glPopName();
    }

    public renderHit(player: Player, h: HitResult): void {
        const t: Tessellator = Tessellator.instance;
        GL11.glEnable(GL.BLEND);
        // GL11.glEnable(GL.ALPHA_TEST);
        GL11.glBlendFunc(GL.SRC_ALPHA, 1);
        GL11.glColor4f(1.0, 1.0, 1.0, (Math.sin(performance.now() / 100.0) * 0.2 + 0.4) * 0.5);

        t.begin();
        t.setNoColor();
        Tile.rock.renderFaceNoTexture(player, t, h.x, h.y, h.z, h.f)
        t.end();

        GL11.glDisable(GL.BLEND);
        // GL11.glDisable(GL.ALPHA_TEST);
    }

    public toggleDrawDistance(): void {
        this.drawDistance = Math.floor((this.drawDistance + 1) % 4);
        console.log("Draw Dist: " + this.drawDistance);
    }

    public tileChanged(x: number, y: number, z: number): void {
        this.setDirty(x - 1, y - 1, z - 1, x + 1, y + 1, z + 1);
    }

    public lightColumnChanged(x: number, z: number, y0: number, y1: number): void {
        this.setDirty(x - 1, y0 - 1, z - 1, x + 1, y1 + 1, z + 1);
    }

    public getDrawDistance(): number {
        return this.drawDistance;
    }

    public getChunks(): Chunk[] {
        return this.chunks;
    }

    public getSortedChunks(): Chunk[] {
        return this.sortedChunks;
    }
}
