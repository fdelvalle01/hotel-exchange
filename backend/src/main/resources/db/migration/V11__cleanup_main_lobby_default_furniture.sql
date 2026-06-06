-- Remove all system-placed (owner_user_id IS NULL) furniture from Main Lobby.
-- Furniture catalog entries and sprite assets are preserved.
-- The room will be empty until users place furniture from their inventory.
DELETE FROM room_furniture
WHERE room_id = 1
  AND owner_user_id IS NULL;
