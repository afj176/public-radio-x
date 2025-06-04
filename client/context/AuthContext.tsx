import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'user_jwt_token';
const USER_EMAIL_KEY = 'user_email'; // For displaying user email

const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';


import { Station } from '@/models/Station'; // Assuming Station interface is defined here or can be imported

interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, token: string) => Promise<void>;
  favoriteStations: Station[];
  isLoadingFavorites: boolean;
  fetchFavoriteStations: () => Promise<void>;
  addFavoriteStation: (stationId: string) => Promise<void>;
  removeFavoriteStation: (stationId: string) => Promise<void>;
  isFavorite: (stationId: string) => boolean;

  // Station List Management
  stationLists: StationList[];
  isLoadingStationLists: boolean;
  currentStationListDetail: StationList | null; // For viewing/editing a specific list
  fetchStationLists: () => Promise<void>;
  createStationList: (name: string) => Promise<StationList | null>;
  updateStationList: (listId: string, name: string) => Promise<StationList | null>;
  deleteStationList: (listId: string) => Promise<boolean>;
  addStationToList: (listId: string, stationId: string) => Promise<StationList | null>;
  removeStationFromList: (listId: string, stationId: string) => Promise<StationList | null>;
  fetchStationListDetail: (listId: string) => Promise<void>; // To get a specific list
}

// Import StationList model
import { StationList } from '@/models/StationList';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial auth token loading

  // Favorites state
  const [favoriteStations, setFavoriteStations] = useState<Station[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  // Station Lists state
  const [stationLists, setStationLists] = useState<StationList[]>([]);
  const [isLoadingStationLists, setIsLoadingStationLists] = useState(false);
  const [currentStationListDetail, setCurrentStationListDetail] = useState<StationList | null>(null);


  useEffect(() => {
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedEmail = await SecureStore.getItemAsync(USER_EMAIL_KEY);
        if (storedToken) {
          setToken(storedToken);
          setUserEmail(storedEmail);
          // After setting token, fetch initial favorites & lists
          await fetchFavoriteStationsInternal(storedToken);
          await fetchStationListsInternal(storedToken); // Fetch lists on load
        }
      } catch (e) {
        console.error('Failed to load auth data:', e);
        await SecureStore.deleteItemAsync(TOKEN_KEY); // Clear potentially corrupt data
        await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
        setToken(null);
        setUserEmail(null);
        setFavoriteStations([]); // Clear favorites if auth fails
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthData();
  }, []);

  const login = async (email: string, newToken: string) => {
    setIsLoading(true); // For auth state change
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(USER_EMAIL_KEY, email);
    setToken(newToken);
    setUserEmail(email);
    await fetchFavoriteStationsInternal(newToken); // Fetch favorites on login
    await fetchStationListsInternal(newToken); // Fetch lists on login
    setIsLoading(false);
  };

  const register = async (email: string, newToken: string) => {
    // For this app, registration immediately logs the user in
    await login(email, newToken);
  };

  const logout = async () => {
    setIsLoading(true); // For auth state change
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
    setToken(null);
    setUserEmail(null);
    setFavoriteStations([]); // Clear favorites on logout
    setStationLists([]); // Clear station lists on logout
    setCurrentStationListDetail(null);
    setIsLoading(false);
  };

  // --- Favorites Internal ---
  const fetchFavoriteStationsInternal = async (currentToken: string | null) => {
    if (!currentToken) {
      setFavoriteStations([]);
      return;
    }
    setIsLoadingFavorites(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/me/favorites`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) { // Handle token expiry or invalidation
          console.warn('Token invalid, logging out for safety.');
          await logout(); // Force logout
          return;
        }
        throw new Error('Failed to fetch favorites');
      }
      const data: Station[] = await response.json();
      setFavoriteStations(data);
    } catch (error: any) {
      console.error('Fetch favorites error:', error);
      if (response && response.status !== 401) { // response might be undefined if network error
        Alert.alert('Error', 'Could not load your favorite stations. Please try again later.');
      }
      // Don't clear favorites on fetch error, could be temporary network issue
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  // Exposed fetch function
  const fetchFavoriteStations = async () => {
    await fetchFavoriteStationsInternal(token);
  };

  const addFavoriteStation = async (stationId: string) => {
    if (!token) return;
    setIsLoadingFavorites(true); // Or a more specific loading state
    try {
      const response = await fetch(`${SERVER_URL}/api/me/favorites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stationId }),
      });
      if (!response.ok) throw new Error('Failed to add favorite');
      const updatedFavorites: Station[] = await response.json();
      setFavoriteStations(updatedFavorites);
    } catch (error) {
      console.error('Add favorite error:', error);
      Alert.alert('Error', 'Could not add station to favorites.');
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const removeFavoriteStation = async (stationId: string) => {
    if (!token) return;
    setIsLoadingFavorites(true); // Or a more specific loading state
    try {
      const response = await fetch(`${SERVER_URL}/api/me/favorites/${stationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to remove favorite');
      const updatedFavorites: Station[] = await response.json();
      setFavoriteStations(updatedFavorites);
    } catch (error) {
      console.error('Remove favorite error:', error);
      Alert.alert('Error', 'Could not remove station from favorites.');
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const isFavorite = (stationId: string): boolean => {
    return favoriteStations.some(fav => fav.id === stationId);
  };

  // --- Station List Management ---
  const fetchStationListsInternal = async (currentToken: string | null) => {
    if (!currentToken) {
      setStationLists([]);
      return;
    }
    setIsLoadingStationLists(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/me/lists`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!response.ok) {
         if (response.status === 401) { await logout(); return; }
        throw new Error('Failed to fetch station lists');
      }
      const data: StationList[] = await response.json();
      setStationLists(data);
    } catch (error: any) {
      console.error('Fetch station lists error:', error);
      if (response && response.status !== 401) { // response might be undefined
         Alert.alert('Error', 'Could not load your custom lists. Please try again later.');
      }
    } finally {
      setIsLoadingStationLists(false);
    }
  };

  const fetchStationLists = async () => {
    await fetchStationListsInternal(token);
  };

  const fetchStationListDetail = async (listId: string) => {
    if (!token) return;
    setIsLoadingStationLists(true); // Or a specific detail loading state
    try {
      const response = await fetch(`${SERVER_URL}/api/me/lists/${listId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401) { await logout(); return; }
        throw new Error('Failed to fetch list details');
      }
      const data: StationList = await response.json();
      setCurrentStationListDetail(data);
      return data; // Return for immediate use if needed
    } catch (error) {
      console.error(`Error fetching list ${listId}:`, error);
      setCurrentStationListDetail(null); // Clear if error
      Alert.alert('Error', `Could not fetch details for list ${listId}.`);
      return null;
    } finally {
      setIsLoadingStationLists(false);
    }
  };

  const createStationList = async (name: string): Promise<StationList | null> => {
    if (!token) return null;
    setIsLoadingStationLists(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/me/lists`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to create list');
      const newList: StationList = await response.json();
      setStationLists(prev => [...prev, newList]);
      return newList;
    } catch (error) {
      console.error('Create list error:', error);
      Alert.alert('Error', 'Could not create station list.');
      return null;
    } finally {
      setIsLoadingStationLists(false);
    }
  };

  const updateStationList = async (listId: string, name: string): Promise<StationList | null> => {
    if (!token) return null;
    setIsLoadingStationLists(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/me/lists/${listId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to update list');
      const updatedList: StationList = await response.json();
      setStationLists(prev => prev.map(l => l.id === listId ? updatedList : l));
      if (currentStationListDetail?.id === listId) setCurrentStationListDetail(updatedList);
      return updatedList;
    } catch (error) {
      console.error('Update list error:', error);
      Alert.alert('Error', 'Could not update station list.');
      return null;
    } finally {
      setIsLoadingStationLists(false);
    }
  };

  const deleteStationList = async (listId: string): Promise<boolean> => {
    if (!token) return false;
    setIsLoadingStationLists(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/me/lists/${listId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete list');
      setStationLists(prev => prev.filter(l => l.id !== listId));
      if (currentStationListDetail?.id === listId) setCurrentStationListDetail(null);
      return true;
    } catch (error) {
      console.error('Delete list error:', error);
      Alert.alert('Error', 'Could not delete station list.');
      return false;
    } finally {
      setIsLoadingStationLists(false);
    }
  };

  const addStationToList = async (listId: string, stationId: string): Promise<StationList | null> => {
    if (!token) return null;
    // Consider a specific loading state for list modification vs general list loading
    setIsLoadingStationLists(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/me/lists/${listId}/stations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({message: 'Failed to add station to list'}));
        throw new Error(errData.message);
      }
      const updatedList: StationList = await response.json();
      setStationLists(prev => prev.map(l => l.id === listId ? updatedList : l));
      if (currentStationListDetail?.id === listId) setCurrentStationListDetail(updatedList);
      return updatedList;
    } catch (error: any) {
      console.error('Add station to list error:', error);
      Alert.alert('Error', error.message || 'Could not add station to list.');
      return null;
    } finally {
      setIsLoadingStationLists(false);
    }
  };

  const removeStationFromList = async (listId: string, stationId: string): Promise<StationList | null> => {
    if (!token) return null;
    setIsLoadingStationLists(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/me/lists/${listId}/stations/${stationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
         const errData = await response.json().catch(() => ({message: 'Failed to remove station from list'}));
        throw new Error(errData.message);
      }
      const updatedList: StationList = await response.json();
      setStationLists(prev => prev.map(l => l.id === listId ? updatedList : l));
      if (currentStationListDetail?.id === listId) setCurrentStationListDetail(updatedList);
      return updatedList;
    } catch (error: any) {
      console.error('Remove station from list error:', error);
      Alert.alert('Error', error.message || 'Could not remove station from list.');
      return null;
    } finally {
      setIsLoadingStationLists(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userEmail,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        register,
        favoriteStations,
        isLoadingFavorites,
        fetchFavoriteStations,
        addFavoriteStation,
        removeFavoriteStation,
        isFavorite,
        // Station List Props
        stationLists,
        isLoadingStationLists,
        currentStationListDetail,
        fetchStationLists,
        createStationList,
        updateStationList,
        deleteStationList,
        addStationToList,
        removeStationFromList,
        fetchStationListDetail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Make sure Alert is imported if not already
import { Alert } from 'react-native';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Define Station interface if not imported from a central place
// For now, defining it here for context self-containment if needed for the diff
// Though ideally it would be imported from '@/models/Station'
// interface Station {
//   id: string;
//   name: string;
//   streamUrl: string;
//   genre: string;
// }
