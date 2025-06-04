import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react'; // Added React
import 'react-native-reanimated';
import { ActivityIndicator, View } from 'react-native'; // Added ActivityIndicator, View

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext'; // Import AuthProvider and useAuth

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
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Check if the current route is part of the (app) group.
    // Expo Router v3 uses a different segment structure for group routes.
    // For instance, /(app)/tabs/index would be ['', '(app)', 'tabs', 'index']
    // or for /(auth)/login it would be ['', '(auth)', 'login']
    // A simple check for the group name in segments should be okay.
    const currentRouteGroup = segments.length > 1 ? segments[1] : null;


    if (isAuthenticated) {
      if (currentRouteGroup === 'auth') { // If in auth group, redirect to app
        router.replace('/(tabs)'); // Corrected: redirect to (tabs) directly
      }
    } else {
      // If not authenticated, and not already in auth flow, redirect to login
      // segments[0] is the directory, segments[1] can be the screen in that directory
      // e.g. for /login, segments might be ['(auth)', 'login']
      // If we are anywhere NOT in (auth) group, redirect to login.
      if (segments[0] !== '(auth)') {
         router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? DarkTheme.colors.background : DefaultTheme.colors.background }}>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? DarkTheme.colors.text : DefaultTheme.colors.text} />
      </View>
    );
  }

  // Based on Expo Router's file system routing,
  // it will automatically render the correct stack ((app) or (auth))
  // The Stack below just needs to declare the available groups (or top-level screens).
  // The headerShown: false is to avoid double headers if groups manage their own.
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Define groups. Expo Router will pick the right one based on URL. */}
        {/* The (app) group is not currently used for main content if (tabs) is separate */}
        {/* <Stack.Screen name="(app)" /> */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="listDetail/[listId]"
          options={{
            headerShown: true, // Show header for this screen
            title: 'List Details', // Default title, can be overridden by screen component
          }}
        />
        {/*
          The modal screen definition `name="modal"` is kept at root for now,
          as moving it also failed.
          If `modal.tsx` was moved to `client/app/(app)/modal.tsx`,
          Expo Router should pick it up from there when navigated to.
          The (app) group's layout (`client/app/(app)/_layout.tsx` if you create one)
          would then be responsible for defining how `modal` is presented if needed.
          Or, if it's a global modal, its definition might need to be adjusted.
          For now, let's assume modals are handled within their respective groups.
        */}
      </Stack>
    </ThemeProvider>
  );
}
