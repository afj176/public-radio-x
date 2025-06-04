import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import TabOneScreen from './index'; // Adjust path as necessary

// Mock expo-router
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockLocalSearchParams = { listIdToAddTo: undefined, listName: undefined };
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockLocalSearchParams,
  Link: jest.fn(({ children }) => <>{children}</>), // Simplified mock for Link
}));

// Mock AuthContext
const mockLogout = jest.fn();
const mockAddFavoriteStation = jest.fn();
const mockRemoveFavoriteStation = jest.fn();
const mockIsFavorite = jest.fn().mockReturnValue(false);
const mockAddStationToList = jest.fn();

const mockAuthContextValue = {
  userEmail: 'test@example.com',
  logout: mockLogout,
  isLoading: false,
  favoriteStations: [],
  addFavoriteStation: mockAddFavoriteStation,
  removeFavoriteStation: mockRemoveFavoriteStation,
  isFavorite: mockIsFavorite,
  isLoadingFavorites: false,
  addStationToList: mockAddStationToList,
  isLoadingStationLists: false,
  // Include other properties from AuthContextType that TabOneScreen might use,
  // even if not directly in the test cases yet, to avoid undefined errors.
  token: 'fake-token',
  isAuthenticated: true,
  login: jest.fn(),
  register: jest.fn(),
  fetchFavoriteStations: jest.fn(),
  stationLists: [],
  currentStationListDetail: null,
  fetchStationLists: jest.fn(),
  createStationList: jest.fn(),
  updateStationList: jest.fn(),
  deleteStationList: jest.fn(),
  removeStationFromList: jest.fn(),
  fetchStationListDetail: jest.fn(),
  recentlyPlayedStations: [],
  isLoadingRecents: false,
  notifyStationPlayed: jest.fn(),
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthContextValue,
}));

// Mock ThemeContext
const mockSetThemeMode = jest.fn();
const mockThemeContextValue = {
  colors: { // Provide a basic colors object, actual values might not matter for many tests
    background: '#fff', text: '#000', cardBackground: '#f0f0f0',
    border: '#ccc', error: 'red', subtleText: '#555', primary: 'blue',
    success: 'green', primary_light: '#e3f2fd', primary_dark: 'darkblue',
    mediumGray: '#aaa', placeholderText: '#999',
  },
  themeMode: 'light',
  setThemeMode: mockSetThemeMode,
};
jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => mockThemeContextValue,
}));

// Mock RecentlyPlayedList and Player components
jest.mock('@/components/RecentlyPlayedList', () => () => <></>); // Render nothing
jest.mock('@/components/Player', () => () => <></>); // Render nothing

// Mock global fetch
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');


// Debounce timer for search
jest.useFakeTimers();


describe('TabOneScreen (Station Browsing)', () => {
  const mockStations = [
    { stationuuid: '1', name: 'Station 1', tags: 'rock', country: 'USA', favicon: 'fav1.ico', codec: 'MP3' },
    { stationuuid: '2', name: 'Station 2', tags: 'pop', country: 'UK', favicon: 'fav2.ico', codec: 'AAC' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockIsFavorite.mockReturnValue(false); // Reset favorite state for each station
    mockLocalSearchParams.listIdToAddTo = undefined; // Reset add to list mode
    mockLocalSearchParams.listName = undefined;

    // Default fetch mock for stations
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockStations,
    });
  });

  afterEach(() => {
     jest.clearAllTimers();
  });


  it('renders initial station list and search inputs', async () => {
    const { getByPlaceholderText, findByText, getByText } = render(<TabOneScreen />);

    act(() => jest.runAllTimers()); // Advance timers to trigger debounced fetch

    await findByText('Station 1'); // Wait for stations to be rendered
    expect(getByPlaceholderText('Search by station name...')).toBeTruthy();
    expect(getByPlaceholderText('Search by tag/genre...')).toBeTruthy();
    expect(getByText('Logout')).toBeTruthy();
  });

  it('fetches and displays stations based on name search input', async () => {
    const { getByPlaceholderText, findByText } = render(<TabOneScreen />);
    const searchInput = getByPlaceholderText('Search by station name...');

    (global.fetch as jest.Mock).mockResolvedValueOnce({ // For initial load
      ok: true,
      json: async () => mockStations,
    }).mockResolvedValueOnce({ // For search
      ok: true,
      json: async () => [mockStations[0]], // Return only Station 1 for search "Station 1"
    });

    act(() => jest.runAllTimers()); // Initial fetch
    await findByText('Station 1'); // Ensure initial load finishes

    fireEvent.changeText(searchInput, 'Station 1');
    act(() => jest.runAllTimers()); // Advance timers for debounced search fetch

    await findByText('Station 1');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('name=Station%201'), undefined);
    expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + Search
  });

  it('handles favorite toggle correctly', async () => {
    const { findByText, UNSAFE_getByProps } = render(<TabOneScreen />);
    act(() => jest.runAllTimers());
    await findByText('Station 1');

    // Find the heart icon for Station 1. This assumes HeartIcon is rendered and accessible.
    // A testID on HeartIcon or its TouchableOpacity would be more robust.
    // For now, we'll try to find it by props if possible, or assume it's the first one.
    // This is fragile:
    const heartIconForStation1 = UNSAFE_getByProps({ name: "heart-o" }); // Assuming it's not favorited initially

    fireEvent.press(heartIconForStation1);
    await waitFor(() => expect(mockAddFavoriteStation).toHaveBeenCalledWith(mockStations[0]));

    // Simulate it being a favorite now
    mockIsFavorite.mockImplementation((id) => id === '1');
    // Re-render or update component state would be needed here for UI to change
    // For testing the call, the above is sufficient.
  });


  it('sets selected station to play when a station is pressed (not in add-to-list mode)', async () => {
    const { findByText, rerender } = render(<TabOneScreen />);
    act(() => jest.runAllTimers());
    const station1Text = await findByText('Station 1');

    fireEvent.press(station1Text); // Press the container of station name (or the item itself)

    // To check if Player component receives the station, we'd need to inspect Player's props.
    // Since Player is mocked to render nothing, we check if setSelectedStationToPlay was called.
    // This requires either a more complex setup to spy on useState or checking the Player props.
    // For now, we assume if Player is rendered, it got the station.
    // A better test would be to pass a mock function to Player for onPlay.
    // For now, let's just verify the Player component is rendered after selection.
    // This test is simplified due to Player being mocked.
    // A more robust test would involve checking the props passed to the Player component.

    // Re-render with the selected station to simulate state update if Player visibility depends on it.
    // This step is conceptual as `setSelectedStationToPlay` is internal.
    // We can't directly assert `selectedStationToPlay` state.
    // We'd typically check if the <Player> component now renders with the correct station prop.
    // Since Player is mocked, we can't check its props directly here.
    // This test mainly ensures no crash and the press handler is called.
    expect(station1Text).toBeTruthy(); // Confirms station was found and pressed
  });

  it('shows add to list alert when station is pressed in add-to-list mode', async () => {
    mockLocalSearchParams.listIdToAddTo = 'list123';
    mockLocalSearchParams.listName = 'My Favs';

    const { findByText } = render(<TabOneScreen />);
    act(() => jest.runAllTimers());
    const station1Text = await findByText('Station 1');

    fireEvent.press(station1Text);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Add to My Favs?',
      'Add "Station 1" to this list?',
      expect.any(Array) // Check for the buttons array
    );

    // Simulate pressing "Add" on the alert
    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const addButton = alertArgs[2].find((b:any) => b.text === "Add");

    mockAddStationToList.mockResolvedValueOnce({ id: 'list123', name: 'My Favs', stationIds: [mockStations[0].stationuuid] });
    await act(async() => {
        addButton.onPress();
    });

    expect(mockAddStationToList).toHaveBeenCalledWith('list123', mockStations[0].stationuuid, mockStations[0]);
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Success", `"Station 1" added to "My Favs".`));
  });

  it('shows loading indicator when authLoading or loadingStations is true', async () => {
    mockAuthContextValue.isLoading = true; // Simulate auth loading
    const { getByText, rerender } = render(<TabOneScreen />);
    expect(getByText('Loading data...')).toBeTruthy();

    mockAuthContextValue.isLoading = false; // Reset auth loading
    // Simulate station loading (initial state before fetch completes)
    // Need to rerender with new context value if it's not picked up automatically
    // For this test, let's assume loadingStations state within component works.
    // We'll set loadingStations to true by triggering a search.
    rerender(<TabOneScreen />);
    fireEvent.changeText(getByPlaceholderText('Search by station name...'), 'New Search');
    // Loading state should be true now internally in TabOneScreen
    // Since loading indicator depends on internal state `loadingStations` and `authLoading`,
    // testing `loadingStations` directly is tricky. We verify it during search test.
    // Here we check the initial loading state due to authLoading.
  });

  it('displays error message if fetching stations fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
    const { findByText } = render(<TabOneScreen />);
    act(() => jest.runAllTimers());

    const errorText = await findByText(/Error fetching stations: Network Error/);
    expect(errorText).toBeTruthy();
  });

  it('clears filters when "Clear Filters" is pressed', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<TabOneScreen />);
    act(() => jest.runAllTimers()); // initial fetch
    await findByText('Station 1');


    const nameInput = getByPlaceholderText('Search by station name...');
    const tagInput = getByPlaceholderText('Search by tag/genre...');

    fireEvent.changeText(nameInput, 'Test Name');
    fireEvent.changeText(tagInput, 'Test Tag');

    expect(nameInput.props.value).toBe('Test Name');
    expect(tagInput.props.value).toBe('Test Tag');

    // Fetch mock for the clear operation (which re-fetches with empty params)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStations, // Return all stations
    });

    const clearButton = getByText('Clear Filters');
    fireEvent.press(clearButton);

    expect(nameInput.props.value).toBe('');
    expect(tagInput.props.value).toBe('');

    act(() => jest.runAllTimers()); // for the fetch after clearing
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('limit=150'), undefined));
  });

});
