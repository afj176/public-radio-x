import { Router, Request, Response } from 'express';
import { stations } from '../models/stationModel'; // Import stations from model
import { getStations as getLiveStations } from '../services/radioBrowserService';

const router = Router();

// GET /api/stations/live - Returns live radio stations from Radio-Browser API
router.get('/live', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const name = req.query.name as string | undefined;
    const tag = req.query.tag as string | undefined;

    const liveStations = await getLiveStations(limit, name, tag);
    res.json(liveStations);
  } catch (error) {
    // Ensure error is an instance of Error
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error fetching live stations', error: error.message });
    } else {
      res.status(500).json({ message: 'Error fetching live stations', error: 'An unknown error occurred' });
    }
  }
});

// GET /api/stations - Returns the list of all (presumably non-live or from a local DB) radio stations
router.get('/', (req: Request, res: Response) => {
  res.json(stations);
});

// GET /api/stations/:id - Returns a specific radio station by its ID
router.get('/:id', (req: Request, res: Response) => {
  const station = stations.find((s) => s.id === req.params.id);
  if (station) {
    res.json(station);
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
});

export default router;
