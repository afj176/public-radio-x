import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Button as RNButton, TextInput, ScrollView, Switch, Image } from 'react-native';
// Import View and Text from react-native directly to avoid issues with Themed components for now
// import { Text, View } from '@/components/Themed';
import { View, Text } from 'react-native'; // Using default RN View/Text for simpler theme application
import Player from '@/components/Player';
import RecentlyPlayedList from '@/components/RecentlyPlayedList';
import { useAuth } from '@/context/AuthContext';
import { Station } from '@/models/Station'; // Updated Station model
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '@/context/ThemeContext';
import { typography, shadows as staticShadows } from '@/styles/theme'; // Import static parts of theme

import { Animated, Pressable } from 'react-native'; // Import Animated and Pressable

// Updated Heart Icon using theme colors and FontAwesome with animation
const HeartIcon = ({ filled, currentColors, onPress }: { filled: boolean, currentColors: any, onPress?: () => void }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (onPress) onPress(); // Call the original onPress if provided

    // Trigger animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <FontAwesome
          name={filled ? "heart" : "heart-o"}
          size={22}
          color={filled ? currentColors.error : currentColors.subtleText}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function TabOneScreen() {
  const { colors, themeMode, setThemeMode } = useTheme(); // Use our theme context
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(false); // Initially false, true during fetch
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedStationToPlay, setSelectedStationToPlay] = useState<Station | null>(null);

  // States for new backend search
  const [nameSearch, setNameSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  // Debounce timer id
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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
    addStationToList,
    isLoadingStationLists,
  } = useAuth();

  const router = useRouter();
  const params = useLocalSearchParams<{ listIdToAddTo?: string; listName?: string }>();
  const { listIdToAddTo, listName: listNameParam } = params;
  const isAddToMode = !!listIdToAddTo;

  // Function to fetch stations with current filters
  const fetchStationsWithFilters = useCallback(async (name: string, tag: string) => {
    setLoadingStations(true);
    setFetchError(null);
    let queryParams = `limit=150`;
    if (name) queryParams += `&name=${encodeURIComponent(name)}`;
    if (tag) queryParams += `&tag=${encodeURIComponent(tag)}`;

    try {
      const apiUrl = Platform.OS === 'android' ? `http://10.0.2.2:3000/api/stations/live?${queryParams}` : `http://localhost:3000/api/stations/live?${queryParams}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
      }
      const data: Station[] = await response.json();
      setAllStations(data);
    } catch (e: any) {
      console.error('Fetch error:', e);
      setFetchError(e.message || 'Failed to fetch stations.');
      // Alert.alert('Error Fetching Stations', e.message || 'An unexpected error occurred.');
      setAllStations([]); // Clear stations on error
    } finally {
      setLoadingStations(false);
    }
  }, []);

  // Initial fetch and debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    // Start loading only if we are about to make a call
    // This prevents loading indicator on initial mount if nameSearch and tagSearch are empty
    // and we decide not to fetch initially.
    if (nameSearch || tagSearch) {
        setLoadingStations(true);
    } else {
        // If both are empty, fetch general list (or don't, depending on desired initial state)
        // For now, let's fetch general list if both are empty (initial load / clear filters)
        setLoadingStations(true);
    }


    debounceTimer.current = setTimeout(() => {
      fetchStationsWithFilters(nameSearch, tagSearch);
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [nameSearch, tagSearch, fetchStationsWithFilters]);

  const handleToggleFavorite = useCallback(async (stationuuid: string) => {
    if (isLoadingFavorites) return;

    const station = allStations.find(s => s.stationuuid === stationuuid);
    if (!station) {
      Alert.alert("Error", "Station not found.");
      return;
    }

    if (isFavorite(stationuuid)) {
      await removeFavoriteStation(stationuuid);
    } else {
      // Assuming addFavoriteStation now expects a Station object or stationuuid
      // If it expects the full object and you only have ID, you might need to find it
      await addFavoriteStation(station); // Or adjust if it only needs stationuuid
    }
  }, [isFavorite, addFavoriteStation, removeFavoriteStation, isLoadingFavorites, allStations]);

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
      // Prevent playing when in add to list mode, directly try to add
      Alert.alert(
        `Add to ${listNameParam || 'list'}?`,
        `Add "${station.name}" to this list?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add",
            onPress: async () => {
              // Assuming addStationToList now expects stationuuid or the full Station object
              const result = await addStationToList(listIdToAddTo, station.stationuuid, station);
              if (result) Alert.alert("Success", `"${station.name}" added to "${listNameParam || 'list'}".`);
            }
          }
        ]
      );
    } else {
      setSelectedStationToPlay(station); // Normal play behavior
    }
  };

  // Client-side filtering is removed. The list will directly use `allStations` from the backend.
  // const uniqueGenres = useMemo(() => { ... });
  // const filteredStations = useMemo(() => { ... });

  const renderStationItem = ({ item }: { item: Station }) => {
    const isFav = isFavorite(item.stationuuid);

    const itemScale = React.useRef(new Animated.Value(1)).current;

    const onPressInItem = () => Animated.timing(itemScale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
    const onPressOutItem = () => Animated.timing(itemScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    return (
      <Pressable onPressIn={onPressInItem} onPressOut={onPressOutItem} onPress={() => handleStationPress(item)}>
        <Animated.View style={[
          styles.stationItemContainer,
          {
            backgroundColor: colors.cardBackground,
            ...staticShadows.card, // Use static shadow from theme import
            transform: [{ scale: itemScale }]
          }
        ]}>
          {item.favicon ? (
            <Image source={{ uri: item.favicon }} style={styles.favicon} onError={(e) => console.log("Failed to load favicon:", e.nativeEvent.error, item.favicon)} />
          ) : (
            <View style={styles.faviconPlaceholder} /> // Placeholder for alignment
          )}
          <View style={styles.stationInfo}>
            <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
            <Text style={[styles.stationDetails, { color: colors.subtleText }]} numberOfLines={1} ellipsizeMode="tail">
              {item.tags?.split(',')[0] || item.codec || 'N/A'}
              {item.country ? ` - ${item.country}` : ''}
            </Text>
          </View>
          <View style={styles.stationActions}>
            {!isAddToMode && userEmail && ( // Only show heart if logged in
              <HeartIcon
                filled={isFav}
                currentColors={colors}
                onPress={() => handleToggleFavorite(item.stationuuid)}
              />
            )}
            {isAddToMode && userEmail && ( // Only show add if logged in
              <TouchableOpacity onPress={() => handleStationPress(item)} style={styles.iconButton} disabled={isLoadingStationLists}>
                <FontAwesome name="plus-circle" size={26} color={colors.success} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const clearFilters = () => {
    setNameSearch('');
    setTagSearch('');
    // Fetching will be triggered by the useEffect hook watching nameSearch and tagSearch
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.userEmail, {color: colors.text}]} numberOfLines={1} ellipsizeMode="tail">
          {userEmail || 'Not logged in'}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{color: colors.text, marginRight: 5}}>{themeMode === 'light' ? 'Dark' : 'Light'} Mode</Text>
            <Switch value={themeMode === 'dark'} onValueChange={toggleTheme} trackColor={{false: colors.mediumGray, true: colors.primary}} thumbColor={colors.cardBackground} />
            {userEmail && !isAddToMode && <RNButton title="Logout" onPress={logout} color={colors.error} />}
        </View>
        {isAddToMode && <RNButton title="Done" onPress={() => router.back()} color={colors.primary} />}
      </View>

      {isAddToMode && listNameParam && (
        <View style={[styles.addingToListBanner, { backgroundColor: colors.primary_light || '#E3F2FD'}]}>
             <Text style={{color: colors.primary_dark || colors.primary, fontWeight: typography.fontWeights.medium }}>
                Adding to: <Text style={{fontWeight: typography.fontWeights.bold}}>{listNameParam}</Text>
             </Text>
        </View>
      )}

      {!isAddToMode && <RecentlyPlayedList onStationSelect={setSelectedStationToPlay} />}

      <Text style={[styles.title, {color: colors.text}]}>Available Stations</Text>

      <View style={[styles.filtersContainer, { borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text }]}
          placeholder="Search by station name..."
          placeholderTextColor={colors.placeholderText}
          value={nameSearch}
          onChangeText={setNameSearch}
        />
        <TextInput // New TextInput for tag search
          style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text }]}
          placeholder="Search by tag/genre..."
          placeholderTextColor={colors.placeholderText}
          value={tagSearch}
          onChangeText={setTagSearch}
        />
        {(nameSearch !== '' || tagSearch !== '') && (
            <RNButton title="Clear Filters" onPress={clearFilters} color={colors.subtleText} />
        )}
      </View>

      {loadingStations && allStations.length === 0 ? ( // Show loading only if list is empty
         <View style={[styles.centered, {backgroundColor: colors.background}]}><ActivityIndicator size="large" color={colors.primary} /><Text style={{color: colors.text, marginTop: 10}}>Loading stations...</Text></View>
      ) : !loadingStations && allStations.length === 0 ? ( // Not loading, and still no stations
        <Text style={[styles.noResultsText, {color: colors.subtleText}]}>
          {fetchError ? `Error: ${fetchError}` : 'No stations found. Try different search terms.'}
        </Text>
      ) : (
        <FlatList
          data={allStations} // Use allStations directly as it's filtered by backend
          keyExtractor={(item) => item.stationuuid}
          renderItem={renderStationItem}
          ListEmptyComponent={
            !loadingStations && ( // Only show if not loading
                <Text style={[styles.noResultsText, {color: colors.subtleText}]}>
                    {fetchError ? `Error: ${fetchError}` : 'No stations found for your search.'}
                </Text>
            )
          }
          // extraData is used to trigger re-renders if these values change and affect rendering.
          // Since filtering is now backend, only include things that directly affect item rendering if any.
          // For now, colors (theme) and favorite status are relevant.
          extraData={{ favorites: favoriteStations, themeMode, colors }}
        />
      )}
      {selectedStationToPlay && !isAddToMode && <Player station={selectedStationToPlay} />}
    </View>
  );
}

// Note: Styles that use theme colors directly (e.g., theme.colors.primary)
// have been updated to use `colors.primary` from `useTheme()` within the component.
// Styles that were previously hardcoded or used the old `theme` object need to be updated.
// For brevity, I'm focusing on the direct application of `colors` from `useTheme()`.
// A full refactor would involve passing `colors` to all styles or using a styled-components approach with ThemeProvider.

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: { // Base container, background set dynamically
    flex: 1,
    paddingHorizontal: 10, // theme.spacing.md
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // theme.spacing.md
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
    marginBottom: 10, // theme.spacing.md
  },
  userEmail: {
    fontSize: 16, // theme.typography.fontSizes.md
    fontWeight: '600', // theme.typography.fontWeights.semiBold
    flexShrink: 1,
    marginRight: 10, // theme.spacing.sm
  },
  title: {
    fontSize: 24, // theme.typography.fontSizes.xl
    fontWeight: '700', // theme.typography.fontWeights.bold
    textAlign: 'center',
    marginBottom: 10, // theme.spacing.md
  },
  filtersContainer: {
    paddingVertical: 10, // theme.spacing.md
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
    marginBottom: 10, // theme.spacing.md
  },
  searchInput: { // Styles updated to use dynamic colors
    height: 45,
    borderWidth: 1,
    borderRadius: 8, // theme.borderRadius.md
    paddingHorizontal: 16, // theme.spacing.md
    marginBottom: 16, // theme.spacing.md
    fontSize: 16, // theme.typography.fontSizes.md
  },
  genreFilterTitle: { // Styles updated
    fontSize: 16, // theme.typography.fontSizes.md
    fontWeight: '500', // theme.typography.fontWeights.medium
    marginBottom: 8, // theme.spacing.sm
  },
  genreScrollView: {
    marginBottom: 16, // theme.spacing.md
    paddingLeft: 4, // theme.spacing.xs
  },
  genreButton: { // Styles updated
    paddingHorizontal: 16, // theme.spacing.md
    paddingVertical: 8, // theme.spacing.sm
    borderWidth: 1,
    borderRadius: 20, // theme.borderRadius.round
    marginRight: 8, // theme.spacing.sm
  },
  // genreButtonSelected backgroundColor set dynamically
  genreButtonText: { // Styles updated
    fontWeight: '500', // theme.typography.fontWeights.medium
  },
  // genreButtonTextSelected color set dynamically
  noResultsText: { // Styles updated
    textAlign: 'center',
    marginTop: 24, // theme.spacing.lg
    fontSize: 16, // theme.typography.fontSizes.md
  },
  addingToListBanner: {
    textAlign: 'center',
    padding: 16, // theme.spacing.md
    fontSize: 16, // theme.typography.fontSizes.md
    marginBottom: 16, // theme.spacing.md
    borderRadius: 8, // theme.borderRadius.md
  },
  stationItemContainer: { // Card-like style, backgroundColor and shadow set dynamically
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8, // theme.borderRadius.md
    padding: 8, // theme.spacing.sm
    marginBottom: 16, // theme.spacing.md
    // Shadow applied dynamically
  },
  stationTouchable: {
    flex: 1,
  },
  stationInfo: {
    flex: 1, // Allow text to take available space
    paddingLeft: 8, // theme.spacing.sm
    paddingRight: 8, // Add some padding to not touch actions too quickly
    paddingVertical: 4, // theme.spacing.xs
  },
  favicon: {
    width: 24,
    height: 24,
    marginRight: 8, // spacing.sm
    borderRadius: 4, // borderRadius.xs
  },
  faviconPlaceholder: {
    width: 24, // Same as favicon
    height: 24, // Same as favicon
    marginRight: 8, // Same as favicon
    // backgroundColor: '#eee', // Optional: to visualize placeholder
  },
  selectedStationPlayItem: {
    // Example: might add a border or different shadow if selected
    // borderColor: colors.primary, // This would need 'colors' from useTheme
    // borderWidth: 1,
  },
  stationName: { // Styles updated
    fontSize: 18, // theme.typography.fontSizes.lg
    fontWeight: '500', // theme.typography.fontWeights.medium
    flexShrink: 1, // Ensure text doesn't push icons out
  },
  stationDetails: { // For genre/country line
    fontSize: 13, // theme.typography.fontSizes.sm
    flexShrink: 1,
  },
  stationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8, // theme.spacing.sm
  },
  iconButton: {
    padding: 8, // theme.spacing.sm
  },
  errorText: { // Styles updated
    fontSize: 16,
  },
});
