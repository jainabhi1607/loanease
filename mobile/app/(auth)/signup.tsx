/**
 * Signup Screen
 * Multi-step registration form - matches login page design
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signup, checkEmailAvailability, SignupData } from '../../lib/auth';
import { VALIDATION } from '../../constants/config';
import { IndustryOptions, EntityTypeLabels, EntityType } from '../../types';

type Step = 1 | 2 | 3 | 4 | 5;

// Entity type options for picker
const EntityTypeOptions = Object.entries(EntityTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

export default function SignupScreen() {
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showEntityTypePicker, setShowEntityTypePicker] = useState(false);
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);

  // Form data
  const [formData, setFormData] = useState<Partial<SignupData>>({
    first_name: '',
    surname: '',
    phone: '',
    email: '',
    password: '',
    abn: '',
    entity_name: '',
    trading_name: '',
    address: '',
    entity_type: '',
    industry_type: '',
    additional_directors: [],
    terms_accepted: false,
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data
  const updateField = (field: keyof SignupData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Validate step 1
  const validateStep1 = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.surname?.trim()) {
      newErrors.surname = 'Surname is required';
    }
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone is required';
    }
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!VALIDATION.EMAIL_REGEX.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    } else {
      const result = await checkEmailAvailability(formData.email);
      if (!result.available) {
        newErrors.email = 'This email is already registered';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate step 2
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.abn?.trim()) {
      newErrors.abn = 'ABN is required';
    } else if (formData.abn.replace(/\s/g, '').length !== 11) {
      newErrors.abn = 'ABN must be 11 digits';
    }
    if (!formData.entity_name?.trim()) {
      newErrors.entity_name = 'Company name is required';
    }
    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate step 4
  const validateStep4 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.entity_type) {
      newErrors.entity_type = 'Entity type is required';
    }
    if (!formData.industry_type) {
      newErrors.industry_type = 'Industry is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      newErrors.password = `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
    }
    if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = async () => {
    setError('');
    setIsLoading(true);

    let isValid = false;

    switch (step) {
      case 1:
        isValid = await validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = true;
        break;
      case 4:
        isValid = validateStep4();
        break;
    }

    setIsLoading(false);

    if (isValid && step < 5) {
      setStep((step + 1) as Step);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!formData.terms_accepted) {
      setError('You must accept the terms and conditions');
      return;
    }

    setError('');
    setIsLoading(true);

    const result = await signup(formData as SignupData);

    setIsLoading(false);

    if (result.success) {
      router.replace('/(auth)/login');
    } else {
      setError(result.error || 'Signup failed');
    }
  };

  // Render picker modal
  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  selectedValue === item.value && styles.optionItemSelected,
                ]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedValue === item.value && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {selectedValue === item.value && (
                  <Ionicons name="checkmark" size={20} color="#1a8cba" />
                )}
              </TouchableOpacity>
            )}
            style={styles.optionsList}
          />
        </View>
      </View>
    </Modal>
  );

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Director Information</Text>

            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="First Name *"
                placeholderTextColor="#aaa"
                value={formData.first_name}
                onChangeText={(v) => updateField('first_name', v)}
              />
            </View>
            {errors.first_name && <Text style={styles.fieldError}>{errors.first_name}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Surname *"
                placeholderTextColor="#aaa"
                value={formData.surname}
                onChangeText={(v) => updateField('surname', v)}
              />
            </View>
            {errors.surname && <Text style={styles.fieldError}>{errors.surname}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Phone *"
                placeholderTextColor="#aaa"
                value={formData.phone}
                onChangeText={(v) => updateField('phone', v)}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Email *"
                placeholderTextColor="#aaa"
                value={formData.email}
                onChangeText={(v) => updateField('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Company Information</Text>

            <View style={styles.inputBox}>
              <Ionicons name="business-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="ABN (XX XXX XXX XXX) *"
                placeholderTextColor="#aaa"
                value={formData.abn}
                onChangeText={(v) => updateField('abn', v)}
                keyboardType="number-pad"
              />
            </View>
            {errors.abn && <Text style={styles.fieldError}>{errors.abn}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="briefcase-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Company Name *"
                placeholderTextColor="#aaa"
                value={formData.entity_name}
                onChangeText={(v) => updateField('entity_name', v)}
              />
            </View>
            {errors.entity_name && <Text style={styles.fieldError}>{errors.entity_name}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="storefront-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Trading Name (optional)"
                placeholderTextColor="#aaa"
                value={formData.trading_name}
                onChangeText={(v) => updateField('trading_name', v)}
              />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="location-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Company Address *"
                placeholderTextColor="#aaa"
                value={formData.address}
                onChangeText={(v) => updateField('address', v)}
              />
            </View>
            {errors.address && <Text style={styles.fieldError}>{errors.address}</Text>}
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Additional Directors</Text>
            <Text style={styles.stepSubtitle}>
              Add any additional company directors (optional)
            </Text>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => setStep(4)}
              activeOpacity={0.85}
            >
              <Text style={styles.outlineBtnText}>Skip for Now</Text>
            </TouchableOpacity>
          </>
        );

      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Entity & Security</Text>

            <TouchableOpacity
              style={styles.inputBox}
              onPress={() => setShowEntityTypePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <Text style={[styles.inputField, !formData.entity_type && styles.placeholder]}>
                {formData.entity_type
                  ? EntityTypeLabels[Number(formData.entity_type) as EntityType]
                  : 'Select Entity Type *'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#888" />
            </TouchableOpacity>
            {errors.entity_type && <Text style={styles.fieldError}>{errors.entity_type}</Text>}

            <TouchableOpacity
              style={styles.inputBox}
              onPress={() => setShowIndustryPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="grid-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <Text style={[styles.inputField, !formData.industry_type && styles.placeholder]}>
                {formData.industry_type
                  ? IndustryOptions.find(i => i.value === formData.industry_type)?.label
                  : 'Select Industry *'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#888" />
            </TouchableOpacity>
            {errors.industry_type && <Text style={styles.fieldError}>{errors.industry_type}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Create Password *"
                placeholderTextColor="#aaa"
                value={formData.password}
                onChangeText={(v) => updateField('password', v)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Confirm Password *"
                placeholderTextColor="#aaa"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}
          </>
        );

      case 5:
        return (
          <>
            <Text style={styles.stepTitle}>Terms & Conditions</Text>
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to the Loanease Referrer Agreement
                and Privacy Policy. You acknowledge that you have read and understood
                the terms of our referral program.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => updateField('terms_accepted', !formData.terms_accepted)}
            >
              <View style={[
                styles.checkboxBox,
                formData.terms_accepted && styles.checkboxChecked
              ]}>
                {formData.terms_accepted && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read and agree to the Referrer Agreement
              </Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E6F4FC', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#E6F4FC']}
        locations={[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradientBg}
      />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Create Account</Text>

          {/* Progress */}
          <View style={styles.progress}>
            {[1, 2, 3, 4, 5].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  s <= step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressText}>Step {step} of 5</Text>

          {/* Error */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Form Content */}
          <View style={styles.formContainer}>
            {renderStepContent()}
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => setStep((step - 1) as Step)}
                activeOpacity={0.85}
              >
                <Text style={styles.outlineBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, step === 1 && { flex: 1 }]}
              onPress={step === 5 ? handleSubmit : handleNext}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {isLoading ? 'Please wait...' : step === 5 ? 'Create Account' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginLabel}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Wave Background */}
      <View style={styles.waveWrap} pointerEvents="none">
        <Svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none">
          <Path
            d="M0,80 L0,35 Q50,15 100,30 T200,25 T300,32 T400,18 L400,80 Z"
            fill="#C5E8ED"
          />
          <Path
            d="M0,80 L0,45 Q60,30 120,42 T240,35 T360,45 T400,32 L400,80 Z"
            fill="#9DD5DE"
          />
          <Path
            d="M0,80 L0,58 Q80,45 160,55 T320,50 T400,58 L400,80 Z"
            fill="#7AC5D0"
          />
        </Svg>
      </View>

      {/* Entity Type Picker Modal */}
      {renderPickerModal(
        showEntityTypePicker,
        () => setShowEntityTypePicker(false),
        'Select Entity Type',
        EntityTypeOptions,
        formData.entity_type || '',
        (value) => updateField('entity_type', value)
      )}

      {/* Industry Picker Modal */}
      {renderPickerModal(
        showIndustryPicker,
        () => setShowIndustryPicker(false),
        'Select Industry',
        IndustryOptions,
        formData.industry_type || '',
        (value) => updateField('industry_type', value)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 100,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 140,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0d4f6e',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d0e5ef',
  },
  progressDotActive: {
    backgroundColor: '#1a8cba',
    width: 24,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8aa8b8',
    marginBottom: 20,
  },
  errorText: {
    color: '#d9534f',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  formContainer: {
    minHeight: 280,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0d4f6e',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f8fa',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e8ed',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  placeholder: {
    color: '#aaa',
  },
  fieldError: {
    color: '#d9534f',
    fontSize: 11,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  termsContainer: {
    backgroundColor: '#f5f8fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e8ed',
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d0e5ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1a8cba',
    borderColor: '#1a8cba',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#555',
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  outlineBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1a8cba',
  },
  outlineBtnText: {
    color: '#1a8cba',
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#1a8cba',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginLabel: {
    color: '#555',
    fontSize: 13,
  },
  loginLink: {
    color: '#1a8cba',
    fontSize: 13,
    fontWeight: '700',
  },
  waveWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e8ed',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0d4f6e',
  },
  optionsList: {
    padding: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionItemSelected: {
    backgroundColor: '#f0f9fc',
  },
  optionText: {
    fontSize: 15,
    color: '#333',
  },
  optionTextSelected: {
    color: '#1a8cba',
    fontWeight: '600',
  },
});
