# Hotel Exchange — Current State

**Fecha:** 2026-06-06 (post 4C.4 — CORS PATCH fix + sprite preload fix)  
**Build:** `mvn test` 78 tests OK · `npm run build` ✓

---

## Fases completadas

| Fase | Descripción |
|------|-------------|
| 4A | Backend persistent furniture, RoomModel/floorMap, movement validation con structural blockers, furniture depth sorting, Main Lobby composition pass |
| 4B | User inventory backend + UI panel |
| 4C.1 | Furniture placement preview (frontend) |
| 4C.2 | Place furniture — REST POST + WebSocket broadcast + frontend apply |
| 4C.3 | Pick up / Remove furniture — REST DELETE + WebSocket + inventory increment |
| 4C.4 | Rotate furniture — REST PATCH + WebSocket + frontend cycle SE→NE→NW→SW→SE |

---

## Arquitectura de sala activa

```
GET /api/rooms/{id}
  → Room { id, name, width, height, spawnX, spawnY, spawnDirection,
           modelCode, shell, model, blockedTiles, furniture, onlineCount }

furniture[]: RoomFurniture { id, catalogCode, name, spriteKey, spritePath,
                              x, y, z, rotation, width, height,
                              blocksMovement, interactionType, state, ownerUserId }
```

---

## Endpoints de furniture

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/rooms/{roomId}/furniture` | JWT | Colocar furniture desde inventario |
| DELETE | `/api/rooms/{roomId}/furniture/{id}` | JWT + owner | Retirar furniture al inventario |
| PATCH | `/api/rooms/{roomId}/furniture/{id}/rotate` | JWT + owner | Rotar (body: `{ "rotation": "NE" }`) |

---

## Eventos WebSocket de sala (server → client)

| Tipo | Payload |
|------|---------|
| `ROOM_JOIN` | actor |
| `ROOM_LEAVE` | actor |
| `USER_MOVED` | `{ x, y, direction, path }` |
| `CHAT_MESSAGE` | `{ message }` |
| `PRESENCE_UPDATE` | `{ users: PresenceUser[] }` |
| `ROOM_FURNITURE_ADDED` | `{ furniture, placedByUserId, placedByUsername }` |
| `ROOM_FURNITURE_REMOVED` | `{ furnitureId, catalogCode, removedByUserId, removedByUsername }` |
| `ROOM_FURNITURE_ROTATED` | `{ furniture, rotatedByUserId, rotatedByUsername }` |
| `ERROR` | `{ message }` |

---

## Frontend — componentes clave

| Componente | Responsabilidad |
|------------|-----------------|
| `RoomScene.ts` | Phaser scene: tiles, avatars, furniture sprites, placement preview, click handling |
| `PhaserRoom.tsx` | Bridge React↔Phaser; expone handle con métodos de furniture |
| `RoomPage.tsx` | Página principal: WS, REST calls, context menu de furniture, inventory |
| `InventoryPanel.tsx` | Panel de inventario con botón "Place" |

### Métodos expuestos por `PhaserRoomHandle`

- `applyEvent(event)` — WS event
- `setPresence(users)` — presence update
- `showChatBubble(userId, message)`
- `enterPlacementMode(item)` / `exitPlacementMode()` / `setPlacementPending(pending)`
- `addFurnitureInstance(furniture)`
- `removeFurnitureInstance(furnitureId)`
- `rotateFurnitureInstance(furnitureId, newRotation, newWidth, newHeight)`

---

## Context menu de furniture (RoomPage)

Se abre al hacer clic sobre furniture propio en Phaser. Botones:
1. **Rotate** → `PATCH /rotate`, cicla SE→NE→NW→SW→SE
2. **Pick up** → `DELETE`, devuelve al inventario
3. **Cancel** → cierra menú

Dedupe REST→WS:
- Remove: `addedFurnitureIdsRef` set
- Rotate: `recentlyRotatedRef: Map<number, string>`

---

## Próximos pasos recomendados

1. **FASE 4C.5**: Mover furniture — `PATCH /api/rooms/{roomId}/furniture/{id}/move` con `{ x, y }`, validar footprint en nueva posición.
2. **FASE 4D**: Marketplace básico — listado de items en venta, órdenes de compra/venta.
3. **FASE 4A.7**: Elevation rendering — side faces en tiles con `height > 0`.
4. **Directional sprites**: cuando haya assets SE/NE/NW/SW distintos, conectar con `rotation` ya disponible en la scene.

---

## Usuarios seed (desarrollo)

| Usuario | Password | Inventario inicial |
|---------|----------|--------------------|
| trader | trader | green_leather_sofa×1, dark_wood_coffee_table×1, red_executive_chair×1 |
| broker | broker | dark_wood_coffee_table×1, red_executive_chair×1 |

---

## Sala seed

| Room | ID | FloorMap | Furniture sistema |
|------|----|----------|-------------------|
| Main Lobby | 1 | `exchange_lobby_01` (12×12 octágono) | ninguno (V11 limpió system decor) — sala vacía hasta que usuario coloque piezas |

---

## Mensajes de error de furniture (HTTP 422)

| Endpoint | Caso | Mensaje |
|----------|------|---------|
| PATCH /rotate | System furniture | "System furniture cannot be rotated" |
| PATCH /rotate | Ownership | "You can only rotate your own furniture" |
| PATCH /rotate | Rotación inválida | "Invalid rotation value: X" |
| PATCH /rotate | Footprint fuera | "Rotated footprint exceeds room at tile (x, y)" |
| PATCH /rotate | Colisión | "Rotated footprint collides with furniture at tile (x, y)" |
| DELETE | System furniture | "Cannot remove system furniture" |
| DELETE | Ownership | "You do not own this furniture" |
