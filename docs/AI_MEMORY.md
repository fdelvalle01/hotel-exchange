# Hotel Exchange AI Memory

## 2026-06-05 18:13:04 -04:00

### Change Summary

Implemented FASE 4A `Backend Persistent Furniture`. Main Lobby furniture is now seeded in PostgreSQL and returned by `GET /api/rooms/{roomId}`. Backend movement validation now rejects destinations blocked by persisted furniture.

### Files Created Or Modified

- `backend/src/main/resources/db/migration/V4__persistent_furniture.sql`
- `backend/src/main/java/com/hotelexchange/furniture/FurnitureCatalogEntity.java`
- `backend/src/main/java/com/hotelexchange/furniture/RoomFurnitureEntity.java`
- `backend/src/main/java/com/hotelexchange/furniture/FurnitureCatalogRepository.java`
- `backend/src/main/java/com/hotelexchange/furniture/RoomFurnitureRepository.java`
- `backend/src/main/java/com/hotelexchange/furniture/FurnitureCatalogItemDto.java`
- `backend/src/main/java/com/hotelexchange/furniture/RoomFurnitureDto.java`
- `backend/src/main/java/com/hotelexchange/furniture/BlockedTileDto.java`
- `backend/src/main/java/com/hotelexchange/furniture/RoomFurnitureService.java`
- `backend/src/main/java/com/hotelexchange/room/RoomDetailDto.java`
- `backend/src/main/java/com/hotelexchange/room/RoomController.java`
- `backend/src/main/java/com/hotelexchange/room/RoomLayoutService.java`
- `backend/src/test/java/com/hotelexchange/realtime/RoomStateServiceTest.java`
- `frontend/src/types/api.types.ts`
- `frontend/src/game/data/mainLobbyFurniture.ts`
- `README.md`
- `docs/ROOM_FURNITURE_ARCHITECTURE.md`
- `docs/AI_MEMORY.md`

### Migration

- Added `furniture_catalog` with:
  - code/name/type
  - sprite key/path
  - width/height
  - movement and interaction flags
  - default z
  - created/updated timestamps
- Added `room_furniture` with:
  - room reference
  - catalog item reference
  - nullable owner user reference
  - x/y/z
  - rotation
  - JSON-like state text
  - created/updated timestamps
- Seeded current Main Lobby furniture:
  - `green_leather_sofa` at `2,7`
  - `red_executive_chair` at `7,5`
  - `dark_wood_coffee_table` at `5,6`
- Removed legacy `phase_3_layout` blockers for room `1` so backend blockers come from persistent furniture instead of the old drawn reception layout.

### Backend Behavior

- `RoomFurnitureService` loads room furniture, maps DTOs, and calculates blocked tiles from furniture footprint.
- `RoomLayoutService` now combines legacy `room_blocked_tiles` with furniture-derived blocked tiles.
- `RoomDetailDto` includes:
  - `spawnX`
  - `spawnY`
  - `blockedTiles`
  - `furniture`
- `RoomStateService` continues using `RoomLayoutService.blockedTileSet(...)`, so WebSocket movement now rejects furniture tiles.
- Movement onto furniture returns a clearer error: `Destination tile is blocked by furniture`.

### Frontend Behavior

- `Room` API type now supports optional `furniture`.
- `mainLobbyFurniture.ts` maps API `RoomFurnitureDto` to the existing Phaser furniture renderer.
- If the backend returns no furniture, the local static Main Lobby furniture fallback remains active.
- Backend `blockedTiles` remain authoritative; frontend local blockers are only fallback/UX support.

### Boundaries Kept

- No inventory implemented.
- No marketplace implemented.
- No furniture placement/move/remove UI implemented.
- No login/lobby changes beyond README documentation.
- No Kepler code, assets, protocol, or names copied.

### Validation

- `mvn test` passed in `backend/`.
- `npm run build` passed in `frontend/`.
- Vite still reports the expected large Phaser bundle warning.

### Pending Technical Work

- Manual smoke test with `trader/trader` and `broker/broker`.
- Add dedicated furniture catalog REST endpoint if needed.
- Add server-side room edit permissions before furniture placement/move/remove APIs.
- Add inventory in a future phase.
- Add realtime furniture mutation events in a future phase:
  - `ROOM_FURNITURE_ADDED`
  - `ROOM_FURNITURE_MOVED`
  - `ROOM_FURNITURE_REMOVED`
  - `ROOM_FURNITURE_STATE_CHANGED`
  - `ROOM_BLOCKED_TILES_UPDATED`

## 2026-06-05 17:57:55 -04:00

### Change Summary

Created `docs/ROOM_FURNITURE_ARCHITECTURE.md` to define the future backend-owned room/furniture architecture for Hotel Exchange.

### Kepler Reference Boundary

- The local `D:\MakingGames\Kepler` repository was reviewed only as conceptual architecture reference.
- No Kepler source code was copied.
- No Kepler assets were copied.
- No Kepler/Habbo protocol, packet names, or packet formats were implemented.
- No proprietary/internal names were adopted for Hotel Exchange domain models or events.
- Hotel Exchange remains an original React + Phaser + Spring Boot + WebSocket + PostgreSQL project with exchange/trading educational theme.

### Concepts Observed Conceptually

- Separation between room metadata, room model, runtime tile mapping, room users, item definitions, placed item instances, catalog, inventory, pathfinding, and room rights.
- Furniture footprint affects multiple tiles depending on dimensions and rotation.
- Walkability depends on room bounds, base tile state, placed objects, active entities, object state, height, and stacking rules.
- Inventory should be separate from furniture placed in a room.
- Room changes should be persisted first, then broadcast to connected users.

### Architecture Decisions For Hotel Exchange

- Move from static frontend furniture to backend-persisted `furniture_catalog` and `room_furniture` in future phases.
- Keep `furnitureSpriteRenderer.ts` reusable and let Phaser render DTO-driven room furniture.
- Keep backend authoritative for placement validation, ownership/permissions, blocked tile calculation, and movement validation.
- Use Hotel Exchange owned events:
  - `ROOM_FURNITURE_ADDED`
  - `ROOM_FURNITURE_MOVED`
  - `ROOM_FURNITURE_REMOVED`
  - `ROOM_FURNITURE_STATE_CHANGED`
  - `ROOM_BLOCKED_TILES_UPDATED`
- Plan future entities:
  - `RoomEntity`
  - `FurnitureCatalogEntity`
  - `RoomFurnitureEntity`
  - `UserInventoryEntity`

### Files Created Or Modified

- `README.md`
- `docs/ROOM_FURNITURE_ARCHITECTURE.md`
- `docs/AI_MEMORY.md`

### Validation

- Documentation-only change.
- No backend or frontend implementation was changed.
- Build/test not run because no executable code changed.

### Pending Technical Work

- Implement the proposed architecture incrementally in future phases:
  - backend furniture catalog
  - persistent room furniture
  - backend blocked tile calculation
  - realtime furniture WebSocket events
  - room permissions
  - future inventory
  - future height/stacking rules

## 2026-06-05 17:46:22 -04:00

### Change Summary

Implemented FASE 3.3 `Room Polish & Scale Pass` for Main Lobby. The visible room composition now relies only on the three real furniture PNG sprites while the old code-drawn furniture items were removed from the active lobby layout.

### Files Modified

- `frontend/src/game/data/furnitureCatalog.ts`
- `frontend/src/game/data/mainLobbyFurniture.ts`
- `frontend/src/game/rendering/furnitureSpriteRenderer.ts`
- `frontend/src/game/scenes/RoomScene.ts`
- `docs/AI_MEMORY.md`

### Furniture Scale And Anchoring

- `red_executive_chair`
  - Footprint: `1x1`
  - Scale changed to `0.1`
  - Depth offset changed to `16`
  - Origin remains `0.5, 1`
- `dark_wood_coffee_table`
  - Footprint changed to `2x2`
  - Scale changed to `0.13`
  - Added catalog anchor offset `0.5, 0.5`
  - Depth offset changed to `10`
- `green_leather_sofa`
  - Footprint remains `3x1`
  - Scale changed to `0.12`
  - Added catalog anchor offset `1, 0`
  - Depth offset changed to `14`

### Layout Changes

- Main Lobby active furniture instances are now only:
  - `manager-chair`
  - `waiting-sofa`
  - `exchange-table`
- Removed active layout instances for code-drawn door, reception desk, plants, benches, and lamps.
- The table acts as the visual Exchange Desk area, the chair sits near it, and the sofa defines a waiting zone while leaving walkable routes open.

### Visual Polish

- Added subtle deterministic floor color variation per tile.
- Added a warm desk-zone floor inset around the exchange table.
- Added a simple isometric room border/platform side so the floor no longer reads as an unfinished floating diamond.
- Added simple back walls, dark baseboards, and two restrained Hotel Exchange wall details:
  - `MARKET OPEN` panel with ticker text
  - `EXCHANGE DESK` sign
- Reduced hover and selected tile highlight intensity.
- Removed the previous development tile-selection console debug call.

### Validation

- `npm run build` passed in `frontend/`.
- Vite still reports the expected large Phaser bundle warning.

### Pending Technical Work

- Manual smoke test with `trader/trader` and `broker/broker` in `/rooms/1`.
- Tune exact sprite scale/origin after visual inspection in the browser if any furniture appears slightly high, low, or oversized.
- If furniture blockers need to be enforced server-side in a later phase, mirror the static furniture footprint data into backend room layout validation.

## 2026-06-05 17:35:12 -04:00

### Change Summary

Integrated three local prototype furniture PNGs into the Phase 3.2 Static Sprite Furniture System for Main Lobby: red executive chair, dark wood coffee table, and green leather sofa.

### Files Created Or Modified

- `frontend/public/assets/furniture/red_executive_chair.png`
- `frontend/public/assets/furniture/dark_wood_coffee_table.png`
- `frontend/public/assets/furniture/green_leather_sofa.png`
- `frontend/public/assets/furniture/README.md`
- `frontend/src/game/data/furnitureCatalog.ts`
- `frontend/src/game/data/mainLobbyFurniture.ts`
- `frontend/src/game/rendering/furnitureRenderer.ts`
- `docs/AI_MEMORY.md`

### Asset Handling

- The user-provided source PNGs remain in `frontend/public/assets/furniture/` with their original long filenames.
- Cleaned derivative PNGs with stable catalog names were created for Phaser usage:
  - `red_executive_chair.png`
  - `dark_wood_coffee_table.png`
  - `green_leather_sofa.png`
- The cleaned copies remove the bright preview/checkerboard background and crop transparent margins so the sprites render as furniture instead of square images.
- Legal/portfolio rule remains unchanged: do not publish copyrighted Habbo/Sulake/fan-archive assets unless there are explicit redistribution rights. Public demos should use original or licensed Hotel Exchange assets.

### Catalog And Room Changes

- Added catalog entries:
  - `red_executive_chair`, 1x1 blocking, sprite path `/assets/furniture/red_executive_chair.png`
  - `dark_wood_coffee_table`, 2x1 blocking, sprite path `/assets/furniture/dark_wood_coffee_table.png`
  - `green_leather_sofa`, 3x1 blocking, sprite path `/assets/furniture/green_leather_sofa.png`
- Main Lobby now places:
  - red chair near reception
  - green sofa in the waiting area
  - coffee table in the waiting area
- Blocked tiles continue to be generated from furniture catalog width/height instead of duplicated manual tile lists.

### Fallbacks

- Added Phaser Graphics fallbacks for:
  - `iso-chair`
  - `iso-table`
  - `iso-sofa`
- If a sprite is missing, the room still renders without crashing and logs a development warning once per missing key.

### Validation

- `npm run build` passed in `frontend/`.
- Vite still reports the expected large Phaser bundle warning.

### Pending Technical Work

- Manually smoke test `/rooms/1` with `trader/trader` and `broker/broker` to tune sprite scale/origin if needed.
- Replace prototype/reference-style art with final owned or licensed Hotel Exchange furniture before any public portfolio/demo release.

## 2026-06-05 17:27:23 -04:00

### Change Summary

Implemented Phase 3.2 `Static Sprite Furniture System`. Main Lobby now has a clear static furniture pipeline that can load PNG sprites from `frontend/public/assets/furniture/` and fall back to Phaser-drawn placeholders when sprites are missing.

### Files Created Or Modified

- `frontend/public/assets/furniture/README.md`
- `frontend/src/game/data/furnitureCatalog.ts`
- `frontend/src/game/data/mainLobbyFurniture.ts`
- `frontend/src/game/rendering/furnitureSpriteRenderer.ts`
- `frontend/src/game/rendering/furnitureRenderer.ts`
- `frontend/src/game/rooms/mainLobbyDecor.ts`
- `frontend/src/game/scenes/RoomScene.ts`
- `README.md`
- `docs/AI_MEMORY.md`

### Asset And Copyright Decision

- Habbo/Sulake or fan-archive furniture assets must not be committed or published unless there are explicit redistribution rights.
- Temporary copyrighted reference sprites may only be used locally/private for prototyping.
- Public repositories, portfolio demos, and production builds should use original Hotel Exchange art or properly licensed assets.
- This is documented in both `README.md` and `frontend/public/assets/furniture/README.md`.

### Sprite Furniture Pipeline

- `frontend/src/game/data/furnitureCatalog.ts` defines furniture catalog items with:
  - `id`
  - `name`
  - `spriteKey`
  - `spritePath`
  - `width`
  - `height`
  - `blocksMovement`
  - `originX`
  - `originY`
  - optional `depthOffset`
  - optional `scale`
  - future rotation fields
  - `fallbackRenderType`
- `frontend/src/game/data/mainLobbyFurniture.ts` defines static Main Lobby instances with:
  - `id`
  - `catalogId`
  - `x`
  - `y`
  - `rotation`
  - optional `customDepthOffset`
- `frontend/src/game/rendering/furnitureSpriteRenderer.ts` owns:
  - `preloadFurnitureSprites(...)`
  - `renderFurnitureSprites(...)`
  - sprite screen position calculation
  - `setOrigin(originX, originY)`
  - `setDepth(screenY + depthOffset)`
  - fallback rendering when textures are missing

### Fallback Behavior

- If a PNG is missing or fails to load, the scene does not crash.
- In development, a warning is logged once per missing sprite key.
- The renderer falls back to the existing Phaser Graphics furniture renderer.
- The current repository intentionally has no copyrighted furniture PNGs, so fallback furniture remains visible until owned/licensed PNGs are added.

### Blocked Tiles

- Frontend furniture blockers are now generated from catalog dimensions plus static room instances.
- Example: a `width=2`, `height=1` item blocks two tiles.
- Room bounds are respected when generating blockers.
- Backend-provided blockers are still merged with frontend furniture blockers.
- BFS/pathfinding still avoids furniture blockers before sending a move request.

### Depth Sorting

- Sprite/fallback furniture is rendered into the shared world layer with avatars.
- Sprite depth uses the furniture base tile plus catalog `depthOffset` and optional instance `customDepthOffset`.
- Carpet remains drawn on the lower floor/highlight layer and does not cover avatars or furniture.
- Chat bubbles remain above the world layer.

### How To Add A Furniture PNG

1. Add the PNG to `frontend/public/assets/furniture/`.
2. Add a catalog entry in `frontend/src/game/data/furnitureCatalog.ts`.
3. Add an instance in `frontend/src/game/data/mainLobbyFurniture.ts`.
4. Tune `originX`, `originY`, `scale`, and `depthOffset` until the sprite sits on its isometric tile footprint.
5. Set `width`, `height`, and `blocksMovement` so generated blockers match the furniture footprint.

### Validation Results

- `npm run build` in `frontend` passed.
  - Vite still reports the expected large Phaser chunk warning.
- Backend was not touched, so `mvn test` was not run.

### Manual Validation Pending

- User will handle app startup.
- Verify:
  - Main Lobby shows sprite furniture if PNGs are present.
  - Missing PNGs use fallback furniture without crashing.
  - trader/broker multiplayer still works.
  - tile-by-tile movement still avoids furniture.
  - chat bubbles still render above avatars.
  - no red console errors besides expected local missing-asset warnings in development.

## 2026-06-05 17:18:09 -04:00

### Change Summary

Implemented Phase 3.1 `Habbo Furniture Pass` for Main Lobby. The room furniture now uses a dedicated isometric renderer with pixel outlines, hard shadows, simple volume, and item-like furniture metadata.

### Files Created Or Modified

- `frontend/src/game/rendering/furnitureRenderer.ts`
- `frontend/src/game/rooms/mainLobbyDecor.ts`
- `frontend/src/game/scenes/RoomScene.ts`
- `docs/AI_MEMORY.md`

### White Line Cause

- The extra white/cream line came from the old `waitingZone` decoration in `RoomScene.ts`.
- It rendered a screen-space `strokeRect(...)` in `highlightLayer`, so it appeared as a long flat line/box instead of an isometric room element.
- This debug-like visual was removed.
- The normal tile stroke was also changed from pale cream to a darker floor stroke so the grid no longer reads as stray white lines.
- Selected-tile highlight remains, but it is now a subtler translucent yellow stroke/fill.

### Furniture Renderer

- Added `frontend/src/game/rendering/furnitureRenderer.ts`.
- Helper responsibilities:
  - `renderFurniture(...)`
  - `drawIsoBox(...)`
  - `drawFurnitureShadow(...)`
  - `drawReceptionDesk(...)`
  - `drawBench(...)`
  - `drawPlant(...)`
  - `drawLamp(...)`
  - `drawDoor(...)`
  - `drawCarpet(...)`
- `RoomScene.ts` now orchestrates the room and delegates furniture drawing to the renderer instead of carrying all drawing code inline.

### Item Data Structure

- `mainLobbyDecor.ts` now defines furniture as item-like data instead of freehand decoration records.
- Each furniture entry now includes:
  - `id`
  - `furnitureId`
  - `type`
  - `name`
  - `x`
  - `y`
  - `width`
  - `height`
  - `rotation`
  - `blocksMovement`
  - `blockingTiles`
  - `renderType`
- This prepares the code for future room items without implementing inventory or marketplace.

### Visual Decisions

- No external furniture assets were added.
- Temporary furniture is still Phaser-native, but now uses:
  - isometric box helpers
  - black/dark brown outlines
  - hard shadows
  - 2-3 tone pixel palettes
  - top faces, side faces, and front faces for volume
- Reception now reads as an isometric desk with top surface, front face, monitor, and small counter object.
- Benches now have depth, legs, shadow, and outline.
- Plants now have volumetric pots and layered blocky leaves.
- Lamps now have base, pole, shade, and a very subtle retro glow.
- Door now has frame, depth base, panels, and shadow.
- Carpet is rendered as aligned isometric tile diamonds with decorative border, below furniture/avatars.

### Depth Sorting

- Carpet renders to the floor/highlight layer below world objects.
- Furniture and avatars remain in the shared depth-sorted world container.
- Furniture depth is based on the lower occupied/base tile so avatars can pass visually in front of or behind objects.
- Chat bubbles remain in the bubble layer above avatars.

### Blocked Tiles

- `blockingTiles` remain coherent with the furniture footprint.
- Reception blocks the same backend-known tiles: `(5,5)`, `(6,5)`, `(5,6)`.
- Plants and lamps block their base tile.
- Benches block the two tiles they occupy.
- Frontend pathfinding still rejects furniture blockers before sending movement.

### Validation Results

- `npm run build` in `frontend` passed.
  - Vite still reports the expected large Phaser chunk warning.
- Backend was not touched, so `mvn test` was not run.

### Manual Validation Pending

- User will handle app startup.
- Verify in browser:
  - furniture appears more isometric/Habbo-like.
  - no extra white line appears in the room.
  - Main Lobby remains walkable around furniture.
  - reception, plants, benches, and lamps remain blocked.
  - tile-by-tile movement, WebSocket multiplayer, and chat bubbles still work.

## 2026-06-05 17:08:35 -04:00

### Change Summary

Implemented Phase 3A-G frontend-only `Room Alive` work for Main Lobby: pixel avatars, static hotel decorations, frontend decorative blockers, tile-by-tile visual pathfinding, improved direction feedback, Habbo-style chat bubbles, and shared depth sorting for room objects and avatars.

### Files Created Or Modified

- `frontend/src/assets/avatars/README.md`
- `frontend/src/game/entities/Avatar.ts`
- `frontend/src/game/rooms/mainLobbyDecor.ts`
- `frontend/src/game/scenes/RoomScene.ts`
- `docs/AI_MEMORY.md`

### Scope Decision

- Backend was not changed in this phase.
- Login V2, Lobby V2, room WebSocket contracts, presence, chat, and persisted last position remain on the existing contracts.
- Marketplace, inventory, and wallet were intentionally not implemented.

### Avatar Decisions

- Avatars are temporary Phaser Graphics pixel-art placeholders, not external images.
- `frontend/src/assets/avatars/` now exists as the future home for real sprite sheets.
- Role styling is inferred from username:
  - `trader` / `manager`: manager/trader palette with small briefcase.
  - `broker`: warmer broker palette with phone/accessory.
  - `admin`: distinct purple/admin palette prepared for future users.
  - fallback guest palette remains deterministic.
- User display name remains above the avatar.
- Local user highlight remains under the avatar.

### Room Decoration Decisions

- Main Lobby decorations are defined in `frontend/src/game/rooms/mainLobbyDecor.ts`.
- Decorations added:
  - reception desk
  - central carpet
  - plants
  - benches
  - lamps
  - front door
  - waiting zone marker
- Decoration definitions include `occupiedTiles` so they can later move into backend layout data.

### Blocked Tiles

- Frontend blocked tiles combine:
  - backend `room.blockedTiles`
  - `occupiedTiles` from Main Lobby decorations
- Existing backend blockers `(5,5)`, `(6,5)`, `(5,6)` align with the reception footprint.
- Additional frontend-only blockers currently protect plants, benches, and lamps.
- The frontend refuses clicks and visual paths through those decorative blockers.
- Backend still validates room bounds and backend-known blocked destinations.

### Pathfinding

- `RoomScene.findVisualPath(...)` performs BFS over four cardinal grid neighbors.
- On click:
  - pointer is converted through camera world coordinates.
  - tile bounds and diamond hit area are checked.
  - frontend decorative blockers are rejected.
  - BFS verifies a route before sending the final destination to the backend.
- On `USER_MOVED`:
  - the scene recomputes a local visual path from the avatar target position to the server destination.
  - if a local route exists, the avatar walks tile by tile around decorations.
  - if no local route exists, the server path remains the fallback.
- Backend remains authoritative for final accepted positions.

### Chat And Direction

- Chat bubbles now use cream fill with a black pixel-style border and replace prior bubbles for the same avatar.
- Bubble position was raised so it does not cover the avatar body/name.
- Direction handling supports north, south, east, west, northeast, northwest, southeast, and southwest labels.
- Placeholder avatars repaint face/accessory offsets while walking so they no longer feel like static circles.

### Depth Sorting

- Decoration and avatar objects share a depth-sorted world container.
- The scene sorts by isometric `y`, so avatars and objects are ordered together instead of avatars always drawing over furniture.
- Floor, highlight, world/decor/avatar, and bubble layers remain separated by depth.

### Robustness

- Existing early-event queue remains intact:
  - `setPresence(...)`
  - `applyEvent(...)`
  - `showChatBubble(...)`
- `RoomScene.isReady()` still protects calls before Phaser `create()`.
- WebSocket state handling was not changed in this phase.
- Local avatars remain keyed by `userId`, so duplicate local avatars are still avoided.

### Validation Results

- `npm run build` in `frontend` passed.
  - Vite still reports the expected large Phaser chunk warning.
- `mvn test` was not run because backend code was not changed.

### Manual Validation Pending

- User will handle app startup.
- Smoke test after startup:
  - login `trader/trader`
  - enter Main Lobby
  - login `broker/broker` in another browser
  - confirm both users render as pixel avatars
  - confirm click-to-walk is tile-by-tile
  - confirm broker sees trader movement realtime
  - confirm chat bubble appears over the speaker and chat panel still logs the message
  - confirm reception/plants/benches/lamps cannot be walked onto
  - confirm no red console errors

### Pending Technical Work

- Move decorative blockers/layout into backend when room editing or multi-room layout persistence starts.
- Replace Phaser Graphics avatar placeholders with real directional sprite sheets under `frontend/src/assets/avatars/`.
- Add browser-level E2E tests for two-user room rendering, blockers, chat bubbles, and reconnect behavior.

## 2026-06-05 16:56:50 -04:00

### Change Summary

Implemented Lobby V2 as a retro Habbo Origins-inspired Hotel Navigator, replacing the administrative room list with a game-like room browser.

### Files Modified

- `frontend/src/pages/LobbyPage.tsx`
- `frontend/src/styles.css`
- `docs/AI_MEMORY.md`

### Scope Decision

- Backend was not changed for this phase.
- Existing room API, login flow, room route, and WebSocket contracts remain untouched.
- `Main Lobby` still enters the real room route `/rooms/1` when the backend only has the initial room.

### Solution Applied

- Reused `home.jpg` through `/home.jpg` as a dark retro lobby backdrop with overlay and subtle scanline texture.
- Added a `Hotel Navigator` window using the same visual language as the login:
  - blue pixel header
  - heavy black border
  - retro tabs
  - pale pixel panel body
- Added five navigator room cards:
  - `Main Lobby`
  - `Trading Floor`
  - `Startup District`
  - `Crypto Plaza`
  - `Santiago Exchange`
- Each card now shows:
  - room name
  - room description
  - tile size
  - online users
  - status badge
  - action button
- `Main Lobby` is `Open` and links to `/rooms/{realRoomId}` with fallback `/rooms/1`.
- Non-implemented rooms are visible as `Coming soon` and use disabled buttons.
- The refresh button still calls the real `listRooms(token)` request and updates Main Lobby online count/size from backend data.
- Responsive layout uses `auto-fit` cards and stacks controls on smaller screens.

### Validation Results

- `npm run build` in `frontend` passed.
  - Vite still reports the expected large Phaser chunk warning.

### Manual Validation Pending

- User will handle local app startup.
- After startup, verify:
  - `/` feels like a hotel/game navigator, not an admin table.
  - `Main Lobby` enters `/rooms/1`.
  - mock rooms remain disabled as `Coming soon`.
  - refresh still updates the real Main Lobby online count.
  - login and `/rooms/1` still render normally.

## 2026-06-05 16:31:34 -04:00

### Change Summary

Restyled the unauthenticated login screen into a Habbo Origins-inspired pixel hotel entrance while keeping the existing `trader/trader` and `broker/broker` login flow intact.

### Files Created Or Modified

- `frontend/public/home.jpg`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/styles.css`
- `frontend/src/services/status.service.ts`
- `frontend/src/types/api.types.ts`
- `backend/src/main/java/com/hotelexchange/status/PublicStatusController.java`
- `backend/src/main/java/com/hotelexchange/status/PublicStatusResponse.java`
- `backend/src/main/java/com/hotelexchange/realtime/RoomPresenceRegistry.java`
- `backend/src/main/java/com/hotelexchange/config/SecurityConfig.java`
- `docs/AI_MEMORY.md`

### Asset Decision

- The original `home.jpg` remains in the repository root.
- A copy was placed in `frontend/public/home.jpg` so Vite can serve it directly as `/home.jpg` in both dev and Docker builds.
- This keeps the source asset available while giving the frontend a stable public asset path.

### Solution Applied

- Login screen now uses `home.jpg` as the full-screen background.
- Added a dark overlay and `backdrop-filter` blur/brightness behind the login window.
- Recreated the login panel as a Habbo-style window:
  - blue header
  - heavy black border
  - compact window control
  - yellow pixel button
- Added pixel-style `HOTEL EXCHANGE` logo and subtitle `Virtual Trading Hotel`.
- Added a dynamic online counter:
  - frontend polls `GET /api/public/status`.
  - backend returns `managersOnline` from unique open WebSocket sessions across rooms.
  - login keeps a visual fallback count while the public status endpoint is unavailable.
- Added idle animation:
  - slow moving CSS pixel clouds.
  - subtle glow pulse on the login button.
  - animations respect `prefers-reduced-motion`.
- Preserved existing auth defaults:
  - username default remains `trader`.
  - password default remains `trader`.
  - no changes were made to the login request contract.
- Preserved room/chat styling by separating login input styles from `.chat-form input`.
- Responsive login layout centers the window on smaller screens and keeps the background readable.

### Public Endpoint Contract

- `GET /api/public/status`
- Response:

```json
{
  "managersOnline": 0
}
```

### Validation Results

- `npm run build` in `frontend` passed.
  - Vite still reports the expected large Phaser chunk warning.
- `mvn test` in `backend` passed.
  - 6 tests, 0 failures, 0 errors.

### Pending Technical Work

- Visual browser pass after Docker Desktop is healthy:
  - verify login background crop on desktop/mobile.
  - verify button glow and cloud movement.
  - verify online counter reaches `2 managers online` when `trader/trader` and `broker/broker` are both connected to the room.
- Consider replacing the CSS pixel text logo with a dedicated bitmap logo asset if brand art becomes fixed.

## 2026-06-05 16:11:01 -04:00

### Change Summary

Recovered and stabilized the room frontend after the crash on `http://localhost:5173/rooms/1`:

```text
Uncaught TypeError: can't access property "sort", this.avatarLayer is undefined
sortAvatars RoomScene.ts
setPresence RoomScene.ts
PhaserRoom.tsx
```

### Root Cause

- `PhaserRoom` assigned `sceneRef.current` before Phaser had completed `RoomScene.create()`.
- React could receive or apply `presence` immediately after mounting and call `scene.setPresence(...)`.
- `RoomScene.setPresence(...)` created/updated avatars and called `sortAvatars()` before `avatarLayer` existed.
- `sortAvatars()` called `this.avatarLayer.sort('y')` without guarding scene readiness.

### Files Modified

- `frontend/src/game/scenes/RoomScene.ts`
- `frontend/src/game/PhaserRoom.tsx`
- `frontend/src/game/types/game.types.ts`
- `frontend/src/services/wsClient.ts`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/types/api.types.ts`
- `frontend/src/styles.css`
- `frontend/index.html`
- `frontend/public/favicon.svg`
- `docs/AI_MEMORY.md`

### Solution Applied

- Added explicit Phaser scene readiness:
  - `RoomScene.sceneReady`
  - public `RoomScene.isReady()`
  - optional `RoomSceneOptions.onReady`
- Made `RoomScene` tolerate early calls:
  - `setPresence(...)` queues presence until layers exist.
  - `applyEvent(...)` queues server movement/chat events until ready.
  - `showChatBubble(...)` queues chat bubbles until ready.
  - chat arriving before its avatar is retained and flushed when that avatar is upserted.
- Made rendering/layer methods defensive:
  - `avatarLayer`, `uiLayer`, `floorLayer`, `highlightLayer`, and `furnitureLayer` are nullable.
  - `sortAvatars()` returns if `avatarLayer` does not exist or there are no avatars.
  - tile/marker/highlight helpers return safely if their layer is unavailable.
  - `removeAvatar(...)` centralizes avatar destruction.
- Kept layer ordering:
  - floor depth `10`
  - highlight depth `20`
  - furniture/block markers depth `30`
  - avatar depth `40`
  - bubble/ui depth `50`
- Updated `PhaserRoom` to synchronize React with Phaser:
  - assigns `sceneRef.current = scene` before constructing `Phaser.Game`.
  - waits for `onReady` and `scene.isReady()` before applying presence, movement events, or chat bubbles.
  - stores pending presence/events/chat in React refs and flushes them when Phaser is ready.
- Improved WebSocket failure handling:
  - `ConnectionStatus` now supports `failed`.
  - backend-down sockets reconnect with a limit and then mark `failed`.
  - authentication-policy closes mark `failed` and trigger logout/new login flow.
  - WebSocket errors update UI state instead of crashing the room.
- Fixed favicon request:
  - added `frontend/public/favicon.svg`.
  - added explicit favicon link in `frontend/index.html`.

### Validation Results

- `npm run build` in `frontend` passed.
  - Vite still reports the expected large Phaser chunk warning.
- `mvn test` in `backend` passed.
  - 6 tests, 0 failures, 0 errors.
- `docker compose up -d --build` returned success.
  - backend/frontend images built.
  - containers started.
- HTTP checks:
  - `http://localhost:5173` returned `200`.
  - `http://localhost:5173/favicon.svg` returned `200`.
  - unauthenticated `http://localhost:8080/api/rooms` returned `401` before Docker degraded, which confirms the backend port was answering at that moment.

### Verification Blocked

- Full two-browser smoke test could not be completed in this run because Docker Desktop API started returning:

```text
request returned Internal Server Error for API route and version ... /containers/json
```

- After that Docker API failure:
  - `docker compose ps` and `docker compose logs` failed.
  - `localhost:8080` and `localhost:5433` still had open TCP ports.
  - backend HTTP requests timed out with no response body.
- Because backend REST login timed out, WebSocket/browser smoke for `trader/trader` and `broker/broker` could not be validated reliably in this runtime window.

### Pending Technical Work

- Restart Docker Desktop and re-run:
  - `docker compose up -d --build`
  - login `trader/trader`
  - login `broker/broker` in a second browser/session
  - enter `/rooms/1`
  - verify both avatars visible, realtime movement, chat bubbles, and no red console errors.
- Add browser-level E2E coverage for:
  - React presence arriving before Phaser `create()`.
  - two users in the same room.
  - WebSocket reconnect/failure states.
  - favicon presence.

## 2026-06-05 15:46:59 -04:00

### Change Summary

Implemented Phase 3 base room gameplay in a Habbo-like direction without breaking Phase 1 click/grid math or Phase 2 multiplayer contracts.

### Files Created Or Modified

- `README.md`
- `backend/src/main/resources/db/migration/V3__room_layout.sql`
- `backend/src/main/java/com/hotelexchange/room/RoomEntity.java`
- `backend/src/main/java/com/hotelexchange/room/RoomResponse.java`
- `backend/src/main/java/com/hotelexchange/room/RoomController.java`
- `backend/src/main/java/com/hotelexchange/room/RoomBlockedTileEntity.java`
- `backend/src/main/java/com/hotelexchange/room/RoomBlockedTileRepository.java`
- `backend/src/main/java/com/hotelexchange/room/RoomLayoutService.java`
- `backend/src/main/java/com/hotelexchange/realtime/PathfindingService.java`
- `backend/src/main/java/com/hotelexchange/realtime/MovementResult.java`
- `backend/src/main/java/com/hotelexchange/realtime/RoomStateService.java`
- `backend/src/main/java/com/hotelexchange/realtime/RoomPresenceRegistry.java`
- `backend/src/main/java/com/hotelexchange/realtime/RoomWebSocketHandler.java`
- `backend/src/main/java/com/hotelexchange/realtime/UserMovedPayload.java`
- `backend/src/test/java/com/hotelexchange/realtime/RoomStateServiceTest.java`
- `frontend/src/types/api.types.ts`
- `frontend/src/game/scenes/RoomScene.ts`
- `frontend/src/game/entities/Avatar.ts`
- `docs/AI_MEMORY.md`

### Bug Found

- Phase 2 realtime movement persisted and broadcast only the destination, so Phaser animated a direct jump/tween to the final tile instead of walking tile by tile.
- Movement validation only checked room bounds, not blocked/walkable tiles.
- Room detail did not expose spawn or layout data needed by the client to draw blocked tiles and avoid invalid click targets.

### Solution Applied

- Added room layout data:
  - `rooms.spawn_x`
  - `rooms.spawn_y`
  - `room_blocked_tiles`
  - sample blocked tiles for Main Lobby: `(5,5)`, `(6,5)`, `(5,6)`.
- Added `RoomLayoutService` for inside-room and walkable-destination validation.
- Added `PathfindingService` with BFS over the room grid. The returned path excludes the current tile and includes the destination.
- `RoomStateService.persistMovement(...)` now receives the current server-side presence position, validates the final destination, computes the path, persists the final valid position, and returns `MovementResult`.
- `RoomWebSocketHandler` now derives current movement start from `RoomPresenceRegistry`, never from client coordinates, and broadcasts `USER_MOVED.payload.path`.
- `GET /api/rooms` and `GET /api/rooms/{roomId}` now include `spawnX`, `spawnY`, and `blockedTiles`.
- Frontend `RoomScene` now:
  - Keeps Phase 1 `camera.getWorldPoint(...)` + `isoToGrid(...)` + `isPointInsideIsoTile(...)` behavior.
  - Rejects clicks outside room bounds or on blocked tiles.
  - Draws separate layers for floor, highlight, future furniture/block markers, avatars, and UI bubbles.
  - Keeps selected-tile highlight before sending movement.
- Frontend `Avatar` now:
  - Walks along `path` tile by tile.
  - Tracks `idle` / `walking`.
  - Updates visual facing direction per step.
  - Keeps username label.
  - Replaces active chat bubble when a new message arrives.
  - Keeps bubble above the avatar without covering it completely.
- Avatar render order is sorted by isometric Y inside the avatar layer.

### REST And WebSocket Contract Changes

- `RoomResponse` now includes `spawnX`, `spawnY`, `blockedTiles`, and `onlineCount`.
- Client `USER_MOVED` remains `{ "x": number, "y": number }`; direction from the client is not trusted.
- Server `USER_MOVED.payload` is now `{ "x": number, "y": number, "direction": string, "path": GridPosition[] }`.
- `PRESENCE_UPDATE.payload.users[]` remains the Phase 2 flat user shape.

### Validation And Security Notes

- Backend remains authoritative for final movement validation.
- Client-computed tile clicks are only proposals.
- Backend rejects negative coordinates, out-of-range coordinates, blocked destinations, and destinations with no path.
- Persisted user room state is still updated only after backend validation.
- Existing chat validation remains intact.

### Verification Results

- `mvn test` passed: 6 tests, 0 failures.
- Backend tests cover join presence, valid movement persistence with path, out-of-range movement rejection, blocked tile rejection, empty chat rejection, and long chat rejection.
- `npm run build` passed. Vite still reports the expected large Phaser chunk.
- `docker compose config` passed.
- `docker compose up -d --build` returned success and rebuilt backend/frontend images.

### Verification Blocked

- Full Docker smoke test could not be completed in this run because Docker Desktop API started returning `Internal Server Error` for container listing/log APIs.
- `localhost:5433` did not accept PostgreSQL connections after the Docker issue, so backend login calls that require DB access timed out.
- `localhost:8080` still answered unauthenticated `401` requests, which confirms the port was open, but authenticated room/WebSocket smoke could not proceed without DB.
- `localhost:5173` returned a Vite `EIO: i/o error, open '/app/index.html'`, consistent with Docker runtime/filesystem instability during this failed smoke window.

### Next Recommended Step

Restart Docker Desktop, run `docker compose up -d --build`, then manually test two browser sessions with `trader/trader` and `broker/broker`: both users should see each other, movement should walk tile by tile, clicks on blocked tiles should not move, chat bubbles should still appear, and reconnect should restore the last persisted position.

## 2026-06-05 15:21:54 -04:00

### Change Summary

Implemented Phase 2 basic multiplayer for Hotel Exchange without breaking Phase 1. Also revalidated the pending isometric click/avatar centering fix before extending room multiplayer behavior.

### Files Created Or Modified

- `README.md`
- `docker-compose.yml`
- `backend/.env.example`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/db/migration/V2__user_room_state.sql`
- `backend/src/main/java/com/hotelexchange/config/AppProperties.java`
- `backend/src/main/java/com/hotelexchange/config/DataSeeder.java`
- `backend/src/main/java/com/hotelexchange/realtime/**`
- `backend/src/main/java/com/hotelexchange/room/RoomController.java`
- `backend/src/main/java/com/hotelexchange/room/RoomResponse.java`
- `backend/src/main/java/com/hotelexchange/room/UserRoomStateEntity.java`
- `backend/src/main/java/com/hotelexchange/room/UserRoomStateRepository.java`
- `backend/src/test/java/com/hotelexchange/realtime/RoomStateServiceTest.java`
- `backend/src/test/java/com/hotelexchange/realtime/RoomWebSocketHandlerTest.java`
- `frontend/src/types/api.types.ts`
- `frontend/src/services/wsClient.ts`
- `frontend/src/pages/LobbyPage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/game/PhaserRoom.tsx`
- `frontend/src/game/scenes/RoomScene.ts`
- `frontend/src/game/entities/Avatar.ts`
- `frontend/src/styles.css`
- `docs/AI_MEMORY.md`

### Bug Rechecked

- The isometric tile click fix remains in place:
  - `camera.getWorldPoint(pointer.x, pointer.y)` is used before `isoToGrid`.
  - The calculated tile is rejected outside room bounds.
  - The click must be inside the selected diamond via `isPointInsideIsoTile`.
  - Avatar visual anchor remains `getTileCenter(...)`.

### Technical Decisions

- Added Flyway migration `V2__user_room_state.sql` for persisted per-user room state.
- Added `user_room_state` with `user_id`, `room_id`, `x`, `y`, `direction`, and `updated_at`.
- Added `RoomStateService` to centralize coordinate validation, default position selection, direction sanitization, and persistence.
- Presence payload is now flat per user: `userId`, `username`, `displayName`, `x`, `y`, `direction`, `joinedAt`.
- `RoomPresenceRegistry` tracks connected sessions in memory and exposes unique online counts per room.
- `RoomResponse` now includes `onlineCount` for the lobby.
- Added second seeded test user `broker/broker` so two distinct browser sessions can test multiplayer.
- Frontend WebSocket client now supports `connecting`, `connected`, `reconnecting`, and `disconnected`.
- Phaser avatars are keyed by `userId` to avoid duplicate local avatars.
- Local avatar is visually distinguished with marker/name styling.
- Chat messages now produce temporary bubbles above avatars with visual truncation.

### REST And WebSocket Contract Changes

- `GET /api/rooms` and `GET /api/rooms/{roomId}` include `onlineCount`.
- `PRESENCE_UPDATE.payload.users[]` now includes `userId`, `username`, `displayName`, `x`, `y`, `direction`, `joinedAt`.
- `USER_MOVED.payload` now includes `x`, `y`, and `direction`.
- `CHAT_MESSAGE.payload` remains `{ "message": string }`.

### Validation And Security Notes

- Backend still derives user identity from JWT/session, never from the client payload.
- Backend validates movement coordinates against room width/height.
- Backend rejects negative coordinates, out-of-range coordinates, missing coordinates, and non-integer coordinates.
- Backend rejects empty chat and chat longer than configured max length.
- Frontend still pre-validates tile selection and chat length, but backend remains authoritative.

### Verification Results

- `mvn test` passed: 5 tests, 0 failures.
- Backend tests cover initial presence on join, valid movement persistence, out-of-range movement rejection, empty chat rejection, and long chat rejection.
- `npm run build` passed. Vite still reports the expected large Phaser chunk.
- `docker compose config` passed.
- `docker compose up -d --build` passed.
- Flyway migrated live Docker PostgreSQL from schema v1 to v2.
- Smoke test with `trader/trader` and `broker/broker` passed:
  - Two WebSockets joined room `1`.
  - Both users appeared in presence.
  - Broker movement to `(4, 4)` was broadcast to trader.
  - Trader chat was broadcast to broker.
  - Broker reconnected at persisted position `(4, 4)`.
  - Lobby online count returned `2` while both sockets were connected.

### Problems Encountered

- Backend unit tests needed a Java Time-capable `ObjectMapper`; the test mapper now uses `findAndRegisterModules()`.
- A strict assertion expecting `joinedAt` to serialize as text was relaxed to require presence/non-null because mapper configuration may serialize Java time differently outside Spring Boot.

### Pending Technical Work

- Add browser-level E2E tests for two-player room rendering and chat bubbles.
- Add WebSocket integration tests against an embedded server or Testcontainers PostgreSQL.
- Persist richer room session history if audit/moderation becomes a requirement.
- Add pathfinding and collision before furniture or room editing phases.
- Code-split Phaser route to reduce initial frontend bundle size.

### Next Recommended Step

Manually open two browser sessions at `http://localhost:5173`, log in as `trader/trader` and `broker/broker`, and visually confirm avatar movement, local/remote styling, chat bubbles, lobby online count, and persisted re-entry position.

## 2026-06-05 15:06:16 -04:00

### Change Summary

Fixed Phase 1 room gameplay bug where clicking an isometric tile could move the avatar visually off-center or to a neighboring-looking tile.

### Files Modified

- `frontend/src/game/utils/isometric.ts`
- `frontend/src/game/scenes/RoomScene.ts`
- `frontend/src/game/entities/Avatar.ts`
- `docs/AI_MEMORY.md`

### Bug Found

- Tile selection depended on each Phaser polygon receiving `pointerdown`.
- In an isometric diamond grid, polygon hit areas and overlapping bounds can make a click resolve visually as a nearby tile.
- Avatar placement also mixed tile center projection with a manual vertical offset, making the visual anchor harder to reason about.

### Solution Applied

- Added separated isometric helpers:
  - `gridToIso(x, y, origin, tileWidth, tileHeight)`
  - `isoToGrid(screenX, screenY, origin, tileWidth, tileHeight)`
  - `getTileCenter(x, y, origin, tileWidth, tileHeight)`
  - `isPointInsideIsoTile(...)`
- Room clicks now use Phaser camera world coordinates through `camera.getWorldPoint(pointer.x, pointer.y)`.
- The calculated tile is rejected if it is outside room bounds or if the pointer is not inside the real diamond area.
- The avatar container is now anchored directly at `getTileCenter(...)`; its visual body is drawn relative to that anchor.
- Added selected-tile highlight before sending the movement request.
- Added a single development-only `console.debug` for pointer world coordinates, calculated grid coordinates, and tile center.

### Validation Notes

- Frontend still only proposes `x/y`; backend continues validating room existence and coordinate bounds.
- Negative coordinates and coordinates outside `width`/`height` are rejected on the frontend before the move request and remain protected on the backend.
- `npm run build` passed after the fix.

### Next Recommended Step

Manually test `http://localhost:5173` by clicking several edge, corner, and middle tiles in Main Lobby and confirming the avatar's shadow lands at the selected tile center.

## 2026-06-05 14:42:32 -04:00

### Change Summary

Implemented Phase 1 foundation for `Hotel Exchange` as a new monorepo because `d:\MakingGames` was empty before this work.

### Files Created Or Modified

- `README.md`
- `docker-compose.yml`
- `.gitignore`
- `backend/pom.xml`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/.env.example`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/db/migration/V1__initial_schema.sql`
- `backend/src/main/java/com/hotelexchange/**`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/.env.example`
- `frontend/index.html`
- `frontend/tsconfig.json`
- `frontend/tsconfig.node.json`
- `frontend/vite.config.ts`
- `frontend/src/vite-env.d.ts`
- `frontend/src/**`
- `docs/AI_MEMORY.md`

### Technical Decisions

- Created monorepo shape: `backend/`, `frontend/`, `docs/`, root Docker Compose and README.
- Backend uses Spring Boot 3.x, Java 21, Spring Security, JWT, BCrypt, JPA repositories, DTOs, Flyway, and global exception handling.
- JWT secret is configured by environment variable and validated to be at least 32 bytes.
- Login uses an in-memory per-client basic rate limiter.
- WebSocket auth uses `?token={jwt}` because browser WebSocket clients cannot reliably send custom authorization headers.
- React owns API, session, WebSocket, and chat state. Phaser owns room rendering, tile click interaction, and avatar animation.
- Phaser room code is separated under `frontend/src/game/` with scene, entity, utility, and type modules.
- PostgreSQL schema is managed through Flyway. `rooms` is seeded by migration, while the test user is seeded at runtime with BCrypt.
- The initial room is `Main Lobby`, id `1`, width `12`, height `12`.

### REST Endpoints Created

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/rooms`
- `GET /api/rooms/{roomId}`

### WebSocket Endpoint And Events Created

- Endpoint: `/ws/rooms/{roomId}?token={jwt}`
- Client events: `ROOM_JOIN`, `ROOM_LEAVE`, `USER_MOVED`, `CHAT_MESSAGE`
- Server events: `ROOM_JOIN`, `ROOM_LEAVE`, `USER_MOVED`, `CHAT_MESSAGE`, `PRESENCE_UPDATE`, `ERROR`

### Validation And Security Notes

- Backend validates login DTOs, JWTs, room existence, coordinate bounds, chat emptiness, chat length, and WebSocket payload size.
- Passwords are stored as BCrypt hashes.
- Client does not send or choose user id for movement or chat events.
- Frontend does not store passwords and does not log tokens.
- CORS origins are environment-driven.
- Stack traces are not exposed to clients.

### Verification Results

- `npm install` completed and generated a lockfile.
- `npm audit --audit-level=moderate` passed with 0 vulnerabilities after updating Vite to `6.4.3` and `@vitejs/plugin-react` to `4.7.0`.
- `npm run build` passed. Vite reports a large Phaser-driven chunk.
- `mvn clean test` passed with 42 Java source files compiled and no tests present yet.
- `docker compose config` passed.
- `docker compose up -d --build` passed after moving the host PostgreSQL port to `5433`.
- Running containers verified: frontend on `localhost:5173`, backend on `localhost:8080`, PostgreSQL on host `localhost:5433`.
- REST smoke test passed: login `trader/trader`, `/api/me`, `/api/rooms`, and `/api/rooms/1`.
- WebSocket smoke test passed with events: `ROOM_JOIN`, `PRESENCE_UPDATE`, `USER_MOVED`, `CHAT_MESSAGE`.

### Problems Encountered

- Initial `docker compose up -d --build` failed because host port `5432` was already allocated by another PostgreSQL service.
- Compose was changed to publish PostgreSQL on host port `5433` while keeping the internal Compose address as `postgres:5432`.
- Frontend Docker context initially included generated files; `.dockerignore` files were added for frontend/backend.
- Spring Security emitted an unused generated-password warning; a no-op `UserDetailsService` bean was added because authentication is handled by the custom JWT flow.
- Frontend Docker command duplicated Vite `--host`; Dockerfile now relies on the package script.
- Frontend build script was changed from `tsc -b` to no-emit typechecks so Vite config artifacts are not generated in the repo.

### Pending Technical Work

- Keep an eye on Phaser bundle size; Vite reports a large production chunk, expected for the visual engine.
- Add automated tests for auth, rooms, WebSocket validation, and frontend room event handling.
- Persist and restore room positions beyond the current in-memory presence registry.
- Replace dev JWT handling with Keycloak in a future phase.

### Next Recommended Step

Open `http://localhost:5173`, manually test the room UI in the browser, then add automated backend and frontend tests before starting Phase 2 multiplayer state persistence.
