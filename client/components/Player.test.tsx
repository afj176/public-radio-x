import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Player from './Player'; // Adjust path
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Station } from '@/models/Station';

// Mock expo-av
const mockSoundObject = {
  loadAsync: jest.fn(),
  unloadAsync: jest.fn(),
  playAsync: jest.fn(),
  pauseAsync: jest.fn(),
  stopAsync: jest.fn(),
  setOnPlaybackStatusUpdate: jest.fn(),
  getStatusAsync: jest.fn(), // Might be needed if component calls it
};
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: mockSoundObject, status: { isLoaded: true, isPlaying: true } as AVPlaybackStatus })),
    },
  },
}));

// Mock AuthContext
const mockNotifyStationPlayed = jest.fn();
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    notifyStationPlayed: mockNotifyStationPlayed,
  }),
}));

// Mock ThemeContext
const mockThemeContextValue = {
  colors: {
    cardBackground: '#fff', text: '#000', border: '#ccc',
    primary: 'blue', error: 'red', subtleText: '#555',
  },
};
jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => mockThemeContextValue,
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Suppress console.error and console.log for cleaner test output
let originalConsoleError: any;
let originalConsoleLog: any;
beforeAll(() => {
  originalConsoleError = console.error;
  originalConsoleLog = console.log;
  console.error = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});


describe('Player', () => {
  const mockStation: Station = {
    stationuuid: 's1', name: 'Test Station', url_resolved: 'http://stream.example.com/audio',
    // Fill other required Station properties
    changeuuid: 'c1', url: 'http://stream.example.com/audio', country: 'Testland', state: '', language: '', tags: 'test,music', votes: 100, lastchangetime_iso8601: '', codec: 'MP3', bitrate: 128, hls: 0, lastcheckok: true, lastchecktime_iso8601: '', lastcheckoktime_iso8601: '', lastlocalchecktime_iso8601: '', clicktimestamp_iso8601: '', clickcount: 0, clicktrend: 0, geo_lat: null, geo_long: null, favicon: '', homepage: '', countrycode: '', iso_3166_2: null, languagecodes: '', lcn:0, radio_browser_player_url: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset sound object mocks for each test
    mockSoundObject.loadAsync.mockClear().mockResolvedValue({ isLoaded: true, isPlaying: true } as AVPlaybackStatus);
    mockSoundObject.unloadAsync.mockClear().mockResolvedValue({ isLoaded: false } as AVPlaybackStatus);
    mockSoundObject.playAsync.mockClear().mockResolvedValue({ isLoaded: true, isPlaying: true } as AVPlaybackStatus);
    mockSoundObject.pauseAsync.mockClear().mockResolvedValue({ isLoaded: true, isPlaying: false } as AVPlaybackStatus);
    mockSoundObject.stopAsync.mockClear().mockResolvedValue({ isLoaded: false } as AVPlaybackStatus);
    mockSoundObject.setOnPlaybackStatusUpdate.mockClear();
    (Audio.Sound.createAsync as jest.Mock).mockClear().mockResolvedValue({ sound: mockSoundObject, status: { isLoaded: true, isPlaying: true } as AVPlaybackStatus });
  });

  it('does not render if station prop is null initially', () => {
    const { queryByText } = render(<Player station={null} />);
    // The component uses animation for visibility, so it might still be in the tree.
    // Check for specific content that would only appear if a station is active.
    expect(queryByText('No station')).toBeTruthy(); // Based on default text when station is null
    expect(queryByText('Play')).toBeTruthy(); // Button text when not playing
  });

  it('loads and plays a new station when station prop changes', async () => {
    const { rerender, getByText } = render(<Player station={null} />);

    rerender(<Player station={mockStation} />);

    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1));
    expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      { uri: mockStation.url_resolved },
      { shouldPlay: true }
    );
    expect(mockNotifyStationPlayed).toHaveBeenCalledWith(mockStation);
    expect(getByText(mockStation.name)).toBeTruthy();
    expect(getByText('Pause')).toBeTruthy(); // Should be playing
  });

  it('handles play/pause button press', async () => {
    const { getByText, rerender } = render(<Player station={mockStation} />);

    await waitFor(() => expect(getByText('Pause')).toBeTruthy()); // Initially playing

    fireEvent.press(getByText('Pause'));
    await waitFor(() => expect(mockSoundObject.pauseAsync).toHaveBeenCalled());
    // Assuming onPlaybackStatusUpdate is called by mock to update isPlaying state
    // Forcing state update for test if mock doesn't trigger it:
    act(() => {
        const statusUpdateCallback = mockSoundObject.setOnPlaybackStatusUpdate.mock.calls[0][0];
        statusUpdateCallback({ isLoaded: true, isPlaying: false } as AVPlaybackStatus);
    });
    expect(getByText('Play')).toBeTruthy();


    fireEvent.press(getByText('Play'));
    await waitFor(() => expect(mockSoundObject.playAsync).toHaveBeenCalled());
    act(() => {
        const statusUpdateCallback = mockSoundОbject.setOnPlaybackStatusUpdate.mock.calls[0][0];
        statusUpdateCallback({ isLoaded: true, isPlaying: true } as AVPlaybackStatus);
    });
    expect(getByText('Pause')).toBeTruthy();
  });

  it('displays loading state while sound is loading', async () => {
    (Audio.Sound.createAsync as jest.Mock).mockImplementationOnce(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        sound: mockSoundObject,
        status: { isLoaded: true, isPlaying: true } as AVPlaybackStatus
      }), 200)); // Delay createAsync
    });

    const { getByText, rerender } = render(<Player station={null} />);
    rerender(<Player station={mockStation} />);

    expect(getByText('Loading stream...')).toBeTruthy();
    await waitFor(() => expect(getByText('Pause')).toBeTruthy()); // Wait for loading to finish
    expect(getByText(mockStation.name)).toBeTruthy(); // Ensure station name is still there
  });

  it('displays error message if sound fails to load or play', async () => {
    const errorMessage = 'Test playback error';
    (Audio.Sound.createAsync as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    const { getByText, rerender, findByText } = render(<Player station={null} />);
    rerender(<Player station={mockStation} />);

    const errorTextElement = await findByText(`Failed to play ${mockStation.name}: ${errorMessage}`);
    expect(errorTextElement).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith('Playback Error', `Could not play ${mockStation.name}. ${errorMessage}`);
    expect(getByText('Play')).toBeTruthy(); // Should not be in playing state
  });

  it('unloads sound when station prop becomes null (component hides)', async () => {
    const { rerender, getByText } = render(<Player station={mockStation} />);
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalled()); // Ensure sound is loaded
    expect(getByText(mockStation.name)).toBeTruthy();

    rerender(<Player station={null} />);

    // Animation makes it tricky to test immediate unload.
    // We expect stopAsync and unloadAsync to be called after animation.
    // For simplicity, let's assume animation completes or test the calls.
    // Wait for animation to complete (approx 300ms in component)
    await act(async () => {
        jest.advanceTimersByTime(350); // Advance past animation duration
    });

    await waitFor(() => expect(mockSoundObject.stopAsync).toHaveBeenCalled());
    await waitFor(() => expect(mockSoundObject.unloadAsync).toHaveBeenCalled());
  });

  it('handles playback status updates (e.g., error during playback)', async () => {
    const { getByText, findByText } = render(<Player station={mockStation} />);
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalled());

    expect(getByText('Pause')).toBeTruthy(); // Initial state

    // Simulate an error status update from expo-av
    const statusUpdateCallback = mockSoundObject.setOnPlaybackStatusUpdate.mock.calls[0][0];
    act(() => {
      statusUpdateCallback({
        isLoaded: false,
        error: 'Simulated playback error',
      } as AVPlaybackStatus);
    });

    const errorText = await findByText('Playback Error: Simulated playback error');
    expect(errorText).toBeTruthy();
    expect(getByText('Play')).toBeTruthy(); // Should switch to 'Play' as isPlaying becomes false
  });

});

// Enable timers for animation testing if needed (or specific tests)
jest.useRealTimers(); // Or manage with fake timers carefully in specific tests if animations are complex to test.
// For this set of tests, we'll use real timers for simplicity with animation,
// but advance them manually for the unload test.
// If animations were critical to test visually, a different approach might be needed.
// Here, we are more focused on the logic (load, play, pause, error, unload).
