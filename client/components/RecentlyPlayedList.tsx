import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Station } from '@/models/Station';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext'; // Import useTheme
import { typography, spacing, borderRadius, shadows as staticShadows } from '@/styles/theme'; // Import static theme parts

interface RecentlyPlayedListProps {
  onStationSelect: (station: Station) => void;
}

const RecentlyPlayedList: React.FC<RecentlyPlayedListProps> = ({ onStationSelect }) => {
  const { recentlyPlayedStations, isLoadingRecents } = useAuth();
  const { colors } = useTheme();

  if (isLoadingRecents && recentlyPlayedStations.length === 0) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: colors.background}]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtleText }]}>Loading recents...</Text>
      </View>
    );
  }

  if (recentlyPlayedStations.length === 0 && !isLoadingRecents) { // Ensure not to show if still loading
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <Text style={[styles.title, { color: colors.text }]}>Recently Played</Text>
        <Text style={[styles.emptyText, { color: colors.subtleText }]}>No recently played stations yet.</Text>
      </View>
    );
  }

  // Return null or an empty view if there are no stations and it's not loading,
  // to prevent rendering an empty container if parent screen handles empty state more globally.
  // For this component, showing its own emptyText is fine.
  if (recentlyPlayedStations.length === 0) return null;


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Recently Played</Text>
      <FlatList
        data={recentlyPlayedStations}
        keyExtractor={(item) => item.stationuuid} // Use stationuuid
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.stationItem,
              { backgroundColor: colors.cardBackground, ...staticShadows.card }
            ]}
            onPress={() => onStationSelect(item)}
          >
            {item.favicon ? (
              <Image source={{ uri: item.favicon }} style={styles.favicon} onError={(e) => console.log("Failed to load favicon for recent:", e.nativeEvent.error, item.favicon)} />
            ) : (
              <View style={styles.faviconPlaceholder} />
            )}
            <View style={styles.textContainer}>
              <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              {/* Use tags or codec for genre display */}
              <Text style={[styles.stationDetails, { color: colors.subtleText }]} numberOfLines={1}>
                {item.tags?.split(',')[0] || item.codec || 'N/A'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.fontSizes.sm,
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginLeft: spacing.md, // Match typical screen padding
    marginBottom: spacing.sm,
  },
  stationItem: {
    width: 130, // Slightly wider for better text fit
    padding: spacing.sm,
    marginRight: spacing.sm, // For spacing between items
    borderRadius: borderRadius.md,
    flexDirection: 'row', // Align favicon and text
    alignItems: 'center', // Center items vertically
    // Shadows applied inline
  },
  favicon: {
    width: 20, // Smaller for horizontal list
    height: 20,
    marginRight: spacing.sm,
    borderRadius: 3,
  },
  faviconPlaceholder: {
    width: 20,
    height: 20,
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1, // Allow text to take remaining space
  },
  stationName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  stationDetails: { // Renamed from stationGenre for clarity
    fontSize: typography.fontSizes.xs,
  },
  emptyText: {
    marginLeft: spacing.md, // Match typical screen padding
    fontSize: typography.fontSizes.sm,
  },
  listContentContainer: {
    paddingLeft: spacing.md, // Match typical screen padding
    paddingRight: spacing.md - spacing.sm, // Adjust for last item's marginRight
  }
});

export default RecentlyPlayedList;
