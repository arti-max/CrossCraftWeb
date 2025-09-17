import type { Level } from "./level/Level";
import { AABB } from "./phys/AABB";
import { Keyboard } from '../lib/IO/Keyboard';


export class Entity {
    private level: Level;

    public x: number = 0;
    public y: number = 0;
    public z: number = 0;

    public prevX: number = 0;
    public prevY: number = 0;
    public prevZ: number = 0;

    public motionX: number = 0;
    public motionY: number = 0;
    public motionZ: number = 0;

    public xRotation: number = 0;
    public yRotation: number = 0;

    protected onGround: boolean = false;
    protected heightOffset: number = 0;

    public boundingBox!: AABB;
    protected boundingBoxWidth: number = 0.6;
    protected boundingBoxHeight: number = 1.8;


    public removed: boolean = false;

    constructor(level: Level) {
        this.level = level;

        this.resetPosition();
    }

    public resetPosition(): void {
        var x: number = Math.random() * this.level.width;
        var y: number = 3 + this.level.depth;
        var z: number = Math.random() * this.level.height;

        this.setPosition(x, y, z);
    }

    public remove(): void {
        this.removed = true;
    }

    /**
     * Set the player to a specific location
     *
     * @param x Position x
     * @param y Position y
     * @param z Position z
     */
    public setPosition(x: number, y: number, z: number): void {
        this.x = x;
        this.y = y;
        this.z = z;

        var width: number = this.boundingBoxWidth / 2.0;
        var height: number = this.boundingBoxHeight / 2.0;

        this.boundingBox = new AABB(x - width, y - height, z - width, x + width, y + height, z + width);
    }

    protected setSize(width: number, height: number): void {
        this.boundingBoxWidth = width;
        this.boundingBoxHeight = height;
    }

    /**
     * Turn the camera using motion yaw and pitch
     *
     * @param x Rotate the camera using yaw
     * @param y Rotate the camera using pitch
     */
    public turn(x: number, y: number): void {
        this.yRotation += x * 0.15;
        this.xRotation -= y * 0.15;

        // Pitch limit
        this.xRotation = Math.max(-90.0, this.xRotation);
        this.xRotation = Math.min(90.0, this.xRotation);
    }

    public tick(): void {
        this.prevX = this.x;
        this.prevY = this.y;
        this.prevZ = this.z;
    }

    /**
     * Move player relative in level with collision check
     *
     * @param x Relative x
     * @param y Relative y
     * @param z Relative z
     */
    public move(x: number, y: number, z: number): void {
        var prevX: number = x;
        var prevY: number = y;
        var prevZ: number = z;

        var aABBs: Array<AABB> = this.level.getCubes(this.boundingBox.expand(x, y, z));

        for (var abb of aABBs) {
            y = abb.clipYCollide(this.boundingBox, y);
        }
        this.boundingBox.move(0.0, y, 0.0);

        for (var abb of aABBs) {
            x = abb.clipXCollide(this.boundingBox, x);
        }
        this.boundingBox.move(x, 0.0, 0.0);

        for (var abb of aABBs) {
            z = abb.clipZCollide(this.boundingBox, z);
        }
        this.boundingBox.move(0.0, 0.0, z);

        this.onGround = prevY != y && prevY < 0.0;

        if (prevX != x) this.motionX = 0.0;
        if (prevY != y) this.motionY = 0.0;
        if (prevZ != z) this.motionZ = 0.0;

        this.x = (this.boundingBox.minX + this.boundingBox.maxX) / 2.0;
        this.y = this.boundingBox.minY + this.heightOffset;
        this.z = (this.boundingBox.minZ + this.boundingBox.maxZ) / 2.0;
    }

    /**
     * Add motion to the player in the facing direction with given speed
     *
     * @param x     Motion to add on X axis
     * @param z     Motion to add on Z axis
     * @param speed Strength of the added motion
     */
    public moveRelative(x: number, z: number, speed: number): void {
        var distance: number = x*x + z*z;

        if (distance < 0.01) return;

        distance = speed / Math.sqrt(distance);
        x *= distance;
        z *= distance;

        var sin: number = Math.sin(toRad(this.yRotation));
        var cos: number = Math.cos(toRad(this.yRotation));

        this.motionX += x * cos - z * sin;
        this.motionZ += z * cos + x * sin;
    }

    public isLit(): boolean {
        return this.level.isLit(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    }
}

function toRad(Value: number) {
    /** Converts numeric degrees to radians */
    return Value * Math.PI / 180;
}