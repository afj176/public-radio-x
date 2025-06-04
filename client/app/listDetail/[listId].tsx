import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Button, Platform } from 'react-native'; // Added Platform
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Station } from '@/models/Station'; // Assuming this path is correct
import FontAwesome from '@expo/vector-icons/FontAwesome';

// This screen needs access to all stations to display details from stationIds
// For now, we'll fetch all stations here. In a larger app, this might come from a global state/cache.
const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const {
    currentStationListDetail,
    fetchStationListDetail,
    removeStationFromList,
    isLoadingStationLists,
    stationLists, // To get the list name initially or if currentStationListDetail is null
  } = useAuth();

  const [allStations, setAllStations] = useState<Station[]>([]);
  const [isLoadingAllStations, setIsLoadingAllStations] = useState(true);

  // Fetch all stations (public list) - needed to display station details from IDs
  useEffect(() => {
    const fetchStationsData = async () => {
      setIsLoadingAllStations(true);
      try {
        const response = await fetch(`${SERVER_URL}/api/stations`);
        if (!response.ok) throw new Error('Failed to fetch all stations');
        const data = await response.json();
        setAllStations(data);
      } catch (error) {
        console.error('Error fetching all stations:', error);
        Alert.alert('Error', 'Could not load station data.');
      } finally {
        setIsLoadingAllStations(false);
      }
    };
    fetchStationsData();
  }, []);

  useEffect(() => {
    if (listId) {
      fetchStationListDetail(listId);
    }
  }, [listId, fetchStationListDetail]);

  const handleRemoveStation = useCallback(async (stationIdToRemove: string) => {
    if (!listId || isLoadingStationLists) return;
    Alert.alert(
      "Confirm Removal",
      "Are you sure you want to remove this station from the list?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeStationFromList(listId, stationIdToRemove) }
      ]
    );
  }, [listId, removeStationFromList, isLoadingStationLists]);

  // Get the list name from stationLists first, then update if currentStationListDetail loads
  const list = stationLists.find(l => l.id === listId);
  const listName = currentStationListDetail?.name || list?.name || 'List Details';

  if (isLoadingAllStations || (isLoadingStationLists && !currentStationListDetail)) {
    return <View style={styles.centered}><ActivityIndicator size="large" /><Text>Loading list details...</Text></View>;
  }

  if (!currentStationListDetail && !isLoadingStationLists) { // Finished loading but no detail
    return <View style={styles.centered}><Text style={styles.errorText}>List not found.</Text></View>;
  }

  const stationsInList = currentStationListDetail?.stationIds
    .map(id => allStations.find(s => s.id === id))
    .filter(s => s !== undefined) as Station[] | undefined || [];


  return (
    <View style={styles.container}>
      <Text style={styles.title}>{listName}</Text>
      {stationsInList.length === 0 ? (
        <Text style={styles.emptyMessage}>This list is empty. Add some stations!</Text>
      ) : (
        <FlatList
          data={stationsInList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.stationItem}>
              <View style={styles.stationInfo}>
                <Text style={styles.stationName}>{item.name}</Text>
                <Text style={styles.stationGenre}>{item.genre}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveStation(item.id)} style={styles.iconButton} disabled={isLoadingStationLists}>
                <FontAwesome name="trash" size={22} color="red" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
       {/* Button to navigate to a screen for adding stations to this list */}
       <Button
        title="Add Stations to this List"
        onPress={() => router.push({ pathname: '/(tabs)', params: { listIdToAddTo: listId, listName: listName }})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  stationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 5,
  },
  stationInfo: { flex: 1 },
  stationName: { fontSize: 18 },
  stationGenre: { fontSize: 14, color: 'gray' },
  iconButton: { padding: 10 },
  emptyMessage: { textAlign: 'center', marginTop: 20, fontSize: 16, color: 'gray' },
  errorText: { color: 'red', fontSize: 18, textAlign: 'center' },
});
