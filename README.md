# Hotel Exchange

Hotel Exchange is a modern Habbo-like web game built from scratch with a clean monorepo structure. The current build includes login, lobby, an isometric Phaser room, multiplayer presence, persisted avatar positions, realtime tile-by-tile movement, backend-calculated blocked room tiles, persistent room furniture, chat bubbles, REST APIs, WebSocket room events, PostgreSQL, and Docker Compose.

## Stack

- Frontend: React, TypeScript, Vite
- Visual engine: Phaser.js
- Backend: Java 21, Spring Boot 3.x
- Realtime: WebSocket
- Database: PostgreSQL with Flyway migrations
- Security: JWT, BCrypt, input validation, CORS from config
- Containers: Docker Compose

## Structure

```text
hotel-exchange/
  backend/
  frontend/
    public/assets/furniture/
  docs/
  docker-compose.yml
  README.md
```

## Architecture Notes

- [Room And Furniture Architecture](docs/ROOM_FURNITURE_ARCHITECTURE.md)

## Asset Policy

Furniture sprites are loaded from `frontend/public/assets/furniture/`. Persistent furniture definitions are seeded in PostgreSQL through Flyway, while `frontend/src/game/data/furnitureCatalog.ts` currently keeps render metadata and fallback behavior for Phaser.

Do not commit copyrighted Habbo/Sulake assets or third-party fan archive assets unless you have explicit redistribution rights. Temporary reference sprites may be tested locally for private prototyping, but public repositories, demos, and portfolio builds should use original Hotel Exchange art or properly licensed assets.

To add an owned/licensed furniture PNG:

1. Place the PNG in `frontend/public/assets/furniture/`.
2. Add or update its persistent catalog seed in a Flyway migration.
3. Add or update its render metadata in `frontend/src/game/data/furnitureCatalog.ts`.
4. Add a `room_furniture` row through migration or future editing API.
5. Keep `width`, `height`, `originX`, `originY`, and `depthOffset` aligned with the sprite's isometric footprint.

If a PNG is missing, the room falls back to Phaser-drawn placeholder furniture instead of crashing.

## Run With Docker Compose

From `hotel-exchange/`:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- PostgreSQL: `localhost:5433` on the host, `postgres:5432` inside Compose

Test users:

- `trader` / `trader`
- `broker` / `broker`

## Run Locally Without Docker

Start PostgreSQL with database/user/password matching `backend/.env.example`, then:

```bash
cd backend
mvn spring-boot:run
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Backend example: [backend/.env.example](backend/.env.example)

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION_MINUTES`
- `CORS_ALLOWED_ORIGINS`
- `WS_MAX_PAYLOAD_BYTES`
- `CHAT_MAX_LENGTH`
- `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`
- `LOGIN_RATE_LIMIT_WINDOW_MINUTES`
- `APP_SEED_USERNAME`
- `APP_SEED_PASSWORD`
- `APP_SEED_SECOND_USERNAME`
- `APP_SEED_SECOND_PASSWORD`

Frontend example: [frontend/.env.example](frontend/.env.example)

- `VITE_API_BASE_URL`
- `VITE_WS_BASE_URL`

## REST Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | No | Login with username/password and receive JWT |
| `GET` | `/api/me` | Yes | Current authenticated user |
| `GET` | `/api/me/inventory` | Yes | Current user's furniture inventory |
| `GET` | `/api/rooms` | Yes | List available rooms |
| `GET` | `/api/rooms/{roomId}` | Yes | Get room detail |

Inventory response example:

```json
{
  "items": [
    {
      "id": 1,
      "catalogItemId": 1,
      "code": "green_leather_sofa",
      "name": "Green Leather Sofa",
      "type": "FLOOR",
      "spriteKey": "furniture_green_leather_sofa",
      "spritePath": "/assets/furniture/green_leather_sofa.png",
      "width": 3,
      "height": 1,
      "quantity": 1,
      "canSit": true,
      "canWalk": false,
      "canStack": false,
      "blocksMovement": true,
      "interactionType": "SEAT",
      "tradeable": false
    }
  ]
}
```

## WebSocket

Endpoint:

```text
ws://localhost:8080/ws/rooms/{roomId}?token={jwt}
```

Client events:

- `ROOM_JOIN`
- `ROOM_LEAVE`
- `USER_MOVED` with payload `{ "x": number, "y": number }`
- `CHAT_MESSAGE` with payload `{ "message": string }`

Server events:

- `ROOM_JOIN`
- `ROOM_LEAVE`
- `USER_MOVED`
- `CHAT_MESSAGE`
- `PRESENCE_UPDATE`
- `ERROR`

Presence payload:

```json
{
  "users": [
    {
      "userId": 1,
      "username": "trader",
      "displayName": "trader",
      "x": 1,
      "y": 1,
      "direction": "south",
      "joinedAt": "2026-06-05T19:00:00Z"
    }
  ]
}
```

Room detail includes layout fields:

```json
{
  "id": 1,
  "name": "Main Lobby",
  "width": 12,
  "height": 12,
  "spawnX": 1,
  "spawnY": 1,
  "blockedTiles": [{ "x": 7, "y": 5 }],
  "furniture": [
    {
      "id": 2,
      "catalogCode": "red_executive_chair",
      "name": "Red Executive Chair",
      "spriteKey": "furniture_red_executive_chair",
      "spritePath": "/assets/furniture/red_executive_chair.png",
      "x": 7,
      "y": 5,
      "z": 0,
      "rotation": "SE",
      "width": 1,
      "height": 1,
      "blocksMovement": true,
      "interactionType": "SEAT",
      "state": {}
    }
  ],
  "onlineCount": 2
}
```

Movement payload:

```json
{
  "x": 4,
  "y": 5,
  "direction": "south_west",
  "path": [
    { "x": 2, "y": 1 },
    { "x": 3, "y": 1 },
    { "x": 4, "y": 1 }
  ]
}
```

Server validation:

- JWT is required during WebSocket connection.
- `roomId` must exist.
- Movement coordinates must remain inside the room grid.
- Movement destination must be walkable and not blocked by room layout or persistent furniture.
- Furniture blocked tiles are recalculated by the backend from `room_furniture`; the frontend does not decide authoritative blockers.
- Chat messages must not be empty.
- Chat messages are limited by `CHAT_MAX_LENGTH`.
- Payload size is limited by `WS_MAX_PAYLOAD_BYTES`.

## Current Result

With Docker Compose running, you can log in as `trader/trader` and `broker/broker` in two browser sessions, enter `Main Lobby`, see backend-persisted furniture, see both avatars, walk tile by tile in realtime, avoid blocked furniture tiles, send chat messages, see temporary chat bubbles, and return to the last saved room position after reconnecting.

## Roadmap

- Phase 2: Durable multiplayer positions, room session persistence, stronger room state snapshots. Completed basic version.
- Phase 3: Habbo-style base room gameplay with pathfinding, blocked tiles, layered rendering, walking avatars, and improved bubbles. Completed basic version.
- Phase 4: Backend persistent furniture foundation and basic user inventory are implemented. Furniture placement/removal UI and room layout editing are still future work.
- Phase 5: Marketplace/economy.
- Phase 6: Keycloak integration and production identity migration.
- Phase 7: Moderation, audit logs, observability, and horizontal WebSocket scaling.

## Technical Memory

The project memory is maintained at [docs/AI_MEMORY.md](docs/AI_MEMORY.md). Update it after every meaningful implementation step.
