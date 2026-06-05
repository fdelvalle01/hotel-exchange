CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0 AND width <= 64),
    height INTEGER NOT NULL CHECK (height > 0 AND height <= 64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE room_sessions (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    disconnected_at TIMESTAMPTZ,
    last_x INTEGER NOT NULL DEFAULT 1,
    last_y INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message VARCHAR(240) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_room_created_at ON chat_messages(room_id, created_at);
CREATE INDEX idx_room_sessions_room_connected_at ON room_sessions(room_id, connected_at);

INSERT INTO rooms (id, name, width, height)
VALUES (1, 'Main Lobby', 12, 12)
ON CONFLICT (id) DO NOTHING;

SELECT setval('rooms_id_seq', (SELECT COALESCE(MAX(id), 1) FROM rooms));
