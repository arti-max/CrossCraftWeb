import type { Level } from "./level/Level";
import { AABB } from "./phys/AABB";
import { Keyboard } from '../lib/IO/Keyboard';


export class Player {
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

    private onGround: boolean = false;

    public boundingBox!: AABB;

    constructor(level: Level) {
        this.level = level;

        this.resetPosition();
    }

    private resetPosition(): void {
        var x: number = Math.random() * this.level.width;
        var y: number = 3 + this.level.depth;
        var z: number = Math.random() * this.level.height;

        this.setPosition(x, y, z);
    }

    /**
     * Set the player to a specific location
     *
     * @param x Position x
     * @param y Position y
     * @param z Position z
     */
    private setPosition(x: number, y: number, z: number): void {
        this.x = x;
        this.y = y;
        this.z = z;

        var width: number = 0.3;
        var height: number = 0.9;

        this.boundingBox = new AABB(x - width, y - height, z - width, x + width, y + height, z + width);
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
        // Сохраняем предыдущую позицию
        this.prevX = this.x;
        this.prevY = this.y;
        this.prevZ = this.z;

        let forward = 0.0;
        let vertical = 0.0;

        // --- Обработка ввода ---
        // Сброс позиции
        if (Keyboard.isKeyDown('KeyR')) { // R
            this.resetPosition();
        }

        // Движение
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

        // Прыжок
        if (Keyboard.isKeyDown('Space')) {
            if (this.onGround) {
                this.motionY = 0.5; // В оригинале было 0.12, но это очень мало для гравитации 0.005
            }
        }

        // --- Физика ---
        // Применяем движение от клавиатуры
        this.moveRelative(vertical, forward, this.onGround ? 0.1 : 0.02);
        
        // Применяем гравитацию
        this.motionY -= 0.08; // Стандартная гравитация
        
        // Двигаем игрока с учетом столкновений
        this.move(this.motionX, this.motionY, this.motionZ);
        
        // Применяем "трение"
        this.motionX *= 0.91;
        this.motionY *= 0.98;
        this.motionZ *= 0.91;

        // Дополнительное трение на земле
        if (this.onGround) {
            this.motionX *= 0.6;
            this.motionZ *= 0.6;
        }
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
        this.y = this.boundingBox.minY + 1.62
        this.z = (this.boundingBox.minZ + this.boundingBox.maxZ) / 2.0;
    }

    /**
     * Add motion to the player in the facing direction with given speed
     *
     * @param x     Motion to add on X axis
     * @param z     Motion to add on Z axis
     * @param speed Strength of the added motion
     */
    private moveRelative(x: number, z: number, speed: number): void {
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
}

function toRad(Value: number) {
    /** Converts numeric degrees to radians */
    return Value * Math.PI / 180;
}