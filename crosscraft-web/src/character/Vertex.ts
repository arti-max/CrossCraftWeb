import { Vec3 } from "./Vec3";


export class Vertex {
    public position: Vec3;
    public u: number;
    public v: number;

    constructor(x: number, y: number, z: number, u: number, v: number);
    constructor(vertex: Vertex, u: number, v: number);
    constructor(position: Vec3, u: number, v: number);

    constructor(
        arg1: number | Vertex | Vec3,
        arg2: number,
        arg3: number,
        arg4?: number,
        arg5?: number
    ) {
        if (typeof arg1 === 'number' && arg4 !== undefined && arg5 !== undefined) {
            // constructor(x, y, z, u, v)
            this.position = new Vec3(arg1, arg2, arg3);
            this.u = arg4;
            this.v = arg5;
        } else if (arg1 instanceof Vertex) {
            // constructor(vertex, u, v)
            this.position = arg1.position;
            this.u = arg2;
            this.v = arg3;
        } else if (arg1 instanceof Vec3) {
            // constructor(position, u, v)
            this.position = arg1;
            this.u = arg2;
            this.v = arg3;
        } else {
            throw new Error("Invalid arguments for Vertex constructor");
        }
    }

    public remap(u: number, v: number): Vertex {
        return new Vertex(this, u, v);
    }
}