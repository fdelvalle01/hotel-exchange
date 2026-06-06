CREATE TABLE furniture_catalog (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(40) NOT NULL,
    sprite_key VARCHAR(120) NOT NULL,
    sprite_path VARCHAR(255) NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    blocks_movement BOOLEAN NOT NULL DEFAULT TRUE,
    can_sit BOOLEAN NOT NULL DEFAULT FALSE,
    can_walk BOOLEAN NOT NULL DEFAULT FALSE,
    can_stack BOOLEAN NOT NULL DEFAULT FALSE,
    default_z NUMERIC(8,3) NOT NULL DEFAULT 0,
    interaction_type VARCHAR(40) NOT NULL DEFAULT 'NONE',
    tradeable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE room_furniture (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    catalog_item_id BIGINT NOT NULL REFERENCES furniture_catalog(id),
    owner_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    z NUMERIC(8,3) NOT NULL DEFAULT 0,
    rotation VARCHAR(8) NOT NULL,
    state TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_room_furniture_room_catalog_position UNIQUE (room_id, catalog_item_id, x, y, z, rotation)
);

CREATE INDEX idx_room_furniture_room_id ON room_furniture(room_id);
CREATE INDEX idx_room_furniture_owner_user_id ON room_furniture(owner_user_id);
CREATE INDEX idx_room_furniture_catalog_item_id ON room_furniture(catalog_item_id);

DELETE FROM room_blocked_tiles
WHERE room_id = 1
  AND reason = 'phase_3_layout';

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
VALUES
    (
        'green_leather_sofa',
        '120px Classic Lounge Sofa',
        'FLOOR',
        'furniture_green_leather_sofa',
        '/assets/furniture/green_leather_sofa.png',
        3,
        1,
        TRUE,
        TRUE,
        FALSE,
        FALSE,
        0,
        'SEAT',
        FALSE
    ),
    (
        'red_executive_chair',
        'Red Executive Chair',
        'FLOOR',
        'furniture_red_executive_chair',
        '/assets/furniture/red_executive_chair.png',
        1,
        1,
        TRUE,
        TRUE,
        FALSE,
        FALSE,
        0,
        'SEAT',
        FALSE
    ),
    (
        'dark_wood_coffee_table',
        'Dark Wood Coffee Table',
        'FLOOR',
        'furniture_dark_wood_coffee_table',
        '/assets/furniture/dark_wood_coffee_table.png',
        2,
        2,
        TRUE,
        FALSE,
        FALSE,
        FALSE,
        0,
        'EXCHANGE_DESK',
        FALSE
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

INSERT INTO room_furniture (
    room_id,
    catalog_item_id,
    owner_user_id,
    x,
    y,
    z,
    rotation,
    state
)
SELECT 1, id, NULL, 2, 7, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'green_leather_sofa'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (
    room_id,
    catalog_item_id,
    owner_user_id,
    x,
    y,
    z,
    rotation,
    state
)
SELECT 1, id, NULL, 7, 5, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'red_executive_chair'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (
    room_id,
    catalog_item_id,
    owner_user_id,
    x,
    y,
    z,
    rotation,
    state
)
SELECT 1, id, NULL, 5, 6, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'dark_wood_coffee_table'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;
