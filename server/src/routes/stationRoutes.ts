import { Router, Request, Response } from 'express';
import { stations } from '../models/stationModel'; // Import stations from model
import { getStations as getLiveStationsService } from '../services/radioBrowserService'; // Renamed for clarity

const router = Router();

/**
 * @swagger
 * /api/stations/live:
 *   get:
 *     summary: Get live radio stations from Radio-Browser API
 *     tags: [Stations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of stations to return
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter stations by name
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter stations by tag (genre)
 *     responses:
 *       200:
 *         description: A list of live radio stations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Station' # Assuming radioBrowserService returns objects compatible with Station schema
 *       500:
 *         description: Error fetching live stations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getLiveStationsHandler = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const name = req.query.name as string | undefined;
    const tag = req.query.tag as string | undefined;

    const liveStations = await getLiveStationsService(limit, name, tag);
    res.json(liveStations);
  } catch (error) {
    console.error(`Error in GET /api/stations/live (query: ${JSON.stringify(req.query)}):`, error);
    if (error instanceof Error) {
      // For a production app, we might want a more generic message unless error.message is always safe.
      res.status(500).json({ message: 'An error occurred while fetching live stations.' });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while fetching live stations.' });
    }
  }
};

/**
 * @swagger
 * /api/stations:
 *   get:
 *     summary: Get a list of (local/mocked) radio stations
 *     tags: [Stations]
 *     responses:
 *       200:
 *         description: A list of radio stations.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Station'
 */
export const getStationsHandler = (req: Request, res: Response) => {
  res.json(stations); // Assuming 'stations' from stationModel matches the Station schema
};

/**
 * @swagger
 * /api/stations/{id}:
 *   get:
 *     summary: Get a specific radio station by its ID
 *     tags: [Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the radio station to retrieve.
 *     responses:
 *       200:
 *         description: The requested radio station.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Station'
 *       404:
 *         description: Station not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getStationByIdHandler = (req: Request, res: Response) => {
  const station = stations.find((s) => s.id === req.params.id);
  if (station) {
    res.json(station);
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
};

router.get('/live', getLiveStationsHandler);
router.get('/', getStationsHandler);
router.get('/:id', getStationByIdHandler);

export default router;
