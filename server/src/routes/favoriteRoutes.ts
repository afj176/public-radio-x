import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth/authService';
import { UserFavorite, userFavorites } from '../models/userFavoritesModel';
import { stations as allStations } from '../models/stationModel'; // To validate station IDs and optionally return full station objects

const router = Router();

// Apply verifyToken middleware to all routes in this file
router.use(verifyToken);

// Helper function to find or create user's favorite list
const findOrCreateUserFavorites = (userId: string): UserFavorite => {
  let userFav = userFavorites.find((fav) => fav.userId === userId);
  if (!userFav) {
    userFav = { userId, stationIds: [] };
    userFavorites.push(userFav);
  }
  return userFav;
};

// GET /api/me/favorites - Returns the list of favorite station IDs for the authenticated user.
// Optionally, can return full station objects.
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    // This should ideally not happen if verifyToken is working correctly
    return res.status(400).json({ message: 'User ID not found in token' });
  }

  const userFav = findOrCreateUserFavorites(userId);

  // Option 1: Return only station IDs (as per primary requirement)
  // res.json(userFav.stationIds);

  // Option 2: Return full station objects (more useful for client)
  const favoriteStationsFull = userFav.stationIds
    .map(stationId => allStations.find(s => s.id === stationId))
    .filter(station => station !== undefined); // Filter out undefined if a stationId is invalid

  res.json(favoriteStationsFull);
});

// POST /api/me/favorites - Adds a station ID to the authenticated user's list of favorites.
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { stationId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID not found in token' });
  }
  if (!stationId) {
    return res.status(400).json({ message: 'stationId is required in the body' });
  }

  // Optional: Validate if stationId actually exists in allStations
  if (!allStations.some(s => s.id === stationId)) {
    return res.status(404).json({ message: 'Station not found' });
  }

  const userFav = findOrCreateUserFavorites(userId);

  if (!userFav.stationIds.includes(stationId)) {
    userFav.stationIds.push(stationId);
  }

  // Return updated list of full favorite stations
  const favoriteStationsFull = userFav.stationIds
    .map(id => allStations.find(s => s.id === id))
    .filter(station => station !== undefined);
  res.status(201).json(favoriteStationsFull);
});

// DELETE /api/me/favorites/:stationId - Removes a station ID from favorites.
router.delete('/:stationId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const stationIdToRemove = req.params.stationId;

  if (!userId) {
    return res.status(400).json({ message: 'User ID not found in token' });
  }

  const userFav = userFavorites.find((fav) => fav.userId === userId);
  if (!userFav) {
    // User has no favorites list yet, so nothing to delete
    return res.status(404).json({ message: 'No favorites found for this user or station is not a favorite.' });
  }

  const initialLength = userFav.stationIds.length;
  userFav.stationIds = userFav.stationIds.filter((id) => id !== stationIdToRemove);

  if (userFav.stationIds.length === initialLength) {
    return res.status(404).json({ message: 'Station not found in favorites.' });
  }

  // Return updated list of full favorite stations
  const favoriteStationsFull = userFav.stationIds
    .map(id => allStations.find(s => s.id === id))
    .filter(station => station !== undefined);
  res.json(favoriteStationsFull);
});

export default router;
