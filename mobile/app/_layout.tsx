/**
 * Root Layout
 * Handles app initialization and navigation setup
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/auth';
import { Colors } from '../constants/colors';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await initialize();
      await SplashScreen.hideAsync();
    };
    init();
  }, []);

  if (isLoading) {
    return null; // Keep splash screen visible
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.white,
          },
          headerTintColor: Colors.teal,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.backgroundSecondary,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="opportunity/[id]"
          options={{
            title: 'Opportunity Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="opportunity/add"
          options={{
            title: 'New Opportunity',
            headerBackTitle: 'Cancel',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="client/[id]"
          options={{
            title: 'Client Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}
