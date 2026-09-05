import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import THEME from '../theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevation?: 'light' | 'medium' | 'heavy' | 'none';
  variant?: 'flat' | 'raised';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  onPress,
  elevation = 'none', // Default to clean borders, no shadows
  variant = 'flat'
}) => {
  const shadowStyle = elevation !== 'none' ? THEME.shadows[elevation] : null;
  const bgStyle = variant === 'raised' ? { backgroundColor: THEME.colors.surfaceRaised } : { backgroundColor: THEME.colors.surface };

  if (onPress) {
    return (
      <Pressable 
        onPress={onPress} 
        style={({ pressed }) => [
          styles.card, 
          bgStyle,
          shadowStyle, 
          pressed && styles.pressed, 
          style
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, bgStyle, shadowStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: THEME.borderRadius.md, // 6px - sharp/slightly rounded
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
});

export default Card;
