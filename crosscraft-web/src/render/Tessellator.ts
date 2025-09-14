import { GL11, GL } from "../../lib/GL11/GL11";
import { BufferUtils } from '../../lib/GL11/BufferUtils';
import type { FloatBuffer } from "../../lib/GL11/FloatBuffer";

export class Tessellator {
    // private static readonly MAX_MEMORY_USAGE: number = 4194304;
    private static readonly MAX_FLOATS: number = 524288;
    private buffer: FloatBuffer = BufferUtils.createFloatBuffer(Tessellator.MAX_FLOATS);
    private array: Float32Array = new Float32Array(Tessellator.MAX_FLOATS);
    private vertices: number = 0;
    private u: number = 0.0;
    private v: number = 0.0;
    private r: number = 0.0;
    private g: number = 0.0;
    private b: number = 0.0;
    private hasColor: boolean = false;
    private hasTexture: boolean = false;
    private len: number = 3;
    private p: number = 0;
    private noColor: boolean = false;
    public static instance: Tessellator = new Tessellator();

    constructor() {
    }

    public end(): void {
        if (this.vertices > 0) {
            this.buffer.clear()
            this.buffer.put(this.array, 0, this.p)
            this.buffer.flip()
            if (this.hasTexture && this.hasColor) {
                GL11.glInterleavedArrays(GL.T2F_C3F_V3F, 0, this.buffer);
            } else if (this.hasTexture) {
                GL11.glInterleavedArrays(GL.T2F_V3F, 0, this.buffer);
            } else if (this.hasColor) {
                GL11.glInterleavedArrays(GL.C3F_V3F, 0, this.buffer);
            } else {
                GL11.glInterleavedArrays(GL.V3F, 0, this.buffer);
            }

            GL11.glEnableClientState(GL.VERTEX_ARRAY);
            if (this.hasTexture) {
                GL11.glEnableClientState(GL.TEXTURE_COORD_ARRAY);
            }
            if (this.hasColor) {
                GL11.glEnableClientState(GL.COLOR_ARRAY);
            }

            GL11.glDrawArrays(GL.QUADS, 0, this.vertices);
            GL11.glDisableClientState(GL.VERTEX_ARRAY);
            if (this.hasTexture) {
                GL11.glDisableClientState(GL.TEXTURE_COORD_ARRAY);
            }
            if (this.hasColor) {
                GL11.glDisableClientState(GL.COLOR_ARRAY);
            }
        }

        this.clear();
    }

    private clear(): void {
        this.vertices = 0;
        this.buffer.clear();
        this.p = 0;
    }

    public begin(): void {
        this.clear();
        this.hasColor = false;
        this.hasTexture = false;
        this.noColor = false;
    }

    public texture(u: number, v: number): void {
        if (!this.hasTexture) {
            this.len += 2;
        }

        this.hasTexture = true;
        this.u = u;
        this.v = v;
    }

    public color(r: number, g: number, b: number): void {
        if (!this.noColor) {
            if (!this.hasColor) {
                this.len += 3;
            }

            this.hasColor = true;
            this.r = r;
            this.g = g;
            this.b = b;
        }
    }

    public vertex(x: number, y: number, z: number): void {
        if (this.hasTexture) {
            this.array[this.p++] = this.u;
            this.array[this.p++] = this.v;
        }

        if (this.hasColor) {
            this.array[this.p++] = this.r;
            this.array[this.p++] = this.g;
            this.array[this.p++] = this.b;
        }

        this.array[this.p++] = x;
        this.array[this.p++] = y;
        this.array[this.p++] = z;
        this.vertices++;
        if (this.vertices % 4 == 0 && this.p >= Tessellator.MAX_FLOATS - this.len * 4) {
            this.end();
        }

    }

    public vertexUV(x: number, y: number, z: number, u: number, v: number): void {
        this.texture(u, v);
        this.vertex(x, y, z);
    }

    public setNoColor(): void {
        this.noColor = true;
    }
}