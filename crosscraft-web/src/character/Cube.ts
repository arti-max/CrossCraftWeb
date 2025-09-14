import { GL, GL11 } from "../../lib/GL11/GL11";
import { Polygon } from "./Polygon";
import { Vertex } from "./Vertex";


export class Cube {
    private polygons!: Polygon[];

    private textureOffsetX: number = 0;
    private textureOffsetY: number = 0;

    public x: number = 0;
    public y: number = 0;
    public z: number = 0;

    public xRotation: number = 0;
    public yRotation: number = 0;
    public zRotation: number = 0;

    constructor(textureOffsetX: number, textureOffsetY: number) {
        this.textureOffsetX = textureOffsetX;
        this.textureOffsetY = textureOffsetY;
    }

    public setTextureOffset(textureOffsetX: number, textureOffsetY: number): void {
        this.textureOffsetX = textureOffsetX;
        this.textureOffsetY = textureOffsetY;
    }

    public addBox(offsetX: number, offsetY: number, offsetZ: number, width: number, height: number, depth: number): Cube {
        this.polygons = new Array<Polygon>(6);

        var x: number = offsetX + width;
        var y: number = offsetY + height;
        var z: number = offsetZ + depth;

        var vertexBottom1: Vertex = new Vertex(offsetX, offsetY, offsetZ, 0.0, 0.0);
        var vertexBottom2: Vertex = new Vertex(x, offsetY, offsetZ, 0.0, 8.0);
        var vertexBottom3: Vertex = new Vertex(offsetX, offsetY, z, 0.0, 0.0);
        var vertexBottom4: Vertex = new Vertex(x, offsetY, z, 0.0, 8.0);

        var vertexTop1: Vertex = new Vertex(x, y, z, 8.0, 8.0);
        var vertexTop2: Vertex = new Vertex(offsetX, y, z, 8.0, 0.0);
        var vertexTop3: Vertex = new Vertex(x, y, offsetZ, 8.0, 8.0);
        var vertexTop4: Vertex = new Vertex(offsetX, y, offsetZ, 8.0, 0.0);

        this.polygons[0] = new Polygon(
            new Array<Vertex>(vertexBottom4, vertexBottom2, vertexTop3, vertexTop1),
            this.textureOffsetX + depth + width,
            this.textureOffsetY + depth,
            this.textureOffsetX + depth + width + depth,
            this.textureOffsetY + depth + height
        );
        this.polygons[1] = new Polygon(
            new Array<Vertex>(vertexBottom1, vertexBottom3, vertexTop2, vertexTop4),
            this.textureOffsetX,
            this.textureOffsetY + depth,
            this.textureOffsetX + depth,
            this.textureOffsetY + depth + height
        );
        this.polygons[2] = new Polygon(
            new Array<Vertex>(vertexBottom4, vertexBottom3, vertexBottom1, vertexBottom2),
            this.textureOffsetX + depth,
            this.textureOffsetY,
            this.textureOffsetX + depth + width,
            this.textureOffsetY + depth
        );
        this.polygons[3] = new Polygon(
            new Array<Vertex>(vertexTop3, vertexTop4, vertexTop2, vertexTop1),
            this.textureOffsetX + depth + width,
            this.textureOffsetY,
            this.textureOffsetX + depth + width + width,
            this.textureOffsetY + depth
        );
        this.polygons[4] = new Polygon(
            new Array<Vertex>(vertexBottom2, vertexBottom1, vertexTop4, vertexTop3),
            this.textureOffsetX + depth,
            this.textureOffsetY + depth,
            this.textureOffsetX + depth + width,
            this.textureOffsetY + depth + height
        );
        this.polygons[5] = new Polygon(
            new Array<Vertex>(vertexBottom3, vertexBottom4, vertexTop1, vertexTop2),
            this.textureOffsetX + depth + width + depth,
            this.textureOffsetY + depth,
            this.textureOffsetX + depth + width + depth + width,
            this.textureOffsetY + depth + height
        );

        return this;
    }

    public setPosition(x: number, y: number, z: number): void {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public render(): void {
        GL11.glPushMatrix();

        GL11.glTranslatef(this.x, this.y, this.z);

        GL11.glRotatef(toDegrees(this.zRotation), 0.0, 0.0, 1.0);
        GL11.glRotatef(toDegrees(this.yRotation), 0.0, 1.0, 0.0);
        GL11.glRotatef(toDegrees(this.xRotation), 1.0, 0.0, 0.0);

        GL11.glBegin(GL.QUADS);

        for (var p of this.polygons) {
            p.render();
        }

        GL11.glEnd();

        GL11.glPopMatrix();
    }
}

function toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
}