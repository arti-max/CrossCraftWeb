import type { Tessellator } from "../render/Tessellator";
import type { Level } from "./Level";


export class Tile {

    public static grass: Tile = new Tile(0);
    public static rock: Tile = new Tile(1);

    public readonly textureId: number;

    constructor(texturedId: number) {
        this.textureId = texturedId;
    }

    public render(t: Tessellator, level: Level, layer: number, x: number, y: number, z: number): void {
        var minU: number = this.textureId / 16.0;
        var maxU: number = minU + 16 / 256.0;
        var minV: number = 0.0;
        var maxV: number = minV + 16 / 256.0;

        var shadeX: number = 0.6;
        var shadeY: number = 1.0;
        var shadeZ: number = 0.8;

        var minX: number = x + 0.0;
        var minY: number = y + 0.0;
        var minZ: number = z + 0.0;
        var maxX: number = x + 1.0;
        var maxY: number = y + 1.0;
        var maxZ: number = z + 1.0;

        // Render bottom face
        if (!level.isSolidTile(x, y - 1, z)) {
            const brightness = shadeY;
            if ((layer === 1) !== (brightness === shadeY)) {
                t.color(brightness, brightness, brightness);
                t.texture(minU, maxV); t.vertex(minX, minY, maxZ);
                t.texture(minU, minV); t.vertex(minX, minY, minZ);
                t.texture(maxU, minV); t.vertex(maxX, minY, minZ);
                t.texture(maxU, maxV); t.vertex(maxX, minY, maxZ);
            }
        }

        // Render top face
        if (!level.isSolidTile(x, y + 1, z)) {
            const brightness = shadeY;
            if ((layer === 1) !== (brightness === shadeY)) {
                t.color(brightness, brightness, brightness);
                t.texture(maxU, maxV); t.vertex(maxX, maxY, maxZ);
                t.texture(maxU, minV); t.vertex(maxX, maxY, minZ);
                t.texture(minU, minV); t.vertex(minX, maxY, minZ);
                t.texture(minU, maxV); t.vertex(minX, maxY, maxZ);
            }
        }

        // Render side faces Z
        if (!level.isSolidTile(x, y, z - 1)) {
            const brightness = shadeZ;
            if ((layer === 1) !== (brightness === shadeZ)) {
                t.color(brightness, brightness, brightness);
                t.texture(maxU, minV); t.vertex(minX, maxY, minZ);
                t.texture(minU, minV); t.vertex(maxX, maxY, minZ);
                t.texture(minU, maxV); t.vertex(maxX, minY, minZ);
                t.texture(maxU, maxV); t.vertex(minX, minY, minZ);
            }
        }
        if (!level.isSolidTile(x, y, z + 1)) {
            const brightness = shadeZ;
            if ((layer === 1) !== (brightness === shadeZ)) {
                t.color(brightness, brightness, brightness);
                t.texture(minU, minV); t.vertex(minX, maxY, maxZ);
                t.texture(minU, maxV); t.vertex(minX, minY, maxZ);
                t.texture(maxU, maxV); t.vertex(maxX, minY, maxZ);
                t.texture(maxU, minV); t.vertex(maxX, maxY, maxZ);
            }
        }

        // Render side faces X
        if (!level.isSolidTile(x - 1, y, z)) {
            const brightness = shadeX;
            if ((layer === 1) !== (brightness === shadeX)) {
                t.color(brightness, brightness, brightness);
                t.texture(maxU, minV); t.vertex(minX, maxY, maxZ);
                t.texture(minU, minV); t.vertex(minX, maxY, minZ);
                t.texture(minU, maxV); t.vertex(minX, minY, minZ);
                t.texture(maxU, maxV); t.vertex(minX, minY, maxZ);
            }
        }
        if (!level.isSolidTile(x + 1, y, z)) {
            const brightness = shadeX;
            if ((layer === 1) !== (brightness === shadeX)) {
                t.color(brightness, brightness, brightness);
                t.texture(minU, maxV); t.vertex(maxX, minY, maxZ);
                t.texture(maxU, maxV); t.vertex(maxX, minY, minZ);
                t.texture(maxU, minV); t.vertex(maxX, maxY, minZ);
                t.texture(minU, minV); t.vertex(maxX, maxY, maxZ);
            }
        }
    }
}