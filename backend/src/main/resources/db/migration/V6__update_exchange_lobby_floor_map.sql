-- Reshape exchange_lobby_01 from 12x12 rectangle to an octagon (corners cut with x).
-- Demonstrates void tiles and exposes the per-tile geometry rendering.
-- Spawn moved from (1,1) — which is now void — to (5,5) in the solid interior.
UPDATE room_models
SET
    floor_map    = 'xxx000000xxx
xx00000000xx
x0000000000x
000000000000
000000000000
000000000000
000000000000
000000000000
000000000000
x0000000000x
xx00000000xx
xxx000000xxx',
    spawn_x      = 5,
    spawn_y      = 5,
    updated_at   = now()
WHERE code = 'exchange_lobby_01';
