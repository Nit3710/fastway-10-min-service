import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Pressable } from 'react-native';
import { useToastStore } from '../store/toastStore';
import THEME from '../theme/theme';

export const Toast: React.FC = () => {
  const { visible, message, type, hideToast } = useToastStore();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 20,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      hideToast();
    });
  };

  if (!visible) return null;

  const isError = type === 'error';

  return (
    <Animated.View
      style={[
        styles.toast,
        isError ? styles.error : styles.success,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Pressable onPress={handleDismiss} style={styles.content}>
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 40,
    left: THEME.spacing.lg,
    right: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    zIndex: 9999,
    ...THEME.shadows.medium,
  },
  success: {
    backgroundColor: THEME.colors.success,
  },
  error: {
    backgroundColor: THEME.colors.error,
  },
  content: {
    width: '100%',
    justifyContent: 'center',
  },
  text: {
    ...THEME.typography.bodyBold,
    color: THEME.colors.surface,
    textAlign: 'center',
  },
});

export default Toast;
