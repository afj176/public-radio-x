// client/styles/theme.ts

// Define base colors that might be shared or are abstract
const brandColors = {
  primary: '#007AFF', // Apple Blue
  secondary: '#5856D6', // Apple Purple
  success: '#34C759', // Apple Green
  error: '#FF3B30', // Apple Red
  warning: '#FF9500', // Apple Orange
};

export const lightColors = {
  ...brandColors,
  background: '#F2F2F7',      // System Gray 6 Light
  cardBackground: '#FFFFFF',
  text: '#000000',
  subtleText: '#8A8A8E',      // System Gray Light
  placeholderText: '#C7C7CD', // System Gray 2 Light
  border: '#D1D1D6',          // System Gray 3 Light
  lightGray: '#E5E5EA',       // System Gray 5 Light
  mediumGray: '#D1D1D6',
  darkGrayText: '#3A3A3C',    // For dark text on light backgrounds if needed, or elements
  // Specific for light theme if needed
  primary_light: '#E3F2FD', // Example light variant for primary
  primary_dark: '#0056b3',  // Example dark variant for primary (text on primary_light)
  glassBackground: 'rgba(255, 255, 255, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
};

export const darkColors = {
  ...brandColors, // Brand colors often remain the same or have slight adjustments
  background: '#000000',      // Pure Black or very dark gray
  cardBackground: '#1C1C1E',  // System Gray 6 Dark
  text: '#FFFFFF',
  subtleText: '#8D8D93',      // System Gray Dark
  placeholderText: '#5A5A5E', // System Gray 2 Dark
  border: '#38383A',          // System Gray 3 Dark
  lightGray: '#2C2C2E',       // System Gray 5 Dark
  mediumGray: '#3A3A3C',
  darkGrayText: '#E5E5EA',    // For light text on dark backgrounds
  // Specific for dark theme
  primary_light: '#2A2A4D', // Darker variant for primary light effect
  primary_dark: '#90BFFF',  // Lighter text on dark primary variant
  glassBackground: 'rgba(0, 0, 0, 0.5)', // Semi-transparent dark
  glassBorder: 'rgba(255, 255, 255, 0.2)',
};

// Common properties (spacing, typography, etc.) remain the same
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16, // Base size
    lg: 18,
    xl: 24,
    xxl: 32,
    title: 28,
  },
  lineHeights: {
    body: 1.5, // For sm, md, lg text
    heading: 1.2, // For xl, xxl, title
  },
  fontWeights: {
    light: '300',
    regular: '400',
    medium: '500', // Good for buttons, emphasized text
    semiBold: '600',
    bold: '700',
  },
  // Define font families if custom fonts are loaded
  // fontFamily: 'System', // Default system font
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  round: 999,
};

export const shadows = {
  // Subtle shadow for cards or interactive elements
  // Shadow colors might need to adapt to the theme.
  // For simplicity, we can define a generic shadow and then override shadowColor in components,
  // or have theme-specific shadow definitions.
  card: {
    shadowColor: '#000', // Generic black shadow, opacity will make it subtle
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Adjust this for light/dark themes if needed
    shadowRadius: 3,
    elevation: 3, // For Android
  },
  // Deeper shadow for modals or elevated components
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // Adjust for light/dark
    shadowRadius: 8,
    elevation: 10,
  },
  // Neumorphic style shadows (example, requires careful implementation)
  // Typically use multiple shadows: one light (top-left), one dark (bottom-right)
  // neumorphicOuter: {
  //   shadowOffset: { width: -4, height: -4 },
  //   shadowOpacity: 1,
  //   shadowRadius: 4,
  //   // For the light shadow, color usually based on background
  //   // For the dark shadow, color usually a darker shade of background
  // },
  // neumorphicInner: { ... }
};

// The exported theme object could dynamically switch based on a preference,
// but the ThemeContext will handle that. This file just exports the building blocks.
// We can export a default theme structure that components can expect.
export const defaultAppTheme = { // Default to light theme building blocks
  colors: lightColors,
  spacing,
  typography,
  borderRadius,
  shadows,
};

// Export all parts so ThemeContext can build the theme object
// export default defaultAppTheme; // No longer a single default export like this
