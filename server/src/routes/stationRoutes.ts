import { Router, Request, Response } from 'express';
import { stations } from '../models/stationModel'; // Import stations from model

const router = Router();

// GET /api/stations - Returns the list of all radio stations
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
