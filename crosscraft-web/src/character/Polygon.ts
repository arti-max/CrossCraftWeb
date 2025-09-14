import { GL11 } from "../../lib/GL11/GL11";
import type { Vertex } from "./Vertex";

export class Polygon {
    public vertices: Vertex[];
    public vertexCount: number;

    constructor(vertices: Vertex[]);
    constructor(vertices: Vertex[], minU: number, minV: number, maxU: number, maxV: number);

    constructor(
        vertices: Vertex[],
        minU?: number,
        minV?: number,
        maxU?: number,
        maxV?: number
    ) {
        this.vertices = vertices;
        this.vertexCount = vertices.length;

        if (
            minU !== undefined &&
            minV !== undefined &&
            maxU !== undefined &&
            maxV !== undefined
        ) {
            vertices[0] = vertices[0].remap(maxU, minV);
            vertices[1] = vertices[1].remap(minU, minV);
            vertices[2] = vertices[2].remap(minU, maxV);
            vertices[3] = vertices[3].remap(maxU, maxV);
        }
    }

    public render(): void {
        GL11.glColor3f(1.0, 1.0, 1.0);

        for (var i = 3; i >= 0; --i) {
            var vertex: Vertex = this.vertices[i];

            GL11.glTexCoord2f(vertex.u / 64.0, vertex.v / 32.0);

            GL11.glVertex3f(vertex.position.x, vertex.position.y, vertex.position.z);
        }
    }
}