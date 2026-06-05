CREATE TABLE user_room_state (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    x INTEGER NOT NULL DEFAULT 1,
    y INTEGER NOT NULL DEFAULT 1,
    direction VARCHAR(16) NOT NULL DEFAULT 'south',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_user_room_state_user_room UNIQUE (user_id, room_id)
);

CREATE INDEX idx_user_room_state_room_id ON user_room_state(room_id);
CREATE INDEX idx_user_room_state_user_id ON user_room_state(user_id);
