import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, spacing, typography, borderRadius, shadows } from '@/styles/theme'; // Import all parts

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof lightColors; // The actual colors object based on themeMode
  // Potentially expose the full theme object if spacing, typography etc. might change too
  // currentTheme: typeof defaultAppTheme;
}

const THEME_PREFERENCE_KEY = 'theme_preference';

// Create the context with a default value (this default is not used if Provider wraps app)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemTheme = Appearance.getColorScheme() || 'light'; // Default to light if system has no preference
  const [themeMode, setThemeModeState] = useState<ThemeMode>(systemTheme);

  // Effect to load saved theme preference from AsyncStorage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_PREFERENCE_KEY) as ThemeMode | null;
        if (savedMode) {
          setThemeModeState(savedMode);
        } else {
          setThemeModeState(systemTheme); // Use system theme if no preference saved
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
        setThemeModeState(systemTheme); // Fallback to system theme on error
      }
    };
    loadThemePreference();
  }, [systemTheme]);

  // Function to update and save theme preference
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Determine current theme colors based on themeMode
  const currentThemeColors = useMemo(() => {
    return themeMode === 'dark' ? darkColors : lightColors;
  }, [themeMode]);

  // Optional: If other parts of the theme (spacing, typography) could change,
  // build a full currentTheme object here. For now, only colors change.
  // const currentTheme = useMemo(() => ({
  //   colors: currentThemeColors,
  //   spacing,
  //   typography,
  //   borderRadius,
  //   shadows,
  // }), [currentThemeColors]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, colors: currentThemeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the ThemeContext
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};
