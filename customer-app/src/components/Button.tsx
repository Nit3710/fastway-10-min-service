import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Animated,
  View,
} from 'react-native';
import THEME from '../theme/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || isLoading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || isLoading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.wrapper, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        style={({ pressed }) => [
          styles.base,
          styles[variant],
          disabled && styles[`${variant}Disabled` as keyof typeof styles],
          pressed && variant === 'text' && styles.textPressed,
        ] as any}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'primary' || variant === 'secondary'
                ? THEME.colors.surface
                : THEME.colors.graphite
            }
          />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
            <Text
              style={[
                styles.textBase,
                styles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles],
                disabled && styles.textDisabled,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  base: {
    height: 46,
    borderRadius: THEME.borderRadius.md, // 6px - sharp/slightly rounded
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
  },
  primary: {
    backgroundColor: THEME.colors.brass, // brass primary brand CTA
    borderColor: THEME.colors.brass,
  },
  secondary: {
    backgroundColor: THEME.colors.graphite, // industrial dark secondary CTA
    borderColor: THEME.colors.graphite,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: THEME.colors.graphite, // industrial dark outline
  },
  text: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    height: 'auto',
    paddingHorizontal: 0,
  },
  primaryDisabled: {
    backgroundColor: '#D1CDCA',
    borderColor: '#D1CDCA',
  },
  secondaryDisabled: {
    backgroundColor: '#D1CDCA',
    borderColor: '#D1CDCA',
  },
  outlineDisabled: {
    borderColor: THEME.colors.border,
  },
  textDisabled: {
    color: THEME.colors.graphiteMuted,
  },
  textPressed: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: THEME.spacing.sm,
  },
  iconRight: {
    marginLeft: THEME.spacing.sm,
  },
  textBase: {
    ...THEME.typography.subtitle,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textPrimary: {
    color: '#FFF',
  },
  textSecondary: {
    color: '#FFF',
  },
  textOutline: {
    color: THEME.colors.graphite,
  },
  textText: {
    color: THEME.colors.brass,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default Button;
