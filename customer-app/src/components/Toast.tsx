import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Pressable, View } from 'react-native';
import { useToastStore } from '../store/toastStore';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Toast: React.FC = () => {
  const { visible, message, type, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 120,
      duration: 200,
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
        {
          bottom: Math.max(insets.bottom + 20, 40),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable onPress={handleDismiss} style={styles.content}>
        {/* Left Side Icon */}
        <Icon
          name={isError ? 'alert-circle-outline' : 'check-circle-outline'}
          size={22}
          color={isError ? '#FF5252' : '#4CAF50'}
          style={styles.icon}
        />
        {/* Toast message text */}
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: THEME.spacing.lg,
    right: THEME.spacing.lg,
    backgroundColor: '#2E2E2E', // Dark charcoal premium background
    borderRadius: THEME.borderRadius.md,
    zIndex: 9999,
    ...THEME.shadows.medium,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF', // Always white text on charcoal background
    lineHeight: 18,
  },
});

export default Toast;
