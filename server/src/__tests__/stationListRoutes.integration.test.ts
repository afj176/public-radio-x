import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import stationListRoutes from '../routes/stationListRoutes'; // The router we are testing
import * as authService from '../auth/authService'; // To mock verifyToken
import db from '../db'; // To mock database interactions

// Define AuthenticatedRequest for use in mockClear and mockImplementation
interface AuthenticatedRequest extends Request {
    user?: { id: string; email: string };
}

const app = express();
app.use(express.json());

// Mock verifyToken middleware
jest.mock('../auth/authService', () => ({
  ...jest.requireActual('../auth/authService'), // Import and retain default exports
  verifyToken: jest.fn((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Default mock: Simulate an authenticated user for most tests
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }),
}));

// Mock the db module for integration tests
jest.mock('../db');

// Mount the station list routes
app.use('/api/me/lists', stationListRoutes);


describe('Station List Routes Integration Tests', () => {
  const mockUserId = 'test-user-id'; // Should match the one in verifyToken mock
  const mockListId = 1;
  const mockListIdStr = '1';
  const mockStationId1 = 'station-uuid-1';
  const mockStationId2 = 'station-uuid-2';
  const mockListName = 'My Test List';
  const mockDate = new Date().toISOString(); // Ensure consistent date format

  beforeEach(() => {
    (authService.verifyToken as jest.Mock).mockClear();
    (db.query as jest.Mock).mockReset();

    // Default mock for verifyToken to simulate authenticated user
    (authService.verifyToken as jest.Mock).mockImplementation(
        (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            req.user = { id: mockUserId, email: 'test@example.com' };
            next();
        }
    );
  });

  const simulateUnauthenticated = () => {
    (authService.verifyToken as jest.Mock).mockImplementation(
        (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
          res.status(401).json({ message: 'Unauthorized - Test' });
        }
    );
  };

  // --- CRUD for Lists ---
  describe('POST /api/me/lists', () => {
    it('should create a new station list and return 201', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }],
        rowCount: 1,
      });
      const response = await request(app)
        .post('/api/me/lists')
        .send({ name: mockListName });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: mockListId,
        name: mockListName,
        createdAt: mockDate, // Assuming service returns date as ISO string or Date object stringified by res.json
        stationIds: [],
      });
    });
    it('should return 400 if list name is missing', async () => {
        const response = await request(app).post('/api/me/lists').send({ name: '  ' });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('List name is required');
    });
    it('should return 401 if unauthenticated', async () => {
        simulateUnauthenticated();
        const response = await request(app).post('/api/me/lists').send({ name: mockListName });
        expect(response.status).toBe(401);
    });
  });

  describe('GET /api/me/lists', () => {
    it('should return all station lists for the user with 200', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ // For fetching lists
          rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ // For getStationUuidsForList for the list
          rows: [{ stationuuid: mockStationId1 }],
          rowCount: 1,
        });

      const response = await request(app).get('/api/me/lists');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: mockListId, name: mockListName, createdAt: mockDate, stationIds: [mockStationId1] },
      ]);
    });
     it('should return 401 if unauthenticated', async () => {
        simulateUnauthenticated();
        const response = await request(app).get('/api/me/lists');
        expect(response.status).toBe(401);
    });
  });

  describe('GET /api/me/lists/:listId', () => {
    it('should return a specific list with items with 200', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ // For list details
          rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ // For items
          rows: [{ stationuuid: mockStationId1 }],
          rowCount: 1,
        });
      const response = await request(app).get(`/api/me/lists/${mockListIdStr}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mockListId);
    });
    it('should return 404 if list not found or not owned', async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 }); // List not found
        const response = await request(app).get(`/api/me/lists/999`);
        expect(response.status).toBe(404);
    });
    it('should return 401 if unauthenticated', async () => {
        simulateUnauthenticated();
        const response = await request(app).get(`/api/me/lists/${mockListIdStr}`);
        expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/me/lists/:listId', () => {
    const newName = "Updated Name";
    it('should update a list name and return 200 with updated list', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ // For UPDATE
            rows: [{ list_id: mockListId, list_name: newName, created_at: mockDate }],
            rowCount: 1,
        })
        .mockResolvedValueOnce({rows: [], rowCount: 0}); // For items (empty for simplicity)

      const response = await request(app)
        .put(`/api/me/lists/${mockListIdStr}`)
        .send({ name: newName });
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(newName);
    });
    it('should return 404 if list to update not found', async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 }); // UPDATE returns 0 rows
        const response = await request(app).put(`/api/me/lists/999`).send({ name: newName });
        expect(response.status).toBe(404);
    });
    it('should return 400 if new name is missing', async () => {
        const response = await request(app).put(`/api/me/lists/${mockListIdStr}`).send({ name: '' });
        expect(response.status).toBe(400);
    });
     it('should return 401 if unauthenticated', async () => {
        simulateUnauthenticated();
        const response = await request(app).put(`/api/me/lists/${mockListIdStr}`).send({ name: newName });
        expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/me/lists/:listId', () => {
    it('should delete a list and return 204', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 }); // DELETE success
      const response = await request(app).delete(`/api/me/lists/${mockListIdStr}`);
      expect(response.status).toBe(204);
    });
    it('should return 404 if list to delete not found', async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 }); // DELETE found nothing
        const response = await request(app).delete(`/api/me/lists/999`);
        expect(response.status).toBe(404);
    });
    it('should return 401 if unauthenticated', async () => {
        simulateUnauthenticated();
        const response = await request(app).delete(`/api/me/lists/${mockListIdStr}`);
        expect(response.status).toBe(401);
    });
  });

  // --- Managing Stations within a List ---
  describe('POST /api/me/lists/:listId/stations', () => {
    it('should add a station to a list and return 200 with updated list', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1 }) // List ownership check
        .mockResolvedValueOnce({ rowCount: 1 }) // Insert item
        .mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 }) // getListDetails: list
        .mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId1 }], rowCount: 1 }); // getListDetails: items

      const response = await request(app)
        .post(`/api/me/lists/${mockListIdStr}/stations`)
        .send({ stationId: mockStationId1 });
      expect(response.status).toBe(200);
      expect(response.body.stationIds).toContain(mockStationId1);
    });
    it('should return 404 if list not found when adding station', async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 }); // List ownership check fails
        const response = await request(app).post(`/api/me/lists/999/stations`).send({ stationId: mockStationId1 });
        expect(response.status).toBe(404);
    });
    it('should return 400 if stationId is missing', async () => {
        const response = await request(app).post(`/api/me/lists/${mockListIdStr}/stations`).send({});
        expect(response.status).toBe(400);
    });
    it('should return 401 if unauthenticated', async () => {
        simulateUnauthenticated();
        const response = await request(app).post(`/api/me/lists/${mockListIdStr}/stations`).send({ stationId: mockStationId1 });
        expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/me/lists/:listId/stations/:stationId', () => {
    it('should remove a station from a list and return 200 with updated list', async () => {
      (db.query as jest.Mock)
         // Initial getStationListDetails in service
        .mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 }) // list
        .mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId1 }, {stationuuid: mockStationId2}], rowCount: 2 }) // items
        // DELETE item
        .mockResolvedValueOnce({ rowCount: 1 })
        // Final getStationListDetails in service
        .mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 }) // list
        .mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId2 }], rowCount: 1 }); // items after delete

      const response = await request(app)
        .delete(`/api/me/lists/${mockListIdStr}/stations/${mockStationId1}`);
      expect(response.status).toBe(200);
      expect(response.body.stationIds).toEqual([mockStationId2]);
      expect(response.body.stationIds).not.toContain(mockStationId1);
    });

    it('should return 404 if list not found when removing station', async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 }); // Initial getStationListDetails -> list not found
        const response = await request(app).delete(`/api/me/lists/999/stations/${mockStationId1}`);
        expect(response.status).toBe(404);
        expect(response.body.message).toContain("Station list not found or not owned by user");
    });

    it('should return 404 if station not found in list when removing', async () => {
       (db.query as jest.Mock)
        // Initial getStationListDetails in service
        .mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId2 }], rowCount: 1 }) // stationId1 is not in this list
        // DELETE item (returns 0 as it wasn't there)
        .mockResolvedValueOnce({ rowCount: 0 })
        // Final getStationListDetails in service (list is unchanged)
        .mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId2 }], rowCount: 1 });

      const response = await request(app)
        .delete(`/api/me/lists/${mockListIdStr}/stations/${mockStationId1}`); // Trying to delete stationId1
      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Station not found in this list");
      expect(response.body.list.stationIds).toEqual([mockStationId2]);
    });
    it('should return 401 if unauthenticated', async () => {
        simulateUnauthenticated();
        const response = await request(app).delete(`/api/me/lists/${mockListIdStr}/stations/${mockStationId1}`);
        expect(response.status).toBe(401);
    });
     it('should return 400 if stationId param is missing (though route might not match)', async () => {
        // This test depends on how Express handles missing path parameters.
        // Usually, a route like /:listId/stations/:stationId wouldn't match /:listId/stations/
        // However, if it did and stationId was undefined in params, the route logic should catch it.
        // For this structure, the route itself would likely 404.
        // The explicit check in the route `if (!stationId) return res.status(400)` is for robustness.
        // To truly test that line, one might need a more permissive route, which isn't standard.
        // We can assume the framework/routing handles missing path segments with a 404.
        // A more direct test for the handler's `!stationId` check is tricky without altering route structure.
        // For now, we'll rely on the unit test for the service for `stationId` validation if it were there,
        // and the route-level check for body `stationId` in POST.
        // This integration test will likely result in a 404 from the router.
        const response = await request(app).delete(`/api/me/lists/${mockListIdStr}/stations/`);
        expect(response.status).toBe(404); // Or 400 if some middleware/setup allows it to hit handler
    });
  });
});
