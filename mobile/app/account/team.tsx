/**
 * Team Management Screen
 * Manage team members (Referrer Admin only)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { get, post, patch, del } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { StateOptions } from '../../types';
import { RoleBadge } from '../../components/ui';

interface TeamUser {
  id: string;
  first_name: string;
  surname: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  state: string | null;
}

interface AccountData {
  users: TeamUser[];
}

type FormMode = 'add' | 'edit';

const ROLE_OPTIONS = [
  { value: 'referrer_admin', label: 'Account Owner' },
  { value: 'referrer_team', label: 'Team Member' },
];

export default function TeamScreen() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('referrer_team');
  const [state, setState] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await get<AccountData>('/referrer/account');
      setUsers(data.users || []);
    } catch (err) {
      setToast({ message: 'Failed to load team members', type: 'error' });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const resetForm = () => {
    setFirstName('');
    setSurname('');
    setEmail('');
    setPhone('');
    setRole('referrer_team');
    setState('');
    setIsActive(true);
    setErrors({});
    setShowRolePicker(false);
    setShowStatePicker(false);
  };

  const openAddModal = () => {
    resetForm();
    setFormMode('add');
    setEditUserId(null);
    setModalVisible(true);
  };

  const openEditModal = (u: TeamUser) => {
    resetForm();
    setFormMode('edit');
    setEditUserId(u.id);
    setFirstName(u.first_name || '');
    setSurname(u.surname || '');
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setRole(u.role || 'referrer_team');
    setState(u.state || '');
    setIsActive(u.is_active !== false);
    setModalVisible(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.first_name = 'First name is required';
    if (!surname.trim()) newErrors.surname = 'Surname is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!role) newErrors.role = 'Role is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (formMode === 'add') {
        await post('/referrer/account/add-user', {
          first_name: firstName.trim(),
          surname: surname.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          state: state || undefined,
        });
        setToast({ message: 'Team member added successfully', type: 'success' });
      } else {
        await patch(`/referrer/account/update-user/${editUserId}`, {
          first_name: firstName.trim(),
          surname: surname.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          state: state || null,
          is_active: isActive,
        });
        setToast({ message: 'Team member updated successfully', type: 'success' });
      }
      setModalVisible(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err?.data?.error || err?.data?.message || err.message || 'Failed to save';
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (u: TeamUser) => {
    if (u.id === user?.id) {
      setToast({ message: 'You cannot delete your own account', type: 'error' });
      return;
    }

    const doDelete = async () => {
      try {
        await del(`/referrer/account/delete-user/${u.id}`);
        setToast({ message: 'Team member deleted', type: 'success' });
        fetchUsers();
      } catch (err: any) {
        const msg = err?.data?.error || err?.data?.message || err.message || 'Failed to delete';
        setToast({ message: msg, type: 'error' });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${u.first_name} ${u.surname}? This cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Team Member',
        `Are you sure you want to delete ${u.first_name} ${u.surname}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (user?.role !== 'referrer_admin') {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.gray[400]} />
        <Text style={styles.noAccessText}>Only account owners can manage team members.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{users.length} Team Member{users.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* User List */}
        {users.map((u) => (
          <TouchableOpacity
            key={u.id}
            style={styles.userCard}
            onPress={() => openEditModal(u)}
            activeOpacity={0.7}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {(u.first_name?.[0] || '') + (u.surname?.[0] || '')}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.first_name} {u.surname}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
              <View style={styles.userBadges}>
                <RoleBadge role={u.role} size="sm" />
                {!u.is_active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactive</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.userActions}>
              {u.id !== user?.id && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => { e.stopPropagation?.(); handleDelete(u); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              )}
              <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>
        ))}

        {users.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>No team members yet</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB - Add User */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {formMode === 'add' ? 'Add Team Member' : 'Edit Team Member'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalContent}>
            {/* First Name */}
            <View style={styles.field}>
              <Text style={styles.label}>First Name *</Text>
              <View style={[styles.inputBox, !!errors.first_name && styles.inputError]}>
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
              <Text style={styles.label}>Surname *</Text>
              <View style={[styles.inputBox, !!errors.surname && styles.inputError]}>
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
              <Text style={styles.label}>Email *</Text>
              <View style={[styles.inputBox, !!errors.email && styles.inputError]}>
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

            {/* Role */}
            <View style={styles.field}>
              <Text style={styles.label}>Role *</Text>
              <TouchableOpacity
                style={[styles.inputBox, !!errors.role && styles.inputError]}
                onPress={() => { setShowRolePicker(!showRolePicker); setShowStatePicker(false); }}
              >
                <Text style={[styles.inputField, !role && { color: '#aaa' }]}>
                  {ROLE_OPTIONS.find(r => r.value === role)?.label || 'Select role'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#888" />
              </TouchableOpacity>
              {errors.role ? <Text style={styles.errorText}>{errors.role}</Text> : null}
            </View>

            {showRolePicker && (
              <View style={styles.pickerOptions}>
                {ROLE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pickerOption, role === opt.value && styles.pickerOptionActive]}
                    onPress={() => { setRole(opt.value); setShowRolePicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, role === opt.value && styles.pickerOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* State */}
            <View style={styles.field}>
              <Text style={styles.label}>State</Text>
              <TouchableOpacity
                style={styles.inputBox}
                onPress={() => { setShowStatePicker(!showStatePicker); setShowRolePicker(false); }}
              >
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

            {/* Status toggle (edit only) */}
            {formMode === 'edit' && (
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>
                <TouchableOpacity
                  style={styles.statusToggle}
                  onPress={() => setIsActive(!isActive)}
                >
                  <View style={[styles.toggle, isActive && styles.toggleActive]}>
                    <View style={[styles.toggleDot, isActive && styles.toggleDotActive]} />
                  </View>
                  <Text style={styles.statusToggleText}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {formMode === 'add' && (
              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={18} color="#1a8cba" />
                <Text style={styles.noteText}>
                  A temporary password will be generated and sent to the user via email.
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

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
    gap: 12,
  },
  noAccessText: {
    fontSize: 15,
    color: Colors.gray[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  userEmail: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },
  userBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  inactiveBadge: {
    backgroundColor: `${Colors.error}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.gray[400],
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancel: {
    fontSize: 15,
    color: Colors.gray[500],
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.teal,
  },
  modalSave: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalBody: {
    flex: 1,
  },
  modalContent: {
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
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  statusToggleText: {
    fontSize: 15,
    color: Colors.gray[700],
    fontWeight: '500',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4FC',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  noteText: {
    fontSize: 13,
    color: '#0d4f6e',
    flex: 1,
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
