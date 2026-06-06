# Furnidata-Like Mapping for Hotel Exchange

This document describes how external furniture metadata with a Habbo-like shape can be adapted conceptually into Hotel Exchange. It is for educational architecture planning only.

## Legal Boundary

- Do not copy proprietary Habbo/Sulake code.
- Do not copy proprietary assets into this repository.
- Do not publish a public demo using unlicensed third-party sprites.
- Do not implement the Habbo protocol or turn Hotel Exchange into an emulator.
- Use this mapping only to understand furniture metadata concepts and to prepare first-party or licensed Hotel Exchange data.

## Goal

Hotel Exchange owns its stack and domain:

- React + Phaser frontend.
- Spring Boot backend.
- WebSocket multiplayer.
- PostgreSQL persistence.
- Trading/education theme.

External metadata can inspire the shape of a furniture catalog, but the resulting data model, naming, game behavior, sprites, and interactions must remain first-party Hotel Exchange concepts.

## Conceptual Field Mapping

| External field | Hotel Exchange field | Notes |
| --- | --- | --- |
| `classname` | `furniture_catalog.code` | Stable catalog code, snake_case preferred. |
| `name` | `furniture_catalog.name` | Display name. |
| `type = "s"` | `type = "FLOOR"` | Floor furniture. Wall furniture should become `WALL`. |
| `xdim` | `width` | Logical footprint width in tiles. |
| `ydim` | `height` | Logical footprint height in tiles. |
| `canstandon` | `can_walk` | If true, item should not block walking by itself. |
| `cansiton` | `can_sit` | Future seating behavior. |
| `canlayon` | `can_lay_on` future | Not implemented yet. |
| `defaultdir` | default room rotation | Can seed `room_furniture.rotation` later. |
| `stack_height` | `default_z` or future `stack_height` | Height/stacking is not implemented yet. |
| `allow_trade` | `tradeable` | Future inventory/marketplace behavior. |
| `classname` or sprite id | `sprite_key` | Use first-party sprite naming, for example `furniture_<code>`. |
| `classname` or sprite id | `sprite_path` | Use local licensed PNG path, for example `/assets/furniture/<code>.png`. |

## Derived Hotel Exchange Rules

`blocksMovement` should be derived from walkability:

```text
blocksMovement = !can_walk
```

`interactionType` should be Hotel Exchange-specific, not copied from an external source. Examples:

- `NONE`
- `SEAT`
- `TABLE`
- `DISPLAY`
- `EXCHANGE_DESK`
- `DECORATIVE`

`canStack` should stay conservative until height and stacking rules are implemented. For flat tables it can be modeled as true later, but placement validation must remain backend-authoritative.

## Example Mapping

External conceptual input:

```json
{
  "classname": "table_polyfon_small",
  "name": "Small Coffee Table",
  "type": "s",
  "xdim": 2,
  "ydim": 2,
  "canstandon": false,
  "cansiton": false,
  "canlayon": false,
  "defaultdir": 2,
  "stack_height": 0.4,
  "allow_trade": true
}
```

Hotel Exchange catalog output:

```json
{
  "code": "table_polyfon_small",
  "name": "Small Coffee Table",
  "type": "FLOOR",
  "spriteKey": "furniture_table_polyfon_small",
  "spritePath": "/assets/furniture/table_polyfon_small.png",
  "width": 2,
  "height": 2,
  "blocksMovement": true,
  "canSit": false,
  "canWalk": false,
  "canStack": true,
  "defaultZ": 0.4,
  "interactionType": "TABLE",
  "tradeable": true
}
```

Example SQL seed shape:

```sql
INSERT INTO furniture_catalog (
    code,
    name,
    type,
    sprite_key,
    sprite_path,
    width,
    height,
    blocks_movement,
    can_sit,
    can_walk,
    can_stack,
    default_z,
    interaction_type,
    tradeable
)
VALUES (
    'table_polyfon_small',
    'Small Coffee Table',
    'FLOOR',
    'furniture_table_polyfon_small',
    '/assets/furniture/table_polyfon_small.png',
    2,
    2,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    0.4,
    'TABLE',
    TRUE
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    sprite_key = EXCLUDED.sprite_key,
    sprite_path = EXCLUDED.sprite_path,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    blocks_movement = EXCLUDED.blocks_movement,
    can_sit = EXCLUDED.can_sit,
    can_walk = EXCLUDED.can_walk,
    can_stack = EXCLUDED.can_stack,
    default_z = EXCLUDED.default_z,
    interaction_type = EXCLUDED.interaction_type,
    tradeable = EXCLUDED.tradeable,
    updated_at = now();
```

## Import Pipeline Proposal

1. Normalize external names into Hotel Exchange `code`.
2. Reject records without valid positive `xdim` and `ydim`.
3. Map external booleans into `canWalk`, `canSit`, future `canLayOn`, and `tradeable`.
4. Derive `blocksMovement` from `canWalk`.
5. Assign first-party `spriteKey` and `spritePath`.
6. Assign Hotel Exchange `interactionType`.
7. Review output manually before creating a Flyway seed.
8. Keep sprite PNG files out of public source control unless they are first-party or licensed.

## Frontend Integration

Current frontend catalog data in `frontend/src/game/data/furnitureCatalog.ts` can remain a local fallback. Later, `FurnitureCatalogItemDto` can feed the same renderer if the API exposes sprite origin, render offsets, depth offsets, scale, and supported rotations.

`room_furniture` instances should remain server-provided and backend-validated. The frontend may render footprint debug, but it must not decide movement legality.

## Pending Backend Fields

Useful future additions before real importing:

- `can_lay_on`
- `stack_height`
- `default_direction`
- `render_origin_x`
- `render_origin_y`
- `render_offset_x`
- `render_offset_y`
- `depth_offset`
- `scale`
- `supported_rotations`
