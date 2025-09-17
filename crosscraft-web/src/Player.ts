import { Key } from "../lib/IO/Key";
import { Keyboard } from "../lib/IO/Keyboard";
import { Entity } from "./Entity";
import type { Level } from "./level/Level";

export class Player extends Entity {
    public static readonly KEY_UP: number = 0;
    public static readonly KEY_DOWN: number = 0;
    public static readonly KEY_LEFT: number = 0;
    public static readonly KEY_RIGHT: number = 0;
    public static readonly KEY_JUMP: number = 0;
    private keys: boolean[] = new Array<boolean>(10);

    constructor(level: Level) {
        super(level);

        this.heightOffset = 1.62;
    }

    public setKey(key: number, state: boolean): void {
        var id = -1;
        if (key == 200 || key == 17) {
            id = 0;
        }

        if (key == 208 || key == 31) {
            id = 1;
        }

        if (key == 203 || key == 30) {
            id = 2;
        }

        if (key == 205 || key == 32) {
            id = 3;
        }

        if (key == 57 || key == 219) {
            id = 4;
        }

        if (key == Key.R) {
            id = 5;
        }

        if (id >= 0) {
            this.keys[id] = state;
        }
    }

    public releaseAllKeys(): void {
        for (var i = 0; i < 10; ++i) {
            this.keys[i] = false;
        }
    }

    public tick(): void {
        super.tick();

        let forward = 0.0;
        let vertical = 0.0;

        if (this.keys[5]) { // R
            this.resetPosition();
        }

        if (this.keys[0]) {
            forward--;
        }
        if (this.keys[1]) {
            forward++;
        }
        if (this.keys[2]) {
            vertical--;
        }
        if (this.keys[3]) {
            vertical++;
        }

        if (this.keys[4]) {
            if (this.onGround) {
                this.motionY = 0.5;
            }
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
}