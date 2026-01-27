/**
 * Input Component
 * Clean, modern text input with label, error state, and icons
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  required,
  secureTextEntry,
  ...props
}: InputProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const inputContainerStyles = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View style={inputContainerStyles}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
          ]}
          placeholderTextColor={Colors.gray[400]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={() => setIsSecure(!isSecure)}
          >
            <Ionicons
              name={isSecure ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={Colors.gray[400]}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <View style={styles.iconRight}>{rightIcon}</View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

/**
 * Phone Input Component
 * Input with country code prefix for Australian mobile numbers
 */
interface PhoneInputProps extends Omit<InputProps, 'keyboardType' | 'leftIcon'> {
  countryCode?: string;
}

export function PhoneInput({ countryCode = '+61', ...props }: PhoneInputProps) {
  return (
    <Input
      keyboardType="phone-pad"
      leftIcon={
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>{countryCode}</Text>
        </View>
      }
      {...props}
    />
  );
}

/**
 * Currency Input Component
 * Input formatted for currency values
 */
interface CurrencyInputProps extends Omit<InputProps, 'keyboardType' | 'leftIcon'> {
  currency?: string;
}

export function CurrencyInput({ currency = '$', ...props }: CurrencyInputProps) {
  return (
    <Input
      keyboardType="numeric"
      leftIcon={
        <Text style={styles.currencySymbol}>{currency}</Text>
      }
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 8,
  },

  required: {
    color: Colors.error,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    minHeight: 50,
  },

  inputContainerFocused: {
    borderColor: Colors.gray[300],
    backgroundColor: Colors.white,
  },

  inputContainerError: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}05`,
  },

  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.gray[900],
  },

  inputWithLeftIcon: {
    paddingLeft: 0,
  },

  inputWithRightIcon: {
    paddingRight: 0,
  },

  iconLeft: {
    paddingLeft: 14,
    paddingRight: 10,
  },

  iconRight: {
    paddingRight: 14,
    paddingLeft: 8,
  },

  error: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 5,
    fontWeight: '500',
  },

  hint: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 5,
  },

  countryCode: {
    paddingLeft: 14,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.gray[200],
    marginRight: 2,
    height: '100%',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  countryCodeText: {
    fontSize: 15,
    color: Colors.gray[600],
    fontWeight: '500',
  },

  currencySymbol: {
    fontSize: 15,
    color: Colors.gray[600],
    paddingLeft: 14,
    fontWeight: '500',
  },
});
