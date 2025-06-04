import * as stationListService from '../services/stationListService';
import db from '../db'; // Actual db module

// Mock the db module
jest.mock('../db', () => ({
  query: jest.fn(),
}));

describe('StationList Service', () => {
  const mockUserId = 'user-test-id';
  const mockUserIdNumeric = 123; // For cases where TEMP_USER_ID might have been numeric
  const mockListId = 1;
  const mockListIdStr = '1';
  const mockStationId1 = 'station-uuid-1';
  const mockStationId2 = 'station-uuid-2';
  const mockListName = 'My Test List';
  const mockDate = new Date();

  beforeEach(() => {
    (db.query as jest.Mock).mockReset();
  });

  // --- Test getStationUuidsForList (internal helper, but good to be aware of its mocking) ---
  // This helper is called by other service functions. We'll mock its underlying db.query call.

  describe('createStationList', () => {
    it('should create a new station list and return it', async () => {
      const dbResponse = {
        rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }],
        rowCount: 1,
      };
      (db.query as jest.Mock).mockResolvedValueOnce(dbResponse);

      const result = await stationListService.createStationList(mockUserId, mockListName);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO user_station_lists (user_id, list_name) VALUES ($1, $2) RETURNING list_id, list_name, created_at',
        [mockUserId, mockListName]
      );
      expect(result).toEqual({
        id: mockListId,
        name: mockListName,
        createdAt: mockDate,
        stationIds: [],
      });
    });

    it('should throw an error if list name is empty', async () => {
      await expect(stationListService.createStationList(mockUserId, '  '))
        .rejects.toThrow('List name is required and must be a non-empty string');
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should throw a database error if query fails', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB Insert Failed'));
      await expect(stationListService.createStationList(mockUserId, mockListName))
        .rejects.toThrow('Database error while creating station list.');
    });
  });

  describe('getUserStationLists', () => {
    it('should return all station lists for a user with their stationIds', async () => {
      const listDbRows = [
        { list_id: mockListId, list_name: mockListName, created_at: mockDate },
        { list_id: 2, list_name: 'Another List', created_at: mockDate },
      ];
      // Mock for fetching lists
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: listDbRows, rowCount: 2 });
      // Mock for getStationUuidsForList for first list
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId1 }], rowCount: 1 });
      // Mock for getStationUuidsForList for second list
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });


      const result = await stationListService.getUserStationLists(mockUserId);

      expect(db.query).toHaveBeenNthCalledWith(1,
        'SELECT list_id, list_name, created_at FROM user_station_lists WHERE user_id = $1 ORDER BY created_at DESC',
        [mockUserId]
      );
      expect(db.query).toHaveBeenNthCalledWith(2, 'SELECT stationuuid FROM station_list_items WHERE list_id = $1', [mockListId]);
      expect(db.query).toHaveBeenNthCalledWith(3, 'SELECT stationuuid FROM station_list_items WHERE list_id = $1', [2]);
      expect(result).toEqual([
        { id: mockListId, name: mockListName, createdAt: mockDate, stationIds: [mockStationId1] },
        { id: 2, name: 'Another List', createdAt: mockDate, stationIds: [] },
      ]);
    });

    it('should return empty array if user has no lists', async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const result = await stationListService.getUserStationLists(mockUserId);
        expect(result).toEqual([]);
    });

    it('should throw error if fetching list items fails', async () => {
        const listDbRows = [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }];
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: listDbRows, rowCount: 1 });
        (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB error fetching items')); // Error on getStationUuidsForList

        await expect(stationListService.getUserStationLists(mockUserId))
            .rejects.toThrow('Database error while fetching station items.');
    });
  });

  describe('getStationListDetails', () => {
    it('should return list details if found and owned by user', async () => {
      const listDbRow = { list_id: mockListId, list_name: mockListName, created_at: mockDate };
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [listDbRow], rowCount: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId1 }], rowCount: 1 }); // For items

      const result = await stationListService.getStationListDetails(mockUserId, mockListIdStr);

      expect(db.query).toHaveBeenNthCalledWith(1,
        'SELECT list_id, list_name, created_at FROM user_station_lists WHERE list_id = $1 AND user_id = $2',
        [mockListIdStr, mockUserId]
      );
      expect(db.query).toHaveBeenNthCalledWith(2, 'SELECT stationuuid FROM station_list_items WHERE list_id = $1', [mockListId]);
      expect(result).toEqual({
        id: mockListId,
        name: mockListName,
        createdAt: mockDate,
        stationIds: [mockStationId1],
      });
    });

    it('should return null if list not found or not owned', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await stationListService.getStationListDetails(mockUserId, '999');
      expect(result).toBeNull();
    });
  });

  describe('updateStationListName', () => {
    const newListName = 'Updated List Name';
    it('should update list name and return updated list details', async () => {
      const updatedListDbRow = { list_id: mockListId, list_name: newListName, created_at: mockDate };
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedListDbRow], rowCount: 1 }); // For UPDATE
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId1 }], rowCount: 1 }); // For items

      const result = await stationListService.updateStationListName(mockUserId, mockListIdStr, newListName);

      expect(db.query).toHaveBeenNthCalledWith(1,
        'UPDATE user_station_lists SET list_name = $1 WHERE list_id = $2 AND user_id = $3 RETURNING list_id, list_name, created_at',
        [newListName, mockListIdStr, mockUserId]
      );
      expect(result).toEqual({
        id: mockListId,
        name: newListName,
        createdAt: mockDate,
        stationIds: [mockStationId1],
      });
    });

    it('should return null if list to update not found or not owned', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE affects 0 rows
      const result = await stationListService.updateStationListName(mockUserId, '999', newListName);
      expect(result).toBeNull();
    });

    it('should throw an error if new list name is empty', async () => {
      await expect(stationListService.updateStationListName(mockUserId, mockListIdStr, '  '))
        .rejects.toThrow('New list name is required and must be a non-empty string');
    });
  });

  describe('deleteStationList', () => {
    it('should return true if list successfully deleted', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      const result = await stationListService.deleteStationList(mockUserId, mockListIdStr);
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM user_station_lists WHERE list_id = $1 AND user_id = $2',
        [mockListIdStr, mockUserId]
      );
      expect(result).toBe(true);
    });

    it('should return false if list to delete not found or not owned', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      const result = await stationListService.deleteStationList(mockUserId, '999');
      expect(result).toBe(false);
    });
  });

  describe('addStationToList', () => {
    it('should add station and return updated list details', async () => {
      // Mock for list ownership check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ list_id: mockListId }], rowCount: 1 });
      // Mock for INSERT into station_list_items
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      // Mocks for getStationListDetails call
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId1 }], rowCount: 1 });


      const result = await stationListService.addStationToList(mockUserId, mockListIdStr, mockStationId1);

      expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT list_id FROM user_station_lists WHERE list_id = $1 AND user_id = $2', [mockListIdStr, mockUserId]);
      expect(db.query).toHaveBeenNthCalledWith(2,
        'INSERT INTO station_list_items (list_id, stationuuid) VALUES ($1, $2) ON CONFLICT (list_id, stationuuid) DO NOTHING',
        [mockListIdStr, mockStationId1]
      );
      expect(result).toEqual({
        id: mockListId,
        name: mockListName,
        createdAt: mockDate,
        stationIds: [mockStationId1],
      });
    });

    it('should return null if list not found or not owned when adding station', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 }); // List check fails
      const result = await stationListService.addStationToList(mockUserId, '999', mockStationId1);
      expect(result).toBeNull();
    });

    it('should throw error if stationId is missing', async () => {
        await expect(stationListService.addStationToList(mockUserId, mockListIdStr, ''))
            .rejects.toThrow('stationId (stationuuid) is required');
    });
  });

  describe('removeStationFromList', () => {
    it('should remove station, return true for removed, and updated list', async () => {
      // Mocks for initial getStationListDetails
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId1 }, { stationuuid: mockStationId2 }], rowCount: 2 }); // Items before delete
      // Mock for DELETE from station_list_items
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      // Mocks for final getStationListDetails
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId2 }], rowCount: 1 }); // Items after delete


      const result = await stationListService.removeStationFromList(mockUserId, mockListIdStr, mockStationId1);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM station_list_items WHERE list_id = $1 AND stationuuid = $2',
        [mockListIdStr, mockStationId1]
      );
      expect(result.removed).toBe(true);
      expect(result.list).toEqual({
        id: mockListId,
        name: mockListName,
        createdAt: mockDate,
        stationIds: [mockStationId2], // Only mockStationId2 remains
      });
    });

    it('should return false for removed if station was not in list, and current list', async () => {
      // Mocks for initial getStationListDetails
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId2 }], rowCount: 1 }); // stationId1 not in list
      // Mock for DELETE (0 rows affected)
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
       // Mocks for final getStationListDetails (should be same as initial)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ list_id: mockListId, list_name: mockListName, created_at: mockDate }], rowCount: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ stationuuid: mockStationId2 }], rowCount: 1 });

      const result = await stationListService.removeStationFromList(mockUserId, mockListIdStr, mockStationId1);

      expect(result.removed).toBe(false);
      expect(result.list?.stationIds).toEqual([mockStationId2]);
    });

    it('should return list:null if list itself not found or not owned', async () => {
      // Mocks for initial getStationListDetails returning null
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 }); // List not found

      const result = await stationListService.removeStationFromList(mockUserId, '999', mockStationId1);
      expect(result.list).toBeNull();
      expect(result.removed).toBe(false);
    });

    it('should throw error if stationId for removal is missing', async () => {
        await expect(stationListService.removeStationFromList(mockUserId, mockListIdStr, ''))
            .rejects.toThrow('stationId (stationuuid) for removal is required');
    });
  });
});
