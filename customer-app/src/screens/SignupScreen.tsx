import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, UserRole } from '../types';
import useAuthStore from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { apiSignup } from '../api/authApi';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import THEME from '../theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientHeader from '../components/GradientHeader';
import BrandLogo from '../components/BrandLogo';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const { setAuth } = useAuthStore();
  const { showToast } = useToastStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.length < 10) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const payload = {
        name,
        phone,
        email: email.trim() || null,
        password,
        role,
      };
      const response = await apiSignup(payload);
      await setAuth(response.token, response.user, response.refreshToken);
      showToast('Account created successfully', 'success');
    } catch (err: any) {
      let msg = 'Registration failed. Please check details.';
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

  const rolesList: { label: string; value: UserRole }[] = [
    { label: 'Customer', value: 'CUSTOMER' },
    { label: 'Delivery', value: 'DELIVERY_PARTNER' },
    { label: 'Admin', value: 'ADMIN' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.container,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.header}>
              <BrandLogo size={64} style={{ marginBottom: THEME.spacing.md }} />
              <Text style={styles.title}>Join Fastway</Text>
              <Text style={styles.subtitle}>Get plumbing &amp; sanitary hardware delivered in minutes</Text>
            </View>

            <Card style={styles.card} elevation="none">
              <Input
                label="FULL NAME"
                placeholder="Enter full name"
                value={name}
                onChangeText={(text: string) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                error={errors.name}
                icon="account-outline"
              />

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
                icon="phone-outline"
              />

              <Input
                label="EMAIL ADDRESS (OPTIONAL)"
                placeholder="Enter email address"
                keyboardType="email-address"
                value={email}
                onChangeText={(text: string) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                error={errors.email}
                icon="email-outline"
              />

              <Input
                label="PASSWORD"
                placeholder="At least 6 characters"
                isPassword
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                error={errors.password}
                icon="lock-outline"
              />

              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>I WANT TO REGISTER AS</Text>
                <View style={styles.roleSelector}>
                  {rolesList.map((item) => {
                    const isSelected = role === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => setRole(item.value)}
                        style={[
                          styles.roleOption,
                          isSelected && styles.roleOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            isSelected && styles.roleOptionTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button
                title="Create Account"
                onPress={handleSignup}
                isLoading={isLoading}
                style={styles.button}
              />
            </Card>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
                <Text style={styles.footerLink}>Log In</Text>
              </Pressable>
            </View>
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
    width: 64,
    height: 64,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.medium,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    width: '100%',
    padding: THEME.spacing.lg,
    borderWidth: 1,
  },
  roleContainer: {
    marginBottom: THEME.spacing.md,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
    letterSpacing: 0.5,
  },
  roleSelector: {
    flexDirection: 'row',
    height: 40,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  roleOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  roleOptionSelected: {
    backgroundColor: THEME.colors.surface,
    ...THEME.shadows.light,
  },
  roleOptionText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  roleOptionTextSelected: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  button: {
    marginTop: THEME.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.xl,
  },
  footerText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '800',
  },
});

export default SignupScreen;
