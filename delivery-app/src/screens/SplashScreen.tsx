import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { apiGetMe } from '../api/authApi';
import THEME from '../theme/theme';

export const SplashScreen: React.FC = () => {
  const { setAuth, clearAuth, setBootstrapped } = useAuthStore();
  const { showToast } = useToastStore();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    const checkToken = async () => {
      const startTime = Date.now();
      try {
        const token = await AsyncStorage.getItem('authToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (token) {
          useAuthStore.setState({ token, refreshToken });
          const user = await apiGetMe();
          if (user.role !== 'DELIVERY_PARTNER') {
            await clearAuth();
            showToast('Session expired or unauthorized role', 'error');
          } else {
            const currentAuth = useAuthStore.getState();
            await setAuth(currentAuth.token || token, user, currentAuth.refreshToken || refreshToken);
          }
        } else {
          await clearAuth();
        }
      } catch (err: any) {
        await clearAuth();
        if (err.response && err.response.status !== 401) {
          showToast('Session expired. Please log in again.');
        }
      } finally {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1500 - elapsed);
        setTimeout(() => {
          setBootstrapped(true);
        }, delay);
      }
    };

    checkToken();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>FW</Text>
        </View>
        <Text style={styles.appName}>Fastway</Text>
        <Text style={styles.tagline}>Delivery Partner App</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: THEME.borderRadius.round,
    backgroundColor: THEME.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.medium,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  appName: {
    ...THEME.typography.h1,
    color: THEME.colors.surface,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: {
    ...THEME.typography.caption,
    color: THEME.colors.primaryLight,
    marginTop: THEME.spacing.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
