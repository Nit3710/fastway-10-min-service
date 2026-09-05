import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import THEME from '../theme/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
  isLoading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'solid',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const isSolid = variant === 'solid';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }: { pressed: boolean }) => [
        styles.base,
        isSolid ? styles.solid : styles.outline,
        disabled && (isSolid ? styles.solidDisabled : styles.outlineDisabled),
        pressed && styles.pressed,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isSolid ? THEME.colors.surface : THEME.colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            isSolid ? styles.textSolid : styles.textOutline,
            disabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: THEME.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
  },
  solid: {
    backgroundColor: THEME.colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: THEME.colors.primary,
  },
  solidDisabled: {
    backgroundColor: THEME.colors.border,
  },
  outlineDisabled: {
    borderColor: THEME.colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    ...THEME.typography.button,
  },
  textSolid: {
    color: THEME.colors.surface,
  },
  textOutline: {
    color: THEME.colors.primary,
  },
  textDisabled: {
    color: THEME.colors.textMuted,
  },
});

export default Button;
