import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useMemo } from 'react'; // Added useMemo
import 'react-native-reanimated';
import { ActivityIndicator, View, StatusBar } from 'react-native';
// useColorScheme from react-native is for system theme, we'll use our context
// import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CustomThemeProvider, useTheme } from '@/context/ThemeContext'; // Import ThemeProvider and useTheme

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  // initialRouteName will be handled by the logic in RootLayoutNav
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null; // Or a loading indicator
  }

  return (
    <AuthProvider>
      <CustomThemeProvider>
        <RootLayoutNav />
      </CustomThemeProvider>
    </AuthProvider>
  );
}

// Renamed to avoid confusion with system's colorScheme if that was intended by original useColorScheme hook
function RootLayoutNavInternal() {
  // const systemProvidedColorScheme = useColorScheme(); // Original hook, if needed for comparison or initial
  const { colors, themeMode } = useTheme(); // Use our theme context
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isAuthLoading) return; // Wait for auth state

    // Check if the current route is part of the (app) group.
    // Expo Router v3 uses a different segment structure for group routes.
    // For instance, /(app)/tabs/index would be ['', '(app)', 'tabs', 'index']
    // or for /(auth)/login it would be ['', '(auth)', 'login']
    // A simple check for the group name in segments should be okay.
    // For Expo Router, segments[0] is often the group name like '(auth)' or '(tabs)'
    const currentRouteGroup = segments[0];

    if (isAuthenticated) {
      if (currentRouteGroup === '(auth)') { // If in auth group, redirect to app
        router.replace('/(tabs)');
      }
    } else {
      // If not authenticated, and not already in auth flow, redirect to login.
      if (currentRouteGroup !== '(auth)') {
         router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isAuthLoading, segments, router]);

  // This ThemeProvider from @react-navigation/native is for navigation elements (headers, etc.)
  // It's different from our CustomThemeProvider which provides colors for our components.
  // We can make its theme dynamic based on our themeMode.
  const navigationTheme = useMemo(() => {
    const baseNavTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...baseNavTheme,
      colors: {
        ...baseNavTheme.colors,
        background: colors.background, // Use our app's background
        card: colors.cardBackground,   // Use our app's card background for headers
        text: colors.text,             // Use our app's text color for header text
        primary: colors.primary,       // Use our app's primary color for tint
        border: colors.border,         // Use our app's border color
      },
    };
  }, [themeMode, colors]);

  if (isAuthLoading) { // Only wait for auth loading here. Theme loading is handled by CustomThemeProvider.
    return (
      // Use a View with background from our theme for the loading screen
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="listDetail/[listId]"
          options={{
            headerShown: true,
            // title: 'List Details', // Title can be set by the screen itself
            // Header styling will be affected by the navigationTheme
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

// Wrap RootLayoutNavInternal with the CustomThemeProvider to access useTheme()
function RootLayoutNav() {
  return <RootLayoutNavInternal />;
}
