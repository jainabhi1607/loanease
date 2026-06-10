/**
 * Delete Account Screen
 * Allows referrer to permanently delete their account.
 * Required for Google Play Store compliance (in-app account deletion).
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { post } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

export default function DeleteAccountScreen() {
  const { logout, user } = useAuthStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const confirmDelete = () => {
    if (!password) {
      setError('Please enter your password to confirm');
      return;
    }
    setError('');

    const performDelete = async () => {
      setIsDeleting(true);
      try {
        await post('/referrer/account/delete-account', { password });
        setToast({ message: 'Account deleted', type: 'success' });
        setTimeout(async () => {
          await logout();
          router.replace('/(auth)/login');
        }, 1200);
      } catch (err: any) {
        const message = err?.data?.error || err?.message || 'Failed to delete account';
        setError(message);
        setToast({ message, type: 'error' });
      } finally {
        setIsDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('This will permanently delete your account. Continue?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Account',
        'This will permanently delete your account. This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={24} color={Colors.error} />
          <Text style={styles.warningText}>
            Deleting your account is permanent and cannot be undone.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What will be deleted</Text>
        <View style={styles.list}>
          <View style={styles.listItem}>
            <Ionicons name="close-circle" size={18} color={Colors.error} />
            <Text style={styles.listText}>Your login credentials and password</Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="close-circle" size={18} color={Colors.error} />
            <Text style={styles.listText}>Your name, email, and phone number</Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="close-circle" size={18} color={Colors.error} />
            <Text style={styles.listText}>Active sessions and biometric login on this device</Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="close-circle" size={18} color={Colors.error} />
            <Text style={styles.listText}>Two-factor authentication codes</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What will be retained</Text>
        <View style={styles.list}>
          <View style={styles.listItem}>
            <Ionicons name="archive-outline" size={18} color={Colors.gray[500]} />
            <Text style={styles.listText}>
              Loan opportunities and client records you created (anonymised and retained
              for regulatory compliance)
            </Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="archive-outline" size={18} color={Colors.gray[500]} />
            <Text style={styles.listText}>
              Audit logs (required by law; do not contain personal identifiers after
              deletion)
            </Text>
          </View>
        </View>

        {user?.role === 'referrer_admin' && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#1a8cba" />
            <Text style={styles.infoText}>
              If you are the only administrator on your organisation, your company account
              will also be deactivated.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Enter your password to confirm</Text>
        <View style={[styles.inputBox, !!error && styles.inputError]}>
          <Ionicons name="lock-closed-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            placeholder="Your current password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.deleteBtn, (isDeleting || !password) && styles.deleteBtnDisabled]}
          onPress={confirmDelete}
          disabled={isDeleting || !password}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.deleteBtnText}>Permanently Delete My Account</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={isDeleting}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {toast && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Ionicons
            name={toast.type === 'error' ? 'close-circle' : 'checkmark-circle'}
            size={20}
            color="#fff"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  warningText: {
    fontSize: 14,
    color: '#991B1B',
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.teal,
    marginTop: 8,
    marginBottom: 10,
  },
  list: {
    marginBottom: 20,
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listText: {
    fontSize: 13,
    color: Colors.gray[700],
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F4FC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#0d4f6e',
    flex: 1,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 6,
    marginTop: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f8fa',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e8ed',
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.error,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: Colors.gray[600],
    fontSize: 15,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  toastSuccess: {
    backgroundColor: Colors.success,
  },
  toastError: {
    backgroundColor: Colors.error,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
