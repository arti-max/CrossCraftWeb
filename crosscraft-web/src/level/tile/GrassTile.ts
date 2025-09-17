import { Random } from "../../../lib/UTIL/Random";
import type { Level } from "../Level";
import { Tile } from "./Tile";


export class GrassTile extends Tile {

    constructor(id: number) {
        super(id);

        this.textureId = 4;
    }

    protected getTexture(face: number): number {
        return face == 1 ? 0 : face == 0 ? 3 : 4;
    }

    public tick(level: Level, x: number, y: number, z: number, random: Random) {
        if (level.isLit(x, y, z)) {
            for (var i = 0; i < 4; ++i) {
                var targetX: number = x + random.nextInt(3) - 1;
                var targetY: number = y + random.nextInt(5) - 3;
                var targetZ: number = z + random.nextInt(3) - 1;

                if (level.getTile(targetX, targetY, targetZ) == Tile.dirt.id && level.isLit(targetX, targetY, targetZ)) {
                    level.setTile(targetX, targetY, targetZ, Tile.grass.id);
                }
            }
        } else {
            level.setTile(x, y, z, Tile.dirt.id);
        }
    }

}