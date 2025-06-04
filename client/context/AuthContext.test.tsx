import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from './AuthContext'; // Adjust path as necessary
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Mock SecureStore
jest.mock('expo-secure-store');

// Mock global fetch
global.fetch = jest.fn();

// Mock models and utils (if they have side effects or are complex)
jest.mock('@/models/Station', () => ({}));
jest.mock('@/models/StationList', () => ({}));
jest.mock('@/utils/recentStationsStorage', () => ({
  getRecentStations: jest.fn().mockResolvedValue([]),
  addStationToRecents: jest.fn().mockResolvedValue(undefined),
  MAX_RECENT_STATIONS: 20,
}));


// Suppress console.error and console.warn for cleaner test output for expected errors
// We should only use this if we are testing error conditions where console output is expected
let originalConsoleError: any;
let originalConsoleWarn: any;

beforeAll(() => {
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});


describe('AuthContext', () => {
  const mockEmail = 'test@example.com';
  const mockToken = 'fake-jwt-token';
  const mockStationId1 = 'uuid1';
  const mockStation1 = { stationuuid: mockStationId1, name: 'Station 1', /* other fields */ };
  const mockAllStations = [mockStation1, { stationuuid: 'uuid2', name: 'Station 2' }];

  const serverUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockClear();
    (SecureStore.setItemAsync as jest.Mock).mockClear();
    (SecureStore.deleteItemAsync as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockClear();

    // Default mock for fetching all stations (used in useEffect)
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/stations/live')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAllStations,
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({ message: 'Unhandled fetch mock' }) });
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Initial Load', () => {
    it('should load token and email from SecureStore and fetch initial data if token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(mockToken) // TOKEN_KEY
        .mockResolvedValueOnce(mockEmail); // USER_EMAIL_KEY

      // Mock initial data fetches
      (global.fetch as jest.Mock)
        .mockImplementationOnce((url:string) => { // allStationsCache
            if (url.includes('/api/stations/live')) return Promise.resolve({ ok: true, json: async () => mockAllStations });
            return Promise.resolve({ ok: false, json: async () => ({}) });
        })
        .mockImplementationOnce((url:string) => { // fetchFavoriteStationsInternal
            if (url.includes('/api/me/favorites')) return Promise.resolve({ ok: true, json: async () => [mockStationId1] });
            return Promise.resolve({ ok: false, json: async () => ({}) });
        })
        .mockImplementationOnce((url:string) => { // fetchStationListsInternal
             if (url.includes('/api/me/lists')) return Promise.resolve({ ok: true, json: async () => [] });
            return Promise.resolve({ ok: false, json: async () => ({}) });
        });

      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitForNextUpdate({timeout: 2000}); // Wait for useEffect to run and state to settle

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('user_jwt_token');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('user_email');
      expect(result.current.token).toBe(mockToken);
      expect(result.current.userEmail).toBe(mockEmail);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.favoriteStations).toEqual([mockStation1]); // Checks if UUID was resolved
      expect(result.current.stationLists).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should remain unauthenticated if no token in SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
       // Mock allStationsCache fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockAllStations });


      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await waitForNextUpdate();


      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle SecureStore load error and clear tokens', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('SecureStore failed'));
      // Mock allStationsCache fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockAllStations });

      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await waitForNextUpdate();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_jwt_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_email');
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Login/Register', () => {
    it('login should store token/email, set state, and fetch user data', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
       // Wait for initial load to complete (all stations cache)
      await waitForNextUpdate();


      (global.fetch as jest.Mock)
        .mockImplementationOnce((url:string) => { // fetchFavoriteStationsInternal
            if (url.includes('/api/me/favorites')) return Promise.resolve({ ok: true, json: async () => [] });
            return Promise.resolve({ ok: false, json: async () => ({}) });
        })
        .mockImplementationOnce((url:string) => { // fetchStationListsInternal
             if (url.includes('/api/me/lists')) return Promise.resolve({ ok: true, json: async () => [] });
            return Promise.resolve({ ok: false, json: async () => ({}) });
        });

      await act(async () => {
        await result.current.login(mockEmail, mockToken);
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_jwt_token', mockToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_email', mockEmail);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.userEmail).toBe(mockEmail);
      expect(result.current.isAuthenticated).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(`${serverUrl}/api/me/favorites`, expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith(`${serverUrl}/api/me/lists`, expect.any(Object));
    });

    it('register should effectively call login', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await waitForNextUpdate(); // Initial load

      // Mock fetches for login part of register
      (global.fetch as jest.Mock)
        .mockImplementationOnce((url:string) => { // fetchFavoriteStationsInternal
            if (url.includes('/api/me/favorites')) return Promise.resolve({ ok: true, json: async () => [] });
            return Promise.resolve({ ok: false, json: async () => ({}) });
        })
        .mockImplementationOnce((url:string) => { // fetchStationListsInternal
             if (url.includes('/api/me/lists')) return Promise.resolve({ ok: true, json: async () => [] });
            return Promise.resolve({ ok: false, json: async () => ({}) });
        });

      await act(async () => {
        await result.current.register('new@example.com', 'new-token');
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_jwt_token', 'new-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_email', 'new@example.com');
      expect(result.current.token).toBe('new-token');
    });
  });

  describe('Logout', () => {
    it('should clear token/email from SecureStore and state', async () => {
      // Setup: Simulate a logged-in state
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(mockToken)
        .mockResolvedValueOnce(mockEmail);
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await waitForNextUpdate(); // Initial load to set user

      expect(result.current.isAuthenticated).toBe(true); // Pre-condition

      await act(async () => {
        await result.current.logout();
      });

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_jwt_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_email');
      expect(result.current.token).toBeNull();
      expect(result.current.userEmail).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.favoriteStations).toEqual([]);
      expect(result.current.stationLists).toEqual([]);
    });
  });

  describe('Favorite Stations', () => {
     beforeEach(async () => {
        // Ensure user is "logged in" for these tests
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(mockToken).mockResolvedValueOnce(mockEmail);
         // Mock initial data fetches to avoid interference
        (global.fetch as jest.Mock)
            .mockImplementationOnce((url:string) => { // allStationsCache
                if (url.includes('/api/stations/live')) return Promise.resolve({ ok: true, json: async () => mockAllStations });
                return Promise.resolve({ ok: false, json: async () => ({}) });
            })
            .mockImplementationOnce((url:string) => { // initial fetchFavoriteStationsInternal
                if (url.includes('/api/me/favorites')) return Promise.resolve({ ok: true, json: async () => [] }); // Start with no favorites
                return Promise.resolve({ ok: false, json: async () => ({}) });
            })
            .mockImplementationOnce((url:string) => { // initial fetchStationListsInternal
                if (url.includes('/api/me/lists')) return Promise.resolve({ ok: true, json: async () => [] });
                return Promise.resolve({ ok: false, json: async () => ({}) });
            });
    });

    it('addFavoriteStation should POST to API and update state', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await waitForNextUpdate(); // Initial load

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockStationId1], // API returns updated list of favorite UUIDs
      });

      await act(async () => {
        await result.current.addFavoriteStation(mockStationId1);
      });

      expect(global.fetch).toHaveBeenCalledWith(`${serverUrl}/api/me/favorites`, expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${mockToken}` }),
        body: JSON.stringify({ stationId: mockStationId1 }),
      }));
      expect(result.current.favoriteStations).toEqual([mockStation1]); // Resolved from cache
      expect(result.current.isFavorite(mockStationId1)).toBe(true);
    });

    it('removeFavoriteStation should DELETE from API and update state', async () => {
      // Pre-populate favorites for removal test
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await act(async () => { // Wait for initial load
          await waitForNextUpdate();
      });
      // Manually set a favorite for removal test after initial load
      act(() => {
          result.current.favoriteStations = [mockStation1];
      });


      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [], // API returns updated list (empty after removal)
      });

      await act(async () => {
        await result.current.removeFavoriteStation(mockStationId1);
      });

      expect(global.fetch).toHaveBeenCalledWith(`${serverUrl}/api/me/favorites/${mockStationId1}`, expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ Authorization: `Bearer ${mockToken}` }),
      }));
      expect(result.current.favoriteStations).toEqual([]);
      expect(result.current.isFavorite(mockStationId1)).toBe(false);
    });

    it('fetchFavoriteStations should handle API error gracefully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await waitForNextUpdate(); // Initial load completes

      // Make the specific fetch for favorites fail
      (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
          if (url.includes('/api/me/favorites')) {
              return Promise.resolve({ ok: false, status: 500, json: async () => ({ message: "Server Error" }) });
          }
           // Fallback for other fetches like allStations during initial load
          return Promise.resolve({ ok: true, json: async () => mockAllStations });
      });

      await act(async () => {
        await result.current.fetchFavoriteStations();
      });

      // Favorites should not change from their initial state (empty in this setup)
      // And no unhandled promise rejection should occur. Alert is called.
      expect(result.current.favoriteStations).toEqual([]);
      // Check if Alert was called (tricky to test directly without mocking Alert)
      // For now, rely on console.error being called (which we mocked)
      expect(console.error).toHaveBeenCalledWith('Fetch favorites error:', expect.any(Error));
    });

     it('should log out user if fetchFavoriteStations returns 401', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await waitForNextUpdate(); // Initial load

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/me/favorites')) {
          return Promise.resolve({ ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) });
        }
        // Fallback for allStationsCache if it's fetched again or part of the test setup
        if (url.includes('/api/stations/live')) {
            return Promise.resolve({ ok: true, json: async () => mockAllStations });
        }
        return Promise.resolve({ ok: false, json: async () => ({ message: 'Unhandled fetch' }) });
      });

      await act(async () => {
        await result.current.fetchFavoriteStations();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_jwt_token');
    });

  });

  // Basic tests for Station List functions (can be expanded)
  describe('Station Lists', () => {
     beforeEach(async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(mockToken).mockResolvedValueOnce(mockEmail);
        (global.fetch as jest.Mock)
            .mockImplementationOnce((url:string) => { // allStationsCache
                if (url.includes('/api/stations/live')) return Promise.resolve({ ok: true, json: async () => mockAllStations });
                return Promise.resolve({ ok: false, json: async () => ({}) });
            })
            .mockImplementationOnce((url:string) => { // initial fetchFavoriteStationsInternal
                if (url.includes('/api/me/favorites')) return Promise.resolve({ ok: true, json: async () => [] });
                return Promise.resolve({ ok: false, json: async () => ({}) });
            })
            .mockImplementationOnce((url:string) => { // initial fetchStationListsInternal
                if (url.includes('/api/me/lists')) return Promise.resolve({ ok: true, json: async () => [] }); // Start with no lists
                return Promise.resolve({ ok: false, json: async () => ({}) });
            });
    });

    it('createStationList should POST to API and update state', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      await waitForNextUpdate(); // Initial load

      const newListData = { id: 'list1', name: 'New List', stationIds: [] };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => newListData,
      });

      let createdList;
      await act(async () => {
        createdList = await result.current.createStationList('New List');
      });

      expect(global.fetch).toHaveBeenCalledWith(`${serverUrl}/api/me/lists`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New List' }),
      }));
      expect(result.current.stationLists).toContainEqual(newListData);
      expect(createdList).toEqual(newListData);
    });
  });

  // TODO: Add more tests for other functions in AuthContext if time permits,
  // e.g., error handling in each API call, other station list operations, recently played.
});
