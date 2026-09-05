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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.container,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.logoTiny}>
                <MaterialCommunityIcons name="lightning-bolt" size={38} color={THEME.colors.surface} />
              </View>
              <Text style={styles.title}>Fastway Delivery Partner</Text>
              <Text style={styles.subtitle}>Log in to manage and deliver orders</Text>
            </View>

            <Card style={styles.card}>
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
                title="Log In"
                onPress={handleLogin}
                isLoading={isLoading}
                style={styles.button}
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
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  container: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  logoTiny: {
    width: 60,
    height: 60,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  logoTinyText: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.surface,
  },
  title: {
    ...THEME.typography.h2,
    color: THEME.colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    width: '100%',
    paddingVertical: THEME.spacing.xl,
  },
  button: {
    marginTop: THEME.spacing.md,
  },
});

export default LoginScreen;
