# Room And Furniture Architecture

Date: 2026-06-05 17:57:55 -04:00

## Purpose

This document defines a Hotel Exchange owned architecture for persistent rooms and furniture. The goal is to evolve from the current frontend static furniture setup into a backend-validated, realtime, multiplayer furniture system.

Kepler was reviewed only as a conceptual reference for common virtual-hotel patterns. No Kepler code, assets, protocol messages, packet formats, database schema, or proprietary/internal names are copied into Hotel Exchange.

Hotel Exchange remains its own product:

- React + Phaser frontend
- Spring Boot backend
- WebSocket realtime transport
- PostgreSQL + Flyway persistence
- Exchange/trading themed multiplayer education game

## Current Hotel Exchange Baseline

The current implementation already has:

- Login V2 retro UI
- Lobby V2 Hotel Navigator
- Main Lobby in Phaser
- Multiplayer WebSocket presence
- Tile-by-tile pathfinding
- Chat bubbles
- Static Sprite Furniture System
- FASE 4A backend persistent furniture foundation
- Initial furniture sprites:
  - `green_leather_sofa.png`
  - `red_executive_chair.png`
  - `dark_wood_coffee_table.png`

FASE 4A moved Main Lobby furniture state into PostgreSQL:

- `V4__persistent_furniture.sql` creates `furniture_catalog` and `room_furniture`.
- `GET /api/rooms/{roomId}` returns `furniture` and backend-calculated `blockedTiles`.
- WebSocket movement validation uses backend blockers generated from persisted furniture.
- `frontend/src/game/data/mainLobbyFurniture.ts` remains only as a temporary fallback when the API returns no furniture.
- FASE 4B adds basic quantity-based user inventory:
  - `V10__user_inventory.sql` creates `user_inventory`.
  - `GET /api/me/inventory` returns the authenticated user's furniture inventory.
  - `DataSeeder` keeps `trader` and `broker` inventory seeds idempotent after runtime user creation.
  - Inventory placement/removal is not implemented yet.

Render metadata still lives in frontend TypeScript while art direction stabilizes:

- `frontend/src/game/data/furnitureCatalog.ts`

The target architecture moves these concepts behind backend APIs and persisted database tables while keeping the existing Phaser rendering pipeline reusable.

## Conceptual Reference Notes From Kepler

Kepler was useful to study high-level separation of concerns common in virtual-hotel room engines:

- Room metadata is separate from the runtime room object.
- A room model defines dimensions, entry location, base walkability, and base tile height.
- A runtime tile map is regenerated from base room model data plus placed objects and active users.
- Furniture definition data is separate from furniture instances placed in a room.
- Furniture instances carry owner, room, position, height, rotation, and custom state.
- Placed furniture can affect multiple tiles depending on width, height, and rotation.
- Movement validation checks the room model, placed furniture, active entities, and height/stacking rules.
- Inventory is separate from placed furniture: an item can be in a user inventory or in a room, but not both.
- Catalog pages/items are separate from owned inventory items.
- Room rights determine who can place, move, remove, or interact with objects.
- Realtime room events broadcast item placement, movement, removal, and state changes to all room users.

These are general game architecture concepts. Hotel Exchange will adapt them with its own naming, DTOs, database schema, services, and event model.

## Explicit Non-Goals

Hotel Exchange will not:

- Copy Kepler source code.
- Copy Kepler assets.
- Copy Habbo/Sulake assets into a public repository or public demo.
- Copy old protocol packet names or packet formats.
- Implement the Habbo protocol.
- Become an emulator.
- Recreate proprietary room names, item names, message names, or internal naming conventions.
- Add marketplace, wallet, order book, or trading furniture ownership in the inventory MVP.

## Target Architecture Overview

The future room/furniture system should be split into these backend-owned domains:

- `Room`: persistent room metadata and base dimensions.
- `RoomModel`: optional reusable layout template for dimensions, base height map, spawn position, and base blocked tiles.
- `FurnitureCatalog`: reusable definition of an item type.
- `RoomFurniture`: one placed instance of a catalog item in a room.
- `UserInventory`: user-owned furniture quantities; basic read-only inventory is implemented, placement is future.
- `RoomPermission`: future explicit room permissions beyond owner/admin.
- `RoomRuntimeState`: in-memory presence, active users, transient movement, and derived blocked tiles.

The backend should be authoritative for:

- Room bounds.
- Placement validity.
- Ownership/permissions.
- Furniture footprint.
- Blocked tile recalculation.
- Movement path validation.
- Realtime event emission after persistence.

The frontend should be responsible for:

- Rendering room tiles, users, and furniture.
- Showing placement previews.
- Sending requested actions.
- Re-rendering from backend DTOs and WebSocket events.
- Avoiding client-side crashes if an asset is missing.

## Proposed Backend Entities

### RoomEntity

Purpose: persistent room metadata and navigation data.

Fields:

- `id`
- `name`
- `description`
- `width`
- `height`
- `spawnX`
- `spawnY`
- `modelCode`
- `status`
- `createdAt`
- `updatedAt`

Recommended notes:

- `modelCode` can point to an optional future room model table or a well-known built-in model.
- `status` can start with `ACTIVE`, `HIDDEN`, `DISABLED`.
- `width` and `height` remain denormalized on the room for simple MVP reads.

### FurnitureCatalogEntity

Purpose: persistent definition of a furniture type.

Fields:

- `id`
- `code`
- `name`
- `type`
- `spriteKey`
- `width`
- `height`
- `canSit`
- `canWalk`
- `canStack`
- `blocksMovement`
- `defaultZ`
- `interactionType`
- `tradeable`
- `createdAt`
- `updatedAt`

Recommended notes:

- `code` is the stable API identifier, for example `green_leather_sofa`.
- `type` can start with `FLOOR`, `WALL`, `DECORATION`.
- `spriteKey` maps to frontend asset metadata.
- `canWalk` means an avatar may stand on the item footprint.
- `blocksMovement` means the item blocks movement when `canWalk=false`.
- `defaultZ` supports future height/stacking without needing an immediate 3D engine.
- `interactionType` should be Hotel Exchange owned, for example `NONE`, `SEAT`, `TOGGLE`, `MARKET_SCREEN`, `INFO_PANEL`.
- `tradeable` is for future inventory/marketplace phases only.

### RoomFurnitureEntity

Purpose: one placed furniture instance in one room.

Fields:

- `id`
- `roomId`
- `catalogItemId`
- `ownerUserId`
- `x`
- `y`
- `z`
- `rotation`
- `state`
- `createdAt`
- `updatedAt`

Recommended notes:

- `x` and `y` are grid coordinates of the placement anchor.
- `z` is the floor or stack height.
- `rotation` can start as `NE`, `SE`, `SW`, `NW`.
- `state` stores small interaction state as JSON/text, for example `{ "open": true }`.
- `ownerUserId` can be nullable for system-owned room furniture.

### UserInventoryEntity

Purpose: user inventory ownership.

Fields:

- `id`
- `userId`
- `catalogItemId`
- `quantity`
- `source`
- `createdAt`
- `updatedAt`

Recommended notes:

- The first inventory phase uses quantity-based rows in `user_inventory`.
- `GET /api/me/inventory` is authenticated and never accepts a target `userId`.
- If Hotel Exchange later needs unique item metadata per inventory object, introduce `UserInventoryItemEntity` rather than overloading quantity rows.
- `source` can start with `SEED`, `ADMIN_GRANT`, `REWARD`, `PURCHASE`.

## Proposed REST DTOs

### RoomDetailDto

Purpose: one room payload for initial scene load.

Fields:

- `id`
- `name`
- `description`
- `width`
- `height`
- `spawnX`
- `spawnY`
- `modelCode`
- `status`
- `blockedTiles`
- `furniture`
- `onlineCount`

Notes:

- `blockedTiles` should be backend-calculated from base room layout plus validated furniture.
- `furniture` should be a list of `RoomFurnitureDto`.

### FurnitureCatalogItemDto

Purpose: public furniture definition data safe for frontend rendering.

Fields:

- `id`
- `code`
- `name`
- `type`
- `spriteKey`
- `spritePath`
- `width`
- `height`
- `canSit`
- `canWalk`
- `canStack`
- `blocksMovement`
- `defaultZ`
- `interactionType`
- `tradeable`
- `originX`
- `originY`
- `anchorOffsetX`
- `anchorOffsetY`
- `depthOffset`
- `scale`

Notes:

- Render-only fields can live in backend later, but they may remain frontend-owned until art direction stabilizes.
- If backend does not own art metadata in the first phase, return only gameplay fields and let the frontend merge by `code`.

### RoomFurnitureDto

Purpose: one placed item instance in a room.

Fields:

- `id`
- `roomId`
- `catalogItem`
- `ownerUserId`
- `x`
- `y`
- `z`
- `rotation`
- `state`
- `createdAt`
- `updatedAt`

### InventoryItemDto

Purpose: one authenticated user's owned furniture catalog row plus quantity.

Fields:

- `id`
- `catalogItemId`
- `code`
- `name`
- `type`
- `spriteKey`
- `spritePath`
- `width`
- `height`
- `quantity`
- `canSit`
- `canWalk`
- `canStack`
- `blocksMovement`
- `interactionType`
- `tradeable`

### InventoryResponseDto

Purpose: inventory payload for `GET /api/me/inventory`.

Fields:

- `items`

### PlaceFurnitureRequest

Purpose: request to place an inventory/catalog item into a room.

Fields:

- `catalogItemId`
- `inventoryItemId`
- `x`
- `y`
- `z`
- `rotation`
- `state`

Notes:

- `inventoryItemId` is future-facing and can be omitted until inventory exists.
- Backend must validate ownership and placement; client coordinates are only a proposal.

### MoveFurnitureRequest

Purpose: request to move or rotate a placed item.

Fields:

- `roomFurnitureId`
- `x`
- `y`
- `z`
- `rotation`

### RemoveFurnitureRequest

Purpose: request to remove a placed item from a room.

Fields:

- `roomFurnitureId`

Notes:

- Future inventory integration should return the item to inventory or delete only system-owned fixtures according to rules.

## Proposed REST Endpoints

Future endpoints can be introduced incrementally:

- `GET /api/rooms/{roomId}` returns `RoomDetailDto` with furniture.
- `GET /api/furniture/catalog` returns catalog items visible to the user.
- `POST /api/rooms/{roomId}/furniture` places furniture.
- `PATCH /api/rooms/{roomId}/furniture/{roomFurnitureId}` moves/rotates furniture.
- `PATCH /api/rooms/{roomId}/furniture/{roomFurnitureId}/state` changes interaction state.
- `DELETE /api/rooms/{roomId}/furniture/{roomFurnitureId}` removes furniture.
- `GET /api/me/inventory` returns the authenticated user's read-only inventory.

## Proposed WebSocket Events

Use Hotel Exchange event names and JSON payloads:

- `ROOM_FURNITURE_ADDED`
- `ROOM_FURNITURE_MOVED`
- `ROOM_FURNITURE_REMOVED`
- `ROOM_FURNITURE_STATE_CHANGED`
- `ROOM_BLOCKED_TILES_UPDATED`

### ROOM_FURNITURE_ADDED

Payload:

- `roomFurniture`: `RoomFurnitureDto`
- `blockedTiles`: optional recalculated blocked tile list

### ROOM_FURNITURE_MOVED

Payload:

- `roomFurniture`: `RoomFurnitureDto`
- `previousPosition`: `{ x, y, z, rotation }`
- `blockedTiles`: optional recalculated blocked tile list

### ROOM_FURNITURE_REMOVED

Payload:

- `roomFurnitureId`
- `blockedTiles`: optional recalculated blocked tile list

### ROOM_FURNITURE_STATE_CHANGED

Payload:

- `roomFurnitureId`
- `state`
- `updatedAt`
- `blockedTiles`: optional when state affects movement

### ROOM_BLOCKED_TILES_UPDATED

Payload:

- `roomId`
- `blockedTiles`
- `reason`

Recommended rule:

- Broadcast furniture events only after the backend has persisted the change and recalculated movement data.

## Placement And Movement Validation

Backend validations:

- Reject furniture placement outside room bounds.
- Reject movement outside room bounds.
- Reject invalid rotations.
- Reject unknown catalog items.
- Reject placement on closed/base-blocked tiles.
- Reject placement on another blocking object when stacking is not allowed.
- Reject placement if the user is not owner, admin, or allowed by room permissions.
- Reject movement/removal if the user does not own the item or lacks room permissions.
- Do not trust client-provided `z`; recalculate from base tile and stack rules.
- Do not trust client-provided blocked tiles; recalculate in backend.
- Recalculate affected footprint from catalog width/height/rotation.
- Recalculate room blocked tiles after every add/move/remove/state change.
- Validate avatar movement against backend blocked tiles.
- Persist only valid states.

Frontend validations:

- Preview placement only inside room bounds.
- Show blocked/invalid placement feedback.
- Avoid sending impossible moves when known locally.
- Treat backend rejection as final.
- Refresh room detail if local blocked tiles diverge from backend state.

## Blocked Tiles And Height Model

Phase 1 should stay simple:

- Base room blocked tiles come from `RoomEntity` or a future `RoomModel`.
- Furniture blocked tiles are generated from `RoomFurnitureEntity` plus `FurnitureCatalogEntity`.
- A tile is blocked when at least one placed furniture instance has `blocksMovement=true` and `canWalk=false`.

Phase 2 introduces height:

- Each base tile has a base height.
- Each furniture has `defaultZ` and optionally top height.
- A room tile derives `walkHeight` from base height plus top walkable item height.
- Stacking is allowed only when every involved item allows it.

Phase 3 introduces interaction-specific movement:

- Seats can be targetable but not pass-through.
- Market screens can be interacted with from adjacent tiles.
- Doors or gates can change blocked state based on `state`.

## Flyway Migration Plan

FASE 4A implemented the persistent furniture foundation as `V4__persistent_furniture.sql`. Future migrations should continue from that baseline.

### V4__persistent_furniture.sql

Status: implemented.

Tables:

- `furniture_catalog`
- `room_furniture`

Seeded Main Lobby catalog items:

- `green_leather_sofa`
- `red_executive_chair`
- `dark_wood_coffee_table`

Seeded Main Lobby instances:

- sofa at `2,7`
- chair at `7,5`
- table at `5,6`

The migration also removes legacy `phase_3_layout` blockers for room `1` so empty tiles are not blocked after furniture blockers become authoritative.

### Future Furniture Catalog Shape

Table: `furniture_catalog`

Columns:

- `id BIGSERIAL PRIMARY KEY`
- `code VARCHAR(80) NOT NULL UNIQUE`
- `name VARCHAR(120) NOT NULL`
- `type VARCHAR(40) NOT NULL`
- `sprite_key VARCHAR(120) NOT NULL`
- `width INTEGER NOT NULL`
- `height INTEGER NOT NULL`
- `can_sit BOOLEAN NOT NULL DEFAULT FALSE`
- `can_walk BOOLEAN NOT NULL DEFAULT FALSE`
- `can_stack BOOLEAN NOT NULL DEFAULT FALSE`
- `blocks_movement BOOLEAN NOT NULL DEFAULT TRUE`
- `default_z NUMERIC(8,3) NOT NULL DEFAULT 0`
- `interaction_type VARCHAR(40) NOT NULL DEFAULT 'NONE'`
- `tradeable BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Future Room Furniture Shape

Table: `room_furniture`

Columns:

- `id BIGSERIAL PRIMARY KEY`
- `room_id BIGINT NOT NULL REFERENCES rooms(id)`
- `catalog_item_id BIGINT NOT NULL REFERENCES furniture_catalog(id)`
- `owner_user_id BIGINT NULL REFERENCES users(id)`
- `x INTEGER NOT NULL`
- `y INTEGER NOT NULL`
- `z NUMERIC(8,3) NOT NULL DEFAULT 0`
- `rotation VARCHAR(8) NOT NULL`
- `state JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Recommended indexes:

- `(room_id)`
- `(room_id, x, y)`
- `(owner_user_id)`
- `(catalog_item_id)`

### User Inventory Shape

Table: `user_inventory`

Columns:

- `id BIGSERIAL PRIMARY KEY`
- `user_id BIGINT NOT NULL REFERENCES users(id)`
- `catalog_item_id BIGINT NOT NULL REFERENCES furniture_catalog(id)`
- `quantity INTEGER NOT NULL DEFAULT 1`
- `source VARCHAR(40) NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Recommended indexes:

- `(user_id)`
- `(user_id, catalog_item_id)`

## Backend Service Design

Suggested services:

- `FurnitureCatalogService`
  - list catalog definitions
  - resolve catalog item by id/code
  - seed initial Hotel Exchange furniture
- `RoomFurnitureService`
  - load room furniture
  - place furniture
  - move furniture
  - remove furniture
  - change furniture state
- `RoomCollisionService`
  - calculate affected tiles
  - calculate blocked tiles
  - validate placement
  - validate movement destinations
- `RoomPermissionService`
  - determine whether a user can edit a room
  - keep owner/admin/system logic centralized
- `RoomRealtimeService`
  - broadcast furniture and blocked tile events

## Frontend Integration Plan

The current frontend should evolve without a rewrite:

- Keep `furnitureSpriteRenderer.ts` reusable.
- Replace `mainLobbyFurniture.ts` static instances with API-provided `RoomFurnitureDto`.
- Let `furnitureCatalog.ts` become a local render metadata map during transition.
- Later, fetch gameplay catalog data from backend and merge it with local art metadata by `code` or `spriteKey`.
- Render all room furniture from `RoomDetailDto.furniture`.
- Update furniture in-place from WebSocket events.
- Update local blocked tiles from `RoomDetailDto.blockedTiles` and `ROOM_BLOCKED_TILES_UPDATED`.
- Keep Phaser defensive rendering: missing PNG should show a fallback and not crash.

Recommended transition shape:

```text
backend RoomDetailDto
  -> frontend room state
  -> PhaserRoom props
  -> RoomScene renders tiles, avatars, and furniture DTOs
  -> furnitureSpriteRenderer renders by catalog code/sprite key
```

## Roadmap

### Phase 4.1: Backend Catalog Foundation

- Implemented in FASE 4A for seeded backend catalog data.
- Dedicated read-only catalog endpoint remains future work.

### Phase 4.2: Persistent Room Furniture

- Implemented in FASE 4A for Main Lobby.
- `mainLobbyFurniture.ts` remains as fallback when API furniture is absent.

### Phase 4.3: Backend Blocked Tiles

- Implemented in FASE 4A for furniture footprint blockers.
- Include furniture-derived blocked tiles in `RoomDetailDto`.
- Use backend blocked tiles for WebSocket movement validation.
- Keep frontend local checks as UX only.

### Phase 4.4: Realtime Furniture Events

- Add WebSocket broadcasts for add/move/remove/state.
- Frontend updates room scene without reload.
- Add basic optimistic preview but backend remains authoritative.

### Phase 4.5: Room Rights And Editing

- Add room edit permissions.
- Let room owner/admin move furniture.
- Add validation errors for unauthorized actions.

### Phase 4.6: Inventory MVP

- Implemented in FASE 4B as basic read-only inventory:
  - `user_inventory`
  - seeded `trader` and `broker` furniture quantities
  - `GET /api/me/inventory`
- Future:
  - Place from inventory into a room.
  - Remove from room back to inventory.

### Phase 4.7: Height And Stacking

- Add base tile height support.
- Add walkable/stackable furniture height rules.
- Add seats and simple interaction state.

### Phase 4.8: Hotel Exchange Interactions

- Add exchange-specific objects:
  - market ticker panel
  - trading desk
  - portfolio board
  - classroom screen
- Keep gameplay educational and original.

## Acceptance Criteria For The Future Implementation

- Rooms load from backend with furniture and blocked tiles.
- Furniture placement is persisted.
- Movement validation is backend-authoritative.
- Frontend can render any room furniture DTO through the existing sprite renderer.
- WebSocket keeps all clients synchronized.
- Missing sprites do not crash the room.
- Hotel Exchange stays legally clean and architecturally independent.
