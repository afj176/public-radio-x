import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth/authService';
import * as favoriteService from '../services/favoriteService';

const router = Router();

// Apply verifyToken middleware to all routes in this file
router.use(verifyToken);

// GET /api/me/favorites - Returns the list of favorite station UUIDs for the authenticated user.
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required. User ID not found after token verification.' });
  }

  try {
    const stationUuids = await favoriteService.getFavorites(userId);
    res.json(stationUuids);
  } catch (error) {
    console.error(`Error in GET /api/me/favorites for user ${userId}:`, error);
    res.status(500).json({ message: 'An unexpected error occurred while fetching your favorites.' });
  }
});

// POST /api/me/favorites - Adds a station UUID to the authenticated user's list of favorites.
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { stationId } = req.body; // stationId from client

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required. User ID not found after token verification.' });
  }
  if (!stationId) {
    return res.status(400).json({ message: 'stationId is required in the body' });
  }

  try {
    const updatedFavorites = await favoriteService.addFavorite(userId, stationId);
    res.status(200).json(updatedFavorites); // 200 or 201 based on preference
  } catch (error) {
    const serviceErrorMessage = error instanceof Error ? error.message : 'An unknown error occurred adding favorite.';
    console.error(`Error in POST /api/me/favorites for user ${userId}, station ${stationId}:`, error);
    // Differentiate between client error (e.g. missing stationId if service threw it) and server error
    if (serviceErrorMessage.includes('is required')) {
        return res.status(400).json({ message: serviceErrorMessage });
    }
    res.status(500).json({ message: 'An unexpected error occurred while adding the favorite.' });
  }
});

// DELETE /api/me/favorites/:stationId - Removes a station UUID from favorites.
router.delete('/:stationId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { stationId } = req.params;

  if (!userId) {
   return res.status(401).json({ message: 'Authentication required. User ID not found after token verification.' });
  }
  if (!stationId) {
    // This check might be redundant if Express routing ensures stationId is present,
    // but good for robustness.
    return res.status(400).json({ message: 'Station ID parameter is required.' });
  }

  try {
    const { updatedFavorites, success } = await favoriteService.removeFavorite(userId, stationId);
    if (success) {
      res.json(updatedFavorites); // Send back the updated list on successful deletion
    } else {
      // If removeFavorite indicates station was not found
      res.status(404).json({ message: 'Favorite station not found for this user.' });
    }
  } catch (error) {
    const serviceErrorMessage = error instanceof Error ? error.message : 'An unknown error occurred deleting favorite.';
    console.error(`Error in DELETE /api/me/favorites/${stationId} for user ${userId}:`, error);
     if (serviceErrorMessage.includes('is required')) {
        return res.status(400).json({ message: serviceErrorMessage });
    }
    res.status(500).json({ message: 'An unexpected error occurred while deleting the favorite.' });
  }
});

export default router;
