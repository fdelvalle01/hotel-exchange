-- FASE 4A.6: Furniture Catalog Mapping, Cleanup & Depth Fix.
-- Keep Main Lobby visually focused on the three first-party sprite furniture items.

UPDATE furniture_catalog
SET
    width = 3,
    height = 1,
    blocks_movement = TRUE,
    can_sit = TRUE,
    updated_at = now()
WHERE code = 'green_leather_sofa';

UPDATE furniture_catalog
SET
    width = 2,
    height = 2,
    blocks_movement = TRUE,
    can_sit = FALSE,
    updated_at = now()
WHERE code = 'dark_wood_coffee_table';

UPDATE furniture_catalog
SET
    width = 1,
    height = 1,
    blocks_movement = TRUE,
    can_sit = TRUE,
    updated_at = now()
WHERE code = 'red_executive_chair';

DELETE FROM room_furniture
WHERE room_id = 1
  AND owner_user_id IS NULL
  AND catalog_item_id IN (
      SELECT id
      FROM furniture_catalog
      WHERE code IN (
          'exchange_reception_desk',
          'market_screen',
          'exchange_wall_sign',
          'office_plant',
          'floor_lamp',
          'lobby_bench',
          'exchange_rug'
      )
  );

UPDATE room_furniture room_item
SET
    x = CASE catalog.code
        WHEN 'green_leather_sofa' THEN 2
        WHEN 'dark_wood_coffee_table' THEN 5
        WHEN 'red_executive_chair' THEN 8
        ELSE room_item.x
    END,
    y = CASE catalog.code
        WHEN 'green_leather_sofa' THEN 6
        WHEN 'dark_wood_coffee_table' THEN 7
        WHEN 'red_executive_chair' THEN 5
        ELSE room_item.y
    END,
    rotation = 'SE',
    updated_at = now()
FROM furniture_catalog catalog
WHERE room_item.catalog_item_id = catalog.id
  AND room_item.room_id = 1
  AND room_item.owner_user_id IS NULL
  AND catalog.code IN (
      'green_leather_sofa',
      'dark_wood_coffee_table',
      'red_executive_chair'
  );
