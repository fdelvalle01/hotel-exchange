CREATE TABLE user_inventory (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catalog_item_id BIGINT NOT NULL REFERENCES furniture_catalog(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    source VARCHAR(40) NOT NULL DEFAULT 'SEED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_user_inventory_user_catalog UNIQUE (user_id, catalog_item_id)
);

CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_catalog_item_id ON user_inventory(catalog_item_id);

WITH seed_items(username, code, quantity) AS (
    VALUES
        ('trader', 'green_leather_sofa', 1),
        ('trader', 'dark_wood_coffee_table', 1),
        ('trader', 'red_executive_chair', 1),
        ('broker', 'dark_wood_coffee_table', 1),
        ('broker', 'red_executive_chair', 1)
)
INSERT INTO user_inventory (user_id, catalog_item_id, quantity, source)
SELECT users.id, furniture_catalog.id, seed_items.quantity, 'SEED'
FROM seed_items
JOIN users ON users.username = seed_items.username
JOIN furniture_catalog ON furniture_catalog.code = seed_items.code
ON CONFLICT ON CONSTRAINT uk_user_inventory_user_catalog DO UPDATE SET
    quantity = GREATEST(user_inventory.quantity, EXCLUDED.quantity),
    updated_at = now();
