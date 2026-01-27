/**
 * Entry Point
 * Redirects based on authentication state
 */
import { useEffect } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { Colors } from '../constants/colors';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Loanease</Text>
          <Text style={styles.tagline}>Referrer Portal</Text>
        </View>
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.white,
  },
  tagline: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 8,
  },
});
