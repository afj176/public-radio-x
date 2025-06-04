import { Request, Response } from 'express';
import { getStationsHandler, getStationByIdHandler, getLiveStationsHandler } from '../routes/stationRoutes';
import { stations as mockStationsData } from '../models/stationModel';
import * as radioBrowserService from '../services/radioBrowserService';

// Mock the stationModel
jest.mock('../models/stationModel', () => ({
  __esModule: true,
  stations: [
    { id: '1', name: 'Mock Station 1', streamUrl: 'url1', genre: 'Rock' },
    { id: '2', name: 'Mock Station 2', streamUrl: 'url2', genre: 'Pop' },
  ],
}));

// Mock the radioBrowserService
jest.mock('../services/radioBrowserService');

describe('Station Route Handlers', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStationsHandler', () => {
    it('should return all stations from the mock model', () => {
      getStationsHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.json).toHaveBeenCalledWith(mockStationsData);
    });
  });

  describe('getStationByIdHandler', () => {
    it('should return a station if found', () => {
      mockReq.params = { id: '1' };
      getStationByIdHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.json).toHaveBeenCalledWith(mockStationsData.find(s => s.id === '1'));
    });

    it('should return 404 if station not found', () => {
      mockReq.params = { id: '3' };
      getStationByIdHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Station not found' });
    });
  });

  describe('getLiveStationsHandler', () => {
    const mockLiveStations = [{ name: 'Live Station 1' }, { name: 'Live Station 2' }];

    beforeEach(() => {
      (radioBrowserService.getStations as jest.Mock).mockResolvedValue(mockLiveStations);
    });

    it('should return live stations with default limit', async () => {
      mockReq.query = {};
      await getLiveStationsHandler(mockReq as Request, mockRes as Response);
      expect(radioBrowserService.getStations).toHaveBeenCalledWith(100, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalledWith(mockLiveStations);
    });

    it('should return live stations with specified limit, name, and tag', async () => {
      mockReq.query = { limit: '50', name: 'Test Name', tag: 'Test Tag' };
      await getLiveStationsHandler(mockReq as Request, mockRes as Response);
      expect(radioBrowserService.getStations).toHaveBeenCalledWith(50, 'Test Name', 'Test Tag');
      expect(mockRes.json).toHaveBeenCalledWith(mockLiveStations);
    });

    it('should handle errors from radioBrowserService', async () => {
      const errorMessage = 'Service Error';
      (radioBrowserService.getStations as jest.Mock).mockRejectedValue(new Error(errorMessage));
      mockReq.query = {};
      await getLiveStationsHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error fetching live stations', error: errorMessage });
    });

    it('should handle unknown errors when fetching live stations', async () => {
        (radioBrowserService.getStations as jest.Mock).mockRejectedValue('Some random error');
        mockReq.query = {};
        await getLiveStationsHandler(mockReq as Request, mockRes as Response);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error fetching live stations', error: 'An unknown error occurred' });
    });
  });
});
