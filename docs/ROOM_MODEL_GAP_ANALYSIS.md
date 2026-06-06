# Room Model Gap Analysis

Date: 2026-06-05
Author: AI analysis pass (no code copied from Kepler)

---

## A. Resumen Ejecutivo

### El problema visual y técnico de la Main Lobby actual

La Main Lobby de Hotel Exchange se renderiza como un cuadrado de `12x12` tiles isométricos donde todos los tiles dentro del bounding box existen y son caminables por defecto. El `floorTileFill` en `RoomScene.ts` colorea una zona de escritorio hardcodeada en coordenadas `(4-7, 4-8)`. Las paredes se dibujan con altura fija de 92px para cualquier sala. Las decoraciones de pared (`MARKET OPEN`, `EXCHANGE DESK`) están hardcodeadas en TypeScript y solo aparecen en la sala 1.

El resultado es una sala que se ve como una **plataforma genérica flotante** con muebles encima, porque:

- No hay forma de definir qué tiles existen realmente. No hay tiles vacíos, esquinas irregulares, ni huecos en el piso.
- No hay variación de altura. Todos los tiles son planos al mismo nivel.
- La composición visual (qué zona es el "área de trading", qué zona es la recepción, dónde están las paredes largas) no viene de datos sino de código hardcodeado en la escena.
- Las paredes son idénticas en cualquier sala. No hay modo de muro diferente, no hay color, no hay tema.
- El spawn point no tiene dirección. El jugador aparece mirando en la dirección por defecto.

### Por qué furniture persistente no basta

`FASE 4A` implementó correctamente `furniture_catalog` y `room_furniture` en PostgreSQL. El backend ahora devuelve furniture y calcula `blockedTiles` desde el footprint del furniture. Esto es necesario y ya funciona.

Pero furniture bloqueante solo resuelve **objetos colocados**, no la **forma de la sala**. Los problemas que persisten no son de furniture sino del modelo de sala:

- Un tile bloqueado por furniture todavía se renderiza como un tile de piso válido con color oscuro. Un tile que no existe debería directamente no renderizarse.
- Las paredes responden a `width x height`, no a la forma real de la sala.
- El frontend no puede renderizar una sala en L, una sala con una isla central inaccesible, o una sala con escalones sin hackear el sistema de bloqueados.
- No hay tema de piso ni de pared por sala. Cambiar la sala requiere editar TypeScript.

### Por qué necesitamos un RoomModel data-driven

Un `RoomModel` data-driven resolvería todos estos problemas de una vez:

- Define exactamente qué tiles existen, de forma legible por humanos.
- Define el spawn y la dirección de entrada.
- Define la configuración de paredes y el tema visual.
- Puede ser compartido entre múltiples salas (Main Lobby, Trading Floor, etc. podrían compartir una base y diferenciar solo por furniture y decoración).
- El backend puede validar movimiento contra el mapa de forma en lugar de solo contra bounds rectangulares.
- El frontend renderiza solo los tiles que existen, produciendo salas con forma real.

---

## B. Conceptos Observados en Kepler (Solo Referencia Conceptual)

> Kepler fue revisado únicamente como referencia conceptual de arquitectura. No se copió código, assets, protocolo, nombres de paquetes ni identificadores propietarios.

### B.1. Separación Room / RoomModel

En Kepler, la tabla `rooms` es metadata de la sala (nombre, categoría, visibilidad, access control, capacidad, puntuación, propietario). La tabla `rooms_models` define la **geometría** de la sala.

Un `room_model` es reutilizable: múltiples salas pueden compartir el mismo modelo. Una sala de tipo "lobby" puede existir en tres instancias (Main Lobby, Basement Lobby, Skylight Lobby) que comparten la misma planta física pero tienen nombres distintos, propietarios distintos y furniture distinto.

**Lección para Hotel Exchange**: separar `RoomEntity` (metadata de la sala) del layout físico de la sala permite crear múltiples salas basadas en el mismo modelo y cambiar la geometría sin tocar cada sala individualmente.

### B.2. Heightmap como representación del mapa de piso

En Kepler, el modelo de sala tiene un campo `heightmap`, que es texto con filas separadas por un separador de fila. Cada carácter representa un tile en la posición `(columna, fila)`:

- Un carácter especial (tipicamente `x`) significa que el tile **no existe** en esa posición. La sala puede tener forma irregular, no tiene que ser un rectángulo.
- El carácter `0` representa un tile plano caminable al nivel del piso base.
- Caracteres numéricos `1`, `2`, `3`, etc. representan tiles a distintas alturas. Un tile en altura `1` está elevado un nivel sobre el piso base, lo que en la representación isométrica aparece como un escalón o plataforma.

El heightmap del model `lobby_a` (que Kepler asigna al Main Lobby) muestra tiles en múltiples alturas (`7`, `6`, `5`, `4`, `3`, `2`, `1`, `0`), con zonas de diferentes alturas que corresponden al diseño visual de una escalera/lobby real.

El heightmap del model `newbie_lobby` (Welcome Lounge) muestra una planta irregular en forma de L o T, con zonas de `x` (no existe) rellenando las esquinas para darle forma no rectangular.

**Lección para Hotel Exchange**: almacenar el mapa de sala como texto con un formato simple de caracteres permite definir formas irregulares, zonas de altura, y tiles inexistentes de forma compacta y legible.

### B.3. Spawn / Door position con dirección

En Kepler, el modelo tiene `door_x`, `door_y`, `door_z` (tile de spawn) y `door_dir` (dirección de entrada, codificada como entero correspondiente a una de las 8 direcciones isométricas: 0=N, 2=E, 4=S, 6=W, etc.).

Esta información vive en el **modelo**, no en la sala, porque todas las instancias de ese modelo tienen la misma entrada física.

**Lección para Hotel Exchange**: necesitamos `spawnDirection` además de `spawnX/spawnY`. Actualmente `spawnDirection` no existe en la entidad ni en el DTO.

### B.4. Floor y Wallpaper como temas visuales

En Kepler, la tabla `rooms` tiene campos `wallpaper` y `floor` que son IDs que referencian temas visuales. El cliente carga el tema y renderiza el piso/paredes con esa textura.

En el modelo de sala (rooms_models) no están los temas visuales: viven en la sala. Esto significa que dos salas que comparten el mismo modelo geométrico pueden tener piso y pared distintos.

**Lección para Hotel Exchange**: el tema de piso y pared debería ser configurable por sala, no hardcodeado en TypeScript.

### B.5. Walkability como derivación del mapa

En Kepler, la walkability de un tile se calcula dinámicamente combinando:
- Si el tile existe en el heightmap (carácter `x` = no existe = no caminable).
- Si el tile está bloqueado por furniture colocado en ese tile.
- Si el tile está ocupado por otro usuario o entidad.
- Reglas de altura y apilamiento (no siempre se puede subir o bajar a tiles adyacentes de altura muy diferente).

El backend es autoritativo. El cliente puede hacer predicciones locales pero el servidor recalcula la walkability real.

**Lección para Hotel Exchange**: la validación de movimiento debe incluir la comprobación de "tile exists" antes de "tile blocked". Actualmente `isInsideRoom` verifica bounds rectangulares, lo cual no es suficiente si el modelo de sala tiene forma irregular.

### B.6. Furniture placement contra el mapa

En Kepler, el furniture solo puede colocarse en tiles que existen y son caminables. El footprint del furniture se calcula respecto al mapa real, no al bounding box. Colocar furniture en un tile que no existe es rechazado.

**Lección para Hotel Exchange**: cuando implementemos placement de furniture, el backend deberá validar contra el floorMap, no solo contra `width x height`.

---

## C. Estado Actual de Hotel Exchange

### C.1. Qué ya existe (bien diseñado)

- `furniture_catalog` y `room_furniture` en PostgreSQL (FASE 4A). Correcto y bien estructurado.
- `RoomLayoutService` combina blockers estructurales + furniture. Diseño limpio.
- `PathfindingService` BFS cardinal en backend. Correcto.
- `furnitureSpriteRenderer.ts` separado y reutilizable. Buen diseño.
- `RoomFurnitureService` calcula blocked tiles desde footprint. Correcto.
- DTO `RoomDetailDto` con `blockedTiles`, `furniture`, `spawnX`, `spawnY`. Bien estructurado.
- Queue de eventos pendientes en `RoomScene.ts` antes de que Phaser esté listo. Solución correcta.

### C.2. Qué falta

- **Floor map / tile existence**: `RoomEntity` no tiene ningún campo para definir qué tiles existen o a qué altura están.
- **Spawn direction**: `spawnDirection` no existe. El jugador siempre aparece mirando en la dirección por defecto del avatar.
- **Wall mode**: no hay campo para el modo de muro (ancho, alto, tipo de pared).
- **Room theme**: no hay campos para tema de piso ni tema de pared por sala.
- **Structural tile categories**: no hay distinción entre "tile no existe", "tile existe pero está bloqueado estructuralmente", y "tile bloqueado por furniture".
- **RoomModel como entidad separada**: actualmente toda la geometría vive inline en `RoomEntity` (solo width/height). No hay modelo reutilizable.

### C.3. Qué está hardcodeado y debería ser data-driven

| Qué está hardcodeado | Dónde | Debería venir de |
|---|---|---|
| Zona de escritorio (4-7, 4-8) con color diferente | `RoomScene.ts:floorTileFill` | `floorMap` o zona definida en el modelo |
| Altura de pared (92px) | `RoomScene.ts:drawRoomShell` | Configuración del modelo de sala |
| Panel "MARKET OPEN" y "EXCHANGE DESK" | `RoomScene.ts:drawTradingWallDecor` | Decoraciones de pared del modelo o furniture de pared |
| Colores base del piso `FLOOR_TILE_COLORS` | `RoomScene.ts` constantes | Tema de piso de la sala |
| Forma rectangular completa 12x12 | `drawFloor()` itera `0..width, 0..height` | `floorMap` que define qué tiles existen |
| Side panel depths (sideDepth = 20) | `drawRoomShell` | Modelo de sala |

### C.4. Qué no rompe el diseño pero limita el crecimiento

- `room_blocked_tiles` es una tabla separada para blockers manuales. Con un floorMap, los blockers estructurales podrían venir directamente del mapa. La tabla podría mantenerse solo para blockers dinámicos no cubiertos por el mapa (e.g., un objeto de juego temporal).
- `isInsideRoom` verifica solo bounds rectangulares. Cuando tengamos floorMap, la verificación debe ser "tile existe en el mapa".
- El BFS de `PathfindingService` itera en 4 direcciones y delega walkability a `RoomLayoutService.isWalkable`. La interface ya es correcta; solo hay que añadir la verificación de existencia del tile.

---

## D. Gap Analysis

### D.1. Sala actual vs. sala objetivo

| Dimensión | Estado actual | Estado objetivo |
|---|---|---|
| Forma | Rectángulo 12x12 siempre | Forma arbitraria definida por floorMap |
| Tiles existentes | Todos los tiles dentro de bounds | Solo los tiles marcados como existentes en floorMap |
| Altura de tiles | Planos (todos al nivel 0) | Múltiples alturas (0, 1, 2...) para plataformas |
| Spawn | spawnX + spawnY (sin dirección) | spawnX + spawnY + spawnDirection |
| Modelo | Geometry inline en RoomEntity | RoomModel reutilizable separado de RoomEntity |
| Múltiples salas | Solo Main Lobby realmente funcional | Cualquier sala con su propio modelo |

### D.2. Furniture actual vs. furniture objetivo

| Dimensión | Estado actual | Estado objetivo |
|---|---|---|
| Persistencia | PostgreSQL (FASE 4A) ✓ | Sin cambio necesario |
| Blocked tiles | Calculado desde footprint ✓ | Sin cambio para fase 5 básica |
| Placement validation | No implementada aún | Validar contra floorMap + permisos |
| Placement UI | No implementada aún | Futuro (fase 4C+) |
| Rotación | 4 valores (NE/SE/SW/NW) ✓ | Sin cambio |

### D.3. Movement actual vs. movement objetivo

| Dimensión | Estado actual | Estado objetivo |
|---|---|---|
| Bounds check | `x >= 0 && x < width` (rectangular) | Verificar existencia del tile en floorMap |
| Blocker check | `room_blocked_tiles` + furniture blockers | Structural (mapa) + furniture blockers |
| Error message | "Movement outside room grid" | Diferenciado: "tile does not exist" / "tile blocked" |
| Pathfinding | BFS 4-cardinal ✓ | Sin cambio en el algoritmo |
| Diagonal | No soportado actualmente | Futuro si se necesita para alturas |

### D.4. Wall / floor actual vs. wall / floor objetivo

| Dimensión | Estado actual | Estado objetivo |
|---|---|---|
| Floor rendering | `drawFloor()` itera todo el bounding box | Renderizar solo tiles existentes según floorMap |
| Floor theme | Constantes hardcodeadas en RoomScene.ts | Campo `floorTheme` en sala o modelo |
| Wall rendering | `drawRoomShell()` igual para todas las salas | `wallMode` + `wallHeight` configurables por modelo |
| Wall decor | Hardcodeado para sala 1 solamente | Decoraciones de pared como furniture de tipo WALL |
| Border/platform | `sideDepth = 20` hardcodeado | Derivado del modelo o tema |

---

## E. Modelo Propuesto para Hotel Exchange

### E.1. RoomModel

Nueva entidad para definir la geometría de una sala, reutilizable por múltiples instancias.

```
RoomModel:
  id            BIGSERIAL PRIMARY KEY
  code          VARCHAR(80) NOT NULL UNIQUE   -- "exchange_lobby_01", "trading_floor_01"
  name          VARCHAR(120) NOT NULL          -- "Exchange Lobby Standard"
  width         INTEGER NOT NULL               -- ancho en tiles
  height        INTEGER NOT NULL               -- alto en tiles
  floor_map     TEXT NOT NULL                  -- ver Sección F
  wall_mode     VARCHAR(40) NOT NULL DEFAULT 'STANDARD'
  wall_height   INTEGER NOT NULL DEFAULT 3     -- altura de pared en unidades de tile
  spawn_x       INTEGER NOT NULL DEFAULT 1
  spawn_y       INTEGER NOT NULL DEFAULT 1
  spawn_direction VARCHAR(8) NOT NULL DEFAULT 'S'
  theme         VARCHAR(40) NOT NULL DEFAULT 'DEFAULT'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Nota sobre `wall_height`**: usar unidades de tile (no píxeles) para que el renderer pueda escalar. Un `wall_height = 3` significa 3 alturas de tile isométricas. El renderer convierte a píxeles en el frontend.

**Nota sobre `wall_mode`**:
- `STANDARD`: paredes en el lado norte y oeste de la sala (esquina superior izquierda), bordeando el bounding box exterior.
- `OPEN`: sin paredes (parques, áreas exteriores).
- `CUSTOM`: futuro, para paredes definidas por tiles especiales en el floorMap.

**Nota sobre `theme`**: actualmente solo informativo. En el futuro puede referenciar una tabla de temas visuales con colores de piso, colores de pared, y texturas.

### E.2. Evolución de RoomEntity

Agregar referencia al modelo. Los campos `width` y `height` se pueden denormalizar en la sala o derivarlos del modelo.

```
RoomEntity (campos adicionales):
  model_code     VARCHAR(80) NULL REFERENCES room_models(code)
  description    VARCHAR(255) NOT NULL DEFAULT ''
  status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
  floor_theme    VARCHAR(40) NOT NULL DEFAULT 'DEFAULT'
  wall_theme     VARCHAR(40) NOT NULL DEFAULT 'DEFAULT'
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
```

Estrategia de migración: `model_code` es nullable inicialmente para no romper la sala actual mientras no se crea el modelo.

### E.3. RoomTile (concepto, no necesariamente una tabla)

Un RoomTile no necesita ser una tabla. Es la representación en memoria de un tile decodificado del floorMap.

```
RoomTile:
  x        int     -- columna
  y        int     -- fila
  exists   boolean -- false si el carácter es 'x'
  walkable boolean -- true si exists y no bloqueado
  height   int     -- 0 = nivel base, 1+ = elevado
  zone     String? -- opcional: "trading", "waiting", "reception"
```

`zone` es futuro. Permite marcar regiones del mapa con semántica de juego sin necesitar furniture.

### E.4. RoomShell (DTO/concepto)

```
RoomShellDto:
  wallMode      String   -- "STANDARD", "OPEN", "CUSTOM"
  wallHeight    int      -- altura de paredes en unidades
  floorTheme    String   -- para colorear el piso
  wallTheme     String   -- para colorear las paredes
  hasLeftWall   boolean  -- muro en el borde norte-oeste
  hasRightWall  boolean  -- muro en el borde norte-este
```

### E.5. Blocked Tile Model diferenciado

Actualmente `blockedTiles` es una lista plana de posiciones. Propuesta para diferenciar la causa:

```
BlockedTileDto (ampliado):
  x      int
  y      int
  reason String  -- "STRUCTURAL", "FURNITURE", "ENTITY"
```

`STRUCTURAL` = el tile no existe en el floorMap o está marcado como bloqueado estructural.
`FURNITURE` = tile bloqueado por furniture con `blocksMovement = true`.
`ENTITY` = futuro, tile bloqueado temporalmente por un usuario u objeto dinámico.

El frontend puede distinguir visualmente entre los tres tipos. Los tiles `STRUCTURAL` no deberían renderizarse como tiles de piso en absoluto (o renderizarse como void oscuro).

---

## F. Formato FloorMap Propuesto

### F.1. Especificación

El floorMap es un String con filas separadas por `\n` (newline). Cada fila es una secuencia de caracteres donde cada carácter representa un tile en esa posición `(columna, fila)`.

| Carácter | Significado |
|---|---|
| `x` o `X` | Tile no existe (vacío, fuera del area de la sala) |
| `0` | Tile plano caminable, altura 0 |
| `1` | Tile elevado, altura 1 |
| `2` | Tile elevado, altura 2 |
| ... | Alturas adicionales (futuro) |
| `b` | Tile bloqueado estructural (existe, pero no caminable, no es furniture) |

Reglas:
- `x` (o `X`) = el tile no existe en el espacio de juego. No se renderiza como piso.
- `0` = tile base, nivel del suelo.
- `1`, `2`... = futuro para escalones y plataformas.
- `b` = bloqueado estructural. Útil para recepción, columnas, partes de paredes internas que forman el layout.
- El ancho del floorMap debe coincidir con `RoomModel.width`. El número de filas debe coincidir con `RoomModel.height`.
- El backend valida al guardar que las dimensiones del mapa coincidan con `width x height`.

### F.2. Ejemplo para Main Lobby (`exchange_lobby_01`)

Sala 12x12. La Main Lobby no tiene tiles vacíos en la actualidad (es completamente rectangular). El siguiente mapa preserva ese comportamiento y además marca la zona de recepción con `b`:

```
000000000000
000000000000
000000000000
000000000000
000000000000
0000000b0000
000000bb0000
000000000000
000000000000
000000000000
000000000000
000000000000
```

Notas:
- `b` en (6,5) y (7,5), (6,6) corresponden a la zona de recepción/exchange desk donde no debería haber pathfinding (pero el furniture ya lo bloquea, así que `b` aquí sería redundante en el estado actual). Esto ilustra la diferencia conceptual entre bloqueo estructural y bloqueo por furniture.
- Todos los tiles `0` son caminables en superficie plana.
- No hay tiles `x` porque la sala es un cuadrado completo.

### F.3. Ejemplo con forma irregular (futuro)

Una sala con forma en L para Trading Floor:

```
0000000xxxxx
0000000xxxxx
0000000xxxxx
00000000000
00000000000
00000000000
000000000000
000000000000
000000000000
000000000000
000000000000
000000000000
```

La sección superior derecha (`xxx`) no existe. Las paredes se renderizarían solo alrededor de los tiles existentes.

### F.4. Ejemplo con plataforma elevada (futuro)

```
000000000000
000000000000
001111100000
001111100000
001111100000
000000000000
000000000000
```

Un bloque 3x5 de tiles en altura `1` crea una plataforma visible en la representación isométrica.

---

## G. Backend Roadmap

### G.1. Migraciones propuestas

**V5__room_models.sql** (nueva):
```sql
CREATE TABLE room_models (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0 AND width <= 64),
    height INTEGER NOT NULL CHECK (height > 0 AND height <= 64),
    floor_map TEXT NOT NULL,
    wall_mode VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
    wall_height INTEGER NOT NULL DEFAULT 3,
    spawn_x INTEGER NOT NULL DEFAULT 1,
    spawn_y INTEGER NOT NULL DEFAULT 1,
    spawn_direction VARCHAR(8) NOT NULL DEFAULT 'S',
    theme VARCHAR(40) NOT NULL DEFAULT 'DEFAULT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO room_models (code, name, width, height, floor_map, wall_mode, wall_height, spawn_x, spawn_y, spawn_direction, theme)
VALUES (
    'exchange_lobby_01',
    'Exchange Lobby Standard',
    12,
    12,
    '000000000000\n000000000000\n000000000000\n000000000000\n000000000000\n000000000000\n000000000000\n000000000000\n000000000000\n000000000000\n000000000000\n000000000000',
    'STANDARD',
    3,
    1,
    1,
    'S',
    'EXCHANGE'
);
```

**V5b__rooms_model_ref.sql** (agregar referencia en rooms):
```sql
ALTER TABLE rooms
    ADD COLUMN model_code VARCHAR(80) NULL REFERENCES room_models(code),
    ADD COLUMN description VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN floor_theme VARCHAR(40) NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN wall_theme VARCHAR(40) NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE rooms SET model_code = 'exchange_lobby_01' WHERE id = 1;
```

Mantener `width` y `height` en `rooms` como valores denormalizados para queries simples, sincronizados con el modelo.

### G.2. Servicios propuestos

**RoomModelService** (nuevo):
- `findByCode(code)` → RoomModelEntity
- `decodedFloorMap(model)` → `RoomTile[][]` (decodifica el string en matriz de tiles)
- `walkableTileSet(model)` → `Set<GridPosition>` (solo tiles walkables en el mapa)
- `existingTileSet(model)` → `Set<GridPosition>` (todos los tiles que existen, caminables o no)

**RoomLayoutService** (evolución de la actual):
- Integrar con `RoomModelService` para verificar existencia del tile además de blockers.
- `isExistingTile(model, position)` → boolean
- `isWalkable(model, position, blockedTiles)` → boolean (exists AND not blocked)
- `structuralBlockedTiles(model)` → `Set<GridPosition>` (tiles `b` del mapa)
- `validateWalkableDestination` ya existe, agregar verificación de existencia.

**MovementValidationService** (extraído o evolucionado desde RoomLayoutService):
- Separar responsabilidades: `RoomLayoutService` gestiona layout data; `MovementValidationService` gestiona validación de movimiento.
- Orden de verificación:
  1. ¿El tile existe en el floorMap? Si no → "Tile does not exist"
  2. ¿El tile es estructuralmente bloqueado (`b` en el mapa)? Si sí → "Structural block"
  3. ¿El tile está bloqueado por furniture? Si sí → "Furniture block"
  4. ¿El tile está ocupado por una entidad? (futuro) Si sí → "Entity block"

### G.3. DTOs propuestos

**RoomModelDto** (nuevo):
```java
public record RoomModelDto(
    Long id,
    String code,
    String name,
    int width,
    int height,
    String floorMap,
    String wallMode,
    int wallHeight,
    int spawnX,
    int spawnY,
    String spawnDirection,
    String theme
) {}
```

**RoomShellDto** (nuevo, puede vivir dentro de RoomDetailDto):
```java
public record RoomShellDto(
    String wallMode,
    int wallHeight,
    String floorTheme,
    String wallTheme
) {}
```

**RoomDetailDto** (evolución de la actual):
```java
public record RoomDetailDto(
    Long id,
    String name,
    String description,
    int width,
    int height,
    int spawnX,
    int spawnY,
    String spawnDirection,   // NUEVO
    String modelCode,        // NUEVO
    RoomShellDto shell,      // NUEVO
    List<BlockedTileDto> blockedTiles,
    List<RoomFurnitureDto> furniture,
    int onlineCount
) {}
```

**BlockedTileDto** (evolución de la actual):
```java
public record BlockedTileDto(
    int x,
    int y,
    String reason   // "STRUCTURAL", "FURNITURE"
) {}
```

---

## H. Frontend Roadmap

### H.1. Nuevos módulos propuestos

**`frontend/src/game/rendering/roomShellRenderer.ts`**
- Responsabilidad: renderizar paredes, zócalos, laterales y techo según el `RoomShellDto`.
- Parámetros: escena Phaser, corners de la sala (calculados desde tiles existentes del floorMap, no desde width/height), RoomShellDto.
- Reemplaza el `drawRoomShell()` hardcodeado en `RoomScene.ts`.
- El cálculo de corners debe venir del floorMap (tiles extremos), no de `width-1, height-1`.

**`frontend/src/game/rendering/floorMapRenderer.ts`**
- Responsabilidad: renderizar los tiles del piso según el floorMap decodificado.
- Reemplaza el bucle `for (y...) for (x...)` en `drawFloor()`.
- Solo renderiza tiles que existen (`exists = true`).
- Colorea según `floorTheme` y altura del tile.
- Acepta un array `RoomTileView[]` derivado del floorMap.

**`frontend/src/game/data/floorMapDecoder.ts`**
- Responsabilidad: decodificar el string `floorMap` en `RoomTile[][]`.
- `decodeFloorMap(floorMap: string, width: number, height: number): RoomTile[][]`
- `existingTiles(floorMap): GridPosition[]`
- `walkableTileSet(floorMap): Set<string>` (llaves `x:y`)

### H.2. Integración con RoomScene.ts

Flujo propuesto:

```
RoomDetailDto (de API)
  → decodedTiles = decodeFloorMap(room.model.floorMap, room.width, room.height)
  → floorMapRenderer renderiza tiles existentes
  → roomShellRenderer renderiza paredes desde corners de tiles extremos
  → furnitureSpriteRenderer renderiza furniture (sin cambios)
  → Avatar layer (sin cambios)
```

Cambios en `RoomScene.ts`:
- `isInsideRoom()` reemplazado por consulta al mapa decodificado: `tileExists(position)`.
- `blockedTileKeys` incluye tiles no existentes además de blocked tiles del backend.
- `drawFloor()` delega a `floorMapRenderer` en lugar de iterar el bounding box.
- `drawRoomShell()` delega a `roomShellRenderer` con los datos del DTO.
- `drawTradingWallDecor()` se elimina del código estático y se vuelve furniture de pared (futuro) o configuración del modelo.
- `floorTileFill()` consulta el tema del modelo en lugar de hardcodear la zona de escritorio.

### H.3. Compatibilidad y fallback

- Si `room.model` es null o `floorMap` está vacío: usar el comportamiento actual (bounding box completo, `width x height`).
- Esto permite que la FASE 4A siga funcionando sin cambios hasta que se migre al nuevo modelo.
- El flag de fallback no debe ser permanente: cuando exista el modelo en el backend, el fallback desaparece.

### H.4. Separación de furnitureSpriteRenderer

- `furnitureSpriteRenderer.ts` no requiere cambios para la fase 5.
- El renderer ya acepta posiciones del DTO. Los tiles de furniture se posicionan sobre los tiles del floorMap.
- Cuando el modelo de sala esté disponible, el renderer puede validar localmente que el furniture está en un tile existente.

---

## I. Movement Validation

### I.1. Orden de validaciones en backend

```
1. Tile existe en floorMap?
   NO → BadRoomEventException("Tile does not exist")

2. Tile es estructuralmente bloqueado (tipo 'b' en mapa)?
   SÍ → BadRoomEventException("Tile is structurally blocked")

3. Tile está en room_blocked_tiles?
   SÍ → BadRoomEventException("Tile is structurally blocked")

4. Tile está bloqueado por furniture (blocksMovement = true)?
   SÍ → BadRoomEventException("Destination tile is blocked by furniture")

5. Existe ruta válida desde posición actual hasta destino?
   NO → BadRoomEventException("No path to destination")

6. Aceptar movimiento.
```

### I.2. Principios

- El cliente NUNCA es autoritativo sobre walkability. Solo propone destinos.
- El backend recalcula el path completo. El cliente recibe el path y lo anima.
- El floorMap es la fuente de verdad estructural. Los blocked tiles de furniture son dinámicos.
- La validación debe ser reproducible: dado un estado de la sala (mapa + furniture), el resultado de validación es determinista.

### I.3. Cambios en frontend

- `isInsideRoom(position)` → `tileExists(position)` (consulta el mapa decodificado).
- `isBlocked(position)` → `!tileExists(position) || isBlocked(position)`.
- `findVisualPath()` BFS del frontend usa `tileExists` para filtrar tiles de iteración.
- El frontend puede rechazar clicks en tiles no existentes con visual feedback inmediato (sin enviar al backend).
- Las verificaciones del frontend son optimización UX, nunca autoridad de seguridad.

---

## J. Riesgos Técnicos

### J.1. Profundidad isométrica con tiles no existentes

**Riesgo**: cuando algunos tiles no existen, el algoritmo de profundidad basado en `screenY` puede producir artefactos visuales en los bordes de la sala.

**Mitigación**: al calcular corners para paredes, usar los tiles extremos existentes, no el bounding box. Los tiles void (`x`) no se añaden a la cola de renderizado y no afectan la profundidad.

### J.2. Sprites de furniture con escalas inconsistentes

**Riesgo**: si un tile en altura `1` tiene diferentes dimensiones isométricas que uno en altura `0`, el furniture posicionado encima no encaja visualmente.

**Mitigación**: para la fase 5, mantener todos los tiles en altura `0`. Las alturas futuras deben planificarse con las dimensiones de sprites en mente. La altura isométrica se suma como desplazamiento Y en el renderer.

### J.3. Paredes tapando avatares

**Riesgo**: si los avatares caminan cerca de la pared izquierda o derecha, la pared puede taparlos en el renderizado isométrico.

**Mitigación**: las paredes deben renderizarse a profundidad fija baja (por ejemplo `depth = origin.y - wallHeight`), por debajo de todos los avatares. Los avatars siempre en `depth = screenY + offset`, lo cual siempre es mayor. Esta regla ya funciona en el código actual; solo hay que asegurarse de mantenerla al migrar a `roomShellRenderer`.

### J.4. Pathfinding frontend vs. validación backend

**Riesgo**: si el cliente decodifica el floorMap de forma diferente al backend, los resultados del BFS local divergen del path calculado en backend, causando que el avatar se quede parado o tome rutas incorrectas.

**Mitigación**: usar el mismo formato de string para floorMap en ambos extremos. El backend debe exponer el floorMap decodificado (o el string raw) en el DTO para que el frontend pueda usar exactamente los mismos datos. No pre-calcular nada en el servidor que el cliente no pueda replicar.

### J.5. Migraciones con datos existentes

**Riesgo**: agregar `model_code` como NOT NULL en la tabla `rooms` con datos existentes rompería la migración.

**Mitigación**: agregar `model_code` como nullable. Insertar el modelo primero (`exchange_lobby_01`). Actualizar la fila de Main Lobby para apuntarle. Solo hacer NOT NULL si en el futuro se garantiza que todas las salas tendrán modelo.

### J.6. Compatibilidad del fallback frontend

**Riesgo**: si el frontend implementa el nuevo renderer pero el backend aún no devuelve `model`, la sala puede no renderizarse.

**Mitigación**: el fallback a bounding box rectangular debe estar activo mientras `room.model` o `room.floorMap` sea null. Desactivar el fallback solo cuando la migración de backend esté completa y verificada.

---

## K. Roadmap Incremental Recomendado

### FASE 4A (completa)
Backend persistent furniture, blockedTiles desde furniture, GET /api/rooms/{id} con furniture.

---

### FASE 4A.2: Introducir RoomModel Backend (próximo paso recomendado)

Objetivo: crear la tabla `room_models` y la entidad `RoomModelEntity` sin romper nada existente.

Tareas:
- Migración `V5__room_models.sql`: crear tabla, insertar modelo para Main Lobby.
- `RoomModelEntity`, `RoomModelRepository`, `RoomModelDto`.
- Agregar `model_code` nullable en `rooms`.
- `RoomModelService.decodedTiles(model)` retorna lista de tiles con existencia y altura.
- `GET /api/rooms/{id}` agrega `shell` y `spawnDirection` en `RoomDetailDto`.
- Tests: decodificación correcta del floorMap, walkability desde mapa.

Criterio de aceptación:
- `mvn test` pasa.
- `GET /api/rooms/1` devuelve `shell` y `spawnDirection`.
- El frontend puede ignorar estos campos nuevos sin romperse (ningún cambio frontend en esta fase).

---

### FASE 4A.3: Render FloorMap / Walls desde API

Objetivo: el frontend renderiza tiles y paredes desde datos del DTO, no desde código hardcodeado.

Tareas:
- `floorMapDecoder.ts`: decodifica string a `RoomTile[][]`.
- `floorMapRenderer.ts`: renderiza tiles existentes, respeta `floorTheme`.
- `roomShellRenderer.ts`: paredes desde `RoomShellDto` y corners de tiles extremos.
- `RoomScene.ts`: reemplazar `drawFloor()` y `drawRoomShell()` por los nuevos renderers.
- Fallback: si `room.model` es null, usar comportamiento actual.
- `npm run build` pasa.
- Smoke test visual: Main Lobby se ve igual que antes.

---

### FASE 4A.4: Movement Validation con Structural Blockers

Objetivo: backend verifica existencia del tile en el mapa antes de permitir movimiento.

Tareas:
- `RoomLayoutService`: integrar `RoomModelService.decodedTiles`.
- `isExistingTile(model, position)` en `RoomLayoutService`.
- `validateWalkableDestination`: verificar existencia antes de blocked check.
- `BlockedTileDto` con campo `reason` (`STRUCTURAL`, `FURNITURE`).
- Frontend: `tileExists()` consultando floorMap decodificado.
- Frontend: `isInsideRoom` reemplazado por `tileExists`.
- `mvn test` pasa con tests para tile-not-exists rejection.

---

### FASE 4A.5: Main Lobby Composition Pass

Objetivo: la Main Lobby usa el floorMap del backend para definir su forma y composición visual.

Tareas:
- Revisar y ajustar el floorMap de `exchange_lobby_01` para reflejar la composición deseada.
- Zona de recepción marcada como bloqueada estructuralmente (`b`) o como furniture.
- Remover hardcoding de zona de escritorio (4-7, 4-8) de `floorTileFill`.
- Remover `drawTradingWallDecor` o convertirlo en furniture de pared.
- Ajustar colores del piso/pared para que vengan de `floorTheme` / `wallTheme`.
- Smoke test con `trader/trader` y `broker/broker`.

---

### FASE 4B: Inventory Básico

Objetivo: usuarios pueden tener cantidades de furniture en su inventario.

Tareas:
- Migración `V6__user_inventory.sql`.
- `UserInventoryEntity`, `UserInventoryRepository`, `UserInventoryService`.
- `GET /api/me/inventory`.
- Sin UI de inventory todavía.

---

### FASE 4C: Place / Remove Furniture

Objetivo: usuarios con permisos pueden colocar y quitar furniture.

Tareas:
- `POST /api/rooms/{id}/furniture`.
- `DELETE /api/rooms/{id}/furniture/{furnitureId}`.
- Validación contra floorMap (tile existe, tile walkable).
- Validación de permisos (owner, admin).
- WebSocket events: `ROOM_FURNITURE_ADDED`, `ROOM_FURNITURE_REMOVED`.
- Frontend: actualizar sala desde eventos sin reload.

---

### FASE 5: Marketplace Simple

Objetivo: usuarios pueden comprar furniture del catálogo con moneda de juego.

Tareas:
- Sistema de moneda (tokens de exchange educativo).
- Catálogo público visible.
- Compra añade al inventario.
- Sin trading P2P todavía.

---

### FASE 6: Exchange / Order Book

Objetivo: mecánica educativa de trading. Los jugadores pueden poner órdenes de compra/venta de activos del juego.

Tareas:
- Activos de exchange (acciones, tokens, etc., todos ficticios y educativos).
- Order book simple por sala o por objeto interactivo.
- El trading desk / market panel se vuelve interactivo.
- Resultados visibles en la sala y en el chat.

---

## Apéndice: Archivos a Crear / Modificar por Fase

### FASE 4A.2

Backend:
- `V5__room_models.sql` (nueva migración)
- `RoomModelEntity.java`
- `RoomModelRepository.java`
- `RoomModelDto.java`
- `RoomModelService.java`
- `RoomShellDto.java`
- `RoomDetailDto.java` (agregar shell, spawnDirection, modelCode)
- `RoomEntity.java` (agregar modelCode, description, status, floorTheme, wallTheme)
- `RoomController.java` (actualizar mapeo del DTO)
- `RoomStateServiceTest.java` (actualizar tests si el DTO cambia)

Frontend (solo tipos, sin renderizado):
- `frontend/src/types/api.types.ts` (agregar shell, spawnDirection, modelCode en Room)

### FASE 4A.3

Frontend:
- `frontend/src/game/data/floorMapDecoder.ts` (nuevo)
- `frontend/src/game/rendering/floorMapRenderer.ts` (nuevo)
- `frontend/src/game/rendering/roomShellRenderer.ts` (nuevo)
- `frontend/src/game/scenes/RoomScene.ts` (refactorizar drawFloor, drawRoomShell)

### FASE 4A.4

Backend:
- `RoomLayoutService.java` (integrar existencia de tile)
- `PathfindingService.java` (sin cambios si la interface de isWalkable ya es correcta)
- `BlockedTileDto.java` (agregar reason)
- Tests de movement con tile-not-exists

Frontend:
- `frontend/src/game/scenes/RoomScene.ts` (reemplazar isInsideRoom por tileExists)
