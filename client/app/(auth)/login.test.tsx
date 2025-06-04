import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from './login'; // Adjust path if your test file is elsewhere

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
  })),
  Link: jest.fn(({ href, children, ...props }) => (
    <button {...props} onClick={() => jest.fn()(href)}>
      {children}
    </button>
  )),
}));

// Mock AuthContext
const mockLogin = jest.fn();
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('LoginScreen', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockLogin.mockClear();
  });

  it('renders the login form correctly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
    expect(getByText("Don't have an account? Register")).toBeTruthy();
  });

  it('allows users to type into email and password fields', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('calls API and context login on successful submission', async () => {
    const mockEmail = 'test@example.com';
    const mockPassword = 'password123';
    const mockToken = 'fake-token';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, message: 'Login successful' }),
    });
    mockLogin.mockResolvedValueOnce(undefined); // Simulate successful context login

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), mockEmail);
    fireEvent.changeText(getByPlaceholderText('Password'), mockPassword);
    fireEvent.press(getByText('Login'));

    // Check for loading indicator
    expect(getByText('Login').props.accessibilityState.busy).toBe(true); // Or check for ActivityIndicator

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: mockEmail, password: mockPassword }),
        })
      );
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(mockEmail, mockToken);
    });

    // Optionally, check if router.replace was called if that's the expected behavior
    // const { replace } = require('expo-router').useRouter();
    // await waitFor(() => expect(replace).toHaveBeenCalledWith('/(app)/(tabs)'));
  });

  it('displays an error message on failed API login', async () => {
    const mockEmail = 'wrong@example.com';
    const mockPassword = 'wrongpassword';
    const errorMessage = 'Invalid credentials';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: errorMessage }),
    });

    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), mockEmail);
    fireEvent.changeText(getByPlaceholderText('Password'), mockPassword);
    fireEvent.press(getByText('Login'));

    const errorTextElement = await findByText(errorMessage);
    expect(errorTextElement).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

   it('displays an error message on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));

    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password');
    fireEvent.press(getByText('Login'));

    const errorTextElement = await findByText('Network request failed');
    expect(errorTextElement).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });


  it('shows loading indicator during login attempt', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ token: 'test-token' }),
      }), 100)); // Delay response
    });
    mockLogin.mockResolvedValueOnce(undefined);

    const { getByPlaceholderText, getByText, queryByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    // Check for ActivityIndicator (assuming it would be rendered with a testID or check Button disabled)
    // For this example, we'll check if the Login button is in a busy state,
    // which is a common pattern for buttons during async operations.
    // Or, if ActivityIndicator is directly rendered, query for it.
    // Using findByTestId would be better if ActivityIndicator has testID="loading-indicator"

    // Check the Login button's disabled/busy state or presence of ActivityIndicator
    // This depends on how the loading state is implemented in the Button or if an ActivityIndicator is shown separately.
    // For simplicity, we'll assume the Button component used by React Native might have an accessibilityState.
    // A more direct way is to check for the ActivityIndicator component itself.
    // Let's assume the button text changes or an ActivityIndicator appears.
    // Since `ActivityIndicator` is a direct child when loading, we can check for it.

    expect(getByText('Login').props.accessibilityState.busy).toBe(true); // Button is busy
    // Or if an ActivityIndicator is shown instead of the button:
    // await waitFor(() => expect(queryByTestId('activity-indicator')).toBeTruthy());


    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
     // After login completes, loading should be false
    expect(getByText('Login').props.accessibilityState.busy).toBe(false);
  });

  // Test form validation (e.g., empty fields) if implemented.
  // LoginScreen currently doesn't have client-side validation before hitting API.
  // If it did, tests like these would be added:
  // it('should show validation error if email is empty', () => { ... });
  // it('should show validation error if password is empty', () => { ... });
});
