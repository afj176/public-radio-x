import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Button as RNButton, TextInput, ScrollView, Switch } from 'react-native';
// Import View and Text from react-native directly to avoid issues with Themed components for now
// import { Text, View } from '@/components/Themed';
import { View, Text } from 'react-native'; // Using default RN View/Text for simpler theme application
import Player from '@/components/Player';
import RecentlyPlayedList from '@/components/RecentlyPlayedList';
import { useAuth } from '@/context/AuthContext';
import { Station } from '@/models/Station';
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
  const [loadingStations, setLoadingStations] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedStationToPlay, setSelectedStationToPlay] = useState<Station | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

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

  // Removed one of the duplicate useEffect for fetchStationsData
  useEffect(() => {
    const fetchStationsData = async () => {
      setLoadingStations(true);
      try {
        // const response = await fetch(`${SERVER_URL}/api/stations`); // SERVER_URL needs to be defined
        // For now, assuming SERVER_URL is defined globally or replace with actual URL
        const response = await fetch(Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/stations' : 'http://localhost:3000/api/stations');

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: Station[] = await response.json();
        setAllStations(data);
      } catch (e: any) {
        setFetchError(e.message || 'Failed to fetch stations');
        Alert.alert('Error Fetching Stations', e.message || 'Failed to fetch stations');
      } finally {
        setLoadingStations(false);
      }
    };

    fetchStationsData();
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
      // Prevent playing when in add to list mode, directly try to add
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


  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    allStations.forEach(station => genres.add(station.genre));
    return ['All Genres', ...Array.from(genres).sort()];
  }, [allStations]);

  const filteredStations = useMemo(() => {
    return allStations.filter(station => {
      const nameMatch = station.name.toLowerCase().includes(searchTerm.toLowerCase());
      const genreMatch = selectedGenre === '' || selectedGenre === 'All Genres' || station.genre === selectedGenre;
      return nameMatch && genreMatch;
    });
  }, [allStations, searchTerm, selectedGenre]);

  // Ensure only one handleStationPress function definition
  // const originalHandleStationPress = async (station: Station) => { ... } // This is the one being kept from the logic above.

  const renderStationItem = ({ item }: { item: Station }) => {
    const isFav = isFavorite(item.id);
    // const isSelectedToPlay = selectedStationToPlay?.id === item.id && !isAddToMode; // Not used for direct styling now

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
          <View style={styles.stationInfo}>
            <Text style={[styles.stationName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.stationGenre, { color: colors.subtleText }]}>{item.genre}</Text>
          </View>
          <View style={styles.stationActions}>
            {!isAddToMode && (
              <HeartIcon
                filled={isFav}
                currentColors={colors}
                onPress={() => handleToggleFavorite(item.id)}
              />
            )}
            {isAddToMode && (
              // This TouchableOpacity is fine for the plus icon as it's a specific action button
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
    setSearchTerm('');
    setSelectedGenre('');
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
          placeholder="Search stations..."
          placeholderTextColor={colors.placeholderText}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <Text style={[styles.genreFilterTitle, { color: colors.text }]}>Filter by Genre:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScrollView}>
          {uniqueGenres.map(genre => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreButton,
                { borderColor: colors.primary, backgroundColor: colors.cardBackground },
                selectedGenre === genre && { backgroundColor: colors.primary }
              ]}
              onPress={() => setSelectedGenre(genre === 'All Genres' ? '' : genre)}
            >
              <Text style={[
                styles.genreButtonText,
                { color: colors.primary },
                selectedGenre === genre && { color: colors.cardBackground }
              ]}>{genre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {(searchTerm !== '' || selectedGenre !== '') && (
            <RNButton title="Clear Filters" onPress={clearFilters} color={colors.subtleText} />
        )}
      </View>

      {loadingStations ? (
         <View style={[styles.centered, {backgroundColor: colors.background}]}><ActivityIndicator size="large" color={colors.primary} /><Text style={{color: colors.text, marginTop: 10}}>Loading stations...</Text></View>
      ) : filteredStations.length === 0 ? (
        <Text style={[styles.noResultsText, {color: colors.subtleText}]}>No stations match your criteria.</Text>
      ) : (
        <FlatList
          data={filteredStations}
          keyExtractor={(item) => item.id}
          renderItem={renderStationItem}
          extraData={{ favorites: favoriteStations, selectedToPlay: selectedStationToPlay, isAddToMode, selectedGenre, searchTerm, themeMode }}
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
    paddingLeft: 8, // theme.spacing.sm
    paddingVertical: 4, // theme.spacing.xs
  },
  selectedStationPlayItem: {
    // Example: might add a border or different shadow if selected
    // borderColor: colors.primary, // This would need 'colors' from useTheme
    // borderWidth: 1,
  },
  stationName: { // Styles updated
    fontSize: 18, // theme.typography.fontSizes.lg
    fontWeight: '500', // theme.typography.fontWeights.medium
  },
  stationGenre: { // Styles updated
    fontSize: 14, // theme.typography.fontSizes.sm
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
