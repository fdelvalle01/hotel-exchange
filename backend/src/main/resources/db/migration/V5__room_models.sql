CREATE TABLE room_models (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(80)  NOT NULL UNIQUE,
    name          VARCHAR(120) NOT NULL,
    width         INTEGER      NOT NULL CHECK (width > 0 AND width <= 64),
    height        INTEGER      NOT NULL CHECK (height > 0 AND height <= 64),
    floor_map     TEXT         NOT NULL,
    wall_mode     VARCHAR(40)  NOT NULL DEFAULT 'STANDARD',
    wall_height   INTEGER      NOT NULL DEFAULT 3,
    spawn_x       INTEGER      NOT NULL DEFAULT 1,
    spawn_y       INTEGER      NOT NULL DEFAULT 1,
    spawn_direction VARCHAR(8) NOT NULL DEFAULT 'S',
    theme         VARCHAR(40)  NOT NULL DEFAULT 'DEFAULT',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO room_models (code, name, width, height, floor_map, wall_mode, wall_height, spawn_x, spawn_y, spawn_direction, theme)
VALUES (
    'exchange_lobby_01',
    'Exchange Lobby Standard',
    12,
    12,
    '000000000000
000000000000
000000000000
000000000000
000000000000
000000000000
000000000000
000000000000
000000000000
000000000000
000000000000
000000000000',
    'STANDARD',
    3,
    1,
    1,
    'S',
    'EXCHANGE'
);

ALTER TABLE rooms
    ADD COLUMN model_code   VARCHAR(80)  NULL REFERENCES room_models(code),
    ADD COLUMN description  VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN status       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN floor_theme  VARCHAR(40)  NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN wall_theme   VARCHAR(40)  NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now();

UPDATE rooms SET model_code = 'exchange_lobby_01' WHERE id = 1;
