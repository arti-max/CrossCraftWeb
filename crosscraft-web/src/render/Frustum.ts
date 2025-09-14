import { GL11, GL } from '../../lib/GL11/GL11';
import { BufferUtils } from '../../lib/GL11/BufferUtils';
import type { FloatBuffer } from '../../lib/GL11/FloatBuffer';
import type { AABB } from '../phys/AABB';

export class Frustum {
    public m_Frustum: number[][] = Array(6).fill(0).map(() => Array(4).fill(0));

    // Используем числовые литералы, так как они статичны и не меняются
    private static readonly RIGHT = 0;
    private static readonly LEFT = 1;
    private static readonly BOTTOM = 2;
    private static readonly TOP = 3;
    private static readonly BACK = 4;
    private static readonly FRONT = 5;

    // Синглтон-инстанс, как в оригинале
    private static frustum = new Frustum();

    // Буферы и массивы для матриц
    private _proj: FloatBuffer = BufferUtils.createFloatBuffer(16);
    private _modl: FloatBuffer = BufferUtils.createFloatBuffer(16);
    private proj: Float32Array = new Float32Array(16);
    private modl: Float32Array = new Float32Array(16);
    private clip: Float32Array = new Float32Array(16);

    private constructor() {
        // Приватный конструктор для синглтона
    }

    public static getFrustum(): Frustum {
        Frustum.frustum.calculateFrustum();
        return Frustum.frustum;
    }

    private normalizePlane(side: number): void {
        const plane = this.m_Frustum[side];
        const magnitude = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
        
        plane[0] /= magnitude;
        plane[1] /= magnitude;
        plane[2] /= magnitude;
        plane[3] /= magnitude;
    }

    private calculateFrustum(): void {
        // Очищаем кастомные буферы
        this._proj.clear();
        this._modl.clear();

        // Получаем текущие матрицы из нашего эмулятора GL11
        GL11.glGetFloatv(GL.PROJECTION_MATRIX, this._proj);
        GL11.glGetFloatv(GL.MODELVIEW_MATRIX, this._modl);

        // ИСПРАВЛЕНИЕ: правильно копируем данные из FloatBuffer
        const projRaw = this._proj.getRawArray();
        const modlRaw = this._modl.getRawArray();
        
        // Копируем в наши массивы
        for (let i = 0; i < 16; i++) {
            this.proj[i] = projRaw[i];
            this.modl[i] = modlRaw[i];
        }

        // console.log(`🔍 Frustum matrices - Proj[0]: ${this.proj[0]}, Modl[0]: ${this.modl[0]}`);

        const p = this.proj;
        const m = this.modl;
        const c = this.clip;

        // Умножение матриц остается тем же...
        c[0] = m[0] * p[0] + m[1] * p[4] + m[2] * p[8] + m[3] * p[12];
        c[1] = m[0] * p[1] + m[1] * p[5] + m[2] * p[9] + m[3] * p[13];
        c[2] = m[0] * p[2] + m[1] * p[6] + m[2] * p[10] + m[3] * p[14];
        c[3] = m[0] * p[3] + m[1] * p[7] + m[2] * p[11] + m[3] * p[15];
        c[4] = m[4] * p[0] + m[5] * p[4] + m[6] * p[8] + m[7] * p[12];
        c[5] = m[4] * p[1] + m[5] * p[5] + m[6] * p[9] + m[7] * p[13];
        c[6] = m[4] * p[2] + m[5] * p[6] + m[6] * p[10] + m[7] * p[14];
        c[7] = m[4] * p[3] + m[5] * p[7] + m[6] * p[11] + m[7] * p[15];
        c[8] = m[8] * p[0] + m[9] * p[4] + m[10] * p[8] + m[11] * p[12];
        c[9] = m[8] * p[1] + m[9] * p[5] + m[10] * p[9] + m[11] * p[13];
        c[10] = m[8] * p[2] + m[9] * p[6] + m[10] * p[10] + m[11] * p[14];
        c[11] = m[8] * p[3] + m[9] * p[7] + m[10] * p[11] + m[11] * p[15];
        c[12] = m[12] * p[0] + m[13] * p[4] + m[14] * p[8] + m[15] * p[12];
        c[13] = m[12] * p[1] + m[13] * p[5] + m[14] * p[9] + m[15] * p[13];
        c[14] = m[12] * p[2] + m[13] * p[6] + m[14] * p[10] + m[15] * p[14];
        c[15] = m[12] * p[3] + m[13] * p[7] + m[14] * p[11] + m[15] * p[15];

        const f = this.m_Frustum;

        // Плоскости остаются теми же...
        f[Frustum.RIGHT][0] = c[3] - c[0]; f[Frustum.RIGHT][1] = c[7] - c[4]; f[Frustum.RIGHT][2] = c[11] - c[8]; f[Frustum.RIGHT][3] = c[15] - c[12];
        this.normalizePlane(Frustum.RIGHT);

        f[Frustum.LEFT][0] = c[3] + c[0]; f[Frustum.LEFT][1] = c[7] + c[4]; f[Frustum.LEFT][2] = c[11] + c[8]; f[Frustum.LEFT][3] = c[15] + c[12];
        this.normalizePlane(Frustum.LEFT);

        f[Frustum.BOTTOM][0] = c[3] + c[1]; f[Frustum.BOTTOM][1] = c[7] + c[5]; f[Frustum.BOTTOM][2] = c[11] + c[9]; f[Frustum.BOTTOM][3] = c[15] + c[13];
        this.normalizePlane(Frustum.BOTTOM);

        f[Frustum.TOP][0] = c[3] - c[1]; f[Frustum.TOP][1] = c[7] - c[5]; f[Frustum.TOP][2] = c[11] - c[9]; f[Frustum.TOP][3] = c[15] - c[13];
        this.normalizePlane(Frustum.TOP);

        f[Frustum.BACK][0] = c[3] - c[2]; f[Frustum.BACK][1] = c[7] - c[6]; f[Frustum.BACK][2] = c[11] - c[10]; f[Frustum.BACK][3] = c[15] - c[14];
        this.normalizePlane(Frustum.BACK);

        f[Frustum.FRONT][0] = c[3] + c[2]; f[Frustum.FRONT][1] = c[7] + c[6]; f[Frustum.FRONT][2] = c[11] + c[10]; f[Frustum.FRONT][3] = c[15] + c[14];
        this.normalizePlane(Frustum.FRONT);

        // console.log(`🔍 Frustum calculated - Right plane: [${f[0][0].toFixed(3)}, ${f[0][1].toFixed(3)}, ${f[0][2].toFixed(3)}, ${f[0][3].toFixed(3)}]`);
    }
    
    public isVisible(aabb: AABB): boolean {
        return this.cubeInFrustum(aabb.minX, aabb.minY, aabb.minZ, aabb.maxX, aabb.maxY, aabb.maxZ);
    }

    public cubeInFrustum(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): boolean {
        for (let i = 0; i < 6; i++) {
            const plane = this.m_Frustum[i];
            if (plane[0] * x1 + plane[1] * y1 + plane[2] * z1 + plane[3] <= 0 &&
                plane[0] * x2 + plane[1] * y1 + plane[2] * z1 + plane[3] <= 0 &&
                plane[0] * x1 + plane[1] * y2 + plane[2] * z1 + plane[3] <= 0 &&
                plane[0] * x2 + plane[1] * y2 + plane[2] * z1 + plane[3] <= 0 &&
                plane[0] * x1 + plane[1] * y1 + plane[2] * z2 + plane[3] <= 0 &&
                plane[0] * x2 + plane[1] * y1 + plane[2] * z2 + plane[3] <= 0 &&
                plane[0] * x1 + plane[1] * y2 + plane[2] * z2 + plane[3] <= 0 &&
                plane[0] * x2 + plane[1] * y2 + plane[2] * z2 + plane[3] <= 0) {
                return false;
            }
        }
        return true;
    }
}
