import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth/authService';
import db from '../db'; // Import the database connection module

const router = Router();

// Apply verifyToken middleware to all routes in this file
router.use(verifyToken);

// GET /api/me/favorites - Returns the list of favorite station UUIDs for the authenticated user.
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    // This case should ideally not be reached if verifyToken middleware is effective
    // and throws an error or ends the request for unauthenticated users.
    return res.status(401).json({ message: 'Authentication required. User ID not found after token verification.' });
  }

  try {
    const { rows } = await db.query('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [userId]);
    const stationUuids = rows.map(row => row.stationuuid);
    res.json(stationUuids);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Error fetching favorites from database' });
  }
});

// POST /api/me/favorites - Adds a station UUID to the authenticated user's list of favorites.
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { stationId: stationuuid } = req.body; // stationId from client is stationuuid

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required. User ID not found after token verification.' });
  }
  if (!stationuuid) {
    return res.status(400).json({ message: 'stationId (stationuuid) is required in the body' });
  }

  try {
    await db.query(
      'INSERT INTO user_favorites (user_id, stationuuid) VALUES ($1, $2) ON CONFLICT (user_id, stationuuid) DO NOTHING',
      [userId, stationuuid]
    );

    const currentFavorites = await db.query('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [userId]);
    const stationUuids = currentFavorites.rows.map(row => row.stationuuid);
    res.status(200).json(stationUuids);

  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ message: 'Error adding favorite to database' });
  }
});

// DELETE /api/me/favorites/:stationId - Removes a station UUID from favorites.
router.delete('/:stationId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const stationuuidToDelete = req.params.stationId;

  if (!userId) {
   return res.status(401).json({ message: 'Authentication required. User ID not found after token verification.' });
  }
  if (!stationuuidToDelete) {
    return res.status(400).json({ message: 'Station UUID parameter is required.' });
  }

  try {
    const result = await db.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND stationuuid = $2 RETURNING stationuuid',
      [userId, stationuuidToDelete]
    );

    if (result.rowCount > 0) {
      const currentFavorites = await db.query('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [userId]);
      res.json(currentFavorites.rows.map(row => row.stationuuid));
    } else {
      const currentFavorites = await db.query('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [userId]);
      res.status(404).json({ message: 'Station UUID not found in favorites for this user.', favorites: currentFavorites.rows.map(row => row.stationuuid) });
    }
  } catch (error) {
    console.error('Error deleting favorite:', error);
    res.status(500).json({ message: 'Error deleting favorite from database' });
  }
});

export default router;
