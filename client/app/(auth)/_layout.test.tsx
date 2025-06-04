import React from 'react';
import { render } from '@testing-library/react-native';
import AuthLayout from './_layout'; // Adjust path as necessary

// Mock expo-router's Stack and Screen components
// This is a simplified mock. For more complex Stack interactions,
// you might need a more sophisticated mock or to wrap with a real navigator.
jest.mock('expo-router', () => ({
  Stack: jest.fn(({ children }) => <>{children}</>), // Renders children directly
  Screen: jest.fn(() => null), // Screen itself doesn't render anything in this mock
}));

describe('AuthLayout', () => {
  it('renders Stack navigator with specified screens', () => {
    render(<AuthLayout />);

    // Check if Stack is rendered
    const { Stack, Screen } = require('expo-router');
    expect(Stack).toHaveBeenCalledTimes(1);

    // Check if Stack.Screen is called for login and register screens
    // We are checking the props passed to Stack.Screen to ensure correct configuration
    expect(Screen).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'login', options: { title: 'Login' } }),
      {} // Second argument to React.createElement, context, usually empty for components
    );
    expect(Screen).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'register', options: { title: 'Create Account' } }),
      {}
    );
  });
});
