/**
 * Auth Layout
 * Wraps all authentication screens
 */
import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function AuthLayout() {
  return (
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
          backgroundColor: Colors.white,
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Login',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Create Account',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Reset Password',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="otp-verification"
        options={{
          title: 'Verify OTP',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="verify-2fa"
        options={{
          title: 'Two-Factor Authentication',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
