import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Button as RNButton } from 'react-native';
import { Text, View } from '@/components/Themed';
import Player from '@/components/Player';
import { useAuth } from '@/context/AuthContext';
import { Station } from '@/models/Station';
import { useLocalSearchParams, useRouter } from 'expo-router'; // For add-to-list mode

// Simple Heart Icon (or use an icon library like @expo/vector-icons)
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <Text style={filled ? styles.heartFilled : styles.heartOutline}>{filled ? '♥' : '♡'}</Text>
);

export default function TabOneScreen() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedStationToPlay, setSelectedStationToPlay] = useState<Station | null>(null); // Renamed for clarity
  const {
    userEmail,
    logout,
    isLoading: authLoading,
    // Favorites
    favoriteStations,
    addFavoriteStation,
    removeFavoriteStation,
    isFavorite,
    isLoadingFavorites,
    // Station Lists
    addStationToList, // New from AuthContext
    isLoadingStationLists, // To disable buttons during list operations
  } = useAuth();

  const router = useRouter();
  const params = useLocalSearchParams<{ listIdToAddTo?: string; listName?: string }>();
  const { listIdToAddTo, listName: listNameParam } = params;
  const isAddToMode = !!listIdToAddTo;

  useEffect(() => {
    // Fetch all stations (public list)
    const fetchAllStations = async () => {
      setLoadingStations(true);
      try {
        const response = await fetch(`${SERVER_URL}/api/stations`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setStations(data);
      } catch (e: any) {
        setFetchError(e.message || 'Failed to fetch stations');
        Alert.alert('Error Fetching Stations', e.message || 'Failed to fetch stations');
      } finally {
        setLoadingStations(false);
      }
    };

    fetchAllStations();
  }, []);

  const handleToggleFavorite = useCallback(async (stationId: string) => {
    if (isLoadingFavorites) return; // Prevent multiple rapid clicks

    if (isFavorite(stationId)) {
      await removeFavoriteStation(stationId);
      // Optionally show a toast/alert: "Removed from favorites"
    } else {
      await addFavoriteStation(stationId);
      // Optionally show a toast/alert: "Added to favorites"
    }
  }, [isFavorite, addFavoriteStation, removeFavoriteStation, isLoadingFavorites]);

  if (authLoading || loadingStations) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading data...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error fetching stations: {fetchError}</Text>
      </View>
    );
  }

  const handleStationPress = async (station: Station) => {
    if (isAddToMode && listIdToAddTo) {
      Alert.alert(
        `Add to ${listNameParam || 'list'}?`,
        `Add "${station.name}" to this list?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add",
            onPress: async () => {
              const result = await addStationToList(listIdToAddTo, station.id);
              if (result) Alert.alert("Success", `"${station.name}" added to "${listNameParam || 'list'}".`);
              // No router.back() here, user can add multiple or explicitly go back
            }
          }
        ]
      );
    } else {
      setSelectedStationToPlay(station); // Normal play behavior
    }
  };

  const renderStationItem = ({ item }: { item: Station }) => {
    const isFav = isFavorite(item.id);
    return (
      <View style={styles.stationItemContainer}>
        <TouchableOpacity onPress={() => handleStationPress(item)} style={styles.stationTouchable}>
          <View style={[styles.stationInfo, selectedStationToPlay?.id === item.id && !isAddToMode && styles.selectedStationItem]}>
            <Text style={styles.stationName}>{item.name}</Text>
            <Text style={styles.stationGenre}>{item.genre}</Text>
          </View>
        </TouchableOpacity>
        {!isAddToMode && ( // Only show favorite button if not in "add to list" mode
          <TouchableOpacity onPress={() => handleToggleFavorite(item.id)} style={styles.favoriteButton} disabled={isLoadingFavorites || isLoadingStationLists}>
             <HeartIcon filled={isFav} />
          </TouchableOpacity>
        )}
         {isAddToMode && ( // Show a simple "+" icon or button in "add to list" mode
          <TouchableOpacity onPress={() => handleStationPress(item)} style={styles.favoriteButton} disabled={isLoadingStationLists}>
            <FontAwesome name="plus-circle" size={24} color="green" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">{userEmail || 'Not logged in'}</Text>
        {userEmail && !isAddToMode && <RNButton title="Logout" onPress={logout} color="#FF6347" />}
        {isAddToMode && <RNButton title="Done Adding" onPress={() => router.back()} />}
      </View>

      {isAddToMode && listNameParam && (
        <Text style={styles.addingToListBanner}>
          Adding to: <Text style={{fontWeight: 'bold'}}>{listNameParam}</Text> (Tap station to add)
        </Text>
      )}

      <Text style={styles.title}>Available Radio Stations</Text>
      <FlatList
        data={stations}
        keyExtractor={(item) => item.id}
        renderItem={renderStationItem}
        ListEmptyComponent={<Text>No stations available.</Text>}
        extraData={{ favorites: favoriteStations, selectedToPlay: selectedStationToPlay, isAddToMode }}
      />
      {selectedStationToPlay && !isAddToMode && <Player station={selectedStationToPlay} />}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  addingToListBanner: {
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#e0f7fa', // Light blue
    color: '#00796b', // Darker cyan
    fontSize: 16,
    marginBottom: 10,
    borderRadius: 5,
  },
  stationItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stationTouchable: {
    flex: 1,
  },
  stationInfo: {
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  selectedStationItem: {
    backgroundColor: '#e0e0e0',
  },
  stationName: {
    fontSize: 18,
    fontWeight: '500',
  },
  stationGenre: {
    fontSize: 14,
    color: '#666',
  },
  favoriteButton: {
    padding: 15, // Make it easy to tap
  },
  heartOutline: {
    fontSize: 24,
    color: '#aaa',
  },
  heartFilled: {
    fontSize: 24,
    color: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});
