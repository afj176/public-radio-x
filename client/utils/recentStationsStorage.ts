import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_STATIONS_KEY = 'recent_stations';
export const MAX_RECENT_STATIONS = 10;

/**
 * Fetches the list of recently played station IDs from AsyncStorage.
 * @returns {Promise<string[]>} A promise that resolves to an array of station IDs.
 */
export const getRecentStations = async (): Promise<string[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(RECENT_STATIONS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to fetch recent stations from storage', e);
    return [];
  }
};

/**
 * Adds a station ID to the list of recently played stations.
 * Moves the station to the top if it already exists.
 * Limits the list to MAX_RECENT_STATIONS.
 * @param {string} stationId - The ID of the station to add.
 * @returns {Promise<void>}
 */
export const addStationToRecents = async (stationId: string): Promise<void> => {
  if (!stationId) return;

  try {
    let currentRecents = await getRecentStations();
    // Remove the stationId if it already exists to move it to the top
    currentRecents = currentRecents.filter(id => id !== stationId);
    // Add the new stationId to the beginning
    currentRecents.unshift(stationId);
    // Limit the list size
    currentRecents = currentRecents.slice(0, MAX_RECENT_STATIONS);

    const jsonValue = JSON.stringify(currentRecents);
    await AsyncStorage.setItem(RECENT_STATIONS_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to add station to recents in storage', e);
  }
};

/**
 * Clears all recently played stations from storage.
 * (Optional utility, not strictly required by the task but useful for testing/dev)
 * @returns {Promise<void>}
 */
export const clearRecentStations = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(RECENT_STATIONS_KEY);
    } catch (e) {
        console.error('Failed to clear recent stations from storage', e);
    }
};
