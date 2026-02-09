/**
 * Root Layout
 * Handles app initialization and navigation setup
 */
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/auth';
import { Colors } from '../constants/colors';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, isLoading } = useAuthStore();
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initialize();
      await SplashScreen.hideAsync();
      setIsAppReady(true);
    };
    init();
  }, []);

  // Show loading screen during initial app load
  if (!isAppReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#1a8cba" style={styles.loadingSpinner} />
      </View>
    );
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
            headerStyle: { backgroundColor: '#02383B' },
            headerTintColor: '#FFFFFF',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
            title: 'New Opportunity',
          }}
        />
        <Stack.Screen
          name="opportunity/edit/[id]"
          options={{
            headerStyle: { backgroundColor: '#02383B' },
            headerTintColor: '#FFFFFF',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
            title: 'Edit Opportunity',
          }}
        />
        <Stack.Screen
          name="client/[id]"
          options={{
            title: 'Client Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="pre-assessment"
          options={{
            headerStyle: { backgroundColor: '#02383B' },
            headerTintColor: '#FFFFFF',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
            title: 'Pre-Assessment Tool',
          }}
        />
        <Stack.Screen
          name="account/edit-profile"
          options={{
            headerStyle: { backgroundColor: '#02383B' },
            headerTintColor: '#FFFFFF',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
            title: 'Edit Profile',
          }}
        />
        <Stack.Screen
          name="account/change-password"
          options={{
            headerStyle: { backgroundColor: '#02383B' },
            headerTintColor: '#FFFFFF',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
            title: 'Change Password',
          }}
        />
        <Stack.Screen
          name="account/company-details"
          options={{
            headerStyle: { backgroundColor: '#02383B' },
            headerTintColor: '#FFFFFF',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
            title: 'Company Details',
          }}
        />
        <Stack.Screen
          name="account/team"
          options={{
            headerStyle: { backgroundColor: '#02383B' },
            headerTintColor: '#FFFFFF',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
            title: 'Team Management',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingLogo: {
    width: 180,
    height: 140,
  },
  loadingSpinner: {
    marginTop: 20,
  },
});
