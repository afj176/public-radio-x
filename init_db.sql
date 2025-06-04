-- Enable pgcrypto for UUID generation if needed, though SERIAL is used for primary keys here.
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL DEFAULT 'default_user', -- Made default_user the default value
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Favorites Table
-- Stores individual favorite stations for each user.
CREATE TABLE user_favorites (
    favorite_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stationuuid VARCHAR(255) NOT NULL, -- stationuuid from Radio Browser API
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, stationuuid) -- Ensures a user cannot favorite the same station multiple times
);

-- User Station Lists Table
-- Stores metadata for custom lists created by users.
CREATE TABLE user_station_lists (
    list_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    list_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Station List Items Table
-- Stores the stations included in each custom list.
CREATE TABLE station_list_items (
    item_id SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL REFERENCES user_station_lists(list_id) ON DELETE CASCADE,
    stationuuid VARCHAR(255) NOT NULL, -- stationuuid from Radio Browser API
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(list_id, stationuuid) -- Ensures a station cannot be added multiple times to the same list
);

-- Insert a default user for testing purposes
INSERT INTO users (username) VALUES ('default_user_for_testing');

-- Optional: Add some indexes for performance on foreign keys or frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_station_lists_user_id ON user_station_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_station_list_items_list_id ON station_list_items(list_id);

-- Grant permissions (if a specific app user is used, replace 'your_db_user')
-- This step is more for a real deployment scenario.
-- Example:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO your_db_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_favorites TO your_db_user;
-- GRANT USAGE, SELECT ON SEQUENCE user_favorites_favorite_id_seq TO your_db_user;
-- ... and so on for other tables and sequences.

COMMENT ON COLUMN users.username IS 'Username for the user, unique.';
COMMENT ON COLUMN user_favorites.stationuuid IS 'UUID of the favorited radio station from Radio Browser API.';
COMMENT ON TABLE user_station_lists IS 'User-created custom lists of radio stations.';
COMMENT ON COLUMN station_list_items.stationuuid IS 'UUID of the radio station from Radio Browser API added to a custom list.';

SELECT 'Database schema created and default user inserted successfully.' AS status;
