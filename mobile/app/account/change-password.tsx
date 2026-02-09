/**
 * Change Password Screen
 * Update user password
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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { patch } from '../../lib/api';
import { Colors } from '../../constants/colors';

export default function ChangePasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!newPassword) {
      newErrors.new_password = 'Password is required';
    } else if (newPassword.length < 10) {
      newErrors.new_password = 'Password must be at least 10 characters';
    }
    if (!confirmPassword) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await patch('/referrer/account/update-profile', {
        new_password: newPassword,
      });
      setToast({ message: 'Password updated successfully', type: 'success' });
      setTimeout(() => router.back(), 1000);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to update password', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#1a8cba" />
          <Text style={styles.infoText}>
            Password must be at least 10 characters long.
          </Text>
        </View>

        {/* New Password */}
        <View style={styles.field}>
          <Text style={styles.label}>New Password</Text>
          <View style={[styles.inputBox, !!errors.new_password && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); setErrors({ ...errors, new_password: '' }); }}
              placeholder="Enter new password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showNew}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
            </TouchableOpacity>
          </View>
          {errors.new_password ? <Text style={styles.errorText}>{errors.new_password}</Text> : null}
        </View>

        {/* Confirm Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputBox, !!errors.confirm_password && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setErrors({ ...errors, confirm_password: '' }); }}
              placeholder="Confirm new password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
            </TouchableOpacity>
          </View>
          {errors.confirm_password ? <Text style={styles.errorText}>{errors.confirm_password}</Text> : null}
        </View>

        {/* Password strength indicator */}
        {newPassword.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthFill,
                  {
                    width: newPassword.length >= 10 ? '100%' : `${(newPassword.length / 10) * 100}%`,
                    backgroundColor: newPassword.length >= 10 ? Colors.success : newPassword.length >= 6 ? Colors.warning : Colors.error,
                  },
                ]}
              />
            </View>
            <Text style={[styles.strengthText, {
              color: newPassword.length >= 10 ? Colors.success : newPassword.length >= 6 ? Colors.warning : Colors.error,
            }]}>
              {newPassword.length >= 10 ? 'Strong' : newPassword.length >= 6 ? 'Medium' : 'Weak'}
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Toast */}
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4FC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#0d4f6e',
    flex: 1,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 6,
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
