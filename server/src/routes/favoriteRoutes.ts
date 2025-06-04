import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth/authService';
import db from '../db'; // Import the database connection module

const router = Router();

// Apply verifyToken middleware to all routes in this file
// router.use(verifyToken); // Temporarily commented out for testing with TEMP_USER_ID
                          // In a real scenario, ensure verifyToken populates req.user.id

// Placeholder for actual user ID.
// For this subtask, we're using a hardcoded ID for the 'default_user_for_testing'.
// This would typically come from req.user.id set by verifyToken.
const TEMP_USER_ID = 1;

// GET /api/me/favorites - Returns the list of favorite station UUIDs for the authenticated user.
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID; // Use authenticated user or fallback to TEMP_USER_ID

  if (!userId) {
    // This case should ideally be handled by verifyToken middleware ensuring req.user.id exists
    return res.status(401).json({ message: 'Authentication required. User ID not found.' });
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
  const userId = req.user?.id || TEMP_USER_ID; // Use authenticated user or fallback to TEMP_USER_ID
  const { stationId: stationuuid } = req.body; // stationId from client is stationuuid

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required. User ID not found.' });
  }
  if (!stationuuid) {
    return res.status(400).json({ message: 'stationId (stationuuid) is required in the body' });
  }

  try {
    // Insert the favorite. If it's a duplicate for the user, ON CONFLICT does nothing.
    await db.query(
      'INSERT INTO user_favorites (user_id, stationuuid) VALUES ($1, $2) ON CONFLICT (user_id, stationuuid) DO NOTHING',
      [userId, stationuuid]
    );

    // Regardless of insertion or conflict, fetch and return the current full list of favorites for this user.
    // This provides a consistent response to the client.
    const currentFavorites = await db.query('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [userId]);
    const stationUuids = currentFavorites.rows.map(row => row.stationuuid);

    // Determine appropriate status code: 201 if created (tricky without RETURNING from INSERT and checking), 200 if updated/already there.
    // For simplicity and idempotency, let's assume 200 is fine if it's there or added.
    // To be more precise, one might need to check if it existed before, or use RETURNING and check rowCount.
    // However, the client just needs the updated list.
    res.status(200).json(stationUuids); // Send back the full, current list of favorite UUIDs.

  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ message: 'Error adding favorite to database' });
  }
});

// DELETE /api/me/favorites/:stationId - Removes a station UUID from favorites.
router.delete('/:stationId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || TEMP_USER_ID; // Use authenticated user or fallback to TEMP_USER_ID
  const stationuuidToDelete = req.params.stationId; // This is stationuuid

  if (!userId) {
   return res.status(401).json({ message: 'Authentication required. User ID not found.' });
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
      // Successfully deleted, return updated list
      const currentFavorites = await db.query('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [userId]);
      res.json(currentFavorites.rows.map(row => row.stationuuid));
    } else {
      // No row was deleted, meaning the favorite wasn't found for this user.
      // It's good practice to still return the current list so client can sync.
      const currentFavorites = await db.query('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [userId]);
      res.status(404).json({ message: 'Station UUID not found in favorites for this user.', favorites: currentFavorites.rows.map(row => row.stationuuid) });
    }
  } catch (error) {
    console.error('Error deleting favorite:', error);
    res.status(500).json({ message: 'Error deleting favorite from database' });
  }
});

export default router;
