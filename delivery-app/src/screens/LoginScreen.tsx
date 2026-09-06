import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { apiLogin } from '../api/authApi';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = () => {
  const { setAuth, clearAuth } = useAuthStore();
  const { showToast } = useToastStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.length < 10) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await apiLogin({ phone, password });

      if (response.user.role !== 'DELIVERY_PARTNER') {
        await clearAuth();
        showToast('Unauthorized. This app is for delivery partners only.', 'error');
        return;
      }

      await setAuth(response.token, response.user, response.refreshToken);
      showToast('Logged in successfully', 'success');
    } catch (err: any) {
      let msg = 'Invalid credentials. Please try again.';
      if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      } else if (err.message) {
        msg = err.message;
      }
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.primaryDark} barStyle="light-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Top Decorative Background Banner */}
          <View style={styles.topHeroBanner}>
            <View style={styles.logoBadgeCircle}>
              <Icon name="motorbike" size={42} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Fastway Delivery</Text>
            <Text style={styles.heroSubtitle}>PARTNER PORTAL</Text>
          </View>

          <Animated.View
            style={[
              styles.container,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Card style={styles.loginCard}>
              <Text style={styles.cardHeaderTitle}>Partner Login</Text>
              <Text style={styles.cardHeaderSub}>Enter your credentials to access assigned tasks</Text>

              <Input
                label="PHONE NUMBER"
                placeholder="Enter 10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text: string) => {
                  setPhone(text);
                  if (errors.phone) setErrors({ ...errors, phone: undefined });
                }}
                error={errors.phone}
              />

              <Input
                label="PASSWORD"
                placeholder="Enter password"
                isPassword
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                error={errors.password}
              />

              <Button
                title="Log In to Dashboard"
                onPress={handleLogin}
                isLoading={isLoading}
                style={styles.loginButton}
              />
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  topHeroBanner: {
    backgroundColor: THEME.colors.primary,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoBadgeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFE0B2',
    letterSpacing: 2,
    marginTop: 2,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    marginTop: -40,
  },
  loginCard: {
    width: '100%',
    padding: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.xl,
    ...THEME.shadows.medium,
  },
  cardHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  cardHeaderSub: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: THEME.spacing.lg,
  },
  loginButton: {
    marginTop: THEME.spacing.md,
    height: 52,
    borderRadius: THEME.borderRadius.lg,
  },
});

export default LoginScreen;
