import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import favoriteRoutes from '../routes/favoriteRoutes'; // The router we are testing
import * as authService from '../auth/authService'; // To mock verifyToken
import db from '../db'; // To mock database interactions

const app = express();
app.use(express.json());

// Mock verifyToken middleware
jest.mock('../auth/authService', () => ({
  ...jest.requireActual('../auth/authService'), // Import and retain default exports
  verifyToken: jest.fn((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Simulate an authenticated user
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }),
}));

// Mock the db module for integration tests
jest.mock('../db');

// Mount the favorite routes under a specific path, e.g., /api/me/favorites
app.use('/api/me/favorites', favoriteRoutes);

// Define AuthenticatedRequest for use in mockClear
interface AuthenticatedRequest extends Request {
    user?: { id: string; email: string };
}

describe('Favorite Routes Integration Tests', () => {
  const mockUserId = 'test-user-id'; // Should match the one in verifyToken mock
  const mockStationId1 = 'station-uuid-1';
  const mockStationId2 = 'station-uuid-2';

  beforeEach(() => {
    // Clear mock calls and implementations before each test
    (authService.verifyToken as jest.Mock).mockClear();
    (db.query as jest.Mock).mockReset();

    // Default mock for verifyToken to simulate authenticated user for most tests
    (authService.verifyToken as jest.Mock).mockImplementation(
        (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            req.user = { id: mockUserId, email: 'test@example.com' };
            next();
        }
    );
  });

  describe('GET /api/me/favorites', () => {
    it('should return 200 OK with a list of favorite station UUIDs', async () => {
      const mockFavorites = [{ stationuuid: mockStationId1 }, { stationuuid: mockStationId2 }];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockFavorites });

      const response = await request(app).get('/api/me/favorites');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockStationId1, mockStationId2]);
      expect(db.query).toHaveBeenCalledWith('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [mockUserId]);
      expect(authService.verifyToken).toHaveBeenCalled();
    });

    it('should return 200 OK with an empty array if the user has no favorites', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/me/favorites');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 401 Unauthorized if verifyToken fails (simulated)', async () => {
      // Override mock for this specific test
      (authService.verifyToken as jest.Mock).mockImplementation(
        (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
          // Simulate token verification failure
          res.status(401).json({ message: 'Authentication token is invalid or expired.' });
        }
      );

      const response = await request(app).get('/api/me/favorites');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication token is invalid or expired.');
      expect(db.query).not.toHaveBeenCalled(); // DB should not be called
    });
  });

  describe('POST /api/me/favorites', () => {
    it('should return 200 OK with the updated list of favorites after adding one', async () => {
      const stationToAdd = 'new-station-uuid';
      // Mock for INSERT
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      // Mock for subsequent SELECT
      const updatedDbFavorites = [
        { stationuuid: mockStationId1 },
        { stationuuid: stationToAdd },
      ];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: updatedDbFavorites });

      const response = await request(app)
        .post('/api/me/favorites')
        .send({ stationId: stationToAdd });

      expect(response.status).toBe(200); // Or 201 depending on API design for creation
      expect(response.body).toEqual([mockStationId1, stationToAdd]);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO user_favorites (user_id, stationuuid) VALUES ($1, $2) ON CONFLICT (user_id, stationuuid) DO NOTHING',
        [mockUserId, stationToAdd]
      );
      expect(db.query).toHaveBeenCalledWith('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [mockUserId]);
    });

    it('should return 400 Bad Request if stationId is missing in the body', async () => {
      const response = await request(app)
        .post('/api/me/favorites')
        .send({}); // No stationId

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('stationId is required in the body');
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 200 OK and current favorites if station already exists (no change)', async () => {
      const existingStationId = mockStationId1;
      // Mock for INSERT (conflict, 0 rows affected)
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      // Mock for subsequent SELECT
      const currentDbFavorites = [{ stationuuid: mockStationId1 }, { stationuuid: mockStationId2 }];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: currentDbFavorites });

      const response = await request(app)
        .post('/api/me/favorites')
        .send({ stationId: existingStationId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockStationId1, mockStationId2]);
       expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO user_favorites (user_id, stationuuid) VALUES ($1, $2) ON CONFLICT (user_id, stationuuid) DO NOTHING',
        [mockUserId, existingStationId]
      );
    });


    it('should return 401 Unauthorized if not authenticated (simulated)', async () => {
        (authService.verifyToken as jest.Mock).mockImplementation(
            (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
              res.status(401).json({ message: 'Unauthorized' });
            }
        );
        const response = await request(app).post('/api/me/favorites').send({ stationId: 'some-id' });
        expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/me/favorites/:stationId', () => {
    it('should return 200 OK with the updated list after deleting a favorite', async () => {
      const stationToDelete = mockStationId1;
      // Mock for DELETE
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ stationuuid: stationToDelete }] });
      // Mock for subsequent SELECT
      const remainingDbFavorites = [{ stationuuid: mockStationId2 }];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: remainingDbFavorites });

      const response = await request(app).delete(`/api/me/favorites/${stationToDelete}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockStationId2]);
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM user_favorites WHERE user_id = $1 AND stationuuid = $2 RETURNING stationuuid',
        [mockUserId, stationToDelete]
      );
    });

    it('should return 404 Not Found if the station to delete is not in user favorites', async () => {
      const nonExistentStationId = 'non-existent-uuid';
      // Mock for DELETE (station not found)
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Mock for subsequent SELECT (to return current list)
      const currentDbFavorites = [{ stationuuid: mockStationId1 }];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: currentDbFavorites });


      const response = await request(app).delete(`/api/me/favorites/${nonExistentStationId}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Station ID not found in favorites for this user.');
      expect(response.body.favorites).toEqual([mockStationId1]);
    });

    // Note: Express route parameters are typically non-empty if the route matches.
    // A test for missing stationId in path like `DELETE /api/me/favorites/` would usually result in a 404
    // from the router itself if no such route `DELETE /api/me/favorites/` without a param is defined.
    // The controller logic for `!stationId` in `req.params` for this route `/api/me/favorites/:stationId`
    // is less likely to be hit unless the param is optional or the route is different.

    it('should return 401 Unauthorized if not authenticated (simulated)', async () => {
        (authService.verifyToken as jest.Mock).mockImplementation(
            (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
              res.status(401).json({ message: 'Unauthorized' });
            }
        );
        const response = await request(app).delete(`/api/me/favorites/${mockStationId1}`);
        expect(response.status).toBe(401);
    });
  });
});
