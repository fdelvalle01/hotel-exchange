ALTER TABLE rooms
    ADD COLUMN spawn_x INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN spawn_y INTEGER NOT NULL DEFAULT 1;

CREATE TABLE room_blocked_tiles (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    reason VARCHAR(80) NOT NULL DEFAULT 'layout',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_room_blocked_tiles_room_xy UNIQUE (room_id, x, y)
);

CREATE INDEX idx_room_blocked_tiles_room_id ON room_blocked_tiles(room_id);

UPDATE rooms
SET spawn_x = 1,
    spawn_y = 1
WHERE id = 1;

INSERT INTO room_blocked_tiles (room_id, x, y, reason)
VALUES
    (1, 5, 5, 'phase_3_layout'),
    (1, 6, 5, 'phase_3_layout'),
    (1, 5, 6, 'phase_3_layout')
ON CONFLICT (room_id, x, y) DO NOTHING;
