/**
 * Edit Profile Screen
 * Update personal information
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
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { get, patch } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { StateOptions } from '../../types';

interface AccountData {
  current_user: {
    id: string;
    first_name: string;
    surname: string;
    email: string;
    phone: string;
    state: string | null;
    role: string;
  };
}

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchProfile = async () => {
    try {
      const data = await get<AccountData>('/referrer/account');
      const u = data.current_user;
      setFirstName(u.first_name || '');
      setSurname(u.surname || '');
      setEmail(u.email || '');
      setPhone(u.phone || '');
      setState(u.state || '');
    } catch (err) {
      setToast({ message: 'Failed to load profile', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.first_name = 'First name is required';
    if (!surname.trim()) newErrors.surname = 'Surname is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await patch('/referrer/account/update-profile', {
        first_name: firstName.trim(),
        surname: surname.trim(),
        email: email.trim(),
        phone: phone.trim(),
        state: state || null,
      });
      await refreshUser();
      setToast({ message: 'Profile updated successfully', type: 'success' });
      setTimeout(() => router.back(), 1000);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* First Name */}
        <View style={styles.field}>
          <Text style={styles.label}>First Name</Text>
          <View style={[styles.inputBox, !!errors.first_name && styles.inputError]}>
            <Ionicons name="person-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={firstName}
              onChangeText={(v) => { setFirstName(v); setErrors({ ...errors, first_name: '' }); }}
              placeholder="Enter first name"
              placeholderTextColor="#aaa"
            />
          </View>
          {errors.first_name ? <Text style={styles.errorText}>{errors.first_name}</Text> : null}
        </View>

        {/* Surname */}
        <View style={styles.field}>
          <Text style={styles.label}>Surname</Text>
          <View style={[styles.inputBox, !!errors.surname && styles.inputError]}>
            <Ionicons name="person-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={surname}
              onChangeText={(v) => { setSurname(v); setErrors({ ...errors, surname: '' }); }}
              placeholder="Enter surname"
              placeholderTextColor="#aaa"
            />
          </View>
          {errors.surname ? <Text style={styles.errorText}>{errors.surname}</Text> : null}
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputBox, !!errors.email && styles.inputError]}>
            <Ionicons name="mail-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors({ ...errors, email: '' }); }}
              placeholder="Enter email"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        {/* Phone */}
        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <View style={styles.inputBox}>
            <Ionicons name="call-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* State */}
        <View style={styles.field}>
          <Text style={styles.label}>State</Text>
          <TouchableOpacity
            style={styles.inputBox}
            onPress={() => setShowStatePicker(!showStatePicker)}
          >
            <Ionicons name="location-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
            <Text style={[styles.inputField, !state && { color: '#aaa' }]}>
              {state ? StateOptions.find(s => s.value === state)?.label || state : 'Select state'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        {showStatePicker && (
          <View style={styles.pickerOptions}>
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => { setState(''); setShowStatePicker(false); }}
            >
              <Text style={styles.pickerOptionText}>-- None --</Text>
            </TouchableOpacity>
            {StateOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerOption, state === opt.value && styles.pickerOptionActive]}
                onPress={() => { setState(opt.value); setShowStatePicker(false); }}
              >
                <Text style={[styles.pickerOptionText, state === opt.value && styles.pickerOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
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
            <Text style={styles.saveBtnText}>Save Changes</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
  pickerOptions: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e8ed',
    marginTop: -8,
    marginBottom: 16,
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionActive: {
    backgroundColor: `${Colors.primary}15`,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.gray[700],
  },
  pickerOptionTextActive: {
    color: Colors.primary,
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
