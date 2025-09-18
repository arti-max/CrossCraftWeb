// Файл: TileDefinitions.ts

import { Tile } from './Tile';
import { GrassTile } from './GrassTile';
import { Bush } from './BushTile';
import { LiquidTile } from './LiquidTile';
import { CalmLiquidTile } from './CalmLiquidTile';

Tile.rock = new Tile(1, 1);
Tile.grass = new GrassTile(2);
Tile.dirt = new Tile(3, 3);
Tile.cobblestone = new Tile(4, 5);
Tile.wood = new Tile(5, 2);
Tile.bush = new Bush(6);
Tile.unbreakble = new Tile(7, 17);
Tile.water = new LiquidTile(8, 1);
Tile.calmWater = new CalmLiquidTile(9, 1);
Tile.lava = new LiquidTile(10, 2);
Tile.calmLava = new CalmLiquidTile(11, 2);

console.log("Tiles initialized!");

export { Tile, GrassTile, Bush, LiquidTile, CalmLiquidTile };
