import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MyListsScreen from './myLists'; // Adjust path

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock AuthContext
const mockFetchStationLists = jest.fn();
const mockCreateStationList = jest.fn();
const mockDeleteStationList = jest.fn();
const mockUpdateStationList = jest.fn();

let mockStationListsData: any[] = [];

const mockAuthContextValue = {
  stationLists: mockStationListsData,
  isLoadingStationLists: false,
  fetchStationLists: mockFetchStationLists,
  createStationList: mockCreateStationList,
  deleteStationList: mockDeleteStationList,
  updateStationList: mockUpdateStationList,
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
  currentStationListDetail: null,
  addStationToList: jest.fn(),
  removeStationFromList: jest.fn(),
  fetchStationListDetail: jest.fn(),
  recentlyPlayedStations: [],
  isLoadingRecents: false,
  notifyStationPlayed: jest.fn(),
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthContextValue,
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MyListsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStationListsData = []; // Reset mock data
    mockAuthContextValue.stationLists = mockStationListsData; // Ensure context uses the reset data
    mockAuthContextValue.isLoadingStationLists = false; // Reset loading state
    (Alert.alert as jest.Mock).mockClear();
  });

  it('renders correctly with no lists', async () => {
    const { getByText, getByPlaceholderText } = render(<MyListsScreen />);

    await waitFor(() => expect(mockFetchStationLists).toHaveBeenCalledTimes(1));

    expect(getByText('My Custom Lists')).toBeTruthy();
    expect(getByPlaceholderText('New list name')).toBeTruthy();
    expect(getByText('Create List')).toBeTruthy();
    expect(getByText('No lists created yet. Add one above!')).toBeTruthy();
  });

  it('renders lists when data is available', async () => {
    mockStationListsData.push(
      { id: '1', name: 'Rock Hits', stationIds: ['s1', 's2'] },
      { id: '2', name: 'Chill Vibes', stationIds: ['s3'] }
    );
    mockAuthContextValue.stationLists = mockStationListsData;


    const { getByText } = render(<MyListsScreen />);
    await waitFor(() => expect(mockFetchStationLists).toHaveBeenCalledTimes(1));

    expect(getByText('Rock Hits')).toBeTruthy();
    expect(getByText('2 station(s)')).toBeTruthy();
    expect(getByText('Chill Vibes')).toBeTruthy();
    expect(getByText('1 station(s)')).toBeTruthy();
  });

  it('allows creating a new list', async () => {
    const { getByPlaceholderText, getByText } = render(<MyListsScreen />);
    await waitFor(() => expect(mockFetchStationLists).toHaveBeenCalledTimes(1));

    const newListName = 'My Awesome List';
    mockCreateStationList.mockResolvedValueOnce({ id: '3', name: newListName, stationIds: [] });

    fireEvent.changeText(getByPlaceholderText('New list name'), newListName);
    fireEvent.press(getByText('Create List'));

    await waitFor(() => expect(mockCreateStationList).toHaveBeenCalledWith(newListName));
    expect(Alert.alert).toHaveBeenCalledWith('Success', `List "${newListName}" created.`);
    // Input should be cleared (this depends on setNewListName('') in the component)
    // We can check this by seeing if the placeholder is active again or input value is empty
    expect(getByPlaceholderText('New list name').props.value).toBe('');
  });

  it('shows error if new list name is empty', async () => {
    const { getByText } = render(<MyListsScreen />);
    await waitFor(() => expect(mockFetchStationLists).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('Create List'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'List name cannot be empty.');
    expect(mockCreateStationList).not.toHaveBeenCalled();
  });

  it('allows deleting a list with confirmation', async () => {
    mockStationListsData.push({ id: '1', name: 'To Delete', stationIds: [] });
    mockAuthContextValue.stationLists = mockStationListsData;

    const { getByText, UNSAFE_getByProps } = render(<MyListsScreen />);
    await waitFor(() => expect(mockFetchStationLists).toHaveBeenCalledTimes(1));

    // Find trash icon for "To Delete" list. This is fragile.
    // A testID on the TouchableOpacity would be better.
    const deleteButton = UNSAFE_getByProps({ name: "trash" });
    fireEvent.press(deleteButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Confirm Delete',
      'Are you sure you want to delete the list "To Delete"?',
      expect.any(Array)
    );

    // Simulate pressing "Delete" on the alert
    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmDeleteButton = alertArgs[2].find((b:any) => b.text === "Delete");

    mockDeleteStationList.mockResolvedValueOnce(true); // Simulate successful deletion
    await act(async () => {
      confirmDeleteButton.onPress();
    });


    await waitFor(() => expect(mockDeleteStationList).toHaveBeenCalledWith('1'));
  });

  it('allows editing a list name', async () => {
    mockStationListsData.push({ id: '1', name: 'Original Name', stationIds: [] });
    mockAuthContextValue.stationLists = mockStationListsData;

    const { getByText, getByDisplayValue, UNSAFE_getByProps } = render(<MyListsScreen />);
    await waitFor(() => expect(mockFetchStationLists).toHaveBeenCalledTimes(1));

    const editButton = UNSAFE_getByProps({ name: "pencil" });
    fireEvent.press(editButton); // Start editing "Original Name"

    // Input field with current name should appear
    const editInput = getByDisplayValue('Original Name');
    expect(editInput).toBeTruthy();

    const updatedName = 'Updated List Name';
    fireEvent.changeText(editInput, updatedName);

    mockUpdateStationList.mockResolvedValueOnce({ id: '1', name: updatedName, stationIds: [] });

    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    await waitFor(() => expect(mockUpdateStationList).toHaveBeenCalledWith('1', updatedName));
    // After save, the input should disappear, and the updated name should be visible.
    // This requires the component to re-render with the new list data.
    // For now, we've checked the service call.
  });

  it('navigates to list detail when a list item is pressed', async () => {
    mockStationListsData.push({ id: '1', name: 'Rock Hits', stationIds: ['s1'] });
    mockAuthContextValue.stationLists = mockStationListsData;

    const { getByText } = render(<MyListsScreen />);
    await waitFor(() => expect(mockFetchStationLists).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('Rock Hits'));
    expect(mockPush).toHaveBeenCalledWith('/listDetail/1');
  });

  it('shows loading indicator when isLoadingStationLists is true and lists are empty', () => {
    mockAuthContextValue.isLoadingStationLists = true;
    mockAuthContextValue.stationLists = []; // Ensure lists are empty to show main loader

    const { getByText } = render(<MyListsScreen />);
    // fetchStationLists is called in useEffect, so it might already be false by the time we check
    // if not handled carefully. For this, we directly set the context value.
    expect(getByText('Loading lists...')).toBeTruthy();
  });
});
