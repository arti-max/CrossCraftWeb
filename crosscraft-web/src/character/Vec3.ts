

export class Vec3 {
    public x: number;
    public y: number;
    public z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public interpolateTo(v: Vec3, partialTicks: number): Vec3 {
        var interpolatedX: number = this.x + (v.x - this.x) * partialTicks;
        var interpolatedY: number = this.y + (v.y - this.y) * partialTicks;
        var interpolatedZ: number = this.z + (v.z - this.z) * partialTicks;

        return new Vec3(interpolatedX, interpolatedY, interpolatedZ);
    }

    public set(x: number, y: number, z: number): void {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}