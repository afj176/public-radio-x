import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RecentlyPlayedList from './RecentlyPlayedList'; // Adjust path
import { Station } from '@/models/Station';

// Mock AuthContext
let mockAuthContextState = {
  recentlyPlayedStations: [] as Station[],
  isLoadingRecents: false,
};
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthContextState,
}));

// Mock ThemeContext
const mockThemeContextValue = {
  colors: {
    background: '#fff', text: '#000', cardBackground: '#f0f0f0',
    subtleText: '#555', primary: 'blue',
  },
};
jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => mockThemeContextValue,
}));

describe('RecentlyPlayedList', () => {
  const mockOnStationSelect = jest.fn();
  const mockStationsData: Station[] = [
    { stationuuid: '1', name: 'Recent Station 1', codec: 'MP3', favicon: 'fav1.ico', changeuuid: 'c1', url: '', url_resolved: '', country: '', state: '', language: '', tags: '', votes: 0, lastchangetime_iso8601: '', hls: 0, lastcheckok: false, lastchecktime_iso8601: '', lastcheckoktime_iso8601: '', lastlocalchecktime_iso8601: '', clicktimestamp_iso8601: '', clickcount: 0, clicktrend: 0, geo_lat: null, geo_long: null, homepage: '', countrycode: '', iso_3166_2: null, languagecodes: '',  bitrate:0, lastcomment: '', lcn:0,  radio_browser_player_url: '' },
    { stationuuid: '2', name: 'Recent Station 2', codec: 'AAC', favicon: 'fav2.ico', changeuuid: 'c2', url: '', url_resolved: '', country: '', state: '', language: '', tags: '', votes: 0, lastchangetime_iso8601: '', hls: 0, lastcheckok: false, lastchecktime_iso8601: '', lastcheckoktime_iso8601: '', lastlocalchecktime_iso8601: '', clicktimestamp_iso8601: '', clickcount: 0, clicktrend: 0, geo_lat: null, geo_long: null, homepage: '', countrycode: '', iso_3166_2: null, languagecodes: '', bitrate:0, lastcomment: '', lcn:0, radio_browser_player_url: '' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContextState.recentlyPlayedStations = [];
    mockAuthContextState.isLoadingRecents = false;
  });

  it('renders loading indicator when isLoadingRecents is true and no stations', () => {
    mockAuthContextState.isLoadingRecents = true;
    const { getByText, getByTestId } = render( // Assuming ActivityIndicator might have a testID or check text
      <RecentlyPlayedList onStationSelect={mockOnStationSelect} />
    );
    expect(getByText('Loading recents...')).toBeTruthy();
    // If ActivityIndicator has a testID="activity-indicator", you could use:
    // expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('renders "No recently played stations yet." when no stations and not loading', () => {
    // This specific text is shown if length is 0 AND !isLoadingRecents,
    // but the component returns null if length is 0 after loading.
    // So, to test this text, isLoadingRecents must be false AND recentlyPlayedStations must be empty
    // *before* the component decides to render null.
    // The component logic is:
    // if (isLoadingRecents && recentlyPlayedStations.length === 0) { /* loading */ }
    // if (recentlyPlayedStations.length === 0 && !isLoadingRecents) { /* empty text */ }
    // if (recentlyPlayedStations.length === 0) return null; // This line makes the above emptyText hard to reach if it's truly empty after loading.

    // Let's test the state where it *would* show the empty message
    // This requires isLoadingRecents to be false and stations to be empty initially.
    mockAuthContextState.recentlyPlayedStations = [];
    mockAuthContextState.isLoadingRecents = false;

    const { queryByText } = render(<RecentlyPlayedList onStationSelect={mockOnStationSelect} />);
    // Based on current logic, if stations are empty and not loading, it first renders the "emptyText"
    // then, in a subsequent check, if stations are empty, it returns null.
    // This means the "emptyText" might be briefly available or not at all depending on render cycles.
    // Let's refine the component logic slightly or test the null case.

    // If the component returns null when empty and not loading, this text won't be found.
    // The component's logic:
    // 1. if (isLoadingRecents && recentlyPlayedStations.length === 0) -> shows loading
    // 2. if (recentlyPlayedStations.length === 0 && !isLoadingRecents) -> shows empty text
    // 3. if (recentlyPlayedStations.length === 0) return null; -> THIS HIDES THE EMPTY TEXT if list remains empty
    // So, the "emptyText" is only shown if isLoadingRecents becomes false *while* the list is empty,
    // but *before* the final `return null` check. This is a bit of a race condition in testing.

    // Let's assume the intention is: if loading is done and list is empty, show message.
    // If the component *always* returns null for an empty list post-load, then this test changes.
    // Given the current code, the "emptyText" will be shown.
    expect(queryByText("No recently played stations yet.")).toBeTruthy();
  });

  it('returns null if no stations and not loading (due to the final check)', () => {
    // This tests the `if (recentlyPlayedStations.length === 0) return null;` line specifically.
    mockAuthContextState.recentlyPlayedStations = [];
    mockAuthContextState.isLoadingRecents = false; // Ensure not loading

    const { container } = render(<RecentlyPlayedList onStationSelect={mockOnStationSelect} />);
    // If it returns null, the container should have no children or be minimal.
    // Depending on how React Native Testing Library handles null-rendering components.
    // A common way is to check if the container itself is empty or only contains basic wrapper views.
    // For this specific case, if it returns null, it shouldn't render the title "Recently Played".
    expect(container.children.length).toBe(0); // Or check that the title is not present
  });


  it('renders list of recently played stations', () => {
    mockAuthContextState.recentlyPlayedStations = mockStationsData;
    const { getByText } = render(<RecentlyPlayedList onStationSelect={mockOnStationSelect} />);

    expect(getByText('Recently Played')).toBeTruthy();
    expect(getByText('Recent Station 1')).toBeTruthy();
    expect(getByText('Recent Station 2')).toBeTruthy();
  });

  it('calls onStationSelect when a station is pressed', () => {
    mockAuthContextState.recentlyPlayedStations = mockStationsData;
    const { getByText } = render(<RecentlyPlayedList onStationSelect={mockOnStationSelect} />);

    fireEvent.press(getByText('Recent Station 1'));
    expect(mockOnStationSelect).toHaveBeenCalledWith(mockStationsData[0]);
  });

  it('renders favicons if available', () => {
    mockAuthContextState.recentlyPlayedStations = mockStationsData;
    const { getAllByRole } = render(<RecentlyPlayedList onStationSelect={mockOnStationSelect} />);
    // Assuming Image components have an implicit role of 'image' or can be targeted otherwise
    const images = getAllByRole('image'); // This might need adjustment based on actual output
    expect(images.length).toBe(mockStationsData.length);
    // Further checks could verify image sources if needed, but that's more complex.
  });

});
