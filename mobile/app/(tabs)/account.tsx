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
  Platform,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../store/auth';
import { Card, ListCard, Button, RoleBadge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { API_CONFIG, APP_INFO } from '../../constants/config';
import { getAccessToken } from '../../lib/storage';
import { get } from '../../lib/api';

const TERMS_URL = 'https://loanease-app.vercel.app/terms';
const PRIVACY_URL = 'https://loanease-app.vercel.app/privacy';

export default function AccountScreen() {
  const { user, logout, biometricAvailable, biometricEnabled, setBiometric, enableBiometricWithCredentials } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  const isAdmin = user?.role === 'referrer_admin';

  const handleLogout = async () => {
    const doLogout = async () => {
      setIsLoggingOut(true);
      await logout();
      router.replace('/(auth)/login');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        await doLogout();
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  const toggleBiometric = async () => {
    if (biometricEnabled) {
      // Turning OFF — clears stored credentials inside the store helper.
      await setBiometric(false);
      return;
    }
    // Turning ON — capture the user's password so biometric login can re-use it.
    setBiometricPassword('');
    setBiometricError('');
    setBiometricModalOpen(true);
  };

  const handleConfirmBiometric = async () => {
    if (!biometricPassword) {
      setBiometricError('Password is required');
      return;
    }
    if (!user?.email) {
      setBiometricError('Account email not available. Please log in again.');
      return;
    }
    setBiometricBusy(true);
    setBiometricError('');
    try {
      // Verify the password by calling the login endpoint. We don't replace
      // the user's current session — we just confirm the password is valid
      // before storing it for biometric login.
      const verifyResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: biometricPassword, mobile_app: true }),
      });
      const verifyData = await verifyResponse.json().catch(() => ({}));

      if (!verifyResponse.ok || verifyData?.success === false) {
        setBiometricError(verifyData?.error || 'Password did not match. Please try again.');
        return;
      }

      await enableBiometricWithCredentials(user.email, biometricPassword);
      setBiometricModalOpen(false);
      setBiometricPassword('');
      Alert.alert(
        'Biometric login enabled',
        'You can now log in with your fingerprint or face after signing out.'
      );
    } catch (err: any) {
      setBiometricError(err?.message || 'Failed to enable biometric login.');
    } finally {
      setBiometricBusy(false);
    }
  };

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unable to open', `Cannot open ${url}`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open', 'Please try again later.');
    }
  };

  const handleContactUs = () => {
    const emailUrl = `mailto:${APP_INFO.SUPPORT_EMAIL}?subject=Loanease%20Mobile%20Support`;
    const phoneDigits = APP_INFO.SUPPORT_PHONE.replace(/\s+/g, '');
    const phoneUrl = `tel:${phoneDigits}`;

    if (Platform.OS === 'web') {
      const choice = window.confirm(
        `Email: ${APP_INFO.SUPPORT_EMAIL}\nPhone: ${APP_INFO.SUPPORT_PHONE}\n\nClick OK to email us, Cancel to call.`
      );
      openUrl(choice ? emailUrl : phoneUrl);
      return;
    }

    Alert.alert(
      'Contact Us',
      `Email: ${APP_INFO.SUPPORT_EMAIL}\nPhone: ${APP_INFO.SUPPORT_PHONE}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => openUrl(phoneUrl) },
        { text: 'Email', onPress: () => openUrl(emailUrl) },
      ]
    );
  };

  const handleDownloadAgreement = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const downloadOnce = async (token: string) => {
      const fileUri = `${FileSystem.cacheDirectory ?? ''}Loanease-ReferrerAgreement.pdf`;
      return FileSystem.downloadAsync(
        `${API_CONFIG.BASE_URL}/referrer/account/download-agreement`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    };

    try {
      let token = await getAccessToken();
      if (!token) {
        Alert.alert('Please log in again to download.');
        return;
      }

      let result = await downloadOnce(token);

      // FileSystem.downloadAsync bypasses our api.ts auto-refresh on 401.
      // If the access token is expired, ping any endpoint via api.ts to refresh, then retry.
      if (result.status === 401) {
        try {
          await get('/referrer/account');
        } catch {
          // Refresh may still have succeeded even if the call failed for other reasons
        }
        const refreshed = await getAccessToken();
        if (refreshed && refreshed !== token) {
          token = refreshed;
          result = await downloadOnce(token);
        }
      }

      if (result.status === 401) {
        Alert.alert('Session expired', 'Please log out and log back in to download.');
        return;
      }

      if (result.status !== 200) {
        throw new Error(`Server returned ${result.status}`);
      }

      if (Platform.OS === 'web') {
        await Linking.openURL(result.uri);
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Referrer Agreement',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `Agreement saved to ${result.uri}`);
      }
    } catch (err: any) {
      Alert.alert('Download failed', err?.message || 'Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getInitials = () => {
    const first = user?.first_name?.[0] || '';
    const last = user?.surname?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      <Card title="Profile" style={styles.section}>
        <ListCard
          title="Edit Profile"
          subtitle="Update your personal information"
          leftIcon={<Ionicons name="person-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => router.push('/account/edit-profile')}
        />
        <ListCard
          title="Change Password"
          subtitle="Update your password"
          leftIcon={<Ionicons name="lock-closed-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => router.push('/account/change-password')}
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

      {isAdmin && (
        <>
          <Card title="Organization" style={styles.section}>
            <ListCard
              title="Company Details"
              subtitle="View and edit company information"
              leftIcon={<Ionicons name="business-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => router.push('/account/company-details')}
            />
            <ListCard
              title="Team Management"
              subtitle="Manage team members"
              leftIcon={<Ionicons name="people-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => router.push('/account/team')}
            />
            <ListCard
              title="Commission Structure"
              subtitle="View commission split"
              leftIcon={<Ionicons name="cash-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => router.push('/account/company-details')}
            />
          </Card>

          <Card title="Security" style={styles.section}>
            <ListCard
              title="Login History"
              subtitle="View recent login activity"
              leftIcon={<Ionicons name="time-outline" size={24} color={Colors.gray[500]} />}
              onPress={() => router.push('/account/login-history')}
            />
            <ListCard
              title="Download Agreement"
              subtitle={isDownloading ? 'Preparing PDF...' : 'Download referrer agreement PDF'}
              leftIcon={<Ionicons name="document-outline" size={24} color={Colors.gray[500]} />}
              onPress={handleDownloadAgreement}
            />
          </Card>
        </>
      )}

      <Card title="Support" style={styles.section}>
        <ListCard
          title="Contact Us"
          subtitle="Get help from our team"
          leftIcon={<Ionicons name="help-circle-outline" size={24} color={Colors.gray[500]} />}
          onPress={handleContactUs}
        />
        <ListCard
          title="Terms & Conditions"
          subtitle="Read our terms of service"
          leftIcon={<Ionicons name="document-text-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => openUrl(TERMS_URL)}
        />
        <ListCard
          title="Privacy Policy"
          subtitle="Read our privacy policy"
          leftIcon={<Ionicons name="shield-outline" size={24} color={Colors.gray[500]} />}
          onPress={() => openUrl(PRIVACY_URL)}
        />
      </Card>

      <Card title="Danger Zone" style={styles.section}>
        <ListCard
          title="Delete Account"
          subtitle="Permanently delete your account"
          leftIcon={<Ionicons name="trash-outline" size={24} color={Colors.error} />}
          onPress={() => router.push('/account/delete-account')}
        />
      </Card>

      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>Loanease v{APP_INFO.VERSION}</Text>
      </View>

      <Button
        title="Logout"
        variant="destructive"
        onPress={handleLogout}
        loading={isLoggingOut}
        fullWidth
        style={styles.logoutButton}
      />

      <Modal
        visible={biometricModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !biometricBusy && setBiometricModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enable biometric login</Text>
            <Text style={styles.modalBody}>
              Enter your password once so we can use biometric login to sign you back in after you log out.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={biometricPassword}
              onChangeText={(v) => { setBiometricPassword(v); setBiometricError(''); }}
              placeholder="Your current password"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!biometricBusy}
            />
            {biometricError ? <Text style={styles.modalError}>{biometricError}</Text> : null}
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setBiometricModalOpen(false); setBiometricPassword(''); }}
                disabled={biometricBusy}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, (biometricBusy || !biometricPassword) && styles.modalBtnDisabled]}
                onPress={handleConfirmBiometric}
                disabled={biometricBusy || !biometricPassword}
              >
                {biometricBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Enable</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 22,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.teal,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 13,
    color: Colors.gray[600],
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#f5f8fa',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#e0e8ed',
    fontSize: 15,
    color: '#333',
  },
  modalError: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 6,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalBtnCancelText: {
    color: Colors.gray[700],
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.primary,
  },
  modalBtnConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
});
