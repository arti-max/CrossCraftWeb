// Файл: TileDefinitions.ts

import { Tile } from './Tile';
import { GrassTile } from './GrassTile';
import { Bush } from './BushTile';

Tile.rock = new Tile(1, 1);
Tile.grass = new GrassTile(2);
Tile.dirt = new Tile(3, 3);
Tile.cobblestone = new Tile(4, 5);
Tile.wood = new Tile(5, 2);
Tile.bush = new Bush(6);

console.log("Tiles initialized!");

export { Tile, GrassTile, Bush };
