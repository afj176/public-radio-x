import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ListDetailScreen from './[listId]'; // Adjust path

// Mock expo-router
const mockPush = jest.fn();
const mockLocalSearchParams = { listId: 'list1' }; // Default mock params
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockLocalSearchParams,
}));

// Mock AuthContext
const mockFetchStationListDetail = jest.fn();
const mockRemoveStationFromList = jest.fn();
let mockCurrentStationListDetail: any = null;
let mockStationListsData: any[] = [];

const mockAuthContextValue = {
  currentStationListDetail: mockCurrentStationListDetail,
  fetchStationListDetail: mockFetchStationListDetail,
  removeStationFromList: mockRemoveStationFromList,
  isLoadingStationLists: false,
  stationLists: mockStationListsData, // Used for initial name
  // Provide other necessary defaults from AuthContextType
  token: 'fake-token',
  userEmail: 'test@example.com',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  favoriteStations: [],
  isLoadingFavorites: false,
  fetchFavoriteStations: jest.fn(),
  addFavoriteStation: jest.fn(),
  removeFavoriteStation: jest.fn(),
  isFavorite: jest.fn(),
  addStationToList: jest.fn(),
  recentlyPlayedStations: [],
  isLoadingRecents: false,
  notifyStationPlayed: jest.fn(),
  createStationList: jest.fn(),
  updateStationList: jest.fn(),
  deleteStationList: jest.fn(),
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthContextValue,
}));

// Mock global fetch (for the allStations call within ListDetailScreen)
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ListDetailScreen', () => {
  const mockAllStationsData = [
    { id: 's1', name: 'Station Alpha', genre: 'Rock' },
    { id: 's2', name: 'Station Beta', genre: 'Pop' },
    { id: 's3', name: 'Station Gamma', genre: 'Jazz' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentStationListDetail = null; // Reset
    mockAuthContextValue.currentStationListDetail = mockCurrentStationListDetail;
    mockStationListsData = [];
    mockAuthContextValue.stationLists = mockStationListsData;
    mockAuthContextValue.isLoadingStationLists = false;
    (Alert.alert as jest.Mock).mockClear();

    // Default mock for the component's own fetch of all stations
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAllStationsData,
    });
  });

  it('renders loading state initially then list details', async () => {
    mockAuthContextValue.isLoadingStationLists = true;
    const { getByText, findByText } = render(<ListDetailScreen />);

    expect(getByText('Loading list details...')).toBeTruthy();

    mockAuthContextValue.isLoadingStationLists = false;
    mockCurrentStationListDetail = { id: 'list1', name: 'My Favs', stationIds: ['s1', 's2'] };
    mockAuthContextValue.currentStationListDetail = mockCurrentStationListDetail;
    mockStationListsData.push(mockCurrentStationListDetail); // Add to stationLists for name fallback

    // Rerender or wait for effects to update the view
    // In a real scenario, the context update would trigger a rerender.
    // Here, we can simulate it by waiting for fetchStationListDetail to be called and then checking.

    await waitFor(() => expect(mockFetchStationListDetail).toHaveBeenCalledWith('list1'));
    // After context updates, the component should re-render.
    // We might need to trigger a re-render manually in test if state updates are tricky.
    // For now, let's assume the hook updates and re-renders.

    expect(await findByText('My Favs')).toBeTruthy();
    expect(await findByText('Station Alpha')).toBeTruthy();
    expect(await findByText('Station Beta')).toBeTruthy();
    expect(getByText('Add Stations to this List')).toBeTruthy();
  });

  it('displays "List not found" if no list detail is loaded', async () => {
    mockFetchStationListDetail.mockImplementation((listId) => {
        // Simulate service not finding the list
        mockAuthContextValue.currentStationListDetail = null;
        return Promise.resolve();
    });

    const { findByText } = render(<ListDetailScreen />);

    await waitFor(() => expect(mockFetchStationListDetail).toHaveBeenCalledWith('list1'));
    expect(await findByText('List not found.')).toBeTruthy();
  });

  it('displays "This list is empty" for a list with no stations', async () => {
    mockCurrentStationListDetail = { id: 'list1', name: 'Empty List', stationIds: [] };
    mockAuthContextValue.currentStationListDetail = mockCurrentStationListDetail;
    mockStationListsData.push(mockCurrentStationListDetail);


    const { getByText } = render(<ListDetailScreen />);
    await waitFor(() => expect(mockFetchStationListDetail).toHaveBeenCalledWith('list1'));

    expect(getByText('Empty List')).toBeTruthy(); // Title
    expect(getByText('This list is empty. Add some stations!')).toBeTruthy();
  });

  it('calls removeStationFromList when trash icon is pressed and confirmed', async () => {
    mockCurrentStationListDetail = { id: 'list1', name: 'My List', stationIds: ['s1'] };
    mockAuthContextValue.currentStationListDetail = mockCurrentStationListDetail;
    mockStationListsData.push(mockCurrentStationListDetail);


    const { UNSAFE_getByProps, findByText } = render(<ListDetailScreen />);
    await waitFor(() => expect(mockFetchStationListDetail).toHaveBeenCalledWith('list1'));
    await findByText('Station Alpha'); // Ensure item is rendered

    const trashIcon = UNSAFE_getByProps({ name: "trash" });
    fireEvent.press(trashIcon);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Confirm Removal",
      "Are you sure you want to remove this station from the list?",
      expect.any(Array)
    );

    // Simulate pressing "Remove"
    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = alertArgs[2].find((b:any) => b.text === "Remove");

    mockRemoveStationFromList.mockResolvedValueOnce(true); // Simulate successful removal
    await act(async () => {
       removeButton.onPress();
    });

    await waitFor(() => expect(mockRemoveStationFromList).toHaveBeenCalledWith('list1', 's1'));
  });

  it('navigates to add stations screen when "Add Stations" button is pressed', async () => {
    mockCurrentStationListDetail = { id: 'list1', name: 'My List', stationIds: [] };
    mockAuthContextValue.currentStationListDetail = mockCurrentStationListDetail;
    mockStationListsData.push(mockCurrentStationListDetail);

    const { getByText } = render(<ListDetailScreen />);
    await waitFor(() => expect(mockFetchStationListDetail).toHaveBeenCalledWith('list1'));

    fireEvent.press(getByText('Add Stations to this List'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)',
      params: { listIdToAddTo: 'list1', listName: 'My List' },
    });
  });

  it('handles error when fetching all stations', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch stations'));

    render(<ListDetailScreen />);

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'Could not load station data.'));
  });

});
