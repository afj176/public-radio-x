import request from 'supertest';
import express from 'express';
import stationRoutes from '../routes/stationRoutes'; // Assuming this is the router
import { stations as mockStationsData } from '../models/stationModel';

// Mock the stationModel for integration tests to ensure predictable data
jest.mock('../models/stationModel', () => ({
  __esModule: true,
  stations: [
    { id: '1', name: 'Integration Test Station 1', streamUrl: 'url1', genre: 'Rock' },
    { id: '2', name: 'Integration Test Station 2', streamUrl: 'url2', genre: 'Pop' },
  ],
}));

// Mock radioBrowserService to prevent actual API calls during integration tests
jest.mock('../services/radioBrowserService', () => ({
  getStations: jest.fn().mockResolvedValue([
    { name: 'Live Test Station 1', url_resolved: 'liveurl1', tags: 'live,rock' },
    { name: 'Live Test Station 2', url_resolved: 'liveurl2', tags: 'live,pop' },
  ]),
}));

const app = express();
app.use(express.json());
// Mount the station routes under a specific path, e.g., /api/stations
// This matches how it might be set up in a real app.ts or server.ts
app.use('/api/stations', stationRoutes);

describe('Station Routes Integration Tests', () => {
  describe('GET /api/stations', () => {
    it('should return 200 OK with a list of stations', async () => {
      const response = await request(app).get('/api/stations');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      // Check if the response matches the mocked data structure
      expect(response.body.length).toBe(mockStationsData.length);
      expect(response.body[0].name).toBe(mockStationsData[0].name);
    });
  });

  describe('GET /api/stations/:id', () => {
    it('should return 200 OK with the correct station if ID exists', async () => {
      const stationId = mockStationsData[0].id;
      const response = await request(app).get(`/api/stations/${stationId}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(stationId);
      expect(response.body.name).toBe(mockStationsData[0].name);
    });

    it('should return 404 Not Found if ID does not exist', async () => {
      const response = await request(app).get('/api/stations/nonexistentid');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Station not found');
    });
  });

  describe('GET /api/stations/live', () => {
    it('should return 200 OK with a list of live stations', async () => {
      const response = await request(app).get('/api/stations/live');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2); // As per the mock
      expect(response.body[0].name).toBe('Live Test Station 1');
    });

    it('should pass query parameters to the service for live stations', async () => {
      const response = await request(app)
        .get('/api/stations/live?limit=10&name=TestRadio&tag=Rock');
      expect(response.status).toBe(200);
      // We need to check if the getStations mock was called with these params.
      // This requires the mock to be available in this scope or to be spied upon.
      const radioBrowserService = require('../services/radioBrowserService');
      expect(radioBrowserService.getStations).toHaveBeenCalledWith(10, "TestRadio", "Rock");
    });
  });
});
