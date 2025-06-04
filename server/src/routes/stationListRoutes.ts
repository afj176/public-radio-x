import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth/authService';
import db from '../db'; // Import the database connection module

const router = Router();

// Apply verifyToken middleware to all routes in this file
// router.use(verifyToken); // Temporarily commented out for testing with TEMP_USER_ID
                          // In a real scenario, ensure verifyToken populates req.user.id

// Placeholder for actual user ID.
const TEMP_USER_ID = 1;

// Helper function to fetch station UUIDs for a given list_id
const getStationUuidsForList = async (listId: number): Promise<string[]> => {
  const { rows } = await db.query('SELECT stationuuid FROM station_list_items WHERE list_id = $1', [listId]);
  return rows.map(r => r.stationuuid);
};

// --- CRUD for Lists ---

// POST /api/me/lists - Create a new station list
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID;
  const { name } = req.body;

  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'List name is required and must be a non-empty string' });
  }

  try {
    const { rows } = await db.query(
      'INSERT INTO user_station_lists (user_id, list_name) VALUES ($1, $2) RETURNING list_id, list_name, created_at',
      [userId, name.trim()]
    );
    const newList = rows[0];
    res.status(201).json({
      id: newList.list_id,
      name: newList.list_name,
      createdAt: newList.created_at,
      stationIds: [], // New list is empty
    });
  } catch (error) {
    console.error('Error creating station list:', error);
    res.status(500).json({ message: 'Error creating station list' });
  }
});

// GET /api/me/lists - Get all station lists for the authenticated user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID;
  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });

  try {
    const { rows } = await db.query('SELECT list_id, list_name, created_at FROM user_station_lists WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const listsWithItems = await Promise.all(
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
    res.json(listsWithItems);
  } catch (error) {
    console.error('Error fetching station lists:', error);
    res.status(500).json({ message: 'Error fetching station lists' });
  }
});

// GET /api/me/lists/:listId - Get a specific station list owned by the user
router.get('/:listId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID;
  const { listId } = req.params;
  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });

  try {
    const { rows } = await db.query(
      'SELECT list_id, list_name, created_at FROM user_station_lists WHERE list_id = $1 AND user_id = $2',
      [listId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Station list not found or not owned by user' });
    }
    const list = rows[0];
    const stationUuids = await getStationUuidsForList(list.list_id);
    res.json({
      id: list.list_id,
      name: list.list_name,
      createdAt: list.created_at,
      stationIds: stationUuids,
    });
  } catch (error) {
    console.error('Error fetching specific station list:', error);
    res.status(500).json({ message: 'Error fetching station list' });
  }
});

// PUT /api/me/lists/:listId - Update the name of a station list owned by the user
router.put('/:listId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID;
  const { listId } = req.params;
  const { name } = req.body;

  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'New list name is required' });
  }

  try {
    const { rows, rowCount } = await db.query(
      'UPDATE user_station_lists SET list_name = $1 WHERE list_id = $2 AND user_id = $3 RETURNING list_id, list_name, created_at',
      [name.trim(), listId, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Station list not found or not owned by user' });
    }
    const updatedList = rows[0];
    const stationUuids = await getStationUuidsForList(updatedList.list_id);
    res.json({
      id: updatedList.list_id,
      name: updatedList.list_name,
      createdAt: updatedList.created_at,
      stationIds: stationUuids,
    });
  } catch (error) {
    console.error('Error updating station list:', error);
    res.status(500).json({ message: 'Error updating station list' });
  }
});

// DELETE /api/me/lists/:listId - Delete a station list owned by the user
router.delete('/:listId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID;
  const { listId } = req.params;
  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });

  try {
    // ON DELETE CASCADE in DB schema will handle items in station_list_items
    const { rowCount } = await db.query(
      'DELETE FROM user_station_lists WHERE list_id = $1 AND user_id = $2',
      [listId, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Station list not found or not owned by user' });
    }
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting station list:', error);
    res.status(500).json({ message: 'Error deleting station list' });
  }
});

// --- Managing Stations within a List ---

// POST /api/me/lists/:listId/stations - Add a station to a specific list
router.post('/:listId/stations', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID;
  const { listId } = req.params;
  const { stationId: stationuuid } = req.body; // stationId from client is stationuuid

  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });
  if (!stationuuid) return res.status(400).json({ message: 'stationId (stationuuid) is required' });

  try {
    // First, verify the list exists and belongs to the user
    const listCheck = await db.query('SELECT list_id FROM user_station_lists WHERE list_id = $1 AND user_id = $2', [listId, userId]);
    if (listCheck.rowCount === 0) {
      return res.status(404).json({ message: 'Station list not found or not owned by user' });
    }

    // Add station to the list, ON CONFLICT DO NOTHING handles duplicates
    await db.query(
      'INSERT INTO station_list_items (list_id, stationuuid) VALUES ($1, $2) ON CONFLICT (list_id, stationuuid) DO NOTHING',
      [listId, stationuuid]
    );

    // Fetch and return the updated list
    const { rows: updatedListInfo } = await db.query('SELECT list_id, list_name, created_at FROM user_station_lists WHERE list_id = $1', [listId]);
    const stationUuids = await getStationUuidsForList(parseInt(listId, 10));
    res.status(200).json({ // 200 or 201 depending on if created, 200 is fine for "state updated"
      id: updatedListInfo[0].list_id,
      name: updatedListInfo[0].list_name,
      createdAt: updatedListInfo[0].created_at,
      stationIds: stationUuids,
    });
  } catch (error) {
    console.error('Error adding station to list:', error);
    res.status(500).json({ message: 'Error adding station to list' });
  }
});

// DELETE /api/me/lists/:listId/stations/:stationId - Remove a station from a specific list
router.delete('/:listId/stations/:stationId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID;
  const { listId } = req.params;
  const stationuuidToDelete = req.params.stationId; // stationId from URL is stationuuid

  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });

  try {
    // First, verify the list exists and belongs to the user (optional, but good practice)
    const listCheck = await db.query('SELECT list_id FROM user_station_lists WHERE list_id = $1 AND user_id = $2', [listId, userId]);
    if (listCheck.rowCount === 0) {
      return res.status(404).json({ message: 'Station list not found or not owned by user, or station not in list' });
    }

    const deleteResult = await db.query(
      'DELETE FROM station_list_items WHERE list_id = $1 AND stationuuid = $2',
      [listId, stationuuidToDelete]
    );

    // Fetch and return the updated list
    const { rows: updatedListInfo } = await db.query('SELECT list_id, list_name, created_at FROM user_station_lists WHERE list_id = $1', [listId]);
    const stationUuids = await getStationUuidsForList(parseInt(listId, 10));

    if (deleteResult.rowCount === 0) {
      // Station was not in the list, but still return current list state
       return res.status(404).json({
        message: 'Station not found in this list.',
        list: {
            id: updatedListInfo[0].list_id,
            name: updatedListInfo[0].list_name,
            createdAt: updatedListInfo[0].created_at,
            stationIds: stationUuids,
        }
      });
    }

    res.json({
      id: updatedListInfo[0].list_id,
      name: updatedListInfo[0].list_name,
      createdAt: updatedListInfo[0].created_at,
      stationIds: stationUuids,
    });

  } catch (error) {
    console.error('Error removing station from list:', error);
    res.status(500).json({ message: 'Error removing station from list' });
  }
});

export default router;
