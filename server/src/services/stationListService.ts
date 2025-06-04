import db from '../db';

export interface StationList {
  id: number;
  name: string;
  createdAt: Date;
  stationIds: string[];
}

// Helper function to fetch station UUIDs for a given list_id
const getStationUuidsForList = async (listId: number): Promise<string[]> => {
  try {
    const { rows } = await db.query('SELECT stationuuid FROM station_list_items WHERE list_id = $1', [listId]);
    return rows.map(r => r.stationuuid);
  } catch (error) {
    console.error(`Error fetching station UUIDs for list ${listId}:`, error);
    throw new Error('Database error while fetching station items.');
  }
};

/**
 * Creates a new station list for a user.
 * @param userId The ID of the user.
 * @param listName The name of the list.
 * @returns The newly created station list.
 */
export const createStationList = async (userId: string | number, listName: string): Promise<StationList> => {
  if (!listName || typeof listName !== 'string' || listName.trim() === '') {
    throw new Error('List name is required and must be a non-empty string');
  }
  try {
    const { rows } = await db.query(
      'INSERT INTO user_station_lists (user_id, list_name) VALUES ($1, $2) RETURNING list_id, list_name, created_at',
      [userId, listName.trim()]
    );
    const newList = rows[0];
    return {
      id: newList.list_id,
      name: newList.list_name,
      createdAt: newList.created_at,
      stationIds: [], // New list is initially empty
    };
  } catch (error) {
    console.error(`Database error in createStationList for user ${userId}, listName "${listName}":`, error);
    throw new Error('Database error while creating station list.');
  }
};

/**
 * Gets all station lists for a user.
 * @param userId The ID of the user.
 * @returns An array of station lists with their items.
 */
export const getUserStationLists = async (userId: string | number): Promise<StationList[]> => {
  try {
    const { rows } = await db.query(
      'SELECT list_id, list_name, created_at FROM user_station_lists WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return Promise.all(
      rows.map(async (list) => {
        const stationUuids = await getStationUuidsForList(list.list_id);
        return {
          id: list.list_id,
          name: list.list_name,
          createdAt: list.created_at,
          stationIds: stationUuids,
        };
      })
    );
  } catch (error) {
    // The specific error from getStationUuidsForList will be logged by itself if it occurs.
    console.error(`Database error in getUserStationLists for user ${userId}:`, error);
    throw new Error('Database error while fetching station lists.');
  }
};

/**
 * Gets the details of a specific station list if owned by the user.
 * @param userId The ID of the user.
 * @param listId The ID of the list.
 * @returns The station list details or null if not found/not owned.
 */
export const getStationListDetails = async (userId: string | number, listId: string | number): Promise<StationList | null> => {
  try {
    const { rows } = await db.query(
      'SELECT list_id, list_name, created_at FROM user_station_lists WHERE list_id = $1 AND user_id = $2',
      [listId, userId]
    );
    if (rows.length === 0) {
      return null; // Not found or not owned
    }
    const list = rows[0];
    const stationUuids = await getStationUuidsForList(list.list_id);
    return {
      id: list.list_id,
      name: list.list_name,
      createdAt: list.created_at,
      stationIds: stationUuids,
    };
  } catch (error) {
    console.error(`Database error in getStationListDetails for user ${userId}, list ${listId}:`, error);
    throw new Error('Database error while fetching station list details.');
  }
};

/**
 * Updates the name of a station list if owned by the user.
 * @param userId The ID of the user.
 * @param listId The ID of the list to update.
 * @param newName The new name for the list.
 * @returns The updated station list or null if not found/not owned.
 */
export const updateStationListName = async (
  userId: string | number,
  listId: string | number,
  newName: string
): Promise<StationList | null> => {
  if (!newName || typeof newName !== 'string' || newName.trim() === '') {
    throw new Error('New list name is required and must be a non-empty string');
  }
  try {
    const { rows, rowCount } = await db.query(
      'UPDATE user_station_lists SET list_name = $1 WHERE list_id = $2 AND user_id = $3 RETURNING list_id, list_name, created_at',
      [newName.trim(), listId, userId]
    );
    if (rowCount === 0) {
      return null; // Not found or not owned
    }
    const updatedList = rows[0];
    const stationUuids = await getStationUuidsForList(updatedList.list_id);
    return {
      id: updatedList.list_id,
      name: updatedList.list_name,
      createdAt: updatedList.created_at,
      stationIds: stationUuids,
    };
  } catch (error) {
    console.error(`Database error in updateStationListName for user ${userId}, list ${listId}, newName "${newName}":`, error);
    throw new Error('Database error while updating station list name.');
  }
};

/**
 * Deletes a station list if owned by the user.
 * @param userId The ID of the user.
 * @param listId The ID of the list to delete.
 * @returns True if deletion was successful, false otherwise (not found/not owned).
 */
export const deleteStationList = async (userId: string | number, listId: string | number): Promise<boolean> => {
  try {
    // ON DELETE CASCADE in DB schema should handle items in station_list_items
    const { rowCount } = await db.query(
      'DELETE FROM user_station_lists WHERE list_id = $1 AND user_id = $2',
      [listId, userId]
    );
    return rowCount > 0;
  } catch (error) {
    console.error(`Database error in deleteStationList for user ${userId}, list ${listId}:`, error);
    throw new Error('Database error while deleting station list.');
  }
};

/**
 * Adds a station to a list if the list is owned by the user.
 * @param userId The ID of the user.
 * @param listId The ID of the list.
 * @param stationId The UUID of the station to add.
 * @returns The updated station list or null if the list is not found/not owned.
 */
export const addStationToList = async (
  userId: string | number,
  listId: string | number,
  stationId: string
): Promise<StationList | null> => {
  if (!stationId) {
    throw new Error('stationId (stationuuid) is required');
  }
  try {
    const listCheck = await db.query('SELECT list_id FROM user_station_lists WHERE list_id = $1 AND user_id = $2', [listId, userId]);
    if (listCheck.rowCount === 0) {
      return null; // List not found or not owned by user
    }

    await db.query(
      'INSERT INTO station_list_items (list_id, stationuuid) VALUES ($1, $2) ON CONFLICT (list_id, stationuuid) DO NOTHING',
      [listId, stationId]
    );

    // Fetch and return the updated list details
    return getStationListDetails(userId, listId);
  } catch (error) {
    console.error(`Database error in addStationToList for user ${userId}, list ${listId}, station ${stationId}:`, error);
    throw new Error('Database error while adding station to list.');
  }
};

/**
 * Removes a station from a list if the list is owned by the user.
 * @param userId The ID of the user.
 * @param listId The ID of the list.
 * @param stationId The UUID of the station to remove.
 * @returns An object indicating success and the updated list, or null if list not found/not owned.
 *          The success flag indicates if the station was actually removed (vs. not being in the list).
 */
export const removeStationFromList = async (
  userId: string | number,
  listId: string | number,
  stationId: string
): Promise<{ list: StationList | null; removed: boolean }> => {
  if (!stationId) {
    throw new Error('stationId (stationuuid) for removal is required');
  }
  try {
    const listDetails = await getStationListDetails(userId, listId);
    if (!listDetails) {
      return { list: null, removed: false }; // List not found or not owned
    }

    const deleteResult = await db.query(
      'DELETE FROM station_list_items WHERE list_id = $1 AND stationuuid = $2',
      [listId, stationId]
    );

    // Fetch the potentially updated list details again
    const updatedListDetails = await getStationListDetails(userId, listId);
    return { list: updatedListDetails, removed: deleteResult.rowCount > 0 };

  } catch (error) {
    console.error(`Database error in removeStationFromList for user ${userId}, list ${listId}, station ${stationId}:`, error);
    throw new Error('Database error while removing station from list.');
  }
};
