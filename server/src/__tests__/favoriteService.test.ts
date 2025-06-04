import * as favoriteService from '../services/favoriteService';
import db from '../db'; // Actual db module

// Mock the db module
jest.mock('../db', () => ({
  query: jest.fn(),
}));

describe('Favorite Service', () => {
  const mockUserId = 'user123';
  const mockStationId1 = 'station-uuid-1';
  const mockStationId2 = 'station-uuid-2';

  beforeEach(() => {
    // Reset mocks before each test
    (db.query as jest.Mock).mockReset();
  });

  describe('getFavorites', () => {
    it('should return a list of favorite station UUIDs for a user', async () => {
      const mockRows = [{ stationuuid: mockStationId1 }, { stationuuid: mockStationId2 }];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const favorites = await favoriteService.getFavorites(mockUserId);

      expect(db.query).toHaveBeenCalledWith('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [mockUserId]);
      expect(favorites).toEqual([mockStationId1, mockStationId2]);
    });

    it('should return an empty array if the user has no favorites', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const favorites = await favoriteService.getFavorites(mockUserId);

      expect(db.query).toHaveBeenCalledWith('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [mockUserId]);
      expect(favorites).toEqual([]);
    });

    it('should throw an error if the database query fails', async () => {
      const dbError = new Error('Database query failed');
      (db.query as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(favoriteService.getFavorites(mockUserId))
        .rejects
        .toThrow('Database error while fetching favorites.');
      expect(db.query).toHaveBeenCalledWith('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [mockUserId]);
    });
  });

  describe('addFavorite', () => {
    it('should add a favorite and return the updated list of favorites', async () => {
      // Mock for INSERT
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      // Mock for subsequent SELECT (getFavorites call within addFavorite)
      const expectedFavorites = [mockStationId1, mockStationId2];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: expectedFavorites.map(id => ({ stationuuid: id })) });

      const favorites = await favoriteService.addFavorite(mockUserId, mockStationId2);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO user_favorites (user_id, stationuuid) VALUES ($1, $2) ON CONFLICT (user_id, stationuuid) DO NOTHING',
        [mockUserId, mockStationId2]
      );
      expect(db.query).toHaveBeenCalledWith('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [mockUserId]);
      expect(favorites).toEqual(expectedFavorites);
    });

    it('should return the current list if the favorite already exists (ON CONFLICT DO NOTHING)', async () => {
      // Mock for INSERT (conflict, 0 rows affected by actual insert)
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      // Mock for subsequent SELECT
      const existingFavorites = [mockStationId1, mockStationId2];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: existingFavorites.map(id => ({ stationuuid: id })) });

      const favorites = await favoriteService.addFavorite(mockUserId, mockStationId1); // Adding an existing one

      expect(db.query).toHaveBeenCalledTimes(2); // Insert + Select
      expect(favorites).toEqual(existingFavorites);
    });

    it('should throw an error if stationId is not provided', async () => {
        await expect(favoriteService.addFavorite(mockUserId, ''))
            .rejects
            .toThrow('stationId is required.');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('should throw an error if the database insert fails', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB Insert Error'));

      await expect(favoriteService.addFavorite(mockUserId, mockStationId1))
        .rejects
        .toThrow('Database error while adding favorite.');
    });

    it('should throw an error if the subsequent database select fails', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1 }) // Successful insert
        .mockRejectedValueOnce(new Error('DB Select Error')); // Failed select

      await expect(favoriteService.addFavorite(mockUserId, mockStationId1))
        .rejects
        .toThrow('Database error while fetching favorites.'); // Error from getFavorites
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite and return updated list and success:true if found', async () => {
      // Mock for DELETE
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ stationuuid: mockStationId1 }] });
      // Mock for subsequent SELECT (getFavorites call within removeFavorite)
      const remainingFavorites = [mockStationId2];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: remainingFavorites.map(id => ({ stationuuid: id })) });

      const result = await favoriteService.removeFavorite(mockUserId, mockStationId1);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM user_favorites WHERE user_id = $1 AND stationuuid = $2 RETURNING stationuuid',
        [mockUserId, mockStationId1]
      );
      expect(db.query).toHaveBeenCalledWith('SELECT stationuuid FROM user_favorites WHERE user_id = $1', [mockUserId]);
      expect(result.success).toBe(true);
      expect(result.updatedFavorites).toEqual(remainingFavorites);
    });

    it('should return updated list and success:false if favorite not found for user', async () => {
      // Mock for DELETE (station not found)
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Mock for subsequent SELECT
      const currentFavorites = [mockStationId2]; // stationId1 was not in their list
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: currentFavorites.map(id => ({ stationuuid: id })) });

      const result = await favoriteService.removeFavorite(mockUserId, 'non-existent-station-id');

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM user_favorites WHERE user_id = $1 AND stationuuid = $2 RETURNING stationuuid',
        [mockUserId, 'non-existent-station-id']
      );
      expect(result.success).toBe(false);
      expect(result.updatedFavorites).toEqual(currentFavorites);
    });

    it('should throw an error if stationId is not provided for removal', async () => {
        await expect(favoriteService.removeFavorite(mockUserId, ''))
            .rejects
            .toThrow('stationId is required for removal.');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('should throw an error if the database delete operation fails', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB Delete Error'));

      await expect(favoriteService.removeFavorite(mockUserId, mockStationId1))
        .rejects
        .toThrow('Database error while deleting favorite.');
    });
     it('should throw an error if the subsequent getFavorites call fails after successful delete', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ stationuuid: mockStationId1 }] }) // Successful delete
        .mockRejectedValueOnce(new Error('DB Select Error')); // Failed select in getFavorites

      await expect(favoriteService.removeFavorite(mockUserId, mockStationId1))
        .rejects
        .toThrow('Database error while fetching favorites.'); // Error from getFavorites
    });
  });
});
