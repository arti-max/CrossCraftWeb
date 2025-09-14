// MatrixStack.ts
import { mat4 } from 'gl-matrix';

export class MatrixStack {
    private stack: mat4[] = [];
    public current: mat4;

    constructor() {
        this.current = mat4.create();
        mat4.identity(this.current);
    }

    public push(): void {
        const copy = mat4.clone(this.current);
        this.stack.push(copy);
    }

    public pop(): void {
        if (this.stack.length === 0) {
            throw new Error("Invalid matrix pop. Stack is empty.");
        }
        this.current = this.stack.pop()!;
    }
    
    public loadIdentity(): void {
        mat4.identity(this.current);
    }

    public translate(v: [number, number, number]): void {
        mat4.translate(this.current, this.current, v);
    }

    public rotate(angle: number, axis: [number, number, number]): void {
        mat4.rotate(this.current, this.current, angle * (Math.PI / 180.0), axis);
    }

    public scale(v: [number, number, number]): void {
        mat4.scale(this.current, this.current, v);
    }
    
    public multMatrix(matrix: mat4): void {
        mat4.multiply(this.current, this.current, matrix);
    }

    public loadMatrix(matrix: Float32Array): void {
        mat4.copy(this.current, matrix as unknown as mat4);
    }
}
