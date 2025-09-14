import type { Player } from "./Player";


export class HitResult {
    public type: number;
    public x: number;
    public y: number;
    public z: number;
    public f: number;

    constructor(type: number, x: number, y: number, z: number, f: number) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.z = z;
        this.f = f;
    }

    public isClotherThan(player: Player, o: HitResult, editMode: number): boolean {
        var dist = this.distanceTo(player, 0);
        var dist2 = o.distanceTo(player, 0);

        if (dist < dist2) {
            return true;
        } else {
            dist = this.distanceTo(player, editMode);
            dist2 = o.distanceTo(player, editMode);
            return dist < dist2;
        }
    }

    private distanceTo(player: Player, editMode: number): number {
        var xx: number = this.x;
        var yy: number = this.y;
        var zz: number = this.z;

        if (editMode == 1) {
            if (this.f == 0) {
                --yy;
            }

            if (this.f == 1) {
                ++yy;
            }

            if (this.f == 2) {
                --zz;
            }

            if (this.f == 3) {
                ++zz;
            }

            if (this.f == 4) {
                --xx;
            }

            if (this.f == 5) {
                ++xx;
            }
        }

        var xd: number = xx - player.x;
        var yd: number = yy - player.y;
        var zd: number = zz - player.z;
        return xd*xd + yd*yd + zd*zd;
    }
}