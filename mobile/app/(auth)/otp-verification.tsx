/**
 * OTP Verification Screen
 * Enter 6-digit OTP code sent via SMS and email - matches login page design
 */
import { useState, useRef, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { OTP_CONFIG } from '../../constants/config';

export default function OTPVerificationScreen() {
  const { mobile, deviceId } = useLocalSearchParams<{
    mobile: string;
    deviceId: string;
  }>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(OTP_CONFIG.RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const { verifyOTP, requestOTP, isLoading, error, clearError } = useAuthStore();

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Handle OTP input change
  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + digits.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerify = async () => {
    clearError();
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      return;
    }

    const success = await verifyOTP(otpString, deviceId || '');
    if (success) {
      router.replace('/(tabs)');
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend) return;

    clearError();
    setOtp(['', '', '', '', '', '']);
    setCanResend(false);
    setCountdown(OTP_CONFIG.RESEND_COOLDOWN_SECONDS);

    await requestOTP(mobile || '', deviceId || '');
  };

  // Mask mobile number
  const maskedMobile = mobile ? `****${mobile.slice(-4)}` : '';

  // Check if OTP is complete
  const isOtpComplete = otp.every((digit) => digit !== '');

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
        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to {maskedMobile} and your registered email
        </Text>

        {/* Error */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                error ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Resend */}
        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendText}>
              Resend code in {countdown}s
            </Text>
          )}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isOtpComplete || isLoading) && styles.submitBtnDisabled]}
          onPress={handleVerify}
          disabled={!isOtpComplete || isLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>

        {/* Try Different Method */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Try a different method</Text>
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
  otpContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  otpInput: {
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
  otpInputFilled: {
    borderColor: '#1a8cba',
    backgroundColor: '#f0f9fc',
  },
  otpInputError: {
    borderColor: '#d9534f',
  },
  resendContainer: {
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#8aa8b8',
  },
  resendLink: {
    fontSize: 14,
    color: '#1a8cba',
    fontWeight: '600',
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
    color: '#666',
    textDecorationLine: 'underline',
  },
  waveWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
});
