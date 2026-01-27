/**
 * Forgot Password Screen
 * Request password reset email - matches login page design
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { requestPasswordReset } from '../../lib/auth';
import { VALIDATION } from '../../constants/config';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (): boolean => {
    setEmailError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }

    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateEmail()) return;

    setIsLoading(true);
    const result = await requestPasswordReset(email);
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
    } else {
      setError(result.error || 'Failed to send reset email');
    }
  };

  // Success state
  if (isSuccess) {
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
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Check Your Email</Text>

          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-outline" size={48} color="#1a8cba" />
            </View>
            <Text style={styles.successText}>
              We've sent a password reset link to {email}. The link will expire in 1 hour.
            </Text>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

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
      </View>
    );
  }

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
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.formContainer}>
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

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {isLoading ? 'Please wait...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.backRow}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.backLink}>Back to Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>

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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  errorText: {
    color: '#d9534f',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  formContainer: {
    minHeight: 120,
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
  submitBtn: {
    backgroundColor: '#1a8cba',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  backRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  backLink: {
    color: '#1a8cba',
    fontSize: 13,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  waveWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
});
