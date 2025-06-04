import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, verifyToken } from '../auth/authService';
import { StationList, stationLists } from '../models/stationListModel';
import { stations as allStations } from '../models/stationModel';

const router = Router();

// Apply verifyToken middleware to all routes in this file
router.use(verifyToken);

// --- CRUD for Lists ---

// POST /api/me/lists - Create a new station list
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name } = req.body;

  if (!userId) return res.status(400).json({ message: 'User ID not found in token' });
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'List name is required and must be a non-empty string' });
  }

  const newList: StationList = {
    id: uuidv4(),
    name: name.trim(),
    userId,
    stationIds: [],
  };
  stationLists.push(newList);
  res.status(201).json(newList);
});

// GET /api/me/lists - Get all station lists for the authenticated user
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'User ID not found in token' });

  const userLists = stationLists.filter(list => list.userId === userId);
  res.json(userLists);
});

// GET /api/me/lists/:listId - Get a specific station list owned by the user
router.get('/:listId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId } = req.params;
  if (!userId) return res.status(400).json({ message: 'User ID not found in token' });

  const list = stationLists.find(l => l.id === listId && l.userId === userId);
  if (!list) {
    return res.status(404).json({ message: 'Station list not found or not owned by user' });
  }
  res.json(list);
});

// PUT /api/me/lists/:listId - Update the name of a station list owned by the user
router.put('/:listId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId } = req.params;
  const { name } = req.body;

  if (!userId) return res.status(400).json({ message: 'User ID not found in token' });
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'New list name is required' });
  }

  const listIndex = stationLists.findIndex(l => l.id === listId && l.userId === userId);
  if (listIndex === -1) {
    return res.status(404).json({ message: 'Station list not found or not owned by user' });
  }

  stationLists[listIndex].name = name.trim();
  res.json(stationLists[listIndex]);
});

// DELETE /api/me/lists/:listId - Delete a station list owned by the user
router.delete('/:listId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId } = req.params;
  if (!userId) return res.status(400).json({ message: 'User ID not found in token' });

  const initialLength = stationLists.length;
  const filteredLists = stationLists.filter(l => !(l.id === listId && l.userId === userId));

  if (filteredLists.length === initialLength) {
    return res.status(404).json({ message: 'Station list not found or not owned by user' });
  }
  // This is tricky for in-memory: re-assigning the array or using splice
  stationLists.length = 0; // Clear original array
  stationLists.push(...filteredLists); // Add back filtered items

  res.status(204).send(); // No content
});


// --- Managing Stations within a List ---

// POST /api/me/lists/:listId/stations - Add a station to a specific list
router.post('/:listId/stations', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId } = req.params;
  const { stationId } = req.body;

  if (!userId) return res.status(400).json({ message: 'User ID not found in token' });
  if (!stationId) return res.status(400).json({ message: 'stationId is required' });

  const list = stationLists.find(l => l.id === listId && l.userId === userId);
  if (!list) {
    return res.status(404).json({ message: 'Station list not found or not owned by user' });
  }

  if (!allStations.some(s => s.id === stationId)) {
    return res.status(404).json({ message: 'Station not found in master list' });
  }

  if (list.stationIds.includes(stationId)) {
    return res.status(409).json({ message: 'Station already in this list', list });
  }

  list.stationIds.push(stationId);
  res.status(201).json(list);
});

// DELETE /api/me/lists/:listId/stations/:stationId - Remove a station from a specific list
router.delete('/:listId/stations/:stationId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { listId, stationId } = req.params;

  if (!userId) return res.status(400).json({ message: 'User ID not found in token' });

  const list = stationLists.find(l => l.id === listId && l.userId === userId);
  if (!list) {
    return res.status(404).json({ message: 'Station list not found or not owned by user' });
  }

  const initialLength = list.stationIds.length;
  list.stationIds = list.stationIds.filter(id => id !== stationId);

  if (list.stationIds.length === initialLength) {
    return res.status(404).json({ message: 'Station not found in this list' });
  }

  res.json(list);
});

export default router;
