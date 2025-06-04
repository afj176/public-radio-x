import React from 'react';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* You can add other app-level stack screens here if needed */}
      {/* For example, if modal.tsx was moved to client/app/(app)/modal.tsx: */}
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
