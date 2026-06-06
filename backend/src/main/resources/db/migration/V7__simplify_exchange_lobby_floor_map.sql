-- Simplify exchange_lobby_01 octagon from 3-cut corners to 1-cut corners.
-- The 3-cut staircase produced multiple stacked SW-face ledges on each corner,
-- visually appearing as separate platform levels. With 1-cut, only the 4 exact
-- corner tiles are void, giving a single clean floor surface.
UPDATE room_models
SET
    floor_map    = 'x0000000000x
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
x0000000000x',
    spawn_x      = 5,
    spawn_y      = 5,
    updated_at   = now()
WHERE code = 'exchange_lobby_01';
