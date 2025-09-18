import type { Random } from "../../../lib/UTIL/Random";
import type { Level } from "../Level";
import { LiquidTile } from "./LiquidTile";
import { Tile } from "./Tile";


export class CalmLiquidTile extends LiquidTile {

   constructor(id: number, liquidType: number) {
        super(id, liquidType);
        this.tileId = id - 1;
        this.calmTileId = id;
   }

   public isCalmLiquid(): boolean {
      return true;
   }

   public tick(level: Level, x: number, y: number, z: number, random: Random): void {
   }

   public neighborChanged(level: Level, x: number, y: number, z: number, type: number): void {
        var hasAirNeighbor: boolean = false;

        if (level.getTile(x - 1, y, z) == 0) {
         hasAirNeighbor = true;
      }

      if (level.getTile(x + 1, y, z) == 0) {
         hasAirNeighbor = true;
      }

      if (level.getTile(x, y, z - 1) == 0) {
         hasAirNeighbor = true;
      }

      if (level.getTile(x, y, z + 1) == 0) {
         hasAirNeighbor = true;
      }

      if (level.getTile(x, y - 1, z) == 0) {
         hasAirNeighbor = true;
      }

      if (hasAirNeighbor) {
         level.setTileNoUpdate(x, y, z, this.tileId);
         level.addLiquidPosition(x, y, z);
      }

      if (this.liquidType == 1 && type == Tile.lava.id) {
         level.setTileNoUpdate(x, y, z, Tile.rock.id);
      }

      if (this.liquidType == 2 && type == Tile.water.id) {
         level.setTileNoUpdate(x, y, z, Tile.rock.id);
      }
   }
}