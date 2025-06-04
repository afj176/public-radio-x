import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';

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
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      playStream(station);
    } else {
      // If station becomes null (e.g. deselected), stop and unload sound
      if (sound) {
        sound.stopAsync().then(() => sound.unloadAsync());
        setSound(null);
        setIsPlaying(false);
      }
    }
  }, [station]);

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
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentStation.streamUrl },
        { shouldPlay: true } // Start playing immediately
      );
      setSound(newSound);
      setIsPlaying(true);
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

  if (!station) {
    return null; // Don't render player if no station is selected
  }

  return (
    <View style={styles.container}>
      <Text style={styles.stationName}>{station.name}</Text>
      {isLoading && <Text>Loading stream...</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handlePlayPause} disabled={isLoading}>
        <Text style={styles.buttonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginTop: 5,
  },
});

export default Player;
