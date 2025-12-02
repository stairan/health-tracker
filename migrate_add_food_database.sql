-- Migration: Add food database feature
-- This migration creates a food_database table and migrates existing food entries

-- Step 1: Create food_database table
CREATE TABLE IF NOT EXISTS food_database (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    serving_size VARCHAR,
    calories INTEGER,
    protein_grams FLOAT,
    carbs_grams FLOAT,
    fat_grams FLOAT,
    is_drink BOOLEAN DEFAULT 0,
    volume_ml INTEGER,
    times_logged INTEGER DEFAULT 0,
    last_used DATETIME,
    is_favorite BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create index on user_id and name for faster lookups
CREATE INDEX IF NOT EXISTS idx_food_database_user_id ON food_database(user_id);
CREATE INDEX IF NOT EXISTS idx_food_database_name ON food_database(name);

-- Step 2: Migrate existing food entries to food_database
-- Group by description and nutritional info to find unique foods
INSERT INTO food_database (user_id, name, calories, protein_grams, carbs_grams, fat_grams, is_drink, volume_ml, times_logged, last_used, created_at)
SELECT
    user_id,
    description as name,
    calories,
    protein_grams,
    carbs_grams,
    fat_grams,
    is_drink,
    volume_ml,
    COUNT(*) as times_logged,
    MAX(time) as last_used,
    MIN(created_at) as created_at
FROM food_entries
GROUP BY
    user_id,
    LOWER(description),  -- Case-insensitive grouping
    calories,
    protein_grams,
    carbs_grams,
    fat_grams,
    is_drink,
    volume_ml
HAVING description IS NOT NULL AND description != '';

-- Step 3: Add food_database_id column to food_entries
ALTER TABLE food_entries ADD COLUMN food_database_id INTEGER REFERENCES food_database(id);

-- Step 4: Update food_entries to link to food_database
-- Match by user_id, description (case-insensitive), and nutritional values
UPDATE food_entries
SET food_database_id = (
    SELECT fd.id
    FROM food_database fd
    WHERE fd.user_id = food_entries.user_id
        AND LOWER(fd.name) = LOWER(food_entries.description)
        AND (fd.calories = food_entries.calories OR (fd.calories IS NULL AND food_entries.calories IS NULL))
        AND (fd.protein_grams = food_entries.protein_grams OR (fd.protein_grams IS NULL AND food_entries.protein_grams IS NULL))
        AND (fd.carbs_grams = food_entries.carbs_grams OR (fd.carbs_grams IS NULL AND food_entries.carbs_grams IS NULL))
        AND (fd.fat_grams = food_entries.fat_grams OR (fd.fat_grams IS NULL AND food_entries.fat_grams IS NULL))
        AND (fd.is_drink = food_entries.is_drink OR (fd.is_drink IS NULL AND food_entries.is_drink IS NULL))
        AND (fd.volume_ml = food_entries.volume_ml OR (fd.volume_ml IS NULL AND food_entries.volume_ml IS NULL))
    LIMIT 1
);

-- Step 5: Verify migration
SELECT
    'Migration complete!' as status,
    (SELECT COUNT(*) FROM food_database) as food_database_count,
    (SELECT COUNT(*) FROM food_entries WHERE food_database_id IS NOT NULL) as linked_entries,
    (SELECT COUNT(*) FROM food_entries WHERE food_database_id IS NULL) as unlinked_entries;
