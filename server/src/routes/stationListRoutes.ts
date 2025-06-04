import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth/authService';
import * as stationListService from '../services/stationListService';

const router = Router();

// Apply verifyToken middleware to all routes in this file
router.use(verifyToken);

// --- CRUD for Lists ---

// POST /api/me/lists - Create a new station list
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name } = req.body;

  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });
  // Basic validation for name is also in service, but good to have at route level too
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'List name is required and must be a non-empty string' });
  }

  try {
    const newList = await stationListService.createStationList(userId, name.trim());
    res.status(201).json(newList);
  } catch (error) {
    const serviceErrorMessage = error instanceof Error ? error.message : 'An unknown error occurred creating list.';
    console.error(`Error in POST /api/me/lists for user ${userId}, list name "${name}":`, error);
    if (serviceErrorMessage.includes('is required')) {
        return res.status(400).json({ message: serviceErrorMessage });
    }
    res.status(500).json({ message: 'An unexpected error occurred while creating the station list.' });
  }
});

// GET /api/me/lists - Get all station lists for the authenticated user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });

  try {
    const lists = await stationListService.getUserStationLists(userId);
    res.json(lists);
  } catch (error) {
    console.error(`Error in GET /api/me/lists for user ${userId}:`, error);
    res.status(500).json({ message: 'An unexpected error occurred while fetching your station lists.' });
  }
});

// GET /api/me/lists/:listId - Get a specific station list owned by the user
router.get('/:listId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId } = req.params;
  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });

  try {
    const list = await stationListService.getStationListDetails(userId, listId);
    if (!list) {
      return res.status(404).json({ message: 'Station list not found or not owned by user' });
    }
    res.json(list);
  } catch (error) {
    console.error(`Error in GET /api/me/lists/${listId} for user ${userId}:`, error);
    res.status(500).json({ message: 'An unexpected error occurred while fetching station list details.' });
  }
});

// PUT /api/me/lists/:listId - Update the name of a station list owned by the user
router.put('/:listId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId } = req.params;
  const { name } = req.body;

  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'New list name is required and must be a non-empty string' });
  }

  try {
    const updatedList = await stationListService.updateStationListName(userId, listId, name.trim());
    if (!updatedList) {
      return res.status(404).json({ message: 'Station list not found or not owned by user' });
    }
    res.json(updatedList);
  } catch (error) {
    const serviceErrorMessage = error instanceof Error ? error.message : 'An unknown error occurred updating list name.';
    console.error(`Error in PUT /api/me/lists/${listId} for user ${userId}, new name "${name}":`, error);
     if (serviceErrorMessage.includes('is required')) {
        return res.status(400).json({ message: serviceErrorMessage });
    }
    res.status(500).json({ message: 'An unexpected error occurred while updating the station list name.' });
  }
});

// DELETE /api/me/lists/:listId - Delete a station list owned by the user
router.delete('/:listId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId } = req.params;
  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });

  try {
    const success = await stationListService.deleteStationList(userId, listId);
    if (!success) {
      return res.status(404).json({ message: 'Station list not found or not owned by user' });
    }
    res.status(204).send(); // No content
  } catch (error) {
    console.error(`Error in DELETE /api/me/lists/${listId} for user ${userId}:`, error);
    res.status(500).json({ message: 'An unexpected error occurred while deleting the station list.' });
  }
});

// --- Managing Stations within a List ---

// POST /api/me/lists/:listId/stations - Add a station to a specific list
router.post('/:listId/stations', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId } = req.params;
  const { stationId } = req.body;

  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });
  if (!stationId) return res.status(400).json({ message: 'stationId is required' });

  try {
    const updatedList = await stationListService.addStationToList(userId, listId, stationId);
    if (!updatedList) {
      return res.status(404).json({ message: 'Station list not found or not owned by user' });
    }
    res.status(200).json(updatedList);
  } catch (error) {
    const serviceErrorMessage = error instanceof Error ? error.message : 'An unknown error occurred adding station to list.';
    console.error(`Error in POST /api/me/lists/${listId}/stations for user ${userId}, station ${stationId}:`, error);
     if (serviceErrorMessage.includes('is required')) {
        return res.status(400).json({ message: serviceErrorMessage });
    }
    res.status(500).json({ message: 'An unexpected error occurred while adding the station to the list.' });
  }
});

// DELETE /api/me/lists/:listId/stations/:stationId - Remove a station from a specific list
router.delete('/:listId/stations/:stationId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId, stationId } = req.params;

  if (!userId) return res.status(401).json({ message: 'Authentication required. User ID not found.' });
  if (!stationId) return res.status(400).json({ message: 'stationId parameter is required' });


  try {
    const result = await stationListService.removeStationFromList(userId, listId, stationId);
    if (!result.list) { // List itself not found or not owned
        return res.status(404).json({ message: 'Station list not found or not owned by user.' });
    }
    if (!result.removed) { // Station was not in the list
       return res.status(404).json({ message: 'Station not found in this list.' });
    }
    res.json(result.list); // Return the updated list
  } catch (error) {
    const serviceErrorMessage = error instanceof Error ? error.message : 'An unknown error occurred removing station from list.';
    console.error(`Error in DELETE /api/me/lists/${listId}/stations/${stationId} for user ${userId}:`, error);
    if (serviceErrorMessage.includes('is required')) {
        return res.status(400).json({ message: serviceErrorMessage });
    }
    res.status(500).json({ message: 'An unexpected error occurred while removing the station from the list.' });
  }
});

export default router;
