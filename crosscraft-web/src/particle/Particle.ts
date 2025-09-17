import { Entity } from "../Entity";
import type { Level } from "../level/Level";
import type { Tessellator } from "../render/Tessellator";



export class Particle extends Entity {

    public textureId: number;

    private readonly textureUOffset: number;
    private readonly textureVOffset: number;

    private readonly size: number;
    private readonly lifetime: number;

    private age: number = 0;


    /**
     * Particle entity
     *
     * @param level     The level
     * @param x         Particle location x
     * @param y         Particle location y
     * @param z         Particle location z
     * @param motionX   Particle motion x
     * @param motionY   Particle motion y
     * @param motionZ   Particle motion z
     * @param textureId Texture slot id of the particle
     */
    constructor(level: Level, x: number, y: number, z: number, motionX: number, motionY: number, motionZ: number, textureId: number) {
        super(level);

        this.textureId = textureId;

        this.setSize(0.2, 0.2);
        this.heightOffset = this.boundingBoxHeight / 2.0;

        this.setPosition(x, y, z);

        this.motionX = motionX + (Math.random() * 2.0 - 1.0) * 0.4;
        this.motionY = motionY + (Math.random() * 2.0 - 1.0) * 0.4;
        this.motionZ = motionZ + (Math.random() * 2.0 - 1.0) * 0.4;

        var speed: number = (Math.random() + Math.random() + 1.0) * 0.15;

        var distance: number = Math.sqrt(this.motionX * this.motionX + this.motionY * this.motionY + this.motionZ * this.motionZ);
        this.motionX = this.motionX / distance * speed * 0.7;
        this.motionY = this.motionY / distance * speed;
        this.motionZ = this.motionZ / distance * speed * 0.7;

        this.textureUOffset = Math.random() * 3.0;
        this.textureVOffset = Math.random() * 3.0;

        this.size = Math.random() * 0.5 + 0.5;
        this.lifetime = Math.floor(1.0 / Math.random() * 0.9 + 0.1);
    }

    public tick(): void {
        super.tick();

        if (this.age++ >= this.lifetime) {
            this.remove();
        }

        this.motionY -= 0.06;

        this.move(this.motionX, this.motionY, this.motionZ);

        this.motionX *= 0.98;
        this.motionY *= 0.98;
        this.motionZ *= 0.98;

        if (this.onGround) {
            this.motionX *= 0.7;
            this.motionZ *= 0.7;
        }
    }

    /**
     * Render particle
     *
     * @param tessellator  Tessellator for rendering
     * @param partialTicks Ticks for interpolation
     * @param cameraX      Camera rotation X
     * @param cameraY      Camera rotation Y
     * @param cameraZ      Camera rotation Z
     * @param cameraXWithY Additional camera rotation x including the y rotation
     * @param cameraZWithY Additional camera rotation z including the y rotation
     */
    public render(t: Tessellator, partialTicks: number, cameraX: number, cameraY: number, cameraZ: number, cameraXWithY: number, cameraZWithY: number): void {
        const atlasSize = 256.0;
        const tileSizeInPixels = 16.0;
        const particleTextureSizeInPixels = 4.0;
        const epsilon = 0.5;

        const tilePixelX = (this.textureId % 16) * tileSizeInPixels;
        const tilePixelY = Math.floor(this.textureId / 16) * tileSizeInPixels;
        
        const particlePixelU0 = tilePixelX + this.textureUOffset;
        const particlePixelV0 = tilePixelY + this.textureVOffset;
        
        const particlePixelU1 = particlePixelU0 + particleTextureSizeInPixels;
        const particlePixelV1 = particlePixelV0 + particleTextureSizeInPixels;

        
        const minU = (particlePixelU0 + epsilon) / atlasSize;
        const maxU = (particlePixelU1 - epsilon) / atlasSize;
        const minV = (particlePixelV0 + epsilon) / atlasSize;
        const maxV = (particlePixelV1 - epsilon) / atlasSize;

        var x = this.prevX + (this.x - this.prevX) * partialTicks;
        var y = this.prevY + (this.y - this.prevY) * partialTicks;
        var z = this.prevZ + (this.z - this.prevZ) * partialTicks;

        var size: number = this.size * 0.1;

        t.vertexUV(x - cameraX * size - cameraXWithY * size, y - cameraY * size, z - cameraZ * size - cameraZWithY * size, minU, maxV);
        t.vertexUV(x - cameraX * size + cameraXWithY * size, y + cameraY * size, z - cameraZ * size + cameraZWithY * size, minU, minV);
        t.vertexUV(x + cameraX * size + cameraXWithY * size, y + cameraY * size, z + cameraZ * size + cameraZWithY * size, maxU, minV);
        t.vertexUV(x + cameraX * size - cameraXWithY * size, y - cameraY * size, z + cameraZ * size - cameraZWithY * size, maxU, maxV);
    }

}