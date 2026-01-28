/**
 * 2FA Verification Screen
 * For email/password login with 2FA enabled - matches login page design
 */
import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';

export default function Verify2FAScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const { verify2FA, isLoading, error, clearError } = useAuthStore();

  // Handle code input change
  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      const lastIndex = Math.min(index + digits.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify code
  const handleVerify = async () => {
    clearError();
    const codeString = code.join('');

    if (codeString.length !== 6) {
      return;
    }

    const success = await verify2FA(codeString);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const isCodeComplete = code.every((digit) => digit !== '');

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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your authenticator app or email
        </Text>

        {/* Error */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.codeInput,
                digit ? styles.codeInputFilled : null,
                error ? styles.codeInputError : null,
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isCodeComplete || isLoading) && styles.submitBtnDisabled]}
          onPress={handleVerify}
          disabled={!isCodeComplete || isLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.backBtnText}>Back to Login</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
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
  codeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: '#e0e8ed',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#0d4f6e',
    backgroundColor: '#f5f8fa',
  },
  codeInputFilled: {
    borderColor: '#1a8cba',
    backgroundColor: '#f0f9fc',
  },
  codeInputError: {
    borderColor: '#d9534f',
  },
  submitBtn: {
    backgroundColor: '#1a8cba',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  submitBtnDisabled: {
    backgroundColor: '#a0c4d4',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  backBtn: {
    marginTop: 20,
  },
  backBtnText: {
    fontSize: 14,
    color: '#1a8cba',
    fontWeight: '600',
  },
  waveWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
});
