-- FASE 4A.5: Main Lobby Composition Pass.
-- Gives exchange_lobby_01 an intentional room shape, front entry spawn,
-- waiting zone, exchange desk zone, and persistent system decor.

UPDATE room_models
SET
    floor_map = 'xxxxxxxxxxxx
xxx000000xxx
xx00000000xx
x0000000000x
000000000000
000000000000
000000000000
000000000000
x0000000000x
xx00000000xx
xxx000000xxx
xxxx0000xxxx',
    spawn_x = 6,
    spawn_y = 11,
    spawn_direction = 'north',
    updated_at = now()
WHERE code = 'exchange_lobby_01';

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
        'exchange_reception_desk',
        'Exchange Reception Desk',
        'FLOOR',
        'furniture_exchange_reception_desk',
        '/assets/furniture/exchange_reception_desk.png',
        4,
        1,
        TRUE,
        FALSE,
        FALSE,
        FALSE,
        0,
        'EXCHANGE_DESK',
        FALSE
    ),
    (
        'market_screen',
        'Market Screen',
        'WALL',
        'furniture_market_screen',
        '/assets/furniture/market_screen.png',
        2,
        1,
        FALSE,
        FALSE,
        FALSE,
        FALSE,
        0,
        'DISPLAY',
        FALSE
    ),
    (
        'exchange_wall_sign',
        'Exchange Wall Sign',
        'WALL',
        'furniture_exchange_wall_sign',
        '/assets/furniture/exchange_wall_sign.png',
        3,
        1,
        FALSE,
        FALSE,
        FALSE,
        FALSE,
        0,
        'WALL_DECOR',
        FALSE
    ),
    (
        'office_plant',
        'Office Plant',
        'FLOOR',
        'furniture_office_plant',
        '/assets/furniture/office_plant.png',
        1,
        1,
        TRUE,
        FALSE,
        FALSE,
        FALSE,
        0,
        'DECORATIVE',
        FALSE
    ),
    (
        'floor_lamp',
        'Floor Lamp',
        'FLOOR',
        'furniture_floor_lamp',
        '/assets/furniture/floor_lamp.png',
        1,
        1,
        TRUE,
        FALSE,
        FALSE,
        FALSE,
        0,
        'DECORATIVE',
        FALSE
    ),
    (
        'lobby_bench',
        'Lobby Bench',
        'FLOOR',
        'furniture_lobby_bench',
        '/assets/furniture/lobby_bench.png',
        2,
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
        'exchange_rug',
        'Exchange Entrance Rug',
        'FLOOR',
        'furniture_exchange_rug',
        '/assets/furniture/exchange_rug.png',
        4,
        2,
        FALSE,
        FALSE,
        TRUE,
        FALSE,
        0,
        'DECORATIVE',
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

DELETE FROM room_furniture
WHERE room_id = 1
  AND owner_user_id IS NULL
  AND catalog_item_id IN (
      SELECT id
      FROM furniture_catalog
      WHERE code IN (
          'green_leather_sofa',
          'red_executive_chair',
          'dark_wood_coffee_table',
          'exchange_reception_desk',
          'market_screen',
          'exchange_wall_sign',
          'office_plant',
          'floor_lamp',
          'lobby_bench',
          'exchange_rug'
      )
  );

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 3, 1, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'market_screen'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 6, 1, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'exchange_wall_sign'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 4, 2, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'exchange_reception_desk'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 2, 3, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'office_plant'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 8, 5, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'red_executive_chair'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 2, 6, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'green_leather_sofa'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 9, 6, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'floor_lamp'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 5, 7, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'dark_wood_coffee_table'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 3, 8, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'lobby_bench'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;

INSERT INTO room_furniture (room_id, catalog_item_id, owner_user_id, x, y, z, rotation, state)
SELECT 1, id, NULL, 4, 10, 0, 'SE', '{}'
FROM furniture_catalog
WHERE code = 'exchange_rug'
ON CONFLICT ON CONSTRAINT uk_room_furniture_room_catalog_position DO NOTHING;
