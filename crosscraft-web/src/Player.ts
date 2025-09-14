import { Keyboard } from "../lib/IO/Keyboard";
import { Entity } from "./Entity";
import type { Level } from "./level/Level";

export class Player extends Entity {

    constructor(level: Level) {
        super(level);
    }


    public tick(): void {
        super.tick();

        let forward = 0.0;
        let vertical = 0.0;

        if (Keyboard.isKeyDown('KeyR')) { // R
            this.resetPosition();
        }

        if (Keyboard.isKeyDown('ArrowUp') || Keyboard.isKeyDown('KeyW')) {
            forward--;
        }
        if (Keyboard.isKeyDown('ArrowDown') || Keyboard.isKeyDown('KeyS')) {
            forward++;
        }
        if (Keyboard.isKeyDown('ArrowLeft') || Keyboard.isKeyDown('KeyA')) {
            vertical--;
        }
        if (Keyboard.isKeyDown('ArrowRight') || Keyboard.isKeyDown('KeyD')) {
            vertical++;
        }

        if (Keyboard.isKeyDown('Space')) {
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