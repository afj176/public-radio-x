import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native'; // Added Animated
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext'; // For themed styling

interface Station {
  id: string;
  name: string;
  streamUrl: string;
  genre: string;
}

interface PlayerProps {
  station: Station | null;
}

const Player: React.FC<PlayerProps> = ({ station }) => {
  const { notifyStationPlayed } = useAuth();
  const { colors } = useTheme(); // Get themed colors
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerAnim = useRef(new Animated.Value(0)).current; // For opacity and translateY

  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    if (station) {
      Animated.timing(playerAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      playStream(station);
    } else {
      Animated.timing(playerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // After animation out, unload sound if it exists
        if (sound) {
          sound.stopAsync().then(() => sound.unloadAsync());
          setSound(null);
          setIsPlaying(false);
        }
      });
    }
  }, [station, playerAnim]); // playerAnim added to dependencies

  const playStream = async (currentStation: Station) => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }

    setIsLoading(true);
    setError(null);
    console.log(`Loading Sound for: ${currentStation.name}`);
    try {
      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: currentStation.streamUrl },
        { shouldPlay: true } // Start playing immediately
      );

      if ((status as AVPlaybackStatus).isLoaded && (status as AVPlaybackStatus).isPlaying) {
        // await addStationToRecents(currentStation.id); // Old way
        await notifyStationPlayed(currentStation); // New way: notify context
      }

      setSound(newSound);
      setIsPlaying(true); // isPlaying might already be true from status
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    } catch (e: any) {
      console.error('Error loading or playing sound:', e);
      setError(`Failed to play ${currentStation.name}: ${e.message}`);
      Alert.alert('Playback Error', `Could not play ${currentStation.name}. ${e.message}`);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error(`Audio Player Error: ${status.error}`);
        setError(`Playback Error: ${status.error}`);
        setIsPlaying(false);
        // Alert.alert('Playback Error', status.error); // Can be too noisy
      }
    } else {
      setIsPlaying(status.isPlaying);
      // setIsLoading(status.isBuffering); // You might want a separate state for buffering
    }
  };

  const handlePlayPause = async () => {
    if (!sound) {
      if (station) playStream(station); // Try to play current station if sound is null
      return;
    }

    if (isPlaying) {
      console.log('Pausing Sound');
      await sound.pauseAsync();
    } else {
      console.log('Playing Sound');
      await sound.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  // No direct rendering if !station, animation handles visibility
  // if (!station) {
  //   return null;
  // }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBackground, // Themed background
          borderColor: colors.border, // Themed border
          opacity: playerAnim, // Fade effect
          transform: [ // Slide effect
            {
              translateY: playerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0], // Slide up from bottom
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[styles.stationName, { color: colors.text }]}>{station?.name || 'No station'}</Text>
      {isLoading && <Text style={{color: colors.subtleText}}>Loading stream...</Text>}
      {error && <Text style={[styles.errorText, {color: colors.error}]}>{error}</Text>}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handlePlayPause}
        disabled={isLoading || !station} // Disable if no station too
      >
        <Text style={[styles.buttonText, { color: colors.cardBackground }]}>{isPlaying ? 'Pause' : 'Play'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16, // theme.spacing.md
    borderTopWidth: 1,
    alignItems: 'center',
    // Shadow can be added here if desired, e.g. theme.shadows.modal but applied upwards
    // For now, relying on TabOneScreen's background to contrast
    position: 'absolute', // If it's an overlay player at the bottom
    bottom: 0,
    left: 0,
    right: 0,
    // elevation: 10, // if it's an overlay
  },
  stationName: {
    fontSize: 18, // theme.typography.fontSizes.lg
    fontWeight: '600', // theme.typography.fontWeights.semiBold
    marginBottom: 8, // theme.spacing.sm
  },
  button: {
    paddingVertical: 10, // theme.spacing.sm + xs
    paddingHorizontal: 20, // theme.spacing.lg
    borderRadius: 20, // theme.borderRadius.round
    marginTop: 10, // theme.spacing.sm
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16, // theme.typography.fontSizes.md
    fontWeight: '500', // theme.typography.fontWeights.medium
  },
  errorText: {
    marginTop: 5,
  },
});

export default Player;
