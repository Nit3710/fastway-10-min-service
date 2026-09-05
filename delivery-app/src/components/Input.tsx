import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import THEME from '../theme/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad' | 'decimal-pad' | 'ascii-capable' | 'numbers-and-punctuation' | 'url' | 'name-phone-pad' | 'twitter' | 'web-search' | 'visible-password';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  autoCorrect?: boolean;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send' | 'none' | 'previous' | 'default' | 'emergency-call' | 'google' | 'join' | 'route' | 'yahoo';
  multiline?: boolean;
  numberOfLines?: number;
  containerStyle?: StyleProp<ViewStyle>;
  style?: any;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isPassword = false,
  containerStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [secureText, setSecureText] = useState(isPassword);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, isFocused ? styles.labelFocused : null, error ? styles.labelError : null]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputContainer,
          props.multiline ? { height: 90, alignItems: 'flex-start', paddingVertical: THEME.spacing.sm } : null,
          isFocused ? styles.inputFocused : null,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          style={styles.input}
          secureTextEntry={secureText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={THEME.colors.textMuted}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <Pressable onPress={() => setSecureText(!secureText)} style={styles.toggleButton}>
            <Text style={styles.toggleText}>{secureText ? 'Show' : 'Hide'}</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md,
    width: '100%',
  },
  label: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
    fontWeight: '600',
  },
  labelFocused: {
    color: THEME.colors.primary,
  },
  labelError: {
    color: THEME.colors.error,
  },
  inputContainer: {
    height: 52,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
  },
  inputFocused: {
    borderColor: THEME.colors.primary,
  },
  inputError: {
    borderColor: THEME.colors.error,
  },
  input: {
    flex: 1,
    height: '100%',
    color: THEME.colors.text,
    fontSize: 15,
  },
  toggleButton: {
    padding: THEME.spacing.xs,
  },
  toggleText: {
    ...THEME.typography.caption,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  errorText: {
    ...THEME.typography.caption,
    color: THEME.colors.error,
    marginTop: THEME.spacing.xs,
  },
});

export default Input;
