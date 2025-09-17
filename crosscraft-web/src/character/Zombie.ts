import { GL, GL11 } from "../../lib/GL11/GL11";
import { Entity } from "../Entity";
import type { Level } from "../level/Level";
import type { Textures } from "../Textures";
import { ZombieModel } from "./ZombieModel";


export class Zombie extends Entity {
    private readonly model: ZombieModel = new ZombieModel();

    public rotation: number = Math.random() * Math.PI * 2;
    public rotationMotionFactor = (Math.random() + 1.0) * 0.01;

    public timeOffset = (Math.random() * 1239813.0);
    public speed = 1.0;

    constructor(level: Level, x: number, y: number, z: number) {
        super(level);

        this.setPosition(x, y, z);
    }

    public tick(): void {
        super.tick();

        if (this.y < -100.0) {
            this.remove();
        }

        this.rotation += this.rotationMotionFactor;

        this.rotationMotionFactor *= 0.99;
        this.rotationMotionFactor += (Math.random() - Math.random()) * Math.random() * Math.random() * 0.009999999776482582;

        var vertical: number = Math.sin(this.rotation);
        var forward: number = Math.cos(this.rotation);

        if (this.onGround && Math.random() < 0.08) {
            this.motionY = 0.5;
        }

        this.moveRelative(vertical, forward, this.onGround ? 0.1 : 0.02);

        this.motionY -= 0.08;

        this.move(this.motionX, this.motionY, this.motionZ);

        this.motionX *= 0.91;
        this.motionY *= 0.98;
        this.motionZ *= 0.91;

        if (this.onGround) {
            this.motionX *= 0.6;
            this.motionZ *= 0.6;
        }
    }

    public render(partialTicks: number, textures: Textures): void {
        GL11.glPushMatrix();
        GL11.glEnable(GL.TEXTURE_2D);

        GL11.glBindTexture(GL.TEXTURE_2D, textures.loadTexture('/char.png', GL.NEAREST));

        var time: number = (performance.now() / 1000.0 * 10.0 * this.speed) + this.timeOffset;

        var interpolatedX = this.prevX + (this.x - this.prevX) * partialTicks;
        var interpolatedY = this.prevY + (this.y - this.prevY) * partialTicks;
        var interpolatedZ = this.prevZ + (this.z - this.prevZ) * partialTicks;

        GL11.glTranslatef(interpolatedX, interpolatedY, interpolatedZ);

        GL11.glScalef(1.0, -1.0, 1.0);

        var size: number = 7.0 / 120.0;
        GL11.glScalef(size, size, size);

        var offsetY: number = Math.abs(Math.sin(time * 2.0 / 3.0)) * 5.0 + 24.5;
        GL11.glTranslatef(0.0, -offsetY, 0.0);

        GL11.glRotatef(toDegrees(this.rotation) + 180, 0.0, 1.0, 0.0);

        this.model.render(time);

        GL11.glDisable(GL.TEXTURE_2D);
        GL11.glPopMatrix();
    }
}

function toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
}