/**
 * Account Screen
 * User profile and settings
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { Card, ListCard, Button, RoleBadge } from '../../components/ui';
import { Colors } from '../../constants/colors';

export default function AccountScreen() {
  const { user, logout, biometricAvailable, biometricEnabled, setBiometric } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAdmin = user?.role === 'referrer_admin';

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  // Toggle biometric
  const toggleBiometric = async () => {
    await setBiometric(!biometricEnabled);
  };

  // Get initials
  const getInitials = () => {
    const first = user?.first_name?.[0] || '';
    const last = user?.surname?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.name}>
          {user?.first_name} {user?.surname}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <RoleBadge role={user?.role || ''} style={styles.roleBadge} />
      </View>

      {/* Profile Settings */}
      <Card title="Profile" style={styles.section}>
        <ListCard
          title="Edit Profile"
          subtitle="Update your personal information"
          leftIcon={<Ionicons name="person-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => {}}
        />
        <ListCard
          title="Change Password"
          subtitle="Update your password"
          leftIcon={<Ionicons name="lock-closed-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => {}}
        />
        {biometricAvailable && (
          <ListCard
            title="Biometric Login"
            subtitle={biometricEnabled ? 'Enabled' : 'Disabled'}
            leftIcon={<Ionicons name="finger-print-outline" size={24} color={Colors.gray[500]} />}
            rightContent={
              <View style={[styles.toggle, biometricEnabled && styles.toggleActive]}>
                <View style={[styles.toggleDot, biometricEnabled && styles.toggleDotActive]} />
              </View>
            }
            onPress={toggleBiometric}
            showChevron={false}
          />
        )}
      </Card>

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          <Card title="Organization" style={styles.section}>
            <ListCard
              title="Company Details"
              subtitle="View and edit company information"
              leftIcon={<Ionicons name="business-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => {}}
            />
            <ListCard
              title="Team Management"
              subtitle="Manage team members"
              leftIcon={<Ionicons name="people-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => {}}
            />
            <ListCard
              title="Commission Structure"
              subtitle="View commission split"
              leftIcon={<Ionicons name="cash-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => {}}
            />
          </Card>

          <Card title="Security" style={styles.section}>
            <ListCard
              title="Login History"
              subtitle="View recent login activity"
              leftIcon={<Ionicons name="time-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => {}}
            />
            <ListCard
              title="Download Agreement"
              subtitle="Download referrer agreement PDF"
              leftIcon={<Ionicons name="document-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => {}}
            />
          </Card>
        </>
      )}

      {/* Support */}
      <Card title="Support" style={styles.section}>
        <ListCard
          title="Contact Us"
          subtitle="Get help from our team"
          leftIcon={<Ionicons name="help-circle-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => {}}
        />
        <ListCard
          title="Terms & Conditions"
          subtitle="Read our terms of service"
          leftIcon={<Ionicons name="document-text-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => {}}
        />
        <ListCard
          title="Privacy Policy"
          subtitle="Read our privacy policy"
          leftIcon={<Ionicons name="shield-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => {}}
        />
      </Card>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>Loanease v1.0.0</Text>
      </View>

      {/* Logout */}
      <Button
        title="Logout"
        variant="destructive"
        onPress={handleLogout}
        loading={isLoggingOut}
        fullWidth
        style={styles.logoutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.teal,
  },
  email: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 12,
  },
  section: {
    marginBottom: 16,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.gray[300],
    padding: 3,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  toggleDotActive: {
    transform: [{ translateX: 20 }],
  },
  appInfo: {
    alignItems: 'center',
    marginVertical: 16,
  },
  appVersion: {
    fontSize: 12,
    color: Colors.gray[400],
  },
  logoutButton: {
    marginTop: 8,
  },
});
