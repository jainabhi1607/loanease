/**
 * Login Screen - Exact replica of design
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { VALIDATION } from '../../constants/config';

type LoginMethod = 'email' | 'mobile';

export default function LoginScreen() {
  const [method, setMethod] = useState<LoginMethod>('email');

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mobile login state
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  // Errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [mobileError, setMobileError] = useState('');

  const {
    loginEmail,
    loginBiometric,
    requestOTP,
    verifyOTP,
    isLoading,
    error,
    clearError,
    requires2FA,
    biometricAvailable,
    biometricEnabled,
  } = useAuthStore();

  // Attempt biometric login on mount if available and enabled
  useEffect(() => {
    if (biometricAvailable && biometricEnabled) {
      handleBiometricLogin();
    }
  }, [biometricAvailable, biometricEnabled]);

  const handleBiometricLogin = async () => {
    clearError();
    const success = await loginBiometric();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const validateEmailForm = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!VALIDATION.EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  const validateMobileForm = (): boolean => {
    setMobileError('');
    if (!mobile || mobile.length < 8) {
      setMobileError('Please enter a valid mobile number');
      return false;
    }
    return true;
  };

  const handleEmailLogin = async () => {
    clearError();
    if (!validateEmailForm()) return;

    const success = await loginEmail(email, password);
    if (success) {
      if (requires2FA) {
        router.push('/(auth)/verify-2fa');
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const handleGetOTP = async () => {
    clearError();
    if (!validateMobileForm()) return;

    const formattedMobile = mobile.startsWith('0')
      ? `+91${mobile.slice(1)}`
      : mobile.startsWith('+') ? mobile : `+91${mobile}`;

    const deviceId = `device_${Date.now()}`;
    await requestOTP(formattedMobile, deviceId);
  };

  const handleMobileLogin = async () => {
    clearError();
    if (!otp || otp.length < 6) return;

    const deviceId = `device_${Date.now()}`;
    const success = await verifyOTP(otp, deviceId);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Referrer Login</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setMethod('email')}
          >
            <Text style={[styles.tabLabel, method === 'email' && styles.tabLabelActive]}>
              Email Login
            </Text>
            {method === 'email' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setMethod('mobile')}
          >
            <Text style={[styles.tabLabel, method === 'mobile' && styles.tabLabelActive]}>
              Mobile Login
            </Text>
            {method === 'mobile' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Email Login Form */}
        {method === 'email' && (
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter your email"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {emailError && <Text style={styles.fieldError}>{emailError}</Text>}

            {/* Password Input */}
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
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
            {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}

            {/* Forgot Password */}
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
              onPress={handleEmailLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Mobile Login Form */}
        {method === 'mobile' && (
          <View style={styles.formContainer}>
            {/* Mobile Input */}
            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                placeholder="Enter your mobile number"
                placeholderTextColor="#aaa"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.getOtpBtn} onPress={handleGetOTP} disabled={isLoading}>
                <Text style={styles.getOtpText}>Get OTP</Text>
              </TouchableOpacity>
            </View>
            {mobileError && <Text style={styles.fieldError}>{mobileError}</Text>}

            {/* OTP Input */}
            <View style={styles.inputBox}>
              <Ionicons name="keypad-outline" size={18} color="#1a8cba" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter OTP"
                placeholderTextColor="#aaa"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, { marginTop: 20 }, isLoading && styles.loginBtnDisabled]}
              onPress={handleMobileLogin}
              disabled={isLoading || otp.length < 6}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Biometric Login */}
        {biometricAvailable && biometricEnabled && (
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={handleBiometricLogin}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="finger-print-outline" size={22} color="#1a8cba" />
            <Text style={styles.biometricText}>Login with Biometrics</Text>
          </TouchableOpacity>
        )}

        {/* Sign Up */}
        <View style={styles.signupRow}>
          <Text style={styles.signupLabel}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>

      {/* Wave Background at bottom */}
      <View style={styles.waveWrap} pointerEvents="none">
        <Svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none">
          {/* Back wave - lightest */}
          <Path
            d="M0,80 L0,35 Q50,15 100,30 T200,25 T300,32 T400,18 L400,80 Z"
            fill="#C5E8ED"
          />
          {/* Middle wave */}
          <Path
            d="M0,80 L0,45 Q60,30 120,42 T240,35 T360,45 T400,32 L400,80 Z"
            fill="#9DD5DE"
          />
          {/* Front wave - darkest */}
          <Path
            d="M0,80 L0,58 Q80,45 160,55 T320,50 T400,58 L400,80 Z"
            fill="#7AC5D0"
          />
        </Svg>
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.loadingLogo}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color="#1a8cba" />
            <Text style={styles.loadingText}>Signing in...</Text>
          </View>
        </View>
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
    paddingHorizontal: 28,
    paddingTop: 100,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 225,
    height: 180,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0d4f6e',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#d0e5ef',
  },
  tabItem: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8aa8b8',
  },
  tabLabelActive: {
    color: '#1a8cba',
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 8,
    right: 8,
    height: 2.5,
    backgroundColor: '#1a8cba',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  errorText: {
    color: '#d9534f',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  formContainer: {
    minHeight: 200,
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
  fieldError: {
    color: '#d9534f',
    fontSize: 11,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: '#1a8cba',
    fontSize: 13,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: '#1a8cba',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  getOtpBtn: {
    backgroundColor: '#1a8cba',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  getOtpText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#1a8cba',
    borderRadius: 8,
  },
  biometricText: {
    color: '#1a8cba',
    fontSize: 14,
    fontWeight: '600',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  signupLabel: {
    color: '#555',
    fontSize: 13,
  },
  signupLink: {
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    alignItems: 'center',
    padding: 30,
  },
  loadingLogo: {
    width: 150,
    height: 120,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1a8cba',
    fontWeight: '500',
  },
});
