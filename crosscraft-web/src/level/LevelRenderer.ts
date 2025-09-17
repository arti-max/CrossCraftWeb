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
import { Tile } from "./tile/Tile";
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
    private surroundLists: number;

    // Кешированная позиция для сортировки
    private lX: number = 0.0;
    private lY: number = 0.0; 
    private lZ: number = 0.0;

    constructor(level: Level, textures: Textures) {
        this.level = level;
        this.textures = textures;
        level.addListener(this);
        this.surroundLists = GL11.glGenLists(2);
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

        GL11.glNewList(this.surroundLists + 0, GL.COMPILE);
        this.compileSurroundingGround();
        GL11.glEndList();
        GL11.glNewList(this.surroundLists + 1, GL.COMPILE);
        this.compileSurroundingWater();
        GL11.glEndList();

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

    public renderSurroundingGround(): void {
        GL11.glCallList(this.surroundLists + 0);
    }

    public compileSurroundingGround(): void {
        GL11.glEnable(GL.TEXTURE_2D);
        // GL11.glBindTexture(GL.TEXTURE_2D, this.textures.loadTexture("/rock2.png", GL.NEAREST));
        GL11.glColor4f(1.0, 1.0, 1.0, 1.0);

        const t: Tessellator = Tessellator.instance;
        const y = this.level.getGroundLevel() - 2.0;
        let s = 128;
        if (s > this.level.width) s = this.level.width;
        if (s > this.level.height) s = this.level.height;
        const d = 5;

        // --- Наружный "обод" вокруг уровня (точно как в Java) ----
        t.begin();
        for (let xx = -s * d; xx < this.level.width + s * d; xx += s) {
            for (let zz = -s * d; zz < this.level.height + s * d; zz += s) {
                let yy = y;
                if (
                    xx >= 0 && zz >= 0 &&
                    xx < this.level.width && zz < this.level.height
                ) {
                    yy = 0.0; // внутренний уровень вровень с землей
                }
                t.vertexUV(xx, yy, zz + s, 0.0, s);
                t.vertexUV(xx + s, yy, zz + s, s, s);
                t.vertexUV(xx + s, yy, zz, s, 0.0);
                t.vertexUV(xx, yy, zz, 0.0, 0.0);
            }
        }
        t.end();

        // --- Передняя и задняя стороны ----
        // GL11.glBindTexture(GL.TEXTURE_2D, this.textures.loadTexture("/rock2.png", GL.NEAREST));
        GL11.glColor3f(0.8, 0.8, 0.8);
        t.begin();
        for (let xx = 0; xx < this.level.width; xx += s) {
            // Передняя грань (z = 0)
            t.vertexUV(xx, 0.0, 0.0, 0.0, 0.0);
            t.vertexUV(xx + s, 0.0, 0.0, s, 0.0);
            t.vertexUV(xx + s, y, 0.0, s, y);
            t.vertexUV(xx, y, 0.0, 0.0, y);
            // Задняя грань (z = level.height)
            t.vertexUV(xx, y, this.level.height, 0.0, y);
            t.vertexUV(xx + s, y, this.level.height, s, y);
            t.vertexUV(xx + s, 0.0, this.level.height, s, 0.0);
            t.vertexUV(xx, 0.0, this.level.height, 0.0, 0.0);
        }
        t.end();

        // --- Левая и правая стороны ----
        GL11.glColor3f(0.6, 0.6, 0.6);
        t.begin();
        for (let zz = 0; zz < this.level.height; zz += s) {
            // Левая грань (x = 0)
            t.vertexUV(0.0, y, zz, 0.0, 0.0);
            t.vertexUV(0.0, y, zz + s, s, 0.0);
            t.vertexUV(0.0, 0.0, zz + s, s, y);
            t.vertexUV(0.0, 0.0, zz, 0.0, y);
            // Правая грань (x = level.width)
            t.vertexUV(this.level.width, 0.0, zz, 0.0, y);
            t.vertexUV(this.level.width, 0.0, zz + s, s, y);
            t.vertexUV(this.level.width, y, zz + s, s, 0.0);
            t.vertexUV(this.level.width, y, zz, 0.0, 0.0);
        }
        t.end();

        GL11.glDisable(GL.BLEND);
        GL11.glDisable(GL.TEXTURE_2D);
    }

    public renderSurroundingWater(): void {
        GL11.glCallList(this.surroundLists + 1);
    }

    public compileSurroundingWater(): void {
        GL11.glEnable(GL.TEXTURE_2D);
        GL11.glColor3f(1.0, 1.0, 1.0);
        var y = this.level.getGroundLevel();
        GL11.glEnable(GL.BLEND);
        GL11.glBlendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
        const t: Tessellator = Tessellator.instance;
        let s = 128;
        if (s > this.level.width) s = this.level.width;
        if (s > this.level.height) s = this.level.height;
        const d = 5;
        t.begin();

        for (var xx = -s * d; xx < this.level.width + s * d; xx += s) {
            for (var zz = -s * d; zz < this.level.height + s * d; zz += s) {
                var yy: number = y - 0.1;
                if (xx < 0 || zz < 0 || xx >= this.level.width || zz >= this.level.height) {
                    t.vertexUV((xx + 0), yy, (zz + s), 0.0, s);
                    t.vertexUV((xx + s), yy, (zz + s), s, s);
                    t.vertexUV((xx + s), yy, (zz + 0), s, 0.0);
                    t.vertexUV((xx + 0), yy, (zz + 0), 0.0, 0.0);
                    t.vertexUV((xx + 0), yy, (zz + 0), 0.0, 0.0);
                    t.vertexUV((xx + s), yy, (zz + 0), s, 0.0);
                    t.vertexUV((xx + s), yy, (zz + s), s, s);
                    t.vertexUV((xx + 0), yy, (zz + s), 0.0, s);
                }
            }
        }

        t.end();
        GL11.glDisable(GL.BLEND);
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
