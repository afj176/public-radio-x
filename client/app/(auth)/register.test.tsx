import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from './register'; // Adjust path as necessary

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
const mockRegister = jest.fn();
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockRegister.mockClear();
  });

  it('renders the registration form correctly', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
    expect(getByText('Register')).toBeTruthy();
    expect(getByText('Already have an account? Login')).toBeTruthy();
  });

  it('allows users to type into email, password, and confirm password fields', () => {
    const { getByPlaceholderText } = render(<RegisterScreen />);
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
    expect(confirmPasswordInput.props.value).toBe('password123');
  });

  it('shows an error if passwords do not match', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password456');
    fireEvent.press(getByText('Register'));

    const errorTextElement = await findByText('Passwords do not match');
    expect(errorTextElement).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls API and context register on successful submission', async () => {
    const mockEmail = 'newuser@example.com';
    const mockPassword = 'newpassword123';
    const mockToken = 'new-fake-token';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, message: 'Registration successful' }),
    });
    mockRegister.mockResolvedValueOnce(undefined); // Simulate successful context registration

    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), mockEmail);
    fireEvent.changeText(getByPlaceholderText('Password'), mockPassword);
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), mockPassword);
    fireEvent.press(getByText('Register'));

    expect(getByText('Register').props.accessibilityState.busy).toBe(true);


    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/register'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: mockEmail, password: mockPassword }),
        })
      );
    });

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(mockEmail, mockToken);
    });
  });

  it('displays an error message on failed API registration', async () => {
    const mockEmail = 'existing@example.com';
    const mockPassword = 'password123';
    const errorMessage = 'Email already exists';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: errorMessage }),
    });

    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), mockEmail);
    fireEvent.changeText(getByPlaceholderText('Password'), mockPassword);
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), mockPassword);
    fireEvent.press(getByText('Register'));

    const errorTextElement = await findByText(errorMessage);
    expect(errorTextElement).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays an error message on network error during registration', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down'));

    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');
    fireEvent.press(getByText('Register'));

    const errorTextElement = await findByText('Network down');
    expect(errorTextElement).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });


  it('shows loading indicator during registration attempt', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ token: 'test-token' }),
      }), 100));
    });
    mockRegister.mockResolvedValueOnce(undefined);

    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');
    fireEvent.press(getByText('Register'));

    expect(getByText('Register').props.accessibilityState.busy).toBe(true);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
    expect(getByText('Register').props.accessibilityState.busy).toBe(false);
  });
});
