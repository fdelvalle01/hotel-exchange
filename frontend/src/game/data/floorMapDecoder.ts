export interface RoomTileView {
  x: number;
  y: number;
  exists: boolean;
  walkable: boolean;
  height: number;
  raw: string;
}

export function decodeFloorMap(
  floorMap: string,
  width: number,
  height: number,
): RoomTileView[] {
  const rows = floorMap.split('\n');

  if (rows.length !== height) {
    if (import.meta.env.DEV) {
      console.warn(
        `[floorMapDecoder] Row count ${rows.length} doesn't match height ${height}. Using rectangular fallback.`,
      );
    }
    return rectangularFallback(width, height);
  }

  const tiles: RoomTileView[] = [];

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    if (row.length !== width) {
      if (import.meta.env.DEV) {
        console.warn(
          `[floorMapDecoder] Row ${y} has length ${row.length}, expected ${width}. Using rectangular fallback.`,
        );
      }
      return rectangularFallback(width, height);
    }
    for (let x = 0; x < row.length; x++) {
      tiles.push(parseTile(x, y, row[x]));
    }
  }

  return tiles;
}

function parseTile(x: number, y: number, char: string): RoomTileView {
  switch (char) {
    case 'x':
    case 'X':
      return { x, y, exists: false, walkable: false, height: 0, raw: char };
    case '0':
      return { x, y, exists: true, walkable: true, height: 0, raw: char };
    case 'b':
    case 'B':
      return { x, y, exists: true, walkable: false, height: 0, raw: char };
    default: {
      const digit = char.charCodeAt(0) - '0'.charCodeAt(0);
      if (digit >= 1 && digit <= 9) {
        return { x, y, exists: true, walkable: true, height: digit, raw: char };
      }
      if (import.meta.env.DEV) {
        console.warn(
          `[floorMapDecoder] Unknown tile character '${char}' at (${x},${y}). Treating as void.`,
        );
      }
      return { x, y, exists: false, walkable: false, height: 0, raw: char };
    }
  }
}

function rectangularFallback(width: number, height: number): RoomTileView[] {
  const tiles: RoomTileView[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({ x, y, exists: true, walkable: true, height: 0, raw: '0' });
    }
  }
  return tiles;
}

export function tileKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function existingTileKeys(tiles: RoomTileView[]): Set<string> {
  return new Set(tiles.filter((t) => t.exists).map((t) => tileKey(t.x, t.y)));
}

export function walkableTileKeys(tiles: RoomTileView[]): Set<string> {
  return new Set(tiles.filter((t) => t.walkable).map((t) => tileKey(t.x, t.y)));
}

export function structuralBlockedTileKeys(tiles: RoomTileView[]): Set<string> {
  return new Set(
    tiles.filter((t) => t.exists && !t.walkable).map((t) => tileKey(t.x, t.y)),
  );
}

export function tileExists(tiles: RoomTileView[], x: number, y: number): boolean {
  return existingTileKeys(tiles).has(tileKey(x, y));
}

export function tileIsWalkable(tiles: RoomTileView[], x: number, y: number): boolean {
  return walkableTileKeys(tiles).has(tileKey(x, y));
}
