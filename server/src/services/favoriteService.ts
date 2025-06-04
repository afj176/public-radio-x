import db from '../db';

/**
 * Fetches all favorite station UUIDs for a user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of station UUIDs.
 */
export const getFavorites = async (userId: string): Promise<string[]> => {
  try {
    const { rows } = await db.query('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [userId]);
    return rows.map(row => row.stationuuid);
  } catch (error) {
    console.error(`Database error in getFavorites for user ${userId}:`, error);
    throw new Error('Database error while fetching favorites.');
  }
};

/**
 * Adds a station to favorites and returns the updated list.
 * Handles potential conflicts (e.g., station already favorited).
 * @param userId The ID of the user.
 * @param stationId The UUID of the station to add.
 * @returns A promise that resolves to the updated array of station UUIDs.
 */
export const addFavorite = async (userId: string, stationId: string): Promise<string[]> => {
  if (!stationId) {
    throw new Error('stationId is required.'); // Basic validation, can be enhanced
  }
  try {
    await db.query(
      'INSERT INTO user_favorites (user_id, stationuuid) VALUES ($1, $2) ON CONFLICT (user_id, stationuuid) DO NOTHING',
      [userId, stationId]
    );
    // After adding (or if it already existed), fetch the current list of favorites for the user
    return getFavorites(userId);
  } catch (error) {
    console.error(`Database error in addFavorite for user ${userId}, station ${stationId}:`, error);
    throw new Error('Database error while adding favorite.');
  }
};

/**
 * Removes a station from favorites.
 * @param userId The ID of the user.
 * @param stationId The UUID of the station to remove.
 * @returns A promise that resolves to an object containing the updated list and a success flag.
 */
export const removeFavorite = async (
  userId: string,
  stationId: string
): Promise<{ updatedFavorites: string[]; success: boolean }> => {
  if (!stationId) {
    throw new Error('stationId is required for removal.'); // Basic validation
  }
  try {
    const result = await db.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND stationuuid = $2 RETURNING stationuuid',
      [userId, stationId]
    );

    const updatedFavorites = await getFavorites(userId);

    if (result.rowCount > 0) {
      return { updatedFavorites, success: true };
    } else {
      // Station was not found in favorites, so no deletion occurred
      return { updatedFavorites, success: false };
    }
  } catch (error) {
    console.error(`Database error in removeFavorite for user ${userId}, station ${stationId}:`, error);
    throw new Error('Database error while deleting favorite.');
  }
};
