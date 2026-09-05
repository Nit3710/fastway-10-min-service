import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  Pressable,
  TextInputProps as RNTextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface InputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  leadingIcon?: string;
  isPassword?: boolean;
  secureTextEntry?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<RNTextInput, InputProps>(
  (
    {
      label,
      error,
      icon,
      leadingIcon,
      isPassword,
      secureTextEntry,
      containerStyle,
      inputContainerStyle,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleFocus = (e: any) => {
      setFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setFocused(false);
      if (onBlur) onBlur(e);
    };

    const isSecure = (secureTextEntry || isPassword) && !showPassword;
    const activeIcon = icon || leadingIcon;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text
            style={[
              styles.label,
              focused && styles.labelFocused,
              error && styles.labelError,
            ]}
          >
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputContainer,
            inputContainerStyle,
            focused && styles.inputFocused,
            error && styles.inputError,
          ]}
        >
          {activeIcon && (
            <Icon
              name={activeIcon}
              size={18}
              color={focused ? THEME.colors.brass : THEME.colors.graphiteMuted}
              style={[styles.leadingIcon, props.multiline && { marginTop: 3 }]}
            />
          )}
          <RNTextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor={THEME.colors.graphiteMuted}
            secureTextEntry={isSecure}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {(secureTextEntry || isPassword) && (
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.toggleButton}
              hitSlop={8}
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={THEME.colors.graphiteMuted}
              />
            </Pressable>
          )}
        </View>
        {error && (
          <View style={styles.errorRow}>
            <Icon name="alert-circle-outline" size={13} color={THEME.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md,
    width: '100%',
  },
  label: {
    ...THEME.typography.caption,
    color: THEME.colors.graphite,
    marginBottom: THEME.spacing.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelFocused: {
    color: THEME.colors.brass,
  },
  labelError: {
    color: THEME.colors.error,
  },
  inputContainer: {
    height: 46,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md, // 6px - sharpish
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
  },
  inputFocused: {
    borderColor: THEME.colors.brass,
    ...THEME.shadows.light,
  },
  inputError: {
    borderColor: THEME.colors.error,
  },
  leadingIcon: {
    marginRight: THEME.spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    color: THEME.colors.graphite,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  toggleButton: {
    paddingLeft: THEME.spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },
  errorText: {
    ...THEME.typography.caption,
    color: THEME.colors.error,
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default Input;
